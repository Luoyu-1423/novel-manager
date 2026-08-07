// ============================================================
// 小说数据管理器 - 前端主逻辑 (app.js)
// 版本: 3.0.0
// 功能: 包含所有模块的渲染和交互逻辑
// 模块: 角色、货币、背包、装备、任务、技能、剧情标记、伏笔、自定义数据、数据预览
// ============================================================

// 小说数据管理器 - 前端逻辑
let appData = {
    inventory: [],
    equipment: {},
    equipmentSlots: {},
    currency: {},
    currencyTypes: {},
    quests: [],
    skills: [],
    storyMarks: [],
    foreshadowing: [],
    stats: null,
    itemLibrary: [],
    questTemplates: [],
    customCategories: []
};

// ============================================================
// 模块: 初始化与导航
// ============================================================

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    // 自动备份：每天启动时静默备份一次
    if (typeof apiRequest === 'function') {
        apiRequest('/api/backup/auto', 'POST').then(function(r) {
            if (r && r.auto) console.log('[AutoBackup] 已创建自动备份: ' + r.backup);
        }).catch(function() {});
    }
    // 初始化自动备份开关状态
    const toggleEl = document.getElementById('auto-backup-toggle');
    if (toggleEl) toggleEl.checked = localStorage.getItem('auto_backup_enabled') !== 'false';
});

// 自动备份开关
function toggleAutoBackup() {
    const el = document.getElementById('auto-backup-toggle');
    if (!el) return;
    localStorage.setItem('auto_backup_enabled', el.checked ? 'true' : 'false');
    showToast(el.checked ? '已开启自动备份' : '已关闭自动备份', 'success');
}

// API 请求封装 - 使用 localDataManager 替代网络请求
async function apiRequest(url, method = 'GET', data = null) {
    try {
        const result = await localDataManager.handleRequest(url, method, data);
        // 角色模板接口返回对象格式，前端需要数组格式
        if (url === '/api/character/templates' && method === 'GET' && result && !Array.isArray(result)) {
            return Object.entries(result).map(([key, val]) => {
                if (val && typeof val === 'object') return { ...val, id: val.id || key };
                return { id: key, data: val };
            });
        }
        return result;
    } catch (error) {
        console.error('API请求错误:', error);
        showToast('操作失败: ' + error.message, 'error');
        return null;
    }
}
window.apiRequest = apiRequest;

// 拦截 fetch() 调用，将 /api/ 请求路由到 localDataManager
(function() {
    const originalFetch = window.fetch;
    window.fetch = function(input, init) {
        const url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
        if (url.startsWith('/api/')) {
            const method = (init && init.method) || 'GET';
            let body = null;
            if (init && init.body) {
                try { body = JSON.parse(init.body); } catch(e) { body = null; }
            }
            return apiRequest(url, method, body).then(result => {
                return new Response(JSON.stringify(result), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            });
        }
        return originalFetch.call(window, input, init);
    };
})();

function normalizeSkillsResponse(response) {
    if (!response) {
        return [];
    }

    if (Array.isArray(response)) {
        return response;
    }

    if (response.skills) {
        if (Array.isArray(response.skills)) {
            return response.skills;
        }
        if (typeof response.skills === 'object') {
            return Object.entries(response.skills).map(([key, value]) => {
                const skill = Object.assign({}, value || {});
                if (!skill.id) {
                    skill.id = key;
                }
                return skill;
            });
        }
    }

    if (typeof response === 'object') {
        return Object.entries(response).map(([key, value]) => {
            const skill = Object.assign({}, value || {});
            if (!skill.id) {
                skill.id = key;
            }
            return skill;
        });
    }

    return [];
}

function mergeSkills(existing = [], additional = []) {
    const map = {};
    (existing || []).forEach(skill => {
        if (skill && skill.id) {
            map[skill.id] = skill;
        }
    });
    (additional || []).forEach(skill => {
        if (skill && skill.id) {
            map[skill.id] = Object.assign({}, map[skill.id] || {}, skill);
        }
    });
    return Object.values(map);
}

// ============================================================
// 模块: 数据加载
// ============================================================

// 加载所有数据
async function loadData() {
    localDataManager.init();
    try {
        const result = await apiRequest('/api/init');
        if (result && result.success) {
            appData.character = result.character;
            appData.inventory = result.inventory;
            appData.equipment = result.equipment;
            appData.currency = result.currency;
            appData.stats = result.stats;
            
            // 加载装备槽位
            const slotsResult = await apiRequest('/api/equipment/slots');
            if (slotsResult) {
                appData.equipmentSlots = slotsResult;
            }
            
            // 加载货币类型
            const currencyResult = await apiRequest('/api/currency/types');
            if (currencyResult) {
                appData.currencyTypes = currencyResult;
            }
            
            try { renderCharacter(); } catch(e) { console.error('渲染角色失败:', e); }
            try { renderCurrency(); } catch(e) { console.error('渲染货币失败:', e); }
            try { renderInventory(); } catch(e) { console.error('渲染背包失败:', e); }
            try { renderEquipment(); } catch(e) { console.error('渲染装备失败:', e); }
            try {
                renderDataPreview();
            } catch(e) {
                console.error('渲染数据预览失败:', e);
            }
        }
    } catch (e) {
        console.error('加载数据失败:', e);
        // 移除弹窗提示，避免影响使用
        // showToast('数据加载失败', 'error');
    }
    
    // 加载其他模块数据（放在try外面，确保一定会执行）
    try { loadQuests(); } catch(e) { console.error('加载任务失败:', e); }
    try { loadSkills(); } catch(e) { console.error('加载技能失败:', e); }
    try { loadStoryMarks(); } catch(e) { console.error('加载剧情标记失败:', e); }
    try { loadForeshadowing(); } catch(e) { console.error('加载伏笔失败:', e); }
    try { loadItemLibrary(); } catch(e) { console.error('加载物品库失败:', e); }
    
    // 加载物品库分类
    try { if (typeof loadItemCategories === "function") loadItemCategories(); } catch(e) {}
    
    // 加载地图和关系数据（v183功能）
    try { if (typeof loadLocations === "function") loadLocations(); } catch(e) {}
    try { if (typeof loadCharacters === "function") loadCharacters(); } catch(e) {}
    
    // 加载自定义分类
    try { if (typeof loadCustomCategories === "function") loadCustomCategories(); } catch(e) {}
    

}

function renderCharacter() {
    const container = document.getElementById('character-info');
    if (!appData.character) {
        container.innerHTML = '<div class="loading">加载中...</div>';
        return;
    }
    
    const char = appData.character;
    const stats = char.stats || {};
    
    let statsHtml = '';
    for (const [key, value] of Object.entries(stats)) {
        const label = getStatLabel(key);
        // 处理对象类型的值
        let displayValue = value;
        if (typeof value === 'object' && value !== null) {
            displayValue = JSON.stringify(value);
        }
        statsHtml += `
            <div class="character-stat">
                <div class="stat-label">${label}</div>
                <div class="stat-value">${displayValue}</div>
            </div>
        `;
    }
    
    const levelLabel = char.level_label || '等级';

    container.innerHTML = `
        <div class="character-name">${char.name || '未知角色'}</div>
        <span class="character-level">${levelLabel}: ${char.level || 1}</span>
        <div class="character-info">
            ${statsHtml}
        </div>
        <div id="char-linked-terms" style="margin-top:8px;"></div>
    `;
    // 2.2-D 异步填充关联术语 chip
    if (char.linked_terms && char.linked_terms.length > 0) {
        _renderCharLinkedTerms(char.linked_terms);
    }
}

// 渲染角色关联术语 chip（异步：需先加载 glossary）
async function _renderCharLinkedTerms(termIds) {
    const box = document.getElementById('char-linked-terms');
    if (!box) return;
    if (!window.GlossaryModule) return;
    if (typeof window.GlossaryModule.loadData === 'function') {
        try { await window.GlossaryModule.loadData(); } catch(_) {}
    }
    const terms = (typeof window.GlossaryModule.getTermsByIds === 'function')
        ? window.GlossaryModule.getTermsByIds(termIds)
        : [];
    if (terms.length === 0) {
        box.innerHTML = '';
        return;
    }
    let html = '<div style="font-size:12px;color:var(--text-secondary,#6b7280);margin-bottom:4px;">关联术语：</div>';
    html += '<div style="display:flex;gap:6px;flex-wrap:wrap;">';
    terms.forEach(t => {
        html += `<span class="term-chip" onclick="window.GlossaryModule.openTermDetail('${t.id}')" title="点击查看术语详情">${escapeHtml(t.name)}</span>`;
    });
    html += '</div>';
    box.innerHTML = html;
}

function getStatLabel(key) {
    const labels = {
        'attack': '攻击力',
        'defense': '防御力',
        'hp': '生命值',
        'max_hp': '最大生命',
        'mp': '法力值',
        'max_mp': '最大法力',
        'speed': '速度',
        'crit_rate': '暴击率',
        'crit_damage': '暴击伤害'
    };
    return labels[key] || key;
}

// 获取物品类型中文名称
function getItemTypeLabel(type) {
    const labels = {
        'weapon': '武器',
        'armor': '护甲',
        'accessory': '饰品',
        'consumable': '消耗品',
        'material': '材料',
        'quest': '任务物品',
        'other': '其他'
    };
    return labels[type] || type || '未知';
}

// 获取分类名称
function getCategoryName(categoryId) {
    if (!categoryId) return '未分类';
    if (typeof itemCategories !== 'undefined' && itemCategories.length > 0) {
        const cat = itemCategories.find(c => c.id === categoryId);
        if (cat) {
            return (typeof SvgIconLib !== 'undefined' && SvgIconLib.renderAuto ? SvgIconLib.renderAuto(cat.icon || 'folder', 14) : (cat.icon || '📁')) + ' ' + cat.name;
        }
    }
    return categoryId;
}

// ==================== 货币单位格式化 ====================
// 默认中文计数单位
// 货币单位系统 - 支持完整的中文计数单位
const CURRENCY_UNITS_FULL = [
    { value: 1, name: '个' },
    { value: 10, name: '十' },
    { value: 100, name: '百' },
    { value: 1000, name: '千' },
    { value: 10000, name: '万' },
    { value: 100000, name: '十万' },
    { value: 1000000, name: '百万' },
    { value: 10000000, name: '千万' },
    { value: 100000000, name: '亿' },
    { value: 1000000000, name: '十亿' },
    { value: 10000000000, name: '百亿' },
    { value: 100000000000, name: '千亿' },
    { value: 1000000000000, name: '万亿' },
    { value: 10000000000000, name: '十万亿' },
    { value: 100000000000000, name: '百万亿' },
    { value: 1000000000000000, name: '千万亿' },
    { value: 10000000000000000, name: '亿亿' }
];

// 简洁版单位（默认使用）
const CURRENCY_UNITS_SIMPLE = [
    { value: 1, name: '' },
    { value: 10000, name: '万' },
    { value: 100000000, name: '亿' },
    { value: 1000000000000, name: '万亿' },
    { value: 10000000000000000, name: '亿亿' }
];

// 获取当前使用的单位列表
function getCurrencyUnits() {
    // 优先使用用户自定义单位
    const customUnits = localStorage.getItem('currency_units_custom');
    if (customUnits) {
        try {
            const units = JSON.parse(customUnits);
            if (Array.isArray(units) && units.length > 0) {
                return units;
            }
        } catch(e) {}
    }
    
    // 根据设置选择单位模式
    const mode = localStorage.getItem('currency_unit_mode') || 'simple';
    if (mode === 'full') {
        return CURRENCY_UNITS_FULL;
    }
    return CURRENCY_UNITS_SIMPLE;
}

// 默认单位（兼容旧代码）
const DEFAULT_CURRENCY_UNITS = getCurrencyUnits();

// 格式化大数字为带单位的字符串
function formatCurrencyNumber(num, units) {
    if (num === undefined || num === null) return '0';
    num = Number(num);
    if (isNaN(num)) return '0';
    
    const unitList = units || DEFAULT_CURRENCY_UNITS;
    let result = num;
    let unitName = '';
    
    // 找到最合适的单位
    for (let i = unitList.length - 1; i >= 0; i--) {
        if (Math.abs(num) >= unitList[i].value) {
            result = num / unitList[i].value;
            unitName = unitList[i].name;
            break;
        }
    }
    
    // 保留2位小数，去掉末尾的0
    let formatted = result.toFixed(2);
    formatted = formatted.replace(/\.00$/, '');
    formatted = formatted.replace(/(\.\d)0$/, '$1');
    
    return formatted + unitName;
}

// 解析带单位的字符串为数字
function parseCurrencyNumber(str, units) {
    if (!str) return 0;
    str = String(str).trim();
    
    const unitList = units || getCurrencyUnits();
    
    // 尝试匹配单位
    for (let i = unitList.length - 1; i >= 0; i--) {
        if (unitList[i].name && str.endsWith(unitList[i].name)) {
            const numStr = str.slice(0, -unitList[i].name.length);
            const num = parseFloat(numStr);
            if (!isNaN(num)) {
                return Math.round(num * unitList[i].value);
            }
        }
    }
    
    // 没有单位，直接解析
    const num = parseFloat(str);
    return isNaN(num) ? 0 : Math.round(num);
}

// 显示货币单位设置
function showCurrencyUnitSettings() {
    const currentMode = localStorage.getItem('currency_unit_mode') || 'simple';
    
    showModal('货币单位设置', `
        <div class="form-group">
            <label>单位模式</label>
            <select id="currency-unit-mode">
                <option value="simple" ${currentMode === 'simple' ? 'selected' : ''}>简洁模式（万、亿、万亿）</option>
                <option value="full" ${currentMode === 'full' ? 'selected' : ''}>完整模式（个、十、百、千、万...）</option>
            </select>
        </div>
        <div style="margin-top: 12px; padding: 8px; background: #f8fafc; border-radius: 6px; font-size: 12px; color: #6b7280;">
            <p>${(typeof SvgIconLib !== 'undefined' && SvgIconLib.render) ? SvgIconLib.render('lightbulb', 13, '#f59e0b') : '💡'} 提示：</p>
            <p>• 简洁模式：常用的大单位，显示简洁</p>
            <p>• 完整模式：完整的中文计数单位</p>
            <p>• 输入时支持带单位，例如：1.5万、3亿</p>
        </div>
    `, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        { text: '保存', class: 'btn-primary', action: () => {
            const mode = document.getElementById('currency-unit-mode').value;
            localStorage.setItem('currency_unit_mode', mode);
            
            // 重新渲染货币显示
            if (typeof renderCurrency === 'function') {
                renderCurrency();
            }
            if (typeof renderDataPreview === 'function') {
                renderDataPreview();
            }
            
            showToast('设置已保存', 'success');
            closeModal();
        }}
    ]);
}

