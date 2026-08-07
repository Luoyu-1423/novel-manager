// ============================================================
// 模块: 大纲管理 (mod_outline.js)
// 版本: 1.0.0-dev
// 功能: 按章节集中管理大纲，与「章节管理」双向联动
// 数据: 与章节管理共用 chapters 数组（ch.outline 字段），
//       通过 /api/mod/chapters 读写，保证两模块数据一致
// ============================================================
(function() {
    'use strict';
    const style = document.createElement('style');
    style.textContent = `
        .outline-page { display: flex; flex-direction: column; height: calc(100vh - 168px); min-height: 300px; }
        .outline-page > .card { flex-shrink: 0; }
        .outline-split { display: grid; grid-template-columns: 32% 68%; gap: 12px; flex: 1; min-height: 0; }
        .outline-list-pane { display: flex; flex-direction: column; background: var(--card-bg, #fff); border: 1px solid var(--border-color, #e5e7eb); border-radius: 8px; overflow: hidden; height: 100%; min-height: 0; }
        .outline-list-head { padding: 10px 14px; font-size: 13px; font-weight: 600; color: var(--text-primary, #374151); border-bottom: 1px solid var(--border-color, #e5e7eb); background: var(--bg-color, #f9fafb); flex-shrink: 0; }
        .outline-list { flex: 1; min-height: 0; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 6px; }
        .outline-item { padding: 10px 12px; border: 1px solid var(--border-color, #e5e7eb); border-radius: 8px; cursor: pointer; background: var(--card-bg, #fff); transition: all 0.15s; }
        .outline-item:hover { border-color: var(--primary-color, #6366f1); }
        .outline-item.selected { border-color: var(--primary-color, #6366f1); box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary-color, #6366f1) 25%, transparent); }
        .outline-item-title { font-size: 13px; font-weight: 600; color: var(--text-primary, #1f2937); }
        .outline-item-meta { font-size: 11px; color: var(--text-secondary, #6b7280); margin-top: 2px; }
        .outline-empty { text-align: center; padding: 30px 16px; font-size: 13px; color: var(--text-secondary, #6b7280); }
        .outline-editor-pane { display: flex; flex-direction: column; background: var(--card-bg, #fff); border: 1px solid var(--border-color, #e5e7eb); border-radius: 8px; overflow: hidden; height: 100%; min-height: 0; }
        .outline-ed-empty { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 14px; text-align: center; flex-direction: column; gap: 10px; }
        .outline-ed-main { flex: 1; min-height: 0; display: flex; flex-direction: column; }
        .outline-ed-head { padding: 10px 14px; border-bottom: 1px solid var(--border-color, #e5e7eb); display: flex; align-items: center; gap: 10px; flex-wrap: wrap; background: var(--bg-color, #f9fafb); flex-shrink: 0; }
        .outline-ed-head h3 { margin: 0; font-size: 15px; font-weight: 600; color: var(--text-primary, #374151); flex: 1; min-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .outline-ed-body { flex: 1; min-height: 0; display: flex; }
        .outline-ed-body textarea { flex: 1; width: 100%; box-sizing: border-box; border: none; resize: none; padding: 14px; font-size: 14px; line-height: 1.8; background: transparent; color: var(--text-primary, #374151); outline: none; }
        .outline-ed-foot { padding: 8px 14px; border-top: 1px solid var(--border-color, #e5e7eb); flex-shrink: 0; }
        .outline-status { font-size: 12px; color: var(--text-secondary, #6b7280); }
        .outline-status.dirty { color: #f59e0b; font-weight: 600; }
        @media (max-width: 900px) { .outline-split { grid-template-columns: 1fr; } .outline-editor-pane { display: none !important; } }
    `;
    document.head.appendChild(style);

    let chapters = [];
    let selectedId = null;
    let dirty = false;

    async function loadData() {
        const data = await apiRequest('/api/mod/chapters');
        chapters = Array.isArray(data) ? data : [];
    }

    function renderPage() {
        let html = '<div class="outline-page">';
        html += UIUtils.renderCardPage(
            (SvgIconLib ? SvgIconLib.renderAuto('scroll', 18) : '📋') + ' 大纲管理',
            '<button class="btn-small" onclick="OutlineModule.openChapters()">前往章节管理</button>' +
            '<button class="btn-primary btn-small" onclick="OutlineModule.saveOutline()">保存大纲</button>'
        );
        html += '<div class="outline-split">';
        html += '<div class="outline-list-pane">';
        html += '<div class="outline-list-head">章节</div>';
        html += '<div class="outline-list" id="outline-list"></div>';
        html += '</div>';
        html += '<div class="outline-editor-pane">';
        html += '<div class="outline-ed-empty" id="outline-ed-empty">';
        html += '<div style="font-size:36px;opacity:0.5;">' + (SvgIconLib ? SvgIconLib.render('scroll', 30) : '📋') + '</div>';
        html += '<div style="font-weight:600;margin-bottom:4px;">在左侧选择章节</div>';
        html += '<div style="font-size:12px;">为每个章节编写大纲、要点、剧情节拍</div>';
        html += '</div>';
        html += '<div class="outline-ed-main" id="outline-ed-main" style="display:none;">';
        html += '<div class="outline-ed-head">';
        html += '<h3 id="outline-ed-title"></h3>';
        html += '<button class="btn-tiny" onclick="OutlineModule.gotoEditor()">' + (SvgIconLib ? SvgIconLib.render('edit', 12) : '✏️') + ' 编辑正文</button>';
        html += '</div>';
        html += '<div class="outline-ed-body"><textarea id="outline-ed-textarea" class="modal-input" placeholder="编写本章大纲、要点、剧情节拍（支持空行分段）..." oninput="OutlineModule.markDirty()"></textarea></div>';
        html += '<div class="outline-ed-foot"><span class="outline-status" id="outline-ed-status"></span></div>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
        return html;
    }

    function refreshView() {
        renderList();
        renderEditor();
    }

    function renderList() {
        const box = document.getElementById('outline-list');
        if (!box) return;
        const head = document.querySelector('.outline-list-head');
        if (head) head.textContent = '章节（共 ' + chapters.length + ' 章）';
        if (!chapters.length) {
            box.innerHTML = '<div class="outline-empty">还没有章节，请先到「章节管理」添加章节</div>';
            return;
        }
        const statusMap = { planned: '规划', drafting: '写作中', drafted: '初稿', editing: '修改中', done: '完成' };
        box.innerHTML = chapters.map(ch => {
            const hasOutline = !!(ch.outline && ch.outline.trim());
            const st = statusMap[ch.status] || ch.status || '规划';
            return '<div class="outline-item' + (selectedId === ch.id ? ' selected' : '') + '" data-id="' + ch.id + '" onclick="OutlineModule.select(\'' + ch.id + '\')">' +
                '<div class="outline-item-title">' + UIUtils.escapeHtml(ch.title || '未命名章节') + '</div>' +
                '<div class="outline-item-meta">' + st + ' · ' + (ch.word_count || 0) + ' 字' + (hasOutline ? ' · 已有大纲' : '') + '</div>' +
                '</div>';
        }).join('');
    }

    function renderEditor() {
        const empty = document.getElementById('outline-ed-empty');
        const main = document.getElementById('outline-ed-main');
        if (!empty || !main) return;
        const ch = chapters.find(c => c.id === selectedId);
        if (!ch) {
            empty.style.display = 'flex';
            main.style.display = 'none';
            return;
        }
        empty.style.display = 'none';
        main.style.display = 'flex';
        const title = document.getElementById('outline-ed-title');
        if (title) title.textContent = ch.title || '未命名章节';
        const ta = document.getElementById('outline-ed-textarea');
        if (ta) ta.value = ch.outline || '';
        updateStatus();
    }

    function select(id) {
        selectedId = id;
        dirty = false;
        renderList();
        renderEditor();
    }

    function markDirty() {
        dirty = true;
        updateStatus();
    }

    function updateStatus() {
        const el = document.getElementById('outline-ed-status');
        if (!el) return;
        if (dirty) {
            el.textContent = '有未保存修改，点击右上角「保存大纲」';
            el.classList.add('dirty');
        } else {
            el.textContent = selectedId ? '大纲与章节数据联动保存' : '';
            el.classList.remove('dirty');
        }
    }

    async function saveOutline() {
        const ch = chapters.find(c => c.id === selectedId);
        if (!ch) {
            showToast('请先选择章节', 'error');
            return;
        }
        const ta = document.getElementById('outline-ed-textarea');
        if (!ta) return;
        ch.outline = ta.value;
        await apiRequest('/api/mod/chapters/save', 'POST', chapters);
        // 刷新章节管理模块的内存缓存，保证从「大纲管理」跳转过去看到的是最新数据
        if (window.ChaptersModule && typeof ChaptersModule.loadData === 'function') {
            try { await ChaptersModule.loadData(); } catch(_) {}
        }
        dirty = false;
        updateStatus();
        renderList();
        // 联动：章节审查模块章节列表刷新
        if (window.ChapterReviewModule && typeof window.ChapterReviewModule.refreshChapters === 'function') {
            try { window.ChapterReviewModule.refreshChapters(); } catch(_) {}
        }
        showToast('大纲已保存', 'success');
    }

    // 跳转到章节管理并打开该章全屏编辑器（等待章节数据就绪后打开）
    function gotoEditor() {
        if (!selectedId) return;
        if (window.ModuleRegistry && typeof ModuleRegistry.handleNavClick === 'function') {
            ModuleRegistry.handleNavClick('chapters');
        }
        const tryOpen = (attempt) => {
            if (attempt > 30) return; // 最多等 3 秒
            const hasCh = window.ChaptersModule && typeof ChaptersModule.getChapterById === 'function' && ChaptersModule.getChapterById(selectedId);
            if (hasCh) {
                try { ChaptersModule.openFullscreenById(selectedId); } catch(_) {}
                return;
            }
            setTimeout(() => tryOpen(attempt + 1), 100);
        };
        tryOpen(0);
    }

    function openChapters() {
        if (window.ModuleRegistry && typeof ModuleRegistry.handleNavClick === 'function') ModuleRegistry.handleNavClick('chapters');
        else if (typeof switchPage === 'function') switchPage('chapters');
    }

    function previewRenderer(data) {
        const chs = (data && Array.isArray(data.chapters)) ? data.chapters : (chapters || []);
        const withOutline = chs.filter(c => c.outline && c.outline.trim()).length;
        return '<p>共 ' + chs.length + ' 章，' + withOutline + ' 章已编写大纲</p>';
    }
    function exportFormatter() { return ''; }
    function searchIndexer(data, query) {
        const chs = (data && Array.isArray(data.chapters)) ? data.chapters : [];
        const results = [];
        chs.forEach(ch => {
            const title = ch.title || '未命名';
            const outline = ch.outline || '';
            if (title.toLowerCase().includes(query) || outline.toLowerCase().includes(query)) {
                results.push({ name: '大纲: ' + title, page: 'outline', id: ch.id, content: outline });
            }
        });
        return results;
    }
    // 条目定位：选中该章节大纲并切到大纲管理页（供 ID 管理器/全文搜索跳转）
    function focusItem(itemId) {
        selectedId = itemId;
        dirty = false;
        if (window.ModuleRegistry && typeof ModuleRegistry.handleNavClick === 'function') ModuleRegistry.handleNavClick('outline');
        else if (typeof switchPage === 'function') switchPage('outline');
    }

    window.OutlineModule = { loadData, refreshView, select, markDirty, saveOutline, gotoEditor, openChapters, getChapters: () => chapters };
    ModuleRegistry.register({
        id: 'outline', name: '大纲管理', icon: 'scroll', group: 'writing', order: 2,
        dataKeys: ['chapters'],
        previewRenderer, exportFormatter, searchIndexer, focusItem,
        pageRenderer: renderPage,
        onPageShow: () => { loadData().then(refreshView); }
    });
    console.log('[Outline] 大纲管理模块已注册 (v1.0.0-dev)');
})();
