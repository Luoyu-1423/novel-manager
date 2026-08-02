// ============================================================
// 桌面版全局搜索功能
// 通过侧边栏搜索框实时搜索所有模块数据
// 使用 ModuleRegistry.searchAll() 自动遍历所有注册模块
// ============================================================

(function() {
    'use strict';

    var searchInput = null;
    var searchResults = null;
    var searchTimeout = null;

    // 等待 DOM 加载完成
    document.addEventListener('DOMContentLoaded', function() {
        searchInput = document.getElementById('globalSearch');
        searchResults = document.getElementById('searchResults');

        if (!searchInput || !searchResults) return;

        // 输入事件 - 实时搜索（300ms 防抖）
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            var query = this.value.trim().toLowerCase();

            if (query.length < 1) {
                searchResults.style.display = 'none';
                return;
            }

            searchTimeout = setTimeout(function() {
                performGlobalSearch(query);
            }, 300);
        });

        // 聚焦时如果已有结果则显示
        searchInput.addEventListener('focus', function() {
            if (searchResults.children.length > 0 && searchInput.value.trim().length > 0) {
                searchResults.style.display = 'block';
            }
        });

        // 点击其他地方关闭搜索结果
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.sidebar-search-box')) {
                searchResults.style.display = 'none';
            }
        });

        // ESC 关闭搜索结果
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                searchResults.style.display = 'none';
                searchInput.blur();
            }
        });
    });

    // 执行全局搜索 - 使用 ModuleRegistry 自动遍历所有注册模块
    function performGlobalSearch(query) {
        var results = [];

        // 优先使用 ModuleRegistry.searchAll（自动覆盖所有模块）
        if (typeof ModuleRegistry !== 'undefined' && typeof ModuleRegistry.searchAll === 'function') {
            results = ModuleRegistry.searchAll(query);
        } else {
            // 降级：如果 ModuleRegistry 未加载则返回空
            renderSearchResults(results);
            return;
        }

        renderSearchResults(results);
    }

    // 渲染搜索结果
    function renderSearchResults(results) {
        searchResults.innerHTML = '';

        if (results.length === 0) {
            var noResult = document.createElement('div');
            noResult.className = 'search-result-item';
            noResult.style.color = '#999';
            noResult.textContent = '未找到相关结果';
            searchResults.appendChild(noResult);
            searchResults.style.display = 'block';
            return;
        }

        // 去重
        var seen = {};
        var uniqueResults = [];
        for (var r = 0; r < results.length; r++) {
            var key = results[r].type + ':' + results[r].name;
            if (!seen[key]) {
                seen[key] = true;
                uniqueResults.push(results[r]);
            }
        }

        // 最多显示 20 条
        var displayResults = uniqueResults.slice(0, 20);
        for (var i = 0; i < displayResults.length; i++) {
            (function(result) {
                var div = document.createElement('div');
                div.className = 'search-result-item';

                var typeSpan = document.createElement('span');
                typeSpan.className = 'result-type';
                typeSpan.textContent = '[' + result.type + ']';
                div.appendChild(typeSpan);

                var nameNode = document.createTextNode(result.name);
                div.appendChild(nameNode);

                div.addEventListener('click', function() {
                    // 跳转到对应页面
                    if (typeof switchPage === 'function') {
                        switchPage(result.page);
                    }
                    searchResults.style.display = 'none';
                    searchInput.value = '';
                    searchInput.blur();
                });

                searchResults.appendChild(div);
            })(displayResults[i]);
        }

        searchResults.style.display = 'block';
    }
})();
