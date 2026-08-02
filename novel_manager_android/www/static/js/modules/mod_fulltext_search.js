// ============================================================
// 模块: 全文搜索增强 (mod_fulltext_search.js)
// 版本: 3.2.0
// ============================================================
(function() {
    'use strict';
    const style = document.createElement('style');
    style.textContent = `
        .fts-container { display: flex; flex-direction: column; gap: 16px; }
        .fts-search-row { display: flex; gap: 8px; align-items: center; }
        .fts-search-row input { flex: 1; padding: 10px 14px; border: 2px solid var(--border-color, #e5e7eb); border-radius: 8px; font-size: 15px; outline: none; transition: border-color 0.2s; }
        .fts-search-row input:focus { border-color: var(--primary-color, #7c3aed); }
        .fts-filters { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
        .fts-filter-chip { padding: 4px 12px; border: 1px solid var(--border-color, #e5e7eb); border-radius: 16px; font-size: 12px; cursor: pointer; background: var(--card-bg, #fff); transition: all 0.2s; }
        .fts-filter-chip.active { background: var(--primary-color, #7c3aed); color: #fff; border-color: var(--primary-color, #7c3aed); }
        .fts-results { display: flex; flex-direction: column; gap: 8px; }
        .fts-result-item { padding: 12px; background: var(--card-bg, #fff); border: 1px solid var(--border-color, #e5e7eb); border-radius: 8px; cursor: pointer; transition: box-shadow 0.2s; }
        .fts-result-item:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .fts-result-module { font-size: 11px; color: var(--primary-color, #7c3aed); font-weight: 600; margin-bottom: 4px; }
        .fts-result-title { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
        .fts-result-snippet { font-size: 13px; color: var(--text-secondary, #6b7280); line-height: 1.5; }
        .fts-result-snippet mark { background: #fef08a; padding: 0 2px; border-radius: 2px; }
        .fts-history { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
        .fts-history-item { padding: 3px 10px; background: var(--bg-color, #f3f4f6); border-radius: 12px; font-size: 12px; cursor: pointer; color: var(--text-secondary, #6b7280); }
        .fts-history-item:hover { background: var(--primary-color, #7c3aed); color: #fff; }
        .fts-stats { font-size: 12px; color: var(--text-secondary, #6b7280); padding: 4px 0; }
    `;
    document.head.appendChild(style);

    let searchHistory = [];
    let activeFilters = [];
    let lastResults = [];

    async function loadData() {
        try {
            searchHistory = await apiRequest('/api/mod/search_history') || [];
        } catch(e) { searchHistory = []; }
    }

    function renderPage() {
        let html = '<section class="card">';
        html += '<div class="card-header"><h2>🔍 全文搜索</h2></div>';
        html += '<div class="fts-container">';
        html += '<div class="fts-search-row">';
        html += '<input type="text" id="fts-input" placeholder="输入关键词搜索所有模块数据..." autocomplete="off">';
        html += '<button class="btn-primary btn-small" onclick="FulltextSearchModule.doSearch()">搜索</button>';
        html += '</div>';
        html += '<div class="fts-filters" id="fts-filters"></div>';
        html += '<div class="fts-history" id="fts-history"></div>';
        html += '<div class="fts-stats" id="fts-stats"></div>';
        html += '<div class="fts-results" id="fts-results"></div>';
        html += '</div></section>';
        return html;
    }

    function refreshView() {
        renderFilters();
        renderHistory();
        const input = document.getElementById('fts-input');
        if (input) {
            input.onkeydown = (e) => { if (e.key === 'Enter') doSearch(); };
        }
    }

    function renderFilters() {
        const el = document.getElementById('fts-filters');
        if (!el) return;
        const modules = ModuleRegistry.getAllModules();
        let html = '<span style="font-size:12px;color:#6b7280;">筛选:</span>';
        html += `<span class="fts-filter-chip ${activeFilters.length === 0 ? 'active' : ''}" onclick="FulltextSearchModule.toggleFilter('all')">全部</span>`;
        modules.forEach(m => {
            const isActive = activeFilters.includes(m.id);
            html += `<span class="fts-filter-chip ${isActive ? 'active' : ''}" onclick="FulltextSearchModule.toggleFilter('${m.id}')">${m.icon || ''} ${m.name}</span>`;
        });
        el.innerHTML = html;
    }

    function renderHistory() {
        const el = document.getElementById('fts-history');
        if (!el) return;
        if (searchHistory.length === 0) { el.innerHTML = ''; return; }
        let html = '<span style="font-size:12px;color:#6b7280;">历史:</span>';
        searchHistory.slice(-10).reverse().forEach(term => {
            html += `<span class="fts-history-item" onclick="FulltextSearchModule.searchTerm('${term.replace(/'/g, "\\'")}')">${term}</span>`;
        });
        el.innerHTML = html;
    }

    function doSearch() {
        const input = document.getElementById('fts-input');
        if (!input) return;
        const query = input.value.trim();
        if (!query) return;
        searchTerm(query);
    }

    function searchTerm(query) {
        // 保存历史
        if (!searchHistory.includes(query)) {
            searchHistory.push(query);
            if (searchHistory.length > 20) searchHistory = searchHistory.slice(-20);
            apiRequest('/api/mod/search_history/save', 'POST', searchHistory);
        }
        renderHistory();

        const results = [];
        const modules = ModuleRegistry.getAllModules();
        const filteredModules = activeFilters.length === 0 ? modules : modules.filter(m => activeFilters.includes(m.id));

        filteredModules.forEach(mod => {
            if (!mod.searchIndexer || !mod.dataKeys || mod.dataKeys.length === 0) return;
            try {
                const items = mod.searchIndexer(window.appData || {});
                if (!Array.isArray(items)) return;
                const lowerQuery = query.toLowerCase();
                items.forEach(item => {
                    const searchText = (item.title || '') + ' ' + (item.content || '') + ' ' + (item.text || '');
                    if (searchText.toLowerCase().includes(lowerQuery)) {
                        results.push({
                            moduleId: mod.id,
                            moduleName: mod.name,
                            moduleIcon: mod.icon || '',
                            title: item.title || '未命名',
                            snippet: item.content || item.text || '',
                            itemId: item.id || null
                        });
                    }
                });
            } catch(e) { /* skip module search errors */ }
        });

        lastResults = results;
        renderResults(results, query);
    }

    function renderResults(results, query) {
        const el = document.getElementById('fts-results');
        const statsEl = document.getElementById('fts-stats');
        if (!el) return;
        if (statsEl) statsEl.textContent = `找到 ${results.length} 条结果`;
        if (results.length === 0) {
            el.innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af;">未找到匹配结果</div>';
            return;
        }
        let html = '';
        results.slice(0, 50).forEach(r => {
            let snippet = r.snippet || '';
            if (snippet.length > 150) snippet = snippet.substring(0, 150) + '...';
            if (query) {
                const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                snippet = snippet.replace(regex, '<mark>$1</mark>');
            }
            html += `<div class="fts-result-item" onclick="FulltextSearchModule.goToResult('${r.moduleId}')">`;
            html += `<div class="fts-result-module">${r.moduleIcon} ${r.moduleName}</div>`;
            html += `<div class="fts-result-title">${r.title}</div>`;
            html += `<div class="fts-result-snippet">${snippet}</div>`;
            html += `</div>`;
        });
        if (results.length > 50) {
            html += `<div style="text-align:center;padding:8px;color:#9ca3af;font-size:12px;">仅显示前50条结果</div>`;
        }
        el.innerHTML = html;
    }

    function toggleFilter(moduleId) {
        if (moduleId === 'all') {
            activeFilters = [];
        } else {
            const idx = activeFilters.indexOf(moduleId);
            if (idx >= 0) activeFilters.splice(idx, 1);
            else activeFilters.push(moduleId);
        }
        renderFilters();
        const input = document.getElementById('fts-input');
        if (input && input.value.trim()) doSearch();
    }

    function goToResult(moduleId) {
        if (typeof switchPage === 'function') switchPage(moduleId);
    }

    function previewRenderer() { return '<p>全文搜索增强模块</p>'; }
    function exportFormatter() { return ''; }
    function searchIndexer() { return []; }

    window.FulltextSearchModule = { loadData, refreshView, doSearch, searchTerm, toggleFilter, goToResult };
    ModuleRegistry.register({
        id: 'fulltext_search', name: '全文搜索', icon: 'search', group: 'tools', order: 1,
        dataKeys: ['search_history'],
        previewRenderer, exportFormatter, searchIndexer,
        pageRenderer: renderPage,
        onPageShow: () => { loadData().then(() => refreshView()); }
    });
    console.log('[FulltextSearch] 全文搜索模块已注册');
})();
