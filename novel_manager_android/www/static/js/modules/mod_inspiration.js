// ============================================================
// 模块: 灵感收集本 (mod_inspiration.js)
// 版本: 3.2.0
// ============================================================
(function() {
    'use strict';
    const style = document.createElement('style');
    style.textContent = `
        .insp-toolbar { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
        .insp-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
        .insp-tag { padding: 4px 10px; border-radius: 12px; font-size: 12px; cursor: pointer; border: 1px solid var(--border-color, #e5e7eb); background: var(--card-bg, #fff); transition: all 0.15s; }
        .insp-tag:hover, .insp-tag.active { background: var(--primary-color, #6366f1); color: #fff; border-color: var(--primary-color); }
        .insp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px; }
        .insp-card { background: var(--card-bg, #fff); border: 1px solid var(--border-color, #e5e7eb); border-radius: 10px; padding: 14px; position: relative; }
        .insp-card-content { font-size: 14px; line-height: 1.6; color: var(--text-primary, #374151); white-space: pre-wrap; margin-bottom: 8px; }
        .insp-card-footer { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--text-secondary, #9ca3af); }
        .insp-card-tags { display: flex; gap: 4px; flex-wrap: wrap; }
        .insp-card-tag { padding: 2px 6px; border-radius: 8px; background: var(--bg-color, #f3f4f6); font-size: 11px; }
        .insp-card-actions { display: flex; gap: 4px; }
        .insp-random { background: linear-gradient(135deg, var(--primary-color, #6366f1), var(--secondary-color, #8b5cf6)); color: #fff; border-radius: 10px; padding: 20px; margin-bottom: 16px; text-align: center; font-size: 16px; line-height: 1.6; display: none; }
    `;
    document.head.appendChild(style);

    let inspirations = [];
    let tags = [];
    let filterTag = '';

    async function loadData() {
        try {
            inspirations = await apiRequest('/api/mod/inspiration') || [];
            tags = await apiRequest('/api/mod/inspiration_tags') || [];
        } catch(e) { inspirations = []; tags = []; }
    }

    function renderPage() {
        let html = '<section class="card">';
        html += '<div class="card-header"><h2>💡 灵感收集本</h2>';
        html += '<div style="display:flex;gap:8px;">';
        html += '<button class="btn-secondary btn-small" onclick="InspirationModule.showRandom()">🎲 随机</button>';
        html += '<button class="btn-small" onclick="InspirationModule.exportData()">导出</button>';
        html += '<button class="btn-primary btn-small" onclick="InspirationModule.showAdd()">+ 记录灵感</button>';
        html += '</div></div>';
        html += '<div class="insp-random" id="insp-random"></div>';
        html += '<div class="insp-tags" id="insp-tags"></div>';
        html += '<div class="insp-grid" id="insp-grid"></div>';
        html += '</section>';
        return html;
    }

    function refreshView() { renderTags(); renderGrid(); }

    function renderTags() {
        const el = document.getElementById('insp-tags');
        if (!el) return;
        let html = `<span class="insp-tag${!filterTag ? ' active' : ''}" onclick="InspirationModule.setFilter('')">全部</span>`;
        tags.forEach(t => {
            html += `<span class="insp-tag${filterTag === t ? ' active' : ''}" onclick="InspirationModule.setFilter('${t}')">${t}</span>`;
        });
        el.innerHTML = html;
    }

    function renderGrid() {
        const el = document.getElementById('insp-grid');
        if (!el) return;
        let items = [...inspirations].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
        if (filterTag) items = items.filter(i => (i.tags || []).includes(filterTag));
        if (items.length === 0) { el.innerHTML = '<p style="color:#9ca3af;text-align:center;padding:20px;grid-column:1/-1;">暂无灵感，点击上方按钮记录</p>'; return; }
        let html = '';
        items.forEach(item => {
            html += `<div class="insp-card">`;
            html += `<div class="insp-card-content">${escapeHtml(item.content || '')}${typeof renderIdBadge === 'function' ? renderIdBadge(item.id) : ''}</div>`;
            html += `<div class="insp-card-footer">`;
            html += `<div class="insp-card-tags">`;
            (item.tags || []).forEach(t => { html += `<span class="insp-card-tag">${escapeHtml(t)}</span>`; });
            html += `</div>`;
            html += `<div class="insp-card-actions">`;
            html += `<button class="btn-tiny" onclick="InspirationModule.showEdit('${item.id}')">编辑</button>`;
            html += `<button class="btn-tiny btn-danger" onclick="InspirationModule.delete('${item.id}')">删</button>`;
            html += `</div></div>`;
            if (item.created_at) html += `<div style="font-size:11px;color:#9ca3af;margin-top:4px;">${item.created_at.slice(0, 10)}</div>`;
            html += `</div>`;
        });
        el.innerHTML = html;
    }

    function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
    function setFilter(tag) { filterTag = tag; refreshView(); }

    function showAdd() {
        let tagChecks = '';
        tags.forEach(t => { tagChecks += `<label style="display:flex;align-items:center;gap:6px;"><input type="checkbox" value="${escapeHtml(t)}" class="insp-tag-check"> ${escapeHtml(t)}</label>`; });
        showModal('记录灵感', `
            <div style="display:flex;flex-direction:column;gap:12px;">
                <div><label>灵感内容</label><textarea id="insp-content" class="modal-input" rows="4" placeholder="写下你的灵感..."></textarea></div>
                <div><label>标签</label><div style="display:flex;flex-wrap:wrap;gap:8px;">${tagChecks || '<span style="color:#9ca3af;">暂无标签，先在工具页添加</span>'}</div></div>
                <div><label>新标签 (可选)</label><input type="text" id="insp-new-tag" class="modal-input" placeholder="输入新标签名"></div>
            </div>
        `, [
            { text: '取消', class: 'btn-secondary', action: () => closeModal() },
            { text: '保存', class: 'btn-primary', action: async () => {
                const content = document.getElementById('insp-content').value.trim();
                if (!content) { showToast('请输入内容', 'error'); return; }
                const checkedTags = [...document.querySelectorAll('.insp-tag-check:checked')].map(c => c.value);
                const newTag = document.getElementById('insp-new-tag').value.trim();
                if (newTag && !tags.includes(newTag)) { tags.push(newTag); await apiRequest('/api/mod/inspiration_tags/save', 'POST', tags); }
                if (newTag) checkedTags.push(newTag);
                const id = 'insp_' + Date.now();
                inspirations.push({ id, content, tags: checkedTags, created_at: new Date().toISOString() });
                await apiRequest('/api/mod/inspiration/save', 'POST', inspirations);
                refreshView(); closeModal(); showToast('灵感已记录', 'success');
            }}
        ]);
    }

    function showEdit(id) {
        const item = inspirations.find(i => i.id === id);
        if (!item) return;
        let tagChecks = '';
        tags.forEach(t => {
            const checked = (item.tags || []).includes(t) ? 'checked' : '';
            tagChecks += `<label style="display:flex;align-items:center;gap:6px;"><input type="checkbox" value="${escapeHtml(t)}" class="insp-tag-check" ${checked}> ${escapeHtml(t)}</label>`;
        });
        showModal('编辑灵感', `
            <div style="display:flex;flex-direction:column;gap:12px;">
                <div><label>灵感内容</label><textarea id="insp-content" class="modal-input" rows="4">${escapeHtml(item.content)}</textarea></div>
                <div><label>标签</label><div style="display:flex;flex-wrap:wrap;gap:8px;">${tagChecks}</div></div>
            </div>
        `, [
            { text: '取消', class: 'btn-secondary', action: () => closeModal() },
            { text: '保存', class: 'btn-primary', action: async () => {
                item.content = document.getElementById('insp-content').value.trim();
                item.tags = [...document.querySelectorAll('.insp-tag-check:checked')].map(c => c.value);
                await apiRequest('/api/mod/inspiration/save', 'POST', inspirations);
                refreshView(); closeModal(); showToast('灵感已更新', 'success');
            }}
        ]);
    }

    async function deleteItem(id) {
        if (!confirm('确定删除该灵感吗？')) return;
        inspirations = inspirations.filter(i => i.id !== id);
        await apiRequest('/api/mod/inspiration/save', 'POST', inspirations);
        refreshView(); showToast('已删除', 'success');
    }

    function showRandom() {
        const el = document.getElementById('insp-random');
        if (!el || inspirations.length === 0) { if (el) el.innerHTML = '暂无灵感'; if (el) el.style.display = 'block'; return; }
        const item = inspirations[Math.floor(Math.random() * inspirations.length)];
        el.innerHTML = `💡 ${escapeHtml(item.content)}`;
        el.style.display = 'block';
        setTimeout(() => { el.style.display = 'none'; }, 8000);
    }

    function previewRenderer() {
        if (!inspirations || inspirations.length === 0) return '<p>暂无灵感</p>';
        return `<p>共 ${inspirations.length} 条灵感，${tags.length} 个标签</p>`;
    }

    function exportFormatter(data, detailed) {
        const insps = data.inspiration || [];
        if (insps.length === 0) return '';
        let text = '=== 灵感收集本 ===\n\n';
        insps.forEach(i => {
            text += `💡 ${i.content}`;
            if (i.tags && i.tags.length > 0) text += ` [${i.tags.join(', ')}]`;
            text += `\n  - ${i.created_at ? i.created_at.slice(0, 10) : '未知日期'}\n\n`;
        });
        return text;
    }

    function searchIndexer(data, query) {
        const insps = data.inspiration || [];
        const results = [];
        insps.forEach(i => {
            if ((i.content || '').toLowerCase().includes(query)) {
                results.push({ name: `灵感: ${(i.content || '').substring(0, 30)}`, page: 'inspiration' });
            }
        });
        return results;
    }

    window.InspirationModule = { loadData, refreshView, setFilter, showAdd, showEdit, delete: deleteItem, showRandom, exportData: () => { if (typeof exportModule === 'function') exportModule('inspiration'); } };
    ModuleRegistry.register({
        id: 'inspiration', name: '灵感收集', icon: 'lightbulb', group: 'writing', order: 3,
        dataKeys: ['inspiration', 'inspiration_tags'],
        previewRenderer, exportFormatter, searchIndexer,
        pageRenderer: renderPage,
        onPageShow: () => { loadData().then(() => refreshView()); }
    });
    console.log('[Inspiration] 灵感收集模块已注册');
})();
