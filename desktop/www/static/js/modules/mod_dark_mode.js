// ============================================================
// 模块: 主题设置 (mod_dark_mode.js)
// 版本: 3.2.0
// 功能: 统一主题选择（浅色/深色/透明）+ 定时自动切换
// 说明: 主题通过 body[data-theme] 应用，与 advanced_features.js 的
//       themeList / switchTheme 共用 localStorage('novel-manager-theme')
// ============================================================
(function() {
    'use strict';
    const style = document.createElement('style');
    style.textContent = `
        .dm-container { display: flex; flex-direction: column; gap: 16px; }
        .dm-section { padding: 16px; background: var(--card-bg, #fff); border: 1px solid var(--border-color, #e5e7eb); border-radius: 10px; }
        .dm-section h3 { margin: 0 0 12px 0; font-size: 15px; display: flex; align-items: center; gap: 6px; }
        .dm-group-label { font-size: 12px; font-weight: 600; color: var(--text-secondary, #6b7280); margin: 12px 0 8px 0; }
        .dm-group-label:first-child { margin-top: 0; }
        .dm-theme-card { padding: 12px 8px; border-radius: 10px; text-align: center; cursor: pointer; border: 2px solid var(--border-color, #e5e7eb); background: var(--card-bg, #fff); transition: all 0.2s; }
        .dm-theme-card:hover { transform: translateY(-2px); box-shadow: var(--shadow, 0 1px 3px rgba(0,0,0,0.1)); }
        .dm-theme-card.active { border-color: var(--primary-color, #6366f1); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-color, #6366f1) 25%, transparent); }
        .dm-theme-swatch { width: 40px; height: 40px; border-radius: 50%; margin: 0 auto 8px; border: 2px solid rgba(0,0,0,0.12); background: linear-gradient(135deg, #6366f1, #8b5cf6); }
        .dm-theme-name { font-size: 12px; }
        .dm-toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-color, #e5e7eb); }
        .dm-toggle-row:last-child { border-bottom: none; }
        .dm-toggle-label { font-size: 14px; }
        .dm-toggle-desc { font-size: 12px; color: var(--text-secondary, #6b7280); }
        .dm-switch { position: relative; width: 44px; height: 24px; border-radius: 12px; background: #d1d5db; cursor: pointer; transition: background 0.2s; flex-shrink: 0; }
        .dm-switch.active { background: var(--primary-color, #6366f1); }
        .dm-switch::after { content: ''; position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; border-radius: 50%; background: #fff; transition: transform 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.25); }
        .dm-switch.active::after { transform: translateX(20px); }
        .dm-schedule-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 10px; }
        .dm-schedule-item label { display: block; font-size: 12px; color: var(--text-secondary, #6b7280); margin-bottom: 4px; }
        .dm-schedule-item select { width: 100%; padding: 6px 8px; border: 1px solid var(--border-color, #e5e7eb); border-radius: 8px; font-size: 13px; background: var(--card-bg, #fff); color: var(--text-primary, #1f2937); }
        .dm-schedule-row { display: flex; gap: 8px; align-items: center; margin-top: 10px; flex-wrap: wrap; }
        .dm-schedule-row select { padding: 5px 8px; border: 1px solid var(--border-color, #e5e7eb); border-radius: 6px; font-size: 13px; background: var(--card-bg, #fff); color: var(--text-primary, #1f2937); }
        .dm-hint { font-size: 12px; color: var(--text-secondary, #6b7280); margin-top: 8px; }
    `;
    document.head.appendChild(style);

    // 主题分组（与 advanced_features.js themeList 一致）
    const GROUPS = [
        { label: '浅色 · 明亮', keys: ['default', 'warm', 'cool', 'mint'] },
        { label: '深色 · 代码', keys: ['vscode'] },
        { label: '透明 · 毛玻璃', keys: ['glass'] }
    ];
    const THEME_META = {
        default: { name: '默认靛蓝', swatch: 'linear-gradient(135deg, #6366f1, #8b5cf6)' },
        warm:    { name: '暖白纸感', swatch: 'linear-gradient(135deg, #b45309, #d97706)' },
        cool:    { name: '晨雾蓝灰', swatch: 'linear-gradient(135deg, #4f7cac, #7ba7cc)' },
        mint:    { name: '薄荷绿',   swatch: 'linear-gradient(135deg, #0e9f6e, #34d399)' },
        vscode:  { name: '代码深色', swatch: 'linear-gradient(135deg, #1e1e1e, #3a3d41)' },
        glass:   { name: '毛玻璃',   swatch: 'linear-gradient(135deg, rgba(99,102,241,0.55), rgba(236,254,255,0.8))' }
    };

    // 旧版深色主题名 → vscode（v3.2.0 起只保留代码深色）
    const LEGACY_DARK_MAP = { dark: 'vscode', midnight: 'vscode', forest: 'vscode', sunset: 'vscode', ocean: 'vscode' };

    let settings = { schedule: false, startHour: 20, endHour: 7, lightTheme: 'default', darkTheme: 'vscode' };

    function currentTheme() {
        return localStorage.getItem('novel-manager-theme') || 'default';
    }

    // 应用主题（优先复用全局 switchTheme，保证弹窗选中状态同步）
    function applyTheme(name) {
        const themeName = name || currentTheme();
        if (typeof window.switchTheme === 'function') {
            window.switchTheme(themeName);
        } else {
            if (themeName === 'default') {
                document.body.removeAttribute('data-theme');
            } else {
                document.body.setAttribute('data-theme', themeName);
            }
            localStorage.setItem('novel-manager-theme', themeName);
        }
    }

    async function loadData() {
        try {
            const saved = await apiRequest('/api/mod/dark_mode_settings') || {};
            // 兼容旧版 {enabled, theme} 结构
            if (saved.enabled !== undefined && saved.lightTheme === undefined) {
                const oldDark = LEGACY_DARK_MAP[saved.theme] || 'vscode';
                settings = {
                    schedule: !!saved.schedule,
                    startHour: saved.startHour !== undefined ? saved.startHour : 20,
                    endHour: saved.endHour !== undefined ? saved.endHour : 7,
                    lightTheme: 'default',
                    darkTheme: oldDark
                };
                if (saved.enabled) applyTheme(oldDark);
                save();
            } else {
                settings = { ...settings, ...saved };
            }
        } catch(e) {}
        applyTheme(currentTheme());
    }

    function renderPage() {
        let html = UIUtils.renderCardPage(
            (SvgIconLib ? SvgIconLib.renderAuto('moon_icon', 18) : '🌙') + ' 主题设置',
            ''
        );
        html += '<div class="dm-container">';

        // 主题选择
        html += '<div class="dm-section">';
        html += '<h3>主题选择</h3>';
        const cur = currentTheme();
        GROUPS.forEach(group => {
            html += `<div class="dm-group-label">${group.label}</div>`;
            html += '<div class="ui-grid ui-grid--sm" style="grid-template-columns:repeat(auto-fill,minmax(96px,1fr));">';
            group.keys.forEach(key => {
                const meta = THEME_META[key] || { name: key, swatch: 'linear-gradient(135deg,#ccc,#999)' };
                const isActive = cur === key;
                html += `<div class="dm-theme-card ${isActive ? 'active' : ''}" id="dm-card-${key}" onclick="DarkModeModule.selectTheme('${key}')">`;
                html += `<div class="dm-theme-swatch" style="background:${meta.swatch}"></div>`;
                html += `<div class="dm-theme-name">${meta.name}</div></div>`;
            });
            html += '</div>';
        });
        html += '<div class="dm-hint">点击卡片立即切换主题，选择会保存在本地</div>';
        html += '</div>';

        // 定时切换
        html += '<div class="dm-section">';
        html += '<h3>定时自动切换</h3>';
        html += '<div class="dm-toggle-row"><div><div class="dm-toggle-label">启用定时切换</div><div class="dm-toggle-desc">夜间自动使用深色主题，白天恢复浅色</div></div>';
        html += `<div class="dm-switch ${settings.schedule ? 'active' : ''}" id="dm-toggle-schedule" onclick="DarkModeModule.toggleSchedule()"></div></div>`;
        html += `<div id="dm-schedule-box" style="${settings.schedule ? '' : 'display:none'}">`;
        html += '<div class="dm-schedule-grid">';
        html += '<div class="dm-schedule-item"><label>日间主题</label>';
        html += `<select id="dm-light-theme" onchange="DarkModeModule.updateSchedule()">`;
        GROUPS[0].keys.forEach(key => {
            html += `<option value="${key}" ${settings.lightTheme === key ? 'selected' : ''}>${THEME_META[key].name}</option>`;
        });
        html += '</select></div>';
        html += '<div class="dm-schedule-item"><label>夜间主题</label>';
        html += `<select id="dm-dark-theme" onchange="DarkModeModule.updateSchedule()">`;
        GROUPS.slice(1).forEach(group => {
            group.keys.forEach(key => {
                html += `<option value="${key}" ${settings.darkTheme === key ? 'selected' : ''}>${THEME_META[key].name}</option>`;
            });
        });
        html += '</select></div>';
        html += '</div>';
        html += '<div class="dm-schedule-row"><span style="font-size:13px;">从</span>';
        html += `<select id="dm-start-hour" onchange="DarkModeModule.updateSchedule()">`;
        for (let h = 0; h < 24; h++) html += `<option value="${h}" ${h === settings.startHour ? 'selected' : ''}>${h}:00</option>`;
        html += '</select><span style="font-size:13px;">到</span>';
        html += `<select id="dm-end-hour" onchange="DarkModeModule.updateSchedule()">`;
        for (let h = 0; h < 24; h++) html += `<option value="${h}" ${h === settings.endHour ? 'selected' : ''}>${h}:00</option>`;
        html += '</select></div>';
        html += '</div>';
        html += '</div>';

        return html;
    }

    function refreshView() {
        // 重新渲染时高亮当前主题卡片
        const cur = currentTheme();
        document.querySelectorAll('.dm-theme-card').forEach(card => {
            card.classList.toggle('active', card.id === 'dm-card-' + cur);
        });
    }

    function selectTheme(key) {
        applyTheme(key);
        refreshView();
    }

    function toggleSchedule() {
        settings.schedule = !settings.schedule;
        save();
        const el = document.getElementById('dm-toggle-schedule');
        if (el) el.classList.toggle('active', settings.schedule);
        const box = document.getElementById('dm-schedule-box');
        if (box) box.style.display = settings.schedule ? '' : 'none';
        checkSchedule();
    }

    function updateSchedule() {
        const lightEl = document.getElementById('dm-light-theme');
        const darkEl = document.getElementById('dm-dark-theme');
        const startEl = document.getElementById('dm-start-hour');
        const endEl = document.getElementById('dm-end-hour');
        if (lightEl) settings.lightTheme = lightEl.value;
        if (darkEl) settings.darkTheme = darkEl.value;
        if (startEl) settings.startHour = parseInt(startEl.value);
        if (endEl) settings.endHour = parseInt(endEl.value);
        save();
        checkSchedule();
    }

    function checkSchedule() {
        if (!settings.schedule) return;
        const hour = new Date().getHours();
        const isNight = settings.startHour > settings.endHour
            ? (hour >= settings.startHour || hour < settings.endHour)
            : (hour >= settings.startHour && hour < settings.endHour);
        applyTheme(isNight ? settings.darkTheme : settings.lightTheme);
        refreshView();
    }

    async function save() {
        try { await apiRequest('/api/mod/dark_mode_settings/save', 'POST', settings); } catch(e) {}
    }

    function previewRenderer() {
        const cur = currentTheme();
        const name = (THEME_META[cur] || {}).name || cur;
        return `<p>当前主题: ${name}${settings.schedule ? ' · 定时切换已开启' : ''}</p>`;
    }
    function exportFormatter() { return ''; }
    function searchIndexer() { return []; }

    function getSettings() { return { ...settings }; }
    function getThemes() { return THEME_META; }

    window.DarkModeModule = { loadData, refreshView, selectTheme, toggleSchedule, updateSchedule, checkSchedule, applyTheme, getSettings, getThemes };
    ModuleRegistry.register({
        id: 'dark_mode', name: '主题设置', icon: 'moon_icon', group: 'tools', order: 4, hidden: true,
        dataKeys: ['dark_mode_settings'],
        previewRenderer, exportFormatter, searchIndexer,
        pageRenderer: renderPage,
        onPageShow: () => { loadData().then(() => refreshView()); }
    });
    // 加载时应用已保存主题 + 定时检查
    setTimeout(() => { loadData(); }, 100);
    setInterval(checkSchedule, 60000);
})();
