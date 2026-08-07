// ============================================================
// 模块: ID管理器 (mod_id_manager.js)
// 版本: 1.0.0 (全模块覆盖 / 跳转定位 / 反向引用 / 悬空检测)
// 全局 ID 查看与管理工具
// ============================================================
(function() {
    'use strict';

    const style = document.createElement('style');
    style.textContent = `
        .idm-container { display: flex; flex-direction: column; gap: 12px; }
        .idm-toolbar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .idm-toolbar input { flex: 1; min-width: 150px; padding: 8px 12px; border: 1px solid var(--border-color, #e5e7eb); border-radius: 6px; font-size: 13px; }
        .idm-toolbar select { padding: 8px 12px; border: 1px solid var(--border-color, #e5e7eb); border-radius: 6px; font-size: 13px; }
        .idm-tabs { display: flex; gap: 6px; }
        .idm-tab { padding: 6px 14px; border: 1px solid var(--border-color, #e5e7eb); background: transparent; cursor: pointer; border-radius: 6px; font-size: 13px; color: var(--text-primary, #374151); transition: all 0.15s; }
        .idm-tab:hover { background: var(--border-color, #e5e7eb); }
        .idm-tab.active { background: var(--primary-color, #6366f1); color: #fff; border-color: var(--primary-color, #6366f1); }
        .idm-table-wrap { overflow: auto; max-height: 500px; border: 1px solid var(--border-color, #e5e7eb); border-radius: 8px; }
        .idm-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .idm-table th { position: sticky; top: 0; background: var(--bg-color, #f9fafb); padding: 8px 10px; text-align: left; font-weight: 600; border-bottom: 2px solid var(--border-color, #e5e7eb); z-index: 1; }
        .idm-table td { padding: 6px 10px; border-bottom: 1px solid var(--border-color, #e5e7eb); }
        .idm-table tr:hover { background: var(--bg-color, #f3f4f6); }
        .idm-id-cell { font-family: monospace; font-size: 11px; color: #7c3aed; cursor: pointer; padding: 2px 6px; background: rgba(124,58,237,0.06); border-radius: 4px; display: inline-block; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .idm-id-cell:hover { background: rgba(124,58,237,0.12); }
        .idm-count { font-size: 12px; color: var(--text-secondary, #6b7280); }
        .idm-copy-toast { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #1f2937; color: #fff; padding: 8px 16px; border-radius: 6px; font-size: 13px; z-index: 9999; pointer-events: none; }
        .idm-ref-list { max-height: 55vh; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
        .idm-ref-item { border: 1px solid var(--border-color, #e5e7eb); border-radius: 6px; padding: 8px 10px; }
        .idm-ref-head { font-size: 12px; font-weight: 600; color: var(--primary-color, #6366f1); margin-bottom: 4px; }
        .idm-ref-text { font-size: 12px; color: var(--text-secondary, #6b7280); line-height: 1.5; word-break: break-all; }
        .idm-dangling-list { display: flex; flex-direction: column; gap: 8px; }
        .idm-dangling-item { display: flex; gap: 10px; align-items: center; padding: 8px 10px; border: 1px solid #fecaca; background: #fef2f2; border-radius: 6px; font-size: 13px; color: #991b1b; flex-wrap: wrap; }
        .idm-dang-badge { padding: 2px 8px; background: #ef4444; color: #fff; border-radius: 4px; font-size: 11px; flex-shrink: 0; }
        .idm-dangling-item code { font-family: monospace; font-size: 12px; background: rgba(0,0,0,0.06); padding: 1px 5px; border-radius: 4px; }
    `;
    document.head.appendChild(style);

    let allItems = [];
    let filteredItems = [];
    let searchQuery = '';
    let filterModule = '';
    let showDangling = false;      // 当前是否显示悬空引用 tab
    let danglingList = [];         // 悬空引用列表
    let textChunks = [];           // 全模块文本块（反向引用检测用）
    let entityIndex = new Map();   // `${moduleId}|${id}` -> item

    // 集合归一化：localStorage 中集合类数据存在对象(按 id 键)或数组两种格式
    function toArr(v) {
        if (!v) return [];
        return Array.isArray(v) ? v : Object.values(v);
    }

    // 统一取数入口
    function loadModuleData(moduleId) {
        return (typeof ModuleRegistry !== 'undefined' && ModuleRegistry.loadModuleData) ? ModuleRegistry.loadModuleData(moduleId) : {};
    }

    // 提取基础ID：去掉最后的 _xxx 后缀（数字或短后缀）
    function getBaseId(id) {
        if (!id) return '';
        const match = id.match(/^(.+)_[a-zA-Z0-9]{2,6}$/);
        if (match) return match[1];
        return id;
    }

    // 转义正则
    function escapeReg(s) {
        return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // 供 onclick 拼接使用的安全转义（ID 中可能含引号/反斜杠）
    function q(s) {
        return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
    }

    // ==================== 数据收集（全模块覆盖） ====================

    // 每个收集器从对应模块数据中提取 {id, name} 列表
    const COLLECTORS = [
        { moduleId: 'character', sub: '角色信息', icon: 'user', extract(d) {
            const c = d.character;
            if (!c || typeof c !== 'object') return [];
            return [{ id: c.id || 'char_main', name: c.name || '主角' }];
        }},
        { moduleId: 'currency', sub: '货币', icon: 'coin', extract(d) {
            const cur = d.currency || {};
            const types = d.currency_types || {};
            return Object.keys(cur).map(k => ({ id: k, name: (types[k] && types[k].name) || k }));
        }},
        { moduleId: 'inventory', sub: '背包', icon: 'backpack', extract(d) {
            return toArr(d.inventory).map(i => ({ id: i.id || '-', name: i.name || '未命名' }));
        }},
        { moduleId: 'item-library', sub: '物品库', icon: 'shop', extract(d) {
            return toArr(d.item_library).map(i => ({ id: i.id || '-', name: i.name || '未命名' }));
        }},
        { moduleId: 'item-library', sub: '物品分类', icon: 'folder', extract(d) {
            const cats = d.item_categories || {};
            if (Array.isArray(cats)) return cats.map(c => ({ id: c.id || '-', name: c.name || '未命名' }));
            return Object.keys(cats).map(k => ({ id: (cats[k] && cats[k].id) || k, name: (cats[k] && cats[k].name) || k }));
        }},
        { moduleId: 'equipment', sub: '装备', icon: 'sword', extract(d) {
            const out = [];
            toArr(d.equipment_slots).forEach(slot => {
                out.push({ id: slot.id || '-', name: slot.name || '未命名' });
                if (slot.item && slot.item.id) out.push({ id: slot.item.id, name: slot.item.name || '未命名' });
            });
            return out;
        }},
        { moduleId: 'quests', sub: '任务', icon: 'scroll', extract(d) {
            return toArr(d.quests).map(q => ({ id: q.id || '-', name: q.name || q.title || '未命名' }));
        }},
        { moduleId: 'skills', sub: '技能', icon: 'spark', extract(d) {
            return toArr(d.skills).map(s => ({ id: s.id || '-', name: s.name || '未命名' }));
        }},
        { moduleId: 'story', sub: '剧情标记', icon: 'book', extract(d) {
            const story = d.story || {};
            return (story.marks ? toArr(story.marks) : []).map(m => ({ id: m.id || m.mark_id || '-', name: m.title || '未命名' }));
        }},
        { moduleId: 'story', sub: '伏笔', icon: 'book', extract(d) {
            const story = d.story || {};
            return (story.foreshadowing ? toArr(story.foreshadowing) : []).map(f => ({ id: f.id || f.foreshadow_id || '-', name: f.title || '未命名' }));
        }},
        { moduleId: 'map', sub: '地点', icon: 'map', extract(d) {
            return toArr(d.locations).map(l => ({ id: l.id || '-', name: l.name || '未命名' }));
        }},
        { moduleId: 'relation', sub: '人物', icon: 'user_group', extract(d) {
            return toArr(d.characters).map(c => ({ id: c.id || '-', name: c.name || '未命名' }));
        }},
        { moduleId: 'custom', sub: '自定义分类', icon: 'edit', extract(d) {
            return toArr(d.custom_categories).map(c => ({ id: c.id || '-', name: c.name || '未命名' }));
        }},
        { moduleId: 'custom', sub: '自定义条目', icon: 'edit', extract(d) {
            const out = [];
            toArr(d.custom_categories).forEach(cat => {
                toArr(cat.items).forEach(item => out.push({ id: item.id || '-', name: item.name || '未命名' }));
            });
            return out;
        }},
        // --- 动态模块 ---
        { moduleId: 'chapters', sub: '章节', icon: 'scroll', extract(d) {
            return toArr(d.chapters).map(c => ({ id: c.id || '-', name: c.title || '未命名' }));
        }},
        { moduleId: 'glossary', sub: '术语', icon: 'book', extract(d) {
            return toArr(d.glossary).map(t => ({ id: t.id || '-', name: t.name || '未命名' }));
        }},
        { moduleId: 'worldview', sub: '世界观分类', icon: 'folder', extract(d) {
            const cats = d.worldview_categories || {};
            if (Array.isArray(cats)) return cats.map(c => ({ id: c.id || '-', name: c.name || '未命名' }));
            return Object.keys(cats).map(k => ({ id: (cats[k] && cats[k].id) || k, name: (cats[k] && cats[k].name) || k }));
        }},
        { moduleId: 'worldview', sub: '世界观条目', icon: 'earth', extract(d) {
            const out = [];
            const wv = d.worldview || {};
            for (const catId of Object.keys(wv)) {
                toArr(wv[catId]).forEach(e => out.push({ id: e.id || '-', name: e.name || '未命名' }));
            }
            return out;
        }},
        { moduleId: 'timeline', sub: '时间线事件', icon: 'clock', extract(d) {
            return toArr(d.timeline).map(e => ({ id: e.id || '-', name: e.name || '未命名' }));
        }},
        { moduleId: 'timeline', sub: '纪元', icon: 'clock', extract(d) {
            return toArr(d.timeline_eras).map(e => ({ id: e.id || '-', name: e.name || '未命名' }));
        }},
        { moduleId: 'inspiration', sub: '灵感', icon: 'lightbulb', extract(d) {
            return toArr(d.inspiration).map(i => ({ id: i.id || '-', name: (i.content || '').substring(0, 24) || '未命名' }));
        }},
        { moduleId: 'phrase_library', sub: '文本库', icon: 'text', extract(d) {
            return toArr(d.phrase_library).map(p => ({ id: p.id || '-', name: (p.content || '').substring(0, 24) || p.category || '未命名' }));
        }},
        { moduleId: 'multi_project', sub: '项目', icon: 'database', extract(d) {
            return toArr(d.projects).map(p => ({ id: p.id || '-', name: p.name || '未命名' }));
        }},
        { moduleId: 'chapter_review', sub: '审查记录', icon: 'check_circle', extract(d) {
            return toArr(d.review_history).map(r => ({
                id: r.id || '-',
                name: '审查 #' + (r.timestamp ? new Date(r.timestamp).toLocaleString('zh-CN') : (r.id || ''))
            }));
        }},
        { moduleId: 'generators', sub: '生成历史', icon: 'dice', extract(d) {
            return toArr(d.generators_history).map(h => ({ id: h.id || '-', name: h.label || h.type || '生成记录' }));
        }}
    ];

    function collectAllIds() {
        const items = [];
        const index = new Map();
        COLLECTORS.forEach(col => {
            let data = {};
            try { data = loadModuleData(col.moduleId); } catch(e) {}
            let extracted = [];
            try { extracted = col.extract(data) || []; } catch(e) {}
            extracted.forEach(it => {
                const item = { module: col.sub, moduleId: col.moduleId, icon: col.icon, id: String(it.id || '-'), name: String(it.name || '未命名') };
                items.push(item);
                const key = col.moduleId + '|' + item.id;
                if (!index.has(key)) index.set(key, item);
            });
        });
        allItems = items;
        entityIndex = index;
        textChunks = collectTextChunks();
        computeDangling();
        applyFilter();
    }

    // ==================== 文本块收集（反向引用检测） ====================

    function collectTextChunks() {
        const chunks = [];
        const push = (moduleId, itemId, icon, label, text) => {
            if (text && typeof text === 'string' && text.length > 0) {
                chunks.push({ moduleId, itemId, icon, label, text });
            }
        };

        const md = loadModuleData('character');
        const c = md.character;
        if (c && typeof c === 'object') push('character', c.id || 'char_main', 'user', '角色信息', (c.name || '') + ' ' + JSON.stringify(c.stats || {}));

        let d = loadModuleData('inventory');
        toArr(d.inventory).forEach(i => push('inventory', i.id, 'backpack', i.name || '背包物品', JSON.stringify(i)));

        d = loadModuleData('item-library');
        toArr(d.item_library).forEach(i => push('item-library', i.id, 'shop', i.name || '物品', JSON.stringify(i)));

        d = loadModuleData('equipment');
        toArr(d.equipment_slots).forEach(s => push('equipment', s.id, 'sword', s.name || '装备槽', JSON.stringify(s)));

        d = loadModuleData('quests');
        toArr(d.quests).forEach(q => push('quests', q.id, 'scroll', q.name || q.title || '任务', JSON.stringify(q)));

        d = loadModuleData('skills');
        toArr(d.skills).forEach(s => push('skills', s.id, 'spark', s.name || '技能', JSON.stringify(s)));

        d = loadModuleData('story');
        const st = d.story || {};
        toArr(st.marks).forEach(m => push('story', m.id || m.mark_id, 'book', m.title || '剧情标记', m.content || m.description || JSON.stringify(m)));
        toArr(st.foreshadowing).forEach(f => push('story', f.id || f.foreshadow_id, 'book', f.title || '伏笔', f.content || f.description || JSON.stringify(f)));

        d = loadModuleData('relation');
        toArr(d.characters).forEach(ch => push('relation', ch.id, 'user_group', ch.name || '人物', JSON.stringify(ch)));
        toArr(d.relations).forEach(r => push('relation', r.id, 'user_group', (r.type || r.relation_type || '关系'), JSON.stringify(r)));

        d = loadModuleData('map');
        toArr(d.locations).forEach(l => push('map', l.id, 'map', l.name || '地点', l.description || JSON.stringify(l)));

        d = loadModuleData('custom');
        toArr(d.custom_categories).forEach(cat => toArr(cat.items).forEach(it => push('custom', it.id, 'edit', it.name || '自定义条目', JSON.stringify(it))));

        d = loadModuleData('chapters');
        toArr(d.chapters).forEach(ch => {
            push('chapters', ch.id, 'scroll', ch.title || '章节', ch.outline || '');
            push('chapters', ch.id, 'scroll', ch.title || '章节', ch.content || '');
        });

        d = loadModuleData('glossary');
        toArr(d.glossary).forEach(t => push('glossary', t.id, 'book', t.name || '术语', JSON.stringify(t)));

        d = loadModuleData('worldview');
        for (const catId of Object.keys(d.worldview || {})) {
            toArr(d.worldview[catId]).forEach(e => push('worldview', e.id, 'earth', e.name || '世界观条目', JSON.stringify(e)));
        }

        d = loadModuleData('timeline');
        toArr(d.timeline).forEach(e => push('timeline', e.id, 'clock', e.name || '时间线事件', JSON.stringify(e)));

        d = loadModuleData('inspiration');
        toArr(d.inspiration).forEach(i => push('inspiration', i.id, 'lightbulb', '灵感', i.content || ''));

        d = loadModuleData('phrase_library');
        toArr(d.phrase_library).forEach(p => push('phrase_library', p.id, 'text', p.category || '文本库', p.content || ''));

        return chunks;
    }

    // ==================== 反向引用 ====================

    function computeRefs(item) {
        const ids = [item.id];
        const base = getBaseId(item.id);
        if (base && base !== item.id) ids.push(base);
        const refs = [];
        textChunks.forEach(ch => {
            if (ch.moduleId === item.moduleId && ch.itemId === item.id) return; // 排除自身
            let count = 0;
            ids.forEach(id => {
                if (id && id !== '-') {
                    const m = ch.text.match(new RegExp(escapeReg(id), 'g'));
                    if (m) count += m.length;
                }
            });
            if (count > 0) refs.push({ moduleId: ch.moduleId, label: ch.label, icon: ch.icon, text: ch.text, count });
        });
        refs.sort((a, b) => b.count - a.count);
        return refs.slice(0, 30);
    }

    // ==================== 悬空引用检测（结构化引用字段） ====================

    function computeDangling() {
        const dangling = [];
        const exists = (mid, id) => id && id !== '-' && entityIndex.has(mid + '|' + String(id));
        const add = (refType, moduleId, id, name) => {
            if (id !== undefined && id !== null && String(id) !== '' && String(id) !== '-' && !exists(moduleId, id)) {
                dangling.push({ refType, moduleId, id: String(id), name });
            }
        };
        // 人物关系 → 人物
        const relData = loadModuleData('relation');
        toArr(relData.relations).forEach(r => {
            add('人物关系', 'relation', r.character_id, '关系引用了不存在的人物');
            add('人物关系', 'relation', r.target_id, '关系引用了不存在的人物');
        });
        // 装备槽 → 物品库/背包
        const eqData = loadModuleData('equipment');
        toArr(eqData.equipment_slots).forEach(slot => {
            if (slot.item && slot.item.id) add('装备', 'item-library', slot.item.id, '装备槽引用了不存在的物品');
        });
        // 时间线事件 → 纪元
        const tlData = loadModuleData('timeline');
        toArr(tlData.timeline).forEach(evt => {
            if (evt.era_id && evt.era_id !== '_no_era') add('时间线', 'timeline', evt.era_id, '事件引用了不存在的纪元');
        });
        // 章节 → 术语（章节中的术语引用）
        const chData = loadModuleData('chapters');
        toArr(chData.chapters).forEach(ch => {
            if (ch.terms && ch.terms.length) {
                toArr(ch.terms).forEach(t => add('章节术语', 'glossary', t.id, `章节「${ch.title || ''}」引用了不存在的术语`));
            }
        });
        danglingList = dangling;
        const badge = document.getElementById('idm-dangling-count');
        if (badge) badge.textContent = dangling.length ? `(${dangling.length})` : '';
    }

    // ==================== 筛选 ====================

    function applyFilter() {
        const q = searchQuery.toLowerCase();
        filteredItems = allItems.filter(item => {
            if (filterModule && item.moduleId !== filterModule) return false;
            if (q) {
                const baseId = getBaseId(item.id).toLowerCase();
                const fullId = item.id.toLowerCase();
                const name = item.name.toLowerCase();
                const module = item.module.toLowerCase();
                if (!fullId.includes(q) && !baseId.includes(q) && !name.includes(q) && !module.includes(q)) return false;
            }
            return true;
        });
    }

    // ==================== 页面渲染 ====================

    function renderPage() {
        let html = UIUtils.renderCardPage(
            (SvgIconLib ? SvgIconLib.renderAuto('hash', 18) : '🔢') + ' ID 管理器',
            '<button class="btn-secondary btn-small" onclick="IdManagerModule.refresh()">' + (SvgIconLib ? SvgIconLib.renderAuto('refresh', 12) : '🔄') + ' 刷新</button>'
        );
        html += '<div class="idm-container">';
        // 工具栏
        html += '<div class="idm-toolbar">';
        html += '<input type="text" id="idm-search" placeholder="搜索 ID 或名称..." oninput="IdManagerModule.onSearch(this.value)">';
        html += '<select id="idm-module-filter" onchange="IdManagerModule.onFilter(this.value)">';
        html += '<option value="">全部模块</option>';
        const modules = getModuleOptions();
        modules.forEach(m => { html += `<option value="${m.id}">${(SvgIconLib && SvgIconLib.is && SvgIconLib.is(m.icon)) ? '' : (m.icon || '')} ${m.name}</option>`; });
        html += '</select>';
        html += '</div>';
        // Tabs
        html += '<div class="idm-tabs">';
        html += '<button class="idm-tab active" data-tab="ids" onclick="IdManagerModule.switchTab(\'ids\')">' + (SvgIconLib ? SvgIconLib.renderAuto('hash', 13) : '🔢') + ' ID 列表</button>';
        html += '<button class="idm-tab" data-tab="dangling" onclick="IdManagerModule.switchTab(\'dangling\')">' + (SvgIconLib ? SvgIconLib.renderAuto('alert', 13) : '⚠️') + ' 悬空引用 <span id="idm-dangling-count"></span></button>';
        html += '</div>';
        // 统计
        html += '<div class="idm-count" id="idm-count"></div>';
        // ID 表格
        html += '<div class="idm-table-wrap" id="idm-table-wrap">';
        html += '<table class="idm-table"><thead><tr><th>模块</th><th>基础ID</th><th>完整ID</th><th>名称</th><th>操作</th></tr></thead>';
        html += '<tbody id="idm-tbody"></tbody></table>';
        html += '</div>';
        // 悬空引用列表
        html += '<div class="idm-dangling-wrap" id="idm-dangling-wrap" style="display:none;"><div class="idm-dangling-list" id="idm-dangling-list"></div></div>';
        html += '</div>';
        return html;
    }

    function getModuleOptions() {
        const seen = new Set();
        const opts = [];
        allItems.forEach(item => {
            if (!seen.has(item.moduleId)) {
                seen.add(item.moduleId);
                opts.push({ id: item.moduleId, name: item.module, icon: item.icon });
            }
        });
        return opts;
    }

    function renderTable() {
        const tbody = document.getElementById('idm-tbody');
        const countEl = document.getElementById('idm-count');
        if (!tbody) return;

        const baseIdGroups = {};
        allItems.forEach(item => {
            const baseId = getBaseId(item.id);
            if (!baseIdGroups[baseId]) baseIdGroups[baseId] = [];
            baseIdGroups[baseId].push(item);
        });

        if (filteredItems.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:#9ca3af;">无匹配数据</td></tr>';
        } else {
            let html = '';
            filteredItems.forEach(item => {
                const baseId = getBaseId(item.id);
                const variants = baseIdGroups[baseId] || [];
                const variantCount = variants.length;
                const isVariant = baseId !== item.id;
                const shortId = item.id.length > 24 ? item.id.substring(item.id.length - 24) : item.id;
                const shortBaseId = baseId.length > 24 ? baseId.substring(baseId.length - 24) : baseId;
                html += '<tr>';
                html += `<td>${SvgIconLib.renderAuto(item.icon, 16)} ${escapeHtml(item.module)}</td>`;
                html += `<td><span class="idm-id-cell" title="${escapeHtml(baseId)}" onclick="IdManagerModule.copyId('${q(baseId)}')">${escapeHtml(shortBaseId)}</span>`;
                if (variantCount > 1) html += ` <span style="font-size:10px;color:#f59e0b;" title="${variantCount}个变体">[${variantCount}]</span>`;
                html += `</td>`;
                html += `<td><span class="idm-id-cell" title="${escapeHtml(item.id)}" onclick="IdManagerModule.copyId('${q(item.id)}')">${escapeHtml(shortId)}</span>`;
                if (isVariant) html += ` <span style="font-size:10px;color:#6366f1;">变体</span>`;
                html += `</td>`;
                html += `<td>${escapeHtml(item.name)}</td>`;
                html += `<td style="white-space:nowrap;">`;
                html += `<button class="btn-tiny" onclick="IdManagerModule.copyId('${q(item.id)}')">复制</button>`;
                html += ` <button class="btn-tiny" onclick="IdManagerModule.jumpTo('${item.moduleId}','${q(item.id)}')">跳转</button>`;
                html += ` <button class="btn-tiny" onclick="IdManagerModule.showRefs('${q(item.id)}')">引用</button>`;
                html += `</td>`;
                html += '</tr>';
            });
            tbody.innerHTML = html;
        }
        if (countEl) {
            const uniqueBaseIds = new Set(allItems.map(i => getBaseId(i.id)));
            countEl.textContent = `显示 ${filteredItems.length} 条 / 总计 ${allItems.length} 条 / ${uniqueBaseIds.size} 个基础ID`;
        }
    }

    function renderDangling() {
        const el = document.getElementById('idm-dangling-list');
        const badge = document.getElementById('idm-dangling-count');
        if (badge) badge.textContent = danglingList.length ? `(${danglingList.length})` : '';
        if (!el) return;
        if (danglingList.length === 0) {
            el.innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af;">未发现悬空引用 ✓</div>';
            return;
        }
        el.innerHTML = danglingList.map(d => `
            <div class="idm-dangling-item">
                <span class="idm-dang-badge">${escapeHtml(d.refType)}</span>
                <code>${escapeHtml(d.id)}</code>
                <span>${escapeHtml(d.name)}</span>
            </div>`).join('');
    }

    function switchTab(tab) {
        showDangling = tab === 'dangling';
        document.querySelectorAll('.idm-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
        const tblWrap = document.getElementById('idm-table-wrap');
        const dangWrap = document.getElementById('idm-dangling-wrap');
        if (tblWrap) tblWrap.style.display = showDangling ? 'none' : '';
        if (dangWrap) dangWrap.style.display = showDangling ? '' : 'none';
        if (showDangling) renderDangling();
    }

    // ==================== 交互 ====================

    function copyId(id) {
        const preview = 'ID 已复制: ' + (id.length > 30 ? id.substring(0, 30) + '...' : id);
        UIUtils.copyText(id, preview);
    }

    // 跳转到条目所在模块（并尽量定位该条目）
    function jumpTo(moduleId, itemId) {
        if (typeof switchPage === 'function') switchPage(moduleId);
        try {
            const handled = (typeof ModuleRegistry !== 'undefined' && ModuleRegistry.focusItem) ? ModuleRegistry.focusItem(moduleId, itemId) : false;
            if (handled) { if (typeof showToast === 'function') showToast('已定位到条目', 'success'); return; }
        } catch(e) {}
        try {
            if (moduleId === 'chapters' && window.ChaptersModule && typeof ChaptersModule.selectChapter === 'function') {
                Promise.resolve(ChaptersModule.loadData ? ChaptersModule.loadData() : null).then(() => ChaptersModule.selectChapter(itemId));
                if (typeof showToast === 'function') showToast('已定位到章节', 'success');
                return;
            }
            if (moduleId === 'glossary' && window.GlossaryModule && typeof GlossaryModule.openTermDetail === 'function') {
                Promise.resolve(GlossaryModule.loadData ? GlossaryModule.loadData() : null).then(() => GlossaryModule.openTermDetail(itemId));
                if (typeof showToast === 'function') showToast('已定位到术语', 'success');
                return;
            }
        } catch(e) {}
        if (typeof showToast === 'function') showToast('已打开「' + moduleId + '」模块', 'success');
    }

    // 反向引用弹窗
    function showRefs(itemId) {
        const item = allItems.find(i => i.id === itemId);
        if (!item) return;
        const refs = computeRefs(item);
        let body;
        if (refs.length === 0) {
            body = '<p style="color:#9ca3af;padding:12px 0;">未发现其他模块引用此 ID</p>';
        } else {
            body = '<div class="idm-ref-list">' + refs.map(r => `
                <div class="idm-ref-item">
                    <div class="idm-ref-head">${SvgIconLib.renderAuto(r.icon || 'box', 13)} ${escapeHtml(r.label)}（${r.count} 处）</div>
                    <div class="idm-ref-text">${escapeHtml(r.text.length > 120 ? r.text.substring(0, 120) + '...' : r.text)}</div>
                </div>`).join('') + '</div>';
        }
        if (typeof showModal === 'function') {
            showModal(`反向引用: ${escapeHtml(item.name)} (${escapeHtml(item.id)})`, body, [
                { text: '关闭', class: 'btn-secondary', action: () => { if (typeof closeModal === 'function') closeModal(); } }
            ]);
        }
    }

    function onSearch(val) {
        searchQuery = val;
        applyFilter();
        renderTable();
    }

    function onFilter(val) {
        filterModule = val;
        applyFilter();
        renderTable();
    }

    // ==================== 注册接口 ====================

    function previewRenderer() {
        if (allItems.length === 0) collectAllIds();
        return `<p>共收录 <strong>${allItems.length}</strong> 条 ID / <strong>${new Set(allItems.map(i => getBaseId(i.id))).size}</strong> 个基础ID，<strong>${danglingList.length}</strong> 条悬空引用</p>`;
    }

    function exportFormatter() {
        if (allItems.length === 0) collectAllIds();
        let text = '=== ID 列表 ===\n\n';
        allItems.forEach(item => {
            text += `[${item.module}] ${item.name} => ${item.id}\n`;
        });
        if (danglingList.length) {
            text += '\n=== 悬空引用 ===\n\n';
            danglingList.forEach(d => {
                text += `[${d.refType}] ${d.name} => ${d.id}\n`;
            });
        }
        return text;
    }

    function searchIndexer(data, query) {
        if (allItems.length === 0) collectAllIds();
        return allItems
            .filter(it => (it.id || '').toLowerCase().includes(query) || (it.name || '').toLowerCase().includes(query))
            .map(it => ({ name: `ID: ${it.module} > ${it.name}`, page: 'id_manager', id: it.id, content: it.id }));
    }

    async function loadData() {
        collectAllIds();
    }

    async function refreshView() {
        collectAllIds();
        renderTable();
        renderDangling();
        const searchEl = document.getElementById('idm-search');
        if (searchEl) searchEl.value = searchQuery;
        const filterEl = document.getElementById('idm-module-filter');
        if (filterEl) filterEl.value = filterModule;
    }

    window.IdManagerModule = {
        loadData, refreshView, onSearch, onFilter, copyId, jumpTo, showRefs, switchTab,
        refresh: function() {
            collectAllIds();
            const filterEl = document.getElementById('idm-module-filter');
            if (filterEl) {
                const modules = getModuleOptions();
                let optsHtml = '<option value="">全部模块</option>';
                modules.forEach(m => { optsHtml += `<option value="${m.id}">${(SvgIconLib && SvgIconLib.is && SvgIconLib.is(m.icon)) ? '' : (m.icon || '')} ${m.name}</option>`; });
                filterEl.innerHTML = optsHtml;
                filterEl.value = filterModule;
            }
            renderTable();
            renderDangling();
            if (typeof showToast === 'function') showToast('ID 列表已刷新', 'success');
        }
    };

    ModuleRegistry.register({
        id: 'id_manager', name: 'ID管理', icon: 'hash', group: 'system', order: 3, hidden: false,
        dataKeys: [],
        previewRenderer, exportFormatter, searchIndexer,
        pageRenderer: renderPage,
        onPageShow: function() { collectAllIds(); renderTable(); renderDangling(); }
    });

    console.log('[IdManager] ID管理器模块已注册');
})();
