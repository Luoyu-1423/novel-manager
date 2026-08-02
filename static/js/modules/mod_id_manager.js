// ============================================================
// 模块: ID管理器 (mod_id_manager.js)
// 版本: 3.2.0
// 全局 ID 查看与管理工具
// ============================================================
(function() {
    'use strict';

    const style = document.createElement('style');
    style.textContent = `
        .idm-container { display: flex; flex-direction: column; gap: 12px; }
        .idm-toolbar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .idm-toolbar input { flex: 1; min-width: 150px; padding: 8px 12px; border: 1px solid var(--border-color, #e5e7eb); border-radius: 6px; font-size: 13px; }
        .idm-toolbar select { padding: 8px 12px; border: 1px solid var(--border-color, #e5e7eb); border-radius: 6px; font-size: 13px; }
        .idm-table-wrap { overflow: auto; max-height: 500px; border: 1px solid var(--border-color, #e5e7eb); border-radius: 8px; }
        .idm-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .idm-table th { position: sticky; top: 0; background: var(--bg-color, #f9fafb); padding: 8px 10px; text-align: left; font-weight: 600; border-bottom: 2px solid var(--border-color, #e5e7eb); z-index: 1; }
        .idm-table td { padding: 6px 10px; border-bottom: 1px solid var(--border-color, #e5e7eb); }
        .idm-table tr:hover { background: var(--bg-color, #f3f4f6); }
        .idm-id-cell { font-family: monospace; font-size: 11px; color: #7c3aed; cursor: pointer; padding: 2px 6px; background: rgba(124,58,237,0.06); border-radius: 4px; display: inline-block; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .idm-id-cell:hover { background: rgba(124,58,237,0.12); }
        .idm-count { font-size: 12px; color: var(--text-secondary, #6b7280); }
        .idm-copy-toast { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #1f2937; color: #fff; padding: 8px 16px; border-radius: 6px; font-size: 13px; z-index: 9999; pointer-events: none; }
    `;
    document.head.appendChild(style);

    let allItems = [];
    let filteredItems = [];
    let searchQuery = '';
    let filterModule = '';

    // 提取基础ID：去掉最后的 _xxx 后缀（数字或短后缀）
    // 例如: cat_1782301520621_xof3e_001 -> cat_1782301520621_xof3e
    function getBaseId(id) {
        if (!id) return '';
        // 匹配最后的 _数字 或 _短字符串 后缀
        const match = id.match(/^(.+)_[a-zA-Z0-9]{2,6}$/);
        if (match) return match[1];
        return id;
    }

    // 收集所有模块的 ID 数据
    function collectAllIds() {
        const data = window.appData || {};
        const items = [];

        // 角色信息
        if (data.character && data.character.name) {
            items.push({ module: '角色信息', moduleId: 'character', icon: '👤', id: data.character.id || 'char_main', name: data.character.name });
        }

        // 货币
        if (data.currency && typeof data.currency === 'object') {
            for (const [key, value] of Object.entries(data.currency)) {
                const typeInfo = data.currencyTypes ? data.currencyTypes[key] || {} : {};
                items.push({ module: '货币', moduleId: 'currency', icon: '💰', id: key, name: typeInfo.name || key });
            }
        }

        // 背包物品（支持数组和对象两种格式）
        const inv = data.inventory;
        if (Array.isArray(inv)) {
            inv.forEach(item => {
                items.push({ module: '背包', moduleId: 'inventory', icon: '🎒', id: item.id || '-', name: item.name || '未命名' });
            });
        } else if (inv && typeof inv === 'object') {
            for (const [key, value] of Object.entries(inv)) {
                if (value && typeof value === 'object') {
                    items.push({ module: '背包', moduleId: 'inventory', icon: '🎒', id: value.id || key, name: value.name || '未命名' });
                }
            }
        }

        // 物品库（支持数组和对象两种格式）
        const lib = data.itemLibrary;
        if (Array.isArray(lib)) {
            lib.forEach(item => {
                items.push({ module: '物品库', moduleId: 'item-library', icon: '🏪', id: item.id || '-', name: item.name || '未命名' });
            });
        } else if (lib && typeof lib === 'object') {
            for (const [key, value] of Object.entries(lib)) {
                const item = value && typeof value === 'object' ? value : {};
                items.push({ module: '物品库', moduleId: 'item-library', icon: '🏪', id: item.id || key, name: item.name || '未命名' });
            }
        }

        // 装备
        if (Array.isArray(data.equipmentSlots)) {
            data.equipmentSlots.forEach(slot => {
                items.push({ module: '装备', moduleId: 'equipment', icon: '⚔️', id: slot.id || '-', name: slot.name || '未命名' });
                if (slot.item && slot.item.id) {
                    items.push({ module: '装备(物品)', moduleId: 'equipment', icon: '⚔️', id: slot.item.id, name: slot.item.name || '未命名' });
                }
            });
        }

        // 任务
        if (Array.isArray(data.quests)) {
            data.quests.forEach(q => {
                items.push({ module: '任务', moduleId: 'quests', icon: '📜', id: q.id || '-', name: q.name || q.title || '未命名' });
            });
        }

        // 技能
        if (Array.isArray(data.skills)) {
            data.skills.forEach(s => {
                items.push({ module: '技能', moduleId: 'skills', icon: '✨', id: s.id || '-', name: s.name || '未命名' });
            });
        }

        // 剧情标记
        if (Array.isArray(data.storyMarks)) {
            data.storyMarks.forEach(m => {
                items.push({ module: '剧情', moduleId: 'story', icon: '📖', id: m.id || m.mark_id || '-', name: m.title || m.description || '未命名' });
            });
        }

        // 伏笔
        if (Array.isArray(data.foreshadowing)) {
            data.foreshadowing.forEach(f => {
                items.push({ module: '剧情(伏笔)', moduleId: 'story', icon: '📖', id: f.id || '-', name: f.title || '未命名' });
            });
        }

        // 地点 (v183Data 或 _mapData)
        const v183 = window.v183Data || {};
        if (Array.isArray(v183.locations)) {
            v183.locations.forEach(loc => {
                items.push({ module: '地图', moduleId: 'map', icon: '🗺️', id: loc.id || '-', name: loc.name || '未命名' });
            });
        } else if (data.locations) {
            if (Array.isArray(data.locations)) {
                data.locations.forEach(loc => {
                    items.push({ module: '地图', moduleId: 'map', icon: '🗺️', id: loc.id || '-', name: loc.name || '未命名' });
                });
            } else {
                for (const [id, loc] of Object.entries(data.locations)) {
                    items.push({ module: '地图', moduleId: 'map', icon: '🗺️', id: id, name: loc.name || '未命名' });
                }
            }
        }

        // 人物
        if (Array.isArray(v183.characters)) {
            v183.characters.forEach(c => {
                items.push({ module: '关系(人物)', moduleId: 'relation', icon: '👥', id: c.id || '-', name: c.name || '未命名' });
            });
        } else if (Array.isArray(data.characters)) {
            data.characters.forEach(c => {
                items.push({ module: '关系(人物)', moduleId: 'relation', icon: '👥', id: c.id || '-', name: c.name || '未命名' });
            });
        }

        // 关系
        const rels = v183.relations || data.relations || [];
        if (Array.isArray(rels)) {
            rels.forEach(r => {
                const label = (r.type || r.relation_type || r.label || '关系');
                items.push({ module: '关系', moduleId: 'relation', icon: '👥', id: r.id || '-', name: label });
            });
        }

        // 自定义分类（尝试多个来源）
        const customCats = (typeof customPageCategories !== 'undefined' ? customPageCategories : null) || data.customCategories || [];
        const customCatsArr = Array.isArray(customCats) ? customCats : Object.values(customCats);
        if (customCatsArr.length > 0) {
            customCatsArr.forEach(cat => {
                items.push({ module: '自定义(分类)', moduleId: 'custom', icon: '✏️', id: cat.id || '-', name: cat.name || '未命名' });
                if (cat.items) {
                    cat.items.forEach(item => {
                        items.push({ module: '自定义(条目)', moduleId: 'custom', icon: '✏️', id: item.id || '-', name: item.name || '未命名' });
                    });
                }
            });
        }

        // 物品分类（全局变量 itemCategories 或 appData）
        const cats = (typeof itemCategories !== 'undefined' ? itemCategories : null) || data.itemCategories || [];
        if (Array.isArray(cats) && cats.length > 0) {
            cats.forEach(cat => {
                items.push({ module: '物品分类', moduleId: 'item-library', icon: '📁', id: cat.id || '-', name: cat.name || '未命名' });
            });
        }

        allItems = items;
        applyFilter();
    }

    function applyFilter() {
        const q = searchQuery.toLowerCase();
        filteredItems = allItems.filter(item => {
            if (filterModule && item.moduleId !== filterModule) return false;
            if (q) {
                const baseId = getBaseId(item.id).toLowerCase();
                const fullId = item.id.toLowerCase();
                const name = item.name.toLowerCase();
                const module = item.module.toLowerCase();
                // 匹配完整ID、基础ID、名称、模块名
                if (!fullId.includes(q) && !baseId.includes(q) && !name.includes(q) && !module.includes(q)) return false;
            }
            return true;
        });
    }

    function renderPage() {
        let html = '<section class="card">';
        html += '<div class="card-header"><h2>🔢 ID 管理器</h2></div>';
        html += '<div class="idm-container">';
        // 工具栏
        html += '<div class="idm-toolbar">';
        html += '<input type="text" id="idm-search" placeholder="搜索 ID 或名称..." oninput="IdManagerModule.onSearch(this.value)">';
        html += '<select id="idm-module-filter" onchange="IdManagerModule.onFilter(this.value)">';
        html += '<option value="">全部模块</option>';
        const modules = getModuleOptions();
        modules.forEach(m => { html += `<option value="${m.id}">${m.icon} ${m.name}</option>`; });
        html += '</select>';
        html += '<button class="btn-secondary btn-small" onclick="IdManagerModule.refresh()">🔄 刷新</button>';
        html += '</div>';
        // 统计
        html += '<div class="idm-count" id="idm-count"></div>';
        // 表格
        html += '<div class="idm-table-wrap">';
        html += '<table class="idm-table"><thead><tr><th>模块</th><th>基础ID</th><th>完整ID</th><th>名称</th><th>操作</th></tr></thead>';
        html += '<tbody id="idm-tbody"></tbody></table>';
        html += '</div>';
        html += '</div></section>';
        return html;
    }

    function getModuleOptions() {
        const seen = new Set();
        const opts = [];
        allItems.forEach(item => {
            if (!seen.has(item.moduleId)) {
                seen.add(item.moduleId);
                opts.push({ id: item.moduleId, name: item.module, icon: item.icon });
            }
        });
        return opts;
    }

    function renderTable() {
        const tbody = document.getElementById('idm-tbody');
        const countEl = document.getElementById('idm-count');
        if (!tbody) return;

        // 统计基础ID分组（显示变体数量）
        const baseIdGroups = {};
        allItems.forEach(item => {
            const baseId = getBaseId(item.id);
            if (!baseIdGroups[baseId]) baseIdGroups[baseId] = [];
            baseIdGroups[baseId].push(item);
        });

        if (filteredItems.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:#9ca3af;">无匹配数据</td></tr>';
        } else {
            let html = '';
            filteredItems.forEach(item => {
                const baseId = getBaseId(item.id);
                const variants = baseIdGroups[baseId] || [];
                const variantCount = variants.length;
                const isVariant = baseId !== item.id;
                const shortId = item.id.length > 24 ? item.id.substring(item.id.length - 24) : item.id;
                const shortBaseId = baseId.length > 24 ? baseId.substring(baseId.length - 24) : baseId;
                html += '<tr>';
                html += `<td>${item.icon} ${item.module}</td>`;
                html += `<td><span class="idm-id-cell" title="${baseId}" onclick="IdManagerModule.copyId('${baseId.replace(/'/g, "\\'")}')">${shortBaseId}</span>`;
                if (variantCount > 1) html += ` <span style="font-size:10px;color:#f59e0b;" title="${variantCount}个变体">[${variantCount}]</span>`;
                html += `</td>`;
                html += `<td><span class="idm-id-cell" title="${item.id}" onclick="IdManagerModule.copyId('${item.id.replace(/'/g, "\\'")}')">${shortId}</span>`;
                if (isVariant) html += ` <span style="font-size:10px;color:#6366f1;">变体</span>`;
                html += `</td>`;
                html += `<td>${item.name}</td>`;
                html += `<td><button class="btn-small" onclick="IdManagerModule.copyId('${item.id.replace(/'/g, "\\'")}')">复制</button></td>`;
                html += '</tr>';
            });
            tbody.innerHTML = html;
        }
        if (countEl) {
            const uniqueBaseIds = new Set(allItems.map(i => getBaseId(i.id)));
            countEl.textContent = `显示 ${filteredItems.length} 条 / 总计 ${allItems.length} 条 / ${uniqueBaseIds.size} 个基础ID`;
        }
    }

    function copyId(id) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(id).then(() => {
                showCopyToast('ID 已复制: ' + (id.length > 30 ? id.substring(0, 30) + '...' : id));
            });
        } else {
            // fallback
            const ta = document.createElement('textarea');
            ta.value = id;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            showCopyToast('ID 已复制: ' + (id.length > 30 ? id.substring(0, 30) + '...' : id));
        }
    }

    function showCopyToast(msg) {
        const el = document.createElement('div');
        el.className = 'idm-copy-toast';
        el.textContent = msg;
        document.body.appendChild(el);
        setTimeout(() => { el.remove(); }, 1500);
    }

    function onSearch(val) {
        searchQuery = val;
        applyFilter();
        renderTable();
    }

    function onFilter(val) {
        filterModule = val;
        applyFilter();
        renderTable();
    }

    function previewRenderer() {
        return '<p>ID 管理器：查看和复制所有模块数据的 ID</p>';
    }

    function exportFormatter() {
        let text = '=== ID 列表 ===\n\n';
        allItems.forEach(item => {
            text += `[${item.module}] ${item.name} => ${item.id}\n`;
        });
        return text;
    }

    function searchIndexer() { return []; }

    // 强制加载所有模块数据，确保 ID 管理器能收集到所有条目
    async function ensureDataLoaded() {
        const data = window.appData || {};
        const promises = [];
        // 物品库 - 总是重新加载以确保格式正确
        promises.push(apiRequest('/api/items/library').then(r => { if (r && Array.isArray(r)) data.itemLibrary = r; }).catch(() => {}));
        // 物品分类
        promises.push(apiRequest('/api/items/categories').then(r => { if (r) { window.itemCategories = r; data.itemCategories = r; } }).catch(() => {}));
        // 任务
        if (!data.quests || data.quests.length === 0) {
            promises.push(apiRequest('/api/quests').then(r => { if (r) data.quests = r; }).catch(() => {}));
        }
        // 技能
        if (!data.skills || data.skills.length === 0) {
            promises.push(apiRequest('/api/skills').then(r => { if (r) data.skills = r; }).catch(() => {}));
        }
        // 自定义数据
        if (!data.customCategories || data.customCategories.length === 0) {
            promises.push(apiRequest('/api/custom/categories').then(r => { if (r) data.customCategories = r; }).catch(() => {}));
        }
        // v183 数据（人物、关系、地点）
        const v183 = window.v183Data;
        if (v183 && (!v183.characters || v183.characters.length === 0)) {
            promises.push(apiRequest('/api/v183/characters').then(r => { if (r) v183.characters = r; }).catch(() => {}));
            promises.push(apiRequest('/api/v183/relations').then(r => { if (r) v183.relations = r; }).catch(() => {}));
        }
        // 地点
        if (!data.locations || (typeof data.locations === 'object' && !Array.isArray(data.locations) && Object.keys(data.locations).length === 0)) {
            promises.push(apiRequest('/api/locations').then(r => { if (r) data.locations = r; }).catch(() => {}));
        }
        try { await Promise.all(promises); } catch(e) {}
    }

    async function loadData() {
        await ensureDataLoaded();
        collectAllIds();
    }

    async function refreshView() {
        await ensureDataLoaded();
        collectAllIds();
        renderTable();
        // 恢复筛选状态
        const searchEl = document.getElementById('idm-search');
        if (searchEl) searchEl.value = searchQuery;
        const filterEl = document.getElementById('idm-module-filter');
        if (filterEl) filterEl.value = filterModule;
    }

    window.IdManagerModule = {
        loadData, refreshView, onSearch, onFilter, copyId,
        refresh: async function() {
            await ensureDataLoaded();
            collectAllIds();
            // 更新模块筛选下拉框
            const filterEl = document.getElementById('idm-module-filter');
            if (filterEl) {
                const modules = getModuleOptions();
                let optsHtml = '<option value="">\u5168\u90e8\u6a21\u5757</option>';
                modules.forEach(m => { optsHtml += `<option value="${m.id}">${m.icon} ${m.name}</option>`; });
                filterEl.innerHTML = optsHtml;
                filterEl.value = filterModule;
            }
            renderTable();
            if (typeof showToast === 'function') showToast('ID 列表已刷新', 'success');
        }
    };

    ModuleRegistry.register({
        id: 'id_manager', name: 'ID管理', icon: '🔢', group: 'system', order: 3,
        dataKeys: [],
        previewRenderer, exportFormatter, searchIndexer,
        pageRenderer: renderPage,
        onPageShow: async function() { await ensureDataLoaded(); collectAllIds(); renderTable(); }
    });

    console.log('[IdManager] ID管理器模块已注册');
})();