// ==================== 货币系统 ====================
function renderCurrency() {
    const container = document.getElementById('currency-info');
    if (!appData.currency) {
        container.innerHTML = '<div class="loading">加载中...</div>';
        return;
    }
    
    let html = '<div class="currency-display">';
    
    // 添加单位设置按钮
    html += `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <span style="font-weight: bold; font-size: 16px;">货币</span>
            <button class="btn-small" onclick="showCurrencyUnitSettings()" style="font-size: 12px;">${SvgIconLib.render('settings', 12)} 单位设置</button>
        </div>
    `;
    
    for (const [key, value] of Object.entries(appData.currency)) {
        const typeInfo = appData.currencyTypes[key] || {};
        const icon = SvgIconLib.renderAuto(typeInfo.icon || 'coin', 18);
        const name = typeInfo.name || key;
        
        html += `
            <div class="currency-item" onclick="showCurrencyEdit('${key}')">
                <span class="currency-icon">${icon}</span>
                <span class="currency-value" title="${value}">${formatCurrencyNumber(value)}</span>
                <span class="currency-name">${name}</span>
            </div>
        `;
    }
    
    html += '</div>';
    container.innerHTML = html;
}

function showCurrencyEdit(currencyType) {
    const amount = appData.currency[currencyType] || 0;
    const typeInfo = appData.currencyTypes[currencyType] || {};
    
    showModal(`编辑 ${typeInfo.name || currencyType}`, `
        <div class="form-group">
            <label>数量（可输入带单位的数字，如 1.5万、3亿）</label>
            <input type="text" id="currency-amount" value="${amount}" placeholder="例如: 10000 或 1万">
        </div>
        <div class="form-group">
            <label>名称</label>
            <input type="text" id="currency-name" value="${typeInfo.name || currencyType}">
        </div>
        <div class="form-group">
            <label>图标（支持内置图标名，如 coin / gem / gold）</label>
            <input type="text" id="currency-icon" value="${typeInfo.icon || 'coin'}">
        </div>
    `, [
        { text: '删除', class: 'btn-danger', action: async () => {
            if (!(await UIUtils.confirmDialog('确定要删除货币「' + (typeInfo.name || currencyType) + '」吗？'))) return;
            const result = await apiRequest('/api/currency/types/delete', 'POST', { currency_id: currencyType });
            if (result && result.success) {
                appData.currencyTypes = result.currency_types;
                appData.currency = result.currency;
                renderCurrency();
                showToast('已删除', 'success');
                closeModal();
            } else {
                // 显式反馈失败原因，避免"没反应"
                showToast('删除失败：' + (result && result.error ? result.error : '未知错误'), 'error');
            }
        }},
        { text: '取消', class: 'btn-secondary', action: closeModal },
        { text: '保存', class: 'btn-primary', action: async () => {
            const amountStr = document.getElementById('currency-amount').value;
            const newAmount = parseCurrencyNumber(amountStr);
            const newName = document.getElementById('currency-name').value;
            const newIcon = document.getElementById('currency-icon').value;
            
            // 设置数量
            await apiRequest('/api/currency/set', 'POST', { type: currencyType, amount: newAmount });
            
            // 更新类型信息
            const typeResult = await apiRequest('/api/currency/types/edit', 'POST', {
                currency_id: currencyType,
                name: newName,
                icon: newIcon
            });
            
            if (typeResult && typeResult.success) {
                appData.currencyTypes = typeResult.currency_types;
            }
            
            const currencyResult = await apiRequest('/api/currency');
            if (currencyResult) {
                appData.currency = currencyResult;
            }
            
            renderCurrency();
            showToast('保存成功', 'success');
            closeModal();
        }}
    ]);
}

function showAddCurrencyType() {
    showModal('添加货币类型', `
        <div class="form-group">
            <label>货币ID（英文）</label>
            <input type="text" id="new-currency-id" placeholder="例如: diamond">
        </div>
        <div class="form-group">
            <label>名称</label>
            <input type="text" id="new-currency-name" placeholder="例如: 钻石">
        </div>
        <div class="form-group">
            <label>图标（支持内置图标名，如 coin / gem / gold）</label>
            <input type="text" id="new-currency-icon" value="coin">
        </div>
        <div class="form-group">
            <label>初始数量（可输入带单位的数字，如 1.5万）</label>
            <input type="text" id="new-currency-amount" value="0" placeholder="例如: 10000 或 1万">
        </div>
    `, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        { text: '添加', class: 'btn-primary', action: async () => {
            const currencyId = document.getElementById('new-currency-id').value;
            const currencyName = document.getElementById('new-currency-name').value;
            const currencyIcon = document.getElementById('new-currency-icon').value;
            const amountStr = document.getElementById('new-currency-amount').value;
            const initialAmount = parseCurrencyNumber(amountStr);
            
            if (!currencyId || !currencyName) {
                showToast('请填写ID和名称', 'error');
                return;
            }
            
            const result = await apiRequest('/api/currency/types/add', 'POST', {
                currency_id: currencyId,
                name: currencyName,
                icon: currencyIcon,
                initial_amount: initialAmount
            });
            
            if (result && result.success) {
                appData.currencyTypes = result.currency_types;
                appData.currency = result.currency;
                renderCurrency();
                showToast('添加成功', 'success');
                closeModal();
            } else {
                showToast(result?.message || '添加失败', 'error');
            }
        }}
    ]);
}

// ==================== 背包系统 ====================
function renderInventory() {
    // 更新分类筛选下拉框
    updateInventoryCategoryFilter();
    renderInventoryFiltered();
}

function updateInventoryCategoryFilter() {
    const select = document.getElementById('inventory-category-filter');
    if (!select || !appData.inventory) return;
    const currentVal = select.value;
    // 收集所有分类ID
    const catIds = new Set();
    appData.inventory.forEach(item => { if (item.category_id) catIds.add(item.category_id); });
    let html = '<option value="">全部分类</option>';
    catIds.forEach(catId => {
        const cat = itemCategories.find(c => c.id === catId);
        const name = cat ? (cat.icon + ' ' + cat.name) : catId;
        html += `<option value="${catId}">${name}</option>`;
    });
    select.innerHTML = html;
    select.value = currentVal; // 保持之前的选择
}

function filterInventory() {
    renderInventoryFiltered();
}

