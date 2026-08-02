// ============================================================
// 原有模块注册到 ModuleRegistry
// 将现有的 13 个页面模块注册到注册表中
// ============================================================

(function() {
    'use strict';

    // SVG 图标定义
    const svgIcons = {
        character: '<svg viewBox="0 0 24 24"><path d="M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm0 10c-4.42 0-8 1.79-8 4v2h16v-2c0-2.21-3.58-4-8-4z"/></svg>',
        currency: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor"/><line x1="12" y1="3" x2="12" y2="5" stroke="currentColor" stroke-width="1.5"/><line x1="12" y1="19" x2="12" y2="21" stroke="currentColor" stroke-width="1.5"/><line x1="3" y1="12" x2="5" y2="12" stroke="currentColor" stroke-width="1.5"/><line x1="19" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="1.5"/></svg>',
        inventory: '<svg viewBox="0 0 24 24"><path d="M5 8c0-2.2 1.8-4 4-4h6c2.2 0 4 1.8 4 4v1H5V8z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4 10h16l-1.5 10a2 2 0 0 1-2 1.7H7.5a2 2 0 0 1-2-1.7L4 10z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9 6c0-1 .8-2 2-2h2c1.2 0 2 1 2 2" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
        item_library: '<svg viewBox="0 0 24 24"><rect x="3" y="10" width="18" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3 10l2-4h14l2 4" fill="none" stroke="currentColor" stroke-width="1.8"/><line x1="12" y1="10" x2="12" y2="21" stroke="currentColor" stroke-width="1.2"/><circle cx="12" cy="15" r="1.5" fill="currentColor"/></svg>',
        equipment: '<svg viewBox="0 0 24 24"><path d="M14.5 3.5L5 13l3 3 9.5-9.5-3-3z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5 13l-2 5 5-2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M17.5 6.5l2-2a1.4 1.4 0 0 0 0-2l-1-1a1.4 1.4 0 0 0-2 0l-2 2" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
        quests: '<svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M15 3v4h4" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="8" y1="10" x2="16" y2="10" stroke="currentColor" stroke-width="1.3"/><line x1="8" y1="14" x2="14" y2="14" stroke="currentColor" stroke-width="1.3"/><line x1="8" y1="18" x2="12" y2="18" stroke="currentColor" stroke-width="1.3"/></svg>',
        skills: '<svg viewBox="0 0 24 24"><polygon points="12,2 15,9 22,9 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9 9,9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
        story: '<svg viewBox="0 0 24 24"><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22.5v-18z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4 22.5A2.5 2.5 0 0 1 6.5 20H20" fill="none" stroke="currentColor" stroke-width="1.8"/><line x1="9" y1="7" x2="16" y2="7" stroke="currentColor" stroke-width="1.2"/><line x1="9" y1="11" x2="15" y2="11" stroke="currentColor" stroke-width="1.2"/><line x1="9" y1="15" x2="13" y2="15" stroke="currentColor" stroke-width="1.2"/></svg>',
        map: '<svg viewBox="0 0 24 24"><path d="M2 18l4-8 4 5 4-10 4 6 4-3v12H2z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="8" cy="5" r="2" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
        relation: '<svg viewBox="0 0 24 24"><circle cx="8" cy="8" r="3.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="16" cy="16" r="3.5" fill="none" stroke="currentColor" stroke-width="1.8"/><line x1="11" y1="11" x2="13" y2="13" stroke="currentColor" stroke-width="2"/><path d="M10.5 7.5l1 1M12.5 15.5l1 1" stroke="currentColor" stroke-width="1.3"/></svg>',
        custom: '<svg viewBox="0 0 24 24"><path d="M3 21l1.5-4.5L17.3 3.7a1.4 1.4 0 0 1 2 0l1 1a1.4 1.4 0 0 1 0 2L7.5 19.5 3 21z" fill="none" stroke="currentColor" stroke-width="1.8"/><line x1="14" y1="7" x2="17" y2="10" stroke="currentColor" stroke-width="1.3"/></svg>',
        preview: '<svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
        tools: '<svg viewBox="0 0 24 24"><path d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97s-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65A.488.488 0 0 0 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1s.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.58 1.69-.98l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'
    };

    // ==================== 预览渲染函数 ====================

    function previewCharacter(data) {
        const ad = data || window.appData;
        if (!ad || !ad.character) return '<p>暂无角色数据</p>';
        let html = '<div class="preview-item">';
        html += `<p><strong>名称：</strong>${ad.character.name || '未命名'}</p>`;
        html += `<p><strong>${ad.character.level_label || '等级'}：</strong>${ad.character.level || 1}</p>`;
        html += '<p><strong>属性：</strong></p><ul style="margin-left:20px;">';
        const stats = ad.character.stats || {};
        for (const [key, value] of Object.entries(stats)) {
            if (['inventory','equipment','skills','name','template','level','id','level_label'].indexOf(key) === -1) {
                html += `<li>${key}: ${value}</li>`;
            }
        }
        html += '</ul></div>';
        return html;
    }

    function previewCurrency(data) {
        const ad = data || window.appData;
        if (!ad || !ad.currency || Object.keys(ad.currency).length === 0) return '<p>暂无货币数据</p>';
        let html = '<ul style="margin-left:20px;">';
        for (const [key, value] of Object.entries(ad.currency)) {
            const typeInfo = ad.currencyTypes ? ad.currencyTypes[key] || {} : {};
            const name = typeInfo.name || key;
            const icon = typeInfo.icon || '🪙';
            html += `<li>${icon} ${name}: ${typeof formatCurrencyNumber === 'function' ? formatCurrencyNumber(value) : value}</li>`;
        }
        html += '</ul>';
        return html;
    }

    function previewInventory(data) {
        const ad = data || window.appData;
        if (!ad || !ad.inventory || ad.inventory.length === 0) return '<p>背包为空</p>';
        let html = '<ul style="margin-left:20px;">';
        ad.inventory.forEach(item => {
            html += `<li>${item.icon || '📦'} ${item.name || item.id} × ${item.quantity || 1}</li>`;
        });
        html += '</ul>';
        return html;
    }

    function previewEquipment(data) {
        const ad = data || window.appData;
        if (!ad || !ad.equipmentSlots) return '<p>暂无装备槽位</p>';
        const slots = Array.isArray(ad.equipmentSlots) ? ad.equipmentSlots : Object.values(ad.equipmentSlots);
        if (slots.length === 0) return '<p>暂无装备槽位</p>';
        let html = '<ul style="margin-left:20px;">';
        slots.forEach(slot => {
            const item = slot.item;
            if (item) {
                html += `<li>${slot.name}: ${item.icon || '⚔️'} ${item.name || item.id}</li>`;
            } else {
                html += `<li>${slot.name}: （空）</li>`;
            }
        });
        html += '</ul>';
        return html;
    }

    function previewItemLibrary(data) {
        const ad = data || window.appData;
        if (!ad || !ad.itemLibrary || ad.itemLibrary.length === 0) return '<p>暂无物品</p>';
        return `<p>共 ${ad.itemLibrary.length} 件物品</p>`;
    }

    function previewQuests(data) {
        const ad = data || window.appData;
        if (!ad || !ad.quests || ad.quests.length === 0) return '<p>暂无任务</p>';
        let html = '<ul style="margin-left:20px;">';
        ad.quests.forEach(quest => {
            const status = quest.completed ? '✅ 已完成' : '⏳ 进行中';
            html += `<li>${quest.icon || '📜'} ${quest.name || quest.id} - ${status}</li>`;
        });
        html += '</ul>';
        return html;
    }

    function previewSkills(data) {
        const ad = data || window.appData;
        if (!ad || !ad.skills || ad.skills.length === 0) return '<p>暂无技能</p>';
        let html = '<ul style="margin-left:20px;">';
        ad.skills.forEach(skill => {
            html += `<li>${skill.icon || '✨'} ${skill.name || skill.id}（Lv.${skill.level || 1}）</li>`;
        });
        html += '</ul>';
        return html;
    }

    function previewStory(data) {
        const ad = data || window.appData;
        let html = '';
        if (ad && ad.storyMarks && ad.storyMarks.length > 0) {
            html += '<p><strong>剧情标记：</strong></p><ul style="margin-left:20px;">';
            ad.storyMarks.forEach((mark, i) => {
                html += `<li>${mark.title || '标记' + (i+1)}</li>`;
            });
            html += '</ul>';
        }
        if (ad && ad.foreshadowing && ad.foreshadowing.length > 0) {
            html += '<p style="margin-top:8px;"><strong>伏笔：</strong></p><ul style="margin-left:20px;">';
            ad.foreshadowing.forEach((item, i) => {
                const status = item.resolved ? '✅ 已回收' : '⏳ 未回收';
                html += `<li>${item.title || '伏笔' + (i+1)} - ${status}</li>`;
            });
            html += '</ul>';
        }
        return html || '<p>暂无剧情数据</p>';
    }

    function previewMap(data) {
        const ad = data || window.appData;
        const mapLocations = (typeof window._mapData !== 'undefined' && window._mapData && window._mapData.locations) || {};
        const locationList = Object.entries(mapLocations);
        if (locationList.length === 0) return '<p>暂无地点数据</p>';
        let html = '<ul style="margin-left:20px;">';
        locationList.forEach(([id, loc]) => {
            html += `<li>${loc.icon || '📍'} ${loc.name || id}</li>`;
        });
        html += '</ul>';
        return html;
    }

    function previewRelation(data) {
        const characters = (typeof v183Data !== 'undefined' && v183Data && v183Data.characters) || [];
        const relations = (typeof v183Data !== 'undefined' && v183Data && v183Data.relations) || [];
        if (characters.length === 0) return '<p>暂无人物数据</p>';
        let html = '<ul style="margin-left:20px;">';
        characters.forEach(char => {
            const charRelations = relations.filter(r => r.character_id === char.id || r.target_id === char.id);
            html += `<li>${char.icon || '👤'} ${char.name || char.id}（${charRelations.length} 条关系）</li>`;
        });
        html += '</ul>';
        return html;
    }

    function previewCustom(data) {
        const ad = data || window.appData;
        if (!ad || !ad.customCategories || ad.customCategories.length === 0) return '';
        let html = '';
        ad.customCategories.forEach(cat => {
            html += `<h4 style="margin-top:12px;margin-bottom:8px;">${cat.icon || '📁'} ${cat.name || cat.id}</h4>`;
            if (cat.items && cat.items.length > 0) {
                html += '<ul style="margin-left:20px;">';
                cat.items.forEach(item => {
                    html += `<li>${item.name || item.id || '未命名条目'}</li>`;
                });
                html += '</ul>';
            } else {
                html += '<p style="color:#9ca3af;font-size:14px;">暂无条目</p>';
            }
        });
        return html;
    }

    // ==================== 搜索索引函数 ====================

    function searchCharacter(data, query) {
        const ad = data || window.appData;
        const results = [];
        if (ad && ad.character) {
            const name = ad.character.name || '';
            if (name.toLowerCase().includes(query)) {
                results.push({ name: '角色: ' + name, page: 'character' });
            }
            const stats = ad.character.stats || {};
            for (const [key, value] of Object.entries(stats)) {
                if (['inventory','equipment','skills','name','template','level','id','level_label'].indexOf(key) === -1) {
                    if (String(value).toLowerCase().includes(query)) {
                        results.push({ name: `角色属性 ${key}: ${value}`, page: 'character' });
                    }
                }
            }
        }
        return results;
    }

    function searchCurrency(data, query) {
        const ad = data || window.appData;
        const results = [];
        if (ad && ad.currency) {
            for (const [key, value] of Object.entries(ad.currency)) {
                const typeInfo = ad.currencyTypes ? ad.currencyTypes[key] || {} : {};
                const name = typeInfo.name || key;
                if (name.toLowerCase().includes(query)) {
                    results.push({ name: `货币: ${name}`, page: 'currency' });
                }
            }
        }
        return results;
    }

    function searchInventory(data, query) {
        const ad = data || window.appData;
        const results = [];
        if (ad && ad.inventory) {
            const list = Array.isArray(ad.inventory) ? ad.inventory : Object.values(ad.inventory);
            list.forEach(item => {
                if ((item.name || '').toLowerCase().includes(query)) {
                    results.push({ name: `物品: ${item.name || item.id}`, page: 'inventory' });
                }
            });
        }
        return results;
    }

    function searchQuests(data, query) {
        const ad = data || window.appData;
        const results = [];
        if (ad && ad.quests) {
            const list = Array.isArray(ad.quests) ? ad.quests : Object.values(ad.quests);
            list.forEach(quest => {
                if ((quest.name || '').toLowerCase().includes(query) || (quest.description || '').toLowerCase().includes(query)) {
                    results.push({ name: `任务: ${quest.name || quest.id}`, page: 'quests' });
                }
            });
        }
        return results;
    }

    function searchSkills(data, query) {
        const ad = data || window.appData;
        const results = [];
        if (ad && ad.skills) {
            const list = Array.isArray(ad.skills) ? ad.skills : Object.values(ad.skills);
            list.forEach(skill => {
                if ((skill.name || '').toLowerCase().includes(query) || (skill.description || '').toLowerCase().includes(query)) {
                    results.push({ name: `技能: ${skill.name || skill.id}`, page: 'skills' });
                }
            });
        }
        return results;
    }

    function searchStory(data, query) {
        const ad = data || window.appData;
        const results = [];
        if (ad && ad.storyMarks) {
            ad.storyMarks.forEach(mark => {
                if ((mark.title || '').toLowerCase().includes(query) || (mark.content || '').toLowerCase().includes(query)) {
                    results.push({ name: `剧情标记: ${mark.title || '未命名'}`, page: 'story' });
                }
            });
        }
        if (ad && ad.foreshadowing) {
            ad.foreshadowing.forEach(item => {
                if ((item.title || '').toLowerCase().includes(query) || (item.content || '').toLowerCase().includes(query)) {
                    results.push({ name: `伏笔: ${item.title || '未命名'}`, page: 'story' });
                }
            });
        }
        return results;
    }

    function searchMap(data, query) {
        const results = [];
        const mapLocations = (typeof window._mapData !== 'undefined' && window._mapData && window._mapData.locations) || {};
        for (const [id, loc] of Object.entries(mapLocations)) {
            if ((loc.name || '').toLowerCase().includes(query) || (loc.description || '').toLowerCase().includes(query)) {
                results.push({ name: `地点: ${loc.name || id}`, page: 'map' });
            }
        }
        return results;
    }

    function searchRelation(data, query) {
        const results = [];
        const characters = (typeof v183Data !== 'undefined' && v183Data && v183Data.characters) || [];
        characters.forEach(char => {
            if ((char.name || '').toLowerCase().includes(query)) {
                results.push({ name: `人物: ${char.name || char.id}`, page: 'relation' });
            }
        });
        return results;
    }

    function searchItemLibrary(data, query) {
        const ad = data || window.appData;
        const results = [];
        if (ad && ad.itemLibrary) {
            ad.itemLibrary.forEach(item => {
                if ((item.name || '').toLowerCase().includes(query) || (item.description || '').toLowerCase().includes(query)) {
                    results.push({ name: `物品库: ${item.name || item.id}`, page: 'item-library' });
                }
            });
        }
        return results;
    }

    function searchCustom(data, query) {
        const ad = data || window.appData;
        const results = [];
        if (ad && ad.customCategories) {
            ad.customCategories.forEach(cat => {
                if (cat.items) {
                    cat.items.forEach(item => {
                        if ((item.name || '').toLowerCase().includes(query)) {
                            results.push({ name: `${cat.name}: ${item.name}`, page: 'custom' });
                        }
                    });
                }
            });
        }
        return results;
    }

    // ==================== 导出格式化函数 ====================

    function exportCharacter(data) {
        const ad = data || window.appData;
        if (!ad || !ad.character) return '';
        const c = ad.character;
        let text = '=== 角色信息 ===\n\n';
        text += `名称: ${c.name || '未命名'}\n`;
        text += `${c.level_label || '等级'}: ${c.level || 1}\n`;
        const stats = c.stats || {};
        const skipKeys = ['inventory','equipment','skills','name','template','level','id','level_label'];
        const statEntries = Object.entries(stats).filter(([k]) => !skipKeys.includes(k));
        if (statEntries.length > 0) {
            text += '\n属性:\n';
            statEntries.forEach(([k, v]) => { text += `  ${k}: ${v}\n`; });
        }
        return text;
    }

    function exportCurrency(data) {
        const ad = data || window.appData;
        if (!ad || !ad.currency || Object.keys(ad.currency).length === 0) return '';
        let text = '=== 货币 ===\n\n';
        for (const [key, value] of Object.entries(ad.currency)) {
            const typeInfo = ad.currencyTypes ? ad.currencyTypes[key] || {} : {};
            text += `${typeInfo.icon || '🪙'} ${typeInfo.name || key}: ${value}\n`;
        }
        return text;
    }

    function exportInventory(data) {
        const ad = data || window.appData;
        if (!ad || !ad.inventory || ad.inventory.length === 0) return '';
        let text = '=== 背包物品 ===\n\n';
        ad.inventory.forEach(item => {
            text += `${item.icon || '📦'} ${item.name || item.id} x${item.quantity || 1}`;
            if (item.id) text += ` [ID: ${item.id}]`;
            text += '\n';
        });
        return text;
    }

    function exportItemLibrary(data) {
        const ad = data || window.appData;
        if (!ad || !ad.itemLibrary || ad.itemLibrary.length === 0) return '';
        let text = '=== 物品库 ===\n\n';
        ad.itemLibrary.forEach(item => {
            text += `${item.icon || '📦'} ${item.name || '未命名'}`;
            if (item.id) text += ` [ID: ${item.id}]`;
            if (item.description) text += ` - ${item.description}`;
            text += '\n';
        });
        return text;
    }

    function exportEquipment(data) {
        const ad = data || window.appData;
        if (!ad || !ad.equipmentSlots) return '';
        const slots = Array.isArray(ad.equipmentSlots) ? ad.equipmentSlots : Object.values(ad.equipmentSlots);
        if (slots.length === 0) return '';
        let text = '=== 装备 ===\n\n';
        slots.forEach(slot => {
            const item = slot.item;
            if (item) {
                text += `${slot.name}: ${item.icon || '⚔️'} ${item.name || item.id}`;
                if (item.id) text += ` [ID: ${item.id}]`;
                text += '\n';
            } else {
                text += `${slot.name}: (空)\n`;
            }
        });
        return text;
    }

    function exportQuests(data) {
        const ad = data || window.appData;
        if (!ad || !ad.quests || ad.quests.length === 0) return '';
        let text = '=== 任务 ===\n\n';
        const statusMap = { 'in_progress': '进行中', 'completed': '已完成', 'failed': '已失败', 'available': '可接取' };
        ad.quests.forEach(quest => {
            const status = statusMap[quest.status] || quest.status || '未知';
            text += `${quest.icon || '📜'} ${quest.name || quest.title || quest.id}`;
            if (quest.id) text += ` [ID: ${quest.id}]`;
            text += ` - ${status}\n`;
            if (quest.description) text += `  ${quest.description}\n`;
        });
        return text;
    }

    function exportSkills(data) {
        const ad = data || window.appData;
        if (!ad || !ad.skills || ad.skills.length === 0) return '';
        let text = '=== 技能 ===\n\n';
        ad.skills.forEach(skill => {
            text += `${skill.icon || '✨'} ${skill.name || skill.id} Lv.${skill.level || 1}`;
            if (skill.id) text += ` [ID: ${skill.id}]`;
            text += '\n';
            if (skill.description) text += `  ${skill.description}\n`;
        });
        return text;
    }

    function exportStory(data) {
        const ad = data || window.appData;
        let text = '';
        if (ad && ad.storyMarks && ad.storyMarks.length > 0) {
            text += '=== 剧情标记 ===\n\n';
            ad.storyMarks.forEach((mark, i) => {
                const id = mark.id || mark.mark_id || (i + 1);
                text += `#${id} ${mark.title || '未命名'}`;
                if (mark.id) text += ` [ID: ${mark.id}]`;
                text += '\n';
                if (mark.description) text += `  ${mark.description}\n`;
            });
        }
        if (ad && ad.foreshadowing && ad.foreshadowing.length > 0) {
            text += '\n=== 伏笔 ===\n\n';
            ad.foreshadowing.forEach((item, i) => {
                const status = item.resolved ? '已回收' : '未回收';
                text += `${item.title || '伏笔' + (i+1)}`;
                if (item.id) text += ` [ID: ${item.id}]`;
                text += ` - ${status}\n`;
                if (item.description) text += `  ${item.description}\n`;
            });
        }
        return text || '';
    }

    function exportMap(data) {
        const ad = data || window.appData;
        const mapLocations = (ad && ad.locations) || (typeof window._mapData !== 'undefined' && window._mapData && window._mapData.locations) || {};
        const entries = Array.isArray(mapLocations) ? mapLocations : Object.entries(mapLocations);
        if (entries.length === 0) return '';
        let text = '=== 地图地点 ===\n\n';
        entries.forEach(entry => {
            const loc = Array.isArray(entry) ? entry[1] : entry;
            const locId = Array.isArray(entry) ? entry[0] : (loc.id || '');
            text += `${loc.icon || '📍'} ${loc.name || locId}`;
            if (locId) text += ` [ID: ${locId}]`;
            text += '\n';
            if (loc.description) text += `  ${loc.description}\n`;
        });
        return text;
    }

    function exportRelation(data) {
        const characters = (typeof v183Data !== 'undefined' && v183Data && v183Data.characters) || (data && data.characters) || [];
        const relations = (typeof v183Data !== 'undefined' && v183Data && v183Data.relations) || (data && data.relations) || [];
        if (characters.length === 0) return '';
        let text = '=== 人物关系 ===\n\n';
        text += `角色数: ${characters.length}\n关系数: ${relations.length}\n\n`;
        characters.forEach(char => {
            text += `${char.icon || '👤'} ${char.name || char.id}`;
            if (char.id) text += ` [ID: ${char.id}]`;
            text += '\n';
            const charRels = relations.filter(r => r.character_id === char.id || r.target_id === char.id);
            charRels.forEach(r => {
                const otherId = r.character_id === char.id ? r.target_id : r.character_id;
                const other = characters.find(c => c.id === otherId);
                text += `  → ${r.type || r.relation_type || '相关'} → ${other ? other.name : otherId}\n`;
            });
        });
        return text;
    }

    function exportCustom(data) {
        const ad = data || window.appData;
        if (!ad || !ad.customCategories || ad.customCategories.length === 0) return '';
        let text = '=== 自定义数据 ===\n\n';
        ad.customCategories.forEach(cat => {
            text += `\n--- ${cat.icon || '📁'} ${cat.name || cat.id} ---\n`;
            if (cat.items && cat.items.length > 0) {
                cat.items.forEach(item => {
                    text += `  ${item.name || item.id || '未命名条目'}`;
                    if (item.id) text += ` [ID: ${item.id}]`;
                    text += '\n';
                });
            } else {
                text += '  (无条目)\n';
            }
        });
        return text;
    }

    // ==================== 注册所有原有模块 ====================

    // --- 角色成长组 ---
    ModuleRegistry.register({
        id: 'character', name: '角色信息', icon: 'user', group: 'character',
        svgIcon: svgIcons.character, order: 1,
        dataKeys: ['character'],
        previewRenderer: previewCharacter,
        exportFormatter: exportCharacter,
        searchIndexer: searchCharacter
    });

    ModuleRegistry.register({
        id: 'currency', name: '货币', icon: 'coin', group: 'character',
        svgIcon: svgIcons.currency, order: 2,
        dataKeys: ['currency', 'currency_types'],
        previewRenderer: previewCurrency,
        exportFormatter: exportCurrency,
        searchIndexer: searchCurrency
    });

    ModuleRegistry.register({
        id: 'inventory', name: '背包', icon: 'backpack', group: 'character',
        svgIcon: svgIcons.inventory, order: 3,
        dataKeys: ['inventory'],
        previewRenderer: previewInventory,
        exportFormatter: exportInventory,
        searchIndexer: searchInventory
    });

    ModuleRegistry.register({
        id: 'item-library', name: '物品库', icon: 'shop', group: 'character',
        svgIcon: svgIcons.item_library, order: 4,
        dataKeys: ['item_library', 'item_categories'],
        previewRenderer: previewItemLibrary,
        exportFormatter: exportItemLibrary,
        searchIndexer: searchItemLibrary
    });

    ModuleRegistry.register({
        id: 'equipment', name: '装备', icon: 'sword', group: 'character',
        svgIcon: svgIcons.equipment, order: 5,
        dataKeys: ['equipment', 'equipment_slots'],
        previewRenderer: previewEquipment,
        exportFormatter: exportEquipment,
        searchIndexer: null
    });

    ModuleRegistry.register({
        id: 'quests', name: '任务', icon: 'scroll', group: 'character',
        svgIcon: svgIcons.quests, order: 6,
        dataKeys: ['quests', 'quests_custom'],
        previewRenderer: previewQuests,
        exportFormatter: exportQuests,
        searchIndexer: searchQuests
    });

    ModuleRegistry.register({
        id: 'skills', name: '技能', icon: 'spark', group: 'character',
        svgIcon: svgIcons.skills, order: 7,
        dataKeys: ['skills', 'skills_custom'],
        previewRenderer: previewSkills,
        exportFormatter: exportSkills,
        searchIndexer: searchSkills
    });

    // --- 剧情相关（v3.2.0 合并进 character 组） ---
    ModuleRegistry.register({
        id: 'story', name: '剧情', icon: 'book', group: 'character',
        svgIcon: svgIcons.story, order: 10,
        dataKeys: ['story'],
        previewRenderer: previewStory,
        exportFormatter: exportStory,
        searchIndexer: searchStory
    });

    ModuleRegistry.register({
        id: 'relation', name: '关系', icon: 'user_group', group: 'character',
        svgIcon: svgIcons.relation, order: 11,
        dataKeys: ['characters', 'relations', 'relation_types'],
        previewRenderer: previewRelation,
        exportFormatter: exportRelation,
        searchIndexer: searchRelation
    });

    ModuleRegistry.register({
        id: 'map', name: '地图', icon: 'map', group: 'character',
        svgIcon: svgIcons.map, order: 12,
        dataKeys: ['locations', 'location_types'],
        previewRenderer: previewMap,
        exportFormatter: exportMap,
        searchIndexer: searchMap
    });

    ModuleRegistry.register({
        id: 'custom', name: '自定义', icon: 'edit', group: 'character',
        svgIcon: svgIcons.custom, order: 13,
        dataKeys: ['custom_categories', 'custom_items'],
        previewRenderer: previewCustom,
        exportFormatter: exportCustom,
        searchIndexer: searchCustom
    });

    // --- 系统组 ---
    ModuleRegistry.register({
        id: 'preview', name: '数据预览', icon: 'eye', group: 'system',
        svgIcon: svgIcons.preview, order: 1, hidden: true,
        dataKeys: [],
        previewRenderer: null,
        searchIndexer: null
    });

    ModuleRegistry.register({
        id: 'tools', name: '工具', icon: 'settings', group: 'system',
        svgIcon: svgIcons.tools, order: 2,
        dataKeys: ['settings', 'export_order', 'buttons_config'],
        previewRenderer: null,
        searchIndexer: null
    });

    console.log('[LegacyModules] 已注册', Object.keys(ModuleRegistry.getAllModules()).length, '个原有模块');
})();
