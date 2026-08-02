// ============================================================
// 模块: 章节管理 (mod_chapters.js)
// 版本: 3.2.0
// ============================================================
(function() {
    'use strict';
    const style = document.createElement('style');
    style.textContent = `
        .chapters-toolbar { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
        .chapters-stats { display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
        .chapters-stat-card { background: var(--card-bg, #fff); border: 1px solid var(--border-color, #e5e7eb); border-radius: 8px; padding: 12px 16px; min-width: 120px; }
        .chapters-stat-card .stat-value { font-size: 24px; font-weight: 700; color: var(--primary-color, #6366f1); }
        .chapters-stat-card .stat-label { font-size: 12px; color: var(--text-secondary, #6b7280); }
        .chapter-item { background: var(--card-bg, #fff); border: 1px solid var(--border-color, #e5e7eb); border-radius: 8px; padding: 12px 16px; margin-bottom: 8px; display: flex; align-items: center; gap: 12px; }
        .chapter-num { font-size: 14px; font-weight: 700; color: var(--primary-color, #6366f1); min-width: 36px; }
        .chapter-info { flex: 1; }
        .chapter-info h4 { margin: 0 0 4px 0; font-size: 15px; }
        .chapter-info .chapter-meta { font-size: 12px; color: var(--text-secondary, #6b7280); display: flex; gap: 12px; }
        .chapter-progress { width: 80px; }
        .chapter-progress-bar { height: 6px; background: var(--border-color, #e5e7eb); border-radius: 3px; overflow: hidden; }
        .chapter-progress-fill { height: 100%; background: var(--primary-color, #6366f1); border-radius: 3px; transition: width 0.3s; }
        .chapter-progress-text { font-size: 11px; color: var(--text-secondary, #6b7280); text-align: center; margin-top: 2px; }
    `;
    document.head.appendChild(style);

    let chapters = [];
    let wordGoal = 3000;

    async function loadData() {
        try {
            chapters = await apiRequest('/api/mod/chapters') || [];
            const goals = await apiRequest('/api/mod/writing_goals') || {};
            wordGoal = goals.chapter_word_goal || 3000;
        } catch(e) { chapters = []; }
    }

    function renderPage() {
        let html = '<section class="card">';
        html += '<div class="card-header"><h2>📑 章节管理</h2>';
        html += '<div style="display:flex;gap:8px;">';
        html += '<button class="btn-small" onclick="ChaptersModule.exportData()">导出</button>';
        html += '<button class="btn-primary btn-small" onclick="ChaptersModule.showAddChapter()">+ 添加章节</button>';
        html += '</div></div>';
        html += '<div class="chapters-stats" id="chapters-stats"></div>';
        html += '<div id="chapters-list"></div>';
        html += '</section>';
        return html;
    }

    function refreshView() {
        renderStats();
        renderList();
    }

    function renderStats() {
        const el = document.getElementById('chapters-stats');
        if (!el) return;
        const total = chapters.length;
        const totalWords = chapters.reduce((s, c) => s + (c.word_count || 0), 0);
        const completed = chapters.filter(c => c.status === 'completed').length;
        const avgWords = total > 0 ? Math.round(totalWords / total) : 0;
        el.innerHTML = `
            <div class="chapters-stat-card"><div class="stat-value">${total}</div><div class="stat-label">总章节数</div></div>
            <div class="chapters-stat-card"><div class="stat-value">${totalWords.toLocaleString()}</div><div class="stat-label">总字数</div></div>
            <div class="chapters-stat-card"><div class="stat-value">${completed}</div><div class="stat-label">已完成</div></div>
            <div class="chapters-stat-card"><div class="stat-value">${avgWords.toLocaleString()}</div><div class="stat-label">平均字数</div></div>
        `;
    }

    function renderList() {
        const el = document.getElementById('chapters-list');
        if (!el) return;
        if (chapters.length === 0) {
            el.innerHTML = '<p style="text-align:center;color:#9ca3af;padding:20px;">暂无章节</p>';
            return;
        }
        const sorted = [...chapters].sort((a, b) => (a.order || 0) - (b.order || 0));
        let html = '';
        sorted.forEach((ch, idx) => {
            const progress = wordGoal > 0 ? Math.min(100, Math.round((ch.word_count || 0) / wordGoal * 100)) : 0;
            const statusText = ch.status === 'completed' ? '✅' : ch.status === 'draft' ? '📝' : '📋';
            html += `<div class="chapter-item">`;
            html += `<span class="chapter-num">${idx + 1}</span>`;
            html += `<div class="chapter-info"><h4>${statusText} ${escapeHtml(ch.title || '未命名')}${typeof renderIdBadge === 'function' ? renderIdBadge(ch.id) : ''}</h4>`;
            html += `<div class="chapter-meta"><span>${ch.word_count || 0} 字</span>`;
            if (ch.outline) html += `<span>有大纲</span>`;
            html += `</div></div>`;
            html += `<div class="chapter-progress"><div class="chapter-progress-bar"><div class="chapter-progress-fill" style="width:${progress}%"></div></div>`;
            html += `<div class="chapter-progress-text">${progress}%</div></div>`;
            html += `<div style="display:flex;gap:4px;">`;
            html += `<button class="btn-tiny" onclick="ChaptersModule.showEditChapter('${ch.id}')">编辑</button>`;
            html += `<button class="btn-tiny btn-danger" onclick="ChaptersModule.deleteChapter('${ch.id}')">删</button>`;
            html += `</div></div>`;
        });
        el.innerHTML = html;
    }

    function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

    function showAddChapter() {
        showModal('添加章节', `
            <div style="display:flex;flex-direction:column;gap:12px;">
                <div><label>章节标题</label><input type="text" id="ch-title" class="modal-input" placeholder="第X章 ..."></div>
                <div><label>字数</label><input type="number" id="ch-words" class="modal-input" value="0"></div>
                <div><label>大纲</label><textarea id="ch-outline" class="modal-input" rows="3" placeholder="章节大纲..."></textarea></div>
                <div><label>状态</label><select id="ch-status" class="modal-input"><option value="planned">计划中</option><option value="draft">草稿</option><option value="completed">已完成</option></select></div>
                <div><label>备注</label><textarea id="ch-notes" class="modal-input" rows="2" placeholder="备注..."></textarea></div>
            </div>
        `, [
            { text: '取消', class: 'btn-secondary', action: () => closeModal() },
            { text: '添加', class: 'btn-primary', action: async () => {
                const id = 'ch_' + Date.now();
                chapters.push({
                    id, title: document.getElementById('ch-title').value.trim(),
                    word_count: parseInt(document.getElementById('ch-words').value) || 0,
                    outline: document.getElementById('ch-outline').value.trim(),
                    status: document.getElementById('ch-status').value,
                    notes: document.getElementById('ch-notes').value.trim(),
                    order: chapters.length + 1
                });
                await apiRequest('/api/mod/chapters/save', 'POST', chapters);
                refreshView(); closeModal(); showToast('章节已添加', 'success');
            }}
        ]);
    }

    function showEditChapter(chId) {
        const ch = chapters.find(c => c.id === chId);
        if (!ch) return;
        showModal('编辑章节', `
            <div style="display:flex;flex-direction:column;gap:12px;">
                <div><label>章节标题</label><input type="text" id="ch-title" class="modal-input" value="${escapeHtml(ch.title)}"></div>
                <div><label>字数</label><input type="number" id="ch-words" class="modal-input" value="${ch.word_count || 0}"></div>
                <div><label>大纲</label><textarea id="ch-outline" class="modal-input" rows="3">${escapeHtml(ch.outline || '')}</textarea></div>
                <div><label>状态</label><select id="ch-status" class="modal-input">
                    <option value="planned" ${ch.status==='planned'?'selected':''}>计划中</option>
                    <option value="draft" ${ch.status==='draft'?'selected':''}>草稿</option>
                    <option value="completed" ${ch.status==='completed'?'selected':''}>已完成</option>
                </select></div>
                <div><label>备注</label><textarea id="ch-notes" class="modal-input" rows="2">${escapeHtml(ch.notes || '')}</textarea></div>
            </div>
        `, [
            { text: '取消', class: 'btn-secondary', action: () => closeModal() },
            { text: '保存', class: 'btn-primary', action: async () => {
                ch.title = document.getElementById('ch-title').value.trim();
                ch.word_count = parseInt(document.getElementById('ch-words').value) || 0;
                ch.outline = document.getElementById('ch-outline').value.trim();
                ch.status = document.getElementById('ch-status').value;
                ch.notes = document.getElementById('ch-notes').value.trim();
                await apiRequest('/api/mod/chapters/save', 'POST', chapters);
                refreshView(); closeModal(); showToast('章节已更新', 'success');
            }}
        ]);
    }

    async function deleteChapter(chId) {
        if (!confirm('确定删除该章节吗？')) return;
        chapters = chapters.filter(c => c.id !== chId);
        await apiRequest('/api/mod/chapters/save', 'POST', chapters);
        refreshView(); showToast('章节已删除', 'success');
    }

    function previewRenderer() {
        if (!chapters || chapters.length === 0) return '<p>暂无章节数据</p>';
        const total = chapters.length;
        const totalWords = chapters.reduce((s, c) => s + (c.word_count || 0), 0);
        const completed = chapters.filter(c => c.status === 'completed').length;
        return `<p>共 ${total} 章，${totalWords.toLocaleString()} 字，已完成 ${completed} 章</p>`;
    }

    function exportFormatter(data, detailed) {
        const chs = data.chapters || [];
        if (chs.length === 0) return '';
        let text = '=== 章节管理 ===\n\n';
        const sorted = [...chs].sort((a, b) => (a.order || 0) - (b.order || 0));
        sorted.forEach((ch, i) => {
            text += `第${i+1}章 ${ch.title || '未命名'}\n`;
            text += `  字数: ${ch.word_count || 0} | 状态: ${ch.status || '计划中'}\n`;
            if (ch.outline) text += `  大纲: ${ch.outline}\n`;
            if (detailed && ch.notes) text += `  备注: ${ch.notes}\n`;
            text += '\n';
        });
        return text;
    }

    function searchIndexer(data, query) {
        const chs = data.chapters || [];
        const results = [];
        chs.forEach(ch => {
            if ((ch.title || '').toLowerCase().includes(query) || (ch.outline || '').toLowerCase().includes(query)) {
                results.push({ name: `章节: ${ch.title}`, page: 'chapters' });
            }
        });
        return results;
    }

    window.ChaptersModule = { loadData, refreshView, showAddChapter, showEditChapter, deleteChapter, exportData: () => { if (typeof exportModule === 'function') exportModule('chapters'); } };
    ModuleRegistry.register({
        id: 'chapters', name: '章节管理', icon: 'note', group: 'writing', order: 1,
        dataKeys: ['chapters', 'writing_goals'],
        previewRenderer, exportFormatter, searchIndexer,
        pageRenderer: renderPage,
        onPageShow: () => { loadData().then(() => refreshView()); }
    });
    console.log('[Chapters] 章节管理模块已注册');
})();
