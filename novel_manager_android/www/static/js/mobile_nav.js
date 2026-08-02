// ============================================================
// 手机版导航 - mobile_nav.js
// 底部 Tab 栏 + 抽屉菜单
// ============================================================

var MobileNav = (function() {
    'use strict';

    // 底部 Tab 页配置
    var tabPages = ['character', 'inventory', 'equipment', 'story'];
    var currentPage = 'character';
    var drawerOpen = false;

    // ==================== Tab 切换 ====================

    function switchTab(pageId) {
        // 调用全局 switchPage（来自 advanced_features.js）
        if (typeof switchPage === 'function') {
            switchPage(pageId);
        }
        currentPage = pageId;
        updateTabState(pageId);
    }

    function updateTabState(pageId) {
        document.querySelectorAll('.tab-item').forEach(function(btn) {
            btn.classList.remove('active');
            if (btn.dataset.page === pageId) {
                btn.classList.add('active');
            }
        });
    }

    // ==================== 抽屉菜单 ====================

    function toggleDrawer() {
        if (drawerOpen) {
            closeDrawer();
        } else {
            openDrawer();
        }
    }

    function openDrawer() {
        drawerOpen = true;
        document.getElementById('drawer-overlay').classList.add('open');
        document.getElementById('drawer-panel').classList.add('open');
        document.body.style.overflow = 'hidden';
        rebuildDrawer();
    }

    function closeDrawer() {
        drawerOpen = false;
        document.getElementById('drawer-overlay').classList.remove('open');
        document.getElementById('drawer-panel').classList.remove('open');
        document.body.style.overflow = '';
    }

    // ==================== 抽屉内容生成 ====================

    function rebuildDrawer() {
        var drawerBody = document.getElementById('drawer-body');
        if (!drawerBody) return;

        var html = '';

        if (typeof ModuleRegistry === 'undefined') {
            drawerBody.innerHTML = '<p style="padding:16px;color:#999;">模块未加载</p>';
            return;
        }

        var groups = {
            'character': { name: '角色成长', icon: 'heart' },
            'story': { name: '故事线', icon: 'book' },
            'system': { name: '系统', icon: 'settings' },
            'world': { name: '世界设定', icon: 'earth' },
            'writing': { name: '写作辅助', icon: 'edit' }
        };

        var groupOrder = ['character', 'story', 'world', 'writing', 'system'];
        var allModules = ModuleRegistry.getAllModules ? ModuleRegistry.getAllModules() : {};

        for (var g = 0; g < groupOrder.length; g++) {
            var groupKey = groupOrder[g];
            var groupInfo = groups[groupKey] || { name: groupKey, icon: 'folder' };
            var mods = [];

            for (var id in allModules) {
                var mod = allModules[id];
                if (mod.group === groupKey && !mod.hidden) {
                    mods.push(mod);
                }
            }

            if (mods.length === 0) continue;

            // 按 order 排序
            mods.sort(function(a, b) { return (a.order || 50) - (b.order || 50); });

            var iconHtml = '';
            if (typeof SvgIconLib !== 'undefined' && SvgIconLib.render) {
                iconHtml = SvgIconLib.render(groupInfo.icon, 16) || '';
            }

            html += '<div class="drawer-group-header">' + iconHtml + ' ' + groupInfo.name + '</div>';

            for (var i = 0; i < mods.length; i++) {
                var m = mods[i];
                var activeClass = (m.id === currentPage) ? ' active' : '';
                var modIcon = '';
                if (m.svgIcon) {
                    modIcon = '<span class="drawer-item-icon">' + m.svgIcon + '</span>';
                } else if (typeof SvgIconLib !== 'undefined' && SvgIconLib.is && SvgIconLib.is(m.icon)) {
                    modIcon = '<span class="drawer-item-icon">' + SvgIconLib.render(m.icon, 20) + '</span>';
                } else {
                    modIcon = '<span class="drawer-item-icon">' + (m.icon || '') + '</span>';
                }

                html += '<button class="drawer-item' + activeClass + '" data-page="' + m.id + '" onclick="MobileNav.selectDrawerItem(\'' + m.id + '\')">';
                html += modIcon;
                html += '<span>' + (m.name || m.id) + '</span>';
                html += '</button>';
            }
        }

        drawerBody.innerHTML = html;
    }

    function selectDrawerItem(pageId) {
        closeDrawer();
        switchTab(pageId);
        // 滚动到顶部
        window.scrollTo(0, 0);
    }

    // ==================== Tab 图标渲染 ====================

    function renderTabIcons() {
        if (typeof ModuleRegistry === 'undefined') return;

        var tabIds = ['character', 'inventory', 'equipment', 'story'];
        var fallbacks = { character: 'heart', inventory: 'box', equipment: 'sword', story: 'book' };
        for (var t = 0; t < tabIds.length; t++) {
            var tab = tabIds[t];
            var el = document.getElementById('tab-icon-' + tab);
            if (!el) continue;
            var svgHtml = '';
            var mod = ModuleRegistry.getModule ? ModuleRegistry.getModule(tab) : null;
            if (mod && mod.svgIcon) {
                svgHtml = mod.svgIcon;
            } else if (typeof SvgIconLib !== 'undefined' && SvgIconLib.render) {
                svgHtml = SvgIconLib.render(fallbacks[tab], 22) || '';
            }
            if (svgHtml) {
                el.innerHTML = svgHtml;
            }
        }
    }

    // ==================== 触摸滑动关闭抽屉 ====================

    var touchStartX = 0;
    var touchStartY = 0;

    function initSwipeGesture() {
        var panel = document.getElementById('drawer-panel');
        if (!panel) return;

        panel.addEventListener('touchstart', function(e) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, { passive: true });

        panel.addEventListener('touchend', function(e) {
            if (!drawerOpen) return;
            var dx = e.changedTouches[0].clientX - touchStartX;
            var dy = Math.abs(e.changedTouches[0].clientY - touchStartY);
            // 左滑超过 50px 且水平 > 垂直，则关闭
            if (dx < -50 && Math.abs(dx) > dy) {
                closeDrawer();
            }
        }, { passive: true });
    }

    // ==================== 初始化 ====================

    function init() {
        renderTabIcons();
        initSwipeGesture();

        // 重写 rebuildSidebar 使其也更新抽屉
        if (typeof window.rebuildSidebar === 'function') {
            var originalRebuild = window.rebuildSidebar;
            window.rebuildSidebar = function() {
                originalRebuild();
                // 如果抽屉打开，也刷新
                if (drawerOpen) rebuildDrawer();
            };
        }

        // 监听 switchPage 同步 tab 状态
        if (typeof window.switchPage === 'function') {
            var originalSwitch = window.switchPage;
            window.switchPage = function(pageId) {
                originalSwitch(pageId);
                currentPage = pageId;
                updateTabState(pageId);
            };
        }
    }

    // DOM 加载后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // 公开 API
    return {
        switchTab: switchTab,
        toggleDrawer: toggleDrawer,
        openDrawer: openDrawer,
        closeDrawer: closeDrawer,
        selectDrawerItem: selectDrawerItem
    };
})();