function renderInventoryFiltered() {
    const container = document.getElementById('inventory-list');
    if (!appData.inventory || appData.inventory.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">${SvgIconLib.render('backpack', 36)}</div>
                <div>背包空空如也</div>
            </div>
        `;
        return;
    }
    
    // 获取筛选条件
    const searchInput = document.getElementById('inventory-search');
    const catFilter = document.getElementById('inventory-category-filter');
    const searchQuery = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const selectedCat = catFilter ? catFilter.value : '';
    
    // 筛选物品
    const filtered = appData.inventory.filter(item => {
        if (selectedCat && item.category_id !== selectedCat) return false;
        if (searchQuery) {
            const name = (item.name || '').toLowerCase();
            const id = (item.id || '').toLowerCase();
            const desc = (item.description || '').toLowerCase();
            if (!name.includes(searchQuery) && !id.includes(searchQuery) && !desc.includes(searchQuery)) return false;
        }
        return true;
    });
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><div>没有匹配的物品</div></div>';
        return;
    }
    
    let html = '';
    filtered.forEach(item => {
        const icon = SvgIconLib.renderAuto(item.icon, 28);
        // 分类信息
        const cat = item.category_id ? itemCategories.find(c => c.id === item.category_id) : null;
        const catLabel = cat ? (SvgIconLib.renderAuto(cat.icon || 'folder', 12) + ' ' + escapeHtml(cat.name)) : '';
        // 判断是否可装备
        let isEquippable = false;
        if (item.type === 'weapon' || item.type === 'armor' || item.type === 'accessory' || item.equip_slot) {
            isEquippable = true;
        }
        if (!isEquippable && item.bind_module === 'equipment') isEquippable = true;
        if (!isEquippable && item.category_id && typeof itemCategories !== 'undefined' && itemCategories.length > 0) {
            const cat2 = itemCategories.find(c => c.id === item.category_id);
            if (cat2 && cat2.bind_module === 'equipment') isEquippable = true;
        }
        
        html += `
            <div class="item-card${batchSelectedIds.has(item.id) ? ' selected' : ''}" onclick="${batchMode ? `toggleBatchSelect('${item.id}')` : `showItemDetail('${item.id}')`}" draggable="${batchMode ? 'false' : 'true'}" ondragstart="onItemDragStart(event, '${item.id}')" ondragend="onItemDragEnd(event)">
                ${batchMode ? `<input type="checkbox" class="batch-checkbox" id="batch-cb-${item.id}" data-item-id="${item.id}" ${batchSelectedIds.has(item.id) ? 'checked' : ''} onclick="event.stopPropagation(); toggleBatchSelect('${item.id}')" style="position:absolute;top:4px;left:4px;z-index:2;">` : ''}
                <div class="item-icon">${icon}</div>
                <div class="item-name">${escapeHtml(item.name)}${renderIdBadge(item.id)}</div>
                <div class="item-quantity">x${item.quantity || 1}</div>
                ${catLabel ? `<div style="font-size:10px;color:var(--text-secondary);margin-top:2px;">${catLabel}</div>` : ''}
                ${isEquippable && !batchMode ? `<div class="item-quick-action" onclick="event.stopPropagation(); equipItem('${item.id}')" title="装备" style="position:absolute;top:4px;right:4px;background:color-mix(in srgb, var(--primary-color) 90%, #fff);color:#fff;border-radius:4px;padding:2px 6px;font-size:11px;cursor:pointer;z-index:1;">${SvgIconLib.render('sword', 11)}</div>` : ''}
            </div>
        `;
    });
    container.innerHTML = html;
}

// ==================== 批量操作 ====================
let batchMode = false;
let batchSelectedIds = new Set();

function toggleBatchMode() {
    batchMode = !batchMode;
    batchSelectedIds.clear();
    const bar = document.getElementById('batch-action-bar');
    const btn = document.getElementById('btn-batch-mode');
    if (bar) bar.style.display = batchMode ? 'flex' : 'none';
    if (btn) btn.classList.toggle('active', batchMode);
    renderInventoryFiltered();
}

function toggleBatchSelect(itemId) {
    if (batchSelectedIds.has(itemId)) {
        batchSelectedIds.delete(itemId);
    } else {
        batchSelectedIds.add(itemId);
    }
    updateBatchCount();
    // 更新复选框状态
    const cb = document.getElementById('batch-cb-' + itemId);
    if (cb) cb.checked = batchSelectedIds.has(itemId);
}

function batchSelectAll() {
    const checkboxes = document.querySelectorAll('.batch-checkbox');
    batchSelectedIds.clear();
    checkboxes.forEach(cb => {
        cb.checked = true;
        batchSelectedIds.add(cb.dataset.itemId);
    });
    updateBatchCount();
}

function updateBatchCount() {
    const el = document.getElementById('batch-selected-count');
    if (el) el.textContent = '已选择 ' + batchSelectedIds.size + ' 件';
}

async function batchDeleteItems() {
    if (batchSelectedIds.size === 0) { showToast('请先选择物品', 'error'); return; }
    if (!(await UIUtils.confirmDialog('确定删除选中的 ' + batchSelectedIds.size + ' 件物品吗？'))) return;
    
    let deleted = 0;
    for (const itemId of batchSelectedIds) {
        const result = await apiRequest('/api/inventory/remove', 'POST', { item_id: itemId });
        if (result && result.success) {
            appData.inventory = Array.isArray(result.inventory) ? result.inventory : [];
            deleted++;
        }
    }
    batchSelectedIds.clear();
    renderInventory();
    showToast('已删除 ' + deleted + ' 件物品', 'success');
    if (deleted > 0) toggleBatchMode();
}

// ==================== 拖拽装备 ====================
let draggedItemId = null;

function onItemDragStart(event, itemId) {
    draggedItemId = itemId;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', itemId);
    event.target.style.opacity = '0.5';
}

function onItemDragEnd(event) {
    event.target.style.opacity = '1';
    draggedItemId = null;
    // 清除所有槽位高亮
    document.querySelectorAll('.equipment-slot').forEach(el => el.classList.remove('drag-over'));
}

function onSlotDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    event.currentTarget.classList.add('drag-over');
}

function onSlotDragLeave(event) {
    event.currentTarget.classList.remove('drag-over');
}

async function onSlotDrop(event, slotId) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');
    const itemId = event.dataTransfer.getData('text/plain');
    if (!itemId) return;
    
    const result = await apiRequest('/api/equipment/equip', 'POST', {
        slot: slotId,
        item_id: itemId
    });
    if (result && result.success) {
        appData.inventory = result.inventory;
        appData.equipment = result.equipment;
        renderInventory();
        renderEquipment();
        showToast('装备成功', 'success');
    } else {
        showToast(result?.message || '装备失败', 'error');
    }
}

function showItemDetail(itemId) {
    const item = appData.inventory.find(i => i.id === itemId);
    if (!item) return;
    
    let actions = [];
    
    // 判断是否可装备：检查type、equip_slot、bind_module、分类绑定
    let isEquippable = false;
    if (item.type === 'weapon' || item.type === 'armor' || item.type === 'accessory' || item.equip_slot) {
        isEquippable = true;
    }
    if (!isEquippable && item.bind_module === 'equipment') {
        isEquippable = true;
    }
    if (!isEquippable && item.category_id && typeof itemCategories !== 'undefined' && itemCategories.length > 0) {
        const cat = itemCategories.find(c => c.id === item.category_id);
        if (cat && cat.bind_module === 'equipment') isEquippable = true;
    }
    
    if (isEquippable) {
        actions.push({
            text: '装备',
            class: 'btn-primary',
            action: async () => {
                await equipItem(itemId);
                closeModal();
            }
        });
    }
    // 技能物品显示学习按钮（宽松判断，确保能显示）
    let isSkillItem = false;
    
    // 1. 优先判断bind_module（最可靠）
    if (item.bind_module === 'skills' || item.bind_module === 'skill') {
        isSkillItem = true;
    }
    
    // 2. 判断类型字段
    if (!isSkillItem && (item.type === 'skill' || item.is_skill || item.item_type === 'skill')) {
        isSkillItem = true;
    }
    
    // 3. 通过分类判断（分类数据已加载时）
    if (!isSkillItem && item.category_id && typeof itemCategories !== 'undefined' && itemCategories.length > 0) {
        const cat = itemCategories.find(c => c.id === item.category_id);
        if (cat) {
            // 判断bind_module
            if (cat.bind_module === 'skills' || cat.bind_module === 'skill') {
                isSkillItem = true;
            }
            // 判断分类名称
            if (!isSkillItem && cat.name && (cat.name.includes('技能') || cat.name.includes('skill'))) {
                isSkillItem = true;
            }
        }
    }
    
    // 4. 兜底：物品名称包含"技能"或"skill"
    if (!isSkillItem && item.name) {
        const name = item.name.toLowerCase();
        if (name.includes('技能') || name.includes('skill')) {
            isSkillItem = true;
        }
    }
    
    // 5. 最终兜底：只要有分类就尝试判断（防止分类数据没加载的情况）
    // （这里不做处理，靠前面的判断）
    
    if (isSkillItem) {
        actions.push({
            text: `${SvgIconLib.render('spark', 12)} 学习技能`,
            class: 'btn-primary',
            action: async () => {
                try {
                    await learnSkillFromItem(itemId);
                } catch(e) {
                    console.error('学习技能出错:', e);
                    showToast('学习出错: ' + e.message, 'error');
                }
                closeModal();
            }
        });
    }
    
    
    actions.push({
        text: '编辑',
        class: 'btn-secondary',
        action: () => {
            showEditItem(itemId);
        }
    });
    
    // 创建变体按钮
    actions.push({
        text: `${SvgIconLib.render('refresh', 12)} 变体`,
        class: 'btn-secondary',
        action: () => {
            closeModal();
            setTimeout(() => createItemVariant(itemId), 300);
        }
    });
    
    // 变体对比按钮（仅当存在多个变体时显示）
    const baseId = itemId.replace(/_[a-zA-Z0-9]{2,6}$/, '');
    const variants = appData.inventory.filter(i => {
        const iBase = i.id.replace(/_[a-zA-Z0-9]{2,6}$/, '');
        return iBase === baseId;
    });
    if (variants.length > 1) {
        actions.push({
            text: `${SvgIconLib.render('chart', 12)} 对比(` + variants.length + ')',
            class: 'btn-secondary',
            action: () => {
                closeModal();
                setTimeout(() => compareVariants(baseId), 300);
            }
        });
    }
    
    // 快速备注按钮
    actions.push({
        text: `${SvgIconLib.render('edit', 12)} 备注`,
        class: 'btn-secondary',
        action: () => {
            showQuickNote(itemId);
        }
    });
    
    actions.push({
        text: '删除',
        class: 'btn-danger',
        action: async () => {
            if (await UIUtils.confirmDialog('确定删除这个物品吗？')) {
                const result = await apiRequest('/api/inventory/remove', 'POST', { item_id: itemId });
                if (result && result.success) {
                    appData.inventory = Array.isArray(result.inventory) ? result.inventory : [];
                    renderInventory();
                    showToast('已删除', 'success');
                    closeModal();
                } else {
                    showToast('删除失败：' + (result && result.error ? result.error : '未知错误'), 'error');
                }
            }
        }
    });
    
    actions.push({ text: '关闭', class: 'btn-secondary', action: closeModal });
    
    let statsHtml = '';
    if (item.stats && Object.keys(item.stats).length > 0) {
        statsHtml = '<p><strong>属性:</strong></p><ul>';
        for (const [key, value] of Object.entries(item.stats)) {
            statsHtml += `<li>${getStatLabel(key)}: +${value}</li>`;
        }
        statsHtml += '</ul>';
    }
    
    showModal(item.name, `
        <div style="text-align: center; margin-bottom: 16px;">
            <div style="font-size: 48px;">${SvgIconLib.renderAuto(item.icon, 48)}</div>
        </div>
        <p style="margin-bottom:8px;"><strong>ID:</strong> <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 12px;">${item.id}</code></p>
        <p style="color: #64748b; margin-bottom: 12px;">${item.description || '暂无描述'}</p>
        <p><strong>类型:</strong> ${getItemTypeLabel(item.type)}</p>
        <p><strong>数量:</strong> ${item.quantity || 1}</p>
        ${item.equip_slot ? `<p><strong>装备槽位:</strong> ${item.equip_slot}</p>` : ''}
        ${statsHtml}
    `, actions);
}

// 创建物品变体（背包物品）
async function createItemVariant(itemId) {
    const item = appData.inventory.find(i => i.id === itemId);
    if (!item) return;
    
    // 生成变体ID：基础ID + _NNN
    const baseId = item.id.replace(/_[a-zA-Z0-9]{2,6}$/, '');
    let variantNum = 1;
    const existingIds = appData.inventory.map(i => i.id);
    while (existingIds.includes(baseId + '_' + String(variantNum).padStart(3, '0'))) {
        variantNum++;
    }
    const variantId = baseId + '_' + String(variantNum).padStart(3, '0');
    
    showModal('创建变体', `
        <p>将基于 <strong>${item.name}</strong> 创建变体</p>
        <p style="color:#64748b;font-size:12px;">变体ID: ${variantId}</p>
        <div class="form-group">
            <label>变体名称（留空则保持原名）</label>
            <input type="text" id="variant-name" placeholder="${item.name}">
        </div>
        <div class="form-group">
            <label>变体备注</label>
            <textarea id="variant-note" rows="2" placeholder="说明这个变体的状态/改造内容"></textarea>
        </div>
    `, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        { text: '创建', class: 'btn-primary', action: async () => {
            const newName = document.getElementById('variant-name').value || item.name;
            const note = document.getElementById('variant-note').value || '';
            const variantData = {
                ...item,
                id: variantId,
                name: newName,
                description: note || item.description || '',
                quantity: 1
            };
            const result = await apiRequest('/api/inventory/add-custom', 'POST', variantData);
            if (result && result.success) {
                appData.inventory = result.inventory;
                renderInventory();
                showToast('变体创建成功', 'success');
                closeModal();
            } else {
                showToast(result?.message || '创建失败', 'error');
            }
        }}
    ]);
}

// 快速备注功能
async function showQuickNote(itemId) {
    const item = appData.inventory.find(i => i.id === itemId);
    if (!item) return;
    
    showModal('快速备注 - ' + item.name, `
        <div style="text-align:center;margin-bottom:12px;font-size:36px;">${SvgIconLib.renderAuto(item.icon, 36)}</div>
        <div class="form-group">
            <label>备注内容</label>
            <textarea id="quick-note-text" rows="4" placeholder="输入备注...">${item.description || ''}</textarea>
        </div>
    `, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        { text: '保存', class: 'btn-primary', action: async () => {
            const note = document.getElementById('quick-note-text').value;
            const result = await apiRequest('/api/inventory/edit', 'POST', {
                item_id: itemId,
                description: note
            });
            if (result && result.success) {
                appData.inventory = result.inventory;
                renderInventory();
                showToast('备注已保存', 'success');
                closeModal();
            }
        }}
    ]);
}

// 变体对比功能
function compareVariants(baseId) {
    const variants = appData.inventory.filter(i => {
        const iBase = i.id.replace(/_[a-zA-Z0-9]{2,6}$/, '');
        return iBase === baseId;
    });
    
    if (variants.length === 0) return;
    
    // 收集所有属性键
    const allStatKeys = new Set();
    variants.forEach(v => {
        if (v.stats) Object.keys(v.stats).forEach(k => allStatKeys.add(k));
    });
    
    // 构建对比表格
    let html = '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;">';
    html += '<tr style="background:#f1f5f9;"><th style="padding:8px;text-align:left;border-bottom:2px solid #e2e8f0;">属性</th>';
    variants.forEach(v => {
        html += `<th style="padding:8px;text-align:center;border-bottom:2px solid #e2e8f0;">${SvgIconLib.renderAuto(v.icon, 20)} ${v.name || '未命名'}<br><span style="font-size:10px;color:#94a3b8;">${v.id}</span></th>`;
    });
    html += '</tr>';
    
    // 基础属性行
    const fields = [
        ['数量', v => v.quantity || 1],
        ['类型', v => getItemTypeLabel(v.type)],
        ['装备槽', v => v.equip_slot || '-'],
        ['描述', v => v.description || '-']
    ];
    
    fields.forEach(([label, getter]) => {
        html += `<tr><td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;font-weight:500;">${label}</td>`;
        variants.forEach(v => {
            html += `<td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;text-align:center;">${getter(v)}</td>`;
        });
        html += '</tr>';
    });
    
    // 属性加成行
    allStatKeys.forEach(key => {
        html += `<tr><td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;font-weight:500;">${getStatLabel(key)}</td>`;
        variants.forEach(v => {
            const val = v.stats && v.stats[key] ? '+' + v.stats[key] : '-';
            html += `<td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;text-align:center;color:${v.stats && v.stats[key] ? '#10b981' : '#94a3b8'};">${val}</td>`;
        });
        html += '</tr>';
    });
    
    html += '</table></div>';
    
    showModal('变体对比 (' + variants.length + '个)', html, [
        { text: '关闭', class: 'btn-secondary', action: closeModal }
    ]);
}

function showEditItem(itemId) {
    const item = appData.inventory.find(i => i.id === itemId);
    if (!item) return;
    
    const statsJson = item.stats ? JSON.stringify(item.stats, null, 2) : '{}';
    
    showModal(`编辑 ${item.name} (ID: ${item.id})`, `
        <div class="form-group">
            <label>名称</label>
            <input type="text" id="edit-item-name" value="${item.name || ''}">
        </div>
        <div class="form-group">
            <label>图标（SVG key 或 emoji）</label>
            <input type="text" id="edit-item-icon" value="${item.icon || 'box'}">
        </div>
        <div class="form-group">
            <label>类型（不可修改）</label>
            <div style="padding: 8px 12px; background: var(--bg-color); border-radius: 6px; color: var(--text-secondary);">
                ${getItemTypeLabel(item.type)}
            </div>
        </div>
        <div class="form-group">
            <label>数量</label>
            <input type="number" id="edit-item-quantity" value="${item.quantity || 1}" min="1">
        </div>
        <div class="form-group">
            <label>装备槽位（可选）</label>
            <input type="text" id="edit-item-slot" value="${item.equip_slot || ''}" placeholder="例如: weapon">
        </div>
        <div class="form-group">
            <label>描述</label>
            <textarea id="edit-item-desc" rows="2">${item.description || ''}</textarea>
        </div>
        <div class="form-group">
            <label>属性加成（JSON格式）</label>
            <textarea id="edit-item-stats" rows="3">${statsJson}</textarea>
        </div>
    `, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        { text: '保存', class: 'btn-primary', action: async () => {
            const name = document.getElementById('edit-item-name').value;
            const icon = document.getElementById('edit-item-icon').value;
            const itemType = item.type;  // 类型不可修改，使用原类型
            const quantity = parseInt(document.getElementById('edit-item-quantity').value);
            const equipSlot = document.getElementById('edit-item-slot').value || null;
            const description = document.getElementById('edit-item-desc').value;
            
            let stats = {};
            try {
                stats = JSON.parse(document.getElementById('edit-item-stats').value);
            } catch (e) {
                showToast('属性JSON格式错误', 'error');
                return;
            }
            
            const result = await apiRequest('/api/inventory/edit', 'POST', {
                item_id: itemId,
                name, icon, type: itemType, quantity,
                equip_slot: equipSlot,
                description, stats
            });
            
            if (result && result.success) {
                appData.inventory = result.inventory;
                renderInventory();
                showToast('保存成功', 'success');
                closeModal();
            }
        }}
    ]);
}

async function showAddItem() {
    // 确保物品库数据已加载
    if (!appData.itemLibrary || appData.itemLibrary.length === 0) {
        const result = await apiRequest('/api/items/library');
        if (result) {
            appData.itemLibrary = result;
        }
    }
    
    if (!appData.itemLibrary || appData.itemLibrary.length === 0) {
        showToast('物品库为空，请先在物品库中添加物品', 'error');
        return;
    }
    
    // 生成物品库列表
    let itemsHtml = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 12px; max-height: 400px; overflow-y: auto;">';
    
    appData.itemLibrary.forEach(item => {
        const icon = SvgIconLib.renderAuto(item.icon, 28);
        const name = item.name || '未命名';
        const type = getItemTypeLabel(item.type);
        itemsHtml += `
            <div class="item-card" onclick="addItemFromLibrary('${item.id}')" style="cursor: pointer;">
                <div class="item-icon">${icon}</div>
                <div class="item-name">${name}</div>
                <div class="item-type">${type}</div>
            </div>
        `;
    });
    
    itemsHtml += '</div>';
    
    showModal('从物品库添加', itemsHtml, [
        { text: '关闭', class: 'btn-secondary', action: closeModal }
    ]);
}

// 从物品库添加物品到背包 - 显示数量选择弹窗
async function addItemFromLibrary(itemId) {
    const item = appData.itemLibrary.find(i => i.id === itemId);
    if (!item) return;
    
    const iconHtml = SvgIconLib.renderAuto(item.icon, 36);
    const name = item.name || '未命名';
    const desc = item.description || '';
    
    showModal('添加 ' + iconHtml + ' ' + name, `
        <div style="text-align:center;margin-bottom:16px;">
            <span style="font-size:36px;">${iconHtml}</span>
            <p style="margin-top:8px;font-weight:600;">${name}</p>
            ${desc ? `<p style="font-size:12px;color:#6b7280;margin-top:4px;">${desc.substring(0, 80)}</p>` : ''}
        </div>
        <div class="form-group">
            <label>添加数量</label>
            <div style="display:flex;align-items:center;gap:8px;">
                <button class="btn-small" onclick="document.getElementById('lib-add-qty').value=Math.max(1,parseInt(document.getElementById('lib-add-qty').value||1)-1)">-</button>
                <input type="number" id="lib-add-qty" value="1" min="1" max="999" style="width:80px;text-align:center;font-size:16px;padding:8px;border:1px solid var(--border-color);border-radius:6px;">
                <button class="btn-small" onclick="document.getElementById('lib-add-qty').value=parseInt(document.getElementById('lib-add-qty').value||0)+1">+</button>
            </div>
        </div>
    `, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        { text: '添加到背包', class: 'btn-primary', action: async () => {
            const qtyEl = document.getElementById('lib-add-qty');
            const qty = parseInt(qtyEl ? qtyEl.value : 1);
            if (isNaN(qty) || qty < 1) { showToast('请输入有效的数量', 'error'); return; }
            const result = await apiRequest('/api/inventory/add', 'POST', { item_id: itemId, quantity: qty });
            if (result && result.success) {
                appData.inventory = result.inventory;
                renderInventory();
                showToast(`已添加 ${name} x${qty}`, 'success');
                closeModal();
            } else {
                showToast(result?.message || '添加失败', 'error');
            }
        }}
    ]);
}

