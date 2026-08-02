// ============================================================
// AI 对话助手 (ai_chat.js)  版本 3.2.0
// 用途：
//   全局固定底栏（ChatGPT 风格），调用 api_config 中的 LLM，
//   回答写作相关问题。不写入章节正文，仅作辅助对话。
// 设计要点：
//   - 独立 IIFE，不注册到 ModuleRegistry
//   - 自带 CSS 注入（亮/暗自适应，使用全局 CSS 变量）
//   - 暴露 window.AiChatBar，供 NovelTestAPI.getOperationFeedback 读取状态
//   - 消息历史保留在内存，关闭页面即丢失（MVP 不持久化）
// ============================================================
(function () {
    'use strict';

    // ==================== 注入 CSS ====================
    const cssText = `
/* 关键：覆盖 .main-content 的 overflow-y:auto，改为 flex column，
   让 .app-content 内部滚动，对话栏作为 flex 子元素自然贴在视口底部 */
.app-container:has(.sidebar) .main-content {
    display: flex;
    flex-direction: column;
    height: 100vh;
    min-height: 0;
    overflow: hidden;
}
.app-container:has(.sidebar) .app-content {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
}

.ai-chat-bar {
    flex: 0 0 auto;
    border-top: 1px solid var(--border-color);
    background: var(--card-bg);
    display: flex;
    flex-direction: column;
    height: 120px;
    transition: height 0.2s ease;
    z-index: 50;
    box-shadow: 0 -4px 12px rgba(0,0,0,0.06);
}
.ai-chat-bar.ai-chat-collapsed {
    height: 44px;
}
.ai-chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 6px 12px;
    font-size: 13px;
    color: var(--text-primary);
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-height: 0;
}
.ai-chat-bar.ai-chat-collapsed .ai-chat-messages {
    display: none;
}
.ai-chat-msg {
    line-height: 1.5;
    word-wrap: break-word;
    white-space: pre-wrap;
    padding: 2px 0;
    border-bottom: 1px dashed transparent;
}
.ai-chat-msg.ai-msg-user {
    color: var(--primary-color);
}
.ai-chat-msg.ai-msg-ai {
    color: var(--text-primary);
}
.ai-chat-msg.ai-msg-error {
    color: #ef4444;
}
.ai-chat-msg.ai-msg-info {
    color: var(--text-secondary);
    font-size: 12px;
}
.ai-chat-msg b.ai-chat-role {
    font-weight: 600;
    margin-right: 6px;
    color: var(--text-secondary);
}
.ai-chat-input-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-top: 1px solid var(--border-color);
    background: var(--bg-color);
    flex-shrink: 0;
    height: 44px;
}
.ai-chat-toggle-btn {
    width: 28px;
    height: 28px;
    border: 1px solid var(--border-color);
    background: var(--card-bg);
    color: var(--text-secondary);
    border-radius: 4px;
    cursor: pointer;
    font-size: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    flex-shrink: 0;
    transition: transform 0.2s;
}
.ai-chat-toggle-btn:hover {
    color: var(--primary-color);
    border-color: var(--primary-color);
}
.ai-chat-bar.ai-chat-collapsed .ai-chat-toggle-icon {
    transform: rotate(180deg);
}
.ai-chat-input {
    flex: 1;
    min-width: 0;
    height: 32px;
    max-height: 80px;
    padding: 4px 10px;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    background: var(--card-bg);
    color: var(--text-primary);
    font-size: 13px;
    font-family: inherit;
    resize: none;
    outline: none;
    line-height: 1.4;
    transition: border-color 0.15s;
}
.ai-chat-input:focus {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
}
.ai-chat-send-btn,
.ai-chat-clear-btn {
    height: 32px;
    padding: 0 12px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: background 0.15s, opacity 0.15s;
    flex-shrink: 0;
}
.ai-chat-send-btn {
    background: var(--primary-color);
    color: #fff;
}
.ai-chat-send-btn:hover {
    opacity: 0.9;
}
.ai-chat-send-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
.ai-chat-clear-btn {
    background: transparent;
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
}
.ai-chat-clear-btn:hover {
    color: var(--text-primary);
    border-color: var(--text-secondary);
}
/* 输入栏占位提示 */
.ai-chat-bar.ai-chat-loading .ai-chat-send-btn::after {
    content: ' ...';
    letter-spacing: 2px;
}
/* 移动端适配 */
@media (max-width: 768px) {
    .ai-chat-bar { height: 100px; }
    .ai-chat-bar.ai-chat-collapsed { height: 40px; }
    .ai-chat-input-row { padding: 4px 8px; height: 40px; gap: 4px; }
    .ai-chat-send-btn, .ai-chat-clear-btn { padding: 0 8px; font-size: 12px; }
    .ai-chat-clear-btn { display: none; }
}

/* 快捷操作按钮区（输入框上方） */
.ai-chat-quick-row {
    display: flex;
    gap: 4px;
    padding: 4px 8px;
    border-top: 1px solid var(--border-color);
    background: var(--card-bg);
    overflow-x: auto;
    flex-shrink: 0;
    scrollbar-width: thin;
}
.ai-chat-quick-row::-webkit-scrollbar { height: 4px; }
.ai-chat-quick-row::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 2px; }
.ai-chat-quick-btn {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 3px 8px;
    font-size: 12px;
    color: var(--text-secondary, #6b7280);
    background: var(--bg-color, #f3f4f6);
    border: 1px solid transparent;
    border-radius: 12px;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    transition: background 0.12s, color 0.12s;
}
.ai-chat-quick-btn:hover {
    background: var(--primary-color, #6366f1);
    color: #fff;
}
.ai-chat-quick-btn .qa-ico { font-size: 12px; }
.ai-chat-quick-group { position: relative; flex-shrink: 0; }
.ai-chat-quick-trigger .qa-caret { font-size: 9px; margin-left: 2px; opacity: 0.7; }
.ai-chat-quick-dropdown {
    position: absolute;
    bottom: 100%;
    left: 0;
    display: none;
    flex-direction: column;
    gap: 2px;
    padding: 4px;
    background: var(--card-bg, #fff);
    border: 1px solid var(--border-color, #e5e7eb);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.12);
    min-width: 110px;
    z-index: 20;
    margin-bottom: 2px;
}
.ai-chat-quick-group.qa-open .ai-chat-quick-dropdown { display: flex; }
.ai-chat-quick-group.qa-open .qa-caret { transform: rotate(180deg); }
.ai-chat-quick-dropdown .ai-chat-quick-btn { width: 100%; justify-content: flex-start; }
.ai-chat-bar.ai-chat-collapsed .ai-chat-quick-row { display: none; }
`;

    function injectStyle() {
        if (document.getElementById('ai-chat-style')) return;
        const st = document.createElement('style');
        st.id = 'ai-chat-style';
        st.textContent = cssText;
        document.head.appendChild(st);
    }

    // ==================== 状态 ====================
    const MAX_HISTORY = 30;
    const state = {
        messages: [],          // [{role:'user'|'assistant'|'system'|'error'|'info', content}]
        loading: false,
        collapsed: false,
        config: null,          // api_config 缓存
        configLoadedAt: 0
    };
    const CONFIG_TTL = 60 * 1000; // 1 分钟内复用

    // ==================== 工具 ====================
    function $(id) { return document.getElementById(id); }

    function now() { return new Date().toISOString(); }

    function apiRequestWrap(url, method, data) {
        if (typeof apiRequest === 'function') return apiRequest(url, method, data || null);
        return Promise.reject(new Error('apiRequest 未就绪'));
    }

    async function loadApiConfig(force) {
        const ts = Date.now();
        if (!force && state.config && (ts - state.configLoadedAt) < CONFIG_TTL) {
            return state.config;
        }
        const cfg = await apiRequestWrap('/api/mod/api_config');
        state.config = cfg || null;
        state.configLoadedAt = ts;
        return state.config;
    }

    function showToastSafe(msg, type) {
        if (typeof showToast === 'function') showToast(msg, type);
        else console.log('[AiChat][' + (type || 'info') + '] ' + msg);
    }

    function escapeHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // ==================== AI 工具调用注册表 ====================
    // 让对话栏 AI 能调用页面操作（用途二：运行时通过 API 进行一部分操作）
    // 协议：LLM 在回复中嵌入 <<tool:{"name":"navigateTo","args":["chapter_review"]}>> 标记
    // 对话栏解析、执行、把结果回灌给 LLM 让其给出最终回复
    const tools = {
        // ==================== 通用模块工具 ====================
        listModules: {
            desc: '列出所有可用模块（id + 名称 + 分组）。无需参数。',
            args: '[]',
            run: async function () {
                if (typeof ModuleRegistry === 'undefined') return { ok: false, error: 'ModuleRegistry 未就绪' };
                const groups = ['pinned', 'world', 'character', 'story', 'writing', 'system'];
                const out = [];
                groups.forEach(g => {
                    if (ModuleRegistry.getModulesByGroup) {
                        const mods = ModuleRegistry.getModulesByGroup(g) || [];
                        mods.forEach(m => out.push({ id: m.id, name: m.name, group: m.group }));
                    }
                });
                return { ok: true, count: out.length, modules: out };
            }
        },
        navigateTo: {
            desc: '跳转到指定模块页面（在左侧导航栏切换）。args: [moduleId: string]，如 "chapter_review" / "characters" / "worldview" / "glossary"。',
            args: '["chapter_review"]',
            run: async function (moduleId) {
                if (!moduleId) return { ok: false, error: '缺少 moduleId 参数' };
                if (typeof ModuleRegistry === 'undefined' || !ModuleRegistry.handleNavClick) {
                    return { ok: false, error: 'ModuleRegistry 未就绪' };
                }
                ModuleRegistry.handleNavClick(moduleId);
                return { ok: true, moduleId: moduleId };
            }
        },
        getModule: {
            desc: '通用读取任意数据模块完整内容。args: [moduleName: string]。常用模块名：character/currency/inventory/equipment/equipment_slots/quests/skills/story/locations/worldview/glossary/timeline/chapters/phrase_library/inspiration/characters/relations/item_library/api_config 等。',
            args: '["worldview"]',
            run: async function (moduleName) {
                if (!moduleName) return { ok: false, error: '缺少 moduleName 参数' };
                const data = await apiRequestWrap('/api/mod/' + moduleName);
                return { ok: true, module: moduleName, data: data };
            }
        },
        saveModule: {
            desc: '通用全量保存数据模块（覆盖式写入）。args: [moduleName: string, data: any]。注意：data 会完全替换原有内容，请先 getModule 读取再修改后回传。',
            args: '["worldview", {"background":"...", "rules":"..."}]',
            run: async function (moduleName, data) {
                if (!moduleName) return { ok: false, error: '缺少 moduleName 参数' };
                if (data === undefined) return { ok: false, error: '缺少 data 参数' };
                await apiRequestWrap('/api/mod/' + moduleName + '/save', 'POST', data);
                return { ok: true, module: moduleName, saved: true };
            }
        },
        addItem: {
            desc: '向数组型模块追加一条记录（自动生成 id）。args: [moduleName: string, item: object]。适用模块：characters/relations/relation_types/item_library/glossary/timeline/timeline_eras/chapters/inspiration/inspiration_tags/phrase_library。item 字段因模块而异，常见：{name, description, category, ...}。',
            args: '["glossary", {"name":"灵气","category":"力量体系","definition":"天地间游离的能量"}]',
            run: async function (moduleName, item) {
                if (!moduleName) return { ok: false, error: '缺少 moduleName 参数' };
                if (!item || typeof item !== 'object') return { ok: false, error: '缺少 item 参数（应为对象）' };
                const resp = await apiRequestWrap('/api/mod/' + moduleName + '/add', 'POST', item);
                if (resp && resp.success === false) return { ok: false, error: resp.error || '保存失败' };
                return { ok: true, module: moduleName, item: resp && resp.item || item, data: resp && resp.data };
            }
        },
        updateItem: {
            desc: '按 id 编辑数组型模块中的某条记录（合并字段）。args: [moduleName: string, id: string, patch: object]。patch 中只需包含要修改的字段。',
            args: '["glossary", "glossary_xxx", {"definition":"更新后的定义"}]',
            run: async function (moduleName, id, patch) {
                if (!moduleName || !id) return { ok: false, error: '缺少 moduleName 或 id 参数' };
                if (!patch || typeof patch !== 'object') return { ok: false, error: '缺少 patch 参数（应为对象）' };
                const payload = Object.assign({ id: id }, patch);
                const resp = await apiRequestWrap('/api/mod/' + moduleName + '/edit', 'POST', payload);
                if (resp && resp.success === false) return { ok: false, error: resp.error || '更新失败' };
                return { ok: true, module: moduleName, id: id, item: resp && resp.item, data: resp && resp.data };
            }
        },
        deleteItem: {
            desc: '按 id 删除数组型模块中的某条记录。args: [moduleName: string, id: string]。',
            args: '["glossary", "glossary_xxx"]',
            run: async function (moduleName, id) {
                if (!moduleName || !id) return { ok: false, error: '缺少 moduleName 或 id 参数' };
                const resp = await apiRequestWrap('/api/mod/' + moduleName + '/delete', 'POST', { id: id });
                if (resp && resp.success === false) return { ok: false, error: resp.error || '删除失败' };
                return { ok: true, module: moduleName, id: id, data: resp && resp.data };
            }
        },

        // ==================== 章节专用 ====================
        getChapters: {
            desc: '读取所有章节列表（id + 标题 + 字数 + 状态 + 是否有审查）。无需参数。',
            args: '[]',
            run: async function () {
                const chs = await apiRequestWrap('/api/mod/chapters') || [];
                return {
                    ok: true,
                    count: chs.length,
                    chapters: chs.map(c => ({
                        id: c.id, title: c.title, word_count: c.word_count,
                        status: c.status, hasReview: !!(c.review_cache && c.review_cache.issues)
                    }))
                };
            }
        },
        getChapter: {
            desc: '读取指定章节详情（含正文，正文截断 4000 字）。args: [chapterId: string]。',
            args: '["ch_xxx"]',
            run: async function (id) {
                if (!id) return { ok: false, error: '缺少 chapterId 参数' };
                const chs = await apiRequestWrap('/api/mod/chapters') || [];
                const ch = chs.find(c => c.id === id);
                if (!ch) return { ok: false, error: '未找到章节 ' + id };
                return {
                    ok: true,
                    chapter: {
                        id: ch.id, title: ch.title, status: ch.status,
                        word_count: ch.word_count, outline: ch.outline || '',
                        content: (ch.content || '').slice(0, 4000)
                    }
                };
            }
        },
        createChapter: {
            desc: '新建章节草稿（不写正文，自动追加到末尾）。args: [title: string, outline?: string]。',
            args: '["第X章 标题", "可选大纲"]',
            run: async function (title, outline) {
                if (!title) return { ok: false, error: '缺少 title 参数' };
                const chs = await apiRequestWrap('/api/mod/chapters') || [];
                const id = 'ch_' + Date.now().toString(36);
                const newCh = {
                    id: id,
                    title: title,
                    word_count: 0,
                    outline: outline || '',
                    status: 'draft',
                    notes: '由 AI 助手创建',
                    order: (chs.reduce((m, c) => Math.max(m, c.order || 0), 0) + 1),
                    content: '',
                    review_cache: null
                };
                chs.push(newCh);
                await apiRequestWrap('/api/mod/chapters/save', 'POST', chs);
                return { ok: true, chapterId: id, title: title };
            }
        },
        updateChapter: {
            desc: '编辑章节字段（合并写入）。args: [chapterId: string, patch: object]。patch 可含：title/outline/status/content/notes。status 可为 draft/writing/completed/reviewed。若修改 content 会自动重算 word_count。',
            args: '["ch_xxx", {"status":"completed", "content":"新的正文内容..."}]',
            run: async function (id, patch) {
                if (!id) return { ok: false, error: '缺少 chapterId 参数' };
                if (!patch || typeof patch !== 'object') return { ok: false, error: '缺少 patch 参数' };
                const chs = await apiRequestWrap('/api/mod/chapters') || [];
                const idx = chs.findIndex(c => c.id === id);
                if (idx === -1) return { ok: false, error: '未找到章节 ' + id };
                const updated = Object.assign({}, chs[idx], patch);
                if (patch.content !== undefined) {
                    updated.word_count = (patch.content || '').replace(/\s+/g, '').length;
                }
                chs[idx] = updated;
                await apiRequestWrap('/api/mod/chapters/save', 'POST', chs);
                return { ok: true, chapterId: id, title: updated.title, word_count: updated.word_count, status: updated.status };
            }
        },
        deleteChapter: {
            desc: '删除指定章节。args: [chapterId: string]。',
            args: '["ch_xxx"]',
            run: async function (id) {
                if (!id) return { ok: false, error: '缺少 chapterId 参数' };
                const chs = await apiRequestWrap('/api/mod/chapters') || [];
                const filtered = chs.filter(c => c.id !== id);
                if (filtered.length === chs.length) return { ok: false, error: '未找到章节 ' + id };
                await apiRequestWrap('/api/mod/chapters/save', 'POST', filtered);
                return { ok: true, chapterId: id, remaining: filtered.length };
            }
        },

        // ==================== 人物关系专用 ====================
        addCharacter: {
            desc: '添加人物到人物关系模块（自动生成 id）。args: [name: string, avatar?: string, description?: string]。avatar 为单个 emoji，如 "👤" "🧙"。',
            args: '["林月", "🧙", "隐世剑修，性格冷淡"]',
            run: async function (name, avatar, description) {
                if (!name) return { ok: false, error: '缺少 name 参数' };
                const resp = await apiRequestWrap('/api/characters/add', 'POST', {
                    name: name, avatar: avatar || '👤', description: description || ''
                });
                if (resp && resp.success === false) return { ok: false, error: resp.error || '添加失败' };
                return { ok: true, characters: resp && resp.characters };
            }
        },
        updateCharacter: {
            desc: '编辑人物字段（按 id 合并）。args: [characterId: string, patch: object]。patch 可含：name/avatar/description。',
            args: '["char_xxx", {"description":"更新后的人物描述"}]',
            run: async function (id, patch) {
                if (!id) return { ok: false, error: '缺少 characterId 参数' };
                if (!patch || typeof patch !== 'object') return { ok: false, error: '缺少 patch 参数' };
                const payload = Object.assign({ id: id }, patch);
                const resp = await apiRequestWrap('/api/characters/edit', 'POST', payload);
                if (resp && resp.success === false) return { ok: false, error: resp.error || '更新失败' };
                return { ok: true, characters: resp && resp.characters };
            }
        },
        deleteCharacter: {
            desc: '删除指定人物。args: [characterId: string]。',
            args: '["char_xxx"]',
            run: async function (id) {
                if (!id) return { ok: false, error: '缺少 characterId 参数' };
                const resp = await apiRequestWrap('/api/characters/delete', 'POST', { id: id });
                if (resp && resp.success === false) return { ok: false, error: resp.error || '删除失败' };
                return { ok: true, characters: resp && resp.characters };
            }
        },
        addRelation: {
            desc: '添加人物关系。args: [fromCharacterId: string, toCharacterId: string, type: string, description?: string]。type 如 "师父" "仇敌" "恋人" "盟友"。',
            args: '["char_a", "char_b", "师徒", "传剑之恩"]',
            run: async function (from, to, type, description) {
                if (!from || !to) return { ok: false, error: '缺少 from 或 to 参数' };
                const resp = await apiRequestWrap('/api/relations/add', 'POST', {
                    from: from, to: to, type: type || '关系', description: description || ''
                });
                if (resp && resp.success === false) return { ok: false, error: resp.error || '添加失败' };
                return { ok: true, relations: resp && resp.relations };
            }
        },
        deleteRelation: {
            desc: '删除指定关系。args: [relationId: string]。',
            args: '["rel_xxx"]',
            run: async function (id) {
                if (!id) return { ok: false, error: '缺少 relationId 参数' };
                const resp = await apiRequestWrap('/api/relations/delete', 'POST', { id: id });
                if (resp && resp.success === false) return { ok: false, error: resp.error || '删除失败' };
                return { ok: true, relations: resp && resp.relations };
            }
        },

        // ==================== 物品库+背包+装备专用 ====================
        addItemDefinition: {
            desc: '在物品库添加物品定义。args: [name: string, type?: string, description?: string, icon?: string, categoryId?: string]。type 如 weapon/armor/accessory/consumable/material。',
            args: '["寒霜剑", "weapon", "三尺青锋，触之生寒", "🗡️", ""]',
            run: async function (name, type, description, icon, categoryId) {
                if (!name) return { ok: false, error: '缺少 name 参数' };
                const resp = await apiRequestWrap('/api/items/library/add', 'POST', {
                    name: name, type: type || '', description: description || '',
                    icon: icon || '📦', category_id: categoryId || ''
                });
                if (resp && resp.success === false) return { ok: false, error: resp.error || '添加失败' };
                return { ok: true, items: resp && resp.items };
            }
        },
        updateItemDefinition: {
            desc: '编辑物品库中物品定义（按 id 合并）。args: [itemId: string, patch: object]。patch 可含：name/icon/type/description/category_id/level。',
            args: '["item_xxx", {"description":"更新后的描述"}]',
            run: async function (id, patch) {
                if (!id) return { ok: false, error: '缺少 itemId 参数' };
                if (!patch || typeof patch !== 'object') return { ok: false, error: '缺少 patch 参数' };
                const payload = Object.assign({ item_id: id }, patch);
                const resp = await apiRequestWrap('/api/items/library/edit', 'POST', payload);
                if (resp && resp.success === false) return { ok: false, error: resp.error || '更新失败' };
                return { ok: true, items: resp && resp.items };
            }
        },
        deleteItemDefinition: {
            desc: '从物品库删除物品定义。args: [itemId: string]。',
            args: '["item_xxx"]',
            run: async function (id) {
                if (!id) return { ok: false, error: '缺少 itemId 参数' };
                const resp = await apiRequestWrap('/api/items/library/delete', 'POST', { item_id: id });
                if (resp && resp.success === false) return { ok: false, error: resp.error || '删除失败' };
                return { ok: true, items: resp && resp.items };
            }
        },
        addInventoryItem: {
            desc: '将物品库中的物品放入主角背包（数量叠加）。args: [itemId: string, quantity?: number]。itemId 必须是物品库中已存在的 id。',
            args: '["item_xxx", 3]',
            run: async function (itemId, quantity) {
                if (!itemId) return { ok: false, error: '缺少 itemId 参数' };
                const resp = await apiRequestWrap('/api/inventory/add', 'POST', {
                    item_id: itemId, quantity: Number(quantity) || 1
                });
                if (resp && resp.success === false) return { ok: false, error: resp.error || '添加失败' };
                return { ok: true, inventory: resp && resp.inventory };
            }
        },
        equipItem: {
            desc: '装备背包中的物品到指定槽位（旧装备回背包，背包数量减 1）。args: [itemId: string, slot?: string]。slot 省略时按物品 type/equip_slot 自动推断，如 weapon/armor/accessory。',
            args: '["item_xxx", "weapon"]',
            run: async function (itemId, slot) {
                if (!itemId) return { ok: false, error: '缺少 itemId 参数' };
                const payload = { item_id: itemId };
                if (slot) payload.slot = slot;
                const resp = await apiRequestWrap('/api/equipment/equip', 'POST', payload);
                if (resp && resp.success === false) return { ok: false, error: resp.error || '装备失败' };
                return { ok: true, equipment: resp && resp.equipment, inventory: resp && resp.inventory };
            }
        },
        unequipItem: {
            desc: '卸下指定槽位的装备（放回背包）。args: [slot: string]，如 "weapon" / "armor" / "accessory"。',
            args: '["weapon"]',
            run: async function (slot) {
                if (!slot) return { ok: false, error: '缺少 slot 参数' };
                const resp = await apiRequestWrap('/api/equipment/unequip', 'POST', { slot: slot });
                if (resp && resp.success === false) return { ok: false, error: resp.error || '卸下失败' };
                return { ok: true, equipment: resp && resp.equipment, inventory: resp && resp.inventory };
            }
        },

        // ==================== 货币/技能/任务专用 ====================
        setCurrency: {
            desc: '设置主角某种货币的数量（覆盖式）。args: [type: string, amount: number]。type 为货币类型 id（如 "gold" "spirit_stone"），需先在货币类型模块中定义。',
            args: '["gold", 1000]',
            run: async function (type, amount) {
                if (!type) return { ok: false, error: '缺少 type 参数' };
                const resp = await apiRequestWrap('/api/currency/set', 'POST', {
                    type: type, amount: Number(amount) || 0
                });
                if (resp && resp.success === false) return { ok: false, error: resp.error || '设置失败' };
                return { ok: true, currency: resp && resp.currency };
            }
        },
        learnSkill: {
            desc: '让主角学习技能（设置等级，标记 learned=true）。args: [skillId: string, level?: number]。',
            args: '["skill_xxx", 1]',
            run: async function (skillId, level) {
                if (!skillId) return { ok: false, error: '缺少 skillId 参数' };
                const resp = await apiRequestWrap('/api/skills/learn', 'POST', {
                    skill_id: skillId, level: Number(level) || 1
                });
                if (resp && resp.success === false) return { ok: false, error: resp.error || '学习失败' };
                return { ok: true, skills: resp && resp.skills };
            }
        },
        updateQuest: {
            desc: '更新任务状态或进度。args: [questId: string, status?: string, progress?: number]。status 可为 in_progress/completed；progress 为 0-100 整数。两者至少传一个。',
            args: '["quest_xxx", "completed", 100]',
            run: async function (questId, status, progress) {
                if (!questId) return { ok: false, error: '缺少 questId 参数' };
                if (status === undefined && progress === undefined) return { ok: false, error: '至少需要 status 或 progress 之一' };
                let resp;
                if (status === 'completed') {
                    resp = await apiRequestWrap('/api/quests/complete', 'POST', { quest_id: questId });
                } else if (status === 'in_progress') {
                    resp = await apiRequestWrap('/api/quests/accept', 'POST', { quest_id: questId });
                    if (progress !== undefined && resp && resp.success !== false) {
                        resp = await apiRequestWrap('/api/quests/progress', 'POST', { quest_id: questId, progress: Number(progress) || 0 });
                    }
                } else if (progress !== undefined) {
                    resp = await apiRequestWrap('/api/quests/progress', 'POST', { quest_id: questId, progress: Number(progress) || 0 });
                } else {
                    return { ok: false, error: '不支持的 status：' + status };
                }
                if (resp && resp.success === false) return { ok: false, error: resp.error || '更新失败' };
                return { ok: true, quests: resp && resp.quests };
            }
        },

        // ==================== 剧情+地图专用 ====================
        addLocation: {
            desc: '添加地图地点。args: [name: string, typeId?: string, description?: string, icon?: string]。',
            args: '["青云山", "mountain", "剑修圣地，云雾缭绕", "⛰️"]',
            run: async function (name, typeId, description, icon) {
                if (!name) return { ok: false, error: '缺少 name 参数' };
                const payload = { name: name, description: description || '', icon: icon || '📍' };
                if (typeId) payload.type_id = typeId;
                const resp = await apiRequestWrap('/api/locations/create', 'POST', payload);
                if (resp && resp.success === false) return { ok: false, error: resp.error || '添加失败' };
                return { ok: true, locations: resp && resp.locations };
            }
        },
        addStoryMark: {
            desc: '添加剧情标记（关键节点记录）。args: [markId: string, title?: string, description?: string, chapterId?: string]。markId 是用户自定义的标记键，如 "first_blood" "meeting_master"。',
            args: '["meeting_master", "初遇师父", "林月在青云山遇见剑圣", "ch_xxx"]',
            run: async function (markId, title, description, chapterId) {
                if (!markId) return { ok: false, error: '缺少 markId 参数' };
                const payload = { mark_id: markId, title: title || markId, description: description || '' };
                if (chapterId) payload.chapter_id = chapterId;
                const resp = await apiRequestWrap('/api/story/marks/add', 'POST', payload);
                if (resp && resp.success === false) return { ok: false, error: resp.error || '添加失败' };
                return { ok: true, marks: resp && resp.marks };
            }
        },
        addForeshadowing: {
            desc: '添加伏笔记录。args: [foreshadowId: string, description: string, chapterId?: string, resolved?: boolean]。foreshadowId 是用户自定义键，如 "broken_sword"。',
            args: '["broken_sword", "林月佩剑上的裂纹，将在第三卷揭示其来历", "ch_xxx"]',
            run: async function (foreshadowId, description, chapterId, resolved) {
                if (!foreshadowId) return { ok: false, error: '缺少 foreshadowId 参数' };
                if (!description) return { ok: false, error: '缺少 description 参数' };
                const payload = {
                    foreshadow_id: foreshadowId, id: foreshadowId,
                    description: description, resolved: resolved === true
                };
                if (chapterId) payload.chapter_id = chapterId;
                const resp = await apiRequestWrap('/api/foreshadowing/add', 'POST', payload);
                if (resp && resp.success === false) return { ok: false, error: resp.error || '添加失败' };
                return { ok: true, foreshadowing: resp && resp.foreshadowing };
            }
        },

        // ==================== 写作辅助模块 ====================
        getWorldview: {
            desc: '读取当前小说世界观设定（background/rules/location 等字段）。无需参数。',
            args: '[]',
            run: async function () {
                const wv = await apiRequestWrap('/api/mod/worldview');
                return { ok: true, worldview: wv || {} };
            }
        },
        saveWorldview: {
            desc: '保存世界观设定（合并写入，仅修改传入字段）。args: [patch: object]。常见字段：background（背景）、rules（规则/力量体系）、location（主要地点）、era（时代）、theme（主题）。',
            args: '[{"background":"九州大陆，灵气复苏", "rules":"修真五境：练气、筑基、金丹、元婴、化神"}]',
            run: async function (patch) {
                if (!patch || typeof patch !== 'object') return { ok: false, error: '缺少 patch 参数' };
                const cur = await apiRequestWrap('/api/mod/worldview') || {};
                const merged = Object.assign({}, cur, patch);
                await apiRequestWrap('/api/mod/worldview/save', 'POST', merged);
                return { ok: true, worldview: merged };
            }
        },
        addGlossary: {
            desc: '添加术语表条目。args: [name: string, category?: string, definition?: string]。category 如 "人物" "地点" "力量体系" "物品"。',
            args: '["剑心", "力量体系", "剑修的精神境界，决定剑气纯度"]',
            run: async function (name, category, definition) {
                if (!name) return { ok: false, error: '缺少 name 参数' };
                const resp = await apiRequestWrap('/api/mod/glossary/add', 'POST', {
                    name: name, category: category || '', definition: definition || ''
                });
                if (resp && resp.success === false) return { ok: false, error: resp.error || '添加失败' };
                return { ok: true, item: resp && resp.item, data: resp && resp.data };
            }
        },
        addTimelineEvent: {
            desc: '添加时间线事件。args: [title: string, time?: string, description?: string, era?: string, chapterId?: string]。',
            args: '["剑圣收徒", "天元元年春", "林月拜入剑圣门下", "天元纪", "ch_xxx"]',
            run: async function (title, time, description, era, chapterId) {
                if (!title) return { ok: false, error: '缺少 title 参数' };
                const payload = {
                    title: title, time: time || '', description: description || '',
                    era: era || ''
                };
                if (chapterId) payload.chapter_id = chapterId;
                const resp = await apiRequestWrap('/api/mod/timeline/add', 'POST', payload);
                if (resp && resp.success === false) return { ok: false, error: resp.error || '添加失败' };
                return { ok: true, item: resp && resp.item, data: resp && resp.data };
            }
        },
        addInspiration: {
            desc: '添加灵感记录。args: [content: string, tags?: array, category?: string]。tags 为字符串数组。',
            args: '["林月在月下练剑时，剑光忽然凝成实质", ["剑修", "转折点"], "剧情"]',
            run: async function (content, tags, category) {
                if (!content) return { ok: false, error: '缺少 content 参数' };
                const payload = {
                    content: content,
                    tags: Array.isArray(tags) ? tags : [],
                    category: category || ''
                };
                const resp = await apiRequestWrap('/api/mod/inspiration/add', 'POST', payload);
                if (resp && resp.success === false) return { ok: false, error: resp.error || '添加失败' };
                return { ok: true, item: resp && resp.item, data: resp && resp.data };
            }
        },
        addPhrase: {
            desc: '添加预设文本库条目（可复用的段落/句式）。args: [content: string, category?: string, tags?: array, sourceChapterId?: string]。',
            args: '["月色如水，剑光似霜，二者交相辉映", "景物描写", ["月夜", "剑"], "ch_xxx"]',
            run: async function (content, category, tags, sourceChapterId) {
                if (!content) return { ok: false, error: '缺少 content 参数' };
                const payload = {
                    content: content,
                    category: category || '',
                    tags: Array.isArray(tags) ? tags : []
                };
                if (sourceChapterId) payload.source_chapter = sourceChapterId;
                const resp = await apiRequestWrap('/api/mod/phrase_library/add', 'POST', payload);
                if (resp && resp.success === false) return { ok: false, error: resp.error || '添加失败' };
                return { ok: true, item: resp && resp.item, data: resp && resp.data };
            }
        },

        // ==================== 反馈 ====================
        getFeedback: {
            desc: '获取当前页面操作反馈快照（页面、活跃模块、关键 DOM、章节列表、视口等）。仅在开发环境可用。',
            args: '[]',
            run: async function () {
                if (window.NovelTestAPI && typeof window.NovelTestAPI.getOperationFeedback === 'function') {
                    return await window.NovelTestAPI.getOperationFeedback({ maxText: 300 });
                }
                return { ok: false, error: 'NovelTestAPI 未就绪（仅开发环境可用）' };
            }
        }
    };

    const TOOL_PATTERN = /<<tool:([\s\S]*?)>>/g;

    function parseToolCalls(text) {
        const calls = [];
        let m;
        TOOL_PATTERN.lastIndex = 0;
        while ((m = TOOL_PATTERN.exec(text)) !== null) {
            try {
                const obj = JSON.parse(m[1]);
                if (obj && obj.name && tools[obj.name]) {
                    calls.push({ name: obj.name, args: Array.isArray(obj.args) ? obj.args : [] });
                }
            } catch (_) { /* 跳过解析失败的 */ }
        }
        return calls;
    }

    function stripToolMarkers(text) {
        return text.replace(TOOL_PATTERN, '').trim();
    }

    async function executeTool(name, args) {
        try {
            const t = tools[name];
            if (!t) return { ok: false, error: '未知工具: ' + name };
            const result = await t.run.apply(null, args || []);
            return result;
        } catch (e) {
            return { ok: false, error: (e && e.message) ? e.message : String(e) };
        }
    }

    function buildToolSystemPrompt() {
        const lines = ['【可用工具】你可以在回复中嵌入工具调用标记来执行页面操作，格式严格为：<<tool:{"name":"工具名","args":["参数1","参数2"]}>>'];
        lines.push('调用后系统会执行并把结果回灌给你，你再基于结果给出最终回复。每次回复最多调用 3 个工具，最多 4 轮工具调用以完成多步操作。');
        lines.push('工具列表：');
        Object.keys(tools).forEach(name => {
            lines.push('- ' + name + '(' + tools[name].args + '): ' + tools[name].desc);
        });
        return lines.join('\n');
    }

    // ==================== LLM 调用（OpenAI 兼容格式）====================
    async function callLLM(cfg, messages) {
        const body = {
            model: cfg.model || '',
            messages: messages,
            temperature: typeof cfg.temperature === 'number' ? cfg.temperature : 0.3,
            max_tokens: cfg.max_tokens || 4096,
            stream: false
        };
        const headers = { 'Content-Type': 'application/json' };
        if (cfg.api_key) headers['Authorization'] = 'Bearer ' + cfg.api_key;
        const resp = await fetch(cfg.api_url, { method: 'POST', headers, body: JSON.stringify(body) });
        if (!resp.ok) {
            const txt = await resp.text().catch(() => '');
            throw new Error('HTTP ' + resp.status + ' ' + txt.slice(0, 200));
        }
        const data = await resp.json();
        return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content)
            || data.content || '';
    }

    // 构建上下文：附加当前小说设定摘要（轻量）
    async function buildContextSystem(cfg) {
        const sys = (cfg.system_prompt && cfg.system_prompt.trim())
            ? cfg.system_prompt
            : '你是一位资深的小说写作助手。用户正在使用一个小说管理器软件进行写作，你可以帮助用户讨论情节、塑造人物、推敲文笔、解决写作难题。回答应当简洁、有针对性，避免长篇大论。';
        const parts = [sys];

        try {
            // 附加世界观 + 术语表（仅名称+定义）
            const [wv, gl] = await Promise.all([
                apiRequestWrap('/api/mod/worldview').catch(() => null),
                apiRequestWrap('/api/mod/glossary').catch(() => null)
            ]);
            if (wv && typeof wv === 'object') {
                const wvLines = [];
                if (wv.background) wvLines.push('背景: ' + wv.background);
                if (wv.rules) wvLines.push('规则: ' + wv.rules);
                if (wv.location) wvLines.push('地点: ' + wv.location);
                if (wvLines.length) parts.push('【当前小说世界观】\n' + wvLines.join('\n'));
            }
            if (Array.isArray(gl) && gl.length > 0) {
                const glText = gl.slice(0, 30)
                    .map(g => '- ' + g.name + '（' + (g.category || '') + '）：' + (g.definition || ''))
                    .join('\n');
                parts.push('【术语表（前 30 条）】\n' + glText);
            }
        } catch (_) { /* 忽略上下文加载失败 */ }

        parts.push('注意：你的回复不会被写入章节正文，仅作为对话显示在底部对话栏。');
        parts.push(buildToolSystemPrompt());
        return parts.join('\n\n');
    }

    // ==================== 渲染 ====================
    function renderMessages() {
        const box = $('ai-chat-messages');
        if (!box) return;
        // 仅渲染最新若干条
        const list = state.messages.slice(-MAX_HISTORY);
        // 复用 DOM 节点：简化为全量重渲染
        box.innerHTML = '';
        list.forEach(m => {
            const div = document.createElement('div');
            div.className = 'ai-chat-msg ai-msg-' + m.role;
            const roleLabel = m.role === 'user' ? '我' :
                              m.role === 'assistant' ? 'AI' :
                              m.role === 'error' ? '错误' :
                              m.role === 'info' ? '提示' :
                              m.role === 'tool' ? '工具' : m.role;
            // 工具消息内容较长，做截断显示
            let displayContent = m.content;
            if (m.role === 'tool' && displayContent.length > 500) {
                displayContent = displayContent.slice(0, 500) + '\n...（结果已截断，完整数据已传给 AI）';
            }
            div.innerHTML = '<b class="ai-chat-role">' + escapeHtml(roleLabel) + '：</b>' + escapeHtml(displayContent);
            box.appendChild(div);
        });
        // 滚动到底
        box.scrollTop = box.scrollHeight;
    }

    function appendMessage(role, content) {
        state.messages.push({ role, content, time: now() });
        if (state.messages.length > MAX_HISTORY * 2) {
            state.messages = state.messages.slice(-MAX_HISTORY);
        }
        renderMessages();
    }

    function setLoading(loading) {
        state.loading = loading;
        const bar = $('ai-chat-bar');
        const sendBtn = $('ai-chat-send');
        if (bar) bar.classList.toggle('ai-chat-loading', loading);
        if (sendBtn) sendBtn.disabled = loading;
    }

    // ==================== 发送流程（含工具调用循环）====================
    const MAX_TOOL_ROUNDS = 4;

    function buildLlmMessages(cfg) {
        const sysPrompt = state._cachedSysPrompt || '';
        // 把工具结果作为 user 消息附加（OpenAI 兼容，避免依赖 tool 角色）
        const history = state.messages
            .filter(m => m.role === 'user' || m.role === 'assistant' || m.role === 'tool')
            .slice(-20)
            .map(m => {
                if (m.role === 'tool') {
                    return { role: 'user', content: '【工具执行结果】' + m.content };
                }
                // assistant 历史中保留工具标记（让 LLM 知道自己调过什么）
                return { role: m.role, content: m.content };
            });
        return [{ role: 'system', content: sysPrompt }].concat(history);
    }

    async function send(text) {
        text = (text || '').trim();
        if (!text) return;
        if (state.loading) return;

        // 1. 加载 API 配置
        let cfg;
        try {
            cfg = await loadApiConfig();
        } catch (e) {
            appendMessage('error', '读取 API 配置失败：' + (e && e.message || e));
            return;
        }
        if (!cfg || !cfg.api_url) {
            appendMessage('error', '未配置 API。请先到「系统 → API 配置」设置 api_url。');
            showToastSafe('请先在「系统 → API 配置」中设置 API 地址', 'error');
            return;
        }

        // 2. 追加用户消息
        appendMessage('user', text);

        // 3. 构建上下文 + 调用 LLM（带工具调用循环）
        setLoading(true);
        try {
            state._cachedSysPrompt = await buildContextSystem(cfg);

            for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
                const messages = buildLlmMessages(cfg);
                const reply = await callLLM(cfg, messages);
                const cleaned = stripToolMarkers(reply || '');
                const toolCalls = parseToolCalls(reply || '');

                if (cleaned) appendMessage('assistant', cleaned);

                // 无工具调用 → LLM 已给出最终回复
                if (toolCalls.length === 0) {
                    if (!cleaned) appendMessage('assistant', '（空回复）');
                    break;
                }

                // 已达最后一轮：不再执行新工具，结束
                if (round === MAX_TOOL_ROUNDS) {
                    appendMessage('info', '已达工具调用轮数上限，请基于现有结果继续提问。');
                    break;
                }

                // 执行工具调用（最多取前 3 个，防止 LLM 滥用）
                const callsToRun = toolCalls.slice(0, 3);
                for (const call of callsToRun) {
                    appendMessage('info', '调用工具: ' + call.name + '(' + JSON.stringify(call.args) + ')');
                    const result = await executeTool(call.name, call.args);
                    appendMessage('tool', call.name + ' → ' + JSON.stringify(result));
                }
                // 继续下一轮：LLM 会看到工具结果并给出最终回复
            }
        } catch (e) {
            const msg = e && e.message ? e.message : String(e);
            appendMessage('error', '调用失败：' + msg);
            showToastSafe('AI 调用失败：' + msg.slice(0, 80), 'error');
        } finally {
            setLoading(false);
            state._cachedSysPrompt = null;
        }
    }

    // ==================== 事件绑定 ====================
    function bindEvents() {
        const input = $('ai-chat-input');
        const sendBtn = $('ai-chat-send');
        const clearBtn = $('ai-chat-clear');
        const toggleBtn = $('ai-chat-toggle');
        if (!input || !sendBtn) return;

        // 自适应高度
        function autoGrow() {
            input.style.height = '32px';
            input.style.height = Math.min(input.scrollHeight, 80) + 'px';
        }
        input.addEventListener('input', autoGrow);

        // 回车发送 / Shift+回车换行
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
                e.preventDefault();
                send(input.value);
                input.value = '';
                autoGrow();
            }
        });

        sendBtn.addEventListener('click', function () {
            send(input.value);
            input.value = '';
            autoGrow();
        });

        if (clearBtn) {
            clearBtn.addEventListener('click', function () {
                state.messages = [];
                renderMessages();
                appendMessage('info', '对话已清空');
            });
        }

        if (toggleBtn) {
            toggleBtn.addEventListener('click', function () {
                state.collapsed = !state.collapsed;
                const bar = $('ai-chat-bar');
                if (bar) bar.classList.toggle('ai-chat-collapsed', state.collapsed);
                // 展开时滚动到底
                if (!state.collapsed) {
                    setTimeout(() => {
                        const box = $('ai-chat-messages');
                        if (box) box.scrollTop = box.scrollHeight;
                    }, 50);
                }
            });
        }

        // 快捷操作按钮（输入框上方一排）
        const quickRow = $('ai-chat-quick-row');
        if (quickRow) {
            function closeAllQuickDropdowns() {
                quickRow.querySelectorAll('.ai-chat-quick-group.qa-open').forEach(function (g) {
                    g.classList.remove('qa-open');
                });
            }
            quickRow.addEventListener('click', function (e) {
                const trigger = e.target.closest('.ai-chat-quick-trigger');
                if (trigger) {
                    const group = trigger.closest('.ai-chat-quick-group');
                    const wasOpen = group.classList.contains('qa-open');
                    closeAllQuickDropdowns();
                    if (!wasOpen) group.classList.add('qa-open');
                    e.stopPropagation();
                    return;
                }
                const btn = e.target.closest('.ai-chat-quick-btn');
                if (!btn) return;
                closeAllQuickDropdowns();
                const action = btn.dataset.action;
                if (action === 'panel') {
                    if (window.QuickAccess && window.QuickAccess.togglePanel) {
                        window.QuickAccess.togglePanel();
                    } else {
                        showToastSafe('快捷面板尚未就绪', 'error');
                    }
                } else if (action === 'navigate') {
                    const mod = btn.dataset.module;
                    if (mod && typeof switchPage === 'function') {
                        switchPage(mod);
                    }
                } else if (action === 'ai-prompt') {
                    const prompt = btn.dataset.prompt || '';
                    if (prompt) {
                        const input = $('ai-chat-input');
                        if (input) {
                            input.value = prompt;
                            input.focus();
                            // 触发自适应高度
                            input.dispatchEvent(new Event('input'));
                        }
                    }
                }
            });
            // 点击外部关闭下拉
            document.addEventListener('click', function (e) {
                if (!quickRow.contains(e.target)) closeAllQuickDropdowns();
            });
        }
    }

    // ==================== 暴露状态（供 NovelTestAPI 读取）====================
    window.AiChatBar = {
        getState: function () {
            return {
                loading: state.loading,
                collapsed: state.collapsed,
                messageCount: state.messages.length,
                lastUserMessage: state.messages.filter(m => m.role === 'user').slice(-1)[0] || null,
                lastAssistantMessage: state.messages.filter(m => m.role === 'assistant').slice(-1)[0] || null,
                lastToolMessage: state.messages.filter(m => m.role === 'tool').slice(-1)[0] || null,
                hasApiConfig: !!(state.config && state.config.api_url)
            };
        },
        send: send,
        clear: function () {
            state.messages = [];
            renderMessages();
        },
        appendMessage: appendMessage,
        reloadConfig: function () { return loadApiConfig(true); },
        // 工具调用接口（供外部程序化调用，与对话栏 AI 共用同一套工具）
        listTools: function () {
            return Object.keys(tools).map(name => ({
                name: name,
                args: tools[name].args,
                desc: tools[name].desc
            }));
        },
        callTool: async function (name, args) {
            return await executeTool(name, args || []);
        }
    };

    // ==================== 初始化 ====================
    function init() {
        injectStyle();
        bindEvents();
        appendMessage('info', 'AI 写作助手已就绪。在下方输入框提问，回复不会写入章节正文。');
        console.log('%c[AiChat] AI 对话助手已就绪 (v3.2.0)', 'color:#6366f1;font-weight:bold;');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
