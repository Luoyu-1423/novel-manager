// ============================================================
// 小说数据管理器 - 高级功能模块 (advanced_features.js)
// 版本: 3.0.0
// 功能: 包含角色编辑、自定义数据管理等高级功能
// 依赖: app.js (需要先加载app.js)
// ============================================================

// ==================== 角色模板管理 ====================

// 显示模板管理器
function showTemplateManager() {
    apiRequest('/api/character/templates').then(templates => {
        if (!templates || !Array.isArray(templates)) templates = [];
            let html = `
                <div class="modal-header">
                    <h3>${(typeof SvgIconLib !== 'undefined' && SvgIconLib.render) ? SvgIconLib.render('user', 16) : '👤'} 角色模板管理</h3>
                    <button class="modal-close" onclick="closeModal()">×</button>
                </div>
                <div class="modal-body">
                    <div class="modal-actions">
                        <button class="btn-primary" onclick="showAddTemplateModal()">+ 新建模板</button>
                    </div>
                    <div class="template-list">
            `;
            
            templates.forEach(template => {
                html += `
                    <div class="template-card">
                        <div class="template-info">
                            <h4>${template.name || template.id}</h4>
                            <p class="template-desc">ID: ${template.id}</p>
                        </div>
                        <div class="template-actions">
                            <button class="btn-small" onclick="editTemplate('${template.id}')">${(typeof SvgIconLib !== 'undefined' && SvgIconLib.render) ? SvgIconLib.render('edit', 12) : '✏️'} 编辑</button>
                            <button class="btn-small btn-danger" onclick="deleteTemplate('${template.id}')">${(typeof SvgIconLib !== 'undefined' && SvgIconLib.render) ? SvgIconLib.render('trash', 12) : '🗑️'} 删除</button>
                        </div>
                    </div>
                `;
            });
            
            if (templates.length === 0) {
                html += '<div class="empty-state"><p>暂无模板</p></div>';
            }
            
            html += `
                    </div>
                </div>
            `;
            
            showModal('编辑角色', html, [
                { text: '取消', class: 'btn-secondary', action: closeModal },
                { text: '保存修改', class: 'btn-primary', action: saveEditCharacter }
            ]);
        })
        .catch(error => {
            showToast('加载失败');
            console.error(error);
        });
}

// 显示添加模板弹窗
function showAddTemplateModal() {
    const html = `
        <div class="modal-header">
            <h3>${(typeof SvgIconLib !== 'undefined' && SvgIconLib.render) ? SvgIconLib.render('plus', 16) : '➕'} 新建角色模板</h3>
            <button class="modal-close" onclick="closeModal()">×</button>
        </div>
        <div class="modal-body">
            <div class="form-group">
                <label>模板ID</label>
                <input type="text" id="new-template-id" placeholder="例如: warrior, mage">
            </div>
            <div class="form-group">
                <label>模板名称</label>
                <input type="text" id="new-template-name" placeholder="例如: 战士模板">
            </div>
            <div class="form-group">
                <label>描述</label>
                <textarea id="new-template-desc" placeholder="模板描述"></textarea>
            </div>
            <div class="form-group">
                <label>基础属性（JSON格式）</label>
                <textarea id="new-template-stats" placeholder='{"hp": 100, "attack": 10}'></textarea>
            </div>
            <div class="modal-actions">
                <button class="btn-secondary" onclick="showTemplateManager()">返回</button>
                <button class="btn-primary" onclick="addTemplate()">创建模板</button>
            </div>
        </div>
    `;
    showModal(html);
}

// 添加模板
function addTemplate() {
    const templateId = document.getElementById('new-template-id').value.trim();
    const templateName = document.getElementById('new-template-name').value.trim();
    const templateDesc = document.getElementById('new-template-desc').value.trim();
    const statsStr = document.getElementById('new-template-stats').value.trim();
    
    if (!templateId || !templateName) {
        showToast('请填写模板ID和名称');
        return;
    }
    
    let baseStats = {};
    if (statsStr) {
        try {
            baseStats = JSON.parse(statsStr);
        } catch (e) {
            showToast('属性格式错误，请输入正确的JSON');
            return;
        }
    }
    
    const templateData = {
        name: templateName,
        description: templateDesc,
        base_stats: baseStats,
        inventory: [],
        equipment: {},
        skills: []
    };
    
    apiRequest('/api/character/templates/create', 'POST', {
        id: templateId,
        data: templateData
    })
    .then(data => {
        if (data && data.success) {
            showToast('创建成功');
            showTemplateManager();
        } else {
            showToast('创建失败：' + (data && data.message || '未知错误'));
        }
    })
    .catch(error => {
        showToast('创建失败');
        console.error(error);
    });
}

// 编辑模板
function editTemplate(templateId) {
    apiRequest('/api/character/templates').then(templates => {
        if (!templates || !Array.isArray(templates)) templates = [];
        const template = templates.find(t => t.id === templateId);
            if (!template) {
                showToast('模板不存在');
                return;
            }
            
            const html = `
                <div class="modal-header">
                    <h3>${(typeof SvgIconLib !== 'undefined' && SvgIconLib.render) ? SvgIconLib.render('edit', 16) : '✏️'} 编辑模板</h3>
                    <button class="modal-close" onclick="closeModal()">×</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>模板名称</label>
                        <input type="text" id="edit-template-name" value="${template.name || ''}">
                    </div>
                    <div class="form-group">
                        <label>描述</label>
                        <textarea id="edit-template-desc">${template.description || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label>基础属性（JSON格式）</label>
                        <textarea id="edit-template-stats">${JSON.stringify(template.base_stats || {}, null, 2)}</textarea>
                    </div>
                    <div class="modal-actions">
                        <button class="btn-secondary" onclick="showTemplateManager()">返回</button>
                        <button class="btn-primary" onclick="saveEditTemplate('${templateId}')">保存修改</button>
                    </div>
                </div>
            `;
            showModal('编辑角色', html, [
                { text: '取消', class: 'btn-secondary', action: closeModal },
                { text: '保存修改', class: 'btn-primary', action: saveEditCharacter }
            ]);
        })
        .catch(error => {
            showToast('加载失败');
            console.error(error);
        });
}

// 保存模板编辑
function saveEditTemplate(templateId) {
    const templateName = document.getElementById('edit-template-name').value.trim();
    const templateDesc = document.getElementById('edit-template-desc').value.trim();
    const statsStr = document.getElementById('edit-template-stats').value.trim();
    
    let baseStats = {};
    if (statsStr) {
        try {
            baseStats = JSON.parse(statsStr);
        } catch (e) {
            showToast('属性格式错误，请输入正确的JSON');
            return;
        }
    }
    
    const templateData = {
        name: templateName,
        description: templateDesc,
        base_stats: baseStats
    };
    
    apiRequest('/api/character/templates/edit', 'POST', {
        id: templateId,
        data: templateData
    })
    .then(data => {
        if (data && data.success) {
            showToast('保存成功');
            showTemplateManager();
        } else {
            showToast('保存失败：' + (data && data.message || '未知错误'));
        }
    })
    .catch(error => {
        showToast('保存失败');
        console.error(error);
    });
}

