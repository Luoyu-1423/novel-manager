// ============================================================
// 模块: 世界观设定 (mod_worldview.js)
// 版本: 3.2.0
// 功能: 管理小说世界背景、势力、魔法体系、历史等设定
// ============================================================

(function() {
    'use strict';

    // ==================== 样式注入 ====================
    const style = document.createElement('style');
    style.textContent = `
        .worldview-container { display: flex; gap: 16px; min-height: 400px; }
        .worldview-sidebar { width: 200px; min-width: 200px; border-right: 1px solid var(--border-color, #e5e7eb); padding-right: 16px; }
        .worldview-main { flex: 1; }
        .worldview-cat-item { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 6px; cursor: pointer; margin-bottom: 4px; transition: background 0.15s; }
        .worldview-cat-item:hover { background: var(--bg-color, #f9fafb); }
        .worldview-cat-item.active { background: linear-gradient(135deg, var(--primary-color, #6366f1), var(--secondary-color, #8b5cf6)); color: #fff; }
        .worldview-cat-item .cat-icon { font-size: 16px; }
        .worldview-cat-item .cat-name { flex: 1; font-size: 14px; }
        .worldview-cat-item .cat-count { font-size: 12px; opacity: 0.7; }
        .worldview-entry-card { background: var(--card-bg, #fff); border: 1px solid var(--border-color, #e5e7eb); border-radius: 8px; padding: 16px; margin-bottom: 12px; }
        .worldview-entry-card h4 { margin: 0 0 8px 0; font-size: 16px; color: var(--text-primary, #111); }
        .worldview-entry-card .entry-desc { color: var(--text-secondary, #6b7280); font-size: 14px; margin-bottom: 8px; }
        .worldview-entry-card .entry-details { font-size: 14px; line-height: 1.6; color: var(--text-primary, #374151); white-space: pre-wrap; }
        .worldview-actions { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
        @media (max-width: 640px) { .worldview-container { flex-direction: column; } .worldview-sidebar { width: 100%; min-width: auto; border-right: none; padding-right: 0; border-bottom: 1px solid var(--border-color, #e5e7eb); padding-bottom: 12px; margin-bottom: 12px; } .worldview-sidebar .worldview-cat-list { display: flex; flex-wrap: wrap; gap: 6px; } }
    `;
    document.head.appendChild(style);

    // ==================== 状态 ====================
    let currentCategory = null;
    let worldviewData = {};
    let categories = {};

    // ==================== 数据加载 ====================
    async function loadData() {
        try {
            worldviewData = await apiRequest('/api/mod/worldview') || {};
            categories = await apiRequest('/api/mod/worldview_categories') || {};
        } catch(e) {
            console.error('[Worldview] 加载数据失败:', e);
            worldviewData = {};
            categories = {};
        }
    }

    // ==================== 页面渲染 ====================
    function renderPage() {
        let html = '<section class="card">';
        html += '<div class="card-header"><h2>🌍 世界观设定</h2>';
        html += '<div style="display:flex;gap:8px;">';
        html += '<button class="btn-small" onclick="WorldviewModule.exportData()">导出</button>';
        html += '<button class="btn-primary btn-small" onclick="WorldviewModule.showAddCategory()">+ 添加分类</button>';
        html += '</div></div>';
        html += '<div class="worldview-container">';
        html += '<div class="worldview-sidebar"><div class="worldview-cat-list" id="wv-cat-list">';
        // 分类列表动态填充
        html += '</div></div>';
        html += '<div class="worldview-main" id="wv-main-content">';
        html += '<p style="text-align:center;color:#9ca3af;padding:40px 0;">请从左侧选择分类或添加新分类</p>';
        html += '</div></div></section>';
        return html;
    }

    function refreshView() {
        renderCatList();
        renderEntries();
    }

    function renderCatList() {
        const list = document.getElementById('wv-cat-list');
        if (!list) return;
        let html = '';
        const sorted = Object.values(categories).sort((a, b) => (a.order || 0) - (b.order || 0));
        sorted.forEach(cat => {
            const active = currentCategory === cat.id ? ' active' : '';
            const count = (worldviewData[cat.id] || []).length;
            html += `<div class="worldview-cat-item${active}" onclick="WorldviewModule.selectCategory('${cat.id}')">`;
            html += `<span class="cat-icon">${cat.icon || '📁'}</span>`;
            html += `<span class="cat-name">${cat.name}</span>`;
            html += `<span class="cat-count">${count}</span>`;
            html += `<span class="nav-pin-btn" onclick="event.stopPropagation();WorldviewModule.showEditCategory('${cat.id}')" title="编辑">✏️</span>`;
            html += `<span class="nav-pin-btn" onclick="event.stopPropagation();WorldviewModule.deleteCategory('${cat.id}')" title="删除" style="color:#ef4444;">✕</span>`;
            html += '</div>';
        });
        if (sorted.length === 0) {
            html = '<p style="color:#9ca3af;font-size:13px;">暂无分类，点击上方按钮添加</p>';
        }
        list.innerHTML = html;
    }

    function renderEntries() {
        const main = document.getElementById('wv-main-content');
        if (!main) return;
        if (!currentCategory) {
            main.innerHTML = '<p style="text-align:center;color:#9ca3af;padding:40px 0;">请从左侧选择分类或添加新分类</p>';
            return;
        }
        const cat = categories[currentCategory];
        if (!cat) return;
        const entries = worldviewData[currentCategory] || [];
        let html = '<div class="worldview-actions">';
        html += `<button class="btn-primary btn-small" onclick="WorldviewModule.showAddEntry()">+ 添加条目</button>`;
        html += '</div>';
        if (entries.length === 0) {
            html += '<p style="color:#9ca3af;text-align:center;padding:20px 0;">该分类暂无条目</p>';
        }
        entries.forEach(entry => {
            html += `<div class="worldview-entry-card">`;
            html += `<div style="display:flex;justify-content:space-between;align-items:start;">`;
            html += `<h4>${cat.icon || '📁'} ${entry.name || '未命名'}${typeof renderIdBadge === 'function' ? renderIdBadge(entry.id) : ''}</h4>`;
            html += `<div style="display:flex;gap:6px;">`;
            html += `<button class="btn-tiny" onclick="WorldviewModule.showEditEntry('${entry.id}')">编辑</button>`;
            html += `<button class="btn-tiny btn-danger" onclick="WorldviewModule.deleteEntry('${entry.id}')">删除</button>`;
            html += `</div></div>`;
            if (entry.description) html += `<div class="entry-desc">${escapeHtml(entry.description)}</div>`;
            if (entry.details) html += `<div class="entry-details">${escapeHtml(entry.details)}</div>`;
            html += `</div>`;
        });
        main.innerHTML = html;
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ==================== CRUD 操作 ====================

    function selectCategory(catId) {
        currentCategory = catId;
        refreshView();
    }

    function showAddCategory() {
        showModal('添加世界观分类', `
            <div style="display:flex;flex-direction:column;gap:12px;">
                <div><label>分类名称</label><input type="text" id="wv-cat-name" class="modal-input" placeholder="如：势力、魔法体系"></div>
                <div><label>图标 (emoji)</label><input type="text" id="wv-cat-icon" class="modal-input" placeholder="🏰" value="📁"></div>
            </div>
        `, [
            { text: '取消', class: 'btn-secondary', action: () => closeModal() },
            { text: '添加', class: 'btn-primary', action: async () => {
                const name = document.getElementById('wv-cat-name').value.trim();
                const icon = document.getElementById('wv-cat-icon').value.trim() || '📁';
                if (!name) { showToast('请输入分类名称', 'error'); return; }
                const id = 'wvcat_' + Date.now();
                const order = Object.keys(categories).length + 1;
                categories[id] = { id, name, icon, order };
                await apiRequest('/api/mod/worldview_categories/save', 'POST', categories);
                currentCategory = id;
                refreshView();
                closeModal();
                showToast('分类已添加', 'success');
            }}
        ]);
    }

    function showEditCategory(catId) {
        const cat = categories[catId];
        if (!cat) return;
        showModal('编辑分类', `
            <div style="display:flex;flex-direction:column;gap:12px;">
                <div><label>分类名称</label><input type="text" id="wv-cat-name" class="modal-input" value="${escapeHtml(cat.name)}"></div>
                <div><label>图标 (emoji)</label><input type="text" id="wv-cat-icon" class="modal-input" value="${cat.icon || '📁'}"></div>
            </div>
        `, [
            { text: '取消', class: 'btn-secondary', action: () => closeModal() },
            { text: '保存', class: 'btn-primary', action: async () => {
                const name = document.getElementById('wv-cat-name').value.trim();
                const icon = document.getElementById('wv-cat-icon').value.trim() || '📁';
                if (!name) { showToast('请输入分类名称', 'error'); return; }
                categories[catId].name = name;
                categories[catId].icon = icon;
                await apiRequest('/api/mod/worldview_categories/save', 'POST', categories);
                refreshView();
                closeModal();
                showToast('分类已更新', 'success');
            }}
        ]);
    }

    async function deleteCategory(catId) {
        const cat = categories[catId];
        if (!cat) return;
        if (!confirm(`确定删除分类「${cat.name}」及其所有条目吗？`)) return;
        delete categories[catId];
        delete worldviewData[catId];
        await apiRequest('/api/mod/worldview_categories/save', 'POST', categories);
        await apiRequest('/api/mod/worldview/save', 'POST', worldviewData);
        if (currentCategory === catId) currentCategory = null;
        refreshView();
        showToast('分类已删除', 'success');
    }

    function showAddEntry() {
        if (!currentCategory) { showToast('请先选择分类', 'error'); return; }
        showModal('添加世界观条目', `
            <div style="display:flex;flex-direction:column;gap:12px;">
                <div><label>名称</label><input type="text" id="wv-entry-name" class="modal-input" placeholder="条目名称"></div>
                <div><label>简述</label><input type="text" id="wv-entry-desc" class="modal-input" placeholder="简短描述"></div>
                <div><label>详细内容</label><textarea id="wv-entry-details" class="modal-input" rows="6" placeholder="详细描述..."></textarea></div>
            </div>
        `, [
            { text: '取消', class: 'btn-secondary', action: () => closeModal() },
            { text: '添加', class: 'btn-primary', action: async () => {
                const name = document.getElementById('wv-entry-name').value.trim();
                const description = document.getElementById('wv-entry-desc').value.trim();
                const details = document.getElementById('wv-entry-details').value.trim();
                if (!name) { showToast('请输入名称', 'error'); return; }
                const id = 'wv_' + Date.now();
                if (!worldviewData[currentCategory]) worldviewData[currentCategory] = [];
                worldviewData[currentCategory].push({ id, name, description, details });
                await apiRequest('/api/mod/worldview/save', 'POST', worldviewData);
                renderEntries();
                renderCatList();
                closeModal();
                showToast('条目已添加', 'success');
            }}
        ]);
    }

    function showEditEntry(entryId) {
        if (!currentCategory) return;
        const entries = worldviewData[currentCategory] || [];
        const entry = entries.find(e => e.id === entryId);
        if (!entry) return;
        showModal('编辑条目', `
            <div style="display:flex;flex-direction:column;gap:12px;">
                <div><label>名称</label><input type="text" id="wv-entry-name" class="modal-input" value="${escapeHtml(entry.name || '')}"></div>
                <div><label>简述</label><input type="text" id="wv-entry-desc" class="modal-input" value="${escapeHtml(entry.description || '')}"></div>
                <div><label>详细内容</label><textarea id="wv-entry-details" class="modal-input" rows="6">${escapeHtml(entry.details || '')}</textarea></div>
            </div>
        `, [
            { text: '取消', class: 'btn-secondary', action: () => closeModal() },
            { text: '保存', class: 'btn-primary', action: async () => {
                entry.name = document.getElementById('wv-entry-name').value.trim();
                entry.description = document.getElementById('wv-entry-desc').value.trim();
                entry.details = document.getElementById('wv-entry-details').value.trim();
                await apiRequest('/api/mod/worldview/save', 'POST', worldviewData);
                renderEntries();
                closeModal();
                showToast('条目已更新', 'success');
            }}
        ]);
    }

    async function deleteEntry(entryId) {
        if (!currentCategory) return;
        if (!confirm('确定删除该条目吗？')) return;
        const entries = worldviewData[currentCategory] || [];
        worldviewData[currentCategory] = entries.filter(e => e.id !== entryId);
        await apiRequest('/api/mod/worldview/save', 'POST', worldviewData);
        renderEntries();
        renderCatList();
        showToast('条目已删除', 'success');
    }

    // ==================== 预览/导出/搜索 ====================

    function previewRenderer() {
        const allEntries = [];
        for (const [catId, entries] of Object.entries(worldviewData)) {
            const cat = categories[catId] || { name: catId, icon: '📁' };
            if (entries.length > 0) {
                allEntries.push({ cat, entries });
            }
        }
        if (allEntries.length === 0) return '<p>暂无世界观数据</p>';
        let html = '';
        allEntries.forEach(({ cat, entries }) => {
            html += `<p><strong>${cat.icon} ${cat.name} (${entries.length})</strong></p>`;
            html += '<ul style="margin-left:20px;">';
            entries.forEach(e => {
                html += `<li>${e.name}${e.description ? ' - ' + e.description : ''}</li>`;
            });
            html += '</ul>';
        });
        return html;
    }

    function exportFormatter(data, detailed) {
        const wv = data.worldview || {};
        const cats = data.worldview_categories || {};
        let text = '=== 世界观设定 ===\n\n';
        for (const [catId, entries] of Object.entries(wv)) {
            const cat = cats[catId] || { name: catId, icon: '📁' };
            text += `--- ${cat.icon} ${cat.name} ---\n`;
            entries.forEach(e => {
                text += `\n【${e.name}】\n`;
                if (e.description) text += `简述: ${e.description}\n`;
                if (detailed && e.details) text += `\n${e.details}\n`;
            });
            text += '\n';
        }
        return text;
    }

    function searchIndexer(data, query) {
        const wv = data.worldview || {};
        const cats = data.worldview_categories || {};
        const results = [];
        for (const [catId, entries] of Object.entries(wv)) {
            const cat = cats[catId] || { name: catId };
            entries.forEach(e => {
                if ((e.name || '').toLowerCase().includes(query) ||
                    (e.description || '').toLowerCase().includes(query) ||
                    (e.details || '').toLowerCase().includes(query)) {
                    results.push({ name: `世界观: ${cat.name} > ${e.name}`, page: 'worldview' });
                }
            });
        }
        return results;
    }

    // ==================== 导出接口 ====================
    async function exportData() {
        if (typeof exportToTxt === 'function') {
            exportModule('worldview');
        }
    }

    // ==================== 注册模块 ====================
    window.WorldviewModule = {
        loadData, refreshView, selectCategory, showAddCategory, showEditCategory,
        deleteCategory, showAddEntry, showEditEntry, deleteEntry, exportData
    };

    ModuleRegistry.register({
        id: 'worldview',
        name: '世界观设定',
        icon: '🌍',
        group: 'world',
        order: 1,
        dataKeys: ['worldview', 'worldview_categories'],
        previewRenderer: previewRenderer,
        exportFormatter: exportFormatter,
        searchIndexer: searchIndexer,
        pageRenderer: renderPage,
        onPageShow: () => { loadData().then(() => refreshView()); }
    });

    console.log('[Worldview] 世界观设定模块已注册');
})();
