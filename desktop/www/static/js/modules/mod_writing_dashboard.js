// ============================================================
// 模块: 写作仪表盘 (mod_writing_dashboard.js)
// 版本: 3.2.0
// ============================================================
(function() {
    'use strict';
    const style = document.createElement('style');
    style.textContent = `
        .dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .dash-card { background: var(--card-bg, #fff); border: 1px solid var(--border-color, #e5e7eb); border-radius: 10px; padding: 16px; text-align: center; }
        .dash-card .dash-value { font-size: 28px; font-weight: 700; color: var(--primary-color, #6366f1); }
        .dash-card .dash-label { font-size: 13px; color: var(--text-secondary, #6b7280); margin-top: 4px; }
        .dash-card .dash-sub { font-size: 12px; color: var(--text-secondary, #9ca3af); margin-top: 2px; }
        .dash-chart-container { background: var(--card-bg, #fff); border: 1px solid var(--border-color, #e5e7eb); border-radius: 10px; padding: 16px; margin-bottom: 16px; }
        .dash-chart-title { font-size: 15px; font-weight: 600; margin-bottom: 12px; }
        .dash-bar-chart { display: flex; align-items: flex-end; gap: 4px; height: 120px; padding-top: 8px; }
        .dash-bar { flex: 1; min-width: 20px; background: linear-gradient(to top, var(--primary-color, #6366f1), var(--secondary-color, #8b5cf6)); border-radius: 4px 4px 0 0; position: relative; transition: height 0.3s; }
        .dash-bar-label { position: absolute; bottom: -20px; left: 50%; transform: translateX(-50%); font-size: 10px; color: var(--text-secondary, #6b7280); white-space: nowrap; }
        .dash-bar-value { position: absolute; top: -18px; left: 50%; transform: translateX(-50%); font-size: 10px; color: var(--text-primary, #374151); white-space: nowrap; }
        .dash-log-list { max-height: 300px; overflow-y: auto; }
        .dash-log-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-color, #e5e7eb); font-size: 14px; }
        /* 5.1-A 目标进度条 + 章节自动统计 */
        .dash-goal-card { grid-column: 1 / -1; display: flex; align-items: center; gap: 14px; text-align: left; }
        .dash-goal-track { flex: 1; height: 10px; background: var(--border-color, #e5e7eb); border-radius: 5px; overflow: hidden; min-width: 120px; }
        .dash-goal-fill { height: 100%; background: linear-gradient(90deg, var(--primary-color, #6366f1), var(--secondary-color, #8b5cf6)); border-radius: 5px; transition: width 0.3s; }
        .dash-goal-text { font-size: 12px; color: var(--text-secondary, #6b7280); white-space: nowrap; }
    `;
    document.head.appendChild(style);

    let writingStats = {};
    let writingGoals = {};
    let chapterTotalWords = 0;        // 章节总字数（自动统计）
    let todayChapterTouched = false;  // 今日是否有章节更新

    async function loadData() {
        try {
            writingStats = await apiRequest('/api/mod/writing_stats') || {};
            writingGoals = await apiRequest('/api/mod/writing_goals') || {};
        } catch(e) { writingStats = {}; writingGoals = {}; }
        // 5.1-A 从章节管理自动统计字数
        try {
            const chs = await apiRequest('/api/mod/chapters') || [];
            chapterTotalWords = chs.reduce((s, c) => s + (c.word_count || 0), 0);
            const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
            todayChapterTouched = chs.some(c => c.updated_at && new Date(c.updated_at) >= todayStart);
        } catch(e) { chapterTotalWords = 0; todayChapterTouched = false; }
    }

    function renderPage() {
        let html = UIUtils.renderCardPage(
            (SvgIconLib ? SvgIconLib.renderAuto('chart', 18) : '📊') + ' 写作仪表盘',
            '<button class="btn-primary btn-small" onclick="WritingDashboard.logToday()">+ 记录今日</button>'
        );
        html += '<div class="dashboard-grid" id="dash-stats"></div>';
        html += '<div class="dash-chart-container" id="dash-chart"></div>';
        html += '<div class="dash-chart-container"><div class="dash-chart-title">' + (SvgIconLib ? SvgIconLib.render('edit', 14) : '📝') + ' 写作日志</div><div class="dash-log-list" id="dash-log"></div></div>';
        return html;
    }

    function refreshView() {
        renderStats();
        renderChart();
        renderLog();
    }

    function getToday() { return new Date().toISOString().slice(0, 10); }
    function getLogs() { return writingStats.logs || []; }
    function getDailyGoal() { return writingGoals.daily_words || 2000; }

    function renderStats() {
        const el = document.getElementById('dash-stats');
        if (!el) return;
        const logs = getLogs();
        const today = getToday();
        const todayLog = logs.find(l => l.date === today);
        const todayWords = todayLog ? (todayLog.words || 0) : 0;
        const dailyGoal = getDailyGoal();
        const totalWords = logs.reduce((s, l) => s + (l.words || 0), 0);
        const totalDays = logs.length;
        // 连续写作天数
        let streak = 0;
        const sortedDates = logs.map(l => l.date).sort().reverse();
        const dateSet = new Set(sortedDates);
        let d = new Date();
        while (true) {
            const ds = d.toISOString().slice(0, 10);
            if (dateSet.has(ds)) { streak++; d.setDate(d.getDate() - 1); } else break;
        }
        el.innerHTML = `
            <div class="dash-card dash-goal-card">
                <div style="flex:1;min-width:180px;">
                    <div class="dash-value" style="font-size:22px;">${todayWords.toLocaleString()} <span style="font-size:12px;color:var(--text-secondary,#6b7280);">/ ${dailyGoal.toLocaleString()} 字</span></div>
                    <div class="dash-label">今日目标进度</div>
                </div>
                <div class="dash-goal-track"><div class="dash-goal-fill" style="width:${dailyGoal > 0 ? Math.min(100, Math.round(todayWords / dailyGoal * 100)) : 0}%"></div></div>
                <div class="dash-goal-text">${dailyGoal > 0 ? Math.min(100, Math.round(todayWords / dailyGoal * 100)) : 0}%</div>
            </div>
            <div class="dash-card"><div class="dash-value">${todayWords.toLocaleString()}</div><div class="dash-label">今日字数</div><div class="dash-sub">保存章节时自动累计${todayChapterTouched ? ' · 今日有更新' : ''}</div></div>
            <div class="dash-card"><div class="dash-value">${chapterTotalWords.toLocaleString()}</div><div class="dash-label">章节总字数</div><div class="dash-sub">自动统计自章节管理</div></div>
            <div class="dash-card"><div class="dash-value">${totalWords.toLocaleString()}</div><div class="dash-label">累计写作字数</div></div>
            <div class="dash-card"><div class="dash-value">${streak}</div><div class="dash-label">${SvgIconLib ? SvgIconLib.render('fire', 13, '#f97316') : '🔥'} 连续天数</div></div>
            <div class="dash-card"><div class="dash-value">${totalDays}</div><div class="dash-label">写作天数</div></div>
        `;
    }

    function renderChart() {
        const el = document.getElementById('dash-chart');
        if (!el) return;
        const logs = getLogs();
        const last7 = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const ds = d.toISOString().slice(0, 10);
            const log = logs.find(l => l.date === ds);
            last7.push({ date: ds.slice(5), words: log ? log.words : 0 });
        }
        const maxWords = Math.max(...last7.map(d => d.words), 1);
        let html = '<div class="dash-chart-title">' + (SvgIconLib ? SvgIconLib.render('chart', 14) : '📈') + ' 近7天写作量</div>';
        html += '<div class="dash-bar-chart" style="margin-bottom:24px;">';
        last7.forEach(d => {
            const height = Math.max(2, (d.words / maxWords) * 100);
            html += `<div class="dash-bar" style="height:${height}%"><span class="dash-bar-value">${d.words > 0 ? d.words : ''}</span><span class="dash-bar-label">${d.date}</span></div>`;
        });
        html += '</div>';
        el.innerHTML = html;
    }

    function renderLog() {
        const el = document.getElementById('dash-log');
        if (!el) return;
        const logs = [...getLogs()].sort((a, b) => b.date.localeCompare(a.date));
        if (logs.length === 0) { el.innerHTML = '<p style="color:#9ca3af;text-align:center;padding:20px;">暂无记录</p>'; return; }
        let html = '';
        logs.slice(0, 30).forEach(log => {
            html += `<div class="dash-log-item"><span>${log.date}</span><span>${(log.words || 0).toLocaleString()} 字</span>`;
            html += `<button class="btn-tiny btn-danger" onclick="WritingDashboard.deleteLog('${log.date}')">删</button></div>`;
        });
        el.innerHTML = html;
    }

    function logToday() {
        const today = getToday();
        const logs = getLogs();
        const existing = logs.find(l => l.date === today);
        const currentWords = existing ? existing.words : 0;
        showModal('记录今日写作', `
            <div style="display:flex;flex-direction:column;gap:12px;">
                <div><label>日期</label><input type="date" id="dash-log-date" class="modal-input" value="${today}"></div>
                <div><label>今日字数</label><input type="number" id="dash-log-words" class="modal-input" value="${currentWords}"></div>
            </div>
        `, [
            { text: '取消', class: 'btn-secondary', action: () => closeModal() },
            { text: '保存', class: 'btn-primary', action: async () => {
                const date = document.getElementById('dash-log-date').value;
                const words = parseInt(document.getElementById('dash-log-words').value) || 0;
                if (!writingStats.logs) writingStats.logs = [];
                const idx = writingStats.logs.findIndex(l => l.date === date);
                if (idx >= 0) { writingStats.logs[idx].words = words; }
                else { writingStats.logs.push({ date, words }); }
                await apiRequest('/api/mod/writing_stats/save', 'POST', writingStats);
                refreshView(); closeModal(); showToast('记录已保存', 'success');
            }}
        ]);
    }

    async function deleteLog(date) {
        if (!(await UIUtils.confirmDialog(`确定删除 ${date} 的记录吗？`))) return;
        if (!writingStats.logs) return;
        writingStats.logs = writingStats.logs.filter(l => l.date !== date);
        await apiRequest('/api/mod/writing_stats/save', 'POST', writingStats);
        refreshView(); showToast('记录已删除', 'success');
    }

    function previewRenderer() {
        const logs = getLogs();
        if (logs.length === 0) return '<p>暂无写作记录</p>';
        const today = getToday();
        const todayLog = logs.find(l => l.date === today);
        const totalWords = logs.reduce((s, l) => s + (l.words || 0), 0);
        return `<p>总字数: ${totalWords.toLocaleString()} | 今日: ${(todayLog ? todayLog.words : 0).toLocaleString()} | 共 ${logs.length} 天</p>`;
    }

    function exportFormatter(data, detailed) {
        const stats = data.writing_stats || {};
        const logs = stats.logs || [];
        if (logs.length === 0) return '';
        let text = '=== 写作仪表盘 ===\n\n';
        const totalWords = logs.reduce((s, l) => s + (l.words || 0), 0);
        text += `总字数: ${totalWords}\n写作天数: ${logs.length}\n\n`;
        text += '--- 每日记录 ---\n';
        logs.sort((a, b) => b.date.localeCompare(a.date));
        logs.forEach(l => { text += `${l.date}: ${(l.words || 0).toLocaleString()} 字\n`; });
        return text;
    }

    function searchIndexer() { return []; }

    window.WritingDashboard = { loadData, refreshView, logToday, deleteLog };
    ModuleRegistry.register({
        id: 'writing-dashboard', name: '写作仪表盘', icon: 'chart', group: 'writing', order: 2, hidden: true,
        dataKeys: ['writing_stats', 'writing_goals'],
        previewRenderer, exportFormatter, searchIndexer,
        pageRenderer: renderPage,
        onPageShow: () => { loadData().then(() => refreshView()); }
    });
    console.log('[WritingDashboard] 写作仪表盘模块已注册');
})();
