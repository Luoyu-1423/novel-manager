// ============================================================
// ContentImporter - 跨模块内容导入统一接口 (v3.2.0)
// 功能：
//   - formatItem(moduleId, item, format) 将模块条目格式化为文本
//   - toChat(text) 插入到 AI 对话框
//   - toChapter(text) 插入到当前章节正文编辑器光标位置
//   - showPicker(options) 弹出选择面板，多选条目并导出
// 依赖：ModuleRegistry, apiRequest, showModal/closeModal, showToast
// ============================================================

(function() {
    'use strict';

    // ==================== 内置兜底格式化器 ====================
    // 当模块未注册 itemFormatter 时使用
    const FALLBACK_FORMATTERS = {
        inventory: function(item, fmt) {
            const name = item.name || item.id || '未命名';
            const icon = item.icon || '📦';
            const qty = item.quantity || 1;
            if (fmt === 'compact') return `${icon} ${name} ×${qty}`;
            if (fmt === 'detailed') {
                let s = `${icon} ${name} ×${qty}`;
                if (item.description) s += `\n  描述：${item.description}`;
                return s;
            }
            if (fmt === 'markdown') return `- ${icon} **${name}** ×${qty}`;
            return name;
        },
        currency: function(item, fmt) {
            const name = item.name || item.key || '货币';
            const icon = item.icon || '🪙';
            const val = item.value != null ? item.value : 0;
            if (fmt === 'compact') return `${icon} ${name}: ${val}`;
            if (fmt === 'detailed') return `${icon} ${name}: ${val}`;
            if (fmt === 'markdown') return `- ${icon} **${name}**: ${val}`;
            return `${name}: ${val}`;
        },
        skills: function(item, fmt) {
            const name = item.name || item.id || '技能';
            const icon = item.icon || '✨';
            const lv = item.level || 1;
            if (fmt === 'compact') return `${icon} ${name} Lv.${lv}`;
            if (fmt === 'detailed') {
                let s = `${icon} ${name} Lv.${lv}`;
                if (item.description) s += `\n  描述：${item.description}`;
                return s;
            }
            if (fmt === 'markdown') return `- ${icon} **${name}** Lv.${lv}`;
            return name;
        },
        quests: function(item, fmt) {
            const name = item.name || item.title || item.id || '任务';
            const icon = item.icon || '📜';
            const st = item.completed ? '✅' : '⏳';
            if (fmt === 'compact') return `${icon} ${name} [${st}]`;
            if (fmt === 'detailed') {
                let s = `${icon} ${name} [${st}]`;
                if (item.description) s += `\n  描述：${item.description}`;
                return s;
            }
            if (fmt === 'markdown') return `- ${icon} **${name}** [${st}]`;
            return name;
        },
        equipment: function(item, fmt) {
            // item 是 slot 对象 {name, item: {...}}
            const slotName = item.name || '装备槽';
            const eq = item.item;
            if (!eq) return `${slotName}: (空)`;
            const name = eq.name || eq.id || '装备';
            const icon = eq.icon || '⚔️';
            if (fmt === 'compact') return `${slotName}: ${icon} ${name}`;
            if (fmt === 'detailed') {
                let s = `${slotName}: ${icon} ${name}`;
                if (eq.description) s += `\n  描述：${eq.description}`;
                return s;
            }
            if (fmt === 'markdown') return `- **${slotName}**: ${icon} ${name}`;
            return name;
        },
        'item-library': function(item, fmt) {
            const name = item.name || item.id || '物品';
            const icon = item.icon || '📦';
            if (fmt === 'compact') return `${icon} ${name}`;
            if (fmt === 'detailed') {
                let s = `${icon} ${name}`;
                if (item.description) s += `\n  描述：${item.description}`;
                return s;
            }
            if (fmt === 'markdown') return `- ${icon} **${name}**`;
            return name;
        },
        character: function(item, fmt) {
            // item 是角色对象
            const name = item.name || '主角';
            const lv = item.level || 1;
            if (fmt === 'compact') return `👤 ${name}（Lv.${lv}）`;
            if (fmt === 'detailed') {
                let s = `👤 ${name}（Lv.${lv}）`;
                const stats = item.stats || {};
                const skip = ['inventory','equipment','skills','name','template','level','id','level_label'];
                const statLines = Object.entries(stats)
                    .filter(([k]) => skip.indexOf(k) === -1)
                    .map(([k, v]) => `  ${k}: ${v}`);
                if (statLines.length) s += '\n' + statLines.join('\n');
                return s;
            }
            if (fmt === 'markdown') return `- 👤 **${name}**（Lv.${lv}）`;
            return name;
        },
        glossary: function(item, fmt) {
            const name = item.name || item.term || '术语';
            const def = item.definition || '';
            if (fmt === 'compact') return def ? `${name}：${def}` : name;
            if (fmt === 'detailed') {
                let s = `📖 ${name}`;
                if (item.aliases && item.aliases.length) s += `（又称：${item.aliases.join('、')}）`;
                if (def) s += `\n  ${def}`;
                if (item.category) s += `\n  分类：${item.category}`;
                return s;
            }
            if (fmt === 'markdown') return `- 📖 **${name}**：${def}`;
            return name;
        },
        worldview: function(item, fmt) {
            // item 是 {key, value} 形式
            const k = item.key || '设定';
            const v = item.value || '';
            if (fmt === 'compact') return v ? `${k}：${v}` : k;
            if (fmt === 'detailed') return `🌍 ${k}：${v}`;
            if (fmt === 'markdown') return `- 🌍 **${k}**：${v}`;
            return k;
        },
        story: function(item, fmt) {
            // item 是伏笔/剧情标记
            const title = item.title || item.name || '条目';
            const isFS = item.resolved !== undefined;
            const st = isFS ? (item.resolved ? '✅已回收' : '⏳未回收') : '';
            if (fmt === 'compact') return st ? `${title} [${st}]` : title;
            if (fmt === 'detailed') {
                let s = `${isFS ? '🔮' : '📌'} ${title}`;
                if (st) s += ` [${st}]`;
                if (item.description || item.desc) s += `\n  ${item.description || item.desc}`;
                return s;
            }
            if (fmt === 'markdown') return `- ${isFS ? '🔮' : '📌'} **${title}**${st ? ' [' + st + ']' : ''}`;
            return title;
        }
    };

    // ==================== formatItem ====================
    function formatItem(moduleId, item, format) {
        if (!item) return '';
        const fmt = format || 'compact';
        const mod = (typeof ModuleRegistry !== 'undefined') ? ModuleRegistry.getModule(moduleId) : null;
        if (mod && mod.itemFormatter) {
            try {
                const out = mod.itemFormatter(item, fmt);
                if (out) return out;
            } catch(e) { console.warn('[ContentImporter] itemFormatter 出错:', moduleId, e); }
        }
        const fb = FALLBACK_FORMATTERS[moduleId];
        if (fb) {
            try { return fb(item, fmt) || ''; } catch(_) {}
        }
        // 最终兜底
        return item.name || item.title || item.id || JSON.stringify(item).slice(0, 80);
    }

    // ==================== toChat ====================
    function toChat(text) {
        if (!text) return;
        const input = document.getElementById('ai-chat-input');
        if (!input) {
            showToast('AI 对话框未找到', 'error');
            return;
        }
        const sep = input.value && !input.value.endsWith('\n') ? '\n' : '';
        input.value = input.value + sep + text + '\n';
        input.dispatchEvent(new Event('input'));
        input.focus();
        // 移动光标到末尾
        input.selectionStart = input.selectionEnd = input.value.length;
        showToast('已加入对话栏', 'success');
    }

    // ==================== toChapter ====================
    function toChapter(text) {
        if (!text) return;
        // 优先：章节审查模块的 CodeMirror 编辑器
        if (window.ChapterReviewModule && typeof window.ChapterReviewModule.insertText === 'function') {
            if (window.ChapterReviewModule.insertText(text)) {
                showToast('已插入到章节正文（审查模块）', 'success');
                return;
            }
        }
        // 次选：章节管理内联编辑器
        const inlineContent = document.getElementById('inline-ed-content');
        if (inlineContent && inlineContent.offsetParent !== null) {
            insertIntoTextarea(inlineContent, text);
            if (window.ChaptersModule && typeof window.ChaptersModule.updateInlineLiveWordCount === 'function') {
                window.ChaptersModule.updateInlineLiveWordCount();
            }
            if (window.ChaptersModule && typeof window.ChaptersModule.markInlineDirty === 'function') {
                window.ChaptersModule.markInlineDirty();
            }
            showToast('已插入到章节正文（内联编辑器）', 'success');
            return;
        }
        // 全屏覆盖编辑器
        const fullscreenContent = document.getElementById('ed-content');
        if (fullscreenContent) {
            insertIntoTextarea(fullscreenContent, text);
            if (window.ChaptersModule && typeof window.ChaptersModule.updateLiveWordCount === 'function') {
                window.ChaptersModule.updateLiveWordCount();
            }
            showToast('已插入到章节正文（全屏编辑器）', 'success');
            return;
        }
        showToast('未找到可用的章节正文编辑器，请先打开章节', 'error');
    }

    function insertIntoTextarea(ta, text) {
        const start = ta.selectionStart != null ? ta.selectionStart : ta.value.length;
        const end = ta.selectionEnd != null ? ta.selectionEnd : ta.value.length;
        ta.value = ta.value.slice(0, start) + text + ta.value.slice(end);
        const pos = start + text.length;
        ta.selectionStart = ta.selectionEnd = pos;
        ta.focus();
        ta.dispatchEvent(new Event('input'));
    }

    // ==================== showPicker ====================
    /**
     * 弹出条目选择面板
     * @param {Object} options
     *   - moduleId: 指定模块 id（可选，不指定则显示所有有 formatter 的模块 tab）
     *   - multiple: 是否多选（默认 true）
     *   - format:   导出格式 'compact'|'detailed'|'markdown'（默认 compact）
     *   - title:    面板标题
     *   - onConfirm: (text, items) => void  确认回调，接收拼好的文本和原始条目数组
     *   - target:    'chat'|'chapter'|'custom'，决定默认按钮（默认 custom，仅显示"复制"和"确认"）
     */
    function showPicker(options) {
        options = options || {};
        const multiple = options.multiple !== false;
        const format = options.format || 'compact';
        const target = options.target || 'custom';
        const onConfirm = options.onConfirm || null;

        // 收集有 itemFormatter 的模块
        const allMods = (typeof ModuleRegistry !== 'undefined') ? ModuleRegistry.getAllModules() : {};
        const moduleIds = Object.keys(allMods).filter(id => {
            const m = allMods[id];
            return !m.hidden && (m.itemFormatter || FALLBACK_FORMATTERS[id]);
        });

        if (moduleIds.length === 0) {
            showToast('暂无可导入数据的模块', 'error');
            return;
        }

        // 如果指定了 moduleId，只显示该模块
        const visibleMods = options.moduleId
            ? moduleIds.filter(id => id === options.moduleId)
            : moduleIds;
        if (visibleMods.length === 0) {
            showToast('该模块暂不支持导入', 'error');
            return;
        }

        // 状态
        const state = {
            currentModId: visibleMods[0],
            items: [],
            selected: new Set(),
            loading: false
        };

        // 加载条目
        async function loadItems(modId) {
            state.loading = true;
            state.items = [];
            state.selected.clear();
            renderItemList();
            const mod = allMods[modId];
            try {
                if (mod.itemPickerSource) {
                    state.items = await mod.itemPickerSource() || [];
                } else {
                    // 从 dataKeys 拉取
                    state.items = await fetchItemsFromDataKeys(mod);
                }
            } catch(e) {
                console.error('[ContentImporter] 加载条目失败:', modId, e);
                state.items = [];
            }
            // 归一化为数组
            if (!Array.isArray(state.items)) {
                if (state.items && typeof state.items === 'object') {
                    state.items = Object.values(state.items);
                } else {
                    state.items = [];
                }
            }
            state.loading = false;
            renderItemList();
            updateCount();
        }

        async function fetchItemsFromDataKeys(mod) {
            // 对每个 dataKey 调用 apiRequest，合并结果
            const results = [];
            for (const key of mod.dataKeys) {
                if (typeof apiRequest !== 'function') continue;
                try {
                    let data = await apiRequest('/api/mod/' + key);
                    if (!data) continue;
                    if (mod.id === 'currency') {
                        // currency 是 {key: value}，需要合并 currency_types
                        const types = mod.dataKeys.indexOf('currency_types') >= 0
                            ? (await apiRequest('/api/mod/currency_types') || {})
                            : {};
                        Object.entries(data).forEach(([k, v]) => {
                            const t = types[k] || {};
                            results.push({ key: k, name: t.name || k, icon: t.icon || '🪙', value: v });
                        });
                    } else if (mod.id === 'worldview') {
                        // worldview 是对象，转为 {key, value} 列表
                        if (typeof data === 'object' && !Array.isArray(data)) {
                            Object.entries(data).forEach(([k, v]) => {
                                results.push({ key: k, value: typeof v === 'string' ? v : JSON.stringify(v).slice(0, 200) });
                            });
                        }
                    } else if (mod.id === 'character') {
                        // character 是单个对象
                        if (typeof data === 'object' && !Array.isArray(data)) {
                            results.push(data);
                        }
                    } else if (Array.isArray(data)) {
                        results.push(...data);
                    } else if (typeof data === 'object') {
                        results.push(...Object.values(data));
                    }
                } catch(_) {}
            }
            return results;
        }

        function renderModal() {
            const title = options.title || '插入数据';
            const tabBtns = visibleMods.map(id => {
                const m = allMods[id];
                const active = id === state.currentModId ? ' active' : '';
                return `<button class="ci-mod-tab${active}" data-mod="${id}" onclick="ContentImporter._switchMod('${id}')">${m.icon || '📦'} ${m.name}</button>`;
            }).join('');

            const targetBtns = [];
            if (target === 'chat' || target === 'custom') {
                targetBtns.push(`<button class="btn-primary btn-small" id="ci-btn-chat" onclick="ContentImporter._confirm('chat')">💬 加入对话</button>`);
            }
            if (target === 'chapter' || target === 'custom') {
                targetBtns.push(`<button class="btn-primary btn-small" id="ci-btn-chapter" onclick="ContentImporter._confirm('chapter')">📝 加入正文</button>`);
            }
            targetBtns.push(`<button class="btn-tiny" id="ci-btn-copy" onclick="ContentImporter._confirm('copy')">📋 复制</button>`);
            if (onConfirm) {
                targetBtns.push(`<button class="btn-primary btn-small" id="ci-btn-custom" onclick="ContentImporter._confirm('custom')">✓ 确认</button>`);
            }

            const html = `
                <div class="ci-picker">
                    ${visibleMods.length > 1 ? `<div class="ci-mod-tabs">${tabBtns}</div>` : ''}
                    <div class="ci-toolbar">
                        <label class="ci-format-label">格式：
                            <select id="ci-format" onchange="ContentImporter._changeFormat(this.value)">
                                <option value="compact" ${format==='compact'?'selected':''}>紧凑</option>
                                <option value="detailed" ${format==='detailed'?'selected':''}>详细</option>
                                <option value="markdown" ${format==='markdown'?'selected':''}>Markdown</option>
                            </select>
                        </label>
                        <label class="ci-select-all"><input type="checkbox" id="ci-select-all" onchange="ContentImporter._toggleSelectAll(this.checked)"> 全选</label>
                        <span class="ci-count" id="ci-count">已选 0 项</span>
                    </div>
                    <div class="ci-list" id="ci-list">加载中…</div>
                    <div class="ci-actions">${targetBtns.join('')}</div>
                </div>
            `;
            if (typeof showModal === 'function') {
                showModal('📥 ' + title, html, [
                    { text: '取消', class: 'btn-secondary', action: () => { if (typeof closeModal === 'function') closeModal(); } }
                ]);
            } else {
                // 兜底：alert
                alert('showModal 未定义，无法打开 ContentImporter 面板');
            }
        }

        function renderItemList() {
            const el = document.getElementById('ci-list');
            if (!el) return;
            if (state.loading) {
                el.innerHTML = '<div class="ci-empty">加载中…</div>';
                return;
            }
            if (state.items.length === 0) {
                el.innerHTML = '<div class="ci-empty">该模块暂无条目</div>';
                return;
            }
            const fmt = document.getElementById('ci-format');
            const fmtVal = fmt ? fmt.value : 'compact';
            let html = '';
            state.items.forEach((item, idx) => {
                const text = formatItem(state.currentModId, item, fmtVal);
                const checked = state.selected.has(idx) ? 'checked' : '';
                html += `<div class="ci-item${checked?' selected':''}" data-idx="${idx}" onclick="ContentImporter._toggleItem(${idx})">`;
                html += `<input type="checkbox" ${checked} onclick="event.stopPropagation(); ContentImporter._toggleItem(${idx})">`;
                html += `<span class="ci-item-text">${escapeHtml(text).replace(/\\n/g, '<br>')}</span>`;
                html += `</div>`;
            });
            el.innerHTML = html;
        }

        function updateCount() {
            const el = document.getElementById('ci-count');
            if (el) el.textContent = `已选 ${state.selected.size} 项`;
            const selectAll = document.getElementById('ci-select-all');
            if (selectAll) {
                selectAll.checked = state.items.length > 0 && state.selected.size === state.items.length;
            }
        }

        // 事件处理（暴露到 ContentImporter._xxx 供 inline onclick 调用）
        pickerHandlers._switchMod = async function(modId) {
            state.currentModId = modId;
            document.querySelectorAll('.ci-mod-tab').forEach(b => b.classList.toggle('active', b.dataset.mod === modId));
            await loadItems(modId);
        };
        pickerHandlers._toggleItem = function(idx) {
            if (!multiple && !state.selected.has(idx)) {
                state.selected.clear();
            }
            if (state.selected.has(idx)) state.selected.delete(idx);
            else state.selected.add(idx);
            renderItemList();
            updateCount();
        };
        pickerHandlers._toggleSelectAll = function(checked) {
            if (checked) {
                state.items.forEach((_, i) => state.selected.add(i));
            } else {
                state.selected.clear();
            }
            renderItemList();
            updateCount();
        };
        pickerHandlers._changeFormat = function() {
            renderItemList();
        };
        pickerHandlers._confirm = function(action) {
            const fmt = document.getElementById('ci-format');
            const fmtVal = fmt ? fmt.value : 'compact';
            const items = Array.from(state.selected).map(i => state.items[i]).filter(Boolean);
            if (items.length === 0) {
                showToast('请先选择条目', 'info');
                return;
            }
            const text = items.map(it => formatItem(state.currentModId, it, fmtVal)).join('\n');
            if (action === 'chat') {
                toChat(text);
                if (typeof closeModal === 'function') closeModal();
            } else if (action === 'chapter') {
                toChapter(text);
                if (typeof closeModal === 'function') closeModal();
            } else if (action === 'copy') {
                try {
                    navigator.clipboard.writeText(text);
                    showToast(`已复制 ${items.length} 条到剪贴板`, 'success');
                } catch(_) {
                    showToast('复制失败，请手动选择', 'error');
                }
            } else if (action === 'custom') {
                if (onConfirm) {
                    try { onConfirm(text, items); } catch(e) { console.error(e); }
                }
                if (typeof closeModal === 'function') closeModal();
            }
        };

        renderModal();
        // 初始加载
        loadItems(state.currentModId);
    }

    // picker 内联事件处理器表（供 onclick 调用）
    const pickerHandlers = {};

    // ==================== 辅助 ====================
    function showToast(msg, type) {
        if (typeof window.showToast === 'function') window.showToast(msg, type);
        else if (typeof window.showToastSafe === 'function') window.showToastSafe(msg, type);
        else console.log('[ContentImporter]', type, msg);
    }

    // ==================== 注入样式（一次性） ====================
    if (!document.getElementById('content-importer-style')) {
        const style = document.createElement('style');
        style.id = 'content-importer-style';
        style.textContent = `
            .ci-picker { display: flex; flex-direction: column; gap: 10px; min-height: 320px; }
            .ci-mod-tabs { display: flex; gap: 4px; flex-wrap: wrap; border-bottom: 1px solid var(--border-color, #e5e7eb); padding-bottom: 6px; }
            .ci-mod-tab { padding: 4px 10px; border: 1px solid var(--border-color, #e5e7eb); background: transparent; cursor: pointer; border-radius: 4px; font-size: 12px; color: var(--text-primary, #374151); }
            .ci-mod-tab:hover { background: var(--bg-color, #f3f4f6); }
            .ci-mod-tab.active { background: var(--primary-color, #6366f1); color: #fff; border-color: var(--primary-color, #6366f1); }
            .ci-toolbar { display: flex; align-items: center; gap: 12px; font-size: 12px; color: var(--text-secondary, #6b7280); flex-wrap: wrap; }
            .ci-toolbar select { padding: 3px 8px; border: 1px solid var(--border-color, #e5e7eb); border-radius: 4px; background: var(--bg-color, #fff); font-size: 12px; }
            .ci-select-all { display: flex; align-items: center; gap: 4px; cursor: pointer; }
            .ci-count { margin-left: auto; color: var(--primary-color, #6366f1); font-weight: 600; }
            .ci-list { max-height: 50vh; overflow-y: auto; border: 1px solid var(--border-color, #e5e7eb); border-radius: 6px; background: var(--bg-color, #f9fafb); min-height: 120px; }
            .ci-item { display: flex; align-items: flex-start; gap: 8px; padding: 8px 10px; border-bottom: 1px solid var(--border-color, #e5e7eb); cursor: pointer; font-size: 13px; transition: background 0.12s; }
            .ci-item:hover { background: var(--card-bg, #fff); }
            .ci-item.selected { background: rgba(99,102,241,0.08); }
            .ci-item input[type=checkbox] { margin-top: 2px; cursor: pointer; }
            .ci-item-text { flex: 1; color: var(--text-primary, #374151); white-space: pre-wrap; word-break: break-word; line-height: 1.5; }
            .ci-empty { text-align: center; color: #9ca3af; padding: 30px 0; font-size: 13px; }
            .ci-actions { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; padding-top: 6px; border-top: 1px solid var(--border-color, #e5e7eb); }
        `;
        document.head.appendChild(style);
    }

    // ==================== 暴露 API ====================
    window.ContentImporter = {
        formatItem: formatItem,
        toChat: toChat,
        toChapter: toChapter,
        showPicker: showPicker,
        // 内部处理器（供 inline onclick 调用）
        _switchMod: function(id) { pickerHandlers._switchMod && pickerHandlers._switchMod(id); },
        _toggleItem: function(idx) { pickerHandlers._toggleItem && pickerHandlers._toggleItem(idx); },
        _toggleSelectAll: function(checked) { pickerHandlers._toggleSelectAll && pickerHandlers._toggleSelectAll(checked); },
        _changeFormat: function() { pickerHandlers._changeFormat && pickerHandlers._changeFormat(); },
        _confirm: function(action) { pickerHandlers._confirm && pickerHandlers._confirm(action); }
    };

    console.log('[ContentImporter] 跨模块内容导入接口已就绪 (v3.2.0)');
})();
