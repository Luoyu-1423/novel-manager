// ============================================================
// 模块注册系统 - ModuleRegistry
// 版本: 3.2.0
// 功能: 统一管理所有功能模块的注册、导航、预览、导出、搜索
// ============================================================

const ModuleRegistry = (function() {
    'use strict';

    // 已注册模块列表
    const modules = {};
    // 模块分组定义（v3.2.0 重组：5 组 → 4 组，story 合并进 character）
    const groups = {
        'pinned':    { name: '常用', icon: 'star', order: 0 },
        'writing':   { name: '写作核心', icon: 'edit', order: 1 },
        'world':     { name: '世界与设定', icon: 'earth', order: 2 },
        'character': { name: '角色与剧情', icon: 'book', order: 3 },
        'system':    { name: '系统', icon: 'settings', order: 4 }
    };

    // 用户配置（收藏、分组折叠状态）
    // schemaVersion: 分组结构版本，变更时自动重置 collapsedGroups（保留 pinned）
    const SCHEMA_VERSION = 'v3.2.0-regroup';
    let userConfig = {
        pinned: [],          // 收藏的模块 id 列表
        collapsedGroups: {}, // { groupName: true/false }
        schemaVersion: SCHEMA_VERSION
    };

    // 加载用户配置
    function loadUserConfig() {
        try {
            const saved = localStorage.getItem('module_registry_config');
            if (saved) {
                const parsed = JSON.parse(saved);
                userConfig.pinned = parsed.pinned || [];
                // 分组结构变更后，旧 collapsedGroups 的 key 可能已失效，强制重置
                if (parsed.schemaVersion !== SCHEMA_VERSION) {
                    userConfig.collapsedGroups = {};
                    userConfig.schemaVersion = SCHEMA_VERSION;
                    saveUserConfig();
                } else {
                    userConfig.collapsedGroups = parsed.collapsedGroups || {};
                    userConfig.schemaVersion = SCHEMA_VERSION;
                }
            }
        } catch(e) {
            console.warn('[ModuleRegistry] 加载用户配置失败:', e);
        }
    }

    // 保存用户配置
    function saveUserConfig() {
        try {
            localStorage.setItem('module_registry_config', JSON.stringify(userConfig));
        } catch(e) {
            console.warn('[ModuleRegistry] 保存用户配置失败:', e);
        }
    }

    // ==================== 注册 ====================

    /**
     * 注册一个模块
     * @param {Object} config - 模块配置
     * @param {string} config.id - 唯一标识
     * @param {string} config.name - 显示名称
     * @param {string} config.icon - 图标 (emoji)
     * @param {string} config.group - 所属分组 key
     * @param {string[]} [config.dataKeys] - 对应的数据 key 列表
     * @param {string} [config.svgIcon] - SVG 图标路径（桌面端侧边栏用）
     * @param {Function} [config.previewRenderer] - 预览渲染函数 (appData) => htmlString
     * @param {Function} [config.exportFormatter] - 导出格式化函数 (data, detailed) => string
     * @param {Function} [config.searchIndexer] - 搜索索引函数 (data) => [{name, page}]
     * @param {Function} [config.pageRenderer] - 页面内容渲染函数 () => htmlString
     * @param {Function} [config.onPageShow] - 页面显示时的回调
     * @param {number} [config.order] - 组内排序权重
     * @param {boolean} [config.hidden] - 是否在导航中隐藏
     */
    function register(config) {
        if (!config || !config.id) {
            console.error('[ModuleRegistry] 模块注册失败: 缺少 id', config);
            return;
        }
        if (modules[config.id]) {
            console.warn('[ModuleRegistry] 模块重复注册:', config.id);
        }
        modules[config.id] = {
            id: config.id,
            name: config.name || config.id,
            icon: config.icon || '📄',
            group: config.group || 'tools',
            dataKeys: config.dataKeys || [],
            svgIcon: config.svgIcon || '',
            previewRenderer: config.previewRenderer || null,
            exportFormatter: config.exportFormatter || null,
            searchIndexer: config.searchIndexer || null,
            pageRenderer: config.pageRenderer || null,
            onPageShow: config.onPageShow || null,
            order: config.order || 50,
            hidden: config.hidden || false
        };
    }

    // ==================== 查询 ====================

    function getModule(id) {
        return modules[id] || null;
    }

    function getAllModules() {
        return { ...modules };
    }

    function getModulesByGroup(groupName) {
        const result = [];
        for (const mod of Object.values(modules)) {
            if (mod.group === groupName && !mod.hidden) {
                result.push(mod);
            }
        }
        return result.sort((a, b) => a.order - b.order);
    }

    function getGroups() {
        return { ...groups };
    }

    // ==================== 隐藏状态管理 ====================

    /**
     * 设置模块隐藏状态
     * @param {string} id - 模块 id
     * @param {boolean} hidden - 是否隐藏
     * @returns {boolean} 是否成功
     */
    function setHidden(id, hidden) {
        const mod = modules[id];
        if (!mod) {
            console.warn('[ModuleRegistry] setHidden 失败: 模块不存在', id);
            return false;
        }
        mod.hidden = !!hidden;
        return true;
    }

    // ==================== 收藏管理 ====================

    function isPinned(id) {
        return userConfig.pinned.includes(id);
    }

    function togglePin(id) {
        const idx = userConfig.pinned.indexOf(id);
        if (idx >= 0) {
            userConfig.pinned.splice(idx, 1);
        } else {
            userConfig.pinned.push(id);
        }
        saveUserConfig();
    }

    function getPinnedModules() {
        return userConfig.pinned
            .map(id => modules[id])
            .filter(m => m && !m.hidden);
    }

    // ==================== 分组折叠 ====================

    function isGroupCollapsed(groupName) {
        return !!userConfig.collapsedGroups[groupName];
    }

    function toggleGroupCollapse(groupName) {
        userConfig.collapsedGroups[groupName] = !userConfig.collapsedGroups[groupName];
        saveUserConfig();
    }

    // ==================== 侧边栏生成 ====================

    /**
     * 生成桌面端分组侧边栏 HTML
     * @param {string} currentPage - 当前页面 id
     * @returns {string} HTML 字符串
     */
    function generateSidebarHTML(currentPage) {
        loadUserConfig();
        let html = '';

        // 1. 收藏模块（置顶）
        const pinnedMods = getPinnedModules();
        if (pinnedMods.length > 0) {
            html += _renderGroupHeader('pinned', true);
            html += '<div class="sidebar-group-body">';
            pinnedMods.forEach(mod => {
                html += _renderNavItem(mod, mod.id === currentPage);
            });
            html += '</div>';
        }

        // 2. 各分组
        const sortedGroups = Object.entries(groups)
            .filter(([key]) => key !== 'pinned')
            .sort((a, b) => a[1].order - b[1].order);

        for (const [groupKey, groupInfo] of sortedGroups) {
            const mods = getModulesByGroup(groupKey);
            if (mods.length === 0) continue;

            const collapsed = isGroupCollapsed(groupKey);
            html += _renderGroupHeader(groupKey, collapsed, groupInfo);
            if (!collapsed) {
                html += '<div class="sidebar-group-body">';
                mods.forEach(mod => {
                    html += _renderNavItem(mod, mod.id === currentPage);
                });
                html += '</div>';
            }
        }

        return html;
    }

    function _renderGroupHeader(groupKey, collapsed, groupInfo) {
        if (!groupInfo) groupInfo = groups[groupKey] || { name: groupKey, icon: 'folder' };
        const arrow = collapsed ? '▶' : '▼';
        const collapseClass = collapsed ? 'collapsed' : '';
        const iconHtml = SvgIconLib ? SvgIconLib.renderAuto(groupInfo.icon, 16) : groupInfo.icon;
        return `
            <div class="sidebar-group-header ${collapseClass}" data-group="${groupKey}" onclick="ModuleRegistry.handleGroupClick('${groupKey}')">
                <span class="sidebar-group-arrow">${arrow}</span>
                <span class="sidebar-group-icon">${iconHtml}</span>
                <span class="sidebar-group-name">${groupInfo.name}</span>
            </div>
        `;
    }

    function _renderNavItem(mod, isActive) {
        const activeClass = isActive ? ' active' : '';
        const pinnedClass = isPinned(mod.id) ? ' pinned' : '';
        let svgContent;
        if (mod.svgIcon) {
            svgContent = `<span class="nav-icon">${mod.svgIcon}</span>`;
        } else if (SvgIconLib && SvgIconLib.is && SvgIconLib.is(mod.icon)) {
            svgContent = `<span class="nav-icon">${SvgIconLib.render(mod.icon, 20)}</span>`;
        } else {
            svgContent = `<span class="nav-icon nav-icon-emoji">${mod.icon || '📦'}</span>`;
        }
        return `
            <button class="nav-btn${activeClass}${pinnedClass}" data-page="${mod.id}" onclick="ModuleRegistry.handleNavClick('${mod.id}')">
                ${svgContent}
                <span class="nav-label">${mod.name}</span>
                <span class="nav-pin-btn" onclick="event.stopPropagation(); ModuleRegistry.handlePinToggle('${mod.id}')" title="收藏/取消收藏">${isPinned(mod.id) ? '★' : '☆'}</span>
            </button>
        `;
    }

    // ==================== 事件处理 ====================

    function handleGroupClick(groupKey) {
        toggleGroupCollapse(groupKey);
        // 重新渲染侧边栏
        if (typeof rebuildSidebar === 'function') {
            rebuildSidebar();
        }
    }

    function handleNavClick(pageId) {
        if (typeof switchPage === 'function') {
            switchPage(pageId);
        }
    }

    function handlePinToggle(moduleId) {
        togglePin(moduleId);
        if (typeof rebuildSidebar === 'function') {
            rebuildSidebar();
        }
    }

    // ==================== 数据预览生成 ====================

    /**
     * 自动生成数据预览 HTML（遍历所有注册模块）
     * @param {Object} appData - 全局应用数据
     * @param {Object} previewConfig - 预览显示配置 { moduleId: true/false }
     * @returns {string} HTML 字符串
     */
    function generatePreviewHTML(appData, previewConfig) {
        let html = '';
        const sortedGroups = Object.entries(groups)
            .filter(([key]) => key !== 'pinned')
            .sort((a, b) => a[1].order - b[1].order);

        for (const [groupKey, groupInfo] of sortedGroups) {
            const mods = getModulesByGroup(groupKey);
            let groupHtml = '';

            for (const mod of mods) {
                if (previewConfig && previewConfig[mod.id] === false) continue;
                if (!mod.previewRenderer) continue;

                try {
                    const content = mod.previewRenderer(appData);
                    if (content && content.trim()) {
                        groupHtml += `<div class="tool-section">`;
                        groupHtml += `<h3>${mod.icon} ${mod.name}</h3>`;
                        groupHtml += content;
                        groupHtml += `</div>`;
                    }
                } catch(e) {
                    console.error(`[ModuleRegistry] 预览渲染失败 (${mod.id}):`, e);
                }
            }

            if (groupHtml) {
                html += `<div class="preview-group">`;
                html += `<h2 class="preview-group-title">${groupInfo.icon} ${groupInfo.name}</h2>`;
                html += groupHtml;
                html += `</div>`;
            }
        }

        return html || '<p style="text-align:center;color:#9ca3af;padding:40px 0;">暂无显示的模块</p>';
    }

    // ==================== 导出配置生成 ====================

    /**
     * 自动生成默认导出顺序配置
     * @returns {Array} 导出模块列表
     */
    function generateDefaultExportOrder() {
        const result = [];
        let order = 1;
        const sortedGroups = Object.entries(groups)
            .filter(([key]) => key !== 'pinned')
            .sort((a, b) => a[1].order - b[1].order);

        for (const [groupKey, groupInfo] of sortedGroups) {
            const mods = getModulesByGroup(groupKey);
            for (const mod of mods) {
                if (mod.exportFormatter) {
                    result.push({
                        id: mod.id,
                        name: `${mod.icon} ${mod.name}`,
                        enabled: true,
                        order: order++
                    });
                }
            }
        }
        return result;
    }

    /**
     * 执行模块导出格式化
     * @param {string} moduleId - 模块 ID
     * @param {boolean} detailed - 是否详细模式
     * @returns {string} 导出的文本内容
     */
    function formatExport(moduleId, detailed) {
        const mod = modules[moduleId];
        if (!mod || !mod.exportFormatter) return '';
        try {
            // 获取模块数据
            let data = {};
            if (typeof localDataManager !== 'undefined') {
                for (const key of mod.dataKeys) {
                    data[key] = localDataManager.getModule(key);
                }
            } else if (typeof apiRequest === 'function') {
                // 同步方式获取（需要在 async 上下文中预获取）
                data = window._moduleExportData && window._moduleExportData[moduleId] || {};
            }
            return mod.exportFormatter(data, detailed);
        } catch(e) {
            console.error(`[ModuleRegistry] 导出格式化失败 (${moduleId}):`, e);
            return `导出 ${mod.name} 时出错\n`;
        }
    }

    // ==================== 搜索索引 ====================

    /**
     * 执行所有模块的搜索
     * @param {string} query - 搜索关键词
     * @returns {Array} 搜索结果 [{type, name, page}]
     */
    function searchAll(query) {
        const results = [];
        const lowerQuery = query.toLowerCase();

        for (const mod of Object.values(modules)) {
            if (!mod.searchIndexer) continue;
            try {
                let data = {};
                if (typeof localDataManager !== 'undefined') {
                    for (const key of mod.dataKeys) {
                        data[key] = localDataManager.getModule(key);
                    }
                }
                const items = mod.searchIndexer(data, lowerQuery);
                if (Array.isArray(items)) {
                    items.forEach(item => {
                        results.push({
                            type: mod.name,
                            name: item.name || '',
                            page: item.page || mod.id
                        });
                    });
                }
            } catch(e) {
                console.error(`[ModuleRegistry] 搜索失败 (${mod.id}):`, e);
            }
        }
        return results;
    }

    // ==================== 页面渲染 ====================

    /**
     * 渲染模块页面内容
     * @param {string} moduleId - 模块 ID
     * @returns {string|null} HTML 字符串或 null
     */
    function renderPage(moduleId) {
        const mod = modules[moduleId];
        if (!mod) return null;
        if (mod.pageRenderer) {
            try {
                return mod.pageRenderer();
            } catch(e) {
                console.error(`[ModuleRegistry] 页面渲染失败 (${moduleId}):`, e);
                return '<p>页面渲染失败</p>';
            }
        }
        return null;
    }

    /**
     * 触发页面显示回调
     */
    function onPageShow(moduleId) {
        const mod = modules[moduleId];
        if (mod && mod.onPageShow) {
            try {
                mod.onPageShow();
            } catch(e) {
                console.error(`[ModuleRegistry] onPageShow 失败 (${moduleId}):`, e);
            }
        }
    }

    // ==================== 初始化 ====================

    function init() {
        loadUserConfig();
        console.log('[ModuleRegistry] 初始化完成, 已注册', Object.keys(modules).length, '个模块');
    }

    // 自动初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ==================== 公开 API ====================

    return {
        register,
        getModule,
        getAllModules,
        getModulesByGroup,
        getGroups,
        setHidden,
        isPinned,
        togglePin,
        getPinnedModules,
        isGroupCollapsed,
        toggleGroupCollapse,
        generateSidebarHTML,
        generatePreviewHTML,
        generateDefaultExportOrder,
        formatExport,
        searchAll,
        renderPage,
        onPageShow,
        handleGroupClick,
        handleNavClick,
        handlePinToggle,
        saveUserConfig,
        loadUserConfig
    };
})();

// 全局暴露
window.ModuleRegistry = ModuleRegistry;