function switchAddItemMode(mode) {
    document.getElementById('btn-mode-custom').classList.toggle('active', mode === 'custom');
    document.getElementById('btn-mode-library').classList.toggle('active', mode === 'library');
    document.getElementById('add-item-custom').style.display = mode === 'custom' ? 'block' : 'none';
    document.getElementById('add-item-library').style.display = mode === 'library' ? 'block' : 'none';
}

async function loadItemLibrary() {
    if (appData.itemLibrary.length === 0) {
        const result = await apiRequest('/api/items/library');
        if (result) {
            appData.itemLibrary = result;
        }
    }
    
    const select = document.getElementById('library-item-select');
    if (select) {
        select.innerHTML = '';
        appData.itemLibrary.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = item.name;
            select.appendChild(option);
        });
    }
    
    // 渲染物品库列表
    if (typeof renderItemLibrary === "function") {
        renderItemLibrary();
    }
}

// ==================== 装备系统 ====================
function renderEquipment() {
    const container = document.getElementById('equipment-grid');
    if (!appData.equipment || !appData.equipmentSlots) {
        container.innerHTML = '<div class="loading">加载中...</div>';
        return;
    }
    
    let html = '';
    
    // 拖拽提示
    if (appData.inventory && appData.inventory.length > 0) {
        html += `<div style="text-align:center;font-size:11px;color:#94a3b8;margin-bottom:8px;">${(typeof SvgIconLib !== 'undefined' && SvgIconLib.render) ? SvgIconLib.render('lightbulb', 12, '#f59e0b') : '💡'} 可从背包拖拽物品到槽位进行装备</div>`;
    }
    
    // 添加槽位管理按钮
    html += `
        <div class="equipment-slot add-slot" onclick="showSlotManager()">
            <div class="slot-name">管理</div>
            <div class="slot-icon">${SvgIconLib.render('settings', 18)}</div>
            <div class="slot-item" style="color: #6366f1; font-size: 12px;">槽位设置</div>
        </div>
    `;
    
    for (const [slotId, slotInfo] of Object.entries(appData.equipmentSlots)) {
        const item = appData.equipment[slotId];
        if (item) {
            html += `
                <div class="equipment-slot equipped" onclick="showSlotOptions('${slotId}')" ondragover="onSlotDragOver(event)" ondragleave="onSlotDragLeave(event)" ondrop="onSlotDrop(event, '${slotId}')">
                    <div class="slot-name">${slotInfo.name || slotId}</div>
                    <div class="slot-icon">${SvgIconLib.renderAuto(item.icon || slotInfo.icon, 32)}</div>
                    <div class="slot-item">${item.name}</div>
                </div>
            `;
        } else {
            // 计算可装备到该槽位的物品数量
            const eqCount = appData.inventory.filter(item => {
                if (item.equip_slot === slotId) return true;
                if (item.category_id && item.category_id === slotId) return true;
                if (item.bind_module === 'equipment') return true;
                if (item.category_id && typeof itemCategories !== 'undefined' && itemCategories.length > 0) {
                    const cat = itemCategories.find(c => c.id === item.category_id);
                    if (cat && cat.bind_module === 'equipment') return true;
                }
                return false;
            }).length;
            const countBadge = eqCount > 0 ? `<div style="color: #10b981; font-size: 11px; margin-top: 2px;">${eqCount}件可装备</div>` : '';
            html += `
                <div class="equipment-slot" onclick="showEquipSelect('${slotId}')" ondragover="onSlotDragOver(event)" ondragleave="onSlotDragLeave(event)" ondrop="onSlotDrop(event, '${slotId}')">
                    <div class="slot-name">${slotInfo.name || slotId}</div>
                    <div class="slot-icon">${SvgIconLib.renderAuto(slotInfo.icon, 32)}</div>
                    <div class="slot-item" style="color: #94a3b8; font-size: 12px;">空</div>
                    ${countBadge}
                </div>
            `;
        }
    }
    
    container.innerHTML = html;
}

function showSlotOptions(slotId) {
    const slotInfo = appData.equipmentSlots[slotId] || {};
    const item = appData.equipment[slotId];
    
    showModal(slotInfo.name || slotId, `
        <div style="text-align: center; margin-bottom: 16px;">
            <div style="font-size: 48px;">${SvgIconLib.renderAuto(item?.icon || slotInfo.icon, 48)}</div>
            <div style="font-size: 18px; font-weight: 500; margin-top: 8px;">${item?.name || '空'}</div>
        </div>
        ${item?.description ? `<p style="color: #64748b; margin-bottom: 12px;">${item.description}</p>` : ''}
    `, [
        { text: '卸下', class: 'btn-secondary', action: async () => {
            await unequipItem(slotId);
            closeModal();
        }},
        { text: '更换装备', class: 'btn-primary', action: () => {
            closeModal();
            showEquipSelect(slotId);
        }},
        { text: '编辑槽位', class: 'btn-secondary', action: () => {
            closeModal();
            showEditSlot(slotId);
        }},
        { text: '关闭', class: 'btn-secondary', action: closeModal }
    ]);
}

function showEquipSelect(slotId) {
    const slotInfo = appData.equipmentSlots[slotId] || {};
    
    // 筛选可以装备到这个槽位的物品
    // 匹配规则：equip_slot直接匹配、分类ID匹配、bind_module匹配、名称匹配
    const equippableItems = appData.inventory.filter(item => {
        // 直接匹配：物品的 equip_slot 字段等于槽位ID
        if (item.equip_slot === slotId) return true;
        
        // 分类匹配：物品的 category_id 等于槽位ID
        if (item.category_id && item.category_id === slotId) return true;
        
        // 绑定模块匹配：物品分类绑定了装备模块
        if (item.bind_module === 'equipment') return true;
        
        // 分类绑定匹配：检查物品分类是否绑定了装备模块
        if (item.category_id && typeof itemCategories !== 'undefined' && Array.isArray(itemCategories)) {
            const cat = itemCategories.find(c => c.id === item.category_id);
            if (cat && cat.bind_module === 'equipment') return true;
        }
        
        // 兼容旧数据：匹配槽位名称
        if (slotInfo.name && item.name && item.name.includes(slotInfo.name)) return true;
        
        return false;
    });
    
    // 如果没有匹配的物品，显示所有物品供选择
    const displayItems = equippableItems.length > 0 ? equippableItems : appData.inventory;
    const isFallback = equippableItems.length === 0;
    
    let itemsHtml = '<div style="max-height: 300px; overflow-y: auto;">';
    if (isFallback) {
        itemsHtml += '<div style="text-align: center; color: #f59e0b; padding: 8px; font-size: 12px;">没有匹配的物品，显示全部背包物品</div>';
    }
    displayItems.forEach(item => {
        itemsHtml += `
            <div style="padding: 12px; border-bottom: 1px solid #e2e8f0; cursor: pointer; display: flex; align-items: center; gap: 12px;" 
                 onclick="doEquip('${item.id}', '${slotId}')">
                <span style="font-size: 24px;">${SvgIconLib.renderAuto(item.icon, 24)}</span>
                <div>
                    <div style="font-weight: 500;">${item.name}</div>
                    <div style="font-size: 12px; color: #64748b;">x${item.quantity || 1}</div>
                </div>
            </div>
        `;
    });
    itemsHtml += '</div>';
    
    showModal(`装备 - ${slotInfo.name || slotId}`, itemsHtml, [
        { text: '取消', class: 'btn-secondary', action: closeModal }
    ]);
}

// 装备物品（从背包物品详情调用，自动推断槽位）
async function equipItem(itemId) {
    const item = appData.inventory.find(i => i.id === itemId);
    if (!item) {
        showToast('物品不存在');
        return;
    }
    
    // 推断装备槽位
    let slotId = item.equip_slot;
    
    // 如果没有指定槽位，让用户选择
    if (!slotId) {
        // 显示槽位选择
        const slotKeys = Object.keys(appData.equipmentSlots);
        if (slotKeys.length === 0) {
            showToast('请先添加装备槽位');
            return;
        }
        // 直接显示装备选择界面，让用户选择装备到哪个槽位
        showEquipSelectForItem(itemId);
        return;
    }
    
    await doEquip(itemId, slotId);
}


// 为物品显示所有槽位供选择
function showEquipSelectForItem(itemId) {
    const item = appData.inventory.find(i => i.id === itemId);
    if (!item) return;
    
    let slotsHtml = '<div style="max-height: 300px; overflow-y: auto;">';
    const slotKeys = Object.keys(appData.equipmentSlots);
    
    if (slotKeys.length === 0) {
        slotsHtml = '<div style="text-align: center; color: #64748b; padding: 20px;">暂无槽位，请先在装备页面添加槽位</div>';
    } else {
        slotKeys.forEach(slotId => {
            const slotInfo = appData.equipmentSlots[slotId] || {};
            slotsHtml += `
                <div style="padding: 12px; border-bottom: 1px solid #e2e8f0; cursor: pointer; display: flex; align-items: center; gap: 12px;" 
                     onclick="doEquip('${itemId}', '${slotId}')">
                    <span style="font-size: 24px;">${SvgIconLib.renderAuto(slotInfo.icon, 24)}</span>
                    <div>
                        <div style="font-weight: 500;">${slotInfo.name || slotId}</div>
                        <div style="font-size: 12px; color: #64748b;">装备到这个槽位</div>
                    </div>
                </div>
            `;
        });
        slotsHtml += '</div>';
    }
    
    showModal(`选择装备槽位 - ${item.name}`, slotsHtml, [
        { text: '取消', class: 'btn-secondary', action: closeModal }
    ]);
}

async function doEquip(itemId, slotId) {
    const result = await apiRequest('/api/equipment/equip', 'POST', { 
        item_id: itemId,
        slot: slotId
    });
    if (result && result.success) {
        appData.equipment = result.equipment;
        appData.inventory = result.inventory;
        appData.character = result.character;
        renderEquipment();
        renderInventory();
        renderCharacter();
        showToast('装备成功', 'success');
        closeModal();
    }
}

async function unequipItem(slot) {
    const result = await apiRequest('/api/equipment/unequip', 'POST', { slot });
    if (result && result.success) {
        appData.equipment = result.equipment;
        appData.inventory = result.inventory;
        appData.character = result.character;
        renderEquipment();
        renderInventory();
        renderCharacter();
        showToast('已卸下装备', 'success');
    }
}

function showSlotManager() {
    let slotsHtml = '<div style="max-height: 300px; overflow-y: auto;">';
    
    for (const [slotId, slotInfo] of Object.entries(appData.equipmentSlots)) {
        slotsHtml += `
            <div style="padding: 12px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 24px;">${SvgIconLib.renderAuto(slotInfo.icon, 24)}</span>
                    <div>
                        <div style="font-weight: 500;">${slotInfo.name || slotId}</div>
                        <div style="font-size: 12px; color: #64748b;">${slotId}</div>
                    </div>
                </div>
                <button class="btn-small" onclick="showEditSlot('${slotId}')">编辑</button>
            </div>
        `;
    }
    
    slotsHtml += '</div>';
    
    showModal('装备槽位管理', slotsHtml, [
        { text: '添加槽位', class: 'btn-primary', action: () => {
            closeModal();
            showAddSlot();
        }},
        { text: '关闭', class: 'btn-secondary', action: closeModal }
    ]);
}

function showAddSlot() {
    showModal('添加装备槽位', `
        <div class="form-group">
            <label>槽位ID（英文）</label>
            <input type="text" id="new-slot-id" placeholder="例如: necklace">
        </div>
        <div class="form-group">
            <label>名称</label>
            <input type="text" id="new-slot-name" placeholder="例如: 项链">
        </div>
        <div class="form-group">
            <label>图标（SVG key 或 emoji）</label>
            <input type="text" id="new-slot-icon" value="necklace">
        </div>
    `, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        { text: '添加', class: 'btn-primary', action: async () => {
            const slotId = document.getElementById('new-slot-id').value;
            const slotName = document.getElementById('new-slot-name').value;
            const slotIcon = document.getElementById('new-slot-icon').value;
            
            if (!slotId || !slotName) {
                showToast('请填写ID和名称', 'error');
                return;
            }
            
            const result = await apiRequest('/api/equipment/slots/add', 'POST', {
                slot_id: slotId,
                name: slotName,
                icon: slotIcon
            });
            
            if (result && result.success) {
                appData.equipmentSlots = result.slots;
                renderEquipment();
                showToast('添加成功', 'success');
                closeModal();
            } else {
                showToast(result?.message || '添加失败', 'error');
            }
        }}
    ]);
}

function showEditSlot(slotId) {
    const slotInfo = appData.equipmentSlots[slotId] || {};
    
    showModal(`编辑槽位 - ${slotInfo.name || slotId}`, `
        <div class="form-group">
            <label>名称</label>
            <input type="text" id="edit-slot-name" value="${slotInfo.name || ''}">
        </div>
        <div class="form-group">
            <label>图标（SVG key 或 emoji）</label>
            <input type="text" id="edit-slot-icon" value="${slotInfo.icon || 'box'}">
        </div>
    `, [
        { text: '删除', class: 'btn-danger', action: async () => {
                const result = await apiRequest('/api/equipment/slots/delete', 'POST', { slot_id: slotId });
                if (result && result.success) {
                    appData.equipmentSlots = result.slots;
                    appData.equipment = result.equipment;
                    appData.inventory = result.inventory;
                    renderEquipment();
                    renderInventory();
                    showToast('已删除', 'success');
                    closeModal();
                    // 重新打开槽位管理弹窗，显示更新后的列表
                    setTimeout(() => showSlotManager(), 300);
                }
        }},
        { text: '取消', class: 'btn-secondary', action: closeModal },
        { text: '保存', class: 'btn-primary', action: async () => {
            const name = document.getElementById('edit-slot-name').value;
            const icon = document.getElementById('edit-slot-icon').value;
            
            const result = await apiRequest('/api/equipment/slots/edit', 'POST', {
                slot_id: slotId,
                name, icon
            });
            
            if (result && result.success) {
                appData.equipmentSlots = result.slots;
                renderEquipment();
                showToast('保存成功', 'success');
                closeModal();
            }
        }}
    ]);
}

// ==================== 任务系统 ====================
async function loadQuests() {
    try {
        const result = await apiRequest('/api/quests/custom/list');
        if (result) {
            appData.quests = result.quests || [];
        } else {
            appData.quests = [];
        }
    } catch (e) {
        console.error("加载任务失败:", e);
        appData.quests = [];
    }
    renderQuests();
}

