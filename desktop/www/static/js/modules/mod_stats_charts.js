// ============================================================
// 模块: 数据统计图表 (mod_stats_charts.js)
// 版本: 3.2.1 - 修复getAllModules遍历bug + 添加模块筛选/导出
// ============================================================
(function() {
    'use strict';
    const style = document.createElement('style');
    style.textContent = `
        .stats-toolbar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 12px; }
        .stats-container { }
        .stats-card { background: var(--card-bg, #fff); border: 1px solid var(--border-color, #e5e7eb); border-radius: 10px; padding: 16px; }
        .stats-card h3 { margin: 0 0 12px 0; font-size: 14px; display: flex; align-items: center; gap: 8px; }
        .stats-canvas-wrap { position: relative; width: 100%; }
        .stats-canvas-wrap canvas { width: 100%; height: auto; }
        .stats-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }
        .stats-summary-item { text-align: center; padding: 12px 8px; background: var(--bg-color, #f9fafb); border-radius: 8px; }
        .stats-summary-value { font-size: 24px; font-weight: 700; color: var(--primary-color, #7c3aed); }
        .stats-summary-label { font-size: 11px; color: var(--text-secondary, #6b7280); margin-top: 4px; }
        .stats-bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
        .stats-bar-label { width: 80px; font-size: 12px; color: var(--text-secondary, #6b7280); text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .stats-bar-track { flex: 1; height: 16px; background: var(--bg-color, #f3f4f6); border-radius: 8px; overflow: hidden; }
        .stats-bar-fill { height: 100%; border-radius: 8px; transition: width 0.5s ease; display: flex; align-items: center; justify-content: flex-end; padding-right: 6px; font-size: 10px; color: #fff; min-width: 20px; }
        .stats-filter-chips { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
        .stats-chip { padding: 3px 10px; border: 1px solid var(--border-color, #e5e7eb); border-radius: 14px; font-size: 11px; cursor: pointer; background: var(--card-bg, #fff); transition: all 0.2s; user-select: none; }
        .stats-chip.active { background: var(--primary-color, #7c3aed); color: #fff; border-color: var(--primary-color, #7c3aed); }
        .stats-chip:hover { border-color: var(--primary-color, #7c3aed); }
    `;
    document.head.appendChild(style);

    const COLORS = ['#7c3aed','#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16','#f97316'];
    let excludedModules = []; // 被排除（不统计）的模块 id

    // 安全获取模块列表
    function getModulesList() {
        return Object.values(ModuleRegistry.getAllModules());
    }

    async function loadData() {}

    function renderPage() {
        var html = UIUtils.renderCardPage(
            (SvgIconLib ? SvgIconLib.renderAuto('chart', 18) : '📊') + ' 数据统计',
            '<button class="btn-secondary btn-small" onclick="StatsModule.refresh()">' + (SvgIconLib ? SvgIconLib.renderAuto('refresh', 12) : '🔄') + ' 刷新</button>' +
            '<button class="btn-secondary btn-small" onclick="StatsModule.exportStats()">' + (SvgIconLib ? SvgIconLib.renderAuto('download', 12) : '📤') + ' 导出统计</button>'
        );
        // 模块筛选
        html += '<div class="stats-filter-chips" id="stats-filter-chips"></div>';
        html += '<div id="stats-summary" class="stats-summary"></div>';
        html += '<div class="stats-container ui-grid ui-grid--lg" id="stats-charts"></div>';
        return html;
    }

    function refreshView() {
        renderFilterChips();
        renderSummary();
        renderCharts();
    }

    function renderFilterChips() {
        var el = document.getElementById('stats-filter-chips');
        if (!el) return;
        var allModules = getModulesList();
        var html = '<span style="font-size:11px;color:#6b7280;margin-right:4px;">筛选:</span>';
        // 全选/取消
        var items = [{ id: '', label: '全部', onClick: 'StatsModule.showAll()', active: excludedModules.length === 0 }].concat(allModules.map(function(m) {
            var isExcluded = excludedModules.includes(m.id);
            return { id: m.id, label: m.name, icon: m.icon || 'box', active: !isExcluded };
        }));
        html += UIUtils.renderChips(items, '', 'stats-chip', "StatsModule.toggleModule('{id}')");
        el.innerHTML = html;
    }

    function toggleModule(id) {
        var idx = excludedModules.indexOf(id);
        if (idx >= 0) {
            excludedModules.splice(idx, 1);
        } else {
            excludedModules.push(id);
        }
        refreshView();
    }

    function showAll() {
        excludedModules = [];
        refreshView();
    }

    function getModuleStats() {
        var modules = getModulesList().filter(function(m) { return !excludedModules.includes(m.id); });
        var stats = [];
        modules.forEach(function(m) {
            if (!m.dataKeys || m.dataKeys.length === 0) return;
            var count = 0;
            // 统一取数：按 dataKeys 从 LocalDataManager 读取（与预览/导出/搜索同源）
            var data = (typeof ModuleRegistry !== 'undefined' && ModuleRegistry.loadModuleData) ? ModuleRegistry.loadModuleData(m.id) : {};
            m.dataKeys.forEach(function(key) {
                var val = data[key];
                if (Array.isArray(val)) count += val.length;
                else if (val && typeof val === 'object') count += Object.keys(val).length;
                else if (val !== undefined && val !== null) count += 1;
            });
            if (count > 0) stats.push({ name: m.name, icon: m.icon || 'box', count: count, id: m.id });
        });
        return stats.sort(function(a, b) { return b.count - a.count; });
    }

    function renderSummary() {
        var el = document.getElementById('stats-summary');
        if (!el) return;
        var allData = (typeof ModuleRegistry !== 'undefined' && ModuleRegistry.loadAllModuleData) ? ModuleRegistry.loadAllModuleData() : {};
        var totalKeys = Object.keys(allData).length;
        var stats = getModuleStats();
        var totalItems = stats.reduce(function(s, i) { return s + i.count; }, 0);
        var moduleCount = stats.length;
        el.innerHTML = '<div class="stats-summary-item"><div class="stats-summary-value">' + moduleCount + '</div><div class="stats-summary-label">活跃模块</div></div>' +
            '<div class="stats-summary-item"><div class="stats-summary-value">' + totalItems + '</div><div class="stats-summary-label">数据总条数</div></div>' +
            '<div class="stats-summary-item"><div class="stats-summary-value">' + totalKeys + '</div><div class="stats-summary-label">数据键数</div></div>';
    }

    function renderCharts() {
        var container = document.getElementById('stats-charts');
        if (!container) return;
        var stats = getModuleStats();
        if (stats.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af;grid-column:1/-1;">暂无数据（可尝试切换筛选条件）</div>';
            return;
        }
        var html = '';
        html += '<div class="stats-card"><h3>' + ((SvgIconLib && SvgIconLib.render) ? SvgIconLib.render('chart', 15) : '📊') + ' 各模块数据量</h3><div id="stats-bar-chart"></div></div>';
        html += '<div class="stats-card"><h3>' + ((SvgIconLib && SvgIconLib.render) ? SvgIconLib.render('chart', 15) : '🥧') + ' 数据占比</h3><div class="stats-canvas-wrap"><canvas id="stats-pie-canvas" width="300" height="300"></canvas></div></div>';
        html += '<div class="stats-card"><h3>' + ((SvgIconLib && SvgIconLib.render) ? SvgIconLib.render('trophy', 15) : '🏆') + ' 数据量 TOP 5</h3><div id="stats-top5"></div></div>';
        container.innerHTML = html;
        renderBarChart(stats);
        renderPieChart(stats);
        renderTop5(stats);
    }

    function renderBarChart(stats) {
        var el = document.getElementById('stats-bar-chart');
        if (!el) return;
        var max = Math.max.apply(null, stats.map(function(s) { return s.count; }).concat([1]));
        var html = '';
        stats.forEach(function(s, i) {
            var pct = (s.count / max * 100).toFixed(1);
            var color = COLORS[i % COLORS.length];
            html += '<div class="stats-bar-row"><span class="stats-bar-label" title="' + s.name + '">' + ((SvgIconLib && SvgIconLib.renderAuto) ? SvgIconLib.renderAuto(s.icon || '', 12) : (s.icon || '')) + ' ' + s.name + '</span>';
            html += '<div class="stats-bar-track"><div class="stats-bar-fill" style="width:' + pct + '%;background:' + color + ';">' + s.count + '</div></div></div>';
        });
        el.innerHTML = html;
    }

    function renderPieChart(stats) {
        var canvas = document.getElementById('stats-pie-canvas');
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        var w = canvas.width, h = canvas.height;
        var cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 30;
        var total = stats.reduce(function(s, i) { return s + i.count; }, 0);
        if (total === 0) return;
        ctx.clearRect(0, 0, w, h);
        var startAngle = -Math.PI / 2;
        stats.forEach(function(s, i) {
            var slice = (s.count / total) * Math.PI * 2;
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, startAngle, startAngle + slice); ctx.closePath();
            ctx.fillStyle = COLORS[i % COLORS.length]; ctx.fill();
            if (slice > 0.15) {
                var midAngle = startAngle + slice / 2;
                var lx = cx + Math.cos(midAngle) * (r * 0.65);
                var ly = cy + Math.sin(midAngle) * (r * 0.65);
                ctx.fillStyle = '#fff'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText((s.count / total * 100).toFixed(0) + '%', lx, ly + 4);
            }
            startAngle += slice;
        });
        // 图例
        ctx.font = '10px sans-serif'; ctx.textAlign = 'left';
        var cols = Math.min(stats.length, 5);
        for (var i = stats.length - 1; i >= 0; i--) {
            var col = i % cols, row = Math.floor((stats.length - 1 - i) / cols);
            var lx = 10 + col * 60, lly = h - 10 - row * 14;
            ctx.fillStyle = COLORS[i % COLORS.length]; ctx.fillRect(lx, lly - 8, 8, 8);
            ctx.fillStyle = '#666'; ctx.fillText(stats[i].name.substring(0, 4), lx + 11, lly);
        }
    }

    function renderTop5(stats) {
        var el = document.getElementById('stats-top5');
        if (!el) return;
        var top5 = stats.slice(0, 5);
        var medalHtml = function(i) {
            if (typeof SvgIconLib !== 'undefined' && SvgIconLib.render) {
                var color = i === 0 ? '#f59e0b' : (i === 1 ? '#9ca3af' : (i === 2 ? '#d97706' : 'var(--text-secondary,#6b7280)'));
                return SvgIconLib.render('trophy', 13, color);
            }
            return ['🥇','🥈','🥉','4️⃣','5️⃣'][i] || (i + 1);
        };
        var html = '';
        top5.forEach(function(s, i) {
            html += '<div class="stats-bar-row"><span class="stats-bar-label">' + medalHtml(i) + ' ' + s.name + '</span>';
            html += '<div class="stats-bar-track"><div class="stats-bar-fill" style="width:100%;background:' + COLORS[i] + ';">' + s.count + ' 条</div></div></div>';
        });
        el.innerHTML = html;
    }

    function exportStats() {
        var stats = getModuleStats();
        var allData = (typeof ModuleRegistry !== 'undefined' && ModuleRegistry.loadAllModuleData) ? ModuleRegistry.loadAllModuleData() : {};
        var text = '=== 数据统计报告 ===\n';
        text += '生成时间: ' + new Date().toLocaleString('zh-CN') + '\n\n';
        text += '活跃模块: ' + stats.length + ' 个\n';
        text += '数据总条数: ' + stats.reduce(function(s, i) { return s + i.count; }, 0) + '\n';
        text += '数据键数: ' + Object.keys(allData).length + '\n\n';
        text += '--- 各模块详情 ---\n\n';
        stats.forEach(function(s) { text += s.icon + ' ' + s.name + ': ' + s.count + ' 条\n'; });
        var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = '小说数据统计_' + new Date().toISOString().slice(0,10) + '.txt';
        a.click(); URL.revokeObjectURL(url);
        showToast('统计已导出', 'success');
    }

    function previewRenderer() {
        var stats = getModuleStats();
        var total = stats.reduce(function(s, i) { return s + i.count; }, 0);
        return '<p>数据统计: ' + stats.length + ' 个模块, 共 ' + total + ' 条数据</p>';
    }
    function exportFormatter() {
        var stats = getModuleStats();
        var text = '=== 数据统计 ===\n\n';
        stats.forEach(function(s) { text += s.icon + ' ' + s.name + ': ' + s.count + ' 条\n'; });
        return text;
    }
    function searchIndexer() { return []; }

    window.StatsModule = { loadData: loadData, refreshView: refreshView, refresh: function() { refreshView(); }, toggleModule: toggleModule, showAll: showAll, exportStats: exportStats };
    ModuleRegistry.register({
        id: 'stats_charts', name: '数据统计', icon: 'chart', group: 'tools', order: 3, hidden: true,
        dataKeys: [],
        previewRenderer: previewRenderer, exportFormatter: exportFormatter, searchIndexer: searchIndexer,
        pageRenderer: renderPage,
        onPageShow: function() { refreshView(); }
    });
    console.log('[Stats] 数据统计模块已注册');
})();
