// ============================================================
// 桌面版全局搜索功能
// 通过侧边栏搜索框实时搜索所有模块数据
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

    // 执行全局搜索
    function performGlobalSearch(query) {
        var results = [];

        if (typeof localDataManager === 'undefined') return;

        // 搜索角色信息
        var character = localDataManager.getModule('character');
        if (character && character.name) {
            if (character.name.toLowerCase().indexOf(query) !== -1) {
                results.push({ type: '角色', name: character.name, page: 'character' });
            }
        }

        // 搜索货币类型
        var currencyTypes = localDataManager.getModule('currency_types');
        if (currencyTypes && typeof currencyTypes === 'object') {
            for (var key in currencyTypes) {
                if (currencyTypes.hasOwnProperty(key)) {
                    var ct = currencyTypes[key];
                    if (ct && ct.name && ct.name.toLowerCase().indexOf(query) !== -1) {
                        results.push({ type: '货币', name: ct.name, page: 'currency' });
                    }
                }
            }
        }

        // 搜索背包物品
        var inventory = localDataManager.inventoryToArray(localDataManager.getModule('inventory'));
        for (var i = 0; i < inventory.length; i++) {
            var item = inventory[i];
            if (item.name && item.name.toLowerCase().indexOf(query) !== -1) {
                results.push({ type: '背包', name: item.name, page: 'inventory' });
            }
        }

        // 搜索物品库
        var itemLibrary = localDataManager.getModule('item_library');
        if (Array.isArray(itemLibrary)) {
            for (var j = 0; j < itemLibrary.length; j++) {
                var libItem = itemLibrary[j];
                if (libItem && libItem.name && libItem.name.toLowerCase().indexOf(query) !== -1) {
                    results.push({ type: '物品', name: libItem.name, page: 'item-library' });
                }
            }
        }

        // 搜索技能
        var skills = localDataManager.getModule('skills');
        var skillArr = localDataManager.objectToArray(skills);
        for (var k = 0; k < skillArr.length; k++) {
            var sk = skillArr[k];
            if (sk && sk.name && sk.name.toLowerCase().indexOf(query) !== -1) {
                results.push({ type: '技能', name: sk.name, page: 'skills' });
            }
        }

        // 搜索自定义技能
        var skillsCustom = localDataManager.getModule('skills_custom');
        var skillCustomArr = localDataManager.objectToArray(skillsCustom);
        for (var sc = 0; sc < skillCustomArr.length; sc++) {
            var skc = skillCustomArr[sc];
            if (skc && skc.name && skc.name.toLowerCase().indexOf(query) !== -1) {
                results.push({ type: '技能', name: skc.name, page: 'skills' });
            }
        }

        // 搜索自定义任务
        var questsCustom = localDataManager.getModule('quests_custom');
        var questArr = localDataManager.objectToArray(questsCustom);
        for (var q = 0; q < questArr.length; q++) {
            var quest = questArr[q];
            if (quest && quest.name && quest.name.toLowerCase().indexOf(query) !== -1) {
                results.push({ type: '任务', name: quest.name, page: 'quests' });
            }
        }

        // 搜索剧情标记
        var story = localDataManager.getModule('story');
        if (story && story.marks) {
            var markArr = localDataManager.objectToArray(story.marks);
            for (var m = 0; m < markArr.length; m++) {
                var mark = markArr[m];
                if (mark) {
                    var markName = mark.title || mark.name || mark.mark_id || '';
                    if (markName && markName.toLowerCase().indexOf(query) !== -1) {
                        results.push({ type: '剧情', name: markName, page: 'story' });
                    }
                }
            }
        }

        // 搜索伏笔
        if (story && story.foreshadowing) {
            var fsArr = localDataManager.objectToArray(story.foreshadowing);
            for (var f = 0; f < fsArr.length; f++) {
                var fs = fsArr[f];
                if (fs) {
                    var fsName = fs.title || fs.name || fs.foreshadow_id || '';
                    if (fsName && fsName.toLowerCase().indexOf(query) !== -1) {
                        results.push({ type: '伏笔', name: fsName, page: 'story' });
                    }
                }
            }
        }

        // 搜索地点
        var locations = localDataManager.getModule('locations');
        if (locations && typeof locations === 'object') {
            for (var locKey in locations) {
                if (locations.hasOwnProperty(locKey)) {
                    var loc = locations[locKey];
                    if (loc && loc.name && loc.name.toLowerCase().indexOf(query) !== -1) {
                        results.push({ type: '地点', name: loc.name, page: 'map' });
                    }
                }
            }
        }

        // 搜索人物（关系模块）
        var characters = localDataManager.getModule('characters');
        if (Array.isArray(characters)) {
            for (var c = 0; c < characters.length; c++) {
                var ch = characters[c];
                if (ch && ch.name && ch.name.toLowerCase().indexOf(query) !== -1) {
                    results.push({ type: '人物', name: ch.name, page: 'relation' });
                }
            }
        }

        // 搜索自定义分类条目
        var customItems = localDataManager.getModule('custom_items');
        if (customItems && typeof customItems === 'object') {
            for (var ciKey in customItems) {
                if (customItems.hasOwnProperty(ciKey)) {
                    var ci = customItems[ciKey];
                    if (ci) {
                        var ciName = ci.title || ci.name || '';
                        if (ciName && ciName.toLowerCase().indexOf(query) !== -1) {
                            results.push({ type: '自定义', name: ciName, page: 'custom' });
                        }
                    }
                }
            }
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