function renderQuests() {
    const container = document.getElementById('quest-list');
    if (!appData.quests || appData.quests.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">${SvgIconLib.render('scroll', 36)}</div>
                <div>暂无任务</div>
            </div>
        `;
        return;
    }
    renderQuestsFiltered();
}

function filterQuests() {
    renderQuestsFiltered();
}

function renderQuestsFiltered() {
    const container = document.getElementById('quest-list');
    if (!appData.quests) return;
    
    const searchInput = document.getElementById('quest-search');
    const statusFilter = document.getElementById('quest-status-filter');
    const searchQuery = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const selectedStatus = statusFilter ? statusFilter.value : '';
    
    const filtered = appData.quests.filter(quest => {
        if (selectedStatus && (quest.status || 'available') !== selectedStatus) return false;
        if (searchQuery) {
            const name = (quest.name || quest.title || '').toLowerCase();
            const desc = (quest.description || '').toLowerCase();
            if (!name.includes(searchQuery) && !desc.includes(searchQuery)) return false;
        }
        return true;
    });
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><div>没有匹配的任务</div></div>';
        return;
    }
    
    let html = '';
    filtered.forEach(quest => {
        const status = quest.status || 'available';
        const statusText = {
            'available': '可接取',
            'in-progress': '进行中',
            'completed': '已完成'
        };
        
        let objectivesHtml = '';
        if (quest.objectives) {
            quest.objectives.forEach(obj => {
                const progress = obj.current || 0;
                const target = obj.target || 1;
                const percent = Math.min(100, (progress / target) * 100);
                objectivesHtml += `
                    <div class="objective-item">
                        ${obj.description || obj.type}: ${progress}/${target}
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${percent}%"></div>
                        </div>
                    </div>
                `;
            });
        }
        
        let rewardsHtml = '';
        if (quest.rewards) {
            const rewardItems = [];
            if (quest.rewards.gold || quest.rewards.currency) {
                rewardItems.push(`${SvgIconLib.render('coin', 12)} ${quest.rewards.gold || quest.rewards.currency} 金币`);
            }
            if (quest.rewards.items) {
                quest.rewards.items.forEach(item => {
                    rewardItems.push(`${SvgIconLib.render('box', 12)} ${item.name || item.id}`);
                });
            }
            if (rewardItems.length > 0) {
                rewardsHtml = `<div class="quest-rewards">奖励: ${rewardItems.join(', ')}</div>`;
            }
        }
        
        let actionBtn = '';
        if (status === 'available') {
            actionBtn = `<button class="btn-small" onclick="acceptQuest('${quest.id}')">接受</button>`;
        } else if (status === 'in-progress') {
            actionBtn = `<button class="btn-small" onclick="completeQuest('${quest.id}')">完成</button>`;
        }
        
        html += `
            <div class="quest-card">
                <div class="quest-header">
                    <span class="quest-title">${quest.name || quest.title}</span>
                    <span class="quest-status ${status}">${statusText[status]}</span>
                </div>
                <div class="quest-description">${quest.description || ''}</div>
                <div class="quest-objectives">${objectivesHtml}</div>
                ${rewardsHtml}
                <div style="margin-top: 8px;">${actionBtn}</div>
            </div>
        `;
    });
    container.innerHTML = html;
}

async function acceptQuest(questId) {
    const result = await apiRequest('/api/quests/accept', 'POST', { quest_id: questId });
    if (result && result.success) {
        appData.quests = result.quests;
        renderQuests();
        showToast('任务已接受', 'success');
    }
}

async function completeQuest(questId) {
    const result = await apiRequest('/api/quests/complete', 'POST', { quest_id: questId });
    if (result && result.success) {
        appData.quests = result.quests;
        appData.inventory = result.inventory;
        appData.currency = result.currency;
        renderQuests();
        renderInventory();
        renderCurrency();
        showToast('任务完成！', 'success');
    } else {
        showToast('任务条件未满足', 'error');
    }
}

async function showQuestTemplates() {
    if (appData.questTemplates.length === 0) {
        const result = await apiRequest('/api/quests/templates');
        if (result) {
            appData.questTemplates = result;
        }
    }
    
    let html = '<div style="max-height: 300px; overflow-y: auto;">';
    appData.questTemplates.forEach(quest => {
        html += `
            <div style="padding: 12px; border-bottom: 1px solid #e2e8f0; cursor: pointer;" onclick="acceptQuest('${quest.id}')">
                <div style="font-weight: 500;">${quest.name || quest.title}</div>
                <div style="font-size: 12px; color: #64748b; margin-top: 4px;">${quest.description || ''}</div>
            </div>
        `;
    });
    html += '</div>';
    
    showModal('任务模板', html, [
        { text: '关闭', class: 'btn-secondary', action: closeModal }
    ]);
}

// ==================== 技能系统 ====================
async function loadSkills() {
    try {
        const results = await Promise.allSettled([
            apiRequest('/api/skills'),
            apiRequest('/api/skills/custom/list')
        ]);

        const skills = results[0].status === 'fulfilled' ? normalizeSkillsResponse(results[0].value) : [];
        const customSkills = results[1].status === 'fulfilled' ? normalizeSkillsResponse(results[1].value) : [];

        appData.skills = mergeSkills(skills, customSkills);
    } catch (e) {
        console.error("加载技能失败:", e);
        appData.skills = [];
    }
    renderSkills();
}

function renderSkills() {
    const container = document.getElementById('skill-list');
    if (!appData.skills || appData.skills.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">${SvgIconLib.render('spark', 36)}</div>
                <div>暂无技能</div>
            </div>
        `;
        return;
    }
    renderSkillsFiltered();
}

function filterSkills() {
    renderSkillsFiltered();
}

