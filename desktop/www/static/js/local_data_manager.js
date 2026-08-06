// ============================================================
// LocalDataManager - 本地数据管理核心
// 替代 C++ 后端的所有 API 功能，使用 localStorage 持久化
// 版本: 3.2.0
// ============================================================

class LocalDataManager {
    constructor() {
        this.version = '1.0dev';
        this.initialized = false;

        // 数据模块的 localStorage key 与默认值
        this.moduleDefaults = {
            // --- 原有模块 ---
            character: {},
            currency: {},
            inventory: {},
            equipment: {},
            equipment_slots: {},
            currency_types: {},
            quests: {},
            quests_custom: {},
            quests_templates: {},
            skills: {},
            skills_custom: {},
            story: { marks: {}, foreshadowing: {} },
            item_library: [],
            item_categories: {},
            custom_items_def: {},
            characters: [],
            relations: [],
            relation_types: [],
            custom_categories: {},
            custom_items: {},
            character_templates: {},
            buttons_config: {},
            export_order: [],
            settings: {},
            stats: {},
            locations: {},
            location_types: {},
            structure_levels: {},
            // --- 新增 15 个模块 ---
            worldview: {},              // 世界观设定
            worldview_categories: {},   // 世界观分类
            glossary: [],               // 术语表
            timeline: [],               // 时间线事件
            timeline_eras: [],          // 时间线纪元
            chapters: [],               // 章节管理
            writing_stats: {},          // 写作统计
            writing_goals: {},          // 写作目标
            inspiration: [],            // 灵感收集
            inspiration_tags: [],       // 灵感标签
            generators_config: {},      // 随机生成器配置
            generators_history: [],     // 生成历史
            fulltext_history: [],       // 搜索历史
            search_history: [],         // 全文搜索历史（mod_fulltext_search 实际使用的键）
            version_history: [],        // 版本历史快照
            version_config: {},         // 版本历史配置
            projects: [],               // 多项目列表
            projects_active: '',        // 当前活跃项目
            print_config: {},           // 打印配置
            relation_graph_layout: {},  // 关系图谱布局
            dark_mode_config: {},       // 暗色模式配置
            dashboard_config: {},       // 仪表盘配置
            // --- v3.2.0 章节正文审查新增 ---
            phrase_library: [],         // 预设文本库 [{id,content,category,tags,source_chapter}]
            api_config: {               // LLM API 配置
                api_url: '',
                api_key: '',
                model: '',
                system_prompt: '',
                temperature: 0.3,
                max_tokens: 4096
            },
            review_history: []          // 审查历史 [{id,chapter_id,timestamp,issue_count,issues}]
        };
    }

    // ==================== 初始化 ====================

    init() {
        if (this.initialized) return;
        for (const [name, defaultVal] of Object.entries(this.moduleDefaults)) {
            const raw = localStorage.getItem(name);
            if (raw === null) {
                this.saveModule(name, JSON.parse(JSON.stringify(defaultVal)));
            }
        }
        // 确保 item_library 是数组
        if (!Array.isArray(this.getModule('item_library'))) {
            this.saveModule('item_library', []);
        }
        this.initialized = true;
    }

    // ==================== 通用 CRUD ====================

    getModule(name) {
        try {
            const raw = localStorage.getItem(name);
            if (raw !== null) {
                try {
                    return JSON.parse(raw);
                } catch (e) {
                    // 数据损坏：先留存原始数据，避免后续保存静默覆盖造成不可逆丢失
                    console.error('[LocalDataManager] 数据解析失败 (' + name + '):', e);
                    try {
                        const corruptKey = 'corrupt_' + name + '_' + Date.now();
                        localStorage.setItem(corruptKey, raw);
                    } catch (e2) { /* 忽略留存失败 */ }
                    if (typeof showToast === 'function') {
                        showToast('数据「' + name + '」已损坏，原始数据已暂存到 ' + corruptKey + ' 键', 'error');
                    }
                }
            }
            return JSON.parse(JSON.stringify(this.moduleDefaults[name] || {}));
        } catch (e) {
            return JSON.parse(JSON.stringify(this.moduleDefaults[name] || {}));
        }
    }