// 删除模板
async function deleteTemplate(templateId) {
    if (!(await UIUtils.confirmDialog('确定要删除这个模板吗？删除后无法恢复。'))) {
        return;
    }
    
    apiRequest('/api/character/templates/delete', 'POST', { id: templateId })
    .then(data => {
        if (data && data.success) {
            showToast('删除成功');
            showTemplateManager();
        } else {
            showToast('删除失败：' + (data && data.message || '未知错误'));
        }
    })
    .catch(error => {
        showToast('删除失败');
        console.error(error);
    });
}

// ============================================================
// 模块: 角色编辑功能
// ============================================================

// 显示编辑角色弹窗
// 参数: 无
// 返回: 无
// 效果: 弹出角色编辑窗口，可修改角色名称、等级、属性等
function showEditCharacter() {
    apiRequest('/api/character').then(character => {
        if (!character) { showToast('加载失败'); return; }
        const stats = character.stats || {};
            
            let statsHtml = '';
            for (let key in stats) {
                if (['inventory', 'equipment', 'skills', 'name', 'template', 'level', 'id'].indexOf(key) === -1) {
                    let value = stats[key];
                    // 处理对象类型的值，转换成字符串
                    if (typeof value === 'object' && value !== null) {
                        value = JSON.stringify(value);
                    }
                    // 转义引号，避免HTML属性冲突
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
                            <button type="button" class="btn-small btn-danger stat-delete-btn" onclick="deleteStat(this)">${(typeof SvgIconLib !== 'undefined' && SvgIconLib.render) ? SvgIconLib.render('trash', 12) : '🗑️'} 删除</button>
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
            `;
            showModal('编辑角色', html, [
                { text: '取消', class: 'btn-secondary', action: closeModal },
                { text: '保存修改', class: 'btn-primary', action: saveEditCharacter }
            ]);
        })
        .catch(error => {
            showToast('加载失败');
            console.error(error);
        });
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

// 保存角色编辑
// 参数: 无
// 返回: 无
// 效果: 将编辑后的角色数据保存到服务器
function saveEditCharacter() {
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
            // 尝试转换为数字
            if (!isNaN(value) && value !== '') {
                value = Number(value);
            }
            if (key) {
                stats[key] = value;
            }
        }
    });
    
    apiRequest('/api/character/edit', 'POST', {
        name: name,
        level: level,
        level_label: levelLabel,
        stats: stats
    })
    .then(data => {
        if (data && data.success) {
            showToast('保存成功');
            closeModal();
            // 重新获取角色数据并刷新
            apiRequest('/api/character').then(character => {
                if (character) {
                    appData.character = character;
                    if (typeof renderCharacter === 'function') {
                        renderCharacter();
                    }
                    if (typeof renderDataPreview === 'function') {
                        renderDataPreview();
                    }
                }
            });
        } else {
            showToast('保存失败：' + (data && data.message || '未知错误'));
        }
    })
    .catch(error => {
        showToast('保存失败');
        console.error(error);
    });
}

// ==================== 一键导出TXT ====================

// 导出为TXT
function exportToTxt() {
    showToast('正在生成导出文件...');
    
    apiRequest('/api/export/txt')
        .then(data => {
            if (data && data.success) {
                const filename = data.filename || '创作工坊数据导出.txt';
                return handleExport(data.content, filename);
            } else {
                showToast('导出失败：' + (data && data.message || '未知错误'));
            }
        })
        .then(result => {
            if (result && result.success) {
                showExportSuccess(result.filename, result.path);
            }
        })
        .catch(error => {
            showToast('导出失败');
            console.error(error);
        });
}


// 默认导出配置
const defaultExportOrder = {
    modules: [
        { id: 'character', name: '角色信息', enabled: true, order: 1 },
        { id: 'currency', name: '货币', enabled: true, order: 2 },
        { id: 'inventory', name: '背包物品', enabled: true, order: 3 },
        { id: 'equipment', name: '装备', enabled: true, order: 4 },
        { id: 'quests', name: '任务', enabled: true, order: 5 },
        { id: 'skills', name: '技能', enabled: true, order: 6 },
        { id: 'story', name: '剧情', enabled: true, order: 7 },
        { id: 'map', name: '地图地点', enabled: true, order: 8 },
        { id: 'relation', name: '人物关系', enabled: true, order: 9 },
        { id: 'custom', name: '自定义数据', enabled: true, order: 10 }
    ],
    customCategories: {}
};

// 导出模块图标（SVG key）
const exportModuleIcons = {
    character: 'user', currency: 'coin', inventory: 'backpack', equipment: 'sword',
    quests: 'scroll', skills: 'spark', story: 'book', map: 'map', relation: 'user_group', custom: 'edit'
};

// 显示导出排序设置
function showExportOrder() {
    // 同时加载导出顺序和导出设置
    Promise.all([
        apiRequest('/api/export/order'),
        apiRequest('/api/export/settings')
    ])
    .then(([orderData, settingsData]) => {
            if (!orderData) orderData = [];
            if (!settingsData) settingsData = {};
            // 处理新格式（对象，包含modules和customCategories）和旧格式（数组）的兼容
            let modules, customCategoriesConfig;
            let exportDetail = settingsData.export_detail || false;
            
            if (Array.isArray(orderData)) {
                modules = orderData.length > 0 ? orderData : JSON.parse(JSON.stringify(defaultExportOrder.modules));
                customCategoriesConfig = {};
            } else {
                modules = (orderData.modules && orderData.modules.length > 0) ? orderData.modules : JSON.parse(JSON.stringify(defaultExportOrder.modules));
                customCategoriesConfig = orderData.customCategories || {};
            }
            
            let html = `
                <div class="modal-header">
                    <h3>${(typeof SvgIconLib !== 'undefined' && SvgIconLib.render) ? SvgIconLib.render('settings', 16) : '⚙️'} 导出设置</h3>
                    <button class="modal-close" onclick="closeModal()">×</button>
                </div>
                <div class="modal-body">
                    <p class="modal-desc">勾选要导出的模块，点击条目可以上移调整顺序</p>
                    
                    <div style="margin-bottom: 16px; padding: 12px; background: #f8fafc; border-radius: 8px;">
                        <p style="margin-bottom: 10px; font-weight: 500; color: #1f2937;">${(typeof SvgIconLib !== 'undefined' && SvgIconLib.render) ? SvgIconLib.render('edit', 14) : '📝'} 导出详细程度</p>
                        <div style="display: flex; gap: 12px;">
                            <label style="display: flex; align-items: center; cursor: pointer; flex: 1;">
                                <input type="radio" name="export-detail" id="export-detail-simple" value="false" style="margin-right: 8px;">
                                <span>简略模式</span>
                            </label>
                            <label style="display: flex; align-items: center; cursor: pointer; flex: 1;">
                                <input type="radio" name="export-detail" id="export-detail-full" value="true" style="margin-right: 8px;">
                                <span>详细模式</span>
                            </label>
                        </div>
                        <p style="margin-top: 8px; font-size: 12px; color: #6b7280;">
                            简略模式：只导出名称和数量等基本信息<br>
                            详细模式：导出描述、属性、分类等所有信息
                        </p>
                    </div>
                    
                    <div class="export-order-list" id="export-order-list">
            `;
            
            modules.forEach((item, index) => {
                const checked = item.enabled ? 'checked' : '';
                html += `
                    <div class="order-item" data-section="${item.id}" data-enabled="${item.enabled}">
                        <input type="checkbox" class="order-checkbox" ${checked} onclick="event.stopPropagation(); toggleSectionEnabled('${item.id}')">
                        <span class="order-handle">☰</span>
                        <span class="order-name">${(typeof SvgIconLib !== 'undefined' && SvgIconLib.renderAuto ? SvgIconLib.renderAuto(exportModuleIcons[item.id] || 'box', 14) : '')} ${item.name}</span>
                        <span class="order-index">${index + 1}</span>
                    </div>
                `;
                
                // 自定义数据模块下添加子选项
                if (item.id === 'custom' && appData.customCategories && appData.customCategories.length > 0) {
                    html += '<div id="export-custom-categories-options" style="margin-left: 28px; margin-bottom: 12px; padding-left: 12px; border-left: 2px solid #e5e7eb;">';
                    html += '<p style="margin-bottom: 8px; color: #6b7280; font-size: 14px;">选择要导出的自定义分类：</p>';
                    
                    appData.customCategories.forEach(cat => {
                        const catChecked = customCategoriesConfig[cat.id] !== false ? 'checked' : '';
                        html += `
                            <div style="margin-bottom: 8px; display: flex; align-items: center;">
                                <input type="checkbox" id="export-custom-${cat.id}" ${catChecked} style="margin-right: 8px; width: 16px; height: 16px;">
                                <label for="export-custom-${cat.id}" style="cursor: pointer; font-size: 14px;">${(typeof SvgIconLib !== 'undefined' && SvgIconLib.renderAuto) ? SvgIconLib.renderAuto(cat.icon || 'folder', 14) : (cat.icon || '📁')} ${cat.name || cat.id}</label>
                            </div>
                        `;
                    });
                    
                    html += '</div>';
                }
            });
            
            html += `
                    </div>
                    <div class="modal-actions">
                        <button class="btn-secondary" onclick="closeModal()">取消</button>
                        <button class="btn-primary" onclick="saveExportOrder()">保存设置</button>
                    </div>
                </div>
            `;
            
            showModal(html);
            
            // 设置详细程度单选按钮
            const detailSimple = document.getElementById('export-detail-simple');
            const detailFull = document.getElementById('export-detail-full');
            if (detailSimple && detailFull) {
                if (exportDetail) {
                    detailFull.checked = true;
                } else {
                    detailSimple.checked = true;
                }
            }
            
            // 初始化排序功能
            initOrderList();
            
            // 初始化自定义分类选项的显示状态
            toggleExportCustomCategoriesOptions();
        })
        .catch(error => {
            showToast('加载失败');
            console.error(error);
        });
}

// 切换导出自定义分类选项的显示状态
function toggleExportCustomCategoriesOptions() {
    const customItem = document.querySelector('.order-item[data-section="custom"]');
    const optionsDiv = document.getElementById('export-custom-categories-options');
    
    if (customItem && optionsDiv) {
        const enabled = customItem.dataset.enabled === 'true';
        optionsDiv.style.display = enabled ? 'block' : 'none';
    }
}

// 切换模块启用状态
function toggleSectionEnabled(sectionId) {
    const item = document.querySelector(`.order-item[data-section="${sectionId}"]`);
    if (item) {
        const checkbox = item.querySelector('.order-checkbox');
        const enabled = checkbox.checked;
        item.dataset.enabled = enabled;
        if (enabled) {
            item.style.opacity = '1';
        } else {
            item.style.opacity = '0.5';
        }
    }
}

// 初始化排序列表
function initOrderList() {
    const items = document.querySelectorAll('.order-item');
    items.forEach(item => {
        item.addEventListener('click', function() {
            const list = document.getElementById('export-order-list');
            const allItems = Array.from(list.children);
            const index = allItems.indexOf(this);
            
            if (index > 0) {
                // 上移
                list.insertBefore(this, allItems[index - 1]);
                updateOrderIndices();
            }
        });
    });
}

// 更新顺序索引
function updateOrderIndices() {
    const items = document.querySelectorAll('.order-item');
    items.forEach((item, index) => {
        item.querySelector('.order-index').textContent = index + 1;
    });
}

// 保存导出配置
function saveExportOrder() {
    const items = document.querySelectorAll('.order-item');
    const config = [];
    items.forEach(item => {
        config.push({
            id: item.dataset.section,
            name: item.querySelector('.order-name').textContent,
            enabled: item.dataset.enabled === 'true'
        });
    });
    
    // 保存自定义分类的选择
    const customCategories = {};
    if (appData.customCategories && appData.customCategories.length > 0) {
        appData.customCategories.forEach(cat => {
            const checkbox = document.getElementById(`export-custom-${cat.id}`);
            if (checkbox) {
                customCategories[cat.id] = checkbox.checked;
            }
        });
    }
    
    // 获取详细程度设置
    const detailFull = document.getElementById('export-detail-full');
    const exportDetail = detailFull ? detailFull.checked : false;
    
    apiRequest('/api/export/order/save', 'POST', { 
        config: config,
        customCategories: customCategories
    })
    .then(data => {
        if (data && data.success) {
            // 同时保存详细程度设置
            apiRequest('/api/export/settings/save', 'POST', { export_detail: exportDetail })
            .then(() => {
                showToast('保存成功');
                closeModal();
            })
            .catch(err => {
                console.error('保存导出设置失败:', err);
                showToast('保存成功');
                closeModal();
            });
        } else {
            showToast('保存失败');
        }
    })
    .catch(error => {
        showToast('保存失败');
        console.error(error);
    });
}

// ==================== 主题系统 ====================

// 主题列表（浅色：默认靛蓝/暖白纸感/晨雾蓝灰/薄荷绿；深色：代码深色；透明：毛玻璃）
const themeList = [
    { id: 'default', name: '默认靛蓝', color: '#6366f1' },
    { id: 'warm', name: '暖白纸感', color: '#b45309' },
    { id: 'cool', name: '晨雾蓝灰', color: '#4f7cac' },
    { id: 'mint', name: '薄荷绿', color: '#0e9f6e' },
    { id: 'vscode', name: '代码深色', color: '#1e1e1e' },
    { id: 'glass', name: '毛玻璃', color: 'rgba(255,255,255,0.72)' }
];

// 旧版主题名映射（v3.1.0 及更早的 5 套浅色主题已移除）
const LEGACY_THEME_MAP = {
    'pure-white': 'default',
    'light-gray': 'default',
    'light-blue': 'cool',
    'light-green': 'mint',
    'light-pink': 'default'
};

// 切换主题
function switchTheme(themeName) {
    if (themeName === 'default') {
        document.body.removeAttribute('data-theme');
    } else {
        document.body.setAttribute('data-theme', themeName);
    }
    localStorage.setItem('novel-manager-theme', themeName);
    // 更新弹窗中的选中状态
    document.querySelectorAll('.theme-option').forEach(opt => {
        opt.classList.remove('active');
        if (opt.dataset.theme === themeName) {
            opt.classList.add('active');
        }
    });
}

// 加载已保存的主题（兼容旧版主题名）
function loadTheme() {
    let savedTheme = localStorage.getItem('novel-manager-theme') || 'default';
    if (LEGACY_THEME_MAP[savedTheme]) {
        savedTheme = LEGACY_THEME_MAP[savedTheme];
        localStorage.setItem('novel-manager-theme', savedTheme);
    }
    switchTheme(savedTheme);
}

// 显示主题设置弹窗
function showThemeSettings() {
    const currentTheme = localStorage.getItem('novel-manager-theme') || 'default';
    
    let html = `
        <div class="modal-header">
            <h3>${(typeof SvgIconLib !== 'undefined' && SvgIconLib.render) ? SvgIconLib.render('palette', 16) : '🎨'} 主题设置</h3>
            <button class="modal-close" onclick="closeModal()">×</button>
        </div>
        <div class="modal-body">
            <p class="modal-desc">选择一个主题风格，切换后自动保存</p>
            <div class="theme-selector">
    `;
    
    themeList.forEach(theme => {
        const active = theme.id === currentTheme ? 'active' : '';
        html += `
            <div style="text-align: center;">
                <div class="theme-option ${active}" data-theme="${theme.id}" onclick="switchTheme('${theme.id}')"></div>
                <div class="theme-label">${theme.name}</div>
            </div>
        `;
    });
    
    html += `
            </div>
        </div>
    `;
    
    showModal(html);
}

// 页面加载时自动应用主题
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(loadTheme, 50);
});


// ==================== 统一导出功能 ====================

// 统一导出入口 - 根据环境自动选择导出方式
function handleExport(content, filename) {
    return new Promise((resolve, reject) => {
        // Electron 环境：使用原生保存对话框
        if (window.electronAPI && window.electronAPI.isElectron) {
            window.electronAPI.saveFile(content, filename)
                .then(result => {
                    if (result.success) {
                        resolve({ success: true, path: result.path, filename: filename });
                    } else {
                        reject(new Error(result.message || '保存失败'));
                    }
                })
                .catch(err => reject(err));
        }
        // Android Capacitor 环境
        else if (window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform() !== 'web') {
            saveFileAndroid(content, filename)
                .then(result => resolve(result))
                .catch(err => reject(err));
        }
        // Web / 浏览器环境
        else {
            try {
                const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                resolve({ success: true, path: null, filename: filename });
            } catch (e) {
                reject(e);
            }
        }
    });
}

// Android 端文件保存
function saveFileAndroid(content, filename) {
    return new Promise((resolve, reject) => {
        try {
            // 尝试使用 Capacitor Filesystem
            if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem) {
                const Filesystem = window.Capacitor.Plugins.Filesystem;
                const base64Data = btoa(unescape(encodeURIComponent(content)));
                
                Filesystem.writeFile({
                    path: filename,
                    data: base64Data,
                    directory: 'DOCUMENTS',
                    recursive: true
                }).then(result => {
                    resolve({ success: true, path: result.uri || 'Documents/' + filename, filename: filename });
                }).catch(err => {
                    // 回退到 Blob 下载
                    fallbackBlobDownload(content, filename);
                    resolve({ success: true, path: null, filename: filename });
                });
            } else {
                fallbackBlobDownload(content, filename);
                resolve({ success: true, path: null, filename: filename });
            }
        } catch (e) {
            fallbackBlobDownload(content, filename);
            resolve({ success: true, path: null, filename: filename });
        }
    });
}

// Blob 下载回退方案
function fallbackBlobDownload(content, filename) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 打开文件所在文件夹
function openExportFolder(filePath) {
    if (window.electronAPI && window.electronAPI.openFolder) {
        window.electronAPI.openFolder(filePath);
    } else if (window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform() === 'android') {
        showToast('文件已保存到 Documents 目录', 'success');
    } else {
        showToast('浏览器不支持打开文件夹', 'error');
    }
}

// 显示导出成功结果（带打开文件夹按钮）
function showExportSuccess(filename, filePath) {
    const resultDiv = document.getElementById('export-result');
    if (resultDiv) {
        let folderBtn = '';
        if (window.electronAPI && window.electronAPI.isElectron && filePath) {
            folderBtn = `<button class="btn-small btn-primary" onclick="openExportFolder('${filePath.replace(/'/g, "\\'") }')" style="margin-top: 8px;">${(typeof SvgIconLib !== 'undefined' && SvgIconLib.render) ? SvgIconLib.render('folder_open', 12) : '📂'} 打开所在文件夹</button>`;
        } else if (window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform() === 'android') {
            folderBtn = `<div style="margin-top: 8px; font-size: 12px; color: #64748b;">文件已保存到 Documents 目录</div>`;
        }
        
        resultDiv.innerHTML = `
            <div class="success-message">
                [OK] 导出成功！文件：${filename}
                ${folderBtn}
            </div>
        `;
    }
    showToast('导出成功！', 'success');
}

// ==================== 页面切换逻辑 ====================

// 当前页面
let currentPage = 'character';

// 切换页面
function switchPage(pageId) {
    // 隐藏所有页面
    document.querySelectorAll('.page-section').forEach(page => {
        page.classList.remove('active');
        page.style.display = 'none';
    });
    
    // 显示目标页面
    const targetPage = document.getElementById('page-' + pageId);
    if (targetPage) {
        targetPage.classList.add('active');
        targetPage.style.display = '';
    } else if (typeof ModuleRegistry !== 'undefined') {
        // 尝试动态模块页面
        const mod = ModuleRegistry.getModule(pageId);
        if (mod && mod.pageRenderer) {
            const container = document.getElementById('page-dynamic-container');
            if (container) {
                container.innerHTML = mod.pageRenderer();
                container.classList.add('active');
                container.style.display = '';
            }
        }
    }
    
    // 更新导航按钮状态
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.page === pageId) {
            btn.classList.add('active');
        }
    });
    
    // 更新当前页面
    currentPage = pageId;
    
    // 如果是数据预览页面，重新渲染
    if (pageId === 'preview' && typeof renderDataPreview === 'function') {
        renderDataPreview();
    }
    
    // 如果是剧情页面，重新渲染
    if (pageId === 'story') {
        if (typeof loadStoryMarks === 'function') loadStoryMarks();
        if (typeof loadForeshadowing === 'function') loadForeshadowing();
    }
    
    // 触发模块的 onPageShow 回调
    if (typeof ModuleRegistry !== 'undefined') {
        ModuleRegistry.onPageShow(pageId);
    }
    
    // 滚动到页面顶部
    const appContent = document.querySelector('.app-content');
    if (appContent) appContent.scrollTop = 0;
    window.scrollTo(0, 0);
}

