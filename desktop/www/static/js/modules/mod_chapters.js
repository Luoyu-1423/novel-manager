// ============================================================
// 模块: 章节管理 (mod_chapters.js)
// 版本: 3.2.0 (升级版 - 排序/拖拽/分tab编辑器/字数实时统计)
// ============================================================
(function() {
    'use strict';

    // ==================== 样式 ====================
    const style = document.createElement('style');
    style.textContent = `
        .chapters-stats { display: flex; gap: 16px; margin: 12px 0; flex-wrap: wrap; flex-shrink: 0; }
        .chapters-stat-card { background: var(--card-bg, #fff); border: 1px solid var(--border-color, #e5e7eb); border-radius: 8px; padding: 12px 16px; min-width: 120px; }
        .chapters-stat-card .stat-value { font-size: 24px; font-weight: 700; color: var(--primary-color, #6366f1); }
        .chapters-stat-card .stat-label { font-size: 12px; color: var(--text-secondary, #6b7280); }
        .chapter-item { background: var(--card-bg, #fff); border: 1px solid var(--border-color, #e5e7eb); border-radius: 8px; padding: 10px 12px; margin: 0 16px 8px 16px; display: grid; grid-template-columns: auto auto 1fr auto; grid-template-rows: auto auto; gap: 4px 10px; align-items: center; transition: border-color 0.15s, box-shadow 0.15s, opacity 0.15s; }
        .chapter-item.dragging { opacity: 0.4; }
        .chapter-item.drag-over { border-color: var(--primary-color, #6366f1); border-style: dashed; box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary-color, #6366f1) 25%, transparent); }
        .chapter-drag-handle { cursor: grab; color: var(--text-secondary, #9ca3af); font-size: 16px; user-select: none; padding: 2px 4px; grid-row: 1 / 3; opacity: 0; transition: opacity 0.15s; }
        .chapter-item:hover .chapter-drag-handle { opacity: 1; }
        .chapter-drag-handle:active { cursor: grabbing; }
        .chapter-num { font-size: 13px; font-weight: 700; color: var(--primary-color, #6366f1); min-width: 24px; text-align: center; }
        .chapter-status-toggle { cursor: pointer; font-size: 16px; user-select: none; padding: 2px 4px; border-radius: 6px; transition: background 0.15s; }
        .chapter-status-toggle:hover { background: var(--border-color, #e5e7eb); }
        .chapter-info { min-width: 0; }
        .chapter-info h4 { margin: 0; font-size: 14px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: flex; align-items: center; gap: 6px; }
        .chapter-info .chapter-meta { font-size: 11px; color: var(--text-secondary, #6b7280); display: flex; gap: 4px; flex-wrap: wrap; margin-top: 2px; }
        .chapter-meta .meta-badge { display: inline-flex; align-items: center; padding: 1px 6px; border-radius: 10px; background: var(--bg-color, #f3f4f6); color: var(--text-secondary, #6b7280); font-size: 10px; line-height: 1.4; }
        .chapter-meta .meta-badge.has-outline { background: #dbeafe; color: #1e40af; }
        .chapter-meta .meta-badge.has-content { background: #d1fae5; color: #065f46; }
        .chapter-meta .meta-badge.has-review { background: #fee2e2; color: #991b1b; }
        .chapter-meta .meta-badge.word-count { background: #ede9fe; color: #5b21b6; }
        .chapter-actions { display: flex; gap: 2px; flex-shrink: 0; grid-row: 1; grid-column: 4; }
        .chapter-actions .btn-tiny { font-size: 13px; line-height: 1; padding: 3px 6px; opacity: 0.5; transition: opacity 0.15s; }
        .chapter-item:hover .chapter-actions .btn-tiny { opacity: 1; }
        .chapter-progress { grid-column: 2 / 5; display: flex; align-items: center; gap: 8px; }
        .chapter-progress-bar { height: 4px; background: var(--border-color, #e5e7eb); border-radius: 2px; overflow: hidden; flex: 1; }
        .chapter-progress-fill { height: 100%; background: var(--primary-color, #6366f1); border-radius: 2px; transition: width 0.3s; }
        .chapter-progress-text { font-size: 11px; color: var(--text-secondary, #6b7280); min-width: 32px; text-align: right; }

        /* 分 tab 全屏编辑器 */
        .chapter-editor-overlay { position: fixed; inset: 0; z-index: 1100; background: var(--bg-color, #f9fafb); display: flex; flex-direction: column; }
        .chapter-editor-header { padding: 10px 20px; background: var(--card-bg, #fff); border-bottom: 1px solid var(--border-color, #e5e7eb); display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
        .chapter-editor-header h3 { margin: 0; font-size: 16px; font-weight: 600; flex: 1; min-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .chapter-editor-tabs { display: flex; gap: 4px; }
        .chapter-tab { padding: 6px 14px; border: 1px solid var(--border-color, #e5e7eb); background: transparent; cursor: pointer; border-radius: 6px; font-size: 13px; color: var(--text-primary, #374151); transition: all 0.15s; }
        .chapter-tab:hover { background: var(--border-color, #e5e7eb); }
        .chapter-tab.active { background: var(--primary-color, #6366f1); color: #fff; border-color: var(--primary-color, #6366f1); }
        .chapter-editor-body { flex: 1; overflow: hidden; padding: 20px; }
        .chapter-tab-panel { display: none; height: 100%; flex-direction: column; gap: 12px; }
        .chapter-tab-panel.active { display: flex; }
        .chapter-tab-panel label { font-size: 13px; font-weight: 600; color: var(--text-primary, #374151); display: flex; justify-content: space-between; align-items: center; gap: 8px; }
        .chapter-editor-body .modal-input { width: 100%; box-sizing: border-box; }
        .chapter-outline-textarea { flex: 1; min-height: 300px; resize: vertical; font-family: inherit; font-size: 14px; line-height: 1.7; }
        .chapter-content-textarea { flex: 1; min-height: 400px; resize: vertical; font-family: inherit; font-size: 15px; line-height: 1.8; }
        .chapter-word-count-live { font-size: 12px; font-weight: 400; color: var(--text-secondary, #6b7280); }
        .chapter-preview { flex: 1; overflow: auto; background: var(--card-bg, #fff); border: 1px solid var(--border-color, #e5e7eb); border-radius: 8px; padding: 24px 32px; line-height: 1.9; font-size: 15px; white-space: pre-wrap; word-break: break-word; }
        .chapter-preview p { margin: 0 0 1em 0; }
        .chapter-editor-footer { padding: 12px 20px; background: var(--card-bg, #fff); border-top: 1px solid var(--border-color, #e5e7eb); display: flex; gap: 8px; justify-content: flex-end; align-items: center; }
        .chapter-editor-footer .editor-status-tip { font-size: 12px; color: var(--text-secondary, #6b7280); margin-right: auto; }

        /* 4.2-C 分屏布局（章节列表 | 正文编辑器）整页固定视口高度不滚动 */
        .chapters-page { display: flex; flex-direction: column; height: calc(100vh - 168px); min-height: 300px; }
        .chapters-page > .card { flex-shrink: 0; }
        .chapters-split-layout { display: grid; grid-template-columns: 38% 62%; gap: 12px; padding: 0; flex: 1; min-height: 0; }
        @media (max-width: 900px) {
            .chapters-split-layout { grid-template-columns: 1fr; }
            .chapters-editor-pane { display: none !important; }
            .chapters-editor-pane.mobile-active { display: flex !important; }
            .chapters-list-pane.mobile-hidden { display: none !important; }
        }
        .chapters-list-pane { display: flex; flex-direction: column; height: 100%; min-height: 0; overflow: hidden; padding-right: 4px; }
        .chapters-list-pane #chapters-list { flex: 1; min-height: 0; overflow-y: auto; }
        .chapters-list-pane .chapter-item { margin: 0 0 8px 0; }
        .chapters-hint { padding: 10px 4px 0 4px; font-size: 12px; color: var(--text-secondary, #6b7280); flex-shrink: 0; }
        .chapters-editor-pane { display: flex; flex-direction: column; background: var(--card-bg, #fff); border: 1px solid var(--border-color, #e5e7eb); border-radius: 8px; overflow: hidden; height: 100%; min-height: 0; }
        /* 关键：ce-content 作为中间 flex 容器，把 pane 的确定高度传导到 ce-body → ce-panel → 分屏 grid，防止内容撑高 */
        .chapters-editor-pane #ce-content { flex: 1; min-height: 0; height: 100%; display: flex; flex-direction: column; overflow: hidden; }
        .chapters-editor-pane .ce-header { padding: 10px 14px; border-bottom: 1px solid var(--border-color, #e5e7eb); display: flex; align-items: center; gap: 10px; flex-wrap: wrap; background: var(--bg-color, #f9fafb); }
        .chapters-editor-pane .ce-header h3 { margin: 0; font-size: 15px; font-weight: 600; flex: 1; min-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .chapters-editor-pane .ce-tabs { display: flex; gap: 4px; flex-wrap: wrap; }
        .chapters-editor-pane .ce-tab { padding: 4px 10px; border: 1px solid var(--border-color, #e5e7eb); background: transparent; cursor: pointer; border-radius: 4px; font-size: 12px; color: var(--text-primary, #374151); transition: all 0.15s; }
        .chapters-editor-pane .ce-tab:hover { background: var(--border-color, #e5e7eb); }
        .chapters-editor-pane .ce-tab.active { background: var(--primary-color, #6366f1); color: #fff; border-color: var(--primary-color, #6366f1); }
        .chapters-editor-pane .ce-body { flex: 1; overflow: auto; padding: 14px; min-height: 0; }
        .chapters-editor-pane .ce-panel { display: none; flex-direction: column; gap: 10px; }
        .chapters-editor-pane .ce-panel.active { display: flex; }
        .chapters-editor-pane .ce-panel label { font-size: 13px; font-weight: 600; color: var(--text-primary, #374151); display: flex; justify-content: space-between; align-items: center; gap: 8px; }
        .chapters-editor-pane .ce-panel .modal-input { width: 100%; box-sizing: border-box; }
        .chapters-editor-pane .ce-panel .ce-textarea-large { min-height: 250px; resize: vertical; font-family: inherit; font-size: 14px; line-height: 1.7; }
        .chapters-editor-pane .ce-panel .ce-content-textarea { min-height: 350px; resize: vertical; font-family: inherit; font-size: 15px; line-height: 1.8; }
        .chapters-editor-pane .ce-footer { padding: 10px 14px; border-top: 1px solid var(--border-color, #e5e7eb); display: flex; gap: 8px; justify-content: flex-end; align-items: center; background: var(--bg-color, #f9fafb); flex-wrap: wrap; }
        .chapters-editor-pane .ce-footer .editor-status-tip { font-size: 12px; color: var(--text-secondary, #6b7280); margin-right: auto; }
        .chapters-editor-pane .ce-footer .editor-status-tip.dirty { color: #f59e0b; font-weight: 600; }
        .chapters-editor-pane .ce-empty { display: flex; align-items: center; justify-content: center; height: 100%; color: #9ca3af; font-size: 14px; text-align: center; padding: 40px 20px; flex-direction: column; gap: 10px; flex: 1; }
        .chapters-editor-back-btn { display: none; }
        @media (max-width: 900px) { .chapters-editor-back-btn { display: inline-block; } }
        .chapter-item.selected { border-color: var(--primary-color, #6366f1); box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary-color, #6366f1) 25%, transparent); }
        .chapter-item.clickable { cursor: pointer; }
        .ce-review-entry { text-align: center; padding: 20px; }
        .ce-review-entry p { color: var(--text-secondary, #6b7280); margin-bottom: 12px; line-height: 1.7; }

        /* 2.2-A 术语提取结果列表 */
        .term-extract-list { max-height: 50vh; overflow-y: auto; border: 1px solid var(--border-color, #e5e7eb); border-radius: 6px; }
        .term-extract-item { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-bottom: 1px solid var(--border-color, #e5e7eb); font-size: 13px; }
        .term-extract-item:last-child { border-bottom: none; }
        .term-extract-item:hover { background: var(--bg-color, #f3f4f6); }
        .term-extract-item .te-term { font-weight: 600; color: var(--text-primary, #374151); min-width: 80px; }
        .term-extract-item .te-meta { color: var(--text-secondary, #6b7280); font-size: 11px; flex: 1; }
        .term-extract-item .te-cat { padding: 2px 6px; border: 1px solid var(--border-color, #e5e7eb); border-radius: 4px; font-size: 11px; background: var(--bg-color, #fff); color: var(--text-secondary, #6b7280); }
        .term-extract-toolbar { display: flex; gap: 6px; align-items: center; margin-bottom: 8px; flex-wrap: wrap; font-size: 12px; color: var(--text-secondary, #6b7280); }
        .term-extract-toolbar .btn-tiny { padding: 2px 8px; }

        /* 5.1-B 正文分屏（编辑 + 实时预览） */
        .ce-panel, .chapter-tab-panel { height: 100%; }
        .ce-split-body, .ed-split-body { flex: 1; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: minmax(0, 1fr); gap: 10px; min-height: 0; }
        .ce-split-body.single, .ed-split-body.single { grid-template-columns: 1fr; }
        .ce-split-body.single .ce-live-preview, .ed-split-body.single .ed-live-preview { display: none; }
        .ce-live-preview, .ed-live-preview { overflow-y: auto; background: var(--bg-color, #f9fafb); border: 1px solid var(--border-color, #e5e7eb); border-radius: 8px; padding: 16px 20px; line-height: 1.9; font-size: 15px; white-space: pre-wrap; word-break: break-word; height: 100%; min-height: 0; }
        /* 高优先级：正文 textarea 高度受 grid 行约束（minmax(0,1fr) 为确定行高），内容超长时内部滚动而非撑高 */
        .ce-panel .ce-split-body textarea, .chapter-tab-panel .ed-split-body textarea { height: 100%; min-height: 0; resize: vertical; }
        .ce-split-body.single textarea, .ed-split-body.single textarea { height: 100%; min-height: 350px; }
        .ce-live-preview p, .ed-live-preview p { margin: 0 0 1em 0; }
        @media (max-width: 768px) {
            .ce-split-body, .ed-split-body { grid-template-columns: 1fr; }
            .ce-split-body .ce-live-preview, .ed-split-body .ed-live-preview { display: none; }
        }
    `;
    document.head.appendChild(style);

    // ==================== 状态 ====================
    let chapters = [];
    let wordGoal = 3000;
    let sortDirection = 'asc';        // 'asc' | 'desc'
    let dragChapterId = null;
    let editingChapter = null;        // null=新增, 对象=编辑
    let currentTab = 'basic';         // 'basic' | 'outline' | 'content' | 'review'
    // 4.2-C 内联编辑器状态
    let isInlineDirty = false;        // 内联编辑器有未保存修改
    let inlineActive = false;         // 内联编辑器是否激活（用于 closeEditor 判断是否需要刷新）
    // 5.1-B 分屏编辑状态
    let inlineSplitMode = true;       // 内联正文分屏（编辑+预览）
    let fullSplitMode = true;         // 全屏正文分屏
    let inlineKeyBound = false;       // 内联 Ctrl+S 监听是否已绑定

    // ==================== 数据加载 ====================
    async function loadData() {
        try {
            chapters = await apiRequest('/api/mod/chapters') || [];
            const goals = await apiRequest('/api/mod/writing_goals') || {};
            wordGoal = goals.chapter_word_goal || 3000;
        } catch(e) { chapters = []; }
    }

    // ==================== 辅助函数 ====================

    // 5.1-A 自动同步：保存章节时把字数增量累加到写作仪表盘的今日记录
    function todayStr() {
        return new Date().toISOString().slice(0, 10);
    }
    async function _autoLogTodayWords(diff) {
        if (!diff) return;
        try {
            let stats = await apiRequest('/api/mod/writing_stats') || {};
            if (!stats.logs) stats.logs = [];
            const today = todayStr();
            const log = stats.logs.find(l => l.date === today);
            if (log) log.words = (log.words || 0) + diff;
            else stats.logs.push({ date: today, words: diff });
            await apiRequest('/api/mod/writing_stats/save', 'POST', stats);
        } catch(e) { /* 静默失败，不影响章节保存 */ }
    }

    // 5.1-B 实时预览渲染（正文 → 与编辑框完全一致的原文预览）
    // 编辑框(textarea)为 pre-wrap 自然换行；预览容器同样 white-space:pre-wrap，
    // 直接输出转义后的原文即可逐字镜像左侧（不拆 <p>/<br>，避免行距与间距不一致）
    function renderLivePreview(contentEl, previewEl) {
        if (!contentEl || !previewEl) return;
        const content = contentEl.value;
        if (!content || !content.trim()) {
            previewEl.innerHTML = '<span style="color:#9ca3af;">（暂无正文，开始输入后实时预览）</span>';
            return;
        }
        previewEl.innerHTML = escapeHtml(content);
    }
    function updateInlinePreview() {
        renderLivePreview(document.getElementById('inline-ed-content'), document.getElementById('inline-ed-preview'));
    }
    function updateFullPreview() {
        renderLivePreview(document.getElementById('ed-content'), document.getElementById('ed-live-preview'));
    }
    function splitToggleHtml(mode) {
        const icon = mode ? (SvgIconLib ? SvgIconLib.render('maximize', 12) : '⛶') : (SvgIconLib ? SvgIconLib.render('list', 12) : '☰');
        return icon + (mode ? ' 分屏' : ' 单栏');
    }
    function toggleInlineSplit() {
        inlineSplitMode = !inlineSplitMode;
        const body = document.getElementById('inline-split-body');
        const btn = document.getElementById('inline-split-toggle');
        if (body) body.classList.toggle('single', !inlineSplitMode);
        if (btn) btn.innerHTML = splitToggleHtml(inlineSplitMode);
    }
    function toggleFullSplit() {
        fullSplitMode = !fullSplitMode;
        const body = document.getElementById('ed-split-body');
        const btn = document.getElementById('ed-split-toggle');
        if (body) body.classList.toggle('single', !fullSplitMode);
        if (btn) btn.innerHTML = splitToggleHtml(fullSplitMode);
    }

    // 滚动联动：双向按比例同步（编辑区 ↔ 预览区），guard 防止互相触发循环
    let inlineSyncing = false;
    let fullSyncing = false;
    function syncInlineScroll() {  // 编辑区 → 预览区
        const ta = document.getElementById('inline-ed-content');
        const pv = document.getElementById('inline-ed-preview');
        if (!ta || !pv || inlineSyncing) return;
        const taMax = ta.scrollHeight - ta.clientHeight;
        const pvMax = pv.scrollHeight - pv.clientHeight;
        if (taMax > 0 && pvMax > 0) {
            inlineSyncing = true;
            pv.scrollTop = (ta.scrollTop / taMax) * pvMax;
            requestAnimationFrame(() => { inlineSyncing = false; });
        }
    }
    function syncInlinePreviewScroll() {  // 预览区 → 编辑区
        const ta = document.getElementById('inline-ed-content');
        const pv = document.getElementById('inline-ed-preview');
        if (!ta || !pv || inlineSyncing) return;
        const taMax = ta.scrollHeight - ta.clientHeight;
        const pvMax = pv.scrollHeight - pv.clientHeight;
        if (taMax > 0 && pvMax > 0) {
            inlineSyncing = true;
            ta.scrollTop = (pv.scrollTop / pvMax) * taMax;
            requestAnimationFrame(() => { inlineSyncing = false; });
        }
    }
    function syncFullScroll() {  // 编辑区 → 预览区
        const ta = document.getElementById('ed-content');
        const pv = document.getElementById('ed-live-preview');
        if (!ta || !pv || fullSyncing) return;
        const taMax = ta.scrollHeight - ta.clientHeight;
        const pvMax = pv.scrollHeight - pv.clientHeight;
        if (taMax > 0 && pvMax > 0) {
            fullSyncing = true;
            pv.scrollTop = (ta.scrollTop / taMax) * pvMax;
            requestAnimationFrame(() => { fullSyncing = false; });
        }
    }
    function syncFullPreviewScroll() {  // 预览区 → 编辑区
        const ta = document.getElementById('ed-content');
        const pv = document.getElementById('ed-live-preview');
        if (!ta || !pv || fullSyncing) return;
        const taMax = ta.scrollHeight - ta.clientHeight;
        const pvMax = pv.scrollHeight - pv.clientHeight;
        if (taMax > 0 && pvMax > 0) {
            fullSyncing = true;
            ta.scrollTop = (pv.scrollTop / pvMax) * taMax;
            requestAnimationFrame(() => { fullSyncing = false; });
        }
    }

    // 5.2-A 跳转到其他写作相关模块
    function goModule(moduleId) {
        if (window.ModuleRegistry && typeof ModuleRegistry.handleNavClick === 'function') ModuleRegistry.handleNavClick(moduleId);
        else if (typeof switchPage === 'function') switchPage(moduleId);
    }

    // ==================== 5.4 正文撤销/重做（内容历史栈） ====================
    const undoStack = [];
    const redoStack = [];
    let contentLastValue = '';

    function snapshotContent() {
        const ta = document.getElementById('inline-ed-content');
        if (ta) contentLastValue = ta.value;
    }
    function pushUndo() {
        const ta = document.getElementById('inline-ed-content');
        if (!ta) return;
        if (contentLastValue !== ta.value) {
            undoStack.push(contentLastValue);
            if (undoStack.length > 100) undoStack.shift();
            redoStack.length = 0;
            contentLastValue = ta.value;
        }
    }
    function doUndo() {
        const ta = document.getElementById('inline-ed-content');
        if (!ta || undoStack.length === 0) return;
        redoStack.push(ta.value);
        ta.value = undoStack.pop();
        contentLastValue = ta.value;
        updateInlineLiveWordCount();
        updateInlinePreview();
        markInlineDirty();
    }
    function doRedo() {
        const ta = document.getElementById('inline-ed-content');
        if (!ta || redoStack.length === 0) return;
        undoStack.push(ta.value);
        ta.value = redoStack.pop();
        contentLastValue = ta.value;
        updateInlineLiveWordCount();
        updateInlinePreview();
        markInlineDirty();
    }
    // 全屏编辑器独立历史栈（避免与内联混用）
    const fullUndoStack = [];
    const fullRedoStack = [];
    let fullLastValue = '';
    function snapshotFullContent() {
        const ta = document.getElementById('ed-content');
        if (ta) fullLastValue = ta.value;
    }
    function pushFullUndo() {
        const ta = document.getElementById('ed-content');
        if (!ta) return;
        if (fullLastValue !== ta.value) {
            fullUndoStack.push(fullLastValue);
            if (fullUndoStack.length > 100) fullUndoStack.shift();
            fullRedoStack.length = 0;
            fullLastValue = ta.value;
        }
    }
    function doFullUndo() {
        const ta = document.getElementById('ed-content');
        if (!ta || fullUndoStack.length === 0) return;
        fullRedoStack.push(ta.value);
        ta.value = fullUndoStack.pop();
        fullLastValue = ta.value;
        updateLiveWordCount();
        updateFullPreview();
    }
    function doFullRedo() {
        const ta = document.getElementById('ed-content');
        if (!ta || fullRedoStack.length === 0) return;
        fullUndoStack.push(ta.value);
        ta.value = fullRedoStack.pop();
        fullLastValue = ta.value;
        updateLiveWordCount();
        updateFullPreview();
    }

    // 更新时间展示：今天显示"今天 HH:mm"，其他显示"M/D HH:mm"
    function formatUpdatedAt(ts) {
        if (!ts) return '';
        const d = new Date(ts);
        if (isNaN(d.getTime())) return '';
        const now = new Date();
        const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        return d.toDateString() === now.toDateString() ? `今天 ${hm}` : `${d.getMonth() + 1}/${d.getDate()} ${hm}`;
    }

    // Ctrl+S 保存（内联编辑器，模块级绑定一次）
    function onInlineKeyDown(e) {
        const body = document.getElementById('ce-content');
        const activeInEditor = body && body.style.display !== 'none';
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
            if (activeInEditor) { e.preventDefault(); saveInline(); }
            return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
            if (activeInEditor) { e.preventDefault(); if (e.shiftKey) doRedo(); else doUndo(); }
            return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
            if (activeInEditor) { e.preventDefault(); doRedo(); }
        }
    }
    function bindInlineKeyOnce() {
        if (!inlineKeyBound) {
            document.addEventListener('keydown', onInlineKeyDown);
            inlineKeyBound = true;
        }
    }
    function statusEmoji(status) {
        if (status === 'completed') return SvgIconLib ? SvgIconLib.render('check_circle', 15) : '✅';
        if (status === 'draft') return SvgIconLib ? SvgIconLib.render('edit', 15) : '📝';
        return SvgIconLib ? SvgIconLib.render('list', 15) : '📋';
    }
    function statusLabel(status) {
        return status === 'completed' ? '已完成' : status === 'draft' ? '草稿' : '计划中';
    }
    function nextStatus(status) {
        return status === 'planned' ? 'draft' : status === 'draft' ? 'completed' : 'planned';
    }
    function getSortedChapters() {
        const sorted = [...chapters].sort((a, b) => (a.order || 0) - (b.order || 0));
        return sortDirection === 'desc' ? sorted.reverse() : sorted;
    }

    // ==================== 页面渲染 ====================
    function renderPage() {
        let html = '<div class="chapters-page">';
        html += UIUtils.renderCardPage(
            (SvgIconLib ? SvgIconLib.renderAuto('note', 18) : '📑') + ' 章节管理',
            `<button class="btn-small" onclick="ChaptersModule.toggleSort()" id="sort-toggle-btn" title="切换正序/倒序">${sortDirection === 'asc' ? '↓ 正序' : '↑ 倒序'}</button>` +
            '<button class="btn-small" onclick="ChaptersModule.goModule(\'outline\')">大纲</button>' +
            '<button class="btn-small" onclick="ChaptersModule.exportData()">导出</button>' +
            '<button class="btn-primary btn-small" onclick="ChaptersModule.showAddChapter()">+ 添加章节</button>'
        );
        html += '<div class="chapters-stats" id="chapters-stats"></div>';
        // 分屏布局：左列表 | 右编辑器
        html += '<div class="chapters-split-layout">';
        html += '<div class="chapters-list-pane" id="chapters-list-pane">';
        html += '<div id="chapters-list"></div>';
        html += '</div>';
        html += '<div class="chapters-editor-pane" id="chapters-editor-pane">';
        html += '<div class="ce-empty" id="ce-empty">';
        html += '<div style="opacity:0.5;">' + (SvgIconLib ? SvgIconLib.render('edit', 36) : '📝') + '</div>';
        html += '<div style="font-weight:600;margin-bottom:4px;">选择一个章节开始编辑</div>';
        html += '<div style="font-size:12px;color:var(--text-secondary,#6b7280);">或点击右上角「+ 添加章节」创建新章节；大纲请在「大纲管理」页或全屏编辑器「大纲」页签中编写</div>';
        html += '</div>';
        html += '<div id="ce-content" style="display:none;"></div>';
        html += '</div>';
        html += '</div>';
        html += '<div class="chapters-hint">提示：拖动左侧 ≡ 可调整章节顺序；点击状态图标可快速切换状态；点击章节进入右侧编辑。</div>';
        html += '</div>';
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
            el.innerHTML = '<p style="text-align:center;color:#9ca3af;padding:20px;">暂无章节，点击右上角「+ 添加章节」开始创作</p>';
            return;
        }
        const sorted = getSortedChapters();
        const selectedId = editingChapter ? editingChapter.id : null;
        let html = '';
        sorted.forEach((ch, idx) => {
            const progress = wordGoal > 0 ? Math.min(100, Math.round((ch.word_count || 0) / wordGoal * 100)) : 0;
            const selCls = ch.id === selectedId ? ' selected' : '';
            html += `<div class="chapter-item clickable${selCls}" draggable="true" data-id="${ch.id}"`;
            html += ` onclick="ChaptersModule.selectChapter('${ch.id}')"`;
            html += ` ondragstart="ChaptersModule.dragStart(event, '${ch.id}')"`;
            html += ` ondragover="ChaptersModule.dragOver(event, '${ch.id}')"`;
            html += ` ondragleave="ChaptersModule.dragLeave(event)"`;
            html += ` ondrop="ChaptersModule.drop(event, '${ch.id}')"`;
            html += ` ondragend="ChaptersModule.dragEnd(event)">`;
            html += `<span class="chapter-drag-handle" title="拖拽排序" onclick="event.stopPropagation();">≡</span>`;
            html += `<span class="chapter-num">${idx + 1}</span>`;
            html += `<span class="chapter-status-toggle" onclick="ChaptersModule.cycleStatus('${ch.id}'); event.stopPropagation();" title="${statusLabel(ch.status)} (点击切换)">${statusEmoji(ch.status)}</span>`;
            html += `<div class="chapter-info">`;
            html += `<h4>${escapeHtml(ch.title || '未命名')}${typeof renderIdBadge === 'function' ? renderIdBadge(ch.id) : ''}</h4>`;
            html += `<div class="chapter-meta">`;
            html += `<span class="meta-badge word-count">${(ch.word_count || 0).toLocaleString()} 字</span>`;
            if (ch.time_point) html += `<span class="meta-badge has-outline" title="时间点">${SvgIconLib ? SvgIconLib.render('calendar', 12) : '🕓'} ${escapeHtml(ch.time_point)}</span>`;
            if (ch.updated_at) html += `<span class="meta-badge" title="最后更新">${SvgIconLib ? SvgIconLib.render('clock', 12) : '🕐'} ${formatUpdatedAt(ch.updated_at)}</span>`;
            if (ch.outline) html += `<span class="meta-badge has-outline">大纲</span>`;
            if (ch.content) html += `<span class="meta-badge has-content">正文</span>`;
            if (ch.review_cache && ch.review_cache.issues && ch.review_cache.issues.length) html += `<span class="meta-badge has-review">审查 ${ch.review_cache.issues.length}</span>`;
            html += `</div></div>`;
            html += `<div class="chapter-actions">`;
            html += `<button class="btn-tiny" onclick="ChaptersModule.reviewChapter('${ch.id}'); event.stopPropagation();" title="审查">${SvgIconLib ? SvgIconLib.render('search', 13) : '🔍'}</button>`;
            html += `<button class="btn-tiny" onclick="ChaptersModule.openFullscreenById('${ch.id}'); event.stopPropagation();" title="全屏编辑">⤢</button>`;
            html += `<button class="btn-tiny btn-danger" onclick="ChaptersModule.deleteChapter('${ch.id}'); event.stopPropagation();" title="删除">${SvgIconLib ? SvgIconLib.render('trash', 13) : '🗑️'}</button>`;
            html += `</div>`;
            html += `<div class="chapter-progress"><div class="chapter-progress-bar"><div class="chapter-progress-fill" style="width:${progress}%"></div></div>`;
            html += `<div class="chapter-progress-text">${progress}%</div></div>`;
            html += `</div>`;
        });
        el.innerHTML = html;
    }

    // ==================== 排序切换 ====================
    function toggleSort() {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        const btn = document.getElementById('sort-toggle-btn');
        if (btn) btn.textContent = sortDirection === 'asc' ? '↓ 正序' : '↑ 倒序';
        renderList();
    }

    // ==================== 状态快捷切换 ====================
    async function cycleStatus(chId) {
        const ch = chapters.find(c => c.id === chId);
        if (!ch) return;
        ch.status = nextStatus(ch.status);
        await apiRequest('/api/mod/chapters/save', 'POST', chapters);
        renderList();
        renderStats();
        showToast(`「${ch.title || '未命名'}」→ ${statusLabel(ch.status)}`, 'success');
    }

    // ==================== HTML5 拖拽排序 ====================
    function dragStart(e, chId) {
        dragChapterId = chId;
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', chId); } catch(_) {}
        const item = e.currentTarget;
        if (item) item.classList.add('dragging');
    }
    function dragOver(e, chId) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (chId !== dragChapterId) {
            e.currentTarget.classList.add('drag-over');
        }
    }
    function dragLeave(e) {
        e.currentTarget.classList.remove('drag-over');
    }
    function dragEnd(e) {
        dragChapterId = null;
        document.querySelectorAll('.chapter-item.dragging, .chapter-item.drag-over').forEach(el => {
            el.classList.remove('dragging', 'drag-over');
        });
    }
    async function drop(e, targetId) {
        e.preventDefault();
        const target = e.currentTarget;
        target.classList.remove('drag-over');
        if (!dragChapterId || dragChapterId === targetId) {
            dragChapterId = null;
            return;
        }
        // 根据鼠标 Y 位置判断插入到目标前还是后
        const rect = target.getBoundingClientRect();
        const insertBefore = (e.clientY - rect.top) < (rect.height / 2);
        const draggedId = dragChapterId;
        dragChapterId = null;

        // 在当前显示顺序上重排
        const sorted = getSortedChapters();
        const draggedIdx = sorted.findIndex(c => c.id === draggedId);
        if (draggedIdx < 0) return;
        const [dragged] = sorted.splice(draggedIdx, 1);
        const targetIdx = sorted.findIndex(c => c.id === targetId);
        if (targetIdx < 0) {
            sorted.push(dragged);
        } else {
            const insertIdx = insertBefore ? targetIdx : targetIdx + 1;
            sorted.splice(insertIdx, 0, dragged);
        }
        // 重新分配 order 字段，保证当前显示顺序持久化
        const n = sorted.length;
        sorted.forEach((ch, i) => {
            ch.order = sortDirection === 'asc' ? (i + 1) : (n - i);
        });
        await apiRequest('/api/mod/chapters/save', 'POST', chapters);
        renderList();
        showToast('章节顺序已更新', 'success');
    }

    // ==================== 4.2-C 内联编辑器（分屏右侧） ====================
    function showAddChapter() {
        selectNewChapter();
    }

    function showEditChapter(chId) {
        selectChapter(chId);
    }

    // 选中章节进入内联编辑器
    async function selectChapter(chId) {
        const ch = chapters.find(c => c.id === chId);
        if (!ch) return;
        if (isInlineDirty && !(await UIUtils.confirmDialog('当前章节有未保存修改，切换会丢失，确定？'))) return;
        editingChapter = ch;
        currentTab = 'content';
        isInlineDirty = false;
        inlineActive = true;
        renderInlineEditor();
        // 标记选中
        document.querySelectorAll('.chapter-item').forEach(el => {
            el.classList.toggle('selected', el.dataset.id === chId);
        });
        // 移动端：切到编辑器视图
        if (window.innerWidth <= 900) {
            const lp = document.getElementById('chapters-list-pane');
            const ep = document.getElementById('chapters-editor-pane');
            if (lp) lp.classList.add('mobile-hidden');
            if (ep) ep.classList.add('mobile-active');
        }
    }

    // 新建章节进入内联编辑器
    async function selectNewChapter() {
        if (isInlineDirty && !(await UIUtils.confirmDialog('当前章节有未保存修改，切换会丢失，确定？'))) return;
        editingChapter = null;
        currentTab = 'basic';
        isInlineDirty = false;
        inlineActive = true;
        renderInlineEditor();
        document.querySelectorAll('.chapter-item.selected').forEach(el => el.classList.remove('selected'));
        if (window.innerWidth <= 900) {
            const lp = document.getElementById('chapters-list-pane');
            const ep = document.getElementById('chapters-editor-pane');
            if (lp) lp.classList.add('mobile-hidden');
            if (ep) ep.classList.add('mobile-active');
        }
    }

    // 移动端返回列表
    function backToList() {
        editingChapter = null;
        inlineActive = false;
        isInlineDirty = false;
        const pane = document.getElementById('ce-content');
        const empty = document.getElementById('ce-empty');
        if (pane) pane.style.display = 'none';
        if (empty) empty.style.display = '';
        const lp = document.getElementById('chapters-list-pane');
        const ep = document.getElementById('chapters-editor-pane');
        if (lp) lp.classList.remove('mobile-hidden');
        if (ep) ep.classList.remove('mobile-active');
        renderList();
    }

    // 渲染内联编辑器面板
    function renderInlineEditor() {
        const ch = editingChapter;
        const isEdit = !!ch;
        const pane = document.getElementById('ce-content');
        const empty = document.getElementById('ce-empty');
        if (!pane) return;
        if (empty) empty.style.display = 'none';
        pane.style.display = '';
        const reviewId = isEdit ? ch.id : '';
        pane.innerHTML = `
            <div class="ce-header">
                <button type="button" class="btn-tiny chapters-editor-back-btn" onclick="ChaptersModule.backToList()" title="返回列表">← 返回</button>
                <h3>${isEdit ? (SvgIconLib ? SvgIconLib.render('edit', 15) : '✏️') + ' ' + escapeHtml(ch.title || '未命名') : (SvgIconLib ? SvgIconLib.render('plus', 15) : '➕') + ' 新章节'}</h3>
                <div class="ce-tabs">
                    <button class="ce-tab${currentTab === 'basic' ? ' active' : ''}" data-tab="basic" onclick="ChaptersModule.switchInlineTab('basic')">基本信息</button>
                    <button class="ce-tab${currentTab === 'content' ? ' active' : ''}" data-tab="content" onclick="ChaptersModule.switchInlineTab('content')">正文</button>
                    <button class="ce-tab${currentTab === 'review' ? ' active' : ''}" data-tab="review" onclick="ChaptersModule.switchInlineTab('review')">审查</button>
                </div>
                ${isEdit ? `<button class="btn-small" onclick="ChaptersModule.openFullscreen()" title="全屏编辑（聚焦长文）">⤢ 全屏</button>` : ''}
            </div>
            <div class="ce-body">
                <div class="ce-panel${currentTab === 'basic' ? ' active' : ''}" id="inline-panel-basic">
                    <div style="display:flex;flex-direction:column;gap:6px;">
                        <label>章节标题</label>
                        <input type="text" id="inline-ed-title" class="modal-input" placeholder="第X章 ..." oninput="ChaptersModule.markInlineDirty()">
                    </div>
                    <div style="display:flex;gap:16px;flex-wrap:wrap;">
                        <div style="flex:1;min-width:160px;display:flex;flex-direction:column;gap:6px;">
                            <label>状态</label>
                            <select id="inline-ed-status" class="modal-input" onchange="ChaptersModule.markInlineDirty()">
                                <option value="planned">计划中</option>
                                <option value="draft">草稿</option>
                                <option value="completed">已完成</option>
                            </select>
                        </div>
                        <div style="flex:1;min-width:160px;display:flex;flex-direction:column;gap:6px;">
                            <label>字数 <span class="chapter-word-count-live">(自动计算)</span></label>
                            <input type="text" id="inline-ed-wordcount" class="modal-input" readonly value="0">
                        </div>
                        <div style="flex:1;min-width:160px;display:flex;flex-direction:column;gap:6px;">
                            <label>时间点 <span class="chapter-word-count-live">(用于时间线)</span></label>
                            <input type="text" id="inline-ed-timepoint" class="modal-input" placeholder="如：第3年春、1000年前" oninput="ChaptersModule.markInlineDirty()">
                        </div>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:6px;">
                        <label>备注</label>
                        <textarea id="inline-ed-notes" class="modal-input" rows="3" placeholder="章节备注（可选）..." style="resize:vertical;" oninput="ChaptersModule.markInlineDirty()"></textarea>
                    </div>
                </div>
                <div class="ce-panel${currentTab === 'content' ? ' active' : ''}" id="inline-panel-content">
                    <div style="display:flex;flex-direction:column;gap:6px;flex:1;min-height:0;">
                        <label>章节正文 <span class="chapter-word-count-live" id="inline-ed-wordcount-live">0 字</span>
                            <button class="btn-tiny" id="inline-split-toggle" onclick="ChaptersModule.toggleInlineSplit()" title="切换分屏/单栏编辑">${splitToggleHtml(inlineSplitMode)}</button>
                            <button class="btn-tiny" style="margin-left:auto;" onclick="ChaptersModule.extractTerms()" title="扫描正文，提取可能的新术语">${SvgIconLib ? SvgIconLib.render('book', 12) : '📖'} 提取术语</button>
                        </label>
                        <div class="ce-split-body${inlineSplitMode ? '' : ' single'}" id="inline-split-body">
                            <textarea id="inline-ed-content" class="modal-input ce-content-textarea" placeholder="在此输入章节正文..." oninput="ChaptersModule.pushUndo(); ChaptersModule.updateInlineLiveWordCount(); ChaptersModule.markInlineDirty(); ChaptersModule.updateInlinePreview()" onscroll="ChaptersModule.syncInlineScroll()"></textarea>
                            <div class="ce-live-preview" id="inline-ed-preview" onscroll="ChaptersModule.syncInlinePreviewScroll()"></div>
                        </div>
                    </div>
                </div>
                <div class="ce-panel${currentTab === 'review' ? ' active' : ''}" id="inline-panel-review">
                    <div class="ce-review-entry">
                        <p>${SvgIconLib ? SvgIconLib.render('search', 13) : '🔍'} 进入「章节正文审查」模块对本章进行深度审查<br>（错字/标点/缺词/改进/伏笔/一致性 + AI 重写/扩写/精简）</p>
                        ${isEdit
                            ? `<button class="btn-primary" onclick="ChaptersModule.reviewChapter('${reviewId}')">在审查模块中打开本章</button>`
                            : '<div style="color:#9ca3af;font-size:12px;">请先保存章节后再审查</div>'}
                    </div>
                </div>
            </div>
            <div class="ce-footer">
                <span class="editor-status-tip" id="inline-status-tip">正文变化时将自动清空审查缓存</span>
                <button class="btn-tiny" onclick="ChaptersModule.doUndo()" title="撤销 (Ctrl+Z)">↩ 撤销</button>
                <button class="btn-tiny" onclick="ChaptersModule.doRedo()" title="重做 (Ctrl+Y)">↪ 重做</button>
                <button class="btn-secondary btn-small" onclick="ChaptersModule.cancelInline()">取消</button>
                <button class="btn-primary btn-small" onclick="ChaptersModule.saveInline()">${SvgIconLib ? SvgIconLib.render('save', 13) : '💾'} 保存</button>
            </div>
        `;
        // 填充表单值
        if (isEdit) {
            document.getElementById('inline-ed-title').value = ch.title || '';
            document.getElementById('inline-ed-status').value = ch.status || 'planned';
            document.getElementById('inline-ed-notes').value = ch.notes || '';
            document.getElementById('inline-ed-content').value = ch.content || '';
            const tpEl = document.getElementById('inline-ed-timepoint');
            if (tpEl) tpEl.value = ch.time_point || '';
        } else {
            document.getElementById('inline-ed-status').value = 'planned';
            setTimeout(() => { const t = document.getElementById('inline-ed-title'); if (t) t.focus(); }, 50);
        }
        // 中栏大纲已移除（大纲改由独立「大纲管理」模块与全屏编辑器「大纲」页签承载）
        updateInlineLiveWordCount();
        updateInlinePreview();
        bindInlineKeyOnce();
        snapshotContent();
        undoStack.length = 0;
        redoStack.length = 0;
    }

    function switchInlineTab(tab) {
        currentTab = tab;
        document.querySelectorAll('.ce-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
        document.querySelectorAll('.ce-panel').forEach(p => p.classList.toggle('active', p.id === 'inline-panel-' + tab));
        if (tab === 'content') updateInlineLiveWordCount();
    }

    function markInlineDirty() {
        isInlineDirty = true;
        const tip = document.getElementById('inline-status-tip');
        if (tip) { tip.textContent = '● 有未保存修改'; tip.classList.add('dirty'); }
    }

    function updateInlineLiveWordCount() {
        const contentEl = document.getElementById('inline-ed-content');
        if (!contentEl) return;
        const count = countWords(contentEl.value);
        const liveEl = document.getElementById('inline-ed-wordcount-live');
        if (liveEl) liveEl.textContent = `${count.toLocaleString()} 字`;
        const wcEl = document.getElementById('inline-ed-wordcount');
        if (wcEl) wcEl.value = count.toLocaleString();
    }

    async function saveInline() {
        const titleEl = document.getElementById('inline-ed-title');
        if (!titleEl) return;
        const title = titleEl.value.trim();
        if (!title) {
            showToast('请输入章节标题', 'error');
            switchInlineTab('basic');
            titleEl.focus();
            return;
        }
        const oldWordCount = editingChapter ? (editingChapter.word_count || 0) : 0;
        const content = document.getElementById('inline-ed-content').value;
        const newWordCount = countWords(content);
        // 大纲由「大纲管理」模块与全屏编辑器「大纲」页签编辑，内联保存时保持不变
        const outline = editingChapter ? (editingChapter.outline || '') : '';
        const notes = document.getElementById('inline-ed-notes').value;
        const status = document.getElementById('inline-ed-status').value;
        const tpEl = document.getElementById('inline-ed-timepoint');
        const timePoint = tpEl ? tpEl.value : '';

        const wasNew = !editingChapter;
        if (editingChapter) {
            const ch = editingChapter;
            const oldContent = ch.content || '';
            ch.title = title;
            ch.status = status;
            ch.notes = notes.trim();
            ch.outline = outline.trim();
            ch.time_point = timePoint.trim();
            ch.word_count = newWordCount;
            ch.updated_at = Date.now();
            if (oldContent !== content) {
                ch.content = content;
                ch.review_cache = null;
            }
        } else {
            const newCh = {
                id: 'ch_' + Date.now(),
                title,
                word_count: newWordCount,
                outline: outline.trim(),
                status,
                notes: notes.trim(),
                time_point: timePoint.trim(),
                content,
                review_cache: null,
                updated_at: Date.now(),
                order: chapters.length + 1
            };
            chapters.push(newCh);
            editingChapter = newCh;
        }

        await apiRequest('/api/mod/chapters/save', 'POST', chapters);
        // 5.1-A 自动同步今日写作字数（增量）
        await _autoLogTodayWords(newWordCount - oldWordCount);
        isInlineDirty = false;
        refreshView();
        // 重新渲染内联编辑器（反映新标题/字数）+ 重新标记选中
        renderInlineEditor();
        if (editingChapter) {
            document.querySelectorAll('.chapter-item').forEach(el => {
                el.classList.toggle('selected', el.dataset.id === editingChapter.id);
            });
        }
        // 同步章节审查模块的章节列表
        if (window.ChapterReviewModule && typeof window.ChapterReviewModule.refreshChapters === 'function') {
            try { window.ChapterReviewModule.refreshChapters(); } catch(_) {}
        }
        showToast(wasNew ? '章节已添加' : '章节已更新', 'success');
    }

    async function cancelInline() {
        if (isInlineDirty && !(await UIUtils.confirmDialog('有未保存修改，确定取消？'))) return;
        editingChapter = null;
        currentTab = 'basic';
        isInlineDirty = false;
        inlineActive = false;
        const pane = document.getElementById('ce-content');
        const empty = document.getElementById('ce-empty');
        if (pane) pane.style.display = 'none';
        if (empty) empty.style.display = '';
        document.querySelectorAll('.chapter-item.selected').forEach(el => el.classList.remove('selected'));
        // 移动端返回列表
        backToList();
    }

    // ==================== 2.2-A 术语自动提取 ====================
    // 中文常见停用词（虚词、代词、量词等），不作为术语候选
    const TERM_STOP_WORDS = new Set([
        '我们', '你们', '他们', '她们', '咱们', '自己', '别人', '大家', '人家',
        '什么', '怎么', '为什么', '那么', '这样', '那样', '怎样', '这么',
        '这个', '那个', '这些', '那些', '这里', '那里', '哪儿', '哪里',
        '已经', '正在', '将要', '马上', '立刻', '突然', '忽然', '渐渐',
        '只是', '只有', '只要', '只是', '可是', '但是', '然而', '虽然',
        '因为', '所以', '因此', '于是', '不但', '而且', '并且', '况且',
        '如果', '要是', '万一', '即使', '尽管', '无论', '不管',
        '对于', '关于', '至于', '由于', '基于', '鉴于',
        '一向', '一直', '总是', '从来', '偶尔', '有时', '经常', '常常',
        '如今', '现在', '以前', '以后', '之前', '之后', '之间', '之中',
        '上面', '下面', '里面', '外面', '前面', '后面', '旁边', '中间',
        '左边', '右边', '上方', '下方', '左侧', '右侧',
        '一下', '一直', '一切', '所有', '有些', '某个', '某些',
        '时候', '时间', '地方', '东西', '事情', '道理', '感觉',
        '起来', '下来', '出来', '过来', '过去', '回去', '进去', '出来',
        '似的', '一般', '一样', '同样', '同类',
        '可以', '能够', '应该', '必须', '可能', '也许', '大概',
        '不会', '不能', '不要', '不用', '不必', '不行',
        '没有', '不是', '不会', '不用', '不再',
        '一种', '一个', '一次', '一切', '一番',
        '不得', '不断', '不止', '不觉',
        '之中', '之内', '之外', '之上', '之下',
        '于是', '因此', '因为', '所以',
        '不过', '不但', '而且', '另外', '此外',
        '一种', '一种', '一场', '一番', '一次',
        '一个', '两个', '三个', '四个', '五个', '六个', '七个', '八个', '九个', '十个',
        '第一', '第二', '第三', '第四', '第五',
        '一切', '所有', '全部', '全体', '全部',
        '没什么', '没什么', '什么样', '怎么样'
    ]);

    // 从正文提取候选术语：返回 [{term, count}] 按词频降序
    function extractTermCandidates(text) {
        if (!text) return [];
        // 先切出中文连续段
        const segments = text.match(/[\u4e00-\u9fa5]+/g) || [];
        const freq = {};
        // 滑动窗口枚举 2-6 字子串（避免贪婪匹配吞掉短术语，如「灵气」不会被合并成「灵气在经脉」）
        for (const seg of segments) {
            for (let L = 2; L <= 6; L++) {
                for (let i = 0; i + L <= seg.length; i++) {
                    const w = seg.substr(i, L);
                    if (TERM_STOP_WORDS.has(w)) continue;
                    // 5.3 噪声过滤：叠字（哈哈/嘿嘿）、含高频虚词的长组合（灵气在经脉）
                    if (/^(.)\1+$/.test(w)) continue;
                    if (w.length >= 4 && /[着过了的地得中则便很最更还又及与]/.test(w)) continue;
                    const head = w.charAt(0);
                    const tail = w.charAt(w.length - 1);
                    if ('的了着过和与及或而又但也还就把被让使向到从对于在之上之下里外中去来啊哦呢吧呀嘛'.includes(head)) continue;
                    if ('的了着过和与及或而又但也还就把被让使向到对于在之上之下里外中去来啊哦呢吧呀嘛'.includes(tail)) continue;
                    freq[w] = (freq[w] || 0) + 1;
                }
            }
        }
        const arr = Object.entries(freq).map(([term, count]) => ({ term, count }));
        arr.sort((a, b) => b.count - a.count || b.term.length - a.term.length);
        return arr;
    }

    // 对已有术语（名+别名）用 indexOf 精确统计出现次数，保证已有术语一定被识别
    function countExistingTerms(text, glossary) {
        const result = [];
        const seen = new Set();
        glossary.forEach(g => {
            const names = [g.name].concat(g.aliases || []).filter(n => n && n.length >= 2);
            let total = 0;
            names.forEach(n => {
                let idx = 0;
                while ((idx = text.indexOf(n, idx)) !== -1) { total++; idx += n.length; }
            });
            if (total > 0 && !seen.has(g.name)) {
                seen.add(g.name);
                result.push({ term: g.name, count: total });
            }
        });
        result.sort((a, b) => b.count - a.count || b.term.length - a.term.length);
        return result;
    }

    // 5.3 提取方式选择：本地词频 或 AI 智能提取
    function extractTerms() {
        const contentEl = document.getElementById('inline-ed-content');
        if (!contentEl) { showToast('请先打开章节正文', 'error'); return; }
        const text = contentEl.value || '';
        if (!text.trim()) { showToast('章节正文为空', 'error'); return; }
        showModal((SvgIconLib ? SvgIconLib.render('book', 16) : '📖') + ' 提取术语', `
            <div style="padding:4px 0 12px;color:var(--text-secondary,#6b7280);font-size:13px;line-height:1.7;">从当前章节正文中提取名词性术语（人名、地名、功法、法宝、组织、设定名词等），选择提取方式：</div>
            <div style="display:flex;flex-direction:column;gap:10px;">
                <button class="btn-secondary" style="justify-content:flex-start;text-align:left;padding:12px 14px;" onclick="ChaptersModule.runLocalExtract()">${SvgIconLib ? SvgIconLib.render('search', 14) : '🔍'} 本地提取<div style="font-size:11px;color:var(--text-secondary,#6b7280);font-weight:normal;margin-top:2px;">快速离线 · 基于词频统计（中文 2-6 字、出现≥2 次）</div></button>
                <button class="btn-primary" style="justify-content:flex-start;text-align:left;padding:12px 14px;" onclick="ChaptersModule.runAiExtract()">${SvgIconLib ? SvgIconLib.render('robot', 14) : '🤖'} AI 提取<div style="font-size:11px;opacity:0.85;font-weight:normal;margin-top:2px;">智能识别专有名词 · 更准确（需在「API 配置」中填写接口）</div></button>
            </div>
        `, [
            { text: '取消', class: 'btn-secondary', action: () => closeModal() }
        ]);
    }

    async function runLocalExtract() {
        const contentEl = document.getElementById('inline-ed-content');
        if (!contentEl) { showToast('请先打开章节正文', 'error'); return; }
        const text = contentEl.value || '';
        if (!text.trim()) { showToast('章节正文为空', 'error'); return; }

        // 加载术语表
        let glossary = [];
        try { glossary = await apiRequest('/api/mod/glossary') || []; } catch(_) {}

        // 已有术语集合（名称 + 别名），用于过滤候选
        const existing = new Set();
        glossary.forEach(g => {
            existing.add(g.name);
            (g.aliases || []).forEach(a => existing.add(a));
        });

        // 提取候选（滑动窗口，覆盖所有 2-6 字子串）
        const candidates = extractTermCandidates(text);
        // 过滤掉已存在的术语；只保留出现 ≥2 次的（更具参考价值）
        const fresh = candidates.filter(c => !existing.has(c.term) && c.count >= 2);
        // 已有术语用 indexOf 精确统计（保证一定被识别，不被滑动窗口的噪声影响）
        const matched = countExistingTerms(text, glossary);

        if (fresh.length === 0 && matched.length === 0) {
            showModal((SvgIconLib ? SvgIconLib.render('book', 16) : '📖') + ' 提取术语', '<div style="text-align:center;color:#9ca3af;padding:20px 0;">未在正文中识别到候选术语<br>（中文 2-6 字、出现 ≥2 次、非停用词）</div>', [
                { text: '关闭', class: 'btn-secondary', action: () => closeModal() }
            ]);
            return;
        }

        // 构建结果列表 HTML
        let html = '<div class="term-extract-toolbar">';
        html += `<span>共识别 ${fresh.length} 个新候选 · ${matched.length} 个已存在</span>`;
        html += '<button class="btn-tiny" onclick="ChaptersModule._termExtractToggleAll(true)">全选</button>';
        html += '<button class="btn-tiny" onclick="ChaptersModule._termExtractToggleAll(false)">全不选</button>';
        html += '<span style="margin-left:auto;font-size:11px;">勾选后点击「加入术语表」</span>';
        html += '</div>';
        html += '<div class="term-extract-list">';
        if (fresh.length > 0) {
            html += '<div style="padding:6px 10px;background:var(--bg-color,#f9fafb);font-size:11px;color:var(--text-secondary,#6b7280);font-weight:600;">新候选</div>';
            fresh.forEach((c, i) => {
                html += `<div class="term-extract-item">`;
                html += `<input type="checkbox" class="te-check" data-term="${escapeHtml(c.term)}" data-count="${c.count}" checked>`;
                html += `<span class="te-term">${escapeHtml(c.term)}</span>`;
                html += `<span class="te-meta">出现 ${c.count} 次 · ${c.term.length} 字</span>`;
                html += `<input type="text" class="te-cat" placeholder="分类（可选）" style="width:90px;">`;
                html += `</div>`;
            });
        }
        if (matched.length > 0) {
            html += '<div style="padding:6px 10px;background:var(--bg-color,#f9fafb);font-size:11px;color:var(--text-secondary,#6b7280);font-weight:600;">已存在（仅查看词频）</div>';
            matched.forEach(c => {
                html += `<div class="term-extract-item" style="opacity:0.6;">`;
                html += `<input type="checkbox" disabled>`;
                html += `<span class="te-term">${escapeHtml(c.term)}</span>`;
                html += `<span class="te-meta">出现 ${c.count} 次 · 已在术语表</span>`;
                html += `</div>`;
            });
        }
        html += '</div>';

        showModal((SvgIconLib ? SvgIconLib.render('book', 16) : '📖') + ' 提取术语 - 「' + getInlineChapterTitle() + '」', html, [
            { text: '取消', class: 'btn-secondary', action: () => closeModal() },
            { text: '加入术语表', class: 'btn-primary', action: () => ChaptersModule._termExtractConfirm() }
        ]);
    }

    // 提取/AI 弹窗标题：优先当前编辑章节，其次读取内联标题输入框
    function getInlineChapterTitle() {
        if (editingChapter) return editingChapter.title || '未命名';
        const t = document.getElementById('inline-ed-title');
        if (t && t.value && t.value.trim()) return t.value.trim();
        return '新章节';
    }

    function _termExtractToggleAll(checked) {
        document.querySelectorAll('.te-check').forEach(cb => { cb.checked = !!checked; });
    }

    async function _termExtractConfirm() {
        const checks = document.querySelectorAll('.te-check:checked');
        if (checks.length === 0) { showToast('请至少勾选一个术语', 'error'); return; }
        // 加载术语表（保证最新）
        let glossary = [];
        try { glossary = await apiRequest('/api/mod/glossary') || []; } catch(_) {}
        const existing = new Set(glossary.map(g => g.name));
        const now = Date.now();
        let added = 0;
        checks.forEach((cb, i) => {
            const term = cb.dataset.term;
            const category = (cb.parentElement.querySelector('.te-cat') || {}).value || '';
            if (!term || existing.has(term)) return;
            glossary.push({
                id: 'gl_' + (now + i),
                name: term,
                category: category.trim(),
                definition: '',
                aliases: []
            });
            existing.add(term);
            added++;
        });
        if (added === 0) {
            showToast('未新增术语（可能已存在）', 'info');
            closeModal();
            return;
        }
        try {
            await apiRequest('/api/mod/glossary/save', 'POST', glossary);
            showToast(`已添加 ${added} 个术语到术语表`, 'success');
            closeModal();
        } catch(e) {
            showToast('保存术语表失败: ' + e.message, 'error');
        }
    }

    // ==================== 5.3-A AI 智能提取术语 ====================
    async function runAiExtract() {
        const contentEl = document.getElementById('inline-ed-content');
        if (!contentEl) { showToast('请先打开章节正文', 'error'); return; }
        const text = contentEl.value || '';
        if (!text.trim()) { showToast('章节正文为空', 'error'); return; }
        // 读取 API 配置
        let cfg = {};
        try { cfg = await apiRequest('/api/mod/api_config') || {}; } catch(_) { cfg = {}; }
        if (!cfg.api_url) {
            showModal((SvgIconLib ? SvgIconLib.render('robot', 16) : '🤖') + ' AI 提取术语', '<div style="text-align:center;color:#9ca3af;padding:16px 0;">尚未配置 AI 接口<br>请先在「API 配置」模块填写 API URL 和 Key</div>', [
                { text: '去配置', class: 'btn-primary', action: () => { closeModal(); ChaptersModule.goModule('api_config'); } },
                { text: '取消', class: 'btn-secondary', action: () => closeModal() }
            ]);
            return;
        }
        // 截取正文（避免超长请求）
        const maxLen = 3000;
        const excerpt = text.slice(0, maxLen) + (text.length > maxLen ? '\n（正文过长，已截取前 ' + maxLen + ' 字）' : '');
        // 加载中弹窗
        showModal((SvgIconLib ? SvgIconLib.render('robot', 16) : '🤖') + ' AI 提取术语', '<div style="text-align:center;padding:20px 0;">' + (SvgIconLib ? SvgIconLib.render('clock', 18) : '⏳') + ' AI 正在分析正文，提取术语...<br><span style="font-size:12px;color:#9ca3af;">首次调用可能需要几秒</span></div>', [
            { text: '取消', class: 'btn-secondary', action: () => closeModal() }
        ]);
        const sys = cfg.system_prompt && cfg.system_prompt.trim() ? cfg.system_prompt : '你是资深小说编辑，精通术语提取。';
        const user = '请从以下小说正文中提取【名词性专有术语】（人名、地名、功法、法宝、组织、设定名词等），排除常见动词、助词和日常词汇。\n只输出一个 JSON 字符串数组，格式如 ["术语1","术语2"]，不要输出任何其他文字。\n\n正文：\n' + excerpt;
        const body = {
            model: cfg.model || '',
            messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
            temperature: (typeof cfg.temperature === 'number' ? cfg.temperature : 0.3),
            max_tokens: 1000,
            stream: false
        };
        const headers = { 'Content-Type': 'application/json' };
        if (cfg.api_key) headers['Authorization'] = 'Bearer ' + cfg.api_key;
        let reply = '';
        try {
            const resp = await fetch(cfg.api_url, { method: 'POST', headers, body: JSON.stringify(body) });
            const txt = await resp.text().catch(() => '');
            if (!resp.ok) throw new Error('HTTP ' + resp.status + ' ' + txt.slice(0, 200));
            let data = null;
            try { data = JSON.parse(txt); } catch(_) { data = null; }
            reply = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
        } catch(e) {
            showModal((SvgIconLib ? SvgIconLib.render('robot', 16) : '🤖') + ' AI 提取失败', '<div style="text-align:center;color:#9ca3af;padding:16px 0;">' + escapeHtml(e.message || String(e)) + '</div>', [
                { text: '关闭', class: 'btn-secondary', action: () => closeModal() }
            ]);
            return;
        }
        const terms = parseAiTerms(reply);
        if (terms.length === 0) {
            showModal((SvgIconLib ? SvgIconLib.render('robot', 16) : '🤖') + ' AI 提取术语', '<div style="text-align:center;color:#9ca3af;padding:16px 0;">未从 AI 返回结果中解析到术语</div>', [
                { text: '关闭', class: 'btn-secondary', action: () => closeModal() }
            ]);
            return;
        }
        await showAiExtractConfirm(terms);
    }

    // 解析 AI 返回内容为术语数组（优先 JSON 数组，退化按行/逗号拆分）
    function parseAiTerms(reply) {
        if (!reply) return [];
        const m = reply.match(/\[[\s\S]*\]/);
        if (m) {
            try {
                const arr = JSON.parse(m[0]);
                if (Array.isArray(arr)) {
                    return arr.map(x => typeof x === 'string' ? x.trim() : '').filter(x => x && x.length >= 2 && x.length <= 20);
                }
            } catch(_) {}
        }
        return reply.split(/[,，\n]/)
            .map(s => s.replace(/^\s*\d+[\.、]\s*/, '').trim())
            .filter(s => s && s.length >= 2 && s.length <= 20);
    }

    async function showAiExtractConfirm(terms) {
        // 过滤已存在于术语表的项
        let glossary = [];
        try { glossary = await apiRequest('/api/mod/glossary') || []; } catch(_) {}
        const existing = new Set(glossary.map(g => g.name));
        const contentEl = document.getElementById('inline-ed-content');
        const text = (contentEl && contentEl.value) || '';
        const fresh = terms.map(t => {
            let idx = 0, cnt = 0;
            while ((idx = text.indexOf(t, idx)) !== -1) { cnt++; idx += t.length; }
            return { term: t, count: cnt };
        }).filter(c => !existing.has(c.term));
        if (fresh.length === 0) {
            showModal((SvgIconLib ? SvgIconLib.render('robot', 16) : '🤖') + ' AI 提取术语', '<div style="text-align:center;color:#9ca3af;padding:16px 0;">AI 返回的术语都已存在于术语表</div>', [
                { text: '关闭', class: 'btn-secondary', action: () => closeModal() }
            ]);
            return;
        }
        let html = '<div class="term-extract-toolbar">';
        html += `<span>AI 识别 ${fresh.length} 个新术语</span>`;
        html += '<button class="btn-tiny" onclick="ChaptersModule._termExtractToggleAll(true)">全选</button>';
        html += '<button class="btn-tiny" onclick="ChaptersModule._termExtractToggleAll(false)">全不选</button>';
        html += '<span style="margin-left:auto;font-size:11px;">勾选后点击「加入术语表」</span>';
        html += '</div><div class="term-extract-list">';
        fresh.forEach(c => {
            html += `<div class="term-extract-item">`;
            html += `<input type="checkbox" class="te-check" data-term="${escapeHtml(c.term)}" data-count="${c.count}" checked>`;
            html += `<span class="te-term">${escapeHtml(c.term)}</span>`;
            html += `<span class="te-meta">正文出现 ${c.count} 次</span>`;
            html += `<input type="text" class="te-cat" placeholder="分类（可选）" style="width:90px;">`;
            html += `</div>`;
        });
        html += '</div>';
        showModal((SvgIconLib ? SvgIconLib.render('robot', 16) : '🤖') + ' AI 提取术语', html, [
            { text: '取消', class: 'btn-secondary', action: () => closeModal() },
            { text: '加入术语表', class: 'btn-primary', action: () => ChaptersModule._termExtractConfirm() }
        ]);
    }


    // 从内联编辑器打开全屏覆盖编辑器
    async function openFullscreen() {
        if (isInlineDirty && !(await UIUtils.confirmDialog('当前内联编辑有未保存修改，打开全屏编辑前会丢失，确定？'))) return;
        openEditor(editingChapter);
    }

    // 从列表项直接打开全屏编辑器
    function openFullscreenById(chId) {
        const ch = chapters.find(c => c.id === chId);
        if (!ch) return;
        // 关闭内联编辑器（如有），避免 ID 冲突
        if (inlineActive) {
            editingChapter = null;
            isInlineDirty = false;
            inlineActive = false;
            const pane = document.getElementById('ce-content');
            const empty = document.getElementById('ce-empty');
            if (pane) pane.style.display = 'none';
            if (empty) empty.style.display = '';
            document.querySelectorAll('.chapter-item.selected').forEach(el => el.classList.remove('selected'));
        }
        openEditor(ch);
    }

    // ==================== 分 tab 全屏编辑器（保留作为备选） ====================
    function openEditor(ch) {
        editingChapter = ch;
        currentTab = 'basic';
        const isEdit = !!ch;

        const overlay = document.createElement('div');
        overlay.className = 'chapter-editor-overlay';
        overlay.id = 'chapter-editor-overlay';
        overlay.innerHTML = `
            <div class="chapter-editor-header">
                <h3>${isEdit ? (SvgIconLib ? SvgIconLib.render('edit', 15) : '✏️') + ' 编辑章节' : (SvgIconLib ? SvgIconLib.render('plus', 15) : '➕') + ' 添加章节'}</h3>
                <div class="chapter-editor-tabs">
                    <button class="chapter-tab active" data-tab="basic" onclick="ChaptersModule.switchTab('basic')">基本信息</button>
                    <button class="chapter-tab" data-tab="outline" onclick="ChaptersModule.switchTab('outline')">大纲</button>
                    <button class="chapter-tab" data-tab="content" onclick="ChaptersModule.switchTab('content')">正文</button>
                    <button class="chapter-tab" data-tab="preview" onclick="ChaptersModule.switchTab('preview')">预览</button>
                </div>
                <button class="modal-close" onclick="ChaptersModule.closeEditor()" title="关闭">&times;</button>
            </div>
            <div class="chapter-editor-body">
                <div class="chapter-tab-panel active" id="panel-basic">
                    <div style="display:flex;flex-direction:column;gap:6px;">
                        <label>章节标题</label>
                        <input type="text" id="ed-title" class="modal-input" placeholder="第X章 ...">
                    </div>
                    <div style="display:flex;gap:16px;flex-wrap:wrap;">
                        <div style="flex:1;min-width:160px;display:flex;flex-direction:column;gap:6px;">
                            <label>状态</label>
                            <select id="ed-status" class="modal-input">
                                <option value="planned">计划中</option>
                                <option value="draft">草稿</option>
                                <option value="completed">已完成</option>
                            </select>
                        </div>
                        <div style="flex:1;min-width:160px;display:flex;flex-direction:column;gap:6px;">
                            <label>字数 <span class="chapter-word-count-live" id="ed-wordcount-label">(自动计算)</span></label>
                            <input type="text" id="ed-wordcount" class="modal-input" readonly value="0">
                        </div>
                        <div style="flex:1;min-width:160px;display:flex;flex-direction:column;gap:6px;">
                            <label>时间点 <span class="chapter-word-count-live">(用于时间线)</span></label>
                            <input type="text" id="ed-timepoint" class="modal-input" placeholder="如：第3年春、1000年前">
                        </div>
                    </div>
                    <div style="flex:1;display:flex;flex-direction:column;gap:6px;min-height:120px;">
                        <label>备注</label>
                        <textarea id="ed-notes" class="modal-input" rows="4" placeholder="章节备注（可选）..." style="resize:vertical;"></textarea>
                    </div>
                </div>
                <div class="chapter-tab-panel" id="panel-outline">
                    <div style="flex:1;display:flex;flex-direction:column;gap:6px;">
                        <label>章节大纲 <span class="chapter-word-count-live">支持多行</span></label>
                        <textarea id="ed-outline" class="modal-input chapter-outline-textarea" placeholder="在此编写章节大纲、要点、剧情节拍..."></textarea>
                    </div>
                </div>
                <div class="chapter-tab-panel" id="panel-content">
                    <div style="flex:1;display:flex;flex-direction:column;gap:6px;min-height:0;">
                        <label>章节正文 <span class="chapter-word-count-live" id="ed-wordcount-live">0 字</span>
                            <button class="btn-tiny" id="ed-split-toggle" onclick="ChaptersModule.toggleFullSplit()" title="切换分屏/单栏编辑">${splitToggleHtml(fullSplitMode)}</button>
                        </label>
                        <div class="ed-split-body${fullSplitMode ? '' : ' single'}" id="ed-split-body">
                            <textarea id="ed-content" class="modal-input chapter-content-textarea" placeholder="在此输入章节正文..." oninput="ChaptersModule.pushFullUndo(); ChaptersModule.updateLiveWordCount(); ChaptersModule.updateFullPreview()" onscroll="ChaptersModule.syncFullScroll()"></textarea>
                            <div class="ed-live-preview" id="ed-live-preview" onscroll="ChaptersModule.syncFullPreviewScroll()"></div>
                        </div>
                    </div>
                </div>
                <div class="chapter-tab-panel" id="panel-preview">
                    <div class="chapter-preview" id="ed-preview">（暂无正文）</div>
                </div>
            </div>
            <div class="chapter-editor-footer">
                <span class="editor-status-tip">正文变化时将自动清空审查缓存</span>
                <button class="btn-tiny" onclick="ChaptersModule.doFullUndo()" title="撤销 (Ctrl+Z)">↩ 撤销</button>
                <button class="btn-tiny" onclick="ChaptersModule.doFullRedo()" title="重做 (Ctrl+Y)">↪ 重做</button>
                <button class="btn-secondary btn-small" onclick="ChaptersModule.closeEditor()">取消</button>
                <button class="btn-primary btn-small" onclick="ChaptersModule.saveEditor()">保存</button>
            </div>
        `;
        document.body.appendChild(overlay);

        // 填充表单值（避免 HTML 转义问题）
        if (isEdit) {
            document.getElementById('ed-title').value = ch.title || '';
            document.getElementById('ed-status').value = ch.status || 'planned';
            document.getElementById('ed-notes').value = ch.notes || '';
            document.getElementById('ed-outline').value = ch.outline || '';
            document.getElementById('ed-content').value = ch.content || '';
            const tpEl = document.getElementById('ed-timepoint');
            if (tpEl) tpEl.value = ch.time_point || '';
        } else {
            document.getElementById('ed-status').value = 'planned';
        }
        updateLiveWordCount();
        updateFullPreview();
        snapshotFullContent();
        fullUndoStack.length = 0;
        fullRedoStack.length = 0;

        // ESC 关闭 / Ctrl+S 保存
        document.addEventListener('keydown', onEditorEscKey);
        // 标题输入框聚焦
        setTimeout(() => { const t = document.getElementById('ed-title'); if (t) t.focus(); }, 50);
    }

    function onEditorEscKey(e) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
            e.preventDefault();
            saveEditor();
            return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            if (e.shiftKey) doFullRedo(); else doFullUndo();
            return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
            e.preventDefault();
            doFullRedo();
            return;
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            closeEditor();
        }
    }

    function switchTab(tab) {
        currentTab = tab;
        document.querySelectorAll('.chapter-tab').forEach(b => {
            b.classList.toggle('active', b.dataset.tab === tab);
        });
        document.querySelectorAll('.chapter-tab-panel').forEach(p => {
            p.classList.toggle('active', p.id === `panel-${tab}`);
        });
        if (tab === 'preview') renderPreview();
        if (tab === 'content') updateLiveWordCount();
    }

    function updateLiveWordCount() {
        const contentEl = document.getElementById('ed-content');
        if (!contentEl) return;
        const count = countWords(contentEl.value);
        const liveEl = document.getElementById('ed-wordcount-live');
        if (liveEl) liveEl.textContent = `${count.toLocaleString()} 字`;
        const wcEl = document.getElementById('ed-wordcount');
        if (wcEl) wcEl.value = count.toLocaleString();
    }

    function renderPreview() {
        renderLivePreview(document.getElementById('ed-content'), document.getElementById('ed-preview'));
    }

    async function saveEditor() {
        const titleEl = document.getElementById('ed-title');
        if (!titleEl) return;
        const title = titleEl.value.trim();
        if (!title) {
            showToast('请输入章节标题', 'error');
            switchTab('basic');
            titleEl.focus();
            return;
        }
        const oldWordCount = editingChapter ? (editingChapter.word_count || 0) : 0;
        const content = document.getElementById('ed-content').value;
        const newWordCount = countWords(content);
        const outline = document.getElementById('ed-outline').value;
        const notes = document.getElementById('ed-notes').value;
        const status = document.getElementById('ed-status').value;
        const tpEl = document.getElementById('ed-timepoint');
        const timePoint = tpEl ? tpEl.value : '';

        if (editingChapter) {
            const ch = editingChapter;
            const oldContent = ch.content || '';
            ch.title = title;
            ch.status = status;
            ch.notes = notes.trim();
            ch.outline = outline.trim();
            ch.time_point = timePoint.trim();
            ch.word_count = newWordCount;
            ch.updated_at = Date.now();
            // 正文变化则更新并清空审查缓存
            if (oldContent !== content) {
                ch.content = content;
                ch.review_cache = null;
            }
        } else {
            const newCh = {
                id: 'ch_' + Date.now(),
                title,
                word_count: newWordCount,
                outline: outline.trim(),
                status,
                notes: notes.trim(),
                time_point: timePoint.trim(),
                content,
                review_cache: null,
                updated_at: Date.now(),
                order: chapters.length + 1
            };
            chapters.push(newCh);
        }

        const isEdit = !!editingChapter;
        await apiRequest('/api/mod/chapters/save', 'POST', chapters);
        // 5.1-A 自动同步今日写作字数（增量）
        await _autoLogTodayWords(newWordCount - oldWordCount);
        closeEditor();
        refreshView();
        showToast(isEdit ? '章节已更新' : '章节已添加', 'success');
    }

    function closeEditor() {
        const el = document.getElementById('chapter-editor-overlay');
        if (el) el.remove();
        document.removeEventListener('keydown', onEditorEscKey);
        // 若内联编辑器仍激活（来自全屏编辑返回），刷新内联面板以反映全屏中的保存
        if (inlineActive && editingChapter) {
            const stillExists = chapters.find(c => c.id === editingChapter.id);
            if (stillExists) {
                // 保留 editingChapter，刷新内联面板
                isInlineDirty = false;
                currentTab = 'basic';
                renderInlineEditor();
                document.querySelectorAll('.chapter-item').forEach(el => {
                    el.classList.toggle('selected', el.dataset.id === editingChapter.id);
                });
            } else {
                // 章节已被删除，关闭内联面板
                editingChapter = null;
                currentTab = 'basic';
                isInlineDirty = false;
                inlineActive = false;
                const pane = document.getElementById('ce-content');
                const empty = document.getElementById('ce-empty');
                if (pane) pane.style.display = 'none';
                if (empty) empty.style.display = '';
            }
        } else {
            editingChapter = null;
            currentTab = 'basic';
        }
    }

    // ==================== 审查跳转 ====================
    function reviewChapter(chId) {
        if (typeof window.ChapterReviewModule !== 'undefined' && window.ChapterReviewModule.setTargetChapter) {
            window.ChapterReviewModule.setTargetChapter(chId);
        } else {
            window.__pendingReviewChapterId = chId;
        }
        if (typeof ModuleRegistry !== 'undefined' && ModuleRegistry.handleNavClick) {
            ModuleRegistry.handleNavClick('chapter_review');
        }
    }

    // ==================== 删除 ====================
    async function deleteChapter(chId) {
        const ch = chapters.find(c => c.id === chId);
        if (!ch) return;
        if (!(await UIUtils.confirmDialog(`确定删除「${ch.title || '未命名'}」吗？此操作不可撤销。`))) return;
        chapters = chapters.filter(c => c.id !== chId);
        await apiRequest('/api/mod/chapters/save', 'POST', chapters);
        // 若删除的是当前内联编辑的章节，关闭内联面板
        if (editingChapter && editingChapter.id === chId) {
            editingChapter = null;
            currentTab = 'basic';
            isInlineDirty = false;
            inlineActive = false;
            const pane = document.getElementById('ce-content');
            const empty = document.getElementById('ce-empty');
            if (pane) pane.style.display = 'none';
            if (empty) empty.style.display = '';
        }
        refreshView();
        showToast('章节已删除', 'success');
    }

    // ==================== 模块辅助函数 ====================
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
            text += `  字数: ${ch.word_count || 0} | 状态: ${statusLabel(ch.status)}\n`;
            if (ch.outline) text += `  大纲: ${ch.outline}\n`;
            if (detailed && ch.notes) text += `  备注: ${ch.notes}\n`;
            if (detailed && ch.content) {
                text += `  --- 正文 ---\n${ch.content}\n  --- 正文结束 ---\n`;
            }
            text += '\n';
        });
        return text;
    }

    function searchIndexer(data, query) {
        const chs = data.chapters || [];
        const results = [];
        chs.forEach(ch => {
            if ((ch.title || '').toLowerCase().includes(query) || (ch.outline || '').toLowerCase().includes(query) || (ch.content || '').toLowerCase().includes(query)) {
                results.push({ name: `章节: ${ch.title}`, page: 'chapters', id: ch.id, content: (ch.outline || '') + '\n' + (ch.content || '') });
            }
        });
        return results;
    }

    // 条目定位：跳转到章节管理并选中该章节（供 ID 管理器/全文搜索跳转）
    function focusItem(itemId) {
        if (window.ModuleRegistry && typeof ModuleRegistry.handleNavClick === 'function') ModuleRegistry.handleNavClick('chapters');
        else if (typeof switchPage === 'function') switchPage('chapters');
        const trySelect = (attempt) => {
            if (attempt > 30) return;
            if (chapters.some(c => c.id === itemId)) {
                try { selectChapter(itemId); } catch(_) {}
                return;
            }
            setTimeout(() => trySelect(attempt + 1), 100);
        };
        trySelect(0);
    }

    // ==================== 对外 API ====================
    window.ChaptersModule = {
        // 标准 API（保留兼容）
        loadData, refreshView, showAddChapter, showEditChapter,
        deleteChapter, reviewChapter,
        exportData: () => { if (typeof exportModule === 'function') exportModule('chapters'); },
        // 新增交互入口（供 inline 事件调用）
        toggleSort, cycleStatus,
        dragStart, dragOver, dragLeave, dragEnd, drop,
        // 全屏编辑器（原 openEditor 流程）
        switchTab, updateLiveWordCount, saveEditor, closeEditor,
        // 4.2-C 内联编辑器
        selectChapter, selectNewChapter, backToList,
        switchInlineTab, markInlineDirty, updateInlineLiveWordCount,
        saveInline, cancelInline,
        openFullscreen, openFullscreenById,
        // 5.1-B 分屏编辑
        toggleInlineSplit, toggleFullSplit, updateInlinePreview, updateFullPreview,
        syncInlineScroll, syncInlinePreviewScroll, syncFullScroll, syncFullPreviewScroll,
        // 5.2-A 跳转其他写作模块
        goModule,
        // 2.2-A 术语提取
        extractTerms, runLocalExtract, runAiExtract, _termExtractToggleAll, _termExtractConfirm,
        // 5.4 正文撤销/重做
        pushUndo, doUndo, doRedo, pushFullUndo, doFullUndo, doFullRedo,
        // 1.0.0-dev 供「大纲管理」跳转前确认数据就绪
        loadData, getChapterById: (id) => chapters.find(c => c.id === id)
    };

    ModuleRegistry.register({
        id: 'chapters', name: '章节管理', icon: 'note', group: 'writing', order: 1,
        dataKeys: ['chapters', 'writing_goals'],
        previewRenderer, exportFormatter, searchIndexer, focusItem,
        pageRenderer: renderPage,
        onPageShow: () => { loadData().then(() => { refreshView(); if (chapters.length > 0 && !editingChapter) { const sorted = getSortedChapters(); selectChapter(sorted[0].id); } }); }
    });
    console.log('[Chapters] 章节管理模块已注册 (v3.2.0 升级版: 排序/拖拽/分tab编辑器/字数实时统计)');
})();