    saveModule(name, data) {
        try {
            localStorage.setItem(name, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('[LocalDataManager] 保存失败 (' + name + '):', e);
            if (typeof showToast === 'function') {
                showToast('保存失败：本地存储空间不足，请清理备份或删除部分章节/快照后重试', 'error');
            }
            return false;
        }
    }

    generateId(prefix) {
        return (prefix || 'id') + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    }

    // ==================== 数据转换工具 ====================

    inventoryToArray(inventory) {
        const arr = [];
        if (inventory && typeof inventory === 'object' && !Array.isArray(inventory)) {
            // 获取物品库用于名称解析
            let itemLibrary = null;
            try { itemLibrary = this.getModule('item_library'); } catch(e) {}
            const libMap = {};
            if (Array.isArray(itemLibrary)) {
                itemLibrary.forEach(libItem => { if (libItem.id) libMap[libItem.id] = libItem; });
            } else if (itemLibrary && typeof itemLibrary === 'object') {
                for (const [k, v] of Object.entries(itemLibrary)) {
                    if (v && typeof v === 'object') libMap[v.id || k] = v;
                }
            }
            for (const [key, value] of Object.entries(inventory)) {
                let item;
                if (typeof value === 'number') {
                    // 物品存储为数字（旧格式），尝试从物品库解析名称
                    const libItem = libMap[key];
                    if (libItem) {
                        item = { ...libItem, quantity: value };
                        if (!item.id) item.id = key;
                    } else {
                        item = { id: key, name: key, quantity: value, icon: 'box' };
                    }
                } else if (value && typeof value === 'object') {
                    item = { ...value };
                    if (!item.id) item.id = key;
                    if (item.quantity === undefined) item.quantity = 1;
                    // 如果名称为空或等于ID，尝试从物品库获取真实名称
                    if ((!item.name || item.name === key) && libMap[key] && libMap[key].name) {
                        item.name = libMap[key].name;
                    }
                    if (!item.icon && libMap[key] && libMap[key].icon) {
                        item.icon = libMap[key].icon;
                    }
                } else {
                    continue;
                }
                arr.push(item);
            }
        }
        return arr;
    }

    equipmentToObject(equipment, inventory, itemLibrary) {
        const obj = {};
        if (equipment && typeof equipment === 'object') {
            for (const [slot, val] of Object.entries(equipment)) {
                if (val && typeof val === 'object' && !Array.isArray(val)) {
                    obj[slot] = val;
                } else if (typeof val === 'string') {
                    const eId = val;
                    let found = false;
                    if (eId && inventory[eId] && typeof inventory[eId] === 'object') {
                        obj[slot] = { ...inventory[eId], id: eId };
                        found = true;
                    }
                    if (!found && eId && Array.isArray(itemLibrary)) {
                        const libItem = itemLibrary.find(i => i.id === eId);
                        if (libItem) { obj[slot] = { ...libItem }; found = true; }
                    }
                    if (!found) {
                        obj[slot] = { id: eId || slot, name: eId || slot, icon: 'box' };
                    }
                } else {
                    obj[slot] = val;
                }
            }
        }
        return obj;
    }

    objectToArray(obj) {
        if (Array.isArray(obj)) return obj;
        const arr = [];
        if (obj && typeof obj === 'object') {
            for (const [key, value] of Object.entries(obj)) {
                if (value && typeof value === 'object') {
                    const item = { ...value };
                    if (!item.id) item.id = key;
                    arr.push(item);
                }
            }
        }
        return arr;
    }

    // ==================== 路由分发 ====================

    async handleRequest(path, method = 'GET', data = null) {
        if (!this.initialized) this.init();

        // 去除查询字符串用于匹配
        const cleanPath = path.split('?')[0];
        const body = data || {};

        try {
            // ---- 系统 API ----
            if (cleanPath === '/api/init' && method === 'GET') return this._apiInit();
            if (cleanPath === '/api/version' && method === 'GET') return { version: this.version, build: 'Local Edition' };
            if (cleanPath === '/api/test' && method === 'GET') return { status: 'ok', message: '本地模式运行正常' };
            if (cleanPath === '/api/save' && method === 'POST') return { success: true, message: '数据保存成功' };

            // ---- 角色模块 ----
            if (cleanPath === '/api/character' && method === 'GET') return this.getModule('character');
            if (cleanPath === '/api/character/save' && method === 'POST') return this._characterSave(body);
            if (cleanPath === '/api/character/edit' && method === 'POST') return this._characterEdit(body);
            if (cleanPath === '/api/character/rename' && method === 'POST') return this._characterRename(body);
            if (cleanPath === '/api/character/templates' && method === 'GET') return this.getModule('character_templates');
            if (cleanPath === '/api/character/templates/create' && method === 'POST') return this._charTplCreate(body);
            if (cleanPath === '/api/character/templates/edit' && method === 'POST') return this._charTplEdit(body);
            if (cleanPath === '/api/character/templates/delete' && method === 'POST') return this._charTplDelete(body);

            // ---- 货币模块 ----
            if (cleanPath === '/api/currency' && method === 'GET') return this.getModule('currency');
            if (cleanPath === '/api/currency/add' && method === 'POST') return this._currencyAdd(body);
            if (cleanPath === '/api/currency/set' && method === 'POST') return this._currencySet(body);
            if (cleanPath === '/api/currency/delete' && method === 'POST') return this._currencyDelete(body);
            if (cleanPath === '/api/currency/types' && method === 'GET') return this.getModule('currency_types');
            if (cleanPath === '/api/currency/types/add' && method === 'POST') return this._currencyTypeAdd(body);
            if (cleanPath === '/api/currency/types/edit' && method === 'POST') return this._currencyTypeEdit(body);
            if (cleanPath === '/api/currency/types/delete' && method === 'POST') return this._currencyTypeDelete(body);

            // ---- 背包模块 ----
            if (cleanPath === '/api/inventory' && method === 'GET') return this.inventoryToArray(this.getModule('inventory'));
            if (cleanPath === '/api/inventory/add' && method === 'POST') return this._inventoryAdd(body);
            if (cleanPath === '/api/inventory/edit' && method === 'POST') return this._inventoryEdit(body);
            if (cleanPath === '/api/inventory/remove' && method === 'POST') return this._inventoryRemove(body);
            if (cleanPath === '/api/inventory/add-custom' && method === 'POST') return this._inventoryAddCustom(body);

            // ---- 物品库与分类 ----
            if (cleanPath === '/api/items/library' && method === 'GET') return this._itemsLibraryGet();
            if (cleanPath === '/api/items/library/add' && method === 'POST') return this._itemsLibraryAdd(body);
            if (cleanPath === '/api/items/library/edit' && method === 'POST') return this._itemsLibraryEdit(body);
            if (cleanPath === '/api/items/library/delete' && method === 'POST') return this._itemsLibraryDelete(body);
            if (cleanPath === '/api/items/custom/create' && method === 'POST') return this._customItemDefCreate(body);
            if (cleanPath === '/api/items/custom/edit' && method === 'POST') return this._customItemDefEdit(body);
            if (cleanPath === '/api/items/custom/delete' && method === 'POST') return this._customItemDefDelete(body);
            if (cleanPath === '/api/items/categories' && method === 'GET') return this.getModule('item_categories');
            if (cleanPath === '/api/items/categories/add' && method === 'POST') return this._itemCatAdd(body);
            if (cleanPath === '/api/items/categories/edit' && method === 'POST') return this._itemCatEdit(body);
            if (cleanPath === '/api/items/categories/delete' && method === 'POST') return this._itemCatDelete(body);

            // ---- 装备模块 ----
            if (cleanPath === '/api/equipment' && method === 'GET') return this._equipmentGet();
            if (cleanPath === '/api/equipment/equip' && method === 'POST') return this._equipmentEquip(body);
            if (cleanPath === '/api/equipment/unequip' && method === 'POST') return this._equipmentUnequip(body);
            if (cleanPath === '/api/equipment/slots' && method === 'GET') return this.getModule('equipment_slots');
            if (cleanPath === '/api/equipment/slots/add' && method === 'POST') return this._slotAdd(body);
            if (cleanPath === '/api/equipment/slots/edit' && method === 'POST') return this._slotEdit(body);
            if (cleanPath === '/api/equipment/slots/delete' && method === 'POST') return this._slotDelete(body);

            // ---- 任务模块 ----
            if (cleanPath === '/api/quests' && method === 'GET') return this.getModule('quests');
            if (cleanPath === '/api/quests/accept' && method === 'POST') return this._questAccept(body);
            if (cleanPath === '/api/quests/progress' && method === 'POST') return this._questProgress(body);
            if (cleanPath === '/api/quests/complete' && method === 'POST') return this._questComplete(body);
            if (cleanPath === '/api/quests/custom/list' && method === 'GET') return { quests: this.objectToArray(this.getModule('quests_custom')) };
            if (cleanPath === '/api/quests/custom/create' && method === 'POST') return this._questCustomCreate(body);
            if (cleanPath === '/api/quests/custom/edit' && method === 'POST') return this._questCustomEdit(body);
            if (cleanPath === '/api/quests/custom/delete' && method === 'POST') return this._questCustomDelete(body);
            if (cleanPath === '/api/quests/templates' && method === 'GET') return this.getModule('quests_templates');

            // ---- 技能模块 ----
            if (cleanPath === '/api/skills' && method === 'GET') return this.getModule('skills');
            if (cleanPath === '/api/skills/learn' && method === 'POST') return this._skillLearn(body);
            if (cleanPath === '/api/skills/learn-item' && method === 'POST') return this._skillLearnItem(body);
            if (cleanPath === '/api/skills/forget' && method === 'POST') return this._skillForget(body);
            if (cleanPath === '/api/skills/custom/list' && method === 'GET') return { skills: this.objectToArray(this.getModule('skills_custom')) };
            if (cleanPath === '/api/skills/custom/create' && method === 'POST') return this._skillCustomCreate(body);
            if (cleanPath === '/api/skills/custom/edit' && method === 'POST') return this._skillCustomEdit(body);
            if (cleanPath === '/api/skills/custom/delete' && method === 'POST') return this._skillCustomDelete(body);
            if (cleanPath === '/api/skills/learn-custom' && method === 'POST') return this._skillLearnCustom(body);

            // ---- 战利品 ----
            if (cleanPath === '/api/loot/open' && method === 'POST') return { success: true, data: { items: [], currency: {} } };

            // ---- 剧情模块 ----
            if (cleanPath === '/api/story/marks' && method === 'GET') return this._storyMarksGet();
            if (cleanPath === '/api/story/marks/add' && method === 'POST') return this._storyMarkAdd(body);
            if (cleanPath === '/api/story/marks/edit' && method === 'POST') return this._storyMarkEdit(body);
            if (cleanPath === '/api/story/marks/delete' && method === 'POST') return this._storyMarkDelete(body);
            if (cleanPath === '/api/foreshadowing' && method === 'GET') return this._foreshadowingGet();
            if (cleanPath === '/api/foreshadowing/add' && method === 'POST') return this._foreshadowingAdd(body);
            if (cleanPath === '/api/foreshadowing/edit' && method === 'POST') return this._foreshadowingEdit(body);
            if (cleanPath === '/api/foreshadowing/delete' && method === 'POST') return this._foreshadowingDelete(body);
            if (cleanPath === '/api/foreshadowing/resolve' && method === 'POST') return this._foreshadowingResolve(body);

            // ---- 地图模块 ----
            if (cleanPath === '/api/locations' && method === 'GET') return this.getModule('locations');
            if (cleanPath === '/api/locations/create' && method === 'POST') return this._locationCreate(body);
            if (cleanPath === '/api/locations/edit' && method === 'POST') return this._locationEdit(body);
            if (cleanPath === '/api/locations/delete' && method === 'POST') return this._locationDelete(body);
            if (cleanPath === '/api/locations/types' && method === 'GET') return this.getModule('location_types');
            if (cleanPath === '/api/locations/types/create' && method === 'POST') return this._locTypeCreate(body);
            if (cleanPath === '/api/locations/types/edit' && method === 'POST') return this._locTypeEdit(body);
            if (cleanPath === '/api/locations/types/delete' && method === 'POST') return this._locTypeDelete(body);
            if (cleanPath === '/api/map/structure-levels' && method === 'GET') return this.getModule('structure_levels');
            if (cleanPath === '/api/map/structure-levels/create' && method === 'POST') return this._structLevelCreate(body);
            if (cleanPath === '/api/map/structure-levels/edit' && method === 'POST') return this._structLevelEdit(body);
            if (cleanPath === '/api/map/structure-levels/delete' && method === 'POST') return this._structLevelDelete(body);

            // ---- 人物关系模块 ----
            if (cleanPath === '/api/characters' && method === 'GET') { const d = this.getModule('characters'); return { success: true, characters: Array.isArray(d) ? d : [] }; }
            if (cleanPath === '/api/characters/add' && method === 'POST') return this._characterAdd(body);
            if (cleanPath === '/api/characters/edit' && method === 'POST') return this._characterEdit2(body);
            if (cleanPath === '/api/characters/delete' && method === 'POST') return this._characterDelete(body);
            if (cleanPath === '/api/relations' && method === 'GET') { const d = this.getModule('relations'); return { success: true, relations: Array.isArray(d) ? d : [] }; }
            if (cleanPath === '/api/relations/add' && method === 'POST') return this._relationAdd(body);
            if (cleanPath === '/api/relations/edit' && method === 'POST') return this._relationEdit(body);
            if (cleanPath === '/api/relations/delete' && method === 'POST') return this._relationDelete(body);
            if (cleanPath === '/api/relation-types' && method === 'GET') { const d = this.getModule('relation_types'); return { success: true, relation_types: Array.isArray(d) ? d : [] }; }
            if (cleanPath === '/api/relation-types/add' && method === 'POST') return this._relTypeAdd(body);
            if (cleanPath === '/api/relation-types/edit' && method === 'POST') return this._relTypeEdit(body);
            if (cleanPath === '/api/relation-types/delete' && method === 'POST') return this._relTypeDelete(body);

            // ---- 自定义数据模块 ----
            if (cleanPath === '/api/custom/categories' && method === 'GET') return this.getModule('custom_categories');
            if (cleanPath === '/api/custom/categories/create' && method === 'POST') return this._customCatCreate(body);
            if (cleanPath === '/api/custom/categories/edit' && method === 'POST') return this._customCatEdit(body);
            if (cleanPath === '/api/custom/categories/delete' && method === 'POST') return this._customCatDelete(body);
            if (cleanPath === '/api/custom/items' && method === 'GET') return this._customItemsGet(path);
            if (cleanPath === '/api/custom/items/create' && method === 'POST') return this._customItemCreate(body);
            if (cleanPath === '/api/custom/items/edit' && method === 'POST') return this._customItemEdit(body);
            if (cleanPath === '/api/custom/items/delete' && method === 'POST') return this._customItemDelete(body);

            // ---- 工具/导出模块 ----
            if (cleanPath === '/api/search' && method === 'POST') return { success: true, data: { items: [], characters: [], locations: [], quests: [] } };
            if (cleanPath === '/api/stats' && method === 'GET') return this.getModule('stats');
            if (cleanPath === '/api/backup' && method === 'POST') return this._backup();
            if (cleanPath === '/api/backup/list' && method === 'GET') return this._backupList();
            if (cleanPath === '/api/backup/restore' && method === 'POST') return this._backupRestore(body);
            if (cleanPath === '/api/backup/clear' && method === 'POST') return this._backupClear();
            if (cleanPath === '/api/backup/export-json' && method === 'GET') return this._exportAllJson();
            if (cleanPath === '/api/backup/import-json' && method === 'POST') return this._importAllJson(body);
            if (cleanPath === '/api/export/settings' && method === 'GET') return { export_detail: (this.getModule('settings').export_detail || false) };
            if (cleanPath === '/api/export/settings/save' && method === 'POST') return this._exportSettingsSave(body);
            if (cleanPath === '/api/export/txt' && method === 'GET') return this._exportAllTxt();
            if (cleanPath === '/api/export/order' && method === 'GET') return this.getModule('export_order');
            if (cleanPath === '/api/export/order/save' && method === 'POST') return this._exportOrderSave(body);
            if (cleanPath === '/api/buttons/config' && method === 'GET') return this.getModule('buttons_config');
            if (cleanPath === '/api/buttons/config/save' && method === 'POST') return this._buttonsConfigSave(body);

            // ---- 新模块通用 CRUD 路由 ----
            let nm;
            nm = cleanPath.match(/^\/api\/mod\/([^/]+)$/);
            if (nm && method === 'GET') return this.getModule(nm[1]);
            nm = cleanPath.match(/^\/api\/mod\/([^/]+)\/save$/);
            if (nm && method === 'POST') { this.saveModule(nm[1], body); return { success: true }; }
            nm = cleanPath.match(/^\/api\/mod\/([^/]+)\/list$/);
            if (nm && method === 'GET') { const d = this.getModule(nm[1]); return Array.isArray(d) ? d : []; }
            nm = cleanPath.match(/^\/api\/mod\/([^/]+)\/add$/);
            if (nm && method === 'POST') return this._modArrayAdd(nm[1], body);
            nm = cleanPath.match(/^\/api\/mod\/([^/]+)\/edit$/);
            if (nm && method === 'POST') return this._modArrayEdit(nm[1], body);
            nm = cleanPath.match(/^\/api\/mod\/([^/]+)\/delete$/);
            if (nm && method === 'POST') return this._modArrayDelete(nm[1], body);
            nm = cleanPath.match(/^\/api\/mod\/([^/]+)\/set$/);
            if (nm && method === 'POST') { this.saveModule(nm[1], body.data !== undefined ? body.data : body); return { success: true }; }

            // ---- 正则匹配路径 ----
            let m;
            m = cleanPath.match(/^\/api\/export\/module\/([^/]+)\/txt$/);
            if (m && method === 'GET') return this._exportModuleTxt(m[1]);

            m = cleanPath.match(/^\/api\/export\/custom\/category\/([^/]+)\/txt$/);
            if (m && method === 'GET') return this._exportCustomCategoryTxt(m[1]);

            // 未匹配
            console.warn('[LocalDataManager] 未匹配的路由:', method, path);
            return { success: false, error: '未知的API路径: ' + path };
        } catch (err) {
            console.error('[LocalDataManager] 处理请求出错:', err);
            return { success: false, error: err.message };
        }
    }

    // ==================== 角色模块 ====================

    _apiInit() {
        const inventory = this.getModule('inventory');
        const equipment = this.getModule('equipment');
        const itemLibrary = this.getModule('item_library');
        return {
            success: true,
            version: this.version,
            character: this.getModule('character'),
            inventory: this.inventoryToArray(inventory),
            equipment: this.equipmentToObject(equipment, inventory, itemLibrary),
            equipment_slots: this.getModule('equipment_slots'),
            currency: this.getModule('currency'),
            currency_types: this.getModule('currency_types'),
            stats: this.getModule('stats')
        };
    }

    _characterSave(body) {
        this.saveModule('character', body);
        return { success: true, message: '角色保存成功', character: this.getModule('character') };
    }

    _characterEdit(body) {
        const character = this.getModule('character');
        Object.assign(character, body);
        this.saveModule('character', character);
        return { success: true, message: '角色保存成功', character };
    }

    _characterRename(body) {
        const character = this.getModule('character');
        character.name = body.name || '';
        this.saveModule('character', character);
        return { success: true, character };
    }

    _charTplCreate(body) {
        const id = body.id || this.generateId('tpl');
        const templates = this.getModule('character_templates');
        templates[id] = body;
        this.saveModule('character_templates', templates);
        return { success: true, templates };
    }

    _charTplEdit(body) {
        const id = body.id || '';
        const templates = this.getModule('character_templates');
        if (!templates[id]) return { success: false, error: '模板不存在' };
        templates[id] = body;
        this.saveModule('character_templates', templates);
        return { success: true, templates };
    }

    _charTplDelete(body) {
        const id = body.id || '';
        const templates = this.getModule('character_templates');
        if (!templates[id]) return { success: false, error: '模板不存在' };
        delete templates[id];
        this.saveModule('character_templates', templates);
        return { success: true, templates };
    }

    // ==================== 货币模块 ====================

    _currencyAdd(body) {
        const type = body.type || '';
        const amount = Number(body.amount) || 0;
        const currency = this.getModule('currency');
        if (!(type in currency)) currency[type] = 0;
        const current = typeof currency[type] === 'number' ? currency[type] : 0;
        currency[type] = current + amount;
        this.saveModule('currency', currency);
        return { success: true, currency };
    }

    _currencySet(body) {
        const type = body.type || '';
        const amount = Number(body.amount) || 0;
        const currency = this.getModule('currency');
        currency[type] = amount;
        this.saveModule('currency', currency);
        return { success: true, currency };
    }

    _currencyDelete(body) {
        const type = body.type || '';
        const currency = this.getModule('currency');
        if (!(type in currency)) return { success: false, error: '货币类型不存在' };
        delete currency[type];
        this.saveModule('currency', currency);
        return { success: true, currency };
    }

    _currencyTypeAdd(body) {
        const id = body.currency_id || body.id || '';
        const name = body.name || '';
        const icon = body.icon || 'coin';
        const initialAmount = Number(body.initial_amount) || 0;
        if (!id) return { success: false, error: '货币ID不能为空' };

        const types = this.getModule('currency_types');
        types[id] = { name, icon, currency_id: id };
        this.saveModule('currency_types', types);

        const currency = this.getModule('currency');
        currency[id] = initialAmount;
        this.saveModule('currency', currency);

        return { success: true, message: '货币类型添加成功', currency_types: types, currency };
    }

    _currencyTypeEdit(body) {
        const id = body.currency_id || body.id || '';
        const types = this.getModule('currency_types');
        if (!types[id]) return { success: false, error: '货币类型不存在' };
        if (body.name !== undefined) types[id].name = body.name;
        if (body.icon !== undefined) types[id].icon = body.icon;
        this.saveModule('currency_types', types);
        return { success: true, message: '货币类型更新成功', currency_types: types };
    }

    _currencyTypeDelete(body) {
        const id = body.currency_id || body.id || '';
        if (!id) return { success: false, error: '缺少货币ID' };

        const types = this.getModule('currency_types');
        const currency = this.getModule('currency');

        // 容错：即使 currency_types 中没有该条目，也要清理 currency 中的对应数值，
        // 否则用户在货币面板上看到的"电力"等条目将永远无法删除。
        let typeExisted = false;
        if (types && types[id]) {
            delete types[id];
            this.saveModule('currency_types', types);
            typeExisted = true;
        }
        let currencyExisted = false;
        if (currency && (id in currency)) {
            delete currency[id];
            this.saveModule('currency', currency);
            currencyExisted = true;
        }

        if (!typeExisted && !currencyExisted) {
            return { success: false, error: '货币类型不存在' };
        }
        return { success: true, message: '货币类型删除成功', currency_types: types, currency };
    }

    // ==================== 背包模块 ====================

    _inventoryAdd(body) {
        const itemId = body.item_id || '';
        const quantity = body.quantity || 1;
        const inventory = this.getModule('inventory');
        const itemLibrary = this.getModule('item_library');

        let itemData = null;
        if (Array.isArray(itemLibrary)) {
            itemData = itemLibrary.find(i => i.id === itemId);
        } else if (itemLibrary && typeof itemLibrary === 'object') {
            itemData = itemLibrary[itemId] || Object.values(itemLibrary).find(i => i && i.id === itemId);
        }

        if (itemData) {
            itemData = { ...itemData };
            if (inventory[itemId] && typeof inventory[itemId] === 'object') {
                const existingQty = inventory[itemId].quantity || 1;
                itemData.quantity = existingQty + quantity;
            } else {
                itemData.quantity = quantity;
            }
            const catId = itemData.category_id || '';
            if (catId) {
                const categories = this.getModule('item_categories');
                if (categories[catId] && typeof categories[catId] === 'object' && categories[catId].bind_module) {
                    itemData.bind_module = categories[catId].bind_module;
                    // 优化3：分类绑定装备模块时，自动设置equip_slot为category_id
                    if (categories[catId].bind_module === 'equipment' && !itemData.equip_slot) {
                        const slots = this.getModule('equipment_slots');
                        if (slots && slots[catId]) {
                            itemData.equip_slot = catId;
                        }
                    }
                }
            }
            inventory[itemId] = itemData;
        } else {
            // 物品不在物品库中，存储为对象而非纯数字，避免名称丢失
            if (inventory[itemId] && typeof inventory[itemId] === 'object') {
                inventory[itemId].quantity = (inventory[itemId].quantity || 1) + quantity;
            } else if (typeof inventory[itemId] === 'number') {
                // 旧格式为数字，转为对象
                inventory[itemId] = { id: itemId, name: body.name || itemId, quantity: (inventory[itemId] || 0) + quantity, icon: body.icon || 'box' };
            } else {
                inventory[itemId] = { id: itemId, name: body.name || itemId, quantity: quantity, icon: body.icon || 'box' };
            }
        }
        this.saveModule('inventory', inventory);
        return { success: true, inventory: this.inventoryToArray(inventory) };
    }

    _inventoryEdit(body) {
        const itemId = body.item_id || '';
        const inventory = this.getModule('inventory');
        
        if (inventory[itemId] && typeof inventory[itemId] === 'object') {
            // 物品是对象，只更新传入的字段，保留原有属性
            if (body.quantity !== undefined) inventory[itemId].quantity = body.quantity;
            if (body.name !== undefined) inventory[itemId].name = body.name;
            if (body.icon !== undefined) inventory[itemId].icon = body.icon;
            if (body.description !== undefined) inventory[itemId].description = body.description;
            if (body.equip_slot !== undefined) inventory[itemId].equip_slot = body.equip_slot;
            if (body.stats !== undefined) inventory[itemId].stats = body.stats;
        } else {
            // 物品是数字或不存在，直接设置数量
            const quantity = body.quantity || 0;
            if (quantity > 0) {
                inventory[itemId] = quantity;
            } else {
                delete inventory[itemId];
            }
        }
        
        this.saveModule('inventory', inventory);
        return { success: true, inventory: this.inventoryToArray(inventory) };
    }

    _inventoryRemove(body) {
        const itemId = body.item_id || '';
        if (!itemId) return { success: false, error: '缺少物品ID' };

        const inventory = this.getModule('inventory');

        // 容错查找：
        // 1) 直接按 key 命中（常规情况，inventory[itemId] = {id:itemId, ...}）
        // 2) 否则按 value.id 字段命中（旧数据/导入数据可能 key 与 id 不一致）
        let removeKey = null;
        if (inventory && typeof inventory === 'object' && !Array.isArray(inventory)) {
            if (itemId in inventory) {
                removeKey = itemId;
            } else {
                for (const [k, v] of Object.entries(inventory)) {
                    if (v && typeof v === 'object' && v.id === itemId) {
                        removeKey = k;
                        break;
                    }
                }
            }
        }

        if (removeKey === null) return { success: false, error: '物品不存在' };
        delete inventory[removeKey];
        this.saveModule('inventory', inventory);
        return { success: true, inventory: this.inventoryToArray(inventory) };
    }

    _inventoryAddCustom(body) {
        let itemId = body.id || '';
        if (!itemId) itemId = this.generateId('item');

        const inventory = this.getModule('inventory');
        const itemData = { ...body, id: itemId };

        if (inventory[itemId] && typeof inventory[itemId] === 'object') {
            const existingQty = inventory[itemId].quantity || 1;
            const newQty = body.quantity || 1;
            itemData.quantity = existingQty + newQty;
        }
        inventory[itemId] = itemData;
        this.saveModule('inventory', inventory);
        return { success: true, inventory: this.inventoryToArray(inventory) };
    }

    // ==================== 物品库与分类 ====================

    _itemsLibraryGet() {
        let lib = this.getModule('item_library');
        if (Array.isArray(lib)) return lib;
        if (lib && typeof lib === 'object') {
            return Object.entries(lib).map(([key, val]) => {
                const item = { ...val };
                if (!item.id) item.id = key;
                return item;
            });
        }
        return [];
    }

    _itemsLibraryAdd(body) {
        const name = body.name || '';
        if (!name) return { success: false, error: '物品名称不能为空' };

        let id = body.id || '';
        const itemLibrary = this.getModule('item_library');
        if (!Array.isArray(itemLibrary)) return { success: false, error: '物品库数据格式错误' };

        if (!id) {
            const categoryId = body.category_id || '';
            // 基础ID = 分类ID（代表物品本身），不追加序号
            id = categoryId || ('item_' + Date.now().toString(36));
            // 如果ID已存在，追加时间戳作为唯一后缀
            if (itemLibrary.some(i => i.id === id)) {
                id = id + '_' + Date.now().toString(36);
            }
        }
        body.id = id;
        itemLibrary.push(body);
        this.saveModule('item_library', itemLibrary);
        return { success: true, items: itemLibrary };
    }

    _itemsLibraryEdit(body) {
        const itemId = body.item_id || body.id || '';
        if (!itemId) return { success: false, error: '物品ID不能为空' };
        const itemLibrary = this.getModule('item_library');
        if (!Array.isArray(itemLibrary)) return { success: false, error: '物品库数据格式错误' };

        const item = itemLibrary.find(i => i.id === itemId);
        if (!item) return { success: false, error: '物品不存在' };

        for (const field of ['name', 'icon', 'type', 'description', 'category_id', 'level']) {
            if (body[field] !== undefined) item[field] = body[field];
        }
        this.saveModule('item_library', itemLibrary);
        return { success: true, items: itemLibrary };
    }

    _itemsLibraryDelete(body) {
        const itemId = body.item_id || body.id || '';
        if (!itemId) return { success: false, error: '物品ID不能为空' };
        let itemLibrary = this.getModule('item_library');
        if (!Array.isArray(itemLibrary)) return { success: false, error: '物品库数据格式错误' };

        const idx = itemLibrary.findIndex(i => i.id === itemId);
        if (idx === -1) return { success: false, error: '物品不存在' };

        itemLibrary = itemLibrary.filter(i => i.id !== itemId);
        this.saveModule('item_library', itemLibrary);
        return { success: true, items: itemLibrary };
    }

    _customItemDefCreate(body) {
        const id = body.id || this.generateId('cid');
        const defs = this.getModule('custom_items_def');
        defs[id] = body;
        this.saveModule('custom_items_def', defs);
        return { success: true, items: defs };
    }

    _customItemDefEdit(body) {
        const id = body.id || '';
        const defs = this.getModule('custom_items_def');
        if (!defs[id]) return { success: false, error: '自定义物品类型不存在' };
        defs[id] = body;
        this.saveModule('custom_items_def', defs);
        return { success: true, items: defs };
    }

    _customItemDefDelete(body) {
        const id = body.id || '';
        const defs = this.getModule('custom_items_def');
        if (!defs[id]) return { success: false, error: '自定义物品类型不存在' };
        delete defs[id];
        this.saveModule('custom_items_def', defs);
        return { success: true, items: defs };
    }

    _itemCatAdd(body) {
        const name = body.name || '';
        if (!name) return { success: false, error: '分类名称不能为空' };
        const categories = this.getModule('item_categories');
        const catId = body.id || this.generateId('cat');
        categories[catId] = {
            id: catId, name, icon: body.icon || 'folder',
            description: body.description || '', bind_module: body.bind_module || '',
            created_at: String(Date.now()), item_count: 0
        };
        this.saveModule('item_categories', categories);
        return { success: true, category: categories[catId], categories };
    }

    _itemCatEdit(body) {
        const catId = body.category_id || body.id || '';
        if (!catId) return { success: false, error: '分类ID不能为空' };
        const categories = this.getModule('item_categories');
        if (!categories[catId]) return { success: false, error: '分类不存在' };
        for (const f of ['name', 'icon', 'description', 'bind_module']) {
            if (body[f] !== undefined) categories[catId][f] = body[f];
        }
        this.saveModule('item_categories', categories);
        return { success: true, category: categories[catId], categories };
    }

    _itemCatDelete(body) {
        const catId = body.category_id || body.id || '';
        if (!catId) return { success: false, error: '分类ID不能为空' };
        const categories = this.getModule('item_categories');
        if (!categories[catId]) return { success: false, error: '分类不存在' };
        delete categories[catId];
        this.saveModule('item_categories', categories);
        return { success: true, categories };
    }

    // ==================== 装备模块 ====================

    _equipmentGet() {
        const equipment = this.getModule('equipment');
        const inventory = this.getModule('inventory');
        const itemLibrary = this.getModule('item_library');
        return this.equipmentToObject(equipment, inventory, itemLibrary);
    }

    _equipmentEquip(body) {
        let slot = body.slot || '';
        const itemId = body.item_id || '';
        const equipment = this.getModule('equipment');
        const inventory = this.getModule('inventory');

        // 自动推断槽位
        if (!slot && inventory[itemId] && typeof inventory[itemId] === 'object') {
            if (inventory[itemId].equip_slot) slot = inventory[itemId].equip_slot;
            if (!slot) {
                const t = inventory[itemId].type || '';
                if (t === 'weapon') slot = 'weapon';
                else if (t === 'armor') slot = 'armor';
                else if (t === 'accessory') slot = 'accessory';
            }
            // 通过bind_module推断：如果物品绑定了装备模块，尝试用category_id作为槽位
            if (!slot && inventory[itemId].bind_module === 'equipment' && inventory[itemId].category_id) {
                const slots = this.getModule('equipment_slots');
                if (slots[inventory[itemId].category_id]) {
                    slot = inventory[itemId].category_id;
                }
            }
        }
        if (!slot) return { success: false, error: '无法确定装备槽位' };

        // 旧装备放回背包
        if (equipment[slot]) {
            let oldItemId = '';
            let isObj = false;
            if (typeof equipment[slot] === 'string') {
                oldItemId = equipment[slot];
            } else if (equipment[slot] && equipment[slot].id) {
                oldItemId = equipment[slot].id;
                isObj = true;
            }
            if (oldItemId) {
                if (inventory[oldItemId] && typeof inventory[oldItemId] === 'object') {
                    inventory[oldItemId].quantity = (inventory[oldItemId].quantity || 1) + 1;
                } else if (isObj) {
                    const oldItem = { ...equipment[slot], quantity: 1 };
                    inventory[oldItemId] = oldItem;
                } else {
                    inventory[oldItemId] = { id: oldItemId, name: oldItemId, quantity: 1, icon: 'box' };
                }
            }
        }

        // 装备新物品
        if (inventory[itemId] && typeof inventory[itemId] === 'object') {
            const itemCopy = { ...inventory[itemId] };
            if (!itemCopy.id) itemCopy.id = itemId;
            equipment[slot] = itemCopy;
        } else {
            equipment[slot] = { id: itemId, name: itemId, quantity: 1, icon: 'box' };
        }

        // 背包减1
        if (inventory[itemId]) {
            if (typeof inventory[itemId] === 'object') {
                const qty = inventory[itemId].quantity || 1;
                if (qty <= 1) delete inventory[itemId];
                else inventory[itemId].quantity = qty - 1;
            } else if (typeof inventory[itemId] === 'number') {
                if (inventory[itemId] <= 1) delete inventory[itemId];
                else inventory[itemId] = inventory[itemId] - 1;
            }
        }

        this.saveModule('equipment', equipment);
        this.saveModule('inventory', inventory);
        const itemLibrary = this.getModule('item_library');
        return {
            success: true,
            equipment: this.equipmentToObject(equipment, inventory, itemLibrary),
            inventory: this.inventoryToArray(inventory),
            character: this.getModule('character')
        };
    }

    _equipmentUnequip(body) {
        const slot = body.slot || '';
        const equipment = this.getModule('equipment');
        const inventory = this.getModule('inventory');

        if (!(slot in equipment)) return { success: false, error: '装备槽不存在' };

        let itemId = '';
        if (typeof equipment[slot] === 'string') itemId = equipment[slot];
        else if (equipment[slot] && equipment[slot].id) itemId = equipment[slot].id;

        if (itemId) {
            if (inventory[itemId]) {
                if (typeof inventory[itemId] === 'object') {
                    inventory[itemId].quantity = (inventory[itemId].quantity || 1) + 1;
                } else if (typeof inventory[itemId] === 'number') {
                    inventory[itemId] = inventory[itemId] + 1;
                }
            } else {
                if (equipment[slot] && typeof equipment[slot] === 'object') {
                    const copy = { ...equipment[slot], quantity: 1 };
                    inventory[itemId] = copy;
                } else {
                    inventory[itemId] = { id: itemId, name: itemId, quantity: 1, icon: 'box' };
                }
            }
        }

        delete equipment[slot];
        this.saveModule('equipment', equipment);
        this.saveModule('inventory', inventory);
        return {
            success: true,
            equipment,
            inventory: this.inventoryToArray(inventory),
            character: this.getModule('character')
        };
    }

    _slotAdd(body) {
        const id = body.slot_id || body.id || '';
        if (!id) return { success: false, error: '槽位ID不能为空' };
        const slots = this.getModule('equipment_slots');
        slots[id] = { name: body.name || id, icon: body.icon || 'sword', slot_id: id };
        this.saveModule('equipment_slots', slots);
        return { success: true, slots };
    }

    _slotEdit(body) {
        const id = body.slot_id || body.id || '';
        const slots = this.getModule('equipment_slots');
        if (!slots[id]) return { success: false, error: '装备槽位不存在' };
        if (body.name !== undefined) slots[id].name = body.name;
        if (body.icon !== undefined) slots[id].icon = body.icon;
        this.saveModule('equipment_slots', slots);
        return { success: true, slots };
    }

    _slotDelete(body) {
        const id = body.slot_id || body.id || '';
        const slots = this.getModule('equipment_slots');
        if (!slots[id]) return { success: false, error: '装备槽位不存在' };
        delete slots[id];
        this.saveModule('equipment_slots', slots);

        const equipment = this.getModule('equipment');
        delete equipment[id];
        this.saveModule('equipment', equipment);
        return { success: true, slots, equipment };
    }

    // ==================== 任务模块 ====================

    _questAccept(body) {
        const questId = body.quest_id || '';
        const quests = this.getModule('quests');
        quests[questId] = { status: 'in_progress', progress: 0 };
        this.saveModule('quests', quests);
        return { success: true, quests };
    }

    _questProgress(body) {
        const questId = body.quest_id || '';
        const progress = body.progress || 0;
        const quests = this.getModule('quests');
        if (!quests[questId]) return { success: false, error: '任务不存在' };
        quests[questId].progress = progress;
        this.saveModule('quests', quests);
        return { success: true, quests };
    }

    _questComplete(body) {
        const questId = body.quest_id || '';
        const quests = this.getModule('quests');
        if (!quests[questId]) return { success: false, error: '任务不存在' };
        quests[questId].status = 'completed';
        this.saveModule('quests', quests);
        return { success: true, quests };
    }

    _questCustomCreate(body) {
        let id = body.id || '';
        if (!id) { id = this.generateId('quest'); body.id = id; }
        const customQuests = this.getModule('quests_custom');
        customQuests[id] = body;
        this.saveModule('quests_custom', customQuests);
        return { success: true, quests: this.objectToArray(customQuests) };
    }

    _questCustomEdit(body) {
        const id = body.id || '';
        const customQuests = this.getModule('quests_custom');
        if (!customQuests[id]) return { success: false, error: '自定义任务不存在' };
        body.id = id;
        customQuests[id] = body;
        this.saveModule('quests_custom', customQuests);
        return { success: true, quests: this.objectToArray(customQuests) };
    }

    _questCustomDelete(body) {
        const id = body.id || '';
        const customQuests = this.getModule('quests_custom');
        if (!customQuests[id]) return { success: false, error: '自定义任务不存在' };
        delete customQuests[id];
        this.saveModule('quests_custom', customQuests);
        return { success: true, quests: this.objectToArray(customQuests) };
    }

    // ==================== 技能模块 ====================

    _skillLearn(body) {
        const skillId = body.skill_id || '';
        const level = body.level || 1;
        const skills = this.getModule('skills');
        skills[skillId] = { level, learned: true };
        this.saveModule('skills', skills);
        return { success: true, skills };
    }

    _skillLearnItem(body) {
        const itemId = body.item_id || '';
        if (!itemId) return { success: false, error: '物品ID不能为空' };
        const skills = this.getModule('skills');
        const inventory = this.getModule('inventory');
        if (!(itemId in inventory)) return { success: false, error: '背包中没有该物品' };
        let item;
        if (typeof inventory[itemId] === 'object') { item = { ...inventory[itemId] }; }
        else { item = { id: itemId, name: itemId, icon: 'spark' }; }
        if (!item.id) item.id = itemId;
        const skillData = { ...item, learned: true };
        if (!skillData.level) skillData.level = 1;
        delete skillData.quantity;
        skills[itemId] = skillData;
        let quantity = 1;
        if (typeof inventory[itemId] === 'object' && inventory[itemId].quantity !== undefined) quantity = inventory[itemId].quantity;
        else if (typeof inventory[itemId] === 'number') quantity = inventory[itemId];
        quantity--;
        if (quantity <= 0) delete inventory[itemId];
        else if (typeof inventory[itemId] === 'object') inventory[itemId].quantity = quantity;
        else inventory[itemId] = quantity;
        this.saveModule('skills', skills);
        this.saveModule('inventory', inventory);
        return { success: true, message: '技能学习成功', skills: this.objectToArray(skills), inventory: this.inventoryToArray(inventory) };
    }

    _skillForget(body) {
        const skillId = body.skill_id || '';
        const skills = this.getModule('skills');
        if (!skills[skillId]) return { success: false, error: '技能不存在' };
        delete skills[skillId];
        this.saveModule('skills', skills);
        return { success: true, skills };
    }

    _skillCustomCreate(body) {
        let id = body.id || '';
        if (!id) { id = this.generateId('skill'); body.id = id; }
        const cs = this.getModule('skills_custom');
        cs[id] = body; this.saveModule('skills_custom', cs);
        return { success: true, skills: this.objectToArray(cs) };
    }
    _skillCustomEdit(body) {
        const id = body.id || body.skill_id || '';
        const cs = this.getModule('skills_custom');
        if (!cs[id]) return { success: false, error: '自定义技能不存在' };
        body.id = id; cs[id] = body; this.saveModule('skills_custom', cs);
        return { success: true, skills: this.objectToArray(cs) };
    }
    _skillCustomDelete(body) {
        const id = body.id || body.skill_id || '';
        const cs = this.getModule('skills_custom');
        if (!cs[id]) {
            // 即使自定义技能库中不存在，也视为成功（可能只是已学技能）
            return { success: true, skills: this.objectToArray(cs) };
        }
        delete cs[id]; this.saveModule('skills_custom', cs);
        return { success: true, skills: this.objectToArray(cs) };
    }
    _skillLearnCustom(body) {
        const skillId = body.skill_id || '';
        const level = body.level || 1;
        const skills = this.getModule('skills');
        skills[skillId] = { level, learned: true, custom: true };
        this.saveModule('skills', skills);
        return { success: true, skills };
    }

    // ==================== 剧情模块 ====================
    // story 数据兼容两种存储格式：
    //   对象格式 { marks: {id: item}, foreshadowing: {id: item} }（当前默认）
    //   数组格式 { marks: [item], foreshadowing: [item] }（旧数据/导入备份可能产生）
    _storyFindById(collection, id) {
        if (Array.isArray(collection)) {
            return collection.find(x => x && (x.id === id || x.foreshadow_id === id || x.mark_id === id));
        }
        if (collection && typeof collection === 'object') {
            if (collection[id]) return collection[id];
            for (const k of Object.keys(collection)) {
                const v = collection[k];
                if (v && (v.id === id || v.foreshadow_id === id || v.mark_id === id)) return v;
            }
        }
        return undefined;
    }
    _storyRemoveById(collection, id) {
        if (Array.isArray(collection)) {
            const idx = collection.findIndex(x => x && (x.id === id || x.foreshadow_id === id || x.mark_id === id));
            if (idx >= 0) { collection.splice(idx, 1); return true; }
            return false;
        }
        if (collection && typeof collection === 'object') {
            if (collection[id]) { delete collection[id]; return true; }
            for (const k of Object.keys(collection)) {
                const v = collection[k];
                if (v && (v.id === id || v.foreshadow_id === id || v.mark_id === id)) {
                    delete collection[k]; return true;
                }
            }
        }
        return false;
    }
    _storyMarksGet() { const s = this.getModule('story'); return this.objectToArray((s && s.marks) || {}); }
    _storyMarkAdd(body) {
        const id = body.mark_id || '';
        if (!id) return { success: false, error: '标记ID不能为空' };
        const story = this.getModule('story');
        if (Array.isArray(story.marks)) {
            story.marks = story.marks.filter(x => x && x.mark_id !== id && x.id !== id);
            story.marks.push(body);
        } else {
            if (!story.marks || typeof story.marks !== 'object') story.marks = {};
            story.marks[id] = body;
        }
        this.saveModule('story', story);
        return { success: true, marks: this.objectToArray(story.marks) };
    }
    _storyMarkEdit(body) {
        const oldId = body.old_id || '', newId = body.mark_id || '';
        if (!oldId || !newId) return { success: false, error: '标记ID不能为空' };
        const story = this.getModule('story');
        if (!this._storyFindById(story.marks, oldId)) return { success: false, error: '剧情标记不存在' };
        if (Array.isArray(story.marks)) {
            story.marks = story.marks.filter(x => x && x.mark_id !== oldId && x.id !== oldId);
            story.marks.push(body);
        } else {
            for (const k of Object.keys(story.marks)) {
                const v = story.marks[k];
                if (k === oldId || (v && (v.id === oldId || v.mark_id === oldId))) delete story.marks[k];
            }
            story.marks[newId] = body;
        }
        this.saveModule('story', story);
        return { success: true, marks: this.objectToArray(story.marks) };
    }
    _storyMarkDelete(body) {
        const id = body.mark_id || '';
        if (!id) return { success: false, error: '标记ID不能为空' };
        const story = this.getModule('story');
        this._storyRemoveById(story.marks, id);
        this.saveModule('story', story);
        return { success: true, marks: this.objectToArray((story && story.marks) || {}) };
    }
    _foreshadowingGet() { const s = this.getModule('story'); return this.objectToArray((s && s.foreshadowing) || {}); }
    _foreshadowingAdd(body) {
        const id = body.foreshadow_id || '';
        if (!id) return { success: false, error: '伏笔ID不能为空' };
        const story = this.getModule('story');
        if (Array.isArray(story.foreshadowing)) {
            story.foreshadowing = story.foreshadowing.filter(x => x && x.foreshadow_id !== id && x.id !== id);
            story.foreshadowing.push(body);
        } else {
            if (!story.foreshadowing || typeof story.foreshadowing !== 'object') story.foreshadowing = {};
            story.foreshadowing[id] = body;
        }
        this.saveModule('story', story);
        return { success: true, foreshadowing: this.objectToArray(story.foreshadowing) };
    }
    _foreshadowingEdit(body) {
        const id = body.id || body.foreshadow_id || '';
        if (!id) return { success: false, error: '伏笔ID不能为空' };
        const story = this.getModule('story');
        if (!this._storyFindById(story.foreshadowing, id)) return { success: false, error: '伏笔不存在' };
        if (Array.isArray(story.foreshadowing)) {
            const idx = story.foreshadowing.findIndex(x => x && (x.id === id || x.foreshadow_id === id));
            if (idx >= 0) story.foreshadowing[idx] = body;
        } else {
            for (const k of Object.keys(story.foreshadowing)) {
                const v = story.foreshadowing[k];
                if (k === id || (v && (v.id === id || v.foreshadow_id === id))) { story.foreshadowing[k] = body; break; }
            }
        }
        this.saveModule('story', story);
        return { success: true, foreshadowing: this.objectToArray(story.foreshadowing) };
    }
    _foreshadowingDelete(body) {
        const id = body.id || body.foreshadow_id || '';
        if (!id) return { success: false, error: '伏笔ID不能为空' };
        const story = this.getModule('story');
        this._storyRemoveById(story.foreshadowing, id);
        this.saveModule('story', story);
        return { success: true, foreshadowing: this.objectToArray((story && story.foreshadowing) || {}) };
    }
    _foreshadowingResolve(body) {
        const id = body.id || body.foreshadow_id || '';
        const story = this.getModule('story');
        const found = this._storyFindById(story.foreshadowing, id);
        if (found) {
            found.resolved = true;
            this.saveModule('story', story);
            return { success: true, foreshadowing: this.objectToArray(story.foreshadowing) };
        }
        return { success: false, error: '伏笔不存在' };
    }

    // ==================== 地图模块 ====================
    _locationCreate(body) {
        let id = body.location_id || body.id || '';
        if (!id) id = this.generateId('loc');
        body.id = id;
        const locs = this.getModule('locations');
        locs[id] = body; this.saveModule('locations', locs);
        return { success: true, locations: locs };
    }
    _locationEdit(body) {
        const id = body.location_id || body.id || '';
        const locs = this.getModule('locations');
        if (!locs[id]) return { success: false, error: '地点不存在' };
        locs[id] = body; this.saveModule('locations', locs);
        return { success: true, locations: locs };
    }
    _locationDelete(body) {
        const id = body.location_id || body.id || '';
        const locs = this.getModule('locations');
        if (!locs[id]) return { success: false, error: '地点不存在' };
        delete locs[id]; this.saveModule('locations', locs);
        return { success: true, locations: locs };
    }
    _locTypeCreate(body) {
        const id = body.id || body.type_id || this.generateId('lt');
        const types = this.getModule('location_types');
        types[id] = body; this.saveModule('location_types', types);
        return { success: true, types };
    }
    _locTypeEdit(body) {
        const id = body.id || body.type_id || '';
        const types = this.getModule('location_types');
        if (!types[id]) return { success: false, error: '地点类型不存在' };
        types[id] = body; this.saveModule('location_types', types);
        return { success: true, types };
    }
    _locTypeDelete(body) {
        const id = body.id || body.type_id || '';
        const types = this.getModule('location_types');
        if (!types[id]) return { success: false, error: '地点类型不存在' };
        delete types[id]; this.saveModule('location_types', types);
        return { success: true, types };
    }
    _structLevelCreate(body) {
        const id = body.id || this.generateId('sl');
        const lvls = this.getModule('structure_levels');
        lvls[id] = body; this.saveModule('structure_levels', lvls);
        return { success: true, levels: lvls };
    }
    _structLevelEdit(body) {
        const id = body.id || '';
        const lvls = this.getModule('structure_levels');
        if (!lvls[id]) return { success: false, error: '结构等级不存在' };
        lvls[id] = body; this.saveModule('structure_levels', lvls);
        return { success: true, levels: lvls };
    }
    _structLevelDelete(body) {
        const id = body.id || '';
        const lvls = this.getModule('structure_levels');
        if (!lvls[id]) return { success: false, error: '结构等级不存在' };
        delete lvls[id]; this.saveModule('structure_levels', lvls);
        return { success: true, levels: lvls };
    }

    // ==================== 人物关系模块 ====================
    _characterAdd(body) {
        const name = body.name || '';
        if (!name) return { success: false, error: '人物姓名不能为空' };
        let chars = this.getModule('characters');
        if (!Array.isArray(chars)) chars = [];
        chars.push({ id: this.generateId('char'), name, avatar: body.avatar || 'user', description: body.description || '' });
        this.saveModule('characters', chars);
        return { success: true, characters: chars };
    }
    _characterEdit2(body) {
        const cid = body.id || '';
        let chars = this.getModule('characters');
        if (!Array.isArray(chars)) return { success: false, error: '人物不存在' };
        const ch = chars.find(c => c.id === cid);
        if (!ch) return { success: false, error: '人物不存在' };
        ch.name = body.name || ch.name; ch.avatar = body.avatar || ch.avatar;
        ch.description = body.description !== undefined ? body.description : ch.description;
        this.saveModule('characters', chars);
        return { success: true, characters: chars };
    }
    _characterDelete(body) {
        const cid = body.id || '';
        let chars = this.getModule('characters');
        if (!Array.isArray(chars)) return { success: false, error: '人物不存在' };
        chars = chars.filter(c => c.id !== cid);
        this.saveModule('characters', chars);
        return { success: true, characters: chars };
    }
    _relationAdd(body) {
        let rels = this.getModule('relations');
        if (!Array.isArray(rels)) rels = [];
        if (!body.id) body.id = this.generateId('rel');
        rels.push(body); this.saveModule('relations', rels);
        return { success: true, relations: rels };
    }
    _relationEdit(body) {
        const rid = body.id || '';
        let rels = this.getModule('relations');
        if (!Array.isArray(rels)) return { success: false, error: '关系不存在' };
        const rel = rels.find(r => r.id === rid);
        if (!rel) return { success: false, error: '关系不存在' };
        Object.assign(rel, body); this.saveModule('relations', rels);
        return { success: true, relations: rels };
    }
    _relationDelete(body) {
        const rid = body.id || '';
        let rels = this.getModule('relations');
        if (!Array.isArray(rels)) return { success: false, error: '关系不存在' };
        rels = rels.filter(r => r.id !== rid);
        this.saveModule('relations', rels);
        return { success: true, relations: rels };
    }
    _relTypeAdd(body) {
        let types = this.getModule('relation_types');
        if (!Array.isArray(types)) types = [];
        if (!body.id) body.id = this.generateId('rt');
        types.push(body); this.saveModule('relation_types', types);
        return { success: true, relation_types: types };
    }
    _relTypeEdit(body) {
        const tid = body.id || '';
        let types = this.getModule('relation_types');
        if (!Array.isArray(types)) return { success: false, error: '关系类型不存在' };
        const t = types.find(x => x.id === tid);
        if (!t) return { success: false, error: '关系类型不存在' };
        Object.assign(t, body); this.saveModule('relation_types', types);
        return { success: true, relation_types: types };
    }
    _relTypeDelete(body) {
        const tid = body.id || '';
        let types = this.getModule('relation_types');
        if (!Array.isArray(types)) return { success: false, error: '关系类型不存在' };
        types = types.filter(x => x.id !== tid);
        this.saveModule('relation_types', types);
        return { success: true, relation_types: types };
    }

    // ==================== 自定义数据模块 ====================
    _customCatCreate(body) {
        let id = body.category_id || body.id || '';
        if (!id) { id = this.generateId('cat'); body.id = id; }
        const cats = this.getModule('custom_categories');
        cats[id] = body; this.saveModule('custom_categories', cats);
        return { success: true, message: '自定义分类创建成功', categories: cats };
    }
    _customCatEdit(body) {
        const id = body.category_id || body.id || '';
        const cats = this.getModule('custom_categories');
        if (!cats[id]) return { success: false, error: '自定义分类不存在' };
        body.id = id; cats[id] = body; this.saveModule('custom_categories', cats);
        return { success: true, message: '自定义分类更新成功', categories: cats };
    }
    _customCatDelete(body) {
        const id = body.category_id || body.id || '';
        const cats = this.getModule('custom_categories');
        if (!cats[id]) return { success: false, error: '自定义分类不存在' };
        delete cats[id]; this.saveModule('custom_categories', cats);
        return { success: true, message: '自定义分类删除成功', categories: cats };
    }
    _customItemsGet(path) {
        const items = this.getModule('custom_items');
        let arr = this.objectToArray(items);
        const m = path.match(/[?&]category_id=([^&]+)/);
        if (m) { const cid = decodeURIComponent(m[1]); arr = arr.filter(i => i.category_id === cid); }
        return arr;
    }
    _customItemCreate(body) {
        const categoryId = body.category_id || '';
        const itemData = body.data || {};
        const id = this.generateId('item');
        const item = { ...itemData, id, category_id: categoryId };
        const items = this.getModule('custom_items');
        items[id] = item; this.saveModule('custom_items', items);
        return { success: true, message: '自定义条目创建成功', items: this.objectToArray(items) };
    }
    _customItemEdit(body) {
        const id = body.id || '';
        const itemData = body.data || {};
        const items = this.getModule('custom_items');
        if (!items[id]) return { success: false, error: '自定义条目不存在' };
        for (const [k, v] of Object.entries(itemData)) items[id][k] = v;
        this.saveModule('custom_items', items);
        return { success: true, message: '自定义条目更新成功', items: this.objectToArray(items) };
    }
    _customItemDelete(body) {
        const id = body.id || '';
        const items = this.getModule('custom_items');
        if (!items[id]) return { success: false, error: '自定义条目不存在' };
        delete items[id]; this.saveModule('custom_items', items);
        return { success: true, message: '自定义条目删除成功', items: this.objectToArray(items) };
    }

    // ==================== 新模块通用 CRUD ====================

    _modArrayAdd(moduleName, body) {
        let arr = this.getModule(moduleName);
        if (!Array.isArray(arr)) arr = [];
        if (!body.id) body.id = this.generateId(moduleName);
        arr.push(body);
        this.saveModule(moduleName, arr);
        return { success: true, data: arr, item: body };
    }

    _modArrayEdit(moduleName, body) {
        const id = body.id || '';
        let arr = this.getModule(moduleName);
        if (!Array.isArray(arr)) return { success: false, error: '数据格式错误' };
        const idx = arr.findIndex(item => item.id === id);
        if (idx === -1) return { success: false, error: '条目不存在' };
        arr[idx] = { ...arr[idx], ...body };
        this.saveModule(moduleName, arr);
        return { success: true, data: arr, item: arr[idx] };
    }

    _modArrayDelete(moduleName, body) {
        const id = body.id || '';
        let arr = this.getModule(moduleName);
        if (!Array.isArray(arr)) return { success: false, error: '数据格式错误' };
        const idx = arr.findIndex(item => item.id === id);
        if (idx === -1) return { success: false, error: '条目不存在' };
        arr.splice(idx, 1);
        this.saveModule(moduleName, arr);
        return { success: true, data: arr };
    }

    // ==================== 工具模块 ====================
    MAX_BACKUPS = 10; // 备份保留上限，超出自动清理最旧

    _getBackupKeys() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('backup_')) keys.push(k);
        }
        return keys.sort(); // ISO 时间戳字符串可字典序排序（旧→新）
    }

    _backup() {
        // 超出上限时清理最旧的备份
        const keys = this._getBackupKeys();
        while (keys.length >= this.MAX_BACKUPS) {
            const oldest = keys.shift();
            localStorage.removeItem(oldest);
        }
        const backup = {};
        for (const name of Object.keys(this.moduleDefaults)) backup[name] = this.getModule(name);
        const key = 'backup_' + new Date().toISOString().replace(/[:.]/g, '-');
        const ok = this.saveModule(key, backup);
        if (!ok) return { success: false, error: '备份写入失败（本地存储空间不足）' };
        return { success: true, data: { backup: key, count: this._getBackupKeys().length } };
    }

    _backupList() {
        const keys = this._getBackupKeys();
        const list = keys.map(k => {
            let size = 0;
            try { size = (localStorage.getItem(k) || '').length; } catch(e) {}
            const ts = k.substring(7); // 去掉 'backup_' 前缀
            const datePart = ts.substring(0, 10);
            const timePart = ts.length > 11 ? ts.substring(11).replace(/-/g, ':').replace('Z', '') : '';
            return { key: k, time: datePart + ' ' + timePart, size };
        }).reverse(); // 最新的在前
        return { success: true, data: { list } };
    }

    _backupRestore(body) {
        const key = body && body.key;
        if (!key || !key.startsWith('backup_')) return { success: false, error: '无效的备份标识' };
        let data;
        try {
            data = JSON.parse(localStorage.getItem(key));
        } catch(e) {
            return { success: false, error: '备份数据解析失败' };
        }
        if (!data || typeof data !== 'object') return { success: false, error: '备份数据格式错误' };
        let restored = 0;
        for (const name of Object.keys(this.moduleDefaults)) {
            if (name in data) {
                this.saveModule(name, data[name]);
                restored++;
            }
        }
        return { success: true, data: { restored } };
    }

    _backupClear() {
        const keys = this._getBackupKeys();
        keys.forEach(k => localStorage.removeItem(k));
        return { success: true, message: '备份清空成功', count: keys.length };
    }

    // 完整数据导出：收集全部业务 key（不含备份/损坏暂存）
    _exportAllJson() {
        const data = {};
        for (const name of Object.keys(this.moduleDefaults)) {
            data[name] = this.getModule(name);
        }
        return { success: true, data: { all: data, version: this.version } };
    }

    // 完整数据导入：校验后覆盖写入全部业务 key（兼容导出格式 {all:{...},version} 与裸键值对）
    _importAllJson(body) {
        let data = body && body.data;
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
            return { success: false, error: '数据格式错误：应为 JSON 对象' };
        }
        // 兼容 /api/backup/export-json 的导出格式
        if (data.all && typeof data.all === 'object' && !Array.isArray(data.all)) {
            data = data.all;
        }
        const knownKeys = Object.keys(this.moduleDefaults);
        let matched = 0;
        for (const name of knownKeys) {
            if (name in data) matched++;
        }
        if (matched === 0) {
            return { success: false, error: '未识别到任何有效数据模块，导入被拒绝' };
        }
        let imported = 0;
        for (const name of knownKeys) {
            if (name in data) {
                const ok = this.saveModule(name, data[name]);
                if (ok) imported++;
            }
        }
        return { success: true, data: { imported, total: matched } };
    }
    _exportSettingsSave(body) {
        const s = this.getModule('settings');
        if (body.export_detail !== undefined) s.export_detail = body.export_detail;
        this.saveModule('settings', s);
        return { success: true, export_detail: s.export_detail || false };
    }
    _buttonsConfigSave(body) { const cfg = body.config || body; this.saveModule('buttons_config', cfg); return { success: true, config: cfg }; }
    _exportOrderSave(body) { const order = body.config || body.modules || body; const result = Array.isArray(order) ? { modules: order, customCategories: body.customCategories || {} } : order; this.saveModule('export_order', result); return { success: true, order: result }; }

    // ==================== TXT 导出 ====================
    _getExportDetail() { return (this.getModule('settings').export_detail) || false; }

    _exportAllTxt() {
        const detailed = this._getExportDetail();
        const eo = this.getModule('export_order');
        const def = ['character','currency','inventory','equipment','quests','skills','story','locations','relations','item_library','custom'];
        const order = (Array.isArray(eo) && eo.length > 0) ? eo.filter(i => typeof i === 'string') : def;
        let content = '';
        for (const mod of order) content += this._exportModuleContent(mod, detailed);
        return { success: true, content, filename: '创作工坊数据导出.txt' };
    }

    _exportModuleTxt(module) {
        const detailed = this._getExportDetail();
        const nm = { character:'角色信息',currency:'货币',inventory:'背包物品',equipment:'装备',quests:'任务',skills:'技能',story:'剧情',locations:'地图地点',relations:'人物关系',item_library:'物品库',itemlibrary:'物品库',custom:'自定义数据' };
        return { success: true, content: this._exportModuleContent(module, detailed), filename: (nm[module]||module)+'.txt' };
    }

    _exportCustomCategoryTxt(categoryId) {
        const detailed = this._getExportDetail();
        const cats = this.getModule('custom_categories');
        let catName = categoryId;
        if (cats[categoryId] && typeof cats[categoryId] === 'object') catName = cats[categoryId].name || categoryId;
        return { success: true, content: this._exportCustomDetailed(detailed, categoryId, catName), filename: '自定义数据_'+catName+'.txt' };
    }

    _exportModuleContent(mod, d) {
        switch(mod) {
            case 'character': return this._expChar(d);
            case 'currency': return this._expCur(d);
            case 'inventory': return this._expInv(d);
            case 'equipment': return this._expEq(d);
            case 'quests': return this._expQ(d);
            case 'skills': return this._expSk(d);
            case 'story': return this._expSt(d);
            case 'locations': return this._expLoc(d);
            case 'relations': return this._expRel(d);
            case 'item_library': case 'itemlibrary': return this._expIL(d);
            case 'custom': return this._exportCustomDetailed(d,'','');
            default: return '未知模块: '+mod+'\n';
        }
    }

    _expChar(d) {
        let r='【角色信息】\n'; const ch=this.getModule('character');
        if(ch&&typeof ch==='object'&&Object.keys(ch).length>0){
            r+='名称: '+(ch.name||'未命名角色')+'\n';
            if(d){for(const[k,v]of Object.entries(ch)){if(k==='name')continue;if(typeof v==='string')r+=k+': '+v+'\n';else if(typeof v==='number')r+=k+': '+v+'\n';}}
        }else r+='暂无角色信息\n';
        return r+'\n';
    }
    _expCur(d) {
        let r='【货币】\n'; const cur=this.getModule('currency'); let c=0;
        if(cur&&typeof cur==='object'){for(const[k,v]of Object.entries(cur)){
            let n=k,ic='coin',a=0;
            if(v&&typeof v==='object'){n=v.name||k;if(v.icon)ic=v.icon;if(typeof v.amount==='number')a=v.amount;}
            else if(typeof v==='number')a=v;
            r+=ic+' '+n+': '+a+'\n';c++;
            if(d&&v&&typeof v==='object'&&v.description)r+='  描述: '+v.description+'\n';
        }}
        if(c===0)r+='暂无货币数据\n'; return r+'\n';
    }
    _expInv(d) {
        let r='【背包物品】\n'; const arr=this.inventoryToArray(this.getModule('inventory')); let c=0;
        for(const item of arr){
            r+=(item.icon||'box')+' '+(item.name||'未命名')+' x'+(item.quantity||1)+'\n';c++;
            if(d){if(item.description)r+='  描述: '+item.description+'\n';if(item.category_id)r+='  分类: '+item.category_id+'\n';if(item.type)r+='  类型: '+item.type+'\n';if(item.id)r+='  ID: '+item.id+'\n';}
        }
        if(c===0)r+='背包为空\n'; return r+'\n';
    }
    _expEq(d) {
        let r='【装备】\n'; const eq=this.getModule('equipment'); let c=0;
        if(eq&&typeof eq==='object'){for(const[s,item]of Object.entries(eq)){
            if(!item||typeof item!=='object')continue;
            r+='['+s+'] '+(item.icon||'sword')+' '+(item.name||'未命名装备')+'\n';c++;
            if(d){if(item.description)r+='  描述: '+item.description+'\n';if(item.id)r+='  ID: '+item.id+'\n';}
        }}
        if(c===0)r+='暂无装备\n'; return r+'\n';
    }
    _expSk(d) {
        let r='【技能】\n'; const skills=this.getModule('skills'); let c=0;
        const arr=Array.isArray(skills)?skills:this.objectToArray(skills);
        for(const sk of arr){
            r+=(sk.icon||'spark')+' '+(sk.name||'未命名技能')+'\n';c++;
            if(d){if(sk.description)r+='  描述: '+sk.description+'\n';if(sk.power!==undefined)r+='  威力: '+sk.power+'\n';if(sk.cost!==undefined)r+='  消耗: '+sk.cost+'\n';if(sk.cooldown!==undefined)r+='  冷却: '+sk.cooldown+'\n';if(sk.type)r+='  类型: '+sk.type+'\n';if(sk.id)r+='  ID: '+sk.id+'\n';}
        }
        if(c===0)r+='暂无技能\n'; return r+'\n';
    }
    _expQ(d) {
        let r='【任务】\n'; const q=this.getModule('quests'); let c=0;
        if(Array.isArray(q)){for(const x of q){if(!x||typeof x!=='object')continue;r+=(x.name||'未命名任务')+' ('+(x.status||'未开始')+')\n';c++;if(d){if(x.description)r+='  描述: '+x.description+'\n';if(x.reward)r+='  奖励: '+x.reward+'\n';if(x.id)r+='  ID: '+x.id+'\n';}}}
        if(c===0)r+='暂无任务\n'; return r+'\n';
    }
    _expSt(d) {
        let r='【剧情】\n'; const s=this.getModule('story'); let c=0;
        if(Array.isArray(s)){for(const ch of s){if(!ch||typeof ch!=='object')continue;r+=(ch.title||'未命名章节')+'\n';c++;if(d){if(ch.content){let c2=ch.content;if(c2.length>100)c2=c2.substr(0,100)+'...';r+='  内容: '+c2+'\n';}if(ch.id)r+='  ID: '+ch.id+'\n';}}}
        if(c===0)r+='暂无剧情\n'; return r+'\n';
    }
    _expLoc(d) {
        let r='【地图地点】\n'; const locs=this.getModule('locations'); let c=0;
        if(Array.isArray(locs)){for(const loc of locs){if(!loc||typeof loc!=='object')continue;r+=(loc.icon||'pin')+' '+(loc.name||'未命名地点')+'\n';c++;if(d){if(loc.description)r+='  描述: '+loc.description+'\n';if(loc.id)r+='  ID: '+loc.id+'\n';}}}
        else if(locs&&typeof locs==='object'){for(const[id,loc]of Object.entries(locs)){if(!loc||typeof loc!=='object')continue;r+=(loc.icon||'pin')+' '+(loc.name||'未命名地点')+'\n';c++;if(d){if(loc.description)r+='  描述: '+loc.description+'\n';r+='  ID: '+id+'\n';}}}
        if(c===0)r+='暂无地点\n'; return r+'\n';
    }
    _expRel(d) {
        let r='【人物关系】\n'; const rels=this.getModule('relations'); let c=0;
        if(Array.isArray(rels)){for(const rel of rels){if(!rel||typeof rel!=='object')continue;r+=(rel.from||'?')+' → '+(rel.to||'?')+': '+(rel.type||'关系')+'\n';c++;if(d){if(rel.description)r+='  描述: '+rel.description+'\n';if(rel.id)r+='  ID: '+rel.id+'\n';}}}
        if(c===0)r+='暂无关系\n'; return r+'\n';
    }
    _expIL(d) {
        let r='【物品库】\n'; const lib=this.getModule('item_library'); let c=0;
        if(Array.isArray(lib)){for(const item of lib){if(!item||typeof item!=='object')continue;r+=(item.icon||'box')+' '+(item.name||'未命名');if(item.category_id)r+=' ['+item.category_id+']';r+='\n';c++;if(d){if(item.description)r+='  描述: '+item.description+'\n';if(item.type)r+='  类型: '+item.type+'\n';if(item.id)r+='  ID: '+item.id+'\n';}}}
        else if(lib&&typeof lib==='object'){for(const[id,item]of Object.entries(lib)){if(!item||typeof item!=='object')continue;r+=(item.icon||'box')+' '+(item.name||'未命名')+'\n';c++;if(d){if(item.description)r+='  描述: '+item.description+'\n';r+='  ID: '+id+'\n';}}}
        if(c===0)r+='物品库为空\n'; return r+'\n';
    }
    _exportCustomDetailed(detailed, categoryId, categoryName) {
        let r = categoryId ? '【自定义数据 - '+categoryName+'】\n' : '【自定义数据】\n';
        const items = this.getModule('custom_items'); let c=0;
        const processItem = (key, item) => {
            if(!item||typeof item!=='object')return;
            if(categoryId&&item.category_id!==categoryId)return;
            r+=(item.title||item.name||'未命名')+'\n';c++;
            if(detailed){
                for(const[k,v]of Object.entries(item)){if(k==='title'||k==='name'||k==='category_id')continue;if(typeof v==='string')r+='  '+k+': '+v+'\n';else if(typeof v==='number')r+='  '+k+': '+v+'\n';}
                r+='  ID: '+(item.id||key)+'\n';
            }
        };
        if(items&&typeof items==='object'&&!Array.isArray(items)){for(const[k,item]of Object.entries(items))processItem(k,item);}
        else if(Array.isArray(items)){for(const item of items)processItem('',item);}
        if(c===0)r+='暂无数据\n'; return r+'\n';
    }
}

// 全局单例
const localDataManager = new LocalDataManager();
