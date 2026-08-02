// ============================================================
// 全局快捷入口 - quick_access.js
// 版本: 3.2.0
// 功能:
//   1. 全局 FAB 悬浮按钮（右下角，AI 对话栏上方）
//   2. 全局快捷键系统（Ctrl+Shift+Letter 切换模块）
//   3. 角色信息快捷面板（从右侧滑入，显示当前角色概要）
// ============================================================

(function () {
    'use strict';

    // ==================== 快捷键映射 ====================
    // 已避免与现有快捷键冲突（Ctrl+S 保存、Ctrl+Enter 专注、Ctrl+R/E/J 重写/扩写/精简）
    const SHORTCUTS = [
        { key: 'H', moduleId: 'chapters',         label: '章节管理', desc: 'Ctrl+Shift+H' },
        { key: 'C', moduleId: 'character',        label: '角色信息', desc: 'Ctrl+Shift+C' },
        { key: 'V', moduleId: 'worldview',        label: '世界观',   desc: 'Ctrl+Shift+V' },
        { key: 'G', moduleId: 'glossary',         label: '术语表',   desc: 'Ctrl+Shift+G' },
        { key: 'T', moduleId: 'timeline',         label: '时间线',   desc: 'Ctrl+Shift+T' },
        { key: 'I', moduleId: 'inventory',        label: '背包',     desc: 'Ctrl+Shift+I' },
        { key: 'M', moduleId: 'currency',         label: '货币',     desc: 'Ctrl+Shift+M' },
        { key: 'Q', moduleId: 'quests',           label: '任务',     desc: 'Ctrl+Shift+Q' },
        { key: 'K', moduleId: 'skills',           label: '技能',     desc: 'Ctrl+Shift+K' },
        { key: 'L', moduleId: 'item-library',     label: '物品库',   desc: 'Ctrl+Shift+L' },
        { key: 'E', moduleId: 'equipment',        label: '装备槽',   desc: 'Ctrl+Shift+E' },
        { key: 'Y', moduleId: 'story',            label: '剧情',     desc: 'Ctrl+Shift+Y' },
        { key: 'F', moduleId: 'fulltext-search',  label: '全文搜索', desc: 'Ctrl+Shift+F' },
        { key: 'P', moduleId: null,               label: '快捷面板', desc: 'Ctrl+Shift+P', action: toggleCharacterPanel }
    ];

    // ==================== 样式 ====================
    function injectStyle() {
        if (document.getElementById('quick-access-style')) return;
        const style = document.createElement('style');
        style.id = 'quick-access-style';
        style.textContent = `
            /* FAB 主按钮 */
            .qa-fab {
                position: fixed;
                right: 16px;
                bottom: 130px;
                z-index: 200;
                width: 48px;
                height: 48px;
                border-radius: 50%;
                background: var(--primary-color, #6366f1);
                color: #fff;
                border: none;
                box-shadow: 0 4px 16px rgba(99,102,241,0.4);
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 22px;
                font-weight: 700;
                transition: transform 0.2s, box-shadow 0.2s;
                user-select: none;
            }
            .qa-fab:hover { transform: scale(1.06); box-shadow: 0 6px 20px rgba(99,102,241,0.5); }
            .qa-fab.qa-active { transform: rotate(45deg); background: var(--text-secondary, #6b7280); }

            /* FAB 弹出菜单 */
            .qa-menu {
                position: fixed;
                right: 16px;
                bottom: 188px;
                z-index: 199;
                width: 240px;
                max-height: 60vh;
                overflow-y: auto;
                background: var(--card-bg, #fff);
                border: 1px solid var(--border-color, #e5e7eb);
                border-radius: 8px;
                box-shadow: 0 8px 24px rgba(0,0,0,0.15);
                padding: 6px;
                opacity: 0;
                transform: translateY(8px) scale(0.96);
                pointer-events: none;
                transition: opacity 0.15s, transform 0.15s;
            }
            .qa-menu.qa-open {
                opacity: 1;
                transform: translateY(0) scale(1);
                pointer-events: auto;
            }
            .qa-menu-section {
                padding: 4px 6px;
                border-bottom: 1px solid var(--border-color, #f3f4f6);
            }
            .qa-menu-section:last-child { border-bottom: none; }
            .qa-menu-section-title {
                font-size: 11px;
                color: var(--text-secondary, #6b7280);
                font-weight: 600;
                padding: 4px 8px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .qa-menu-item {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 6px 8px;
                border-radius: 4px;
                cursor: pointer;
                color: var(--text-primary, #374151);
                font-size: 13px;
                transition: background 0.12s;
            }
            .qa-menu-item:hover { background: var(--bg-color, #f9fafb); }
            .qa-menu-item .qa-ico { font-size: 14px; width: 18px; text-align: center; flex-shrink: 0; }
            .qa-menu-item .qa-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .qa-menu-item .qa-key {
                font-size: 10px;
                color: var(--text-secondary, #9ca3af);
                background: var(--bg-color, #f3f4f6);
                padding: 1px 5px;
                border-radius: 3px;
                flex-shrink: 0;
                font-family: ui-monospace, "Consolas", monospace;
            }

            /* 角色概要面板（右侧滑入）*/
            .qa-panel {
                position: fixed;
                right: -360px;
                top: 0;
                bottom: 0;
                width: 340px;
                z-index: 250;
                background: var(--card-bg, #fff);
                border-left: 1px solid var(--border-color, #e5e7eb);
                box-shadow: -8px 0 24px rgba(0,0,0,0.1);
                transition: right 0.25s ease;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }
            .qa-panel.qa-open { right: 0; }
            .qa-panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                border-bottom: 1px solid var(--border-color, #e5e7eb);
                background: var(--bg-color, #f9fafb);
                flex-shrink: 0;
            }
            .qa-panel-header h3 {
                margin: 0;
                font-size: 15px;
                font-weight: 600;
                color: var(--text-primary, #1f2937);
            }
            .qa-panel-close {
                background: none;
                border: none;
                font-size: 22px;
                color: var(--text-secondary, #6b7280);
                cursor: pointer;
                padding: 0 4px;
                line-height: 1;
            }
            .qa-panel-close:hover { color: var(--text-primary, #1f2937); }
            .qa-panel-body {
                flex: 1;
                overflow-y: auto;
                padding: 12px 16px;
            }
            .qa-panel-section { margin-bottom: 16px; }
            .qa-panel-section h4 {
                margin: 0 0 8px 0;
                font-size: 12px;
                color: var(--text-secondary, #6b7280);
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .qa-panel-empty {
                color: var(--text-secondary, #9ca3af);
                font-size: 13px;
                padding: 8px 0;
                text-align: center;
            }
            .qa-stat-row {
                display: flex;
                justify-content: space-between;
                padding: 4px 0;
                font-size: 13px;
                border-bottom: 1px dashed var(--border-color, #f3f4f6);
            }
            .qa-stat-row:last-child { border-bottom: none; }
            .qa-stat-label { color: var(--text-secondary, #6b7280); }
            .qa-stat-value { font-weight: 500; color: var(--text-primary, #1f2937); }
            .qa-chip-list { display: flex; flex-wrap: wrap; gap: 4px; }
            .qa-chip {
                display: inline-flex;
                align-items: center;
                gap: 3px;
                background: var(--bg-color, #f3f4f6);
                padding: 3px 8px;
                border-radius: 10px;
                font-size: 12px;
                color: var(--text-primary, #374151);
            }
            .qa-panel-footer {
                padding: 8px 12px;
                border-top: 1px solid var(--border-color, #e5e7eb);
                background: var(--bg-color, #f9fafb);
                font-size: 11px;
                color: var(--text-secondary, #9ca3af);
                text-align: center;
                flex-shrink: 0;
            }
            @media (max-width: 600px) {
                .qa-panel { width: 100%; right: -100%; }
                .qa-panel.qa-open { right: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    // ==================== FAB ====================
    let fabEl = null;
    let menuEl = null;

    function buildFAB() {
        fabEl = document.createElement('button');
        fabEl.className = 'qa-fab';
        fabEl.title = '快捷入口 (Ctrl+Shift+P)';
        fabEl.setAttribute('aria-label', '快捷入口');
        fabEl.textContent = '+';
        fabEl.addEventListener('click', function (e) {
            e.stopPropagation();
            toggleMenu();
        });
        document.body.appendChild(fabEl);
    }

    function buildMenu() {
        menuEl = document.createElement('div');
        menuEl.className = 'qa-menu';
        menuEl.setAttribute('role', 'menu');
        renderMenuContent();
        document.body.appendChild(menuEl);

        // 点击外部关闭
        document.addEventListener('click', function (e) {
            if (!menuEl.classList.contains('qa-open')) return;
            if (menuEl.contains(e.target) || fabEl.contains(e.target)) return;
            closeMenu();
        });
    }

    function renderMenuContent() {
        const writingMods = [
            { id: 'chapters', name: '章节管理', icon: '📝', key: 'H' },
            { id: 'writing-dashboard', name: '写作仪表盘', icon: '📊', key: null },
            { id: 'inspiration', name: '灵感收集', icon: '💡', key: null },
            { id: 'phrase-library', name: '预设文本库', icon: '📔', key: null }
        ];
        const worldMods = [
            { id: 'worldview', name: '世界观设定', icon: '🌍', key: 'V' },
            { id: 'glossary', name: '术语表', icon: '📖', key: 'G' },
            { id: 'timeline', name: '时间线', icon: '⏱️', key: 'T' },
            { id: 'fulltext-search', name: '全文搜索', icon: '🔍', key: 'F' }
        ];
        const dataMods = [
            { id: 'character', name: '角色信息', icon: '👤', key: 'C' },
            { id: 'currency', name: '货币', icon: '🪙', key: 'M' },
            { id: 'inventory', name: '背包', icon: '🎒', key: 'I' },
            { id: 'item-library', name: '物品库', icon: '📚', key: 'L' },
            { id: 'equipment', name: '装备槽', icon: '⚔️', key: 'E' },
            { id: 'quests', name: '任务', icon: '📜', key: 'Q' },
            { id: 'skills', name: '技能', icon: '✨', key: 'K' },
            { id: 'story', name: '剧情', icon: '📘', key: 'Y' }
        ];

        const sections = [
            { title: '写作', mods: writingMods },
            { title: '世界与设定', mods: worldMods },
            { title: '数据模块', mods: dataMods }
        ];

        let html = '';
        // 顶部：角色面板 + AI 切换
        html += `
            <div class="qa-menu-section">
                <div class="qa-menu-section-title">快捷</div>
                <div class="qa-menu-item" data-action="panel">
                    <span class="qa-ico">📊</span>
                    <span class="qa-label">角色概要面板</span>
                    <span class="qa-key">Ctrl+Shift+P</span>
                </div>
                <div class="qa-menu-item" data-action="ai-toggle">
                    <span class="qa-ico">🤖</span>
                    <span class="qa-label">切换 AI 对话栏</span>
                </div>
            </div>
        `;
        sections.forEach(function (sec) {
            html += '<div class="qa-menu-section">';
            html += '<div class="qa-menu-section-title">' + sec.title + '</div>';
            sec.mods.forEach(function (m) {
                const keyHint = m.key ? '<span class="qa-key">⌃⇧' + m.key + '</span>' : '';
                html += `
                    <div class="qa-menu-item" data-module="${m.id}">
                        <span class="qa-ico">${m.icon}</span>
                        <span class="qa-label">${m.name}</span>
                        ${keyHint}
                    </div>
                `;
            });
            html += '</div>';
        });

        menuEl.innerHTML = html;

        // 绑定点击
        menuEl.querySelectorAll('.qa-menu-item').forEach(function (item) {
            item.addEventListener('click', function () {
                const action = item.dataset.action;
                const mod = item.dataset.module;
                if (action === 'panel') {
                    closeMenu();
                    openCharacterPanel();
                } else if (action === 'ai-toggle') {
                    closeMenu();
                    toggleAiChatBar();
                } else if (mod) {
                    closeMenu();
                    navigateToModule(mod);
                }
            });
        });
    }

    function toggleMenu() {
        if (!menuEl) return;
        const isOpen = menuEl.classList.contains('qa-open');
        if (isOpen) {
            closeMenu();
        } else {
            openMenu();
        }
    }

    function openMenu() {
        if (!menuEl) return;
        menuEl.classList.add('qa-open');
        fabEl.classList.add('qa-active');
    }

    function closeMenu() {
        if (!menuEl) return;
        menuEl.classList.remove('qa-open');
        fabEl.classList.remove('qa-active');
    }

    // ==================== 导航 ====================
    function navigateToModule(moduleId) {
        if (typeof switchPage === 'function') {
            switchPage(moduleId);
        } else if (typeof ModuleRegistry !== 'undefined' && ModuleRegistry.handleNavClick) {
            ModuleRegistry.handleNavClick(moduleId);
        } else {
            console.warn('[quick_access] 无可用导航方法');
        }
    }

    function toggleAiChatBar() {
        const bar = document.getElementById('ai-chat-bar');
        if (!bar) return;
        const toggleBtn = document.getElementById('ai-chat-toggle');
        if (toggleBtn) {
            toggleBtn.click();
        } else {
            bar.classList.toggle('ai-chat-collapsed');
        }
    }

    // ==================== 角色概要面板 ====================
    let panelEl = null;

    function buildPanel() {
        panelEl = document.createElement('div');
        panelEl.className = 'qa-panel';
        panelEl.setAttribute('aria-label', '角色概要面板');
        panelEl.innerHTML = `
            <div class="qa-panel-header">
                <h3>📊 角色概要</h3>
                <button class="qa-panel-close" title="关闭 (Esc)">&times;</button>
            </div>
            <div class="qa-panel-body" id="qa-panel-body">
                <div class="qa-panel-empty">加载中…</div>
            </div>
            <div class="qa-panel-footer">数据从本地存储实时读取 · Ctrl+Shift+P 切换</div>
        `;
        document.body.appendChild(panelEl);

        panelEl.querySelector('.qa-panel-close').addEventListener('click', closeCharacterPanel);
    }

    async function refreshPanelContent() {
        const body = panelEl ? panelEl.querySelector('#qa-panel-body') : null;
        if (!body) return;
        try {
            const [character, currency, currencyTypes, inventory, skillsCustom, questsCustom, equipment] = await Promise.all([
                apiRequest('/api/mod/character'),
                apiRequest('/api/mod/currency'),
                apiRequest('/api/mod/currency_types'),
                apiRequest('/api/mod/inventory'),
                apiRequest('/api/mod/skills_custom'),
                apiRequest('/api/mod/quests_custom'),
                apiRequest('/api/mod/equipment_slots')
            ]);

            let html = '';

            // 角色信息
            html += '<div class="qa-panel-section"><h4>角色</h4>';
            if (character && typeof character === 'object' && Object.keys(character).length > 0) {
                const fields = ['name', 'title', 'level', 'gender', 'age', 'race', 'class', 'occupation'];
                let hasAny = false;
                fields.forEach(function (f) {
                    if (character[f] !== undefined && character[f] !== null && character[f] !== '') {
                        hasAny = true;
                        html += `<div class="qa-stat-row"><span class="qa-stat-label">${f}</span><span class="qa-stat-value">${escapeHtml(String(character[f]))}</span></div>`;
                    }
                });
                if (!hasAny) {
                    html += '<div class="qa-panel-empty">角色字段为空</div>';
                }
            } else {
                html += '<div class="qa-panel-empty">暂无角色数据</div>';
            }
            html += '</div>';

            // 货币
            html += '<div class="qa-panel-section"><h4>货币</h4>';
            if (currency && typeof currency === 'object' && Object.keys(currency).length > 0) {
                Object.entries(currency).forEach(function (entry) {
                    const type = entry[0];
                    const amount = entry[1];
                    const tinfo = (currencyTypes && currencyTypes[type]) || {};
                    const icon = tinfo.icon || '🪙';
                    const name = tinfo.name || type;
                    html += `<div class="qa-stat-row"><span class="qa-stat-label">${icon} ${escapeHtml(name)}</span><span class="qa-stat-value">${escapeHtml(String(amount))}</span></div>`;
                });
            } else {
                html += '<div class="qa-panel-empty">暂无货币</div>';
            }
            html += '</div>';

            // 背包统计
            const invItems = normalizeItemsToArray(inventory);
            html += '<div class="qa-panel-section"><h4>背包</h4>';
            if (invItems.length > 0) {
                const totalQty = invItems.reduce(function (s, i) { return s + (Number(i.quantity) || 0); }, 0);
                html += `<div class="qa-stat-row"><span class="qa-stat-label">物品种类</span><span class="qa-stat-value">${invItems.length}</span></div>`;
                html += `<div class="qa-stat-row"><span class="qa-stat-label">总数量</span><span class="qa-stat-value">${totalQty}</span></div>`;
                // 前 5 个物品
                const top = invItems.slice(0, 5);
                html += '<div class="qa-chip-list" style="margin-top:6px;">';
                top.forEach(function (it) {
                    html += `<span class="qa-chip">${escapeHtml(it.icon || '📦')} ${escapeHtml(it.name || it.id || '?')} ×${escapeHtml(String(it.quantity || 1))}</span>`;
                });
                if (invItems.length > 5) {
                    html += `<span class="qa-chip">+${invItems.length - 5}</span>`;
                }
                html += '</div>';
            } else {
                html += '<div class="qa-panel-empty">背包为空</div>';
            }
            html += '</div>';

            // 技能
            const skillsArr = normalizeItemsToArray(skillsCustom);
            html += '<div class="qa-panel-section"><h4>技能</h4>';
            if (skillsArr.length > 0) {
                html += '<div class="qa-chip-list">';
                skillsArr.slice(0, 12).forEach(function (s) {
                    const lv = s.level !== undefined ? ' Lv' + s.level : '';
                    html += `<span class="qa-chip">${escapeHtml(s.icon || '✨')} ${escapeHtml(s.name || s.id || '?')}${lv}</span>`;
                });
                if (skillsArr.length > 12) {
                    html += `<span class="qa-chip">+${skillsArr.length - 12}</span>`;
                }
                html += '</div>';
            } else {
                html += '<div class="qa-panel-empty">暂无自定义技能</div>';
            }
            html += '</div>';

            // 任务
            const questsArr = normalizeItemsToArray(questsCustom);
            html += '<div class="qa-panel-section"><h4>任务</h4>';
            if (questsArr.length > 0) {
                const byStatus = { pending: 0, active: 0, completed: 0, failed: 0 };
                questsArr.forEach(function (q) {
                    const st = q.status || 'pending';
                    byStatus[st] = (byStatus[st] || 0) + 1;
                });
                html += `<div class="qa-stat-row"><span class="qa-stat-label">未开始</span><span class="qa-stat-value">${byStatus.pending}</span></div>`;
                html += `<div class="qa-stat-row"><span class="qa-stat-label">进行中</span><span class="qa-stat-value">${byStatus.active}</span></div>`;
                html += `<div class="qa-stat-row"><span class="qa-stat-label">已完成</span><span class="qa-stat-value">${byStatus.completed}</span></div>`;
                html += `<div class="qa-stat-row"><span class="qa-stat-label">已失败</span><span class="qa-stat-value">${byStatus.failed}</span></div>`;
            } else {
                html += '<div class="qa-panel-empty">暂无任务</div>';
            }
            html += '</div>';

            // 装备槽
            const slotsArr = normalizeItemsToArray(equipment);
            html += '<div class="qa-panel-section"><h4>装备槽</h4>';
            if (slotsArr.length > 0) {
                html += '<div class="qa-chip-list">';
                slotsArr.slice(0, 10).forEach(function (s) {
                    html += `<span class="qa-chip">${escapeHtml(s.icon || '⚔️')} ${escapeHtml(s.name || s.slot_id || s.id || '?')}</span>`;
                });
                if (slotsArr.length > 10) {
                    html += `<span class="qa-chip">+${slotsArr.length - 10}</span>`;
                }
                html += '</div>';
            } else {
                html += '<div class="qa-panel-empty">暂无装备槽定义</div>';
            }
            html += '</div>';

            body.innerHTML = html;
        } catch (e) {
            body.innerHTML = '<div class="qa-panel-empty">加载失败: ' + escapeHtml(e.message || String(e)) + '</div>';
        }
    }

    function normalizeItemsToArray(raw) {
        if (Array.isArray(raw)) return raw;
        if (raw && typeof raw === 'object') {
            return Object.entries(raw).map(function (entry) {
                const k = entry[0];
                const v = entry[1];
                if (v && typeof v === 'object' && !Array.isArray(v)) {
                    const item = Object.assign({}, v);
                    if (!item.id) item.id = k;
                    return item;
                }
                return { id: k, value: v };
            });
        }
        return [];
    }

    function openCharacterPanel() {
        if (!panelEl) return;
        panelEl.classList.add('qa-open');
        refreshPanelContent();
    }

    function closeCharacterPanel() {
        if (!panelEl) return;
        panelEl.classList.remove('qa-open');
    }

    function toggleCharacterPanel() {
        if (!panelEl) return;
        if (panelEl.classList.contains('qa-open')) {
            closeCharacterPanel();
        } else {
            openCharacterPanel();
        }
    }

    // ==================== 工具 ====================
    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // ==================== 全局快捷键 ====================
    function onGlobalKeyDown(e) {
        // 仅响应 Ctrl+Shift+Letter
        if (!e.ctrlKey || !e.shiftKey) return;
        // 在输入框/编辑器中不触发（避免干扰输入）
        const tag = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) {
            // 允许 Ctrl+Shift+P 在输入框中也可触发面板
            if (e.key !== 'P' && e.key !== 'p') return;
        }
        const key = (e.key || '').toUpperCase();
        const sc = SHORTCUTS.find(function (s) { return s.key === key; });
        if (!sc) return;
        e.preventDefault();
        e.stopPropagation();
        closeMenu();
        if (typeof sc.action === 'function') {
            sc.action();
        } else if (sc.moduleId) {
            navigateToModule(sc.moduleId);
            showToast(sc.label + ' · ' + sc.desc, 'info');
        }
    }

    // ==================== 初始化 ====================
    function init() {
        injectStyle();
        buildFAB();
        buildMenu();
        buildPanel();
        document.addEventListener('keydown', onGlobalKeyDown);
        // Esc 关闭面板/菜单
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                if (panelEl && panelEl.classList.contains('qa-open')) {
                    closeCharacterPanel();
                } else if (menuEl && menuEl.classList.contains('qa-open')) {
                    closeMenu();
                }
            }
        });
        console.log('[quick_access] FAB + 快捷键 + 角色面板已就绪');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // 暴露 API
    window.QuickAccess = {
        openMenu: openMenu,
        closeMenu: closeMenu,
        toggleMenu: toggleMenu,
        openPanel: openCharacterPanel,
        closePanel: closeCharacterPanel,
        togglePanel: toggleCharacterPanel,
        refreshPanel: refreshPanelContent,
        navigateTo: navigateToModule
    };
})();
