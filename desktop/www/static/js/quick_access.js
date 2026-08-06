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

            /* 6.2-A 快速操作面板（右侧滑入，tab 式内容预览卡）*/
            .qa-panel {
                position: fixed;
                right: -380px;
                top: 0;
                bottom: 0;
                width: 360px;
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
                display: flex; justify-content: space-between; align-items: center;
                padding: 10px 14px; border-bottom: 1px solid var(--border-color, #e5e7eb);
                background: var(--bg-color, #f9fafb); flex-shrink: 0;
            }
            .qa-panel-header h3 { margin: 0; font-size: 14px; font-weight: 600; color: var(--text-primary, #1f2937); }
            .qa-panel-close {
                background: none; border: none; font-size: 22px; line-height: 1;
                color: var(--text-secondary, #6b7280); cursor: pointer; padding: 0 4px;
            }
            .qa-panel-close:hover { color: var(--text-primary, #1f2937); }
            /* 角色快照区 */
            .qa-snapshot {
                padding: 8px 14px; border-bottom: 1px solid var(--border-color, #e5e7eb);
                background: var(--card-bg, #fff); flex-shrink: 0;
            }
            .qa-snapshot-row { display: flex; justify-content: space-between; font-size: 12px; padding: 2px 0; }
            .qa-snapshot-label { color: var(--text-secondary, #6b7280); }
            .qa-snapshot-value { font-weight: 500; color: var(--text-primary, #1f2937); }
            /* Tab 栏 */
            .qa-panel-tabs {
                display: flex; gap: 2px; padding: 4px 8px; flex-shrink: 0;
                border-bottom: 1px solid var(--border-color, #e5e7eb); background: var(--bg-color, #f9fafb);
                overflow-x: auto;
            }
            .qa-tab {
                padding: 5px 10px; border: none; background: transparent; cursor: pointer;
                border-radius: 4px 4px 0 0; font-size: 12px; color: var(--text-secondary, #6b7280);
                border-bottom: 2px solid transparent; white-space: nowrap; transition: color 0.12s, border-color 0.12s;
            }
            .qa-tab:hover { color: var(--text-primary, #374151); }
            .qa-tab.active { color: var(--primary-color, #6366f1); border-bottom-color: var(--primary-color, #6366f1); font-weight: 600; }
            /* Tab 内容 */
            .qa-panel-body { flex: 1; overflow-y: auto; padding: 6px 10px; min-height: 120px; }
            .qa-tab-content { display: none; }
            .qa-tab-content.active { display: block; }
            .qa-panel-item {
                display: flex; align-items: flex-start; gap: 6px; padding: 5px 6px;
                border-radius: 4px; font-size: 12px; transition: background 0.12s;
            }
            .qa-panel-item:hover { background: var(--bg-color, #f3f4f6); }
            .qa-panel-item.selected { background: rgba(99,102,241,0.10); }
            .qa-panel-item input[type=checkbox] { margin-top: 2px; cursor: pointer; flex-shrink: 0; }
            .qa-panel-item-text { flex: 1; min-width: 0; color: var(--text-primary, #374151); word-break: break-word; line-height: 1.45; }
            .qa-panel-item-edit {
                flex-shrink: 0; background: none; border: none; cursor: pointer; font-size: 13px;
                color: var(--text-secondary, #9ca3af); padding: 0 2px; line-height: 1;
            }
            .qa-panel-item-edit:hover { color: var(--primary-color, #6366f1); }
            .qa-panel-empty { color: var(--text-secondary, #9ca3af); font-size: 12px; padding: 16px 0; text-align: center; }
            .qa-stat-row { display: flex; justify-content: space-between; padding: 2px 0; font-size: 12px; }
            .qa-stat-label { color: var(--text-secondary, #6b7280); }
            .qa-stat-value { font-weight: 500; color: var(--text-primary, #1f2937); }
            .qa-chip-list { display: flex; flex-wrap: wrap; gap: 4px; }
            .qa-chip {
                display: inline-flex; align-items: center; gap: 3px;
                background: var(--bg-color, #f3f4f6); padding: 3px 8px; border-radius: 10px;
                font-size: 12px; color: var(--text-primary, #374151);
            }
            /* 底部操作栏 */
            .qa-panel-footer {
                padding: 6px 10px; border-top: 1px solid var(--border-color, #e5e7eb);
                background: var(--bg-color, #f9fafb); flex-shrink: 0;
                display: flex; align-items: center; gap: 4px; flex-wrap: wrap;
            }
            .qa-panel-footer .qa-select-all { display: flex; align-items: center; gap: 3px; font-size: 11px; color: var(--text-secondary, #6b7280); cursor: pointer; }
            .qa-panel-footer .qa-selected-count { font-size: 11px; color: var(--primary-color, #6366f1); font-weight: 600; margin-right: auto; }
            .qa-panel-footer .aq-btn {
                font-size: 11px; padding: 3px 8px; border-radius: 4px; cursor: pointer;
                border: 1px solid var(--border-color, #e5e7eb); background: var(--card-bg, #fff);
                color: var(--text-primary, #374151); transition: background 0.12s, color 0.12s;
            }
            .qa-panel-footer .aq-btn:hover { background: var(--primary-color, #6366f1); color: #fff; border-color: var(--primary-color, #6366f1); }
            .qa-panel-footer .aq-btn.aq-expand { color: var(--text-secondary, #6b7280); }
            .qa-panel-footer .aq-btn.aq-expand:hover { background: var(--bg-color, #f3f4f6); color: var(--text-primary, #374151); border-color: var(--border-color, #e5e7eb); }
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
        fabEl.title = '短按: 角色概要 / 长按: 导航菜单 (Ctrl+Shift+P)';
        fabEl.setAttribute('aria-label', '快捷入口（短按角色概要，长按导航菜单）');
        fabEl.textContent = '+';

        // 短按/长按区分：短按 → 角色概要面板；长按(≥500ms) → 导航菜单
        const LONG_PRESS_MS = 500;
        let pressTimer = null;
        let longPressFired = false;

        function startPress() {
            longPressFired = false;
            pressTimer = setTimeout(function () {
                longPressFired = true;
                pressTimer = null;
                // 长按：打开导航菜单（若面板已开则先关）
                closeCharacterPanel();
                openMenu();
            }, LONG_PRESS_MS);
        }
        function cancelPress() {
            if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
        }

        fabEl.addEventListener('mousedown', startPress);
        fabEl.addEventListener('touchstart', startPress, { passive: true });
        fabEl.addEventListener('mouseup', cancelPress);
        fabEl.addEventListener('mouseleave', cancelPress);
        fabEl.addEventListener('touchend', cancelPress);
        fabEl.addEventListener('touchcancel', cancelPress);

        fabEl.addEventListener('click', function (e) {
            e.stopPropagation();
            if (longPressFired) {
                // 长按已触发菜单，忽略 click
                longPressFired = false;
                return;
            }
            // 短按：切换角色概要面板（若菜单已开则先关）
            closeMenu();
            toggleCharacterPanel();
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
            { id: 'chapters', name: '章节管理', icon: 'note', key: 'H' },
            { id: 'writing-dashboard', name: '写作仪表盘', icon: 'chart', key: null },
            { id: 'inspiration', name: '灵感收集', icon: 'lightbulb', key: null },
            { id: 'phrase-library', name: '预设文本库', icon: 'book', key: null }
        ];
        const worldMods = [
            { id: 'worldview', name: '世界观设定', icon: 'earth', key: 'V' },
            { id: 'glossary', name: '术语表', icon: 'book', key: 'G' },
            { id: 'timeline', name: '时间线', icon: 'hourglass', key: 'T' },
            { id: 'fulltext-search', name: '全文搜索', icon: 'search', key: 'F' }
        ];
        const dataMods = [
            { id: 'character', name: '角色信息', icon: 'user', key: 'C' },
            { id: 'currency', name: '货币', icon: 'coin', key: 'M' },
            { id: 'inventory', name: '背包', icon: 'backpack', key: 'I' },
            { id: 'item-library', name: '物品库', icon: 'shop', key: 'L' },
            { id: 'equipment', name: '装备槽', icon: 'sword', key: 'E' },
            { id: 'quests', name: '任务', icon: 'scroll', key: 'Q' },
            { id: 'skills', name: '技能', icon: 'spark', key: 'K' },
            { id: 'story', name: '剧情', icon: 'book', key: 'Y' }
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
                    <span class="qa-ico">${iconHtml('chart', 16)}</span>
                    <span class="qa-label">角色概要面板</span>
                    <span class="qa-key">Ctrl+Shift+P</span>
                </div>
                <div class="qa-menu-item" data-action="ai-toggle">
                    <span class="qa-ico">${iconHtml('robot', 16)}</span>
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
                        <span class="qa-ico">${iconHtml(m.icon, 16)}</span>
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

    // 6.2-A/D 面板状态：tab + 多选
    const panelData = { character: null, currency: null, currencyTypes: null, inventory: null, skills: null, quests: null, equipment: null, glossary: null };
    const panelState = { currentTab: 'inventory', selected: { currency: new Set(), inventory: new Set(), skills: new Set(), quests: new Set() } };
    const TABS = [
        { id: 'inventory', icon: 'backpack', label: '背包', moduleId: 'inventory' },
        { id: 'currency', icon: 'coin', label: '货币', moduleId: 'currency' },
        { id: 'skills', icon: 'spark', label: '技能', moduleId: 'skills' },
        { id: 'quests', icon: 'scroll', label: '任务', moduleId: 'quests' },
        { id: 'character', icon: 'user', label: '角色', moduleId: 'character' },
        { id: 'equipment', icon: 'shop', label: '装备', moduleId: 'equipment' },
        { id: 'glossary', icon: 'book', label: '术语', moduleId: 'glossary' }
    ];

    function buildPanel() {
        panelEl = document.createElement('div');
        panelEl.className = 'qa-panel';
        panelEl.setAttribute('aria-label', '快速操作面板');
        const tabBtns = TABS.map(function (t, i) {
            return '<button class="qa-tab' + (i === 0 ? ' active' : '') + '" data-tab="' + t.id + '">' + iconHtml(t.icon, 13) + ' ' + t.label + '</button>';
        }).join('');
        panelEl.innerHTML =
            '<div class="qa-panel-header">' +
            '  <h3>' + iconHtml('chart', 15) + ' 快速操作面板</h3>' +
            '  <button class="qa-panel-close" title="关闭 (Esc)">&times;</button>' +
            '</div>' +
            '<div class="qa-snapshot" id="qa-snapshot"><div class="qa-panel-empty">加载中…</div></div>' +
            '<div class="qa-panel-tabs">' + tabBtns + '</div>' +
            '<div class="qa-panel-body" id="qa-panel-body"><div class="qa-panel-empty">加载中…</div></div>' +
            '<div class="qa-panel-footer">' +
            '  <label class="qa-select-all"><input type="checkbox" id="qa-select-all"> 全选</label>' +
            '  <span class="qa-selected-count">已选 0</span>' +
            '  <button class="aq-btn qa-to-chat" title="将选中条目追加到对话框">' + iconHtml('chat', 13) + ' 对话</button>' +
            '  <button class="aq-btn qa-to-chapter" title="将选中条目插入当前章节正文">' + iconHtml('note', 13) + ' 正文</button>' +
            '  <button class="aq-btn aq-expand" title="跳转到当前 tab 的完整页面">展开 ↗</button>' +
            '</div>';
        document.body.appendChild(panelEl);

        panelEl.querySelector('.qa-panel-close').addEventListener('click', closeCharacterPanel);
        // 面板事件委托：编辑按钮 + 条目点击勾选（避免逐元素绑定与内联 onclick）
        panelEl.addEventListener('click', handlePanelClick);
        // Tab 切换
        panelEl.querySelectorAll('.qa-tab').forEach(function (btn) {
            btn.addEventListener('click', function () {
                const tabId = btn.dataset.tab;
                switchTab(tabId);
            });
        });
        // 全选
        const selectAll = panelEl.querySelector('#qa-select-all');
        if (selectAll) selectAll.addEventListener('change', function () {
            toggleSelectAll(selectAll.checked);
        });
        // 加入对话
        panelEl.querySelector('.qa-to-chat').addEventListener('click', function () {
            const text = collectSelectedText();
            if (!text) { showToastMsg('请先勾选条目', 'info'); return; }
            if (window.ContentImporter && window.ContentImporter.toChat) window.ContentImporter.toChat(text);
            else { appendToChatInput(text); showToastMsg('已加入对话栏', 'success'); }
        });
        // 加入正文
        panelEl.querySelector('.qa-to-chapter').addEventListener('click', function () {
            const text = collectSelectedText();
            if (!text) { showToastMsg('请先勾选条目', 'info'); return; }
            if (window.ContentImporter && window.ContentImporter.toChapter) window.ContentImporter.toChapter(text);
            else showToastMsg('ContentImporter 未就绪', 'error');
        });
        // 展开
        panelEl.querySelector('.aq-expand').addEventListener('click', function () {
            const tab = TABS.find(function (t) { return t.id === panelState.currentTab; });
            if (tab && typeof switchPage === 'function') {
                switchPage(tab.moduleId);
                closeCharacterPanel();
            }
        });
    }

    function switchTab(tabId) {
        panelState.currentTab = tabId;
        panelEl.querySelectorAll('.qa-tab').forEach(function (b) {
            b.classList.toggle('active', b.dataset.tab === tabId);
        });
        renderTabContent(tabId);
        updatePanelCount();
    }

    async function refreshPanelContent() {
        if (!panelEl) return;
        const snapEl = panelEl.querySelector('#qa-snapshot');
        try {
            const [character, currency, currencyTypes, inventory, skillsCustom, questsCustom, equipment, glossary] = await Promise.all([
                apiRequest('/api/mod/character'),
                apiRequest('/api/mod/currency'),
                apiRequest('/api/mod/currency_types'),
                apiRequest('/api/mod/inventory'),
                apiRequest('/api/mod/skills_custom'),
                apiRequest('/api/mod/quests_custom'),
                apiRequest('/api/mod/equipment_slots'),
                apiRequest('/api/mod/glossary')
            ]);
            panelData.character = character;
            panelData.currency = currency;
            panelData.currencyTypes = currencyTypes;
            panelData.inventory = normalizeItemsToArray(inventory);
            panelData.skills = normalizeItemsToArray(skillsCustom);
            panelData.quests = normalizeItemsToArray(questsCustom);
            panelData.equipment = normalizeItemsToArray(equipment);
            panelData.glossary = normalizeItemsToArray(glossary);

            // 渲染角色快照
            renderSnapshot(snapEl, character);
            // 渲染当前 tab
            renderTabContent(panelState.currentTab);
            updatePanelCount();
        } catch (e) {
            if (snapEl) snapEl.innerHTML = '<div class="qa-panel-empty">加载失败: ' + escapeHtml(e.message || String(e)) + '</div>';
        }
    }

    function renderSnapshot(el, character) {
        if (!el) return;
        if (!character || typeof character !== 'object' || Object.keys(character).length === 0) {
            el.innerHTML = '<div class="qa-panel-empty">暂无角色数据</div>';
            return;
        }
        const fields = ['name', 'title', 'level', 'gender', 'age', 'race', 'class', 'occupation'];
        let html = '';
        let hasAny = false;
        fields.forEach(function (f) {
            if (character[f] !== undefined && character[f] !== null && character[f] !== '') {
                hasAny = true;
                html += '<div class="qa-snapshot-row"><span class="qa-snapshot-label">' + f + '</span><span class="qa-snapshot-value">' + escapeHtml(String(character[f])) + '</span></div>';
            }
        });
        if (!hasAny) html = '<div class="qa-panel-empty">角色字段为空</div>';
        el.innerHTML = html;
    }

    // 获取当前 tab 的条目列表
    function getTabItems(tabId) {
        if (tabId === 'currency') {
            const cur = panelData.currency || {};
            const types = panelData.currencyTypes || {};
            return Object.keys(cur).map(function (k) {
                const t = types[k] || {};
                return { key: k, name: t.name || k, icon: t.icon || 'coin', value: cur[k] };
            });
        }
        if (tabId === 'character') {
            const c = panelData.character || {};
            const rows = [];
            if (c.name) rows.push({ key: 'name', name: c.name, icon: 'user' });
            if (c.level !== undefined && c.level !== null && c.level !== '') rows.push({ key: 'level', name: '等级: ' + c.level, icon: 'star' });
            if (c.title) rows.push({ key: 'title', name: '称号: ' + c.title, icon: 'tag' });
            if (c.race) rows.push({ key: 'race', name: '种族: ' + c.race, icon: 'leaf' });
            if (c.gender) rows.push({ key: 'gender', name: '性别: ' + c.gender, icon: 'heart' });
            if (c.class) rows.push({ key: 'class', name: '职业: ' + c.class, icon: 'sword' });
            return rows;
        }
        if (tabId === 'equipment') {
            const eq = panelData.equipment || {};
            if (Array.isArray(eq)) return eq;
            return Object.keys(eq).map(function (slot) {
                const it = eq[slot] || {};
                return { key: slot, name: (it.name || slot) + (it.slot ? '（' + it.slot + '）' : ''), icon: it.icon || 'shield' };
            });
        }
        if (tabId === 'glossary') return panelData.glossary || [];
        if (tabId === 'inventory') return panelData.inventory || [];
        if (tabId === 'skills') return panelData.skills || [];
        if (tabId === 'quests') return panelData.quests || [];
        return [];
    }

    // 当前 tab 对应的 ContentImporter moduleId
    function getTabModuleId(tabId) {
        const tab = TABS.find(function (t) { return t.id === tabId; });
        return tab ? tab.moduleId : tabId;
    }

    function renderTabContent(tabId) {
        const body = panelEl.querySelector('#qa-panel-body');
        if (!body) return;
        const items = getTabItems(tabId);
        if (!items || items.length === 0) {
            body.innerHTML = '<div class="qa-panel-empty">该模块暂无条目</div>';
            return;
        }
        const sel = panelState.selected[tabId] || new Set();
        const modId = getTabModuleId(tabId);
        const maxShow = 30;
        const showItems = items.slice(0, maxShow);
        let html = '';
        showItems.forEach(function (item, idx) {
            let text;
            if (window.ContentImporter && window.ContentImporter.formatItem) {
                text = window.ContentImporter.formatItem(modId, item, 'compact');
            } else {
                text = item.name || item.title || item.id || JSON.stringify(item).slice(0, 60);
            }
            const checked = sel.has(idx) ? 'checked' : '';
            const selCls = sel.has(idx) ? ' selected' : '';
            const editBtn = renderEditButton(tabId, item, idx);
            html += '<div class="qa-panel-item' + selCls + '" data-idx="' + idx + '">';
            html += '<input type="checkbox" ' + checked + '>';
            html += '<span class="qa-panel-item-text">' + escapeHtml(text) + '</span>';
            if (editBtn) html += editBtn;
            html += '</div>';
        });
        if (items.length > maxShow) {
            html += '<div class="qa-panel-empty">还有 ' + (items.length - maxShow) + ' 条，点击「展开 ↗」查看全部</div>';
        }
        body.innerHTML = html;

        // 绑定条目交互：勾选框单独处理，条目点击由 panelEl 委托（handlePanelClick）统一处理
        body.querySelectorAll('.qa-panel-item').forEach(function (el) {
            const idx = parseInt(el.dataset.idx, 10);
            const cb = el.querySelector('input[type=checkbox]');
            if (cb) {
                cb.addEventListener('click', function (e) { e.stopPropagation(); });
                cb.addEventListener('change', function () {
                    if (cb.checked) sel.add(idx); else sel.delete(idx);
                    el.classList.toggle('selected', cb.checked);
                    updatePanelCount();
                });
            }
        });
    }

    // 6.2-C 编辑按钮（复用全局 showEditXxx，无则显示跳转提示）
    // 事件通过事件委托在 handlePanelClick 中处理，避免内联 onclick 字符串拼接
    function renderEditButton(tabId, item, idx) {
        const id = item.id || item.key || item.item_id;
        if (!id) return '';
        const editId = String(id).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const mode = (tabId === 'inventory' && typeof window.showEditItem === 'function') ? 'edit-item'
            : (tabId === 'currency' && typeof window.showAddCurrencyType === 'function') ? 'edit-currency'
            : 'jump';
        return '<button class="qa-panel-item-edit" title="编辑" data-edit-mode="' + mode + '" data-edit-id="' + editId + '">' + iconHtml('edit', 13) + '</button>';
    }

    // 面板条目事件委托：处理编辑按钮点击
    function handlePanelClick(e) {
        const editBtn = e.target.closest('.qa-panel-item-edit');
        if (editBtn) {
            e.stopPropagation();
            const tabId = panelState.currentTab;
            const mode = editBtn.dataset.editMode;
            if (mode === 'edit-item' && typeof window.showEditItem === 'function') {
                window.showEditItem(editBtn.dataset.editId);
            } else if (mode === 'edit-currency' && typeof window.showAddCurrencyType === 'function') {
                window.showAddCurrencyType();
            } else {
                // 无直接编辑函数 → 点击展开到模块页
                const modId = getTabModuleId(tabId);
                if (typeof switchPage === 'function') switchPage(modId);
            }
            return;
        }
        // 点击条目本身 → 切换勾选
        const itemEl = e.target.closest('.qa-panel-item');
        if (itemEl && e.target.tagName !== 'INPUT') {
            togglePanelItem(panelState.currentTab, parseInt(itemEl.dataset.idx, 10));
        }
    }

    function togglePanelItem(tabId, idx) {
        const sel = panelState.selected[tabId] || new Set();
        const el = panelEl.querySelector('.qa-panel-item[data-idx="' + idx + '"]');
        if (!el) return;
        const cb = el.querySelector('input[type=checkbox]');
        if (cb) {
            cb.checked = !cb.checked;
            if (cb.checked) sel.add(idx); else sel.delete(idx);
            el.classList.toggle('selected', cb.checked);
            updatePanelCount();
        }
    }

    function toggleSelectAll(checked) {
        const tabId = panelState.currentTab;
        const sel = panelState.selected[tabId] || new Set();
        const items = getTabItems(tabId);
        const maxShow = Math.min(items.length, 30);
        sel.clear();
        if (checked) {
            for (let i = 0; i < maxShow; i++) sel.add(i);
        }
        renderTabContent(tabId);
        updatePanelCount();
    }

    function collectSelectedText() {
        const tabId = panelState.currentTab;
        const sel = panelState.selected[tabId] || new Set();
        const items = getTabItems(tabId);
        const modId = getTabModuleId(tabId);
        const idxs = Array.from(sel).sort(function (a, b) { return a - b; });
        return idxs.map(function (i) { return items[i]; }).filter(Boolean).map(function (it) {
            if (window.ContentImporter && window.ContentImporter.formatItem) {
                return window.ContentImporter.formatItem(modId, it, 'compact');
            }
            return it.name || it.title || it.id || '';
        }).join('\n');
    }

    function updatePanelCount() {
        if (!panelEl) return;
        const tabId = panelState.currentTab;
        const sel = panelState.selected[tabId] || new Set();
        const countEl = panelEl.querySelector('.qa-selected-count');
        if (countEl) countEl.textContent = '已选 ' + sel.size;
        const selectAll = panelEl.querySelector('#qa-select-all');
        if (selectAll) {
            const items = getTabItems(tabId);
            const visible = Math.min(items.length, 30);
            selectAll.checked = visible > 0 && sel.size === visible;
        }
    }

    function appendToChatInput(text) {
        const input = document.getElementById('ai-chat-input');
        if (!input) return;
        const sep = (input.value && !input.value.endsWith('\n')) ? '\n' : '';
        input.value = input.value + sep + text + '\n';
        input.dispatchEvent(new Event('input'));
        input.focus();
        input.selectionStart = input.selectionEnd = input.value.length;
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
    // SVG 图标渲染 helper：key 已知时渲染 SVG，否则当作 emoji 文本显示
    function iconHtml(key, size) {
        if (window.SvgIconLib && window.SvgIconLib.renderAuto) return window.SvgIconLib.renderAuto(key, size || 16);
        return key || '';
    }
    function showToastMsg(msg, type) {
        if (typeof window.showToast === 'function') window.showToast(msg, type);
        else console.log('[quick_access]', type, msg);
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
