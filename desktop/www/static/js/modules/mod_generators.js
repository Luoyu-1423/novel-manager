// ============================================================
// 模块: 随机生成器 (mod_generators.js)
// 版本: 3.2.0
// ============================================================
(function() {
    'use strict';
    const style = document.createElement('style');
    style.textContent = `
        .gen-grid { }
        .gen-card { background: var(--card-bg, #fff); border: 1px solid var(--border-color, #e5e7eb); border-radius: 10px; padding: 16px; }
        .gen-card h3 { margin: 0 0 12px 0; font-size: 16px; display: flex; align-items: center; gap: 8px; }
        .gen-result { background: var(--bg-color, #f9fafb); border-radius: 8px; padding: 12px; margin-bottom: 12px; min-height: 40px; font-size: 15px; line-height: 1.6; }
        .gen-result .gen-item { padding: 4px 0; border-bottom: 1px solid var(--border-color, #e5e7eb); }
        .gen-result .gen-item:last-child { border-bottom: none; }
        .gen-btn-row { display: flex; gap: 8px; }
        .gen-config { margin-top: 12px; }
        .gen-config textarea { width: 100%; min-height: 60px; padding: 8px; border: 1px solid var(--border-color, #e5e7eb); border-radius: 6px; font-size: 13px; resize: vertical; }
        .gen-config-label { font-size: 12px; color: var(--text-secondary, #6b7280); margin-bottom: 4px; }
        .gen-count { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .gen-count input { width: 60px; padding: 4px 8px; border: 1px solid var(--border-color, #e5e7eb); border-radius: 4px; font-size: 13px; }
    `;
    document.head.appendChild(style);

    const defaultBanks = {
        names: { label: '姓名', icon: 'user', words: ['艾伦','莉娜','凯恩','索菲亚','雷克斯','艾薇','奥斯卡','梅林','伊莎贝拉','亚瑟','露娜','卡尔','菲奥娜','加雷斯','塞琳娜'] },
        places: { label: '地名', icon: 'immortal_mtn', words: ['幽暗森林','龙脊山脉','银月城','风暴海岸','暗影谷','光明圣殿','冰霜平原','赤焰沙漠','翡翠湖','雷鸣峡谷','星辰塔','月影沼泽'] },
        events: { label: '事件', icon: 'lightning', words: ['神秘的旅人到来','古老的预言应验','失落的宝藏被发现','王位争夺战开始','黑暗势力觉醒','英雄陨落','新联盟成立','禁忌魔法被破解','巨龙苏醒','时空裂缝出现'] },
        items: { label: '物品', icon: 'gem', words: ['破晓之剑','永恒之盾','智慧之冠','隐身斗篷','传送戒指','生命药水','龙鳞甲','魔法书','时光沙漏','灵魂宝石','风暴之弓','月光匕首'] }
    };

    let config = {};
    let history = [];

    async function loadData() {
        try {
            config = await apiRequest('/api/mod/generators_config') || {};
            history = await apiRequest('/api/mod/generators_history') || [];
        } catch(e) { config = {}; history = []; }
    }

    function getBank(type) {
        if (config[type] && config[type].words) return config[type];
        return defaultBanks[type] || { label: type, icon: 'dice', words: [] };
    }

    function renderPage() {
        let html = UIUtils.renderCardPage(
            (SvgIconLib ? SvgIconLib.renderAuto('dice', 18) : '🎲') + ' 随机生成器',
            '<button class="btn-secondary btn-small" onclick="GeneratorsModule.showConfig()">' + (SvgIconLib ? SvgIconLib.renderAuto('settings', 12) : '⚙️') + ' 自定义词库</button>'
        );
        html += '<div class="gen-grid ui-grid ui-grid--md" id="gen-grid"></div>';
        return html;
    }

    function refreshView() {
        const grid = document.getElementById('gen-grid');
        if (!grid) return;
        let html = '';
        for (const [type, bank] of Object.entries(defaultBanks)) {
            const custom = config[type];
            const icon = custom ? custom.icon : bank.icon;
            const label = custom ? custom.label : bank.label;
            html += `<div class="gen-card" id="gen-${type}">`;
            html += `<h3>${SvgIconLib ? SvgIconLib.renderAuto(icon || 'dice', 16) : (icon || '')} ${label}</h3>`;
            html += `<div class="gen-result" id="gen-result-${type}"><span style="color:#9ca3af;">点击生成按钮</span></div>`;
            html += `<div class="gen-count"><label>数量:</label><input type="number" id="gen-count-${type}" value="3" min="1" max="20"></div>`;
            html += `<div class="gen-btn-row">`;
            html += `<button class="btn-primary btn-small" onclick="GeneratorsModule.generate('${type}')">${SvgIconLib ? SvgIconLib.render('dice', 12) : '🎲'} 生成</button>`;
            html += `<button class="btn-secondary btn-small" onclick="GeneratorsModule.copyResult('${type}')">${SvgIconLib ? SvgIconLib.render('copy', 12) : '📋'} 复制</button>`;
            html += `</div></div>`;
        }
        grid.innerHTML = html;
    }

    function generate(type) {
        const bank = getBank(type);
        const countEl = document.getElementById(`gen-count-${type}`);
        const count = countEl ? Math.min(20, Math.max(1, parseInt(countEl.value) || 3)) : 3;
        if (!bank.words || bank.words.length === 0) {
            const el = document.getElementById(`gen-result-${type}`);
            if (el) el.innerHTML = '<span style="color:#ef4444;">词库为空</span>';
            return;
        }
        // 无放回抽取：先 shuffle 再取前 N 个，避免重复
        const pool = [...bank.words];
        // Fisher-Yates 洗牌
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        const actualCount = Math.min(count, pool.length);
        const results = pool.slice(0, actualCount);
        const el = document.getElementById(`gen-result-${type}`);
        if (el) {
            el.innerHTML = results.map(r => `<div class="gen-item">${r}</div>`).join('');
        }
        // 记录历史
        history.push({ type, results, time: new Date().toISOString() });
        if (history.length > 100) history = history.slice(-100);
        apiRequest('/api/mod/generators_history/save', 'POST', history);
    }

    function copyResult(type) {
        const el = document.getElementById(`gen-result-${type}`);
        if (!el) return;
        UIUtils.copyText(el.innerText, '已复制到剪贴板');
    }

    function showConfig() {
        let html = '<div style="display:flex;flex-direction:column;gap:16px;">';
        for (const [type, bank] of Object.entries(defaultBanks)) {
            const current = getBank(type);
            html += `<div>`;
            html += `<label style="font-weight:600;">${(SvgIconLib && SvgIconLib.renderAuto) ? SvgIconLib.renderAuto(bank.icon, 14) : bank.icon} ${bank.label}</label>`;
            html += `<div style="display:flex;gap:8px;margin:4px 0;">`;
            html += `<input type="text" id="gen-cfg-label-${type}" value="${current.label || bank.label}" placeholder="名称" style="flex:1;padding:4px 8px;border:1px solid #e5e7eb;border-radius:4px;">`;
            html += `<input type="text" id="gen-cfg-icon-${type}" value="${current.icon || bank.icon}" placeholder="图标" style="width:50px;padding:4px 8px;border:1px solid #e5e7eb;border-radius:4px;">`;
            html += `</div>`;
            html += `<div class="gen-config-label">词库 (每行一个)</div>`;
            html += `<textarea id="gen-cfg-words-${type}" style="width:100%;min-height:80px;padding:8px;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;">${(current.words || bank.words).join('\n')}</textarea>`;
            html += `</div>`;
        }
        html += '</div>';
        showModal('自定义词库', html, [
            { text: '取消', class: 'btn-secondary', action: () => closeModal() },
            { text: '保存', class: 'btn-primary', action: async () => {
                for (const type of Object.keys(defaultBanks)) {
                    const label = document.getElementById(`gen-cfg-label-${type}`).value.trim();
                    const icon = document.getElementById(`gen-cfg-icon-${type}`).value.trim();
                    const wordsStr = document.getElementById(`gen-cfg-words-${type}`).value;
                    const words = wordsStr.split('\n').map(s => s.trim()).filter(Boolean);
                    config[type] = { label, icon, words };
                }
                await apiRequest('/api/mod/generators_config/save', 'POST', config);
                refreshView(); closeModal(); showToast('词库已保存', 'success');
            }}
        ]);
    }

    function previewRenderer() { return '<p>随机生成器 (姓名/地名/事件/物品)</p>'; }

    function exportFormatter() {
        let text = '=== 随机生成器词库 ===\n\n';
        for (const [type, bank] of Object.entries(defaultBanks)) {
            const current = getBank(type);
            text += `--- ${current.icon || bank.icon} ${current.label || bank.label} ---\n`;
            (current.words || bank.words).forEach(w => { text += `  ${w}\n`; });
            text += '\n';
        }
        return text;
    }

    function searchIndexer() { return []; }

    window.GeneratorsModule = { loadData, refreshView, generate, copyResult, showConfig };
    ModuleRegistry.register({
        id: 'generators', name: '随机生成器', icon: 'dice', group: 'writing', order: 4, hidden: true,
        dataKeys: ['generators_config', 'generators_history'],
        previewRenderer, exportFormatter, searchIndexer,
        pageRenderer: renderPage,
        onPageShow: () => { loadData().then(() => refreshView()); }
    });
    console.log('[Generators] 随机生成器模块已注册');
})();
