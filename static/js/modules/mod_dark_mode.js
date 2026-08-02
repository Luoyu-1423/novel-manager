// ============================================================
// 模块: 深色模式 (mod_dark_mode.js)
// 版本: 3.2.0
// ============================================================
(function() {
    'use strict';
    const style = document.createElement('style');
    style.textContent = `
        .dm-container { display: flex; flex-direction: column; gap: 20px; }
        .dm-section { padding: 16px; background: var(--card-bg, #fff); border: 1px solid var(--border-color, #e5e7eb); border-radius: 10px; }
        .dm-section h3 { margin: 0 0 12px 0; font-size: 15px; }
        .dm-toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-color, #e5e7eb); }
        .dm-toggle-row:last-child { border-bottom: none; }
        .dm-toggle-label { font-size: 14px; }
        .dm-toggle-desc { font-size: 12px; color: var(--text-secondary, #6b7280); }
        .dm-switch { position: relative; width: 44px; height: 24px; border-radius: 12px; background: #d1d5db; cursor: pointer; transition: background 0.2s; }
        .dm-switch.active { background: var(--primary-color, #7c3aed); }
        .dm-switch::after { content: ''; position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; border-radius: 50%; background: #fff; transition: transform 0.2s; }
        .dm-switch.active::after { transform: translateX(20px); }
        .dm-schedule { display: flex; gap: 8px; align-items: center; margin-top: 8px; }
        .dm-schedule select { padding: 4px 8px; border: 1px solid var(--border-color, #e5e7eb); border-radius: 4px; font-size: 13px; }
        .dm-preview { padding: 16px; border-radius: 8px; margin-top: 12px; transition: all 0.3s; }
        .dm-preview.light { background: #fff; color: #1f2937; border: 1px solid #e5e7eb; }
        .dm-preview.dark { background: #1f2937; color: #e5e7eb; border: 1px solid #374151; }
        .dm-themes { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; }
        .dm-theme-card { padding: 12px; border-radius: 8px; text-align: center; cursor: pointer; border: 2px solid transparent; transition: all 0.2s; }
        .dm-theme-card:hover { transform: translateY(-2px); }
        .dm-theme-card.active { border-color: var(--primary-color, #7c3aed); }
        .dm-theme-swatch { width: 40px; height: 40px; border-radius: 50%; margin: 0 auto 8px; border: 2px solid rgba(0,0,0,0.1); }
        .dm-theme-name { font-size: 12px; }
    `;
    document.head.appendChild(style);

    const themes = {
        dark: { name: '深色', bg: '#111827', cardBg: '#1f2937', text: '#e5e7eb', border: '#374151', primary: '#7c3aed', swatch: '#1f2937' },
        midnight: { name: '午夜蓝', bg: '#0f172a', cardBg: '#1e293b', text: '#cbd5e1', border: '#334155', primary: '#3b82f6', swatch: '#1e293b' },
        forest: { name: '森林', bg: '#14532d', cardBg: '#166534', text: '#dcfce7', border: '#22c55e', primary: '#4ade80', swatch: '#166534' },
        sunset: { name: '日落', bg: '#431407', cardBg: '#7c2d12', text: '#fed7aa', border: '#ea580c', primary: '#fb923c', swatch: '#7c2d12' },
        ocean: { name: '海洋', bg: '#0c4a6e', cardBg: '#075985', text: '#bae6fd', border: '#0284c7', primary: '#38bdf8', swatch: '#075985' }
    };

    let settings = { enabled: false, theme: 'dark', schedule: false, startHour: 20, endHour: 7 };

    async function loadData() {
        try {
            const saved = await apiRequest('/api/mod/dark_mode_settings') || {};
            settings = { ...settings, ...saved };
        } catch(e) {}
        applyTheme();
    }

    function renderPage() {
        let html = '<section class="card">';
        html += '<div class="card-header"><h2>🌙 深色模式</h2></div>';
        html += '<div class="dm-container">';
        // Toggle section
        html += '<div class="dm-section">';
        html += '<h3>基本设置</h3>';
        html += '<div class="dm-toggle-row"><div><div class="dm-toggle-label">启用深色模式</div><div class="dm-toggle-desc">切换整体界面为深色主题</div></div>';
        html += `<div class="dm-switch ${settings.enabled ? 'active' : ''}" id="dm-toggle-enabled" onclick="DarkModeModule.toggleEnabled()"></div></div>`;
        html += '<div class="dm-toggle-row"><div><div class="dm-toggle-label">定时切换</div><div class="dm-toggle-desc">根据时间自动切换明暗模式</div></div>';
        html += `<div class="dm-switch ${settings.schedule ? 'active' : ''}" id="dm-toggle-schedule" onclick="DarkModeModule.toggleSchedule()"></div></div>`;
        html += '<div class="dm-schedule" id="dm-schedule-row" style="' + (settings.schedule ? '' : 'display:none') + '">';
        html += '<span style="font-size:13px;">从</span>';
        html += `<select id="dm-start-hour" onchange="DarkModeModule.updateSchedule()">`;
        for (let h = 0; h < 24; h++) html += `<option value="${h}" ${h === settings.startHour ? 'selected' : ''}>${h}:00</option>`;
        html += '</select><span style="font-size:13px;">到</span>';
        html += `<select id="dm-end-hour" onchange="DarkModeModule.updateSchedule()">`;
        for (let h = 0; h < 24; h++) html += `<option value="${h}" ${h === settings.endHour ? 'selected' : ''}>${h}:00</option>`;
        html += '</select></div>';
        html += '</div>';
        // Theme selection
        html += '<div class="dm-section">';
        html += '<h3>主题选择</h3>';
        html += '<div class="dm-themes" id="dm-themes">';
        for (const [key, theme] of Object.entries(themes)) {
            const isActive = settings.theme === key;
            html += `<div class="dm-theme-card ${isActive ? 'active' : ''}" onclick="DarkModeModule.selectTheme('${key}')">`;
            html += `<div class="dm-theme-swatch" style="background:${theme.swatch}"></div>`;
            html += `<div class="dm-theme-name">${theme.name}</div></div>`;
        }
        html += '</div></div>';
        // Preview
        html += '<div class="dm-section">';
        html += '<h3>预览</h3>';
        html += `<div class="dm-preview ${settings.enabled ? 'dark' : 'light'}" id="dm-preview">`;
        html += '<p style="margin:0 0 8px 0;">这是一段预览文本</p>';
        html += '<div style="display:flex;gap:8px;"><button class="btn-primary btn-small">主要按钮</button><button class="btn-secondary btn-small">次要按钮</button></div>';
        html += '</div></div>';
        html += '</div></section>';
        return html;
    }

    function refreshView() {}

    function toggleEnabled() {
        settings.enabled = !settings.enabled;
        applyTheme();
        save();
        const el = document.getElementById('dm-toggle-enabled');
        if (el) el.classList.toggle('active', settings.enabled);
        updatePreview();
    }

    function toggleSchedule() {
        settings.schedule = !settings.schedule;
        save();
        const el = document.getElementById('dm-toggle-schedule');
        if (el) el.classList.toggle('active', settings.schedule);
        const row = document.getElementById('dm-schedule-row');
        if (row) row.style.display = settings.schedule ? '' : 'none';
    }

    function updateSchedule() {
        settings.startHour = parseInt(document.getElementById('dm-start-hour').value);
        settings.endHour = parseInt(document.getElementById('dm-end-hour').value);
        save();
        checkSchedule();
    }

    function selectTheme(key) {
        settings.theme = key;
        applyTheme();
        save();
        const cards = document.querySelectorAll('.dm-theme-card');
        cards.forEach(c => c.classList.remove('active'));
        const idx = Object.keys(themes).indexOf(key);
        if (cards[idx]) cards[idx].classList.add('active');
        updatePreview();
    }

    function applyTheme() {
        if (!settings.enabled) {
            document.documentElement.style.removeProperty('--bg-color');
            document.documentElement.style.removeProperty('--card-bg');
            document.documentElement.style.removeProperty('--text-color');
            document.documentElement.style.removeProperty('--border-color');
            document.documentElement.style.removeProperty('--primary-color');
            document.body.classList.remove('dark-mode');
            return;
        }
        const theme = themes[settings.theme] || themes.dark;
        document.documentElement.style.setProperty('--bg-color', theme.bg);
        document.documentElement.style.setProperty('--card-bg', theme.cardBg);
        document.documentElement.style.setProperty('--text-color', theme.text);
        document.documentElement.style.setProperty('--border-color', theme.border);
        document.documentElement.style.setProperty('--primary-color', theme.primary);
        document.body.classList.add('dark-mode');
    }

    function updatePreview() {
        const el = document.getElementById('dm-preview');
        if (!el) return;
        el.className = 'dm-preview ' + (settings.enabled ? 'dark' : 'light');
        if (settings.enabled) {
            const theme = themes[settings.theme] || themes.dark;
            el.style.background = theme.bg;
            el.style.color = theme.text;
        } else {
            el.style.background = '#fff';
            el.style.color = '#1f2937';
        }
    }

    function checkSchedule() {
        if (!settings.schedule) return;
        const hour = new Date().getHours();
        const shouldBeDark = settings.startHour > settings.endHour
            ? (hour >= settings.startHour || hour < settings.endHour)
            : (hour >= settings.startHour && hour < settings.endHour);
        if (settings.enabled !== shouldBeDark) {
            settings.enabled = shouldBeDark;
            applyTheme();
            save();
        }
    }

    async function save() {
        try { await apiRequest('/api/mod/dark_mode_settings/save', 'POST', settings); } catch(e) {}
    }

    function previewRenderer() { return `<p>深色模式: ${settings.enabled ? '已启用' : '未启用'} (${themes[settings.theme]?.name || '深色'})</p>`; }
    function exportFormatter() { return ''; }
    function searchIndexer() { return []; }

    function getSettings() { return { ...settings }; }
    function getThemes() { return { ...themes }; }

    window.DarkModeModule = { loadData, refreshView, toggleEnabled, toggleSchedule, updateSchedule, selectTheme, applyTheme, checkSchedule, getSettings, getThemes };
    ModuleRegistry.register({
        id: 'dark_mode', name: '深色模式', icon: '🌙', group: 'tools', order: 4,
        dataKeys: ['dark_mode_settings'],
        previewRenderer, exportFormatter, searchIndexer,
        pageRenderer: renderPage,
        onPageShow: () => { loadData().then(() => refreshView()); }
    });
    // Check schedule on load
    setTimeout(() => { loadData().then(() => checkSchedule()); }, 100);
    console.log('[DarkMode] 深色模式模块已注册');
})();
