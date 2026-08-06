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
        /* 2.2-D 关联术语 chip */
        .term-chip { display: inline-block; padding: 2px 10px; background: var(--bg-color, #f3f4f6); border: 1px solid var(--border-color, #e5e7eb); border-radius: 12px; font-size: 12px; color: var(--primary-color, #6366f1); cursor: pointer; transition: all 0.15s; }
        .term-chip:hover { background: var(--primary-color, #6366f1); color: #fff; border-color: var(--primary-color, #6366f1); }
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
            // 归一化：确保每个分类的条目是数组（兼容对象形式存储）
            for (const catId of Object.keys(worldviewData)) {
                if (!Array.isArray(worldviewData[catId])) {
                    worldviewData[catId] = Object.values(worldviewData[catId] || {});
                }
            }
        } catch(e) {
            console.error('[Worldview] 加载数据失败:', e);
            worldviewData = {};
            categories = {};
        }
    }

    // ==================== 页面渲染 ====================
    function renderPage() {
        let html = UIUtils.renderCardPage(
            (SvgIconLib ? SvgIconLib.renderAuto('earth', 18) : '🌍') + ' 世界观设定',
            '<button class="btn-small" onclick="WorldviewModule.exportData()">导出</button>' +
            '<button class="btn-primary btn-small" onclick="WorldviewModule.showAddCategory()">+ 添加分类</button>'
        );
        html += '<div class="worldview-container">';
        html += '<div class="worldview-sidebar"><div class="worldview-cat-list" id="wv-cat-list">';
        // 分类列表动态填充
        html += '</div></div>';
        html += '<div class="worldview-main" id="wv-main-content">';
        html += '<p style="text-align:center;color:#9ca3af;padding:40px 0;">请从左侧选择分类或添加新分类</p>';
        html += '</div></div>';
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
        const rawEntries = worldviewData[currentCategory] || [];
        const entries = Array.isArray(rawEntries) ? rawEntries : Object.values(rawEntries || {});
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
            // 2.2-D 显示关联术语
            if (entry.linked_terms && entry.linked_terms.length > 0) {
                const terms = (window.GlossaryModule && window.GlossaryModule.getTermsByIds) ? window.GlossaryModule.getTermsByIds(entry.linked_terms) : [];
                html += `<div style="margin-top:8px;font-size:12px;color:var(--text-secondary,#6b7280);">关联术语：</div>`;
                html += `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;">`;
                terms.forEach(t => {
                    html += `<span class="term-chip" onclick="WorldviewModule.openLinkedTerm('${t.id}')" title="点击查看术语详情">${escapeHtml(t.name)}</span>`;
                });
                // 显示已被删除的术语 ID（提示用户）
                if (terms.length < entry.linked_terms.length) {
                    html += `<span style="font-size:11px;color:#9ca3af;">（${entry.linked_terms.length - terms.length} 个术语已删除）</span>`;
                }
                html += `</div>`;
            }
            html += `</div>`;
        });
        main.innerHTML = html;
    }

    // 点击关联术语 chip 打开术语详情
    function openLinkedTerm(termId) {
        if (window.GlossaryModule && typeof window.GlossaryModule.openTermDetail === 'function') {
            window.GlossaryModule.openTermDetail(termId);
        }
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
        // 异步加载术语表后渲染表单
        _renderEntryForm(null).then(formHtml => {
            showModal('添加世界观条目', formHtml, [
                { text: '取消', class: 'btn-secondary', action: () => closeModal() },
                { text: '添加', class: 'btn-primary', action: async () => {
                    const name = document.getElementById('wv-entry-name').value.trim();
                    const description = document.getElementById('wv-entry-desc').value.trim();
                    const details = document.getElementById('wv-entry-details').value.trim();
                    if (!name) { showToast('请输入名称', 'error'); return; }
                    const linked_terms = (window.GlossaryModule && window.GlossaryModule.readTermPickerValues) ? window.GlossaryModule.readTermPickerValues() : [];
                    const id = 'wv_' + Date.now();
                    if (!worldviewData[currentCategory]) worldviewData[currentCategory] = [];
                    worldviewData[currentCategory].push({ id, name, description, details, linked_terms });
                    await apiRequest('/api/mod/worldview/save', 'POST', worldviewData);
                    renderEntries();
                    renderCatList();
                    closeModal();
                    showToast('条目已添加', 'success');
                }}
            ]);
        });
    }

    function showEditEntry(entryId) {
        if (!currentCategory) return;
        const entries = worldviewData[currentCategory] || [];
        const entry = entries.find(e => e.id === entryId);
        if (!entry) return;
        _renderEntryForm(entry).then(formHtml => {
            showModal('编辑条目', formHtml, [
                { text: '取消', class: 'btn-secondary', action: () => closeModal() },
                { text: '保存', class: 'btn-primary', action: async () => {
                    entry.name = document.getElementById('wv-entry-name').value.trim();
                    entry.description = document.getElementById('wv-entry-desc').value.trim();
                    entry.details = document.getElementById('wv-entry-details').value.trim();
                    entry.linked_terms = (window.GlossaryModule && window.GlossaryModule.readTermPickerValues) ? window.GlossaryModule.readTermPickerValues() : [];
                    await apiRequest('/api/mod/worldview/save', 'POST', worldviewData);
                    renderEntries();
                    closeModal();
                    showToast('条目已更新', 'success');
                }}
            ]);
        });
    }

    // 渲染条目表单 HTML（异步：需先加载术语表）
    async function _renderEntryForm(entry) {
        // 确保 glossary 数据已加载
        if (window.GlossaryModule && typeof window.GlossaryModule.loadData === 'function') {
            try { await window.GlossaryModule.loadData(); } catch(_) {}
        }
        const linkedTerms = (entry && entry.linked_terms) || [];
        const termPickerHtml = (window.GlossaryModule && window.GlossaryModule.renderTermPickerHtml)
            ? window.GlossaryModule.renderTermPickerHtml(linkedTerms)
            : '';
        return `
            <div style="display:flex;flex-direction:column;gap:12px;">
                <div><label>名称</label><input type="text" id="wv-entry-name" class="modal-input" placeholder="条目名称" value="${entry ? escapeHtml(entry.name || '') : ''}"></div>
                <div><label>简述</label><input type="text" id="wv-entry-desc" class="modal-input" placeholder="简短描述" value="${entry ? escapeHtml(entry.description || '') : ''}"></div>
                <div><label>详细内容</label><textarea id="wv-entry-details" class="modal-input" rows="6" placeholder="详细描述...">${entry ? escapeHtml(entry.details || '') : ''}</textarea></div>
                <div>
                    <label>关联术语</label>
                    ${termPickerHtml}
                </div>
            </div>
        `;
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
            const cat = categories[catId] || { name: catId, icon: 'folder' };
            const list = Array.isArray(entries) ? entries : Object.values(entries || {});
            if (list.length > 0) {
                allEntries.push({ cat, entries: list });
            }
        }
        if (allEntries.length === 0) return '<p>暂无世界观数据</p>';
        let html = '';
        allEntries.forEach(({ cat, entries }) => {
            const catIcon = (SvgIconLib && SvgIconLib.renderAuto) ? SvgIconLib.renderAuto(cat.icon || 'folder', 13) : (cat.icon || '');
            html += `<p><strong>${catIcon} ${escapeHtml(cat.name)} (${entries.length})</strong></p>`;
            html += '<ul style="margin-left:20px;">';
            entries.forEach(e => {
                const name = (typeof e === 'string') ? e : (e && (e.name || e.id)) || '未命名';
                const desc = (e && typeof e === 'object' && e.description) ? ' - ' + e.description : '';
                html += `<li>${escapeHtml(name)}${escapeHtml(desc)}</li>`;
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
            const cat = cats[catId] || { name: catId, icon: 'folder' };
            text += `--- ${cat.name} ---\n`;
            const list = Array.isArray(entries) ? entries : Object.values(entries || {});
            list.forEach(e => {
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
            const list = Array.isArray(entries) ? entries : Object.values(entries || {});
            list.forEach(e => {
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
        deleteCategory, showAddEntry, showEditEntry, deleteEntry, exportData,
        // 2.2-D 关联术语
        openLinkedTerm
    };

    ModuleRegistry.register({
        id: 'worldview',
        name: '世界观设定',
        icon: 'earth',
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
