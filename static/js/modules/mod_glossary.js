// ============================================================
// 模块: 术语表 (mod_glossary.js)
// 版本: 3.2.0
// 功能: 统一管理小说中的专有名词、地名、人名等
// ============================================================

(function() {
    'use strict';

    // 样式注入
    const style = document.createElement('style');
    style.textContent = `
        .glossary-toolbar { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
        .glossary-search { flex: 1; min-width: 150px; padding: 8px 12px; border: 1px solid var(--border-color, #e5e7eb); border-radius: 6px; font-size: 14px; background: var(--bg-color, #fff); }
        .glossary-alpha { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 16px; }
        .glossary-alpha-btn { padding: 4px 8px; border: 1px solid var(--border-color, #e5e7eb); border-radius: 4px; background: var(--card-bg, #fff); cursor: pointer; font-size: 12px; transition: all 0.15s; }
        .glossary-alpha-btn:hover, .glossary-alpha-btn.active { background: var(--primary-color, #6366f1); color: #fff; border-color: var(--primary-color); }
        .glossary-list { display: grid; gap: 8px; }
        .glossary-item { background: var(--card-bg, #fff); border: 1px solid var(--border-color, #e5e7eb); border-radius: 8px; padding: 12px 16px; }
        .glossary-item h4 { margin: 0 0 4px 0; font-size: 15px; display: flex; align-items: center; gap: 8px; }
        .glossary-item .term-tag { font-size: 11px; padding: 2px 6px; border-radius: 4px; background: var(--bg-color, #f3f4f6); color: var(--text-secondary, #6b7280); }
        .glossary-item .term-def { font-size: 14px; color: var(--text-secondary, #6b7280); line-height: 1.5; }
        .glossary-item .term-actions { display: flex; gap: 6px; margin-top: 8px; }
        .glossary-empty { text-align: center; color: #9ca3af; padding: 40px 0; }
    `;
    document.head.appendChild(style);

    let glossaryData = [];
    let filterAlpha = '';
    let filterSearch = '';

    async function loadData() {
        try {
            glossaryData = await apiRequest('/api/mod/glossary') || [];
        } catch(e) {
            glossaryData = [];
        }
    }

    function renderPage() {
        let html = '<section class="card">';
        html += '<div class="card-header"><h2>📖 术语表</h2>';
        html += '<div style="display:flex;gap:8px;">';
        html += '<button class="btn-small" onclick="GlossaryModule.exportData()">导出</button>';
        html += '<button class="btn-primary btn-small" onclick="GlossaryModule.showAddTerm()">+ 添加术语</button>';
        html += '</div></div>';
        html += '<div class="glossary-toolbar">';
        html += '<input type="text" class="glossary-search" id="glossary-search" placeholder="搜索术语..." oninput="GlossaryModule.filterTerms()">';
        html += '</div>';
        html += '<div class="glossary-alpha" id="glossary-alpha"></div>';
        html += '<div class="glossary-list" id="glossary-list"></div>';
        html += '</section>';
        return html;
    }

    function refreshView() {
        renderAlpha();
        renderList();
    }

    function getFilteredTerms() {
        let terms = [...glossaryData];
        if (filterAlpha) {
            terms = terms.filter(t => {
                const first = (t.name || '').charAt(0).toUpperCase();
                return first === filterAlpha;
            });
        }
        if (filterSearch) {
            const q = filterSearch.toLowerCase();
            terms = terms.filter(t =>
                (t.name || '').toLowerCase().includes(q) ||
                (t.definition || '').toLowerCase().includes(q) ||
                (t.category || '').toLowerCase().includes(q)
            );
        }
        return terms.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'zh'));
    }

    function renderAlpha() {
        const container = document.getElementById('glossary-alpha');
        if (!container) return;
        const letters = new Set();
        glossaryData.forEach(t => {
            const first = (t.name || '').charAt(0).toUpperCase();
            if (/[A-Z]/.test(first)) letters.add(first);
        });
        let html = `<button class="glossary-alpha-btn${!filterAlpha ? ' active' : ''}" onclick="GlossaryModule.setAlpha('')">全部</button>`;
        const sorted = [...letters].sort();
        sorted.forEach(l => {
            html += `<button class="glossary-alpha-btn${filterAlpha === l ? ' active' : ''}" onclick="GlossaryModule.setAlpha('${l}')">${l}</button>`;
        });
        container.innerHTML = html;
    }

    function renderList() {
        const container = document.getElementById('glossary-list');
        if (!container) return;
        const terms = getFilteredTerms();
        if (terms.length === 0) {
            container.innerHTML = '<div class="glossary-empty">暂无术语数据</div>';
            return;
        }
        let html = '';
        terms.forEach(term => {
            html += `<div class="glossary-item">`;
            html += `<h4>${escapeHtml(term.name)}${typeof renderIdBadge === 'function' ? renderIdBadge(term.id) : ''}`;
            if (term.category) html += ` <span class="term-tag">${escapeHtml(term.category)}</span>`;
            html += `</h4>`;
            if (term.definition) html += `<div class="term-def">${escapeHtml(term.definition)}</div>`;
            if (term.aliases && term.aliases.length > 0) {
                html += `<div class="term-def" style="font-size:12px;">别名: ${term.aliases.join(', ')}</div>`;
            }
            html += `<div class="term-actions">`;
            html += `<button class="btn-tiny" onclick="GlossaryModule.showEditTerm('${term.id}')">编辑</button>`;
            html += `<button class="btn-tiny btn-danger" onclick="GlossaryModule.deleteTerm('${term.id}')">删除</button>`;
            html += `</div></div>`;
        });
        container.innerHTML = html;
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    // ==================== CRUD ====================

    function setAlpha(letter) {
        filterAlpha = letter;
        refreshView();
    }

    function filterTerms() {
        const input = document.getElementById('glossary-search');
        filterSearch = input ? input.value.trim() : '';
        renderList();
    }

    function showAddTerm() {
        showModal('添加术语', `
            <div style="display:flex;flex-direction:column;gap:12px;">
                <div><label>术语名称</label><input type="text" id="gl-term-name" class="modal-input" placeholder="专有名词"></div>
                <div><label>分类</label><input type="text" id="gl-term-cat" class="modal-input" placeholder="如：人名、地名、组织"></div>
                <div><label>释义</label><textarea id="gl-term-def" class="modal-input" rows="4" placeholder="术语的详细解释..."></textarea></div>
                <div><label>别名 (逗号分隔)</label><input type="text" id="gl-term-aliases" class="modal-input" placeholder="别名1, 别名2"></div>
            </div>
        `, [
            { text: '取消', class: 'btn-secondary', action: () => closeModal() },
            { text: '添加', class: 'btn-primary', action: async () => {
                const name = document.getElementById('gl-term-name').value.trim();
                const category = document.getElementById('gl-term-cat').value.trim();
                const definition = document.getElementById('gl-term-def').value.trim();
                const aliasesStr = document.getElementById('gl-term-aliases').value.trim();
                if (!name) { showToast('请输入术语名称', 'error'); return; }
                const aliases = aliasesStr ? aliasesStr.split(/[,，]/).map(s => s.trim()).filter(Boolean) : [];
                const id = 'gl_' + Date.now();
                glossaryData.push({ id, name, category, definition, aliases });
                await apiRequest('/api/mod/glossary/save', 'POST', glossaryData);
                refreshView();
                closeModal();
                showToast('术语已添加', 'success');
            }}
        ]);
    }

    function showEditTerm(termId) {
        const term = glossaryData.find(t => t.id === termId);
        if (!term) return;
        showModal('编辑术语', `
            <div style="display:flex;flex-direction:column;gap:12px;">
                <div><label>术语名称</label><input type="text" id="gl-term-name" class="modal-input" value="${escapeHtml(term.name)}"></div>
                <div><label>分类</label><input type="text" id="gl-term-cat" class="modal-input" value="${escapeHtml(term.category || '')}"></div>
                <div><label>释义</label><textarea id="gl-term-def" class="modal-input" rows="4">${escapeHtml(term.definition || '')}</textarea></div>
                <div><label>别名 (逗号分隔)</label><input type="text" id="gl-term-aliases" class="modal-input" value="${escapeHtml((term.aliases || []).join(', '))}"></div>
            </div>
        `, [
            { text: '取消', class: 'btn-secondary', action: () => closeModal() },
            { text: '保存', class: 'btn-primary', action: async () => {
                term.name = document.getElementById('gl-term-name').value.trim();
                term.category = document.getElementById('gl-term-cat').value.trim();
                term.definition = document.getElementById('gl-term-def').value.trim();
                const aliasesStr = document.getElementById('gl-term-aliases').value.trim();
                term.aliases = aliasesStr ? aliasesStr.split(/[,，]/).map(s => s.trim()).filter(Boolean) : [];
                await apiRequest('/api/mod/glossary/save', 'POST', glossaryData);
                refreshView();
                closeModal();
                showToast('术语已更新', 'success');
            }}
        ]);
    }

    async function deleteTerm(termId) {
        if (!confirm('确定删除该术语吗？')) return;
        glossaryData = glossaryData.filter(t => t.id !== termId);
        await apiRequest('/api/mod/glossary/save', 'POST', glossaryData);
        refreshView();
        showToast('术语已删除', 'success');
    }

    // ==================== 预览/导出/搜索 ====================

    function previewRenderer() {
        if (!glossaryData || glossaryData.length === 0) return '<p>暂无术语数据</p>';
        let html = `<p>共 ${glossaryData.length} 个术语</p>`;
        const cats = {};
        glossaryData.forEach(t => {
            const cat = t.category || '未分类';
            if (!cats[cat]) cats[cat] = [];
            cats[cat].push(t);
        });
        for (const [cat, terms] of Object.entries(cats)) {
            html += `<p style="margin-top:8px;"><strong>${cat} (${terms.length})</strong></p>`;
            html += '<ul style="margin-left:20px;">';
            terms.slice(0, 5).forEach(t => {
                html += `<li>${t.name}${t.definition ? ': ' + t.definition.substring(0, 50) : ''}</li>`;
            });
            if (terms.length > 5) html += `<li>... 还有 ${terms.length - 5} 个</li>`;
            html += '</ul>';
        }
        return html;
    }

    function exportFormatter(data, detailed) {
        const terms = data.glossary || [];
        if (terms.length === 0) return '';
        let text = '=== 术语表 ===\n\n';
        const cats = {};
        terms.forEach(t => {
            const cat = t.category || '未分类';
            if (!cats[cat]) cats[cat] = [];
            cats[cat].push(t);
        });
        for (const [cat, catTerms] of Object.entries(cats)) {
            text += `--- ${cat} ---\n`;
            catTerms.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'zh'));
            catTerms.forEach(t => {
                text += `\n【${t.name}】`;
                if (t.aliases && t.aliases.length > 0) text += ` (别名: ${t.aliases.join(', ')})`;
                text += `\n${t.definition || '无释义'}\n`;
            });
            text += '\n';
        }
        return text;
    }

    function searchIndexer(data, query) {
        const terms = data.glossary || [];
        const results = [];
        terms.forEach(t => {
            if ((t.name || '').toLowerCase().includes(query) ||
                (t.definition || '').toLowerCase().includes(query) ||
                (t.category || '').toLowerCase().includes(query)) {
                results.push({ name: `术语: ${t.name}`, page: 'glossary' });
            }
        });
        return results;
    }

    // ==================== 注册 ====================
    window.GlossaryModule = {
        loadData, refreshView, setAlpha, filterTerms,
        showAddTerm, showEditTerm, deleteTerm,
        exportData: () => { if (typeof exportModule === 'function') exportModule('glossary'); }
    };

    ModuleRegistry.register({
        id: 'glossary',
        name: '术语表',
        icon: '📖',
        group: 'world',
        order: 2,
        dataKeys: ['glossary'],
        previewRenderer: previewRenderer,
        exportFormatter: exportFormatter,
        searchIndexer: searchIndexer,
        pageRenderer: renderPage,
        onPageShow: () => { loadData().then(() => refreshView()); }
    });

    console.log('[Glossary] 术语表模块已注册');
})();
