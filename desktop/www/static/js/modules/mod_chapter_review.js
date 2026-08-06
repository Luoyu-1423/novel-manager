// ============================================================
// 模块: 章节正文审查 (mod_chapter_review.js)
// 版本: 3.2.0
// 功能:
//   - CodeMirror 编辑器显示章节正文
//   - 调用 LLM 进行纯文本审查（错字/标点/缺词/改进/伏笔/一致性）
//   - 用 markText 高亮问题，点击高亮弹出操作框
//   - 操作：替换/扩充/插入预设/查看设定/忽略
//   - 与 glossary / worldview / foreshadowing / outline 联动
// ============================================================

(function() {
    'use strict';

    // ==================== 样式 ====================
    const style = document.createElement('style');
    style.textContent = `
        .review-layout { display: grid; grid-template-columns: 1fr 320px; gap: 12px; }
        @media (max-width: 900px) { .review-layout { grid-template-columns: 1fr; } }
        .review-main { background: var(--card-bg, #fff); border: 1px solid var(--border-color, #e5e7eb); border-radius: 8px; padding: 12px; }
        .review-side { background: var(--card-bg, #fff); border: 1px solid var(--border-color, #e5e7eb); border-radius: 8px; padding: 12px; max-height: 70vh; overflow-y: auto; }
        .review-toolbar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 10px; }
        .review-toolbar select, .review-toolbar input { padding: 6px 10px; border: 1px solid var(--border-color, #e5e7eb); border-radius: 6px; background: var(--bg-color, #fff); font-size: 13px; }
        .review-progress { height: 6px; background: var(--border-color, #e5e7eb); border-radius: 3px; overflow: hidden; margin: 8px 0; }
        .review-progress-fill { height: 100%; width: 0%; background: var(--primary-color, #6366f1); transition: width 0.3s; }
        .review-editor-wrap { border: 1px solid var(--border-color, #e5e7eb); border-radius: 6px; overflow: hidden; }
        .review-editor-wrap .CodeMirror { height: 60vh; font-size: 15px; line-height: 1.8; font-family: "Microsoft YaHei", "PingFang SC", sans-serif; }
        .review-issue-item { padding: 8px 10px; border-bottom: 1px solid var(--border-color, #e5e7eb); cursor: pointer; font-size: 13px; transition: background 0.15s; }
        .review-issue-item:hover { background: var(--bg-color, #f3f4f6); }
        .review-issue-item .issue-type { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 11px; color: #fff; margin-right: 6px; }
        .review-issue-item .issue-original { color: var(--text-secondary, #6b7280); font-size: 12px; }
        .review-empty { text-align: center; color: #9ca3af; padding: 20px 0; font-size: 13px; }
        .review-issue-actions { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
        .review-issue-actions button { padding: 4px 10px; font-size: 12px; }
        .review-alternatives { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
        .review-alternatives .alt-btn { padding: 3px 10px; border: 1px solid var(--border-color, #e5e7eb); border-radius: 4px; background: var(--bg-color, #f3f4f6); cursor: pointer; font-size: 12px; }
        .review-alternatives .alt-btn:hover { background: var(--primary-color, #6366f1); color: #fff; border-color: var(--primary-color); }
        .review-context-block { background: var(--bg-color, #f9fafb); border-left: 3px solid var(--primary-color, #6366f1); padding: 8px 10px; margin-top: 6px; font-size: 12px; color: var(--text-secondary, #6b7280); white-space: pre-wrap; max-height: 160px; overflow-y: auto; }
        /* 高亮样式 */
        .cm-review-typo { background: rgba(220, 38, 38, 0.18) !important; border-bottom: 2px solid #dc2626; cursor: pointer; }
        .cm-review-punctuation { background: rgba(245, 158, 11, 0.20) !important; border-bottom: 2px solid #f59e0b; cursor: pointer; }
        .cm-review-missing { background: rgba(168, 85, 247, 0.18) !important; border-bottom: 2px solid #a855f7; cursor: pointer; }
        .cm-review-improve { background: rgba(59, 130, 246, 0.18) !important; border-bottom: 2px solid #3b82f6; cursor: pointer; }
        .cm-review-foreshadow { background: rgba(16, 185, 129, 0.18) !important; border-bottom: 2px solid #10b981; cursor: pointer; }
        .cm-review-consistency { background: rgba(236, 72, 153, 0.18) !important; border-bottom: 2px solid #ec4899; cursor: pointer; }

        /* 写作状态栏 */
        .review-status-bar {
            display: flex; align-items: center; gap: 14px;
            padding: 6px 12px; font-size: 12px;
            color: var(--text-secondary, #6b7280);
            background: var(--bg-color, #f9fafb);
            border-top: 1px solid var(--border-color, #e5e7eb);
            flex-wrap: wrap;
        }
        .review-status-bar .rsb-item { display: flex; align-items: center; gap: 4px; }
        .review-status-bar .rsb-words { color: var(--text-primary, #374151); font-weight: 600; }
        .review-status-bar .rsb-goal { color: var(--primary-color, #6366f1); }
        .review-status-bar .rsb-progress-mini {
            width: 60px; height: 4px; background: var(--border-color, #e5e7eb);
            border-radius: 2px; overflow: hidden; display: inline-block;
        }
        .review-status-bar .rsb-progress-mini-fill {
            height: 100%; background: var(--primary-color, #6366f1);
            transition: width 0.3s;
        }
        .review-status-bar .rsb-save-state { margin-left: auto; font-size: 11px; }
        .review-status-bar .rsb-save-state.saving { color: #f59e0b; }
        .review-status-bar .rsb-save-state.unsaved { color: #ef4444; }
        .review-status-bar .rsb-save-state.saved { color: #10b981; }
        .review-status-bar .rsb-shortcut { color: var(--text-secondary, #9ca3af); font-size: 11px; }
        .review-status-bar .rsb-status { color: var(--primary-color, #6366f1); font-weight: 600; }
        .review-status-bar .rsb-status.badge-planned { color: #6b7280; }
        .review-status-bar .rsb-status.badge-draft { color: #f59e0b; }
        .review-status-bar .rsb-status.badge-completed { color: #10b981; }

        /* 上下文侧栏 tab */
        .review-tabs { display: flex; border-bottom: 1px solid var(--border-color, #e5e7eb); margin-bottom: 8px; }
        .review-tab {
            padding: 6px 10px; font-size: 12px; cursor: pointer;
            color: var(--text-secondary, #6b7280);
            border-bottom: 2px solid transparent;
            transition: color 0.15s, border-color 0.15s;
            user-select: none;
        }
        .review-tab:hover { color: var(--text-primary, #374151); }
        .review-tab.active {
            color: var(--primary-color, #6366f1);
            border-bottom-color: var(--primary-color, #6366f1);
            font-weight: 600;
        }
        .review-tab .tab-badge {
            display: inline-block; min-width: 16px; padding: 0 4px;
            background: var(--border-color, #e5e7eb); color: var(--text-secondary, #6b7280);
            border-radius: 8px; font-size: 10px; text-align: center; margin-left: 4px;
        }
        .review-tab.active .tab-badge { background: var(--primary-color, #6366f1); color: #fff; }
        .review-tab-panel { display: none; }
        .review-tab-panel.active { display: block; }

        /* 大纲 tab */
        .ctx-outline-area {
            width: 100%; min-height: 200px; max-height: 50vh;
            padding: 8px; border: 1px solid var(--border-color, #e5e7eb);
            border-radius: 6px; background: var(--bg-color, #fff);
            color: var(--text-primary, #374151); font-size: 13px;
            font-family: inherit; resize: vertical; line-height: 1.6;
        }
        .ctx-outline-area:focus { border-color: var(--primary-color, #6366f1); outline: none; }
        .ctx-empty { text-align: center; color: #9ca3af; padding: 16px 0; font-size: 12px; }

        /* 术语 tab */
        .ctx-glossary-item {
            padding: 6px 8px; border-bottom: 1px solid var(--border-color, #e5e7eb);
            font-size: 12px; cursor: pointer;
        }
        .ctx-glossary-item:hover { background: var(--bg-color, #f3f4f6); }
        .ctx-glossary-item .gl-name { font-weight: 600; color: var(--text-primary, #374151); }
        .ctx-glossary-item .gl-cat {
            display: inline-block; padding: 0 5px; margin-left: 6px;
            background: var(--border-color, #e5e7eb); color: var(--text-secondary, #6b7280);
            border-radius: 3px; font-size: 10px;
        }
        .ctx-glossary-item .gl-def { color: var(--text-secondary, #6b7280); margin-top: 2px; }
        .ctx-glossary-item .gl-occurrence { color: var(--primary-color, #6366f1); font-size: 11px; margin-top: 2px; }

        /* 设定 tab */
        .ctx-setting-block { margin-bottom: 12px; }
        .ctx-setting-block h5 {
            margin: 0 0 4px 0; font-size: 12px; color: var(--text-secondary, #6b7280);
            font-weight: 600;
        }
        .ctx-setting-block .ctx-setting-body {
            font-size: 12px; color: var(--text-primary, #374151);
            line-height: 1.6; white-space: pre-wrap;
            background: var(--bg-color, #f9fafb); padding: 6px 8px; border-radius: 4px;
        }
        .ctx-foreshadow-item {
            padding: 4px 0; font-size: 12px; border-bottom: 1px dashed var(--border-color, #e5e7eb);
        }
        .ctx-foreshadow-item .fs-status {
            display: inline-block; padding: 0 5px; margin-left: 4px;
            border-radius: 3px; font-size: 10px;
        }
        .ctx-foreshadow-item .fs-status.open { background: #fef3c7; color: #92400e; }
        .ctx-foreshadow-item .fs-status.closed { background: #d1fae5; color: #065f46; }

        /* 专注模式 */
        .review-layout.focus-mode { grid-template-columns: 1fr; }
        .review-layout.focus-mode .review-side { display: none; }
        .review-layout.focus-mode .review-editor-wrap .CodeMirror { height: 75vh; }

        /* AI 浮动菜单（选中文字浮现） */
        .ai-float-menu {
            position: absolute; z-index: 50;
            display: flex; gap: 2px; padding: 4px;
            background: var(--card-bg, #fff);
            border: 1px solid var(--border-color, #e5e7eb);
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.12);
            font-size: 12px;
        }
        .ai-float-menu .ai-float-btn {
            padding: 4px 10px; cursor: pointer; border-radius: 4px;
            color: var(--text-primary, #374151);
            transition: background 0.15s;
            white-space: nowrap;
        }
        .ai-float-menu .ai-float-btn:hover { background: var(--primary-color, #6366f1); color: #fff; }
        .ai-float-menu .ai-float-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .ai-float-menu .ai-float-btn .ai-ico { margin-right: 3px; }
        .ai-float-menu .ai-float-divider { width: 1px; background: var(--border-color, #e5e7eb); margin: 2px 0; }

        /* AI 预览 modal */
        .ai-preview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 768px) { .ai-preview-grid { grid-template-columns: 1fr; } }
        .ai-preview-pane { background: var(--bg-color, #f9fafb); border: 1px solid var(--border-color, #e5e7eb); border-radius: 6px; padding: 10px; }
        .ai-preview-pane h5 { margin: 0 0 6px 0; font-size: 12px; color: var(--text-secondary, #6b7280); font-weight: 600; }
        .ai-preview-pane .ai-preview-body { font-size: 14px; line-height: 1.8; color: var(--text-primary, #374151); white-space: pre-wrap; max-height: 50vh; overflow-y: auto; font-family: "Microsoft YaHei", "PingFang SC", sans-serif; }
        .ai-preview-pane .ai-preview-empty { color: #9ca3af; font-size: 13px; padding: 20px 0; text-align: center; }
        .ai-preview-actions { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
        .ai-preview-loading { display: flex; align-items: center; gap: 8px; padding: 20px 0; justify-content: center; color: var(--primary-color, #6366f1); font-size: 13px; }
        .ai-preview-loading .ai-spinner { width: 14px; height: 14px; border: 2px solid var(--border-color, #e5e7eb); border-top-color: var(--primary-color, #6366f1); border-radius: 50%; animation: ai-spin 0.8s linear infinite; }
        @keyframes ai-spin { to { transform: rotate(360deg); } }
        .ai-preview-meta { font-size: 11px; color: var(--text-secondary, #9ca3af); margin-bottom: 6px; }

        /* AI 插入面板 */
        .ai-insert-actions { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 12px; }
        .ai-insert-action {
            padding: 10px 12px; cursor: pointer; border: 1px solid var(--border-color, #e5e7eb);
            border-radius: 6px; background: var(--card-bg, #fff); transition: all 0.15s;
            font-size: 13px; text-align: left;
        }
        .ai-insert-action:hover { border-color: var(--primary-color, #6366f1); background: var(--bg-color, #f9fafb); }
        .ai-insert-action.active { border-color: var(--primary-color, #6366f1); background: color-mix(in srgb, var(--primary-color, #6366f1) 10%, var(--bg-color, #f9fafb)); color: var(--primary-color, #6366f1); }
        .ai-insert-action .ai-action-title { font-weight: 600; margin-bottom: 2px; }
        .ai-insert-action .ai-action-desc { font-size: 11px; color: var(--text-secondary, #6b7280); }

        /* AI 历史片段列表 */
        .ai-history-item { padding: 8px 10px; border: 1px solid var(--border-color, #e5e7eb); border-radius: 6px; margin-bottom: 6px; cursor: pointer; font-size: 12px; transition: all 0.15s; }
        .ai-history-item:hover { border-color: var(--primary-color, #6366f1); background: var(--bg-color, #f9fafb); }
        .ai-history-item .ai-h-meta { color: var(--text-secondary, #6b7280); font-size: 11px; margin-bottom: 4px; }
        .ai-history-item .ai-h-preview { color: var(--text-primary, #374151); line-height: 1.5; max-height: 60px; overflow: hidden; position: relative; }
        .ai-history-item .ai-h-preview::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 16px; background: linear-gradient(transparent, var(--card-bg, #fff)); }

        /* 2.2-B 术语高亮与悬浮卡 */
        .cm-term-highlight { border-bottom: 1px dashed var(--primary-color, #6366f1); cursor: help; background: color-mix(in srgb, var(--primary-color, #6366f1) 8%, transparent); }
        .term-tooltip {
            position: fixed; z-index: 1200; max-width: 320px; padding: 10px 12px;
            background: var(--card-bg, #fff); border: 1px solid var(--border-color, #e5e7eb);
            border-radius: 8px; box-shadow: 0 6px 20px rgba(0,0,0,0.15);
            font-size: 12px; line-height: 1.5; pointer-events: auto;
        }
        .term-tooltip .tt-name { font-weight: 700; font-size: 14px; color: var(--text-primary, #374151); display: flex; align-items: center; gap: 6px; }
        .term-tooltip .tt-cat { display: inline-block; padding: 1px 6px; background: var(--bg-color, #f3f4f6); color: var(--text-secondary, #6b7280); border-radius: 3px; font-size: 10px; font-weight: 400; }
        .term-tooltip .tt-aliases { color: var(--text-secondary, #6b7280); font-size: 11px; margin-top: 4px; }
        .term-tooltip .tt-def { color: var(--text-primary, #374151); margin-top: 6px; max-height: 100px; overflow-y: auto; white-space: pre-wrap; }
        .term-tooltip .tt-empty { color: #9ca3af; font-size: 11px; margin-top: 4px; }
        .term-tooltip .tt-actions { margin-top: 8px; text-align: right; }
    `;
    document.head.appendChild(style);

    // ==================== 状态 ====================
    let chapters = [];
    let currentChapterId = null;
    let currentChapter = null;
    let editor = null;
    let marks = []; // CodeMirror TextMarker 数组
    let issues = []; // 当前展示的问题列表 [{start,end,type,original,suggestion,reason,alternatives}]
    let glossaryData = [];
    let worldviewData = {};
    let storyData = { marks: {}, foreshadowing: {} };
    let phraseLibrary = [];
    let apiConfig = null;
    let isReviewing = false;
    // 写作状态栏 + 自动保存 + 上下文侧栏
    let wordGoal = 3000;          // 单章目标字数（来自 writing_goals）
    let activeTab = 'issues';     // 当前激活的上下文 tab: issues/outline/glossary/setting
    let focusMode = false;        // 专注模式
    let saveTimer = null;         // 自动保存 debounce 定时器
    let lastSavedAt = 0;          // 上次保存时间戳
    let isDirty = false;          // 是否有未保存修改
    let isSaving = false;         // 是否正在保存
    // 阶段 3：AI 辅助
    let aiHistory = [];           // 最近生成的 AI 片段 [{action, input, output, ts}]
    let aiFloatMenu = null;       // 浮动菜单 DOM 引用
    let aiProcessing = false;     // AI 正在处理中（防重入）
    let aiCurrentReq = null;      // 当前 AI 请求上下文 { action, selectedText, hint, range }
    // 2.2-B 术语高亮
    let termMarks = [];           // 术语高亮 TextMarker 数组（独立于审查 marks）
    let termTooltip = null;       // 悬浮卡 DOM 引用
    let termTooltipBound = false; // 是否已绑定 mousemove 监听
    let termHighlightTimer = null;// 重画 debounce 定时器

    const TYPE_META = {
        typo:         { label: '错字',   color: '#dc2626', cls: 'cm-review-typo' },
        punctuation:  { label: '标点',   color: '#f59e0b', cls: 'cm-review-punctuation' },
        missing:      { label: '缺词',   color: '#a855f7', cls: 'cm-review-missing' },
        improve:      { label: '改进',   color: '#3b82f6', cls: 'cm-review-improve' },
        foreshadow:   { label: '伏笔',   color: '#10b981', cls: 'cm-review-foreshadow' },
        consistency:  { label: '一致性', color: '#ec4899', cls: 'cm-review-consistency' }
    };

    // ==================== 数据加载 ====================
    async function loadData() {
        try {
            chapters = await apiRequest('/api/mod/chapters') || [];
            glossaryData = await apiRequest('/api/mod/glossary') || [];
            worldviewData = await apiRequest('/api/mod/worldview') || {};
            storyData = await apiRequest('/api/mod/story') || { marks: {}, foreshadowing: {} };
            phraseLibrary = await apiRequest('/api/mod/phrase_library') || [];
            apiConfig = await apiRequest('/api/mod/api_config') || {};
            // 加载写作目标
            const goals = await apiRequest('/api/mod/writing_goals') || {};
            wordGoal = goals.chapter_word_goal || 3000;
        } catch(e) {
            console.error('[ChapterReview] 加载数据失败:', e);
        }
        // 处理来自 chapters 模块的待定跳转
        if (window.__pendingReviewChapterId) {
            setTargetChapter(window.__pendingReviewChapterId);
            window.__pendingReviewChapterId = null;
        } else if (!currentChapterId && chapters.length > 0) {
            // 默认选第一章
            const sorted = [...chapters].sort((a, b) => (a.order || 0) - (b.order || 0));
            setTargetChapter(sorted[0].id);
        }
        renderToolbar();
        renderIssueList();
        loadChapterIntoEditor();
        renderContextTabs();
        updateWritingStatus();
    }

    // ==================== 页面渲染 ====================
    function renderPage() {
        let html = UIUtils.renderCardPage(
            (SvgIconLib ? SvgIconLib.renderAuto('search', 18) : '🔍') + ' 章节正文审查',
            ''
        );
        html += '<div class="review-toolbar" id="review-toolbar"></div>';
        html += '<div class="review-progress"><div class="review-progress-fill" id="review-progress-fill"></div></div>';
        html += '<div class="review-layout" id="review-layout">';
        html += '<div class="review-main">';
        html += '<div class="review-editor-wrap" id="review-editor-wrap"><textarea id="review-editor"></textarea></div>';
        // 写作状态栏
        html += '<div class="review-status-bar" id="review-status-bar">';
        html += '<span class="rsb-item">状态：<span class="rsb-status" id="rsb-status">—</span></span>';
        html += '<span class="rsb-item">字数：<span class="rsb-words" id="rsb-words">0</span></span>';
        html += '<span class="rsb-item">目标：<span class="rsb-goal" id="rsb-goal">3000</span></span>';
        html += '<span class="rsb-item"><span class="rsb-progress-mini"><span class="rsb-progress-mini-fill" id="rsb-progress-fill-mini" style="width:0%"></span></span><span id="rsb-progress-text">0%</span></span>';
        html += '<span class="rsb-shortcut">Ctrl+S 保存 · Ctrl+Enter 专注</span>';
        html += '<span class="rsb-save-state saved" id="rsb-save-state">已保存</span>';
        html += '</div>';
        html += '</div>';
        html += '<div class="review-side">';
        // tab 栏
        html += '<div class="review-tabs" id="review-tabs">';
        html += '<div class="review-tab active" data-tab="issues">问题<span class="tab-badge" id="tab-badge-issues">0</span></div>';
        html += '<div class="review-tab" data-tab="outline">大纲</div>';
        html += '<div class="review-tab" data-tab="glossary">术语<span class="tab-badge" id="tab-badge-glossary">0</span></div>';
        html += '<div class="review-tab" data-tab="setting">设定</div>';
        html += '</div>';
        // tab 内容
        html += '<div class="review-tab-panel active" id="tab-panel-issues">';
        html += '<div id="review-issue-list"></div>';
        html += '</div>';
        html += '<div class="review-tab-panel" id="tab-panel-outline"></div>';
        html += '<div class="review-tab-panel" id="tab-panel-glossary"></div>';
        html += '<div class="review-tab-panel" id="tab-panel-setting"></div>';
        html += '</div>';
        html += '</div>';
        return html;
    }

    function renderToolbar() {
        const el = document.getElementById('review-toolbar');
        if (!el) return;
        const sorted = [...chapters].sort((a, b) => (a.order || 0) - (b.order || 0));
        let opts = '<option value="">— 选择章节 —</option>';
        sorted.forEach(ch => {
            const sel = ch.id === currentChapterId ? 'selected' : '';
            const wc = ch.word_count || 0;
            opts += `<option value="${ch.id}" ${sel}>${escapeHtml(ch.title || '未命名')} (${wc}字)</option>`;
        });
        el.innerHTML = `
            <select id="review-chapter-select" onchange="ChapterReviewModule.onChapterSelect(this.value)">${opts}</select>
            <button class="btn-primary btn-small" onclick="ChapterReviewModule.runReview()">🔍 开始审查</button>
            <button class="btn-small" onclick="ChapterReviewModule.saveContent()">💾 保存正文</button>
            <button class="btn-small" onclick="ChapterReviewModule.openAiInsertPanel()">✨ AI 插入</button>
            <button class="btn-small" onclick="ChapterReviewModule.showAiHistory()">🧠 AI 历史</button>
            <button class="btn-small" onclick="ChapterReviewModule.clearMarks()">🧹 清除高亮</button>
            <button class="btn-small" onclick="ChapterReviewModule.showApiConfigTip()">⚙️ API 配置</button>
            <span id="review-status" style="font-size:12px;color:var(--text-secondary,#6b7280);margin-left:auto;"></span>
        `;
    }

    // ==================== 编辑器 ====================
    function loadChapterIntoEditor() {
        currentChapter = chapters.find(c => c.id === currentChapterId);
        // 兜底：currentChapterId 无效但 chapters 有数据时，自动选第一章
        if (!currentChapter && chapters.length > 0) {
            const sorted = [...chapters].sort((a, b) => (a.order || 0) - (b.order || 0));
            currentChapterId = sorted[0].id;
            currentChapter = sorted[0];
            const sel = document.getElementById('review-chapter-select');
            if (sel) sel.value = currentChapterId;
        }
        const ta = document.getElementById('review-editor');
        if (!ta) { console.warn('[ChapterReview] #review-editor 不存在'); return; }
        if (!currentChapter) {
            ta.value = '';
            if (editor) { try { editor.setValue(''); } catch(e) {} }
            return;
        }
        // 始终先设置 textarea 值（确保 CodeMirror 不可用时内容也能显示）
        var content = currentChapter.content || '';
        ta.value = content;
        // 检查 editor 是否仍然绑定在 DOM 中
        if (editor) {
            var cmEl = null;
            try { cmEl = editor.getWrapperElement ? editor.getWrapperElement() : null; } catch(e) { cmEl = null; }
            var stillInDom = cmEl && document.body.contains(cmEl);
            var isFallback = editor._isFallback === true;
            if (!stillInDom || isFallback) {
                editor = null;
                marks = [];
                termMarks = [];
            }
        }
        if (!editor) {
            if (typeof CodeMirror === 'undefined') {
                // textarea 回退模式
                ta.style.width = '100%';
                ta.style.minHeight = '60vh';
                ta.style.fontFamily = '"Microsoft YaHei", sans-serif';
                ta.style.fontSize = '15px';
                ta.style.lineHeight = '1.8';
                ta.oninput = function() { if (currentChapter) currentChapter.content = ta.value; };
                editor = {
                    _isFallback: true,
                    getValue: function() { return ta.value; },
                    setValue: function(v) { ta.value = v; },
                    getWrapperElement: function() { return ta; },
                    on: function() {},
                    getSelection: function() {
                        try {
                            if (ta.selectionStart !== ta.selectionEnd) {
                                return ta.value.substring(ta.selectionStart, ta.selectionEnd);
                            }
                        } catch(e) {}
                        return '';
                    },
                    setOption: function() {}
                };
            } else {
                try {
                    editor = CodeMirror.fromTextArea(ta, {
                        mode: 'null',
                        lineNumbers: true,
                        lineWrapping: true,
                        indentUnit: 2,
                        tabSize: 2
                    });
                } catch(e) {
                    console.error('[ChapterReview] CodeMirror.fromTextArea 失败:', e);
                    // CodeMirror 初始化失败，保持 textarea 模式
                    ta.style.width = '100%';
                    ta.style.minHeight = '60vh';
                    ta.style.fontFamily = '"Microsoft YaHei", sans-serif';
                    ta.style.fontSize = '15px';
                    ta.style.lineHeight = '1.8';
                    ta.oninput = function() { if (currentChapter) currentChapter.content = ta.value; };
                    editor = {
                        _isFallback: true,
                        getValue: function() { return ta.value; },
                        setValue: function(v) { ta.value = v; },
                        getWrapperElement: function() { return ta; },
                        on: function() {},
                        getSelection: function() { return ''; },
                        setOption: function() {}
                    };
                }
                if (editor && !editor._isFallback) {
                    editor.on('change', function(instance) {
                        if (currentChapter) {
                            currentChapter.content = instance.getValue();
                            onContentChanged();
                        }
                    });
                    editor.on('mousedown', function(cm, e) { handleEditorClick(cm, e); });
                    editor.on('cursorActivity', function(cm) {
                        var sel = cm.getSelection();
                        if (sel && sel.length > 0 && sel.length < 2000) {
                            showAiFloatMenu(cm);
                        } else {
                            hideAiFloatMenu();
                        }
                    });
                    editor.on('blur', function() { setTimeout(hideAiFloatMenu, 200); });
                    editor.setOption('extraKeys', {
                        'Ctrl-S': function(cm) { saveContent(); },
                        'Cmd-S': function(cm) { saveContent(); },
                        'Ctrl-Enter': function(cm) { toggleFocusMode(); },
                        'Cmd-Enter': function(cm) { toggleFocusMode(); },
                        'Ctrl-R': function(cm) { triggerAiAction('rewrite'); },
                        'Cmd-R': function(cm) { triggerAiAction('rewrite'); },
                        'Ctrl-E': function(cm) { triggerAiAction('expand'); },
                        'Cmd-E': function(cm) { triggerAiAction('expand'); },
                        'Ctrl-J': function(cm) { triggerAiAction('condense'); },
                        'Cmd-J': function(cm) { triggerAiAction('condense'); }
                    });
                }
            }
        }
        if (editor && !editor._isFallback) {
            editor.setValue(content);
        } else if (editor && editor._isFallback) {
            editor.setValue(content);
        }
        // 恢复缓存的审查结果
        if (currentChapter.review_cache && currentChapter.review_cache.issues) {
            issues = currentChapter.review_cache.issues || [];
            applyMarks();
            renderIssueList();
        } else {
            issues = [];
            clearMarks();
            renderIssueList();
        }
        // 切章后：重置保存状态 + 刷新所有上下文 tab + 状态栏
        isDirty = false;
        lastSavedAt = Date.now();
        renderContextTabs();
        updateWritingStatus();
        // 2.2-B 应用术语高亮 + 绑定悬浮卡
        applyTermHighlights();
        bindTermTooltip();
    }

    function handleEditorClick(cm, e) {
        const pos = cm.coordsChar({ left: e.clientX, top: e.clientY });
        const marksAt = cm.findMarksAt(pos);
        if (marksAt.length > 0) {
            const m = marksAt[0];
            const data = m.__reviewIssue;
            if (data) showIssueActionPanel(data, m);
        }
    }

    // ==================== 审查流程 ====================
    function setTargetChapter(chId) {
        currentChapterId = chId;
        // 如果工具栏已渲染，更新选中状态
        const sel = document.getElementById('review-chapter-select');
        if (sel) sel.value = chId;
        loadChapterIntoEditor();
        renderChapterPreview(chId);
    }

    function onChapterSelect(chId) {
        currentChapterId = chId;
        loadChapterIntoEditor();
        renderChapterPreview(chId);
    }

    async function runReview() {
        if (!currentChapter) { showToast('请先选择章节', 'error'); return; }
        if (!(currentChapter.content || '').trim()) { showToast('章节正文为空，请先填写正文', 'error'); return; }
        if (!apiConfig || !apiConfig.api_url) {
            showToast('请先在「系统 → API 配置」中设置 API 地址', 'error');
            return;
        }
        if (isReviewing) return;
        isReviewing = true;
        setProgress(10);
        setStatus('正在准备审查上下文...');
        try {
            const context = buildReviewContext(currentChapter);
            setProgress(30);
            setStatus('正在调用 LLM 审查...');
            const resp = await callLLM(apiConfig, context, currentChapter.content);
            setProgress(80);
            const parsed = parseLLMResponse(resp);
            issues = parsed;
            // 写入缓存
            currentChapter.review_cache = {
                timestamp: Date.now(),
                issues: issues
            };
            await saveChapters();
            applyMarks();
            renderIssueList();
            // 写入审查历史
            await appendReviewHistory(currentChapter.id, issues.length, issues);
            setProgress(100);
            setStatus(`审查完成，发现 ${issues.length} 项问题`);
            showToast(`审查完成，发现 ${issues.length} 项问题`, 'success');
        } catch(e) {
            console.error('[ChapterReview] 审查失败:', e);
            setStatus('审查失败: ' + e.message);
            showToast('审查失败: ' + e.message, 'error');
        } finally {
            isReviewing = false;
            setTimeout(() => setProgress(0), 2000);
        }
    }

    function buildReviewContext(ch) {
        const parts = [];
        // 1. 章节大纲
        if (ch.outline) parts.push('【本章大纲】\n' + ch.outline);
        // 2. 术语表
        if (glossaryData.length > 0) {
            const t = glossaryData.slice(0, 60).map(g => {
                let s = g.name;
                if (g.aliases && g.aliases.length) s += `（别名：${g.aliases.join('、')}）`;
                if (g.definition) s += `：${g.definition}`;
                return s;
            }).join('\n');
            parts.push('【术语表（须保持一致）】\n' + t);
        }
        // 3. 世界观
        if (worldviewData && Object.keys(worldviewData).length > 0) {
            try {
                const t = JSON.stringify(worldviewData).slice(0, 2000);
                parts.push('【世界观设定】\n' + t);
            } catch(_) {}
        }
        // 4. 伏笔 / 剧情标记
        if (storyData) {
            const fs = storyData.foreshadowing || {};
            const ms = storyData.marks || {};
            const fArr = Array.isArray(fs) ? fs : (Object.values(fs) || []);
            const mArr = Array.isArray(ms) ? ms : (Object.values(ms) || []);
            if (fArr.length > 0) {
                parts.push('【已埋伏笔（请检查本章是否呼应/冲突）】\n' + fArr.slice(0, 30).map(f => typeof f === 'string' ? f : (f.title || f.name || JSON.stringify(f))).join('\n'));
            }
            if (mArr.length > 0) {
                parts.push('【剧情标记】\n' + mArr.slice(0, 30).map(m => typeof m === 'string' ? m : (m.title || m.name || JSON.stringify(m))).join('\n'));
            }
        }
        return parts.join('\n\n');
    }

    async function callLLM(cfg, context, content) {
        const sys = cfg.system_prompt && cfg.system_prompt.trim()
            ? cfg.system_prompt
            : getDefaultSystemPrompt();
        const userMsg = `下面是本次审查的设定上下文与章节正文，请按协议返回 JSON。\n\n${context}\n\n【章节正文】\n${content}`;
        const body = {
            model: cfg.model || '',
            messages: [
                { role: 'system', content: sys },
                { role: 'user', content: userMsg }
            ],
            temperature: typeof cfg.temperature === 'number' ? cfg.temperature : 0.3,
            max_tokens: cfg.max_tokens || 4096,
            stream: false
        };
        const headers = { 'Content-Type': 'application/json' };
        if (cfg.api_key) headers['Authorization'] = 'Bearer ' + cfg.api_key;
        const resp = await fetch(cfg.api_url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        });
        if (!resp.ok) {
            const txt = await resp.text().catch(() => '');
            throw new Error(`HTTP ${resp.status} ${resp.statusText} ${txt.slice(0, 200)}`);
        }
        const data = await resp.json();
        // OpenAI 兼容格式
        if (data && data.choices && data.choices[0] && data.choices[0].message) {
            return data.choices[0].message.content || '';
        }
        // 兼容部分返回原文本
        if (typeof data === 'string') return data;
        return JSON.stringify(data);
    }

    function getDefaultSystemPrompt() {
        return [
            '你是一位严谨的中文小说编辑。请对给出的章节正文进行审查，并按以下 JSON 协议返回结果（仅输出 JSON，不要任何解释文字）：',
            '{',
            '  "issues": [',
            '    {',
            '      "start": 数字, // 问题在正文中的起始字符偏移（从 0 开始，按 UTF-16 code unit 计）',
            '      "end": 数字,   // 问题结束偏移（不含）',
            '      "type": "typo|punctuation|missing|improve|foreshadow|consistency",',
            '      "original": "原文片段",',
            '      "suggestion": "建议替换文本（可空）",',
            '      "reason": "原因说明",',
            '      "alternatives": ["备选1", "备选2"]',
            '    }',
            '  ]',
            '}',
            '审查维度：',
            '1. typo 错别字词',
            '2. punctuation 标点符号误用',
            '3. missing 缺词漏字',
            '4. improve 行文改进建议（更流畅/更具表现力）',
            '5. foreshadow 与已埋伏笔的呼应或冲突提示',
            '6. consistency 与术语表/世界观/大纲的名称或设定不一致',
            '若 start/end 无法精确给出，请尽量给出能定位的原文片段 original；偏移量基于原始正文，不含上下文。'
        ].join('\n');
    }

    function parseLLMResponse(text) {
        if (!text) return [];
        // 抽取 JSON
        let jsonStr = text.trim();
        const fenced = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fenced) jsonStr = fenced[1].trim();
        // 尝试直接解析；失败则抓第一个 { 到最后一个 }
        let obj;
        try {
            obj = JSON.parse(jsonStr);
        } catch(_) {
            const s = jsonStr.indexOf('{');
            const e = jsonStr.lastIndexOf('}');
            if (s >= 0 && e > s) {
                try { obj = JSON.parse(jsonStr.slice(s, e + 1)); } catch(__) { return []; }
            } else {
                return [];
            }
        }
        let arr = [];
        if (Array.isArray(obj)) arr = obj;
        else if (obj && Array.isArray(obj.issues)) arr = obj.issues;
        // 规整字段
        return arr.map(it => ({
            start: Number.isFinite(it.start) ? it.start : -1,
            end: Number.isFinite(it.end) ? it.end : -1,
            type: TYPE_META[it.type] ? it.type : 'improve',
            original: it.original || '',
            suggestion: it.suggestion || '',
            reason: it.reason || '',
            alternatives: Array.isArray(it.alternatives) ? it.alternatives.filter(Boolean) : []
        })).filter(it => it.start >= 0 || it.original);
    }

    // ==================== 高亮标记 ====================
    function applyMarks() {
        clearMarks();
        if (!editor) return;
        const text = editor.getValue();
        issues.forEach((it, idx) => {
            let from = resolvePos(text, it.start);
            let to = resolvePos(text, it.end);
            // 若偏移无效，则按 original 文本首次出现定位
            if ((from < 0 || to < 0 || to <= from) && it.original) {
                const found = text.indexOf(it.original);
                if (found >= 0) {
                    from = found;
                    to = found + it.original.length;
                }
            }
            if (from < 0 || to < 0 || to <= from) return; // 无法定位，跳过（仍保留在清单中）
            const meta = TYPE_META[it.type] || TYPE_META.improve;
            const m = editor.markText(
                editor.posFromIndex(from),
                editor.posFromIndex(to),
                { className: meta.cls }
            );
            m.__reviewIssue = { ...it, _index: idx };
            marks.push(m);
        });
    }

    function resolvePos(text, idx) {
        if (!Number.isFinite(idx) || idx < 0) return -1;
        if (idx > text.length) return text.length;
        return idx;
    }

    function clearMarks() {
        marks.forEach(m => { try { m.clear(); } catch(_) {} });
        marks = [];
    }

    // ==================== 2.2-B 术语高亮与悬浮卡 ====================
    // 转义正则特殊字符
    function escapeRegExp(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

    // 构建术语 -> 术语对象 的映射（含别名），并返回按长度降序排序的匹配字符串列表
    function buildTermMatcher() {
        const map = {}; // key: term/alias, value: glossary item
        glossaryData.forEach(g => {
            if (g.name && g.name.length >= 2) map[g.name] = g;
            (g.aliases || []).forEach(a => { if (a && a.length >= 2 && !map[a]) map[a] = g; });
        });
        const names = Object.keys(map).sort((a, b) => b.length - a.length);
        return { map, names };
    }

    function clearTermMarks() {
        termMarks.forEach(m => { try { m.clear(); } catch(_) {} });
        termMarks = [];
    }

    // 扫描正文，对术语出现位置应用 markText 高亮
    async function applyTermHighlights() {
        if (!editor) return;
        clearTermMarks();
        // 按需加载 glossaryData（避免模块切换时数据未就绪）
        if (!glossaryData || glossaryData.length === 0) {
            try { glossaryData = await apiRequest('/api/mod/glossary') || []; } catch(_) {}
        }
        if (!glossaryData || glossaryData.length === 0) return;
        const text = editor.getValue() || '';
        if (!text) return;
        const { map, names } = buildTermMatcher();
        if (names.length === 0) return;
        // 单次正则扫描全文，匹配任意术语
        const pattern = new RegExp(names.map(escapeRegExp).join('|'), 'g');
        let m;
        let count = 0;
        const MAX_HIGHLIGHTS = 800; // 防止超长文档卡顿
        while ((m = pattern.exec(text)) !== null) {
            const hit = m[0];
            const g = map[hit];
            if (!g) continue;
            const from = m.index;
            const to = from + hit.length;
            try {
                const marker = editor.markText(
                    editor.posFromIndex(from),
                    editor.posFromIndex(to),
                    { className: 'cm-term-highlight', startStyle: '', endStyle: '' }
                );
                marker.__termInfo = g;
                termMarks.push(marker);
                count++;
                if (count >= MAX_HIGHLIGHTS) break;
            } catch(_) {}
            // 防止零宽匹配死循环
            if (m.index === pattern.lastIndex) pattern.lastIndex++;
        }
    }

    // debounce 版本，供 change 事件调用
    function scheduleTermHighlight() {
        if (termHighlightTimer) clearTimeout(termHighlightTimer);
        termHighlightTimer = setTimeout(() => {
            termHighlightTimer = null;
            applyTermHighlights();
        }, 500);
    }

    // 悬浮卡 DOM（lazy 创建）
    function ensureTermTooltip() {
        if (termTooltip) return termTooltip;
        termTooltip = document.createElement('div');
        termTooltip.className = 'term-tooltip';
        termTooltip.style.display = 'none';
        termTooltip.addEventListener('mouseleave', hideTermTooltip);
        termTooltip.addEventListener('click', (e) => {
            // 点击「查看详情」按钮
            const btn = e.target.closest('.tt-detail-btn');
            if (!btn) return;
            const id = btn.dataset.id;
            hideTermTooltip();
            if (window.GlossaryModule && typeof window.GlossaryModule.openTermDetail === 'function') {
                window.GlossaryModule.openTermDetail(id);
            } else if (window.GlossaryModule && typeof window.GlossaryModule.showEditTerm === 'function') {
                window.GlossaryModule.showEditTerm(id);
            } else {
                // 跳转术语表页面
                if (typeof switchPage === 'function') switchPage('glossary');
            }
        });
        document.body.appendChild(termTooltip);
        return termTooltip;
    }

    function showTermTooltip(info, x, y) {
        const tt = ensureTermTooltip();
        const aliasesHtml = (info.aliases && info.aliases.length)
            ? `<div class="tt-aliases">别名：${escapeHtml(info.aliases.join('、'))}</div>` : '';
        const defHtml = info.definition
            ? `<div class="tt-def">${escapeHtml(info.definition)}</div>`
            : '<div class="tt-empty">暂无释义</div>';
        tt.innerHTML = `
            <div class="tt-name">${escapeHtml(info.name)}${info.category ? '<span class="tt-cat">' + escapeHtml(info.category) + '</span>' : ''}</div>
            ${aliasesHtml}
            ${defHtml}
            <div class="tt-actions"><button class="btn-tiny tt-detail-btn" data-id="${escapeHtml(info.id)}">查看详情 →</button></div>
        `;
        tt.style.display = 'block';
        // 定位（避免溢出视口）
        const r = tt.getBoundingClientRect();
        let left = x + 12;
        let top = y + 12;
        if (left + r.width > window.innerWidth - 8) left = x - r.width - 12;
        if (top + r.height > window.innerHeight - 8) top = y - r.height - 12;
        if (left < 8) left = 8;
        if (top < 8) top = 8;
        tt.style.left = left + 'px';
        tt.style.top = top + 'px';
    }

    function hideTermTooltip() {
        if (termTooltip) termTooltip.style.display = 'none';
    }

    // 绑定编辑器 mousemove，节流检测术语 mark 并显示悬浮卡
    function bindTermTooltip() {
        if (termTooltipBound || !editor) return;
        const cmWrap = editor.getWrapperElement ? editor.getWrapperElement() : null;
        if (!cmWrap) return;
        let lastTs = 0;
        cmWrap.addEventListener('mousemove', (e) => {
            const now = Date.now();
            if (now - lastTs < 60) return; // 节流 60ms
            lastTs = now;
            const pos = editor.coordsChar({ left: e.clientX, top: e.clientY });
            const ms = editor.findMarksAt(pos);
            const tm = ms.find(m => m.__termInfo);
            if (tm) {
                showTermTooltip(tm.__termInfo, e.clientX, e.clientY);
            } else {
                hideTermTooltip();
            }
        });
        cmWrap.addEventListener('mouseleave', hideTermTooltip);
        // 滚动时隐藏
        editor.on('scroll', hideTermTooltip);
        termTooltipBound = true;
    }

    // 供外部模块（glossary）调用：术语表变化后刷新高亮
    function refreshGlossary(data) {
        if (Array.isArray(data)) glossaryData = data;
        applyTermHighlights();
        if (activeTab === 'glossary') renderGlossaryTab();
    }


    // ==================== 问题清单 ====================
    function renderIssueList() {
        const el = document.getElementById('review-issue-list');
        if (!el) return;
        // 更新 tab badge
        const badge = document.getElementById('tab-badge-issues');
        if (badge) badge.textContent = issues.length;
        if (issues.length === 0) {
            el.innerHTML = '<div class="review-empty">暂无审查问题<br>点击「开始审查」或选择已审查章节</div>';
            return;
        }
        let html = '';
        issues.forEach((it, idx) => {
            const meta = TYPE_META[it.type] || TYPE_META.improve;
            html += `<div class="review-issue-item" onclick="ChapterReviewModule.locateIssue(${idx})">`;
            html += `<span class="issue-type" style="background:${meta.color};">${meta.label}</span>`;
            if (it.original) html += `<span class="issue-original">「${escapeHtml(it.original)}」</span>`;
            html += `<div style="margin-top:4px;font-size:12px;color:var(--text-secondary,#6b7280);">${escapeHtml(it.reason || '')}</div>`;
            if (it.suggestion) html += `<div style="margin-top:4px;font-size:12px;color:#10b981;">建议: ${escapeHtml(it.suggestion)}</div>`;
            html += `</div>`;
        });
        el.innerHTML = html;
    }

    function locateIssue(idx) {
        const it = issues[idx];
        if (!it || !editor) return;
        const text = editor.getValue();
        let from = resolvePos(text, it.start);
        let to = resolvePos(text, it.end);
        if ((from < 0 || to < 0 || to <= from) && it.original) {
            const found = text.indexOf(it.original);
            if (found >= 0) { from = found; to = found + it.original.length; }
        }
        if (from < 0) { showToast('无法定位此问题', 'error'); return; }
        const fromPos = editor.posFromIndex(from);
        editor.scrollIntoView({ line: fromPos.line, ch: fromPos.ch }, 100);
        editor.setCursor(fromPos);
        editor.focus();
        // 弹出操作框
        const m = marks.find(mk => mk.__reviewIssue && mk.__reviewIssue._index === idx);
        showIssueActionPanel({ ...it, _index: idx }, m);
    }

    // ==================== 问题操作面板 ====================
    function showIssueActionPanel(it, marker) {
        const meta = TYPE_META[it.type] || TYPE_META.improve;
        let html = `<div style="font-size:13px;line-height:1.6;">`;
        html += `<div><span class="issue-type" style="background:${meta.color};">${meta.label}</span>`;
        if (it.original) html += ` <strong>「${escapeHtml(it.original)}」</strong>`;
        html += `</div>`;
        if (it.reason) html += `<div style="margin-top:6px;color:var(--text-secondary,#6b7280);">原因: ${escapeHtml(it.reason)}</div>`;
        if (it.suggestion) html += `<div style="margin-top:6px;color:#10b981;">建议: ${escapeHtml(it.suggestion)}</div>`;
        // 备选项
        if (it.alternatives && it.alternatives.length > 0) {
            html += `<div style="margin-top:8px;font-size:12px;">备选替换:</div>`;
            html += `<div class="review-alternatives">`;
            it.alternatives.forEach((alt, i) => {
                html += `<span class="alt-btn" onclick="ChapterReviewModule.applyAlternative(${it._index}, ${i})">${escapeHtml(alt)}</span>`;
            });
            html += `</div>`;
        }
        html += `<div class="review-issue-actions">`;
        if (it.suggestion) html += `<button class="btn-primary btn-tiny" onclick="ChapterReviewModule.applySuggestion(${it._index})">替换为建议</button>`;
        html += `<button class="btn-tiny" onclick="ChapterReviewModule.expandToSuggestion(${it._index})">扩充</button>`;
        html += `<button class="btn-tiny" onclick="ChapterReviewModule.openPhrasePicker(${it._index})">插入预设</button>`;
        html += `<button class="btn-tiny" onclick="ChapterReviewModule.showSettingRef(${it._index})">查看设定</button>`;
        html += `<button class="btn-tiny btn-danger" onclick="ChapterReviewModule.ignoreIssue(${it._index})">忽略</button>`;
        html += `</div>`;
        // 设定上下文区
        html += `<div id="review-setting-ref" class="review-context-block" style="display:none;"></div>`;
        html += `</div>`;
        showModal(`问题操作 - ${meta.label}`, html, [
            { text: '关闭', class: 'btn-secondary', action: () => closeModal() }
        ]);
        // 缓存当前面板的目标 issue 与 marker
        window.__currentReviewIssue = { it, marker };
    }

    function applySuggestion(idx) {
        const it = issues[idx];
        if (!it || !it.suggestion || !editor) return;
        replaceIssueRange(it, it.suggestion);
        showToast('已替换', 'success');
        removeIssue(idx);
        closeModal();
    }

    function applyAlternative(idx, altIdx) {
        const it = issues[idx];
        if (!it || !it.alternatives || !it.alternatives[altIdx]) return;
        replaceIssueRange(it, it.alternatives[altIdx]);
        showToast('已替换为备选', 'success');
        removeIssue(idx);
        closeModal();
    }

    function replaceIssueRange(it, newText) {
        if (!editor) return;
        const text = editor.getValue();
        let from = resolvePos(text, it.start);
        let to = resolvePos(text, it.end);
        if ((from < 0 || to < 0 || to <= from) && it.original) {
            const found = text.indexOf(it.original);
            if (found >= 0) { from = found; to = found + it.original.length; }
        }
        if (from < 0 || to < 0 || to <= from) { showToast('无法定位原文', 'error'); return; }
        editor.replaceRange(newText,
            editor.posFromIndex(from),
            editor.posFromIndex(to)
        );
        // 同步 currentChapter.content
        currentChapter.content = editor.getValue();
    }

    function expandToSuggestion(idx) {
        const it = issues[idx];
        if (!it || !editor) return;
        // 在原文位置之后追加建议（扩充）
        const text = editor.getValue();
        let from = resolvePos(text, it.start);
        let to = resolvePos(text, it.end);
        if ((from < 0 || to < 0 || to <= from) && it.original) {
            const found = text.indexOf(it.original);
            if (found >= 0) { from = found; to = found + it.original.length; }
        }
        if (to < 0) { showToast('无法定位原文', 'error'); return; }
        const insertText = (it.suggestion ? '（' + it.suggestion + '）' : '');
        const pos = editor.posFromIndex(to);
        editor.replaceRange(insertText, CodeMirror.Pos(pos.line, pos.ch));
        currentChapter.content = editor.getValue();
        showToast('已追加扩充文本', 'success');
        closeModal();
    }

    function openPhrasePicker(idx) {
        if (phraseLibrary.length === 0) {
            showToast('预设文本库为空，请先在「写作辅助 → 预设文本库」中添加', 'error');
            return;
        }
        // 分类筛选
        const cats = [...new Set(phraseLibrary.map(p => p.category || '未分类'))];
        let html = `<div style="display:flex;flex-direction:column;gap:10px;">`;
        html += `<div style="display:flex;gap:6px;flex-wrap:wrap;">`;
        html += `<button class="btn-tiny" data-cat="" onclick="ChapterReviewModule.filterPhrase('')">全部</button>`;
        cats.forEach(c => {
            html += `<button class="btn-tiny" data-cat="${escapeHtml(c)}" onclick="ChapterReviewModule.filterPhrase('${escapeHtml(c).replace(/'/g, "\\'")}')">${escapeHtml(c)}</button>`;
        });
        html += `</div>`;
        html += `<div id="phrase-picker-list" style="max-height:50vh;overflow-y:auto;"></div>`;
        html += `</div>`;
        showModal('插入预设文本', html, [
            { text: '取消', class: 'btn-secondary', action: () => closeModal() }
        ]);
        window.__phrasePickerTargetIdx = idx;
        filterPhrase('');
    }

    function filterPhrase(cat) {
        const list = document.getElementById('phrase-picker-list');
        if (!list) return;
        let items = phraseLibrary;
        if (cat) items = items.filter(p => (p.category || '未分类') === cat);
        if (items.length === 0) {
            list.innerHTML = '<div class="review-empty">该分类下无预设</div>';
            return;
        }
        let html = '';
        items.forEach((p, i) => {
            const realIdx = phraseLibrary.indexOf(p);
            html += `<div class="review-issue-item" onclick="ChapterReviewModule.insertPhrase(${realIdx})">`;
            if (p.category) html += `<span class="issue-type" style="background:var(--primary-color,#6366f1);">${escapeHtml(p.category)}</span>`;
            html += `<div style="margin-top:4px;">${escapeHtml(p.content).slice(0, 80)}${p.content.length > 80 ? '...' : ''}</div>`;
            if (p.tags && p.tags.length) html += `<div style="font-size:11px;color:var(--text-secondary,#6b7280);">${p.tags.map(t=>'#'+escapeHtml(t)).join(' ')}</div>`;
            html += `</div>`;
        });
        list.innerHTML = html;
    }

    function insertPhrase(realIdx) {
        const p = phraseLibrary[realIdx];
        if (!p || !editor) return;
        const cursor = editor.getCursor();
        editor.replaceRange(p.content, CodeMirror.Pos(cursor.line, cursor.ch));
        currentChapter.content = editor.getValue();
        showToast('已插入预设文本', 'success');
        closeModal();
    }

    function showSettingRef(idx) {
        const it = issues[idx];
        const box = document.getElementById('review-setting-ref');
        if (!box || !it) return;
        const q = (it.original || '').trim();
        const matches = [];
        // 术语表
        glossaryData.forEach(g => {
            if (q && (g.name === q || (g.aliases || []).includes(q))) {
                matches.push(`【术语】${g.name}: ${g.definition || ''}`);
            }
        });
        // 世界观（字符串匹配）
        const wvHits = [];
        const walkWv = (obj, path) => {
            if (!obj) return;
            if (typeof obj === 'string') {
                if (q && obj.includes(q)) wvHits.push(`${path}: ${obj.slice(0, 100)}`);
            } else if (Array.isArray(obj)) {
                obj.forEach((v, i) => walkWv(v, `${path}[${i}]`));
            } else if (typeof obj === 'object') {
                Object.keys(obj).forEach(k => walkWv(obj[k], path ? path + '.' + k : k));
            }
        };
        walkWv(worldviewData, '');
        if (wvHits.length) matches.push(...wvHits.slice(0, 5).map(s => '【世界观】' + s));
        // 伏笔
        const fs = storyData && (Array.isArray(storyData.foreshadowing) ? storyData.foreshadowing : Object.values(storyData.foreshadowing || {}));
        (fs || []).forEach(f => {
            const s = typeof f === 'string' ? f : JSON.stringify(f);
            if (q && s.includes(q)) matches.push('【伏笔】' + s.slice(0, 100));
        });
        box.style.display = '';
        box.textContent = matches.length ? matches.join('\n\n') : '未在设定中找到相关条目';
    }

    function ignoreIssue(idx) {
        removeIssue(idx);
        closeModal();
        showToast('已忽略', 'success');
    }

    function removeIssue(idx) {
        issues.splice(idx, 1);
        // 重新计算 _index 并重画
        if (currentChapter) {
            currentChapter.review_cache = { timestamp: Date.now(), issues: issues };
            saveChapters();
        }
        applyMarks();
        renderIssueList();
    }

    // ==================== 保存 ====================
    async function saveContent() {
        if (!currentChapter) { showToast('未选择章节', 'error'); return; }
        if (editor) currentChapter.content = editor.getValue();
        // 根据正文重算字数（按字符数）
        currentChapter.word_count = (currentChapter.content || '').replace(/\s/g, '').length;
        isSaving = true;
        updateWritingStatus();
        try {
            await saveChapters();
            isDirty = false;
            lastSavedAt = Date.now();
            // 同步外部 chapters 模块的内存数据
            if (window.ChaptersModule && typeof window.ChaptersModule.refreshView === 'function') {
                // 章节列表上的字数和进度需刷新
                try { window.ChaptersModule.refreshView(); } catch(_) {}
            }
            showToast('正文已保存', 'success');
        } finally {
            isSaving = false;
            updateWritingStatus();
        }
    }

    // 内容变更：标记 dirty + 触发自动保存
    function onContentChanged() {
        isDirty = true;
        updateWritingStatus();
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            saveTimer = null;
            // 静默自动保存（不弹 toast）
            silentAutoSave();
        }, 1500);
        // 2.2-B 术语高亮 debounce 重画
        scheduleTermHighlight();
    }

    async function silentAutoSave() {
        if (!currentChapter || !isDirty || isSaving) return;
        if (editor) currentChapter.content = editor.getValue();
        currentChapter.word_count = (currentChapter.content || '').replace(/\s/g, '').length;
        isSaving = true;
        updateWritingStatus();
        try {
            await saveChapters();
            isDirty = false;
            lastSavedAt = Date.now();
            if (window.ChaptersModule && typeof window.ChaptersModule.refreshView === 'function') {
                try { window.ChaptersModule.refreshView(); } catch(_) {}
            }
            // 术语 tab 中"出现次数"会随正文变化，刷新当前 glossary tab
            if (activeTab === 'glossary') renderGlossaryTab();
        } catch(e) {
            console.error('[ChapterReview] 自动保存失败:', e);
        } finally {
            isSaving = false;
            updateWritingStatus();
        }
    }

    async function saveChapters() {
        try {
            await apiRequest('/api/mod/chapters/save', 'POST', chapters);
        } catch(e) { console.error('[ChapterReview] 保存章节失败:', e); }
    }

    async function appendReviewHistory(chId, count, issueList) {
        try {
            const history = await apiRequest('/api/mod/review_history') || [];
            history.unshift({
                id: 'rv_' + Date.now(),
                chapter_id: chId,
                timestamp: Date.now(),
                issue_count: count,
                issues: issueList
            });
            // 保留最近 100 条
            if (history.length > 100) history.length = 100;
            await apiRequest('/api/mod/review_history/save', 'POST', history);
        } catch(e) { console.warn('[ChapterReview] 写入审查历史失败:', e); }
    }

    // ==================== 写作状态栏 ====================
    function updateWritingStatus() {
        const wordsEl = document.getElementById('rsb-words');
        const goalEl = document.getElementById('rsb-goal');
        const fillEl = document.getElementById('rsb-progress-fill-mini');
        const textEl = document.getElementById('rsb-progress-text');
        const stateEl = document.getElementById('rsb-save-state');
        const statusEl = document.getElementById('rsb-status');
        if (!wordsEl) return;

        // 章节状态徽章
        if (statusEl) {
            const st = currentChapter ? (currentChapter.status || 'planned') : '';
            const label = st === 'completed' ? '已完成' : st === 'draft' ? '草稿' : st === 'planned' ? '计划中' : st;
            statusEl.textContent = label || '—';
            statusEl.className = 'rsb-status badge-' + (st || 'planned');
        }

        // 实时字数：从编辑器读，避免依赖已保存的 word_count
        let words = 0;
        if (editor) {
            const text = editor.getValue() || '';
            words = text.replace(/\s/g, '').length;
        } else if (currentChapter) {
            words = (currentChapter.content || '').replace(/\s/g, '').length;
        }
        wordsEl.textContent = words.toLocaleString();
        if (goalEl) goalEl.textContent = wordGoal.toLocaleString();
        const progress = wordGoal > 0 ? Math.min(100, Math.round(words / wordGoal * 100)) : 0;
        if (fillEl) fillEl.style.width = progress + '%';
        if (textEl) textEl.textContent = progress + '%';

        // 保存状态
        if (stateEl) {
            stateEl.classList.remove('saving', 'unsaved', 'saved');
            let label = '已保存';
            if (isSaving) { stateEl.classList.add('saving'); label = '保存中…'; }
            else if (isDirty) { stateEl.classList.add('unsaved'); label = '未保存'; }
            else {
                stateEl.classList.add('saved');
                if (lastSavedAt > 0) {
                    const dt = Math.floor((Date.now() - lastSavedAt) / 1000);
                    if (dt < 5) label = '刚刚保存';
                    else if (dt < 60) label = dt + ' 秒前保存';
                    else if (dt < 3600) label = Math.floor(dt / 60) + ' 分钟前保存';
                    else label = new Date(lastSavedAt).toLocaleTimeString();
                }
            }
            stateEl.textContent = label;
        }
    }

    // 渲染章节预览头部信息（标题/字数/状态徽章），供 setTargetChapter 后调用
    function renderChapterPreview(chId) {
        if (!chId) return;
        const ch = chapters.find(c => c.id === chId);
        if (!ch) return;
        // 更新工具栏下拉选中
        const sel = document.getElementById('review-chapter-select');
        if (sel) sel.value = chId;
        // 更新状态栏（含状态徽章）
        updateWritingStatus();
        // 更新文档标题提示
        const wrap = document.getElementById('review-editor-wrap');
        if (wrap) {
            wrap.setAttribute('data-chapter-title', ch.title || '未命名');
            wrap.setAttribute('data-chapter-id', ch.id || '');
        }
    }

    // ==================== 上下文侧栏 tab ====================
    function renderContextTabs() {
        renderOutlineTab();
        renderGlossaryTab();
        renderSettingTab();
        bindTabClicks();
    }

    function bindTabClicks() {
        const tabs = document.getElementById('review-tabs');
        if (!tabs || tabs.__bound) return;
        tabs.__bound = true;
        tabs.addEventListener('click', function(e) {
            const t = e.target.closest('.review-tab');
            if (!t) return;
            switchTab(t.getAttribute('data-tab'));
        });
    }

    function switchTab(name) {
        activeTab = name;
        document.querySelectorAll('#review-tabs .review-tab').forEach(el => {
            el.classList.toggle('active', el.getAttribute('data-tab') === name);
        });
        document.querySelectorAll('.review-tab-panel').forEach(el => {
            el.classList.toggle('active', el.id === 'tab-panel-' + name);
        });
        // 切到 glossary/setting 时若内容为空则渲染
        if (name === 'glossary') renderGlossaryTab();
        if (name === 'setting') renderSettingTab();
        if (name === 'outline') renderOutlineTab();
    }

    // ---- 大纲 tab ----
    function renderOutlineTab() {
        const el = document.getElementById('tab-panel-outline');
        if (!el) return;
        if (!currentChapter) {
            el.innerHTML = '<div class="ctx-empty">未选择章节</div>';
            return;
        }
        // 编辑大纲 + 元信息
        const ch = currentChapter;
        const meta = [
            '状态：' + (ch.status === 'completed' ? '已完成' : ch.status === 'draft' ? '草稿' : ch.status === 'planned' ? '计划中' : (ch.status || '未知')),
            '字数：' + (ch.word_count || 0),
            ch.notes ? '备注：' + ch.notes : ''
        ].filter(Boolean).join(' · ');
        el.innerHTML = `
            <div style="font-size:12px;color:var(--text-secondary,#6b7280);margin-bottom:6px;">${escapeHtml(meta)}</div>
            <label style="font-size:12px;color:var(--text-secondary,#6b7280);display:block;margin-bottom:4px;">章节大纲（修改后失焦自动保存）</label>
            <textarea class="ctx-outline-area" id="ctx-outline-input" placeholder="本章要发生什么？大纲、关键情节、人物动机…">${escapeHtml(ch.outline || '')}</textarea>
        `;
        const ta = document.getElementById('ctx-outline-input');
        if (ta) {
            ta.addEventListener('blur', async function() {
                if (!currentChapter) return;
                const v = ta.value.trim();
                if (v === (currentChapter.outline || '')) return;
                currentChapter.outline = v;
                await saveChapters();
                lastSavedAt = Date.now();
                showToast('大纲已保存', 'success');
            });
            // Ctrl+S 在大纲输入框中也触发保存
            ta.addEventListener('keydown', function(e) {
                if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                    e.preventDefault();
                    ta.blur();
                    saveContent();
                }
            });
        }
    }

    // ---- 术语 tab ----
    function renderGlossaryTab() {
        const el = document.getElementById('tab-panel-glossary');
        if (!el) return;
        // 统计每个术语在本章正文中出现的次数
        const text = currentChapter ? (currentChapter.content || '') : '';
        const matched = [];
        const unmatched = [];
        glossaryData.forEach(g => {
            const names = [g.name].concat(g.aliases || []).filter(Boolean);
            let count = 0;
            names.forEach(n => {
                if (!n) return;
                // 简单子串计数
                let idx = 0;
                while ((idx = text.indexOf(n, idx)) !== -1) { count++; idx += n.length; }
            });
            if (count > 0) matched.push({ g: g, count: count });
            else unmatched.push({ g: g, count: 0 });
        });
        // 出现次数降序
        matched.sort((a, b) => b.count - a.count);

        const badge = document.getElementById('tab-badge-glossary');
        if (badge) badge.textContent = matched.length;

        let html = '';
        if (matched.length > 0) {
            html += '<div style="font-size:11px;color:var(--text-secondary,#6b7280);margin-bottom:6px;">本章出现的术语（' + matched.length + ' / ' + glossaryData.length + '）</div>';
            matched.forEach(m => {
                html += `<div class="ctx-glossary-item" onclick="ChapterReviewModule.locateGlossary('${escapeHtml(m.g.name)}')">`;
                html += `<span class="gl-name">${escapeHtml(m.g.name)}</span>`;
                if (m.g.category) html += `<span class="gl-cat">${escapeHtml(m.g.category)}</span>`;
                html += `<span class="gl-occurrence">出现 ${m.count} 次</span>`;
                if (m.g.definition) html += `<div class="gl-def">${escapeHtml(m.g.definition)}</div>`;
                html += `</div>`;
            });
        } else {
            html += '<div class="ctx-empty">本章尚未匹配到任何术语</div>';
        }
        if (unmatched.length > 0) {
            html += '<details style="margin-top:8px;"><summary style="font-size:11px;color:var(--text-secondary,#6b7280);cursor:pointer;">未出现（' + unmatched.length + '）</summary>';
            html += '<div style="margin-top:4px;">';
            unmatched.forEach(m => {
                html += `<div class="ctx-glossary-item" style="opacity:0.6;">`;
                html += `<span class="gl-name">${escapeHtml(m.g.name)}</span>`;
                if (m.g.category) html += `<span class="gl-cat">${escapeHtml(m.g.category)}</span>`;
                if (m.g.definition) html += `<div class="gl-def">${escapeHtml(m.g.definition)}</div>`;
                html += `</div>`;
            });
            html += '</div></details>';
        }
        el.innerHTML = html;
    }

    // 跳转到术语首次出现位置（点击术语项触发）
    function locateGlossary(name) {
        if (!editor || !name) return;
        const text = editor.getValue() || '';
        const idx = text.indexOf(name);
        if (idx < 0) { showToast('术语未在正文中找到', 'info'); return; }
        const pos = editor.posFromIndex(idx);
        editor.scrollIntoView({ line: pos.line, ch: pos.ch }, 100);
        editor.setCursor(pos);
        editor.focus();
    }

    // ---- 设定 tab ----
    function renderSettingTab() {
        const el = document.getElementById('tab-panel-setting');
        if (!el) return;
        let html = '';
        // 世界观
        if (worldviewData && Object.keys(worldviewData).length > 0) {
            html += '<div class="ctx-setting-block"><h5>世界观</h5><div class="ctx-setting-body">';
            const lines = [];
            if (worldviewData.background) lines.push('背景：' + worldviewData.background);
            if (worldviewData.rules) lines.push('规则：' + worldviewData.rules);
            if (worldviewData.timeline) lines.push('时间线：' + worldviewData.timeline);
            if (worldviewData.location) lines.push('地点：' + worldviewData.location);
            html += escapeHtml(lines.join('\n') || '（空）');
            html += '</div></div>';
        }
        // 伏笔
        const fs = storyData && (Array.isArray(storyData.foreshadowing) ? storyData.foreshadowing : (storyData.foreshadowing ? Object.values(storyData.foreshadowing) : []));
        if (fs && fs.length > 0) {
            html += '<div class="ctx-setting-block"><h5>伏笔（' + fs.length + '）</h5>';
            fs.slice(0, 30).forEach(f => {
                const t = (typeof f === 'string') ? f : (f.title || f.name || JSON.stringify(f));
                const d = (typeof f === 'object' && f.desc) ? f.desc : '';
                const st = (typeof f === 'object' && f.status) ? f.status : 'open';
                const stLabel = st === 'closed' ? '已回收' : '待回收';
                html += `<div class="ctx-foreshadow-item">`;
                html += escapeHtml(t);
                html += `<span class="fs-status ${st === 'closed' ? 'closed' : 'open'}">${stLabel}</span>`;
                if (d) html += `<div style="color:var(--text-secondary,#6b7280);margin-top:2px;">${escapeHtml(d)}</div>`;
                html += `</div>`;
            });
            html += '</div>';
        }
        // 剧情标记
        const ms = storyData && (Array.isArray(storyData.marks) ? storyData.marks : (storyData.marks ? Object.values(storyData.marks) : []));
        if (ms && ms.length > 0) {
            html += '<div class="ctx-setting-block"><h5>剧情标记（' + ms.length + '）</h5><div class="ctx-setting-body">';
            html += escapeHtml(ms.slice(0, 30).map(m => typeof m === 'string' ? m : (m.title || m.name || JSON.stringify(m))).join('\n'));
            html += '</div></div>';
        }
        if (!html) html = '<div class="ctx-empty">暂无世界观、伏笔、剧情标记<br>请到对应模块添加</div>';
        el.innerHTML = html;
    }

    // ==================== 专注模式 ====================
    function toggleFocusMode() {
        focusMode = !focusMode;
        const layout = document.getElementById('review-layout');
        if (layout) layout.classList.toggle('focus-mode', focusMode);
        showToast(focusMode ? '已进入专注模式（再按 Ctrl+Enter 退出）' : '已退出专注模式', 'info');
        if (editor) setTimeout(() => editor.refresh(), 100);
    }

    // ==================== 阶段 3：AI 辅助 ====================
    const AI_ACTIONS = {
        rewrite:   { label: '重写',    ico: '✏️', desc: '保持原意，优化行文',     instruction: '请用更生动、流畅、富有画面感的方式重写以下文字，保持原意和情节不变。直接输出重写后的文字，不要解释。' },
        expand:    { label: '扩写',    ico: '📈', desc: '增加细节与心理活动',     instruction: '请在保持原意的基础上扩写以下文字，增加感官描写、心理活动、环境细节。直接输出扩写后的文字，不要解释。' },
        condense:  { label: '精简',    ico: '📉', desc: '去除冗余，行文紧凑',     instruction: '请精简以下文字，去除冗余词句，保留核心信息与情节，使行文更紧凑有力。直接输出精简后的文字，不要解释。' },
        continue_: { label: '续写',    ico: '➡️', desc: '延续风格，续写情节',     instruction: '请基于以下文字的风格、人物与情节，自然续写 200-400 字。直接输出续写内容，不要重复原文，不要解释。' },
        scene:     { label: '场景描写', ico: '🏞️', desc: '生成一段场景描写',       instruction: '请根据用户提示生成一段场景描写（300-500 字），要有视觉、听觉、嗅觉等多感官细节。直接输出描写文字，不要解释。' },
        dialogue:  { label: '对话',    ico: '💬', desc: '生成带潜台词的人物对话', instruction: '请根据用户提示生成一段人物对话（300-500 字），对话要有潜台词、情绪变化和性格特征。直接输出对话文字，不要解释。' },
        psychology:{ label: '心理活动', ico: '💭', desc: '生成人物内心独白',       instruction: '请根据用户提示生成一段人物心理活动描写（200-400 字），要细腻、有层次。直接输出心理描写文字，不要解释。' },
        transition:{ label: '转场',    ico: '🎬', desc: '生成场景转场文字',       instruction: '请根据用户提示生成一段场景转场文字（100-200 字），过渡自然。直接输出转场文字，不要解释。' }
    };

    // ---- 浮动菜单 ----
    function showAiFloatMenu(cm) {
        if (!editor) return;
        // modal 打开时不显示浮动菜单（避免遮挡预览面板）
        const modalContainer = document.getElementById('modal-container');
        if (modalContainer && modalContainer.innerHTML.trim()) return;
        // 选区坐标
        const from = cm.getCursor('from');
        const to = cm.getCursor('to');
        const coords = cm.charCoords({ line: to.line, ch: to.ch }, 'page');
        if (!aiFloatMenu) {
            aiFloatMenu = document.createElement('div');
            aiFloatMenu.className = 'ai-float-menu';
            aiFloatMenu.innerHTML = `
                <button class="ai-float-btn" data-action="rewrite" title="重写 (Ctrl+R)"><span class="ai-ico">✏️</span>重写</button>
                <button class="ai-float-btn" data-action="expand" title="扩写 (Ctrl+E)"><span class="ai-ico">📈</span>扩写</button>
                <button class="ai-float-btn" data-action="condense" title="精简 (Ctrl+J)"><span class="ai-ico">📉</span>精简</button>
                <span class="ai-float-divider"></span>
                <button class="ai-float-btn" data-action="continue_" title="续写"><span class="ai-ico">➡️</span>续写</button>
                <button class="ai-float-btn" data-action="lookup" title="查设定"><span class="ai-ico">🔍</span>查设定</button>
            `;
            aiFloatMenu.addEventListener('click', (e) => {
                const btn = e.target.closest('.ai-float-btn');
                if (!btn) return;
                const action = btn.dataset.action;
                hideAiFloatMenu();
                if (action === 'lookup') {
                    lookupSelectionSetting();
                } else {
                    triggerAiAction(action);
                }
            });
            document.body.appendChild(aiFloatMenu);
        }
        // 定位到选区结束位置下方
        const menuWidth = 280, menuHeight = 32;
        let left = coords.left;
        let top = (coords.bottom || coords.top + 16) + 6;
        if (left + menuWidth > window.innerWidth) left = window.innerWidth - menuWidth - 8;
        if (top + menuHeight > window.innerHeight) top = (coords.top || 0) - menuHeight - 6;
        aiFloatMenu.style.left = left + 'px';
        aiFloatMenu.style.top = top + 'px';
        aiFloatMenu.style.display = 'flex';
    }

    function hideAiFloatMenu() {
        if (aiFloatMenu) aiFloatMenu.style.display = 'none';
    }

    // 由快捷键触发：使用当前选区
    function triggerAiAction(action) {
        if (!editor) return;
        if (aiProcessing) { showToast('AI 正在处理中，请稍候', 'info'); return; }
        const sel = editor.getSelection();
        if (!sel || !sel.trim()) {
            showToast('请先选中要处理的文字', 'info');
            return;
        }
        runAiAction(action, sel, '');
    }

    // 统一入口：执行 AI 动作（流式 + 可中止）
    async function runAiAction(action, selectedText, hint) {
        const meta = AI_ACTIONS[action] || AI_ACTIONS.rewrite;
        if (!apiConfig || !apiConfig.api_url) {
            showToast('请先在「系统 → API 配置」中设置 API', 'error');
            return;
        }
        if (aiProcessing) return;
        aiProcessing = true;
        // 创建 AbortController（便于"停止生成"按钮中止）
        if (aiCurrentReq && aiCurrentReq.abortController) {
            try { aiCurrentReq.abortController.abort(); } catch(_) {}
        }
        const abortController = new AbortController();
        aiCurrentReq = {
            action, selectedText, hint,
            range: getSelectionRange(),
            abortController,
            lastOutput: '',
            stopped: false
        };
        // 打开预览 modal（loading 态，含"停止生成"按钮）
        showAiPreviewModal(meta, selectedText, hint, '');
        try {
            const output = await callAiTextStream(
                meta, selectedText, hint,
                (delta, fullText) => {
                    aiCurrentReq.lastOutput = fullText;
                    updateAiPreviewStream(fullText);
                },
                abortController.signal
            );
            const finalOutput = (output || '').trim();
            aiCurrentReq.lastOutput = finalOutput;
            // 仅在未被中止时写入历史
            if (!aiCurrentReq.stopped && finalOutput) {
                pushAiHistory({ action: meta.label, input: selectedText || hint, output: finalOutput, ts: Date.now() });
            }
            updateAiPreviewOutput(finalOutput);
        } catch(e) {
            if (e && e.name === 'AbortError') {
                // 用户主动停止：保留已生成内容
                const partial = (aiCurrentReq && aiCurrentReq.lastOutput) || '';
                if (partial.trim()) {
                    pushAiHistory({ action: meta.label + '（已停止）', input: selectedText || hint, output: partial, ts: Date.now() });
                }
                updateAiPreviewOutput(partial);
                showToast('已停止生成', 'info');
            } else {
                console.error('[ChapterReview] AI 调用失败:', e);
                updateAiPreviewError(e.message || String(e));
            }
        } finally {
            aiProcessing = false;
        }
    }

    // 中止当前 AI 请求
    function stopAiGeneration() {
        if (aiCurrentReq && aiCurrentReq.abortController && !aiCurrentReq.stopped) {
            aiCurrentReq.stopped = true;
            try { aiCurrentReq.abortController.abort(); } catch(_) {}
        }
    }

    function getSelectionRange() {
        if (!editor) return null;
        const from = editor.getCursor('from');
        const to = editor.getCursor('to');
        return { from, to };
    }

    // ---- LLM 调用（不同于审查，这里期望返回纯文本） ----
    async function callAiText(meta, selectedText, hint) {
        const sys = apiConfig.system_prompt && apiConfig.system_prompt.trim()
            ? apiConfig.system_prompt
            : '你是一位资深的中文小说编辑与创作助手。请根据用户指令处理文字，保持文学性与人物一致性。';
        // 构建上下文：本章大纲 + 相关术语
        let ctx = '';
        if (currentChapter && currentChapter.outline) ctx += `【本章大纲】\n${currentChapter.outline}\n\n`;
        if (glossaryData && glossaryData.length) {
            const recent = glossaryData.slice(0, 15).map(g => `- ${g.name}${g.aliases && g.aliases.length ? '（又称：' + g.aliases.join('、') + '）' : ''}: ${g.definition || ''}`).join('\n');
            ctx += `【术语表（节选）】\n${recent}\n\n`;
        }
        if (worldviewData && Object.keys(worldviewData).length) {
            const wvLines = [];
            if (worldviewData.background) wvLines.push('背景：' + worldviewData.background);
            if (worldviewData.location) wvLines.push('地点：' + worldviewData.location);
            if (worldviewData.rules) wvLines.push('规则：' + worldviewData.rules);
            if (wvLines.length) ctx += `【世界观】\n${wvLines.join('\n')}\n\n`;
        }
        const userMsg = `${meta.instruction}\n\n${ctx}${selectedText ? `【待处理文字】\n${selectedText}` : ''}${hint ? `\n\n【补充提示】\n${hint}` : ''}`;
        const body = {
            model: apiConfig.model || '',
            messages: [
                { role: 'system', content: sys },
                { role: 'user', content: userMsg }
            ],
            temperature: typeof apiConfig.temperature === 'number' ? apiConfig.temperature : 0.7,
            max_tokens: apiConfig.max_tokens || 2048,
            stream: false
        };
        const headers = { 'Content-Type': 'application/json' };
        if (apiConfig.api_key) headers['Authorization'] = 'Bearer ' + apiConfig.api_key;
        const resp = await fetch(apiConfig.api_url, {
            method: 'POST', headers, body: JSON.stringify(body)
        });
        if (!resp.ok) {
            const txt = await resp.text().catch(() => '');
            throw new Error(`HTTP ${resp.status} ${resp.statusText} ${txt.slice(0, 200)}`);
        }
        const data = await resp.json();
        if (data && data.choices && data.choices[0] && data.choices[0].message) {
            return (data.choices[0].message.content || '').trim();
        }
        if (typeof data === 'string') return data;
        return JSON.stringify(data);
    }

    // ---- LLM 流式调用（SSE） ----
    // onChunk(delta, fullText) 每收到一段就回调；signal 为 AbortSignal
    async function callAiTextStream(meta, selectedText, hint, onChunk, signal) {
        const sys = apiConfig.system_prompt && apiConfig.system_prompt.trim()
            ? apiConfig.system_prompt
            : '你是一位资深的中文小说编辑与创作助手。请根据用户指令处理文字，保持文学性与人物一致性。';
        let ctx = '';
        if (currentChapter && currentChapter.outline) ctx += `【本章大纲】\n${currentChapter.outline}\n\n`;
        if (glossaryData && glossaryData.length) {
            const recent = glossaryData.slice(0, 15).map(g => `- ${g.name}${g.aliases && g.aliases.length ? '（又称：' + g.aliases.join('、') + '）' : ''}: ${g.definition || ''}`).join('\n');
            ctx += `【术语表（节选）】\n${recent}\n\n`;
        }
        if (worldviewData && Object.keys(worldviewData).length) {
            const wvLines = [];
            if (worldviewData.background) wvLines.push('背景：' + worldviewData.background);
            if (worldviewData.location) wvLines.push('地点：' + worldviewData.location);
            if (worldviewData.rules) wvLines.push('规则：' + worldviewData.rules);
            if (wvLines.length) ctx += `【世界观】\n${wvLines.join('\n')}\n\n`;
        }
        const userMsg = `${meta.instruction}\n\n${ctx}${selectedText ? `【待处理文字】\n${selectedText}` : ''}${hint ? `\n\n【补充提示】\n${hint}` : ''}`;
        const body = {
            model: apiConfig.model || '',
            messages: [
                { role: 'system', content: sys },
                { role: 'user', content: userMsg }
            ],
            temperature: typeof apiConfig.temperature === 'number' ? apiConfig.temperature : 0.7,
            max_tokens: apiConfig.max_tokens || 2048,
            stream: true
        };
        const headers = { 'Content-Type': 'application/json' };
        if (apiConfig.api_key) headers['Authorization'] = 'Bearer ' + apiConfig.api_key;
        const resp = await fetch(apiConfig.api_url, {
            method: 'POST', headers, body: JSON.stringify(body), signal
        });
        if (!resp.ok) {
            const txt = await resp.text().catch(() => '');
            throw new Error(`HTTP ${resp.status} ${resp.statusText} ${txt.slice(0, 200)}`);
        }
        // 优先用 ReadableStream；不支持时回退到非流式
        if (!resp.body || !resp.body.getReader) {
            // 回退：等全部完成
            const text = await resp.text();
            // 尝试解析为 JSON（非流式响应）
            try {
                const data = JSON.parse(text);
                if (data && data.choices && data.choices[0] && data.choices[0].message) {
                    const out = (data.choices[0].message.content || '').trim();
                    onChunk(out, out);
                    return out;
                }
            } catch(_) {}
            onChunk(text, text);
            return text;
        }
        const reader = resp.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let fullText = '';
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                // SSE 协议：以 \n\n 分隔事件，每行 data: xxx
                const events = buffer.split('\n\n');
                buffer = events.pop() || ''; // 最后一段可能不完整，留到下次
                for (const ev of events) {
                    const lines = ev.split('\n');
                    for (const line of lines) {
                        if (!line.startsWith('data:')) continue;
                        const payload = line.slice(5).trim();
                        if (payload === '[DONE]') { return fullText; }
                        if (!payload) continue;
                        try {
                            const obj = JSON.parse(payload);
                            // OpenAI 兼容格式：choices[0].delta.content
                            const delta = obj && obj.choices && obj.choices[0] &&
                                (obj.choices[0].delta && obj.choices[0].delta.content
                                 || obj.choices[0].message && obj.choices[0].message.content);
                            if (delta) {
                                fullText += delta;
                                onChunk(delta, fullText);
                            }
                        } catch(_) {
                            // 非 JSON 的 data 行，按纯文本处理
                            fullText += payload;
                            onChunk(payload, fullText);
                        }
                    }
                }
            }
            // 处理 buffer 中剩余数据
            if (buffer.trim()) {
                const lines = buffer.split('\n');
                for (const line of lines) {
                    if (!line.startsWith('data:')) continue;
                    const payload = line.slice(5).trim();
                    if (payload === '[DONE]' || !payload) continue;
                    try {
                        const obj = JSON.parse(payload);
                        const delta = obj && obj.choices && obj.choices[0] &&
                            (obj.choices[0].delta && obj.choices[0].delta.content
                             || obj.choices[0].message && obj.choices[0].message.content);
                        if (delta) {
                            fullText += delta;
                            onChunk(delta, fullText);
                        }
                    } catch(_) {}
                }
            }
        } finally {
            try { reader.releaseLock(); } catch(_) {}
        }
        return fullText;
    }

    // ---- 预览 modal ----
    function showAiPreviewModal(meta, selectedText, hint, output) {
        const isGen = !output;
        const inputDisplay = selectedText ? escapeHtml(selectedText).slice(0, 2000) + (selectedText.length > 2000 ? '\n…（截断）' : '') : '<空>';
        const hintHtml = hint ? `<div class="ai-preview-meta">提示：${escapeHtml(hint)}</div>` : '';
        const html = `
            <div class="ai-preview-meta">动作：${escapeHtml(meta.ico + ' ' + meta.label)} · ${escapeHtml(meta.desc)}</div>
            ${hintHtml}
            <div class="ai-preview-grid">
                <div class="ai-preview-pane">
                    <h5>原文 / 提示</h5>
                    <div class="ai-preview-body" id="ai-preview-input">${inputDisplay}</div>
                </div>
                <div class="ai-preview-pane">
                    <h5>AI 生成结果 <span id="ai-stream-status" style="font-weight:normal;color:var(--primary-color,#6366f1);font-size:11px;"></span></h5>
                    <div class="ai-preview-body" id="ai-preview-output">
                        ${isGen
                            ? `<div class="ai-preview-loading"><span class="ai-spinner"></span>正在生成…</div>`
                            : escapeHtml(output)}
                    </div>
                </div>
            </div>
            <div class="ai-preview-actions" id="ai-preview-actions">
                <button class="btn-primary btn-tiny" id="ai-btn-replace" onclick="ChapterReviewModule.applyAiResult('replace')" ${isGen ? 'disabled' : ''}>替换原文</button>
                <button class="btn-tiny" id="ai-btn-append" onclick="ChapterReviewModule.applyAiResult('append')" ${isGen ? 'disabled' : ''}>追加到原文后</button>
                <button class="btn-tiny" id="ai-btn-insert-cursor" onclick="ChapterReviewModule.applyAiResult('insert')" ${isGen ? 'disabled' : ''}>插入到光标</button>
                <button class="btn-tiny" id="ai-btn-copy" onclick="ChapterReviewModule.applyAiResult('copy')" ${isGen ? 'disabled' : ''}>复制</button>
                <button class="btn-tiny" id="ai-btn-regen" onclick="ChapterReviewModule.applyAiResult('regen')" ${isGen ? 'disabled' : ''}>重新生成</button>
                <button class="btn-tiny btn-danger" id="ai-btn-stop" onclick="ChapterReviewModule.stopAiGeneration()" ${isGen ? '' : 'disabled style="display:none;"'}>⏹ 停止生成</button>
                <button class="btn-secondary btn-tiny" onclick="closeModal()">取消</button>
            </div>
        `;
        showModal(`${meta.ico} AI ${meta.label}`, html, []);
    }

    // 流式增量更新（保留光标滚动位置）
    function updateAiPreviewStream(fullText) {
        const el = document.getElementById('ai-preview-output');
        if (!el) return;
        // 仅当还在 loading 态时切换为内容
        if (el.querySelector('.ai-preview-loading')) {
            el.innerHTML = '';
        }
        // 记录滚动位置（用户可能想看上文，不要强制滚到底）
        const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 8;
        el.innerHTML = escapeHtml(fullText);
        if (atBottom) el.scrollTop = el.scrollHeight;
        // 状态提示
        const status = document.getElementById('ai-stream-status');
        if (status) {
            status.textContent = '生成中… ' + fullText.length + ' 字';
        }
    }

    function updateAiPreviewOutput(output) {
        const el = document.getElementById('ai-preview-output');
        if (el) el.innerHTML = escapeHtml(output) || '<div class="ai-preview-empty">（空）</div>';
        // 隐藏停止按钮，启用操作按钮
        const stopBtn = document.getElementById('ai-btn-stop');
        if (stopBtn) { stopBtn.disabled = true; stopBtn.style.display = 'none'; }
        ['ai-btn-replace','ai-btn-append','ai-btn-insert-cursor','ai-btn-copy','ai-btn-regen'].forEach(id => {
            const b = document.getElementById(id);
            if (b) b.disabled = false;
        });
        const status = document.getElementById('ai-stream-status');
        if (status) status.textContent = '';
        // 缓存当前输出
        if (aiCurrentReq) aiCurrentReq.lastOutput = output;
    }

    function updateAiPreviewError(msg) {
        const el = document.getElementById('ai-preview-output');
        if (el) el.innerHTML = `<div style="color:#ef4444;padding:12px 0;text-align:center;">❌ AI 调用失败：${escapeHtml(msg)}</div>`;
        // 关闭按钮全部禁用，只保留取消
        ['ai-btn-replace','ai-btn-append','ai-btn-insert-cursor','ai-btn-copy','ai-btn-regen'].forEach(id => {
            const b = document.getElementById(id);
            if (b) b.disabled = true;
        });
    }

    function applyAiResult(op) {
        if (!aiCurrentReq || !aiCurrentReq.lastOutput) return;
        const text = aiCurrentReq.lastOutput;
        if (op === 'copy') {
            try {
                navigator.clipboard.writeText(text);
                showToast('已复制到剪贴板', 'success');
            } catch(_) {
                showToast('复制失败，请手动选择文本', 'error');
            }
            return;
        }
        if (op === 'regen') {
            // 重新调用
            const { action, selectedText, hint } = aiCurrentReq;
            runAiAction(action, selectedText, hint);
            return;
        }
        if (!editor) { closeModal(); return; }
        if (op === 'replace') {
            const r = aiCurrentReq.range;
            if (r && r.from && r.to && (r.from.line !== r.to.line || r.from.ch !== r.to.ch)) {
                editor.replaceRange(text, r.from, r.to);
            } else {
                // 没有选区（来自插入面板），追加到光标
                const cur = editor.getCursor();
                editor.replaceRange(text, cur);
            }
            currentChapter.content = editor.getValue();
            onContentChanged();
            showToast('已替换原文', 'success');
            closeModal();
        } else if (op === 'append') {
            // 追加到选区后
            const r = aiCurrentReq.range;
            const pos = r && r.to ? r.to : editor.getCursor();
            editor.replaceRange(text, pos);
            currentChapter.content = editor.getValue();
            onContentChanged();
            showToast('已追加到原文后', 'success');
            closeModal();
        } else if (op === 'insert') {
            const cur = editor.getCursor();
            editor.replaceRange(text, cur);
            currentChapter.content = editor.getValue();
            onContentChanged();
            showToast('已插入到光标', 'success');
            closeModal();
        }
    }

    // ---- 选中文字查设定 ----
    function lookupSelectionSetting() {
        if (!editor) return;
        const sel = editor.getSelection().trim();
        if (!sel) { showToast('请先选中文字', 'info'); return; }
        const matches = [];
        // 术语表精确/包含匹配
        glossaryData.forEach(g => {
            const names = [g.name].concat(g.aliases || []).filter(Boolean);
            const hit = names.find(n => n === sel) || names.find(n => n && sel.includes(n));
            if (hit) matches.push(`【术语】${g.name}${g.aliases && g.aliases.length ? '（又称：' + g.aliases.join('、') + '）' : ''}：${g.definition || ''}`);
        });
        // 世界观
        const wvHits = [];
        const walkWv = (obj, path) => {
            if (!obj) return;
            if (typeof obj === 'string') {
                if (obj.includes(sel)) wvHits.push(`${path}：${obj.slice(0, 150)}`);
            } else if (Array.isArray(obj)) {
                obj.forEach((v, i) => walkWv(v, `${path}[${i}]`));
            } else if (typeof obj === 'object') {
                Object.keys(obj).forEach(k => walkWv(obj[k], path ? path + '.' + k : k));
            }
        };
        walkWv(worldviewData, '');
        if (wvHits.length) matches.push(...wvHits.slice(0, 5).map(s => '【世界观】' + s));
        // 伏笔
        const fs = storyData && (Array.isArray(storyData.foreshadowing) ? storyData.foreshadowing : Object.values(storyData.foreshadowing || {}));
        (fs || []).forEach(f => {
            const s = typeof f === 'string' ? f : JSON.stringify(f);
            if (s.includes(sel)) matches.push('【伏笔】' + s.slice(0, 150));
        });
        // 章节大纲中的命中
        if (currentChapter && currentChapter.outline && currentChapter.outline.includes(sel)) {
            matches.push('【本章大纲】' + currentChapter.outline.slice(0, 200));
        }
        const html = matches.length
            ? `<div style="font-size:13px;line-height:1.7;white-space:pre-wrap;">${matches.map(escapeHtml).join('\n\n')}</div>`
            : `<div class="review-empty">未在术语表/世界观/伏笔/大纲中找到 "${escapeHtml(sel)}" 的相关条目</div>`;
        showModal(`🔍 查设定：${sel.slice(0, 30)}`, html, [
            { text: '关闭', class: 'btn-secondary', action: () => closeModal() }
        ]);
    }

    // ---- 插入面板（工具栏按钮触发） ----
    function openAiInsertPanel() {
        if (!apiConfig || !apiConfig.api_url) {
            showToast('请先在「系统 → API 配置」中设置 API', 'error');
            return;
        }
        const actions = [
            { key: 'scene',      ...AI_ACTIONS.scene },
            { key: 'dialogue',   ...AI_ACTIONS.dialogue },
            { key: 'psychology', ...AI_ACTIONS.psychology },
            { key: 'transition', ...AI_ACTIONS.transition },
            { key: 'continue_',  ...AI_ACTIONS.continue_ },
            { key: 'rewrite',    ...AI_ACTIONS.rewrite }
        ];
        let html = `<div style="font-size:12px;color:var(--text-secondary,#6b7280);margin-bottom:8px;">选择生成动作，并填写提示（可选）。生成结果会在预览面板中显示，确认后插入到光标位置。</div>`;
        html += `<div class="ai-insert-actions" id="ai-insert-actions">`;
        actions.forEach((a, i) => {
            html += `<div class="ai-insert-action${i === 0 ? ' active' : ''}" data-action="${a.key}" onclick="ChapterReviewModule.selectAiInsertAction('${a.key}')">`;
            html += `<div class="ai-action-title">${a.ico} ${a.label}</div>`;
            html += `<div class="ai-action-desc">${escapeHtml(a.desc)}</div>`;
            html += `</div>`;
        });
        html += `</div>`;
        html += `<label style="font-size:12px;color:var(--text-secondary,#6b7280);display:block;margin-bottom:4px;">提示（人物、情境、关键信息，可选）</label>`;
        html += `<textarea id="ai-insert-hint" class="ctx-outline-area" style="min-height:80px;max-height:30vh;" placeholder="例如：林墨在潮汐岛码头初见苏婉，黄昏，海风带着咸味，他想起了三年前的约定…"></textarea>`;
        // 上下文提示：当前选区或前文
        let ctxHint = '';
        if (editor) {
            const sel = editor.getSelection();
            if (sel) ctxHint = '当前已选中文字，将作为待处理文字一并发送。';
            else {
                const val = editor.getValue();
                if (val) ctxHint = `将基于本章前文（最后 800 字）作为上下文。`;
            }
        }
        if (ctxHint) html += `<div style="font-size:11px;color:var(--text-secondary,#9ca3af);margin-top:6px;">💡 ${ctxHint}</div>`;
        showModal('✨ AI 插入', html, [
            { text: '生成', class: 'btn-primary', action: () => confirmAiInsert() },
            { text: '取消', class: 'btn-secondary', action: () => closeModal() }
        ]);
        // 默认选中第一个
        window.__aiInsertSelectedAction = actions[0].key;
    }

    function selectAiInsertAction(key) {
        window.__aiInsertSelectedAction = key;
        document.querySelectorAll('#ai-insert-actions .ai-insert-action').forEach(el => {
            el.classList.toggle('active', el.dataset.action === key);
        });
    }

    function confirmAiInsert() {
        const key = window.__aiInsertSelectedAction || 'scene';
        const hintEl = document.getElementById('ai-insert-hint');
        const hint = hintEl ? hintEl.value.trim() : '';
        let selectedText = '';
        if (editor) selectedText = editor.getSelection() || '';
        // 若选 scene/dialogue/psychology/transition 且无选区，则用前文 800 字作为上下文（不作为"待处理文字"）
        let ctxText = selectedText;
        if (!ctxText && editor) {
            const val = editor.getValue();
            if (val) ctxText = '\n【本章前文（节选最后 800 字）】\n' + val.slice(-800);
        }
        closeModal();
        runAiAction(key, ctxText, hint);
    }

    // ---- 历史片段缓存 ----
    function pushAiHistory(item) {
        aiHistory.unshift(item);
        if (aiHistory.length > 5) aiHistory.length = 5;
    }

    function showAiHistory() {
        let html;
        if (aiHistory.length === 0) {
            html = `<div class="review-empty">暂无 AI 生成历史<br>使用 AI 浮动菜单或「✨ AI 插入」后，最近 5 次结果会保存在这里</div>`;
        } else {
            html = `<div style="font-size:12px;color:var(--text-secondary,#6b7280);margin-bottom:8px;">最近 ${aiHistory.length} 次 AI 生成结果。点击条目可将内容插入到当前光标位置。</div>`;
            aiHistory.forEach((h, i) => {
                const time = new Date(h.ts).toLocaleString();
                const preview = (h.output || '').slice(0, 200) + ((h.output || '').length > 200 ? '…' : '');
                html += `<div class="ai-history-item" onclick="ChapterReviewModule.insertFromHistory(${i})">`;
                html += `<div class="ai-h-meta">${escapeHtml(h.action)} · ${time} · ${(h.output || '').length} 字</div>`;
                html += `<div class="ai-h-preview">${escapeHtml(preview)}</div>`;
                html += `</div>`;
            });
        }
        showModal('🧠 AI 生成历史', html, [
            { text: '关闭', class: 'btn-secondary', action: () => closeModal() }
        ]);
    }

    function insertFromHistory(idx) {
        const h = aiHistory[idx];
        if (!h || !h.output || !editor) { showToast('无法插入', 'error'); return; }
        const cur = editor.getCursor();
        editor.replaceRange(h.output, cur);
        currentChapter.content = editor.getValue();
        onContentChanged();
        showToast('已插入历史片段', 'success');
        closeModal();
    }

    // ==================== 辅助 ====================
    function setProgress(p) {
        const el = document.getElementById('review-progress-fill');
        if (el) el.style.width = p + '%';
    }
    function setStatus(s) {
        const el = document.getElementById('review-status');
        if (el) el.textContent = s;
    }
    function showApiConfigTip() {
        showModal('API 配置提示', `
            <div style="font-size:13px;line-height:1.7;">
                <p>请前往 <strong>系统 → API 配置</strong> 模块设置：</p>
                <ul style="margin-left:20px;">
                    <li><strong>API URL</strong>：OpenAI 兼容地址（如 <code>https://api.deepseek.com/v1/chat/completions</code>）</li>
                    <li><strong>API Key</strong>：服务方提供的密钥</li>
                    <li><strong>Model</strong>：模型名（如 deepseek-chat、glm-4、qwen-plus）</li>
                    <li><strong>System Prompt</strong>：留空将使用内置默认提示</li>
                </ul>
                <p style="color:var(--text-secondary,#6b7280);">支持 DeepSeek / 智谱 / Kimi / OpenAI / Ollama 等兼容协议。</p>
            </div>
        `, [{ text: '知道了', class: 'btn-primary', action: () => closeModal() }]);
    }

    // ==================== ContentImporter 集成 ====================
    // 在当前编辑器光标位置插入文本，返回是否成功
    function insertText(text) {
        if (!editor || !currentChapter) return false;
        try {
            // 检查编辑器是否在 DOM 中且可见
            const wrap = document.getElementById('review-editor-wrap');
            if (!wrap || wrap.offsetParent === null) return false;
            const cur = editor.getCursor();
            editor.replaceRange(text, cur);
            currentChapter.content = editor.getValue();
            onContentChanged();
            return true;
        } catch(e) {
            console.warn('[ChapterReview] insertText 失败:', e);
            return false;
        }
    }

    // ==================== 注册 ====================
    window.ChapterReviewModule = {
        loadData,
        setTargetChapter,
        onChapterSelect,
        runReview,
        saveContent,
        clearMarks,
        showApiConfigTip,
        locateIssue,
        applySuggestion,
        applyAlternative,
        expandToSuggestion,
        openPhrasePicker,
        filterPhrase,
        insertPhrase,
        showSettingRef,
        ignoreIssue,
        locateGlossary,
        toggleFocusMode,
        switchTab,
        updateWritingStatus,
        silentAutoSave,
        renderChapterPreview,
        // 阶段 3：AI 辅助
        openAiInsertPanel,
        selectAiInsertAction,
        showAiHistory,
        insertFromHistory,
        applyAiResult,
        triggerAiAction,
        lookupSelectionSetting,
        stopAiGeneration,
        // 4.2-C：章节管理模块保存后同步刷新本章数据
        refreshChapters: async function() {
            try {
                chapters = await apiRequest('/api/mod/chapters') || [];
                // 若当前章节仍存在，更新引用并刷新工具栏
                if (currentChapterId) {
                    currentChapter = chapters.find(c => c.id === currentChapterId) || null;
                    renderToolbar();
                    if (currentChapter) {
                        if (editor) editor.setValue(currentChapter.content || '');
                        renderChapterPreview(currentChapter.id);
                        updateWritingStatus();
                    }
                } else {
                    renderToolbar();
                }
            } catch(e) { console.warn('[ChapterReview] refreshChapters 失败:', e); }
        },
        // 2.2-B 术语表变化时刷新高亮（外部模块调用）
        refreshGlossary
    };

    ModuleRegistry.register({
        id: 'chapter_review',
        name: '章节正文审查',
        icon: 'search',
        group: 'writing',
        order: 2,
        dataKeys: ['chapters', 'glossary', 'worldview', 'story', 'phrase_library', 'api_config', 'review_history'],
        pageRenderer: renderPage,
        onPageShow: () => { loadData(); }
    });
})();