function renderSkillsFiltered() {
    const container = document.getElementById('skill-list');
    if (!appData.skills) return;
    
    const searchInput = document.getElementById('skill-search');
    const searchQuery = searchInput ? searchInput.value.trim().toLowerCase() : '';
    
    const filtered = appData.skills.filter(skill => {
        if (searchQuery) {
            const name = (skill.name || '').toLowerCase();
            const desc = (skill.description || '').toLowerCase();
            if (!name.includes(searchQuery) && !desc.includes(searchQuery)) return false;
        }
        return true;
    });
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><div>没有匹配的技能</div></div>';
        return;
    }
    
    let html = '';
    filtered.forEach(skill => {
        html += `
            <div class="skill-card">
                <div class="skill-icon">${SvgIconLib.renderAuto(skill.icon, 24)}</div>
                <div class="skill-name">${skill.name}</div>
                <div class="skill-level">Lv.${skill.level || 1}</div>
                <div class="skill-description">${skill.description || ''}</div>
                <div class="item-card-actions">
                    <button class="action-btn" onclick="forgetSkill('${skill.id}')">遗忘</button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

async function showSkillLibrary() {
    showToast('技能库功能开发中', 'success');
}

// ==================== 剧情标记系统 ====================
async function loadStoryMarks() {
    try {
        const result = await apiRequest('/api/story/marks');
        if (result && Array.isArray(result)) {
            appData.storyMarks = result;
        } else if (result && result.marks) {
            appData.storyMarks = result.marks;
        } else {
            appData.storyMarks = [];
        }
    } catch (e) {
        console.error("加载剧情标记失败:", e);
        appData.storyMarks = [];
    }
    renderStoryMarks();
}

function renderStoryMarks() {
    const container = document.getElementById('story-marks');
    if (!appData.storyMarks || appData.storyMarks.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding: 20px;">
                <div>暂无剧情标记</div>
            </div>
        `;
        return;
    }
    
    let html = '';
    appData.storyMarks.forEach(mark => {
        const id = mark.id || mark.mark_id;
        html += `
            <div class="story-item">
                <div class="story-id">${escapeHtml(id)}${renderIdBadge(id)}</div>
                <div class="story-desc">${escapeHtml(mark.description || '')}</div>
                <div style="margin-top: 8px;">
                    <button class="btn-small" onclick="showEditStoryMark('${id}')">编辑</button>
                    <button class="btn-small" style="background: #ef4444;" onclick="deleteStoryMark('${id}')">删除</button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function showEditStoryMark(markId) {
    const mark = appData.storyMarks.find(m => (m.id || m.mark_id) === markId);
    if (!mark) return;
    
    showModal('编辑剧情标记', `
        <div class="form-group">
            <label>标记ID</label>
            <input type="text" id="edit-mark-id" value="${markId}">
        </div>
        <div class="form-group">
            <label>描述</label>
            <textarea id="edit-mark-desc" rows="3">${mark.description || ''}</textarea>
        </div>
    `, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        { text: '保存', class: 'btn-primary', action: async () => {
            const newId = document.getElementById('edit-mark-id').value;
            const desc = document.getElementById('edit-mark-desc').value;
            
            const result = await apiRequest('/api/story/marks/edit', 'POST', {
                old_id: markId,
                mark_id: newId,
                description: desc
            });
            
            if (result && result.success) {
                appData.storyMarks = result.marks;
                renderStoryMarks();
                showToast('保存成功', 'success');
                closeModal();
            }
        }}
    ]);
}

async function deleteStoryMark(markId) {
    if (!(await UIUtils.confirmDialog('确定删除这个剧情标记吗？'))) return;
    
    const result = await apiRequest('/api/story/marks/delete', 'POST', { mark_id: markId });
    if (result && result.success) {
        appData.storyMarks = result.marks;
        renderStoryMarks();
        showToast('已删除', 'success');
    }
}

async function showAddStoryMark() {
    showModal('添加剧情标记', `
        <div class="form-group">
            <label>标记ID</label>
            <input type="text" id="story-mark-id" placeholder="例如: chapter_1_end">
        </div>
        <div class="form-group">
            <label>描述</label>
            <textarea id="story-mark-desc" rows="3" placeholder="剧情标记描述..."></textarea>
        </div>
    `, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        { text: '添加', class: 'btn-primary', action: async () => {
            const markId = document.getElementById('story-mark-id').value;
            const desc = document.getElementById('story-mark-desc').value;
            const result = await apiRequest('/api/story/marks/add', 'POST', { 
                mark_id: markId, 
                description: desc 
            });
            if (result && result.success) {
                appData.storyMarks = result.marks;
                renderStoryMarks();
                showToast('添加成功', 'success');
                closeModal();
            }
        }}
    ]);
}

// ==================== 伏笔系统 ====================
async function loadForeshadowing() {
    try {
        const result = await apiRequest('/api/foreshadowing');
        if (result && Array.isArray(result)) {
            appData.foreshadowing = result;
        } else if (result && result.foreshadowing) {
            appData.foreshadowing = result.foreshadowing;
        } else {
            appData.foreshadowing = [];
        }
    } catch (e) {
        console.error("加载伏笔失败:", e);
        appData.foreshadowing = [];
    }
    renderForeshadowing();
}

function renderForeshadowing() {
    const container = document.getElementById('foreshadowing-list');
    if (!appData.foreshadowing || appData.foreshadowing.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding: 20px;">
                <div>暂无伏笔</div>
            </div>
        `;
        return;
    }
    
    let html = '';
    appData.foreshadowing.forEach(fs => {
        const resolved = fs.resolved || fs.status === 'resolved';
        const fsId = fs.id || fs.foreshadow_id || fs.name;
        html += `
            <div class="foreshadowing-item ${resolved ? 'resolved' : ''}">
                <div class="foreshadow-id">
                    ${fs.name || fs.id || fs.foreshadow_id}
                    ${resolved ? (typeof SvgIconLib !== 'undefined' && SvgIconLib.render ? SvgIconLib.render('check', 13, '#10b981') : '✅') : ''}
                </div>
                <div class="foreshadow-desc">${fs.description || ''}</div>
                <div class="foreshadow-chapter">
                    埋设: ${fs.chapter || fs.category || '未知章节'}
                    ${fs.resolve_chapter ? ` | 回收: ${fs.resolve_chapter}` : ''}
                </div>
                <div style="margin-top: 8px;">
                    ${!resolved ? `<button class="btn-small" onclick="resolveForeshadowing('${fsId}')">回收伏笔</button>` : ''}
                    <button class="btn-small" onclick="showEditForeshadowing('${fsId}')">编辑</button>
                    <button class="btn-small" style="background: #ef4444;" onclick="deleteForeshadowing('${fsId}')">删除</button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function showEditForeshadowing(fsId) {
    const fs = appData.foreshadowing.find(f => 
        String(f.id) === String(fsId) || 
        f.foreshadow_id === fsId || 
        f.name === fsId
    );
    if (!fs) return;
    
    showModal('编辑伏笔', `
        <div class="form-group">
            <label>名称</label>
            <input type="text" id="edit-fs-name" value="${fs.name || fs.id || ''}">
        </div>
        <div class="form-group">
            <label>描述</label>
            <textarea id="edit-fs-desc" rows="3">${fs.description || ''}</textarea>
        </div>
        <div class="form-group">
            <label>埋设章节</label>
            <input type="text" id="edit-fs-chapter" value="${fs.chapter || ''}">
        </div>
    `, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        { text: '保存', class: 'btn-primary', action: async () => {
            const name = document.getElementById('edit-fs-name').value;
            const description = document.getElementById('edit-fs-desc').value;
            const chapter = document.getElementById('edit-fs-chapter').value;
            
            const result = await apiRequest('/api/foreshadowing/edit', 'POST', {
                id: fsId,
                name, description, chapter
            });
            
            if (result && result.success) {
                appData.foreshadowing = result.foreshadowing;
                renderForeshadowing();
                showToast('保存成功', 'success');
                closeModal();
            }
        }}
    ]);
}

async function deleteForeshadowing(fsId) {
    if (!(await UIUtils.confirmDialog('确定删除这个伏笔吗？'))) return;
    
    const result = await apiRequest('/api/foreshadowing/delete', 'POST', { id: fsId });
    if (result && result.success) {
        appData.foreshadowing = result.foreshadowing;
        renderForeshadowing();
        showToast('已删除', 'success');
    }
}

async function showAddForeshadowing() {
    showModal('埋设伏笔', `
        <div class="form-group">
            <label>伏笔名称</label>
            <input type="text" id="fs-id" placeholder="例如: mysterious_ring">
        </div>
        <div class="form-group">
            <label>描述</label>
            <textarea id="fs-desc" rows="3" placeholder="伏笔内容描述..."></textarea>
        </div>
        <div class="form-group">
            <label>埋设章节</label>
            <input type="text" id="fs-chapter" placeholder="例如: 第3章">
        </div>
    `, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        { text: '添加', class: 'btn-primary', action: async () => {
            const fsId = document.getElementById('fs-id').value;
            const desc = document.getElementById('fs-desc').value;
            const chapter = document.getElementById('fs-chapter').value;
            const result = await apiRequest('/api/foreshadowing/add', 'POST', { 
                foreshadow_id: fsId, 
                description: desc,
                chapter: chapter
            });
            if (result && result.success) {
                appData.foreshadowing = result.foreshadowing;
                renderForeshadowing();
                showToast('伏笔已埋设', 'success');
                closeModal();
            }
        }}
    ]);
}

async function resolveForeshadowing(fsId) {
    const result = await apiRequest('/api/foreshadowing/resolve', 'POST', { 
        foreshadow_id: fsId,
        resolve_chapter: '当前章节'
    });
    if (result && result.success) {
        appData.foreshadowing = result.foreshadowing;
        renderForeshadowing();
        showToast('伏笔已回收', 'success');
    }
}

// ==================== 战利品系统 ====================
async function openLootPool() {
    const result = await apiRequest('/api/loot/open', 'POST', { pool_id: 'basic_chest' });
    if (result && result.success) {
        appData.inventory = result.inventory;
        renderInventory();
        
        let lootText = '';
        if (result.loot) {
            if (Array.isArray(result.loot)) {
                lootText = result.loot.map(item => `${item.name || item.id} x${item.quantity || 1}`).join(', ');
            } else {
                lootText = `${result.loot.name || result.loot.id} x${result.loot.quantity || 1}`;
            }
        }
        showToast(`获得: ${lootText}`, 'success');
    }
}

// ==================== 搜索系统 ====================
async function doSearch() {
    const keyword = document.getElementById('search-input').value;
    if (!keyword) {
        showToast('请输入搜索关键词', 'error');
        return;
    }
    
    const result = await apiRequest('/api/search', 'POST', { keyword });
    const container = document.getElementById('search-results');
    
    if (result && result.results && result.results.length > 0) {
        let html = '';
        result.results.forEach(item => {
            html += `
                <div class="search-result-item">
                    <div class="search-result-type">${item.type || '未知'}</div>
                    <div class="search-result-name">${item.name || item.id}</div>
                </div>
            `;
        });
        container.innerHTML = html;
    } else {
        container.innerHTML = '<div style="text-align: center; color: #64748b; padding: 20px;">未找到相关结果</div>';
    }
}

// ==================== 统计系统 ====================
function renderStats() {
    const container = document.getElementById('stats-info');
    if (!container) return;
    if (!appData.stats) {
        container.innerHTML = '<div class="loading">加载中...</div>';
        return;
    }
    
    let html = '';
    const statLabels = {
        'total_items': '物品总数',
        'total_quests': '任务总数',
        'completed_quests': '已完成任务',
        'total_skills': '技能总数',
        'total_marks': '剧情标记',
        'total_foreshadowing': '伏笔总数',
        'resolved_foreshadowing': '已回收伏笔'
    };
    
    for (const [key, value] of Object.entries(appData.stats)) {
        const label = statLabels[key] || key;
        html += `
            <div class="stat-card">
                <div class="stat-value">${value}</div>
                <div class="stat-label">${label}</div>
            </div>
        `;
    }
    container.innerHTML = html;
}

// ==================== 数据预览设置 ====================

// 默认显示的模块
const defaultPreviewConfig = {
    character: true,
    currency: true,
    inventory: true,
    equipment: true,
    quests: true,
    skills: true,
    storyMarks: true,
    foreshadowing: true,
    map: true,
    relation: true,
    custom: true
};

// 模块名称映射
const previewModuleNames = {
    character: '角色信息',
    currency: '货币',
    inventory: '背包物品',
    equipment: '装备',
    quests: '任务',
    skills: '技能',
    storyMarks: '剧情标记',
    foreshadowing: '伏笔',
    map: '地图地点',
    relation: '人物关系',
    custom: '自定义数据'
};

// 数据预览模块图标（SVG key）
const previewModuleIcons = {
    character: 'user', currency: 'coin', inventory: 'backpack', equipment: 'sword',
    quests: 'scroll', skills: 'spark', storyMarks: 'book', foreshadowing: 'crystal',
    map: 'map', relation: 'user_group', custom: 'edit'
};

// 获取数据预览配置
function getPreviewConfig() {
    try {
        const saved = localStorage.getItem('previewConfig');
        if (saved) {
            return { ...defaultPreviewConfig, ...JSON.parse(saved) };
        }
    } catch (e) {
        console.error('加载预览配置失败', e);
    }
    return { ...defaultPreviewConfig };
}

// 保存数据预览配置
function savePreviewConfig(config) {
    try {
        localStorage.setItem('previewConfig', JSON.stringify(config));
    } catch (e) {
        console.error('保存预览配置失败', e);
    }
}

// 显示预览设置弹窗弹窗
function showPreviewSettings() {
    const config = getPreviewConfig();
    
    let html = '<div style="padding: 10px 0;">';
    html += '<p style="margin-bottom: 15px; color: #6b7280;">选择要在数据预览中显示的模块：</p>';
    
    for (const [key, name] of Object.entries(previewModuleNames)) {
        const checked = config[key] ? 'checked' : '';
        html += `
            <div style="margin-bottom: 12px; display: flex; align-items: center;">
                <input type="checkbox" id="preview-${key}" ${checked} style="margin-right: 10px; width: 18px; height: 18px;" onchange="toggleCustomCategoriesOptions()">
                <label for="preview-${key}" style="cursor: pointer;">${(typeof SvgIconLib !== 'undefined' && SvgIconLib.renderAuto) ? SvgIconLib.renderAuto(previewModuleIcons[key] || 'box', 14) : ''} ${name}</label>
            </div>
        `;
        
        // 自定义数据模块下添加子选项
        if (key === 'custom' && appData.customCategories && appData.customCategories.length > 0) {
            html += '<div id="custom-categories-options" style="margin-left: 28px; margin-bottom: 12px; padding-left: 12px; border-left: 2px solid #e5e7eb;">';
            html += '<p style="margin-bottom: 8px; color: #6b7280; font-size: 14px;">选择要显示的自定义分类：</p>';
            
            const customConfig = config.customCategories || {};
            
            appData.customCategories.forEach(cat => {
                const catChecked = customConfig[cat.id] !== false ? 'checked' : '';
                html += `
                    <div style="margin-bottom: 8px; display: flex; align-items: center;">
                        <input type="checkbox" id="preview-custom-${cat.id}" ${catChecked} style="margin-right: 8px; width: 16px; height: 16px;">
                        <label for="preview-custom-${cat.id}" style="cursor: pointer; font-size: 14px;">${(typeof SvgIconLib !== 'undefined' && SvgIconLib.renderAuto) ? SvgIconLib.renderAuto(cat.icon || 'folder', 14) : (cat.icon || '📁')} ${cat.name || cat.id}</label>
                    </div>
                `;
            });
            
            html += '</div>';
        }
    }
    
    html += '</div>';
    
    showModal('数据预览设置', html, [
        { text: '取消', class: 'btn-secondary', action: () => closeModal() },
        { text: '保存', class: 'btn-primary', action: () => {
            const newConfig = {};
            for (const key of Object.keys(previewModuleNames)) {
                const checkbox = document.getElementById(`preview-${key}`);
                newConfig[key] = checkbox ? checkbox.checked : true;
            }
            
            // 保存自定义分类的选择
            if (appData.customCategories && appData.customCategories.length > 0) {
                newConfig.customCategories = {};
                appData.customCategories.forEach(cat => {
                    const checkbox = document.getElementById(`preview-custom-${cat.id}`);
                    newConfig.customCategories[cat.id] = checkbox ? checkbox.checked : true;
                });
            }
            
            savePreviewConfig(newConfig);
            renderDataPreview();
            closeModal();
            showToast('设置已保存', 'success');
        }}
    ]);
    
    // ============================================================
// 模块: 初始化与导航
// ============================================================

// 初始化自定义分类选项的显示状态
    toggleCustomCategoriesOptions();
}

// 切换自定义分类选项显示的显示状态
function toggleCustomCategoriesOptions() {
    const customCheckbox = document.getElementById('preview-custom');
    const optionsDiv = document.getElementById('custom-categories-options');
    
    if (customCheckbox && optionsDiv) {
        optionsDiv.style.display = customCheckbox.checked ? 'block' : 'none';
    }
}

// ============================================================
// 模块: 初始化与导航
// ============================================================

// 初始化数据预览设置按钮
function initPreviewSettings() {
    const cardHeader = document.querySelector('#page-preview .card-header');
    if (cardHeader && !cardHeader.querySelector('.preview-settings-btn')) {
        const btn = document.createElement('button');
        btn.className = 'preview-settings-btn';
        btn.innerHTML = (typeof SvgIconLib !== 'undefined' && SvgIconLib.render ? SvgIconLib.render('settings', 13) : '⚙️') + ' 设置';
        btn.style.cssText = 'background: none; border: 1px solid #e5e7eb; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 14px; color: #6b7280;';
        btn.onclick = showPreviewSettings;
        cardHeader.appendChild(btn);
    }
}

// ==================== 数据预览 ====================
function renderDataPreview() {
    const container = document.getElementById('preview-data');
    if (!container) return;
    
    // 初始化设置按钮
    initPreviewSettings();
    
    // 获取显示配置
    const config = getPreviewConfig();
    
    // 使用 ModuleRegistry 自动生成预览 HTML
    if (typeof ModuleRegistry !== 'undefined') {
        container.innerHTML = ModuleRegistry.generatePreviewHTML(appData, config);
    } else {
        container.innerHTML = '<p style="text-align:center;color:#9ca3af;padding:40px 0;">模块注册系统未加载</p>';
    }
}

// ==================== 备份系统 ====================
async function createBackup() {
    const result = await apiRequest('/api/backup', 'POST');
    const container = document.getElementById('backup-result');
    if (result && result.success) {
        const key = result.data && result.data.backup;
        const count = result.data && result.data.count;
        container.innerHTML = `<p style="color: #10b981;">[OK] 备份已创建: ${key || ''}${count ? '（共 ' + count + ' 份，自动保留最近 10 份）' : ''}</p>`;
        showToast('备份成功', 'success');
        if (typeof showBackupList === 'function') showBackupList();
    } else {
        container.innerHTML = '<p style="color: #ef4444;">[错误] ' + (result && result.error ? escapeHtml(result.error) : '备份失败') + '</p>';
        showToast('备份失败', 'error');
    }
}

// 列出全部备份（供恢复）
async function showBackupList() {
    const listEl = document.getElementById('backup-list');
    if (!listEl) return;
    const result = await apiRequest('/api/backup/list', 'GET');
    if (!result || !result.success) {
        listEl.innerHTML = '<p style="color:#9ca3af;font-size:12px;">备份列表加载失败</p>';
        return;
    }
    const list = (result.data && result.data.list) || [];
    if (list.length === 0) {
        listEl.innerHTML = '<p style="color:#9ca3af;font-size:12px;">暂无备份，点击「创建备份」生成</p>';
        return;
    }
    listEl.innerHTML = '<table class="backup-table"><thead><tr><th>备份时间</th><th>大小</th><th>操作</th></tr></thead><tbody>' +
        list.map(b => `<tr>
            <td>${escapeHtml(b.time)}</td>
            <td>${(b.size / 1024).toFixed(1)} KB</td>
            <td>
                <button class="btn-small" onclick="restoreBackup('${escapeHtml(b.key)}')">恢复</button>
            </td>
        </tr>`).join('') + '</tbody></table>';
}

// 从指定备份恢复全部数据
async function restoreBackup(key) {
    if (!key) return;
    if (!(await UIUtils.confirmDialog('确定用备份「' + key.replace('backup_', '') + '」覆盖当前全部数据吗？此操作不可撤销！'))) {
        return;
    }
    const result = await apiRequest('/api/backup/restore', 'POST', { key });
    const container = document.getElementById('backup-result');
    if (result && result.success) {
        const restored = result.data && result.data.restored;
        container.innerHTML = `<p style="color: #10b981;">[OK] 已恢复 ${restored} 个数据模块，请刷新页面查看</p>`;
        showToast('备份恢复成功', 'success');
    } else {
        container.innerHTML = '<p style="color: #ef4444;">[错误] ' + (result && result.error ? escapeHtml(result.error) : '恢复失败') + '</p>';
        showToast('恢复失败', 'error');
    }
}

// 导出完整数据为 JSON 文件（可下载到任意位置，是最可靠的备份通道）
async function exportAllJson() {
    const result = await apiRequest('/api/backup/export-json', 'GET');
    if (!result || !result.success) { showToast('导出失败', 'error'); return; }
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'novel_manager_backup_' + ts + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
    showToast('完整数据已导出为 JSON 文件', 'success');
}

// 从 JSON 文件导入完整数据（覆盖全部业务数据）
function importAllJson() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async function() {
        const file = input.files && input.files[0];
        if (!file) return;
        if (!(await UIUtils.confirmDialog('导入将用文件内容覆盖当前全部数据，此操作不可撤销！建议先「创建备份」。确定继续？'))) { return; }
        const reader = new FileReader();
        reader.onload = async function() {
            let parsed;
            try {
                parsed = JSON.parse(reader.result);
            } catch(e) {
                showToast('JSON 解析失败: ' + e.message, 'error');
                return;
            }
            if (!parsed || typeof parsed !== 'object') { showToast('文件不是有效的 JSON 对象', 'error'); return; }
            const result = await apiRequest('/api/backup/import-json', 'POST', { data: parsed });
            const container = document.getElementById('backup-result');
            if (result && result.success) {
                const imported = result.data && result.data.imported;
                container.innerHTML = `<p style="color: #10b981;">[OK] 已导入 ${imported} 个数据模块，请刷新页面查看</p>`;
                showToast('数据导入成功', 'success');
            } else {
                const errMsg = (result && result.error) || '导入失败';
                container.innerHTML = '<p style="color: #ef4444;">[错误] ' + escapeHtml(errMsg) + '</p>';
                showToast('导入失败: ' + errMsg, 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

async function saveData() {
    const result = await apiRequest('/api/save', 'POST');
    if (result && result.success) {
        showToast('数据已保存', 'success');
    } else {
        showToast('保存失败', 'error');
    }
}

async function clearBackups() {
    if (!(await UIUtils.confirmDialog('确定要清理所有备份吗？此操作不可恢复！'))) {
        return;
    }
    const result = await apiRequest('/api/backup/clear', 'POST');
    const container = document.getElementById('backup-result');
    if (result && result.success) {
        container.innerHTML = `<p style="color: #10b981;">[OK] 已清理 ${result.count} 个备份文件</p>`;
        showToast('备份已清理', 'success');
    } else {
        container.innerHTML = '<p style="color: #ef4444;">[错误] 清理失败</p>';
        showToast('清理失败', 'error');
    }
}

// ==================== 弹窗系统 ====================
function showModal(title, content, buttons = []) {
    const container = document.getElementById('modal-container');
    
    // 支持两种调用方式：
    // 1. showModal(fullHtml) - 传入完整的弹窗HTML
    // 2. showModal(title, content, buttons) - 传入标题、内容、按钮
    let modalHtml;
    
    if (content === undefined && buttons.length === 0 && typeof title === 'string' && title.includes('modal-')) {
        // 只传了一个参数，且是完整的HTML（包含modal-类名）
        modalHtml = title;
        window._modalActions = [];
    } else {
        // 传统的三参数调用
        let buttonsHtml = '';
        buttons.forEach((btn, index) => {
            buttonsHtml += `<button class="${btn.class || 'btn-secondary'}" onclick="modalAction(${index})">${btn.text}</button>`;
        });
        
        modalHtml = `
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body">
                ${content || ''}
            </div>
            ${buttonsHtml ? `<div class="modal-footer">${buttonsHtml}</div>` : ''}
        `;
        
        window._modalActions = buttons.map(btn => btn.action);
    }
    
    container.innerHTML = `
        <div class="modal-overlay" onclick="closeModal(event)">
            <div class="modal" onclick="event.stopPropagation()">
                ${modalHtml}
            </div>
        </div>
    `;
}

function modalAction(index) {
    if (window._modalActions && window._modalActions[index]) {
        window._modalActions[index]();
    }
}

function closeModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('modal-container').innerHTML = '';
}

// 全局 Escape 关闭弹窗（仅当有弹窗打开时生效）
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        const container = document.getElementById('modal-container');
        if (container && container.innerHTML && container.innerHTML.trim()) closeModal();
    }
});

// Toast提示消息
// ==================== ID 标签工具函数 ====================
function renderIdBadge(id) {
    if (!id) return '';
    const shortId = id.length > 12 ? id.substring(id.length - 12) : id;
    const esc = typeof UIUtils !== 'undefined' && UIUtils.escapeHtml ? UIUtils.escapeHtml : escapeHtml;
    const jsSafe = String(id).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    return `<span class="id-badge" title="${esc(id)}" onclick="event.stopPropagation(); copyIdToClipboard('${jsSafe}')">${esc(shortId)}</span>`;
}

function copyIdToClipboard(id) {
    if (typeof UIUtils !== 'undefined' && UIUtils.copyText) {
        UIUtils.copyText(id, 'ID 已复制');
        return;
    }
    if (navigator.clipboard) {
        navigator.clipboard.writeText(id).then(() => {
            if (typeof showToast === 'function') showToast('ID 已复制', 'success');
        });
    } else {
        const ta = document.createElement('textarea');
        ta.value = id;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        if (typeof showToast === 'function') showToast('ID 已复制', 'success');
    }
}

function showToast(message, type = 'default') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast show ' + type;
    
    setTimeout(() => {
        toast.className = 'toast';
    }, 2500);
}

// ==================== 角色编辑功能 ====================

// 绑定角色编辑按钮点击事件
document.addEventListener("DOMContentLoaded", function() {
    const editBtn = document.getElementById("edit-character-btn");
    if (editBtn) {
        editBtn.addEventListener("click", showEditCharacterMain);
    }
});

// ============================================================
// 模块: 角色编辑功能
// ============================================================

// 显示编辑角色弹窗
// 参数: 无
// 返回: 无
// 效果: 弹出角色编辑窗口，可修改角色名称、等级、属性等
async function showEditCharacterMain() {
    const character = await apiRequest('/api/character');
    if (!character) {
        showToast('加载失败');
        return;
    }
    const stats = character.stats || {};

    // 2.2-D 加载术语表，渲染关联术语选择器
    let termPickerHtml = '';
    if (window.GlossaryModule) {
        if (typeof window.GlossaryModule.loadData === 'function') {
            try { await window.GlossaryModule.loadData(); } catch(_) {}
        }
        if (typeof window.GlossaryModule.renderTermPickerHtml === 'function') {
            termPickerHtml = window.GlossaryModule.renderTermPickerHtml(character.linked_terms || []);
        }
    }

    let statsHtml = '';
    for (let key in stats) {
        if (['inventory', 'equipment', 'skills', 'name', 'template', 'level', 'id'].indexOf(key) === -1) {
            let value = stats[key];
            if (typeof value === 'object' && value !== null) {
                value = JSON.stringify(value);
            }
            value = String(value).replace(/"/g, '&quot;');
            key = String(key).replace(/"/g, '&quot;');
            statsHtml += `
                <div class="form-group stat-row">
                    <div class="stat-name-input">
                        <label>属性名</label>
                        <input type="text" class="char-stat-name-input" value="${key}" placeholder="属性名称">
                    </div>
                    <div class="stat-value-input">
                        <label>属性值</label>
                        <input type="text" class="char-stat-value-input" value="${value}" placeholder="属性值">
                    </div>
                    <button type="button" class="btn-small btn-danger stat-delete-btn" onclick="deleteStat(this)">${SvgIconLib.render('trash', 12)} 删除</button>
                </div>
            `;
        }
    }

    const html = `
        <div class="form-group">
            <label>角色名称</label>
            <input type="text" id="edit-char-name" value="${character.name || ''}">
        </div>
        <div class="form-group">
            <label>等级标签</label>
            <input type="text" id="edit-char-level-label" value="${character.level_label || '等级'}" placeholder="例如：等级、境界、修为">
        </div>
        <div class="form-group">
            <label>等级值</label>
            <input type="text" id="edit-char-level" value="${character.level || 1}">
        </div>
        <h4>属性面板</h4>
        ${statsHtml}
        <div class="form-group">
            <button type="button" class="btn-secondary" id="add-new-stat-btn" onclick="addNewStat()">+ 添加新属性</button>
        </div>
        <h4>关联术语</h4>
        <div class="form-group">${termPickerHtml}</div>
    `;
    showModal(`${SvgIconLib.render('edit', 16)} 编辑角色`, html, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        { text: '保存修改', class: 'btn-primary', action: saveEditCharacterMain }
    ]);
}

// 添加新属性
function addNewStat() {
    const statsContainer = document.querySelector('.modal-body');
    const newStatHtml = `
        <div class="form-group stat-row">
            <div class="stat-name-input">
                <label>属性名</label>
                <input type="text" class="char-stat-name-input" value="新属性" placeholder="属性名称">
            </div>
            <div class="stat-value-input">
                <label>属性值</label>
                <input type="text" class="char-stat-value-input" value="0" placeholder="属性值">
            </div>
            <button type="button" class="btn-small btn-danger stat-delete-btn" onclick="deleteStat(this)">${(typeof SvgIconLib !== 'undefined' && SvgIconLib.render) ? SvgIconLib.render('trash', 12) : '🗑️'} 删除</button>
        </div>
    `;
    
    // 在添加按钮之前插入
    const addBtn = document.getElementById('add-new-stat-btn').closest('.form-group');
    addBtn.insertAdjacentHTML('beforebegin', newStatHtml);
}

// 删除属性
function deleteStat(btn) {
    const statRow = btn.closest('.stat-row');
    if (statRow) {
        statRow.remove();
    }
}

// 保存角色编辑 - 使用 localDataManager
async function saveEditCharacterMain() {
    const name = document.getElementById('edit-char-name').value.trim();
    const level = document.getElementById('edit-char-level').value || 1;
    const levelLabel = document.getElementById('edit-char-level-label').value || '等级';
    
    const stats = {};
    document.querySelectorAll('.stat-row').forEach(row => {
        const nameInput = row.querySelector('.char-stat-name-input');
        const valueInput = row.querySelector('.char-stat-value-input');
        if (nameInput && valueInput) {
            const key = nameInput.value.trim();
            let value = valueInput.value;
            if (!isNaN(value) && value !== '') {
                value = Number(value);
            }
            if (key) {
                stats[key] = value;
            }
        }
    });
    
    const data = await apiRequest('/api/character/edit', 'POST', {
        name: name,
        level: level,
        level_label: levelLabel,
        stats: stats,
        linked_terms: (window.GlossaryModule && typeof window.GlossaryModule.readTermPickerValues === 'function')
            ? window.GlossaryModule.readTermPickerValues()
            : []
    });
    if (data && data.success) {
        showToast('保存成功');
        closeModal();
        const character = await apiRequest('/api/character');
        if (character) {
            appData.character = character;
            if (typeof renderCharacter === 'function') renderCharacter();
            if (typeof renderDataPreview === 'function') renderDataPreview();
        }
    } else {
        showToast('保存失败：' + (data && data.message ? data.message : '未知错误'));
    }
}

// ==================== 一键导出TXT ====================

// ==================== 物品库系统 ====================

// 分类相关数据
let currentCategoryId = null;  // 当前选中的分类ID，null表示全部
let itemCategories = [];       // 分类列表

// 加载分类列表
async function loadItemCategories() {
    try {
        // 增加超时控制
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const result = await apiRequest('/api/items/categories');
        clearTimeout(timeoutId);
        
        if (result) {
            // 转换为数组格式
            itemCategories = [];
            if (result && typeof result === 'object' && !Array.isArray(result)) {
                for (const [id, cat] of Object.entries(result)) {
                    itemCategories.push({ ...cat, id });
                }
            } else if (Array.isArray(result)) {
                itemCategories = result;
            }
        }
    } catch (e) {
        console.error('加载分类失败:', e);
        // 加载失败时使用空数组，避免影响其他功能
        if (!itemCategories) itemCategories = [];
    }
}

// 显示/隐藏分类选择器
function showItemCategorySelector() {
    const panel = document.getElementById('category-selector-panel');
    if (!panel) return;
    
    if (panel.style.display === 'none') {
        // 显示分类列表
        renderItemCategorySelector();
        panel.style.display = 'block';
    } else {
        panel.style.display = 'none';
    }
}

// 渲染分类选择器
function renderItemCategorySelector() {
    const container = document.getElementById('category-selector-list');
    if (!container) return;
    
    let html = '';
    
    // 全部分类选项
    const allActive = currentCategoryId === null ? 'background: #3b82f6; color: white; border-color: #3b82f6;' : '';
    html += `
        <button class="btn-small" onclick="selectItemCategory(null)" 
                style="${allActive}">
            ${(typeof SvgIconLib !== 'undefined' && SvgIconLib.render) ? SvgIconLib.render('folder', 13) : '📁'} 全部
        </button>
    `;
    
    // 各个分类
    const moduleNames = {
        'equipment': '装备',
        'skills': '技能',
        'quests': '任务',
        'consumable': '消耗品',
        'item_library': '物品库'
    };
    
    itemCategories.forEach(cat => {
        const active = currentCategoryId === cat.id ? 'background: #3b82f6; color: white; border-color: #3b82f6;' : '';
        // 显示绑定模块标识
        let moduleBadge = '';
        if (cat.bind_module) {
            const moduleName = moduleNames[cat.bind_module] || cat.bind_module;
            moduleBadge = `<span style="font-size: 10px; opacity: 0.7; margin-left: 2px;">[${moduleName}]</span>`;
        }
        html += `
            <button class="btn-small" onclick="selectItemCategory('${cat.id}')" 
                    style="${active}">
                ${(typeof SvgIconLib !== 'undefined' && SvgIconLib.renderAuto) ? SvgIconLib.renderAuto(cat.icon || 'folder', 13) : (cat.icon || '📁')} ${cat.name}${moduleBadge}
            </button>
        `;
    });
    
    container.innerHTML = html;
}

// 选择分类
function selectItemCategory(categoryId) {
    currentCategoryId = categoryId;
    
    // 更新当前分类显示
    const nameEl = document.getElementById('current-category-name');
    const iconEl = document.getElementById('current-category-icon');
    
    if (categoryId === null) {
        if (nameEl) nameEl.textContent = '全部分类';
        if (iconEl) iconEl.innerHTML = (typeof SvgIconLib !== 'undefined' && SvgIconLib.render ? SvgIconLib.render('folder', 16) : '📁');
    } else {
        const cat = itemCategories.find(c => c.id === categoryId);
        if (cat) {
            if (nameEl) nameEl.textContent = cat.name;
            if (iconEl) iconEl.innerHTML = (typeof SvgIconLib !== 'undefined' && SvgIconLib.renderAuto ? SvgIconLib.renderAuto(cat.icon || 'folder', 16) : (cat.icon || '📁'));
        }
    }
    
    // 隐藏选择面板
    const panel = document.getElementById('category-selector-panel');
    if (panel) panel.style.display = 'none';
    
    // 重新渲染物品列表
    renderItemLibrary();
}

// 分类管理弹窗
function showItemCategoryManager() {
    let catListHtml = '';
    itemCategories.forEach(cat => {
        // 显示绑定的模块
        let bindModuleText = '';
        if (cat.bind_module) {
            const moduleNames = {
                'equipment': '装备',
                'skills': '技能',
                'quests': '任务',
                'consumable': '消耗品',
                'item_library': '物品库'
            };
            const moduleName = moduleNames[cat.bind_module] || cat.bind_module;
            bindModuleText = `<span style="font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 6px; border-radius: 4px; margin-left: 8px;">绑定: ${moduleName}</span>`;
        }
        
        catListHtml += `
            <div style="display: flex; align-items: center; padding: 8px; border-bottom: 1px solid #e2e8f0;">
                <span style="font-size: 20px; margin-right: 8px;">${(typeof SvgIconLib !== 'undefined' && SvgIconLib.renderAuto) ? SvgIconLib.renderAuto(cat.icon || 'folder', 18) : (cat.icon || '📁')}</span>
                <span style="flex: 1;">${cat.name}${bindModuleText}</span>
                <button class="btn-small" onclick="editItemCategory('${cat.id}')">${(typeof SvgIconLib !== 'undefined' && SvgIconLib.render) ? SvgIconLib.render('edit', 13) : '✏️'}</button>
                <button class="btn-small" onclick="deleteItemCategory('${cat.id}')" style="background: #ef4444; border-color: #ef4444; color: white; margin-left: 4px;">${(typeof SvgIconLib !== 'undefined' && SvgIconLib.render) ? SvgIconLib.render('trash', 13) : '🗑️'}</button>
            </div>
        `;
    });
    
    if (itemCategories.length === 0) {
        catListHtml = '<div class="empty-state">暂无分类</div>';
    }
    
    showModal('分类管理', `
        <div style="margin-bottom: 12px;">
            <button class="btn-primary btn-small" onclick="showAddItemCategory()">+ 添加分类</button>
        </div>
        <div style="max-height: 300px; overflow-y: auto;">
            ${catListHtml}
        </div>
    `, [
        { text: '关闭', class: 'btn-secondary', action: closeModal }
    ]);
}

// 显示添加分类弹窗
function showAddItemCategory() {
    showModal('添加分类', `
        <div class="form-group">
            <label>名称</label>
            <input type="text" id="new-cat-name" placeholder="分类名称">
        </div>
        <div class="form-group">
            <label>图标（SVG key 或 emoji）</label>
            <input type="text" id="new-cat-icon" value="folder">
        </div>
        <div class="form-group">
            <label>描述</label>
            <textarea id="new-cat-desc" rows="2"></textarea>
        </div>
        <div class="form-group">
            <label>绑定模块（可选，可自定义）</label>
            <input type="text" id="new-cat-bind" placeholder="例如：equipment、skills、quests 或自定义名称">
            <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">
                常用模块：equipment（装备）、skills（技能）、quests（任务）、consumable（消耗品）
            </div>
        </div>
    `, [
        { text: '取消', class: 'btn-secondary', action: () => showItemCategoryManager() },
        { text: '添加', class: 'btn-primary', action: async () => {
            const name = document.getElementById('new-cat-name').value;
            if (!name) {
                showToast('请输入分类名称', 'error');
                return;
            }
            
            const icon = document.getElementById('new-cat-icon').value;
            const description = document.getElementById('new-cat-desc').value;
            const bindModule = document.getElementById('new-cat-bind').value;
            
            const result = await apiRequest('/api/items/categories/add', 'POST', {
                name, icon, description, bind_module: bindModule
            });
            
            if (result && result.success) {
                await loadItemCategories();
                showToast('添加成功', 'success');
                showItemCategoryManager();
            }
        }}
    ]);
}

// 编辑分类
function editItemCategory(catId) {
    const cat = itemCategories.find(c => c.id === catId);
    if (!cat) return;
    
    showModal('编辑分类', `
        <div class="form-group">
            <label>名称</label>
            <input type="text" id="edit-cat-name" value="${cat.name || ''}">
        </div>
        <div class="form-group">
            <label>图标（SVG key 或 emoji）</label>
            <input type="text" id="edit-cat-icon" value="${cat.icon || 'folder'}">
        </div>
        <div class="form-group">
            <label>描述</label>
            <textarea id="edit-cat-desc" rows="2">${cat.description || ''}</textarea>
        </div>
        <div class="form-group">
            <label>绑定模块</label>
            <select id="edit-cat-bind">
                <option value="">不绑定</option>
                <option value="equipment" ${cat.bind_module === 'equipment' ? 'selected' : ''}>装备</option>
                <option value="skills" ${cat.bind_module === 'skills' ? 'selected' : ''}>技能</option>
                <option value="quests" ${cat.bind_module === 'quests' ? 'selected' : ''}>任务</option>
                <option value="consumable" ${cat.bind_module === 'consumable' ? 'selected' : ''}>消耗品</option>
            </select>
        </div>
    `, [
        { text: '取消', class: 'btn-secondary', action: () => showItemCategoryManager() },
        { text: '保存', class: 'btn-primary', action: async () => {
            const name = document.getElementById('edit-cat-name').value;
            const icon = document.getElementById('edit-cat-icon').value;
            const description = document.getElementById('edit-cat-desc').value;
            const bindModule = document.getElementById('edit-cat-bind').value;
            
            const result = await apiRequest('/api/items/categories/edit', 'POST', {
                category_id: catId,
                name, icon, description, bind_module: bindModule
            });
            
            if (result && result.success) {
                await loadItemCategories();
                showToast('保存成功', 'success');
                showItemCategoryManager();
            }
        }}
    ]);
}

// 删除分类
async function deleteItemCategory(catId) {
    if (!(await UIUtils.confirmDialog('确定要删除这个分类吗？'))) return;
    
    const result = await apiRequest('/api/items/categories/delete', 'POST', {
        category_id: catId
    });
    
    if (result && result.success) {
        await loadItemCategories();
        if (currentCategoryId === catId) {
            currentCategoryId = null;
        }
        renderItemLibrary();
        showToast('删除成功', 'success');
        showItemCategoryManager();
    }
}

// 编辑物品库物品
function showEditLibraryItem(itemId) {
    const item = appData.itemLibrary.find(i => i.id === itemId);
    if (!item) return;
    
    // 生成分类选项
    let catOptions = '<option value="">不分类</option>';
    itemCategories.forEach(cat => {
        const selected = item.category_id === cat.id ? 'selected' : '';
        catOptions += `<option value="${cat.id}" ${selected}>${cat.name}</option>`;
    });
    
    showModal('编辑物品', `
        <div class="form-group">
            <label>名称</label>
            <input type="text" id="edit-lib-item-name" value="${item.name || ''}">
        </div>
        <div class="form-group">
            <label>图标（SVG key 或 emoji）</label>
            <input type="text" id="edit-lib-item-icon" value="${item.icon || 'box'}">
        </div>
        <div class="form-group">
            <label>分类</label>
            <select id="edit-lib-item-category">
                ${catOptions}
            </select>
        </div>

        <div class="form-group">
            <label>描述</label>
            <textarea id="edit-lib-item-desc" rows="2">${item.description || ''}</textarea>
        </div>
    `, [
        { text: '取消', class: 'btn-secondary', action: () => showLibraryItemDetail(itemId) },
        { text: '保存', class: 'btn-primary', action: async () => {
            const name = document.getElementById('edit-lib-item-name').value;
            if (!name) {
                showToast('请输入物品名称', 'error');
                return;
            }
            
            const icon = document.getElementById('edit-lib-item-icon').value;
            const category = document.getElementById('edit-lib-item-category').value;
            const description = document.getElementById('edit-lib-item-desc').value;
            
            const result = await apiRequest('/api/items/library/edit', 'POST', {
                item_id: itemId,
                name, icon, description, category_id: category
            });
            
            if (result && result.success) {
                appData.itemLibrary = result.items || [];
                renderItemLibrary();
                showToast('保存成功', 'success');
                closeModal();
            }
        }}
    ]);
}

// 删除物品库物品
async function deleteLibraryItem(itemId) {
    // 关联检查：物品是否已在背包中
    const inInventory = appData.inventory.find(i => i.id === itemId);
    let confirmMsg = '确定要删除这个物品吗？';
    if (inInventory) {
        confirmMsg = `该物品已在背包中（x${inInventory.quantity || 1}），删除后背包物品将保留但不再同步物品库信息。确定删除？`;
    }
    if (!(await UIUtils.confirmDialog(confirmMsg))) return;
    
    const result = await apiRequest('/api/items/library/delete', 'POST', {
        item_id: itemId
    });
    
    if (result && result.success) {
        appData.itemLibrary = result.items || [];
        renderItemLibrary();
        showToast('删除成功', 'success');
        closeModal();
    }
}

// 渲染物品库列表
function renderItemLibrary() {
    const container = document.getElementById('library-item-list');
    if (!container) return;
    
    let items = appData.itemLibrary || [];
    
    // 按分类筛选
    if (currentCategoryId !== null) {
        items = items.filter(item => item.category_id === currentCategoryId);
    }
    
    // 按搜索筛选
    const searchInput = document.getElementById('library-search');
    const searchQuery = searchInput ? searchInput.value.trim().toLowerCase() : '';
    if (searchQuery) {
        items = items.filter(item => {
            const name = (item.name || '').toLowerCase();
            const id = (item.id || '').toLowerCase();
            const desc = (item.description || '').toLowerCase();
            return name.includes(searchQuery) || id.includes(searchQuery) || desc.includes(searchQuery);
        });
    }
    
    if (items.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无物品，点击上方按钮添加</div>';
        return;
    }
    
    let html = '';
    items.forEach(item => {
        const cat = itemCategories.find(c => c.id === item.category_id);
        const catLabel = cat ? (SvgIconLib.renderAuto(cat.icon || 'folder', 12) + ' ' + escapeHtml(cat.name)) : '';
        html += `
            <div class="item-card" onclick="showLibraryItemDetail('${item.id}')">
                <div class="item-icon">${SvgIconLib.renderAuto(item.icon, 28)}</div>
                <div class="item-name">${item.name || '未命名'}${renderIdBadge(item.id)}</div>
                <div class="item-type">${catLabel || getCategoryName(item.category_id)}</div>
                <div class="item-quick-action" onclick="event.stopPropagation(); addItemFromLibrary('${item.id}')" title="添加到背包" style="position:absolute;bottom:4px;right:4px;background:color-mix(in srgb, var(--success-color) 90%, #fff);color:#fff;border-radius:4px;padding:2px 6px;font-size:11px;cursor:pointer;z-index:1;">${SvgIconLib.render('backpack', 11)}+</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function filterLibraryItems() {
    renderItemLibrary();
}

// 显示添加物品库物品弹窗
function showAddLibraryItem() {
    // 生成分类选项
    let catOptions = '<option value="">不分类</option>';
    itemCategories.forEach(cat => {
        const selected = currentCategoryId === cat.id ? 'selected' : '';
        // option 不支持 SVG：仅内置图标名显示为文本，emoji 图标不输出
        const optIcon = (cat.icon && SvgIconLib.is(cat.icon)) ? cat.icon + ' ' : '';
        catOptions += `<option value="${cat.id}" ${selected}>${optIcon}${cat.name}</option>`;
    });
    
    showModal('添加物品', `
        <div class="form-group">
            <label>名称</label>
            <input type="text" id="lib-item-name" placeholder="物品名称">
        </div>
        <div class="form-group">
            <label>图标（支持内置图标名，如 sword / potion / box）</label>
            <input type="text" id="lib-item-icon" value="box">
        </div>
        <div class="form-group">
            <label>分类</label>
            <select id="lib-item-category">
                ${catOptions}
            </select>
        </div>

        <div class="form-group">
            <label>描述</label>
            <textarea id="lib-item-desc" rows="2"></textarea>
        </div>
    `, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        { text: '添加', class: 'btn-primary', action: async (btn) => {
            const name = document.getElementById('lib-item-name').value;
            if (!name) {
                showToast('请输入物品名称', 'error');
                return;
            }
            
            // 防止重复点击
            if (btn && btn.disabled) return;
            if (btn) {
                btn.disabled = true;
                btn.textContent = '添加中...';
            }
            
            try {
                const icon = document.getElementById('lib-item-icon').value;
                const category = document.getElementById('lib-item-category').value;
                const description = document.getElementById('lib-item-desc').value;
                
                const result = await apiRequest('/api/items/library/add', 'POST', {
                    name, icon, description, category_id: category
                });
                
                if (result && result.success) {
                    appData.itemLibrary = result.items || [];
                    renderItemLibrary();
                    showToast('添加成功', 'success');
                    closeModal();
                } else {
                    var errorMsg = '未知错误';
                    if (result && result.error) {
                        errorMsg = result.error;
                    }
                    showToast('添加失败：' + errorMsg, 'error');
                }
            } catch (e) {
                console.error('添加物品失败:', e);
                var errMsg = '添加失败，请重试';
                if (e && e.message) {
                    errMsg = '添加失败: ' + e.message;
                }
                showToast(errMsg, 'error');
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = '添加';
                }
            }
        }}
    ]);
}

// 显示物品库物品详情
function showLibraryItemDetail(itemId) {
    const item = appData.itemLibrary.find(i => i.id === itemId);
    if (!item) return;
    
    const cat = itemCategories.find(c => c.id === item.category_id);
    const catLabel = cat ? ((typeof SvgIconLib !== 'undefined' && SvgIconLib.renderAuto ? SvgIconLib.renderAuto(cat.icon || 'folder', 14) : (cat.icon || '📁')) + ' ' + cat.name) : getCategoryName(item.category_id);
    
    showModal(item.name, `
        <div style="text-align: center; margin-bottom: 16px;">
            <div style="font-size: 48px;">${SvgIconLib.renderAuto(item.icon, 48)}</div>
        </div>
        <p><strong>ID:</strong> <code style="background: var(--bg-color); padding: 2px 6px; border-radius: 4px; font-size: 12px;">${item.id}</code></p>
        <p><strong>分类:</strong> ${catLabel}</p>
        <p><strong>描述:</strong> ${item.description || '暂无描述'}</p>
    `, [
        { text: `${SvgIconLib.render('backpack', 12)} 添加到背包`, class: 'btn-primary', action: () => { closeModal(); setTimeout(() => addItemFromLibrary(itemId), 300); } },
        { text: '编辑', class: 'btn-secondary', action: () => showEditLibraryItem(item.id) },
        { text: `${SvgIconLib.render('edit', 12)} 备注`, class: 'btn-secondary', action: () => showLibraryItemQuickNote(item.id) },
        { text: '关闭', class: 'btn-secondary', action: closeModal },
        { text: '删除', class: 'btn-danger', action: () => deleteLibraryItem(item.id) }
    ]);
}

// 物品库快速备注
async function showLibraryItemQuickNote(itemId) {
    const item = appData.itemLibrary.find(i => i.id === itemId);
    if (!item) return;
    
    showModal('快速备注 - ' + item.name, `
        <div style="text-align:center;margin-bottom:12px;font-size:36px;">${SvgIconLib.renderAuto(item.icon, 36)}</div>
        <div class="form-group">
            <label>备注内容</label>
            <textarea id="lib-quick-note-text" rows="4" placeholder="输入备注...">${item.description || ''}</textarea>
        </div>
    `, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        { text: '保存', class: 'btn-primary', action: async () => {
            const note = document.getElementById('lib-quick-note-text').value;
            const result = await apiRequest('/api/items/library/edit', 'POST', {
                item_id: itemId,
                description: note
            });
            if (result && result.success) {
                appData.itemLibrary = result.items || appData.itemLibrary;
                renderItemLibrary();
                showToast('备注已保存', 'success');
                closeModal();
            }
        }}
    ]);
}



// ==================== 自定义功能模块（合并自custom_features.js） ====================



// 从背包物品学习技能
async function learnSkillFromItem(itemId) {
    try {
        const result = await apiRequest('/api/skills/learn-item', 'POST', { item_id: itemId });
        
        if (result && result.success) {
            // 保存技能数据（兼容对象和数组格式）
            appData.skills = result.skills;
            appData.inventory = result.inventory;
            
            // 重新渲染
            if (typeof renderSkills === 'function') {
                try {
                    renderSkills();
                } catch(e) {
                    console.error('渲染技能失败:', e);
                }
            }
            if (typeof renderInventory === 'function') {
                try {
                    renderInventory();
                } catch(e) {
                    console.error('渲染背包失败:', e);
                }
            }
            
            showToast('技能学习成功', 'success');
        } else {
            const msg = result?.message || '学习失败';
            console.error('学习技能失败:', msg, result);
            showToast(msg, 'error');
        }
    } catch(e) {
        console.error('学习技能异常:', e);
        showToast('学习出错: ' + e.message, 'error');
    }
}