// ==================== 侧边栏动态生成 ====================

// 重建侧边栏导航
function rebuildSidebar() {
    const sidebarNav = document.getElementById('sidebar-nav');
    if (!sidebarNav || typeof ModuleRegistry === 'undefined') return;
    
    sidebarNav.innerHTML = ModuleRegistry.generateSidebarHTML(currentPage);
}

// 初始化侧边栏
function initSidebar() {
    if (typeof ModuleRegistry === 'undefined') return;
    rebuildSidebar();
}

// 初始化页面切换
function initPageSwitching() {
    // 初始化侧边栏（桌面端）
    initSidebar();
    
    // 默认显示角色页面
    switchPage('character');
}

// 暴露 rebuildSidebar 到全局
window.rebuildSidebar = rebuildSidebar;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 延迟初始化，确保其他脚本先加载
    setTimeout(initPageSwitching, 100);
});


// ==================== 单模块导出（已移至下方统一导出功能） ====================


// ==================== 版本更新日志 ====================

function showVersionHistory() {
    const versions = [
        {
            version: 'v1.0dev',
            date: '2026-08-07',
            latest: true,
            features: [
                '🔄 版本号统一为两位（v1.0dev），版本更新日志当前版本置顶、其余按版本号降序排列',
                '🔍 修复「常用」分组无法展开与全文搜索无结果的问题',
                '✨ 全站 emoji 图标清理：关系/任务/技能/物品库/货币/添加功能/章节管理等统一替换为 SVG 图标',
                '🖱️ 修复章节管理分屏预览左右两框显示不一致（预览改为与编辑区逐字一致镜像）',
                '⚡ 构建加速：cargo 全核全线程编译（CARGO_BUILD_JOBS / RUSTFLAGS）',
                '📋 大纲功能独立为「大纲管理」模块（侧边栏写作分组）',
                '  - 章节管理恢复双栏布局（章节列表 | 正文编辑器），不再挤占编辑界面',
                '  - 大纲管理按章节集中编写/保存，与章节管理共用同一份数据',
                '  - 从大纲管理可一键跳转到对应章节编辑正文，双向联动',
                '📌 章节管理整页不再整体滚动（列表/编辑器各自内部滚动）',
                '📝 开发计划：新增《开发计划.md》，规划模块联动架构与 V1.0 路线'
            ]
        },
        {
            version: 'v3.2.0',
            date: '2026-08-06',
            latest: false,
            features: [
                '🏷️ 应用更名为「创作工坊 (NovelForge)」',
                '🎨 主题系统全面重构',
                '  - 移除旧的 6 套低质感配色，保留默认配色',
                '  - 浅色系列：默认靛蓝 / 暖白纸感 / 晨雾蓝灰 / 薄荷绿',
                '  - 深色系列：代码深色（类 VS Code 黑色主题）',
                '  - 透明系列：毛玻璃主题（半透明卡片 + 高斯模糊）',
                '  - 主题设置页按浅色/深色/透明分组展示，支持定时切换',
                '✍️ 章节管理写作功能增强',
                '  - 三栏布局：章节列表 | 本章大纲 | 正文编辑器',
                '  - 整页固定视口高度，不再整体上下滚动（列表/大纲/正文各自内部滚动）',
                '  - 正文分屏编辑：左右栏滚动位置按比例联动，栏位不再被内容撑高',
                '  - 添加章节默认从「基本信息」开始；内联编辑器移除大纲 tab',
                '  - 撤销/重做：内联与全屏编辑器独立历史栈（各 100 条），支持按钮与 Ctrl+Z / Ctrl+Y',
                '  - 术语提取升级：弹窗提供「本地提取」与「AI 提取」双通道，本地算法优化（叠字/虚词过滤）',
                '  - 全局 Escape 关闭弹窗',
                '⚡ 数据可靠性',
                '  - 保存失败容错、损坏数据留存、备份上限 10 份、完整 JSON 导出/导入、版本回滚',
                '🐛 崩溃修复',
                '  - 修复撤销/重做函数未导出导致编辑器打字报错（TypeError）的问题'
            ]
        },
        {
            version: 'v3.1.0 修复版 v9',
            date: '2026-06-22',
            latest: false,
            features: [
                '📤 导出功能全面升级',
                '  - 新增背包模块导出',
                '  - 新增装备模块导出',
                '  - 所有11个模块全部支持导出',
                '  - 新增简略/详细模式切换',
                '    · 简略模式：只导出名称、数量等基本信息',
                '    · 详细模式：导出描述、属性、分类、ID等所有信息',
                '  - 一键导出和单模块导出都支持详细程度设置',
                '  - 设置自动保存，下次打开自动沿用',
                '📦 物品库、装备、背包页面顶部新增导出按钮',
                '  - 方便快速导出当前模块数据',
                '🐛 修复导出功能兼容性问题',
                '  - 兼容不同数据格式，避免导出时崩溃',
                '  - 类型检查更严格，确保导出稳定'
            ]
        },
        {
            version: 'v3.1.0',
            date: '2026-06-22',
            latest: false,
            features: [
                '✨ 新增独立的物品库页面和底部导航按钮',
                '✨ 物品库支持添加、查看物品详情',
                '✨ 支持从物品库添加物品到背包',
                '🗺️ 新增地图模块',
                '  - 支持地点层级管理',
                '  - 支持地点类型标签',
                '👥 新增人物关系模块',
                '  - 支持角色管理',
                '  - 支持关系网络可视化',
                '🔧 装备槽位管理功能修复',
                '  - 装备槽位支持删除（包括默认槽位）',
                '🐛 Bug修复',
                '  - 修复地图页面创建同级地点覆盖的问题',
                '  - 修复地图页面地点编辑功能',
                '  - 修复地图地点删除功能',
                '  - 修复自定义页面条目不按分类隔离的问题',
                '  - 修复物品库数据格式兼容问题',
                '  - 修复数据预览丢失地图、关系、自定义模块的问题',
                '  - 修复按键重命名排序不支持新模块的问题',
                '  - 修复导出设置功能丢失的问题',
                '  - 移除数据加载失败弹窗提示',
                '⚙️ 装备系统调整',
                '  - 移除默认装备槽位，改为手动添加',
                '📦 优化 Termux 兼容性',
                '  - 优化路径处理逻辑，多套备用方案',
                '  - 添加启动文件检查',
                '  - 新增 build.sh 一键编译脚本',
                '  - 新增 start.sh 一键启动脚本',
                '  - 新增 TERMUX.md 使用说明',
                '💰 货币系统增强',
                '  - 支持大数字自动格式化显示（万、亿等单位）',
                '  - 支持输入带单位的数字（如 1.5万、3亿）',
                '  - 后端数据类型升级为 long long，支持更大数值',
                '🎒 背包系统优化',
                '  - 改为只能从物品库添加物品，不能直接创建',
                '  - 背包物品编辑时ID和类型不可修改',
                '  - 编辑页面标题显示物品名及ID',
                '  - 重命名不会改变固定ID',
                '📦 物品库优化',
                '  - 添加物品类型样式，确保类型标签可见',
                '  - 创建默认分类数据（武器、护甲、消耗品、材料）',
                '  - 修复重复接口定义导致的编译问题'
            ]
        },
        {
            version: 'v3.0.0',
            date: '2026-06-21',
            features: [
                '🚀 完全重构为C++版本',
                '  - 使用cpp-httplib替代boost，解决安卓编译依赖问题',
                '  - 代码结构重新整理，模块清晰，注释完善',
                '  - 新增FUNCTIONS.md函数清单文档，详细记录所有函数',
                '  - 性能大幅提升，启动速度更快',
                '🐛 修复大量已知bug',
                '  - 修复角色页面自动弹出编辑窗口的问题',
                '  - 修复角色编辑按钮点击无反应的问题',
                '  - 修复背包添加物品会覆盖原有物品的问题',
                '  - 修复装备与背包不联动的问题',
                '  - 修复装备接口崩溃问题（null值类型异常）',
                '  - 修复装备物品显示ID而非名称的问题',
                '  - 添加缺失的equipItem函数（背包物品详情装备按钮）',
                '📦 物品库系统优化',
                '  - 移除预设物品，支持完全自定义',
                '  - 支持自定义物品类型（7种基础类型）',
                '  - 物品库与背包联动，可直接从物品库添加物品',
                '⚔️ 装备系统优化',
                '  - 新增默认装备槽位（武器、护甲、饰品）',
                '  - 装备物品自动从背包移除，卸下自动放回背包',
                '  - 支持自动推断装备槽位',
                '  - 装备保存完整物品信息，显示名称和图标',
                '🎨 UI界面优化',
                '  - 统一界面风格，交互更流畅',
                '  - 版本号更新为v3.0.0',
                '  - 优化移动端适配',
                '  - 修复空状态文字竖排布局问题',
                '📚 文档完善',
                '  - 新增README.md项目说明文档',
                '  - 新增CHANGELOG.md更新日志',
                '  - 新增FUNCTIONS.md函数清单文档（约3万字符）'
            ]
        },
        {
            version: 'v1.8.6',
            date: '2026-06-21',
            features: [
                '🗺️ 地图模块优化',
                '  - 移除结构等级功能，简化地图管理',
                '  - 类型管理改为标签系统',
                '  - 支持取消地点标签（无标签选项）',
                '  - 修复编辑地点取消按钮无法点击的bug',
                '  - 修复编辑地点父地点选中判断错误的bug',
                '  - 修复保存地点后可能丢失的问题',
                '🔧 工具页面优化',
                '  - 移除角色模板管理功能',
                '  - 移除管理模板按钮',
                '  - 移除编辑当前角色按钮（避免重复）',
                '📚 项目文档',
                '  - 新增项目架构文档（PROJECT_ARCHITECTURE.md）',
                '  - 详细记录文件结构、关键代码位置、已知bug',
                '  - 提供记忆丢失恢复指南',
                '🔍 全模块功能验证与优化'
            ]
        },
        {
            version: 'v1.8.5',
            date: '2026-06-20',
            features: [
                '🕸️ 优化人物关系网络视图',
                '  - 修复网络图下方空白遮挡问题',
                '  - 优化节点位置计算，适配不同屏幕尺寸',
                '  - 增加周围人物之间连线的粗细和可见度',
                '  - 优化关系标签样式，更清晰易读',
                '🔘 修复操作按钮文字消失问题',
                '  - 修复按钮文字颜色与背景色相同导致看不见的bug',
                '  - 统一按钮文字颜色样式',
                '📁 修复自定义页面操作图标显示问题',
                '  - 分类操作按钮默认显示，移动端也能看到',
                '  - 优化按钮样式，选中状态更清晰',
                '📊 修复数据预览自定义条目不显示问题',
                '  - 修复数据预览中自定义分类条目为空的bug',
                '  - 优化数据同步逻辑，实时更新预览内容',
                '🔍 全模块功能验证与优化'
            ]
        },
        {
            version: 'v1.8.4',
            date: '2026-06-20',
            features: [
                '🗺️ 地图模块恢复到 v1.8.2 经典样式',
                '  - 恢复树状结构地点列表，层级清晰直观',
                '  - 恢复类型管理功能，支持自定义地点类型',
                '  - 恢复结构等级管理，灵活定义地点层级',
                '  - 恢复选中地点后显示操作按钮（添加子地点/编辑/删除）',
                '  - 恢复全部展开、全部折叠功能',
                '  - 修复地点详情页内容缺失问题',
                '🔧 修复工具页面弹窗显示异常',
                '  - 修复导出设置弹窗双标题问题',
                '  - 修复按钮设置弹窗双标题问题',
                '  - 修复弹窗底部双保存/取消按钮问题',
                '📦 完善导出设置和数据预览',
                '  - 导出设置新增地图模块选项',
                '  - 导出设置新增关系模块选项',
                '  - 数据预览新增地图模块选项',
                '  - 数据预览新增关系模块选项',
                '🔍 全模块功能验证与优化'
            ]
        },
        {
            version: 'v1.8.3',
            date: '2026-06-20',
            features: [
                '🗺️ 地图模块全新优化',
                '  - 标签系统替代类型管理，更灵活的地点分类',
                '  - 删除结构等级，简化地点层级',
                '  - 添加顶级地点默认无父级，操作更直观',
                '  - 展开/折叠交互优化（正方形点击区域）',
                '  - 修复类型添加bug，编辑地点可正常移除类型',
                '  - 编辑界面移除父地点选项，简化操作',
                '  - 同一等级地点三角形使用相同颜色',
                '👥 人物关系模块全新上线',
                '  - 人物管理功能（添加、编辑、删除人物）',
                '  - 自定义关系类型（朋友、敌人、师徒、亲人等）',
                '  - 双向关系逻辑，添加关系自动同步到双方',
                '  - 人物筛选功能，快速查看特定人物关系',
                '  - 列表视图模式，清晰展示所有人物关系',
                '  - 网络关系图模式，可视化人物关系网络',
                '  - 网络模式支持缩放，中心人物周围环绕展示',
                '  - SVG实现关系网络图，连线带关系类型标签',
                '🔍 全模块功能验证与优化'
            ]
        },
        {
            version: 'v1.6.6',
            date: '2026-06-20',
            features: [
                '✨ 清空所有默认数据，用户完全自定义（货币、背包、技能、任务、剧情、伏笔等）',
                '✨ 数据预览支持自定义分类选择，可选择展示哪些自定义数据',
                '✨ 一键导出支持自定义分类选择，可设置导出哪些自定义数据',
                '🔍 全模块功能验证与优化'
            ]
        },
        {
            version: 'v1.6.5',
            date: '2026-06-20',
            features: [
                '🐛 修复角色属性删除和重命名不生效的问题',
                '✨ 移除默认自定义数据分类，用户可完全自定义',
                '✨ 角色属性编辑功能完善（属性名可编辑、可删除）',
                '🔍 全模块功能验证与优化'
            ]
        },
        {
            version: 'v1.6.4',
            date: '2026-06-20',
            features: [
                '🐛 修复背包页面「开启战利品」按钮无效问题，已移除',
                '🐛 移除物品稀有度字段，简化物品属性',
                '🐛 修复角色编辑保存后主界面不刷新的问题',
                '🐛 修复技能编辑保存失败的问题（缺少damage字段）',
                '🐛 修复导出功能导出多余系统属性的问题',
                '🐛 修复剧情页面显示加载中的问题',
                '✨ 装备槽位精简为默认1个，可自定义添加',
                '✨ 背包默认新增1个「测试物品」',
                '✨ 角色属性编辑功能增强（支持删除属性、修改属性名）',
                '🔍 全模块功能交叉验证与修复'
            ]
        },
        {
            version: 'v1.6.3',
            date: '2026-06-19',
            features: [
                '🐛 修复数据预览页面空白无数据的问题',
                '🐛 修复工具页面残留旧数据预览卡片的问题',
                '🐛 修复角色编辑仍显示大量内置属性的问题（过滤系统默认属性）',
                '🐛 修复货币页面多条默认货币的问题',
                '🐛 修复技能添加提交无响应的问题',
                '🐛 修复任务添加提交无响应的问题',
                '🐛 修复backups备份文件夹无限生成的问题',
                '✨ 新增自动备份数量上限（最多10份）',
                '✨ 工具页面新增一键清理备份按钮',
                '✨ 数据预览改为底部独立导航页，纯只读展示',
                '🔍 全代码交叉校验，修复隐性问题'
            ]
        },
        {
            version: 'v1.6.2',
            date: '2026-06-19',
            features: [
                '🐛 修复主角属性过多问题，新角色仅保留1个「测试属性」',
                '🐛 修复技能添加无响应bug（变量未定义导致提交失败）',
                '🐛 修复货币删除失效问题，默认货币改为可删除',
                '✨ 全模块默认数据精简，仅保留1条名为「测试」的数据',
                '📊 原「数据统计」重命名为「数据预览」，移至底部导航独立按钮',
                '📊 数据预览页面只读展示所有模块已创建的数据',
                '🔍 全项目代码交叉校验，修复隐性问题'
            ]
        },
        {
            version: 'v1.6.1',
            date: '2026-06-19',
            features: [
                '🐛 修复页面全部显示加载中的重大bug（JavaScript语法错误）',
                '🐛 修复底部导航发光效果错位的问题',
                '📄 优化角色信息导出，只导出基础属性，更简洁'
            ]
        },
        {
            version: 'v1.6.0',
            date: '2026-06-19',
            features: [
                '🐛 修复角色添加属性后不显示的bug',
                '🐛 修复技能添加后不显示的bug',
                '🐛 修复任务添加后不显示的bug',
                '✨ 技能添加威力/伤害数值字段',
                '📜 任务添加自定义奖励字段',
                '🎒 物品添加等级字段',
                '🎒 物品属性加成改成友好格式（非JSON）',
                '🎒 物品添加技能字段',
                '📄 简化所有导出格式（去掉分隔线，更简洁）',
                '🗑️ 移除技能库按钮',
                '🗑️ 移除任务模板按钮'
            ]
        },
        {
            version: 'v1.5.1',
            date: '2026-06-19',
            features: [
                '📝 新增版本更新日志功能',
                '🔧 工具页面增加版本更新入口'
            ]
        },
        {
            version: 'v1.5.0',
            date: '2026-06-19',
            features: [
                '🐛 修复角色属性显示问题（[object Object]）',
                '🐛 修复添加属性后不显示的问题',
                '📊 减少初始属性数量（2个，其他自行添加）',
                '🏷️ 等级标签支持自定义（可改成境界、修为等）',
                '💰 修复货币页面重复添加按钮问题',
                '✨ 技能页面自定义功能开发完成',
                '📜 任务页面自定义功能完善',
                '📄 每个页面增加单独导出按钮'
            ]
        },
        {
            version: 'v1.4.0',
            date: '2026-06-19',
            features: [
                '🖼️ 独立页面切换模式（点击按钮切换，只显示当前页面内容）',
                '✨ 底部导航选中按钮发光效果（呼吸动画）',
                '🎯 选中按钮自动居中滚动',
                '✏️ 角色页面直接编辑按钮',
                '📱 9个独立页面：角色、货币、背包、装备、任务、技能、剧情、自定义、工具'
            ]
        },
        {
            version: 'v1.3.0',
            date: '2026-06-19',
            features: [
                '📤 导出功能增加模块选择（可勾选要导出的模块）',
                '🧭 底部导航改进（支持横向滚动，显示所有按钮）',
                '📖 添加剧情按钮到底部导航',
                '🎨 隐藏滚动条，界面更美观'
            ]
        },
        {
            version: 'v1.2.0',
            date: '2026-06-19',
            features: [
                '👤 角色模板管理（创建、编辑、删除模板）',
                '✏️ 角色属性直接编辑',
                '📄 一键导出TXT功能',
                '⚙️ 导出排序设置',
                '🔘 按钮配置（重命名、调整顺序）',
                '🔘 标签按钮更大更明显'
            ]
        },
        {
            version: 'v1.1.0',
            date: '2026-06-19',
            features: [
                '🎒 自定义物品管理（添加、编辑、删除）',
                '⚔️ 装备槽位完全自定义',
                '💰 货币类型自定义',
                '📜 自定义任务管理',
                '✨ 自定义技能管理',
                '📖 剧情标记编辑删除',
                '🔮 伏笔编辑删除',
                '📋 通用自定义数据模块（NPC、地点、势力等）'
            ]
        },
        {
            version: 'v1.0.0',
            date: '2026-06-19',
            features: [
                '🎉 初始版本发布',
                '👤 角色管理系统',
                '🎒 背包系统',
                '⚔️ 装备系统',
                '💰 货币系统',
                '📜 任务系统',
                '✨ 技能系统',
                '📖 剧情标记系统',
                '🔮 伏笔管理系统',
                '🔍 全局搜索',
                '📊 数据统计',
                '💾 备份系统',
                '📱 响应式设计，支持桌面和移动端',
                '📲 PWA支持，可添加到主屏幕'
            ]
        }
    ];
    
    // 版本号排序键：数字部分按 major.minor.patch 升序（支持两位版号 v1.0dev）
    function versionSortKey(str) {
        const s = String(str);
        const m = s.match(/(\d+)\.(\d+)(?:\.(\d+))?/);
        const major = m ? parseInt(m[1], 10) : 0;
        const minor = m ? parseInt(m[2], 10) : 0;
        const patch = m && m[3] !== undefined ? parseInt(m[3], 10) : 0;
        const build = (s.match(/v\s*(\d+)\s*$/) || [null, 0])[1];
        const buildNum = build ? parseInt(build, 10) : 0;
        let key = major * 1e6 + minor * 1e3 + patch * 10 + buildNum;
        if (/dev/i.test(s)) key += 0.5; // 开发版排在同版本号正式版之后
        return key;
    }

    // 版本显示格式：-dev → dev（保留 v 前缀，如 v1.0.0-dev → v1.0dev）
    function formatVersion(str) {
        return String(str).replace(/-dev$/i, 'dev');
    }

    // 功能行 emoji → SVG 图标 key 映射（key 已去除变体选择符 \uFE0F，查找时两侧统一归一化）
    const VH_EMOJI_KEYS = {
        '🔄':'refresh','📋':'list','🖱':'mouse','📌':'pin','📝':'edit','🏷':'tag','🎨':'palette',
        '✍':'edit','⚡':'zap','🐛':'bug','📤':'upload','📦':'box','✨':'spark','🗺':'map','👥':'users',
        '🔧':'settings','⚙':'settings','💰':'coin','🎒':'backpack','🚀':'rocket','⚔':'sword','📚':'book',
        '🔍':'search','🕸':'link','🔘':'circle','📁':'folder','📊':'chart','📄':'text','📜':'scroll',
        '🗑':'trash','🖼':'image','🎯':'target','✏':'edit','📱':'mobile','🧭':'compass','📖':'book',
        '👤':'user','🔮':'crystal_ball','🎉':'party','💾':'save','📲':'mobile'
    };

    function vhFeatureHtml(feature) {
        const line = String(feature == null ? '' : feature);
        // 捕获缩进 + emoji 前缀（含变体选择符 \uFE0F / 零宽连接符 \u200D，可多码位）
        const m = line.match(/^(\s*)([\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F\u200D]+)([\s\S]*)$/u);
        if (!m) return escapeHtml(line);
        const indent = m[1], emoji = m[2], rest = m[3];
        const norm = emoji.replace(/[\uFE0F\u200D]/g, '');
        const iconKey = VH_EMOJI_KEYS[emoji] || VH_EMOJI_KEYS[norm];
        // 非 emoji 前缀条目（如 "  - xxx"、"    · xxx"）直接输出
        if (!iconKey) return escapeHtml(line);
        const iconHtml = SvgIconLib ? SvgIconLib.render(iconKey, 14) : '';
        return escapeHtml(indent) + '<span style="display:inline-flex;align-items:baseline;gap:5px;vertical-align:-2px;">'
            + iconHtml + '<span>' + escapeHtml(rest) + '</span></span>';
    }

    // 排序：最新版本（latest）置顶，其余按版本号降序（最新在前）
    const sortedVersions = versions.slice().sort((a, b) => {
        if (a.latest && !b.latest) return -1;
        if (b.latest && !a.latest) return 1;
        return versionSortKey(b.version) - versionSortKey(a.version);
    });

    let html = '<div style="max-height: 500px; overflow-y: auto; padding: 0 4px;">';

    sortedVersions.forEach(v => {
        html += `
            <div style="margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid var(--border-color);">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <span style="font-size: 16px; font-weight: 600; color: var(--primary-color);">${formatVersion(v.version)}</span>
                    ${v.latest ? '<span style="font-size: 11px; background: var(--primary-color); color: #fff; padding: 2px 6px; border-radius: 10px;">最新</span>' : ''}
                    <span style="font-size: 12px; color: var(--text-secondary); margin-left: auto;">${v.date}</span>
                </div>
                <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: var(--text-primary);">
        `;

        (v.features || []).forEach(feature => {
            if (feature == null || String(feature).trim() === '') return; // null/空行兜底
            html += `<li style="margin-bottom: 4px; line-height: 1.5;">${vhFeatureHtml(feature)}</li>`;
        });

        html += `
                </ul>
            </div>
        `;
    });

    html += '</div>';

    const titleHtml = (SvgIconLib ? SvgIconLib.render('scroll', 16) : '📝') + ' 版本更新日志';
    showModal(titleHtml, html, [
        { text: '关闭', class: 'btn-secondary', action: closeModal }
    ]);
}


// 导出单个模块（页面顶部导出按钮用）
function exportModule(moduleName) {
    const moduleNames = {
        'inventory': '背包物品',
        'equipment': '装备',
        'item_library': '物品库',
        'character': '角色信息',
        'currency': '货币',
        'quests': '任务',
        'skills': '技能',
        'story': '剧情',
        'locations': '地图地点',
        'relations': '人物关系',
        'custom': '自定义数据'
    };
    
    const name = moduleNames[moduleName] || moduleName;
    
    apiRequest(`/api/export/module/${moduleName}/txt`)
        .then(data => {
            if (data && data.success) {
                const filename = data.filename || `${name}.txt`;
                return handleExport(data.content, filename);
            } else {
                showToast('导出失败', 'error');
            }
        })
        .then(result => {
            if (result && result.success) {
                showToast(`已导出${result.filename}`, 'success');
                // 显示导出成功结果（带打开文件夹按钮）
                showExportSuccess(result.filename, result.path);
            }
        })
        .catch(err => {
            console.error('导出失败:', err);
            showToast('导出失败', 'error');
        });
}
