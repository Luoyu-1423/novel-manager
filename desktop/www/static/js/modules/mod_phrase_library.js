// ============================================================
// 模块: 预设文本库 (mod_phrase_library.js)
// 版本: 3.2.0
// 功能: 管理可复用的描写/对话/动作/场景等文本片段
//       在「章节正文审查」操作框的「插入预设」中被调用
// 字段: {id, content, category, tags[], source_chapter}
// ============================================================

(function() {
    'use strict';

    const style = document.createElement('style');
    style.textContent = `
        .phrase-toolbar { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; align-items: center; }
        .phrase-search { flex: 1; min-width: 160px; padding: 8px 12px; border: 1px solid var(--border-color, #e5e7eb); border-radius: 6px; font-size: 14px; background: var(--bg-color, #fff); }
        .phrase-cats { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
        .phrase-cat-btn { padding: 4px 10px; border: 1px solid var(--border-color, #e5e7eb); border-radius: 4px; background: var(--card-bg, #fff); cursor: pointer; font-size: 12px; transition: all 0.15s; }
        .phrase-cat-btn:hover, .phrase-cat-btn.active { background: var(--primary-color, #6366f1); color: #fff; border-color: var(--primary-color); }
        .phrase-list { display: grid; gap: 8px; }
        .phrase-item { background: var(--card-bg, #fff); border: 1px solid var(--border-color, #e5e7eb); border-radius: 8px; padding: 12px 16px; }
        .phrase-item .phrase-cat-tag { font-size: 11px; padding: 2px 8px; border-radius: 4px; background: var(--primary-color, #6366f1); color: #fff; }
        .phrase-item .phrase-content { font-size: 14px; line-height: 1.6; margin-top: 6px; white-space: pre-wrap; word-break: break-word; }
        .phrase-item .phrase-tags { font-size: 11px; color: var(--text-secondary, #6b7280); margin-top: 6px; }
        .phrase-item .phrase-actions { display: flex; gap: 6px; margin-top: 8px; }
        .phrase-empty { text-align: center; color: #9ca3af; padding: 30px 0; }
    `;
    document.head.appendChild(style);

    let phrases = [];
    let filterCat = '';
    let filterSearch = '';

    const DEFAULT_CATEGORIES = ['描写', '对话', '动作', '场景', '过渡', '其他'];

    async function loadData() {
        try {
            phrases = await apiRequest('/api/mod/phrase_library') || [];
        } catch(e) { phrases = []; }
        refreshView();
    }

    function renderPage() {
        let html = UIUtils.renderCardPage(
            (SvgIconLib ? SvgIconLib.renderAuto('text', 18) : '📚') + ' 预设文本库',
            '<button class="btn-small" onclick="PhraseLibraryModule.exportData()">导出</button>' +
            '<button class="btn-primary btn-small" onclick="PhraseLibraryModule.showAdd()">+ 添加预设</button>'
        );
        html += '<div class="phrase-toolbar">';
        html += '<input type="text" class="phrase-search" id="phrase-search" placeholder="搜索内容或标签..." oninput="PhraseLibraryModule.onSearch()">';
        html += '</div>';
        html += '<div class="phrase-cats" id="phrase-cats"></div>';
        html += '<div class="phrase-list" id="phrase-list"></div>';
        return html;
    }

    function refreshView() { renderCats(); renderList(); }

    function getAllCats() {
        const set = new Set(DEFAULT_CATEGORIES);
        phrases.forEach(p => { if (p.category) set.add(p.category); });
        return [...set];
    }

    function renderCats() {
        const el = document.getElementById('phrase-cats');
        if (!el) return;
        const items = [{ id: '', label: '全部', count: phrases.length }].concat(getAllCats().map(c => {
            const n = phrases.filter(p => (p.category || '其他') === c).length;
            return { id: c, label: c, count: n };
        }));
        el.innerHTML = UIUtils.renderChips(items, filterCat, 'phrase-cat-btn', "PhraseLibraryModule.setCat('{id}')");
    }

    function getFiltered() {
        let arr = [...phrases];
        if (filterCat) arr = arr.filter(p => (p.category || '其他') === filterCat);
        if (filterSearch) {
            const q = filterSearch.toLowerCase();
            arr = arr.filter(p =>
                (p.content || '').toLowerCase().includes(q) ||
                (p.tags || []).some(t => t.toLowerCase().includes(q)) ||
                (p.category || '').toLowerCase().includes(q)
            );
        }
        return arr.sort((a, b) => (b.id || '').localeCompare(a.id || ''));
    }

    function renderList() {
        const el = document.getElementById('phrase-list');
        if (!el) return;
        const list = getFiltered();
        if (list.length === 0) {
            el.innerHTML = '<div class="phrase-empty">暂无预设文本，点击「+ 添加预设」创建</div>';
            return;
        }
        let html = '';
        list.forEach(p => {
            const cat = p.category || '其他';
            html += `<div class="phrase-item">`;
            html += `<span class="phrase-cat-tag">${escapeHtml(cat)}</span>`;
            if (p.source_chapter) html += `<span style="font-size:11px;color:var(--text-secondary,#6b7280);margin-left:8px;">来自: ${escapeHtml(p.source_chapter)}</span>`;
            if (typeof renderIdBadge === 'function') html += renderIdBadge(p.id);
            html += `<div class="phrase-content">${escapeHtml(p.content || '')}</div>`;
            if (p.tags && p.tags.length) {
                html += `<div class="phrase-tags">${p.tags.map(t => '#' + escapeHtml(t)).join(' ')}</div>`;
            }
            html += `<div class="phrase-actions">`;
            html += `<button class="btn-tiny" onclick="PhraseLibraryModule.copyToClipboard('${p.id}')">复制</button>`;
            html += `<button class="btn-tiny" onclick="PhraseLibraryModule.showEdit('${p.id}')">编辑</button>`;
            html += `<button class="btn-tiny btn-danger" onclick="PhraseLibraryModule.remove('${p.id}')">删除</button>`;
            html += `</div></div>`;
        });
        el.innerHTML = html;
    }

    function setCat(c) { filterCat = c; refreshView(); }
    function onSearch() {
        const el = document.getElementById('phrase-search');
        filterSearch = el ? el.value.trim() : '';
        renderList();
    }

    function showAdd() { showEditor(null); }
    function showEdit(id) {
        const p = phrases.find(x => x.id === id);
        if (!p) return;
        showEditor(p);
    }

    function showEditor(p) {
        const isEdit = !!p;
        const cats = getAllCategoriesOptions(p ? p.category : '');
        showModal(isEdit ? '编辑预设' : '添加预设', `
            <div style="display:flex;flex-direction:column;gap:12px;">
                <div><label>内容</label><textarea id="ph-content" class="modal-input" rows="6" placeholder="预设文本内容...">${escapeHtml(p ? p.content : '')}</textarea></div>
                <div><label>分类</label><input type="text" id="ph-category" class="modal-input" list="ph-category-list" value="${escapeHtml(p ? p.category || '' : '')}" placeholder="如：描写、对话、动作、场景">${cats}</div>
                <div><label>标签 (逗号分隔)</label><input type="text" id="ph-tags" class="modal-input" value="${escapeHtml(p ? (p.tags || []).join(', ') : '')}" placeholder="如：黄昏, 战斗, 内心独白"></div>
                <div><label>来源章节 (可选)</label><input type="text" id="ph-source" class="modal-input" value="${escapeHtml(p ? p.source_chapter || '' : '')}" placeholder="如：第3章"></div>
            </div>
        `, [
            { text: '取消', class: 'btn-secondary', action: () => closeModal() },
            { text: isEdit ? '保存' : '添加', class: 'btn-primary', action: async () => {
                const content = document.getElementById('ph-content').value.trim();
                if (!content) { showToast('请输入内容', 'error'); return; }
                const category = document.getElementById('ph-category').value.trim() || '其他';
                const tagsStr = document.getElementById('ph-tags').value.trim();
                const tags = tagsStr ? tagsStr.split(/[,，]/).map(s => s.trim()).filter(Boolean) : [];
                const source = document.getElementById('ph-source').value.trim();
                if (isEdit) {
                    p.content = content; p.category = category; p.tags = tags; p.source_chapter = source;
                } else {
                    phrases.push({ id: 'ph_' + Date.now(), content, category, tags, source_chapter: source });
                }
                await apiRequest('/api/mod/phrase_library/save', 'POST', phrases);
                refreshView(); closeModal();
                showToast(isEdit ? '预设已更新' : '预设已添加', 'success');
            }}
        ]);
    }

    function getAllCategoriesOptions(current) {
        const cats = getAllCats();
        if (current && !cats.includes(current)) cats.push(current);
        let html = '<datalist id="ph-category-list">';
        cats.forEach(c => { html += `<option value="${escapeHtml(c)}">`; });
        html += '</datalist>';
        return html;
    }

    async function remove(id) {
        if (!(await UIUtils.confirmDialog('确定删除该预设吗？'))) return;
        phrases = phrases.filter(p => p.id !== id);
        await apiRequest('/api/mod/phrase_library/save', 'POST', phrases);
        refreshView();
        showToast('已删除', 'success');
    }

    function copyToClipboard(id) {
        const p = phrases.find(x => x.id === id);
        if (!p) return;
        UIUtils.copyText(p.content || '', '已复制到剪贴板');
    }

    // 预览/导出/搜索
    function previewRenderer() {
        if (!phrases || phrases.length === 0) return '<p>暂无预设文本</p>';
        return `<p>共 ${phrases.length} 条预设文本</p>`;
    }
    function exportFormatter(data) {
        const arr = data.phrase_library || [];
        if (arr.length === 0) return '';
        let text = '=== 预设文本库 ===\n\n';
        const cats = {};
        arr.forEach(p => {
            const c = p.category || '其他';
            if (!cats[c]) cats[c] = [];
            cats[c].push(p);
        });
        for (const [c, items] of Object.entries(cats)) {
            text += `--- ${c} ---\n`;
            items.forEach((p, i) => {
                text += `\n[${i+1}] ${p.content}\n`;
                if (p.tags && p.tags.length) text += `  标签: ${p.tags.join(', ')}\n`;
                if (p.source_chapter) text += `  来源: ${p.source_chapter}\n`;
            });
            text += '\n';
        }
        return text;
    }
    function searchIndexer(data, query) {
        const arr = data.phrase_library || [];
        const results = [];
        arr.forEach(p => {
            if ((p.content || '').toLowerCase().includes(query) ||
                (p.category || '').toLowerCase().includes(query) ||
                (p.tags || []).some(t => t.toLowerCase().includes(query))) {
                results.push({ name: `预设: ${(p.content || '').slice(0, 20)}...`, page: 'phrase_library', id: p.id, content: p.content || '' });
            }
        });
        return results;
    }

    window.PhraseLibraryModule = {
        loadData, refreshView, setCat, onSearch,
        showAdd, showEdit, remove, copyToClipboard,
        exportData: () => { if (typeof exportModule === 'function') exportModule('phrase_library'); }
    };

    ModuleRegistry.register({
        id: 'phrase_library',
        name: '预设文本库',
        icon: 'book',
        group: 'writing',
        order: 4,
        dataKeys: ['phrase_library'],
        previewRenderer,
        exportFormatter,
        searchIndexer,
        pageRenderer: renderPage,
        onPageShow: () => { loadData(); }
    });

    console.log('[PhraseLibrary] 预设文本库模块已注册');
})();
