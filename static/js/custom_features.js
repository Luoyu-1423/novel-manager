// ==================== 自定义功能模块 ====================
window._customFeaturesLoaded = true;

// 全局变量
let customPageCategoryId = null;
let customPageCategories = {};
let customPageItems = [];

// 页面加载完成后初始化
function initCustomWhenReady() {
    console.log('自定义功能模块加载中...');
    setTimeout(initCustomFeatures, 300);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCustomWhenReady);
} else {
    initCustomWhenReady();
}

// 初始化自定义功能
function initCustomFeatures() {
    console.log('初始化自定义功能...');
    
    // 加载自定义分类
    loadCustomCategories();
    
    // 加载自定义技能和任务
    loadCustomSkills();
    loadCustomQuests();
    
    // 替换技能和任务的渲染函数，添加编辑删除按钮
    if (typeof renderSkills === 'function') {
        renderSkills = renderSkillsWithActions;
    }
    if (typeof renderQuests === 'function') {
        renderQuests = renderQuestsWithActions;
    }
    
    // 给自定义标签按钮添加点击事件
    const customTabBtns = document.querySelectorAll('[data-tab="custom"]');
    customTabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            setTimeout(() => {
                loadCustomCategories();
            }, 100);
        });
    });
    
    // 给技能标签按钮添加点击事件
    const skillTabBtns = document.querySelectorAll('[data-tab="skills"]');
    skillTabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            setTimeout(() => {
                loadCustomSkills();
            }, 100);
        });
    });
    
    // 给任务标签按钮添加点击事件
    const questTabBtns = document.querySelectorAll('[data-tab="quests"]');
    questTabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            setTimeout(() => {
                loadCustomQuests();
            }, 100);
        });
    });
    
    console.log('自定义功能初始化完成');
}

// ==================== 自定义分类管理 ====================

// 加载自定义分类
function loadCustomCategories() {
    console.log('加载自定义分类...');
    
    localDataManager.handleRequest('/api/custom/categories')
        .then(data => {
            console.log('分类数据:', data);
            customPageCategories = data;
            // 同步到appData，供数据预览和导出功能使用
            if (typeof appData !== 'undefined') {
                const categoriesArray = Object.values(data);
                appData.customCategories = categoriesArray;
                
                // 为每个分类加载条目数据，供数据预览使用
                categoriesArray.forEach(cat => {
                    if (cat.id) {
                        localDataManager.handleRequest('/api/custom/items?category_id=' + cat.id)
                            .then(itemsData => {
                                if (Array.isArray(itemsData)) {
                                    cat.items = itemsData;
                                    // 重新渲染数据预览
                                    if (typeof renderDataPreview === 'function') {
                                        renderDataPreview();
                                    }
                                }
                            })
                            .catch(error => {
                                console.error('加载分类条目失败:', error);
                            });
                    }
                });
            }
            renderCategoryList();
        })
        .catch(error => {
            console.error('加载分类失败:', error);
            const categoryList = document.getElementById('category-list');
            if (categoryList) {
                categoryList.innerHTML = '<div class="empty-state"><p>加载失败</p></div>';
            }
        });
}

// 渲染分类列表
function renderCategoryList() {
    const categoryList = document.getElementById('category-list');
    if (!categoryList) return;
    
    const categories = Object.values(customPageCategories);
    
    if (categories.length === 0) {
        categoryList.innerHTML = '<div class="empty-state"><p>暂无分类</p></div>';
        return;
    }
    
    let html = '';
    categories.forEach(cat => {
        const active = cat.id === customPageCategoryId ? 'active' : '';
        html += `
            <div class="category-item ${active}" onclick="selectCategory('${cat.id}')">
                <span class="category-icon">${cat.icon || '📁'}</span>
                <span class="category-name">${cat.name}</span>
                <div class="category-actions">
                    <button class="action-btn" onclick="event.stopPropagation(); editCategory('${cat.id}')" title="编辑">✏️</button>
                    <button class="action-btn" onclick="event.stopPropagation(); deleteCategory('${cat.id}')" title="删除">🗑️</button>
                </div>
            </div>
        `;
    });
    
    categoryList.innerHTML = html;
}

// 选择分类
function selectCategory(categoryId) {
    customPageCategoryId = categoryId;
    renderCategoryList();
    loadCustomItems(categoryId);
    
    // 更新标题
    const titleEl = document.getElementById('current-category-title');
    const cat = customPageCategories[categoryId];
    if (titleEl && cat) {
        titleEl.textContent = `${cat.icon || '📁'} ${cat.name}`;
    }
    
    // 显示添加按钮和导出按钮
    const addBtn = document.getElementById('add-item-btn');
    if (addBtn) {
        addBtn.style.display = 'inline-block';
    }
    const exportBtn = document.getElementById('export-custom-btn');
    if (exportBtn) {
        exportBtn.style.display = 'inline-block';
    }
}

// 显示添加分类弹窗
function showAddCategory() {
    const html = `
        <div class="modal-content">
            <h3>📁 新建分类</h3>
            <div class="form-group">
                <label>分类名称</label>
                <input type="text" id="new-cat-name" placeholder="例如：NPC人物">
            </div>
            <div class="form-group">
                <label>图标（emoji）</label>
                <input type="text" id="new-cat-icon" placeholder="例如：👤" value="📁">
            </div>
            <div class="form-group">
                <label>描述</label>
                <textarea id="new-cat-desc" placeholder="分类描述"></textarea>
            </div>
            <div class="form-actions">
                <button class="btn-secondary" onclick="closeModal()">取消</button>
                <button class="btn-primary" onclick="addCategory()">创建</button>
            </div>
        </div>
    `;
    showModal(html);
}

// 添加分类
function addCategory() {
    const name = document.getElementById('new-cat-name').value.trim();
    const icon = document.getElementById('new-cat-icon').value.trim() || '📁';
    const description = document.getElementById('new-cat-desc').value.trim();
    
    if (!name) {
        showToast('请输入分类名称');
        return;
    }
    
    // 默认字段
    const defaultFields = [
        { key: 'name', label: '名称', type: 'text', required: true },
        { key: 'description', label: '描述', type: 'textarea' }
    ];
    
    localDataManager.handleRequest('/api/custom/categories/create', 'POST', {
        name: name,
        icon: icon,
        description: description,
        fields: defaultFields
    })
    .then(data => {
        if (data.success) {
            showToast('分类创建成功');
            closeModal();
            loadCustomCategories();
        } else {
            showToast('创建失败：' + (data.error || '未知错误'));
        }
    })
    .catch(error => {
        showToast('创建失败');
        console.error(error);
    });
}

// 编辑分类
function editCategory(categoryId) {
    const cat = customPageCategories[categoryId];
    if (!cat) return;
    
    const html = `
        <div class="modal-content">
            <h3>✏️ 编辑分类</h3>
            <div class="form-group">
                <label>分类名称</label>
                <input type="text" id="edit-cat-name" value="${cat.name}">
            </div>
            <div class="form-group">
                <label>图标（emoji）</label>
                <input type="text" id="edit-cat-icon" value="${cat.icon || '📁'}">
            </div>
            <div class="form-group">
                <label>描述</label>
                <textarea id="edit-cat-desc">${cat.description || ''}</textarea>
            </div>
            <div class="form-actions">
                <button class="btn-secondary" onclick="closeModal()">取消</button>
                <button class="btn-primary" onclick="saveEditCategory('${categoryId}')">保存</button>
            </div>
        </div>
    `;
    showModal(html);
}

// 保存分类编辑
function saveEditCategory(categoryId) {
    const name = document.getElementById('edit-cat-name').value.trim();
    const icon = document.getElementById('edit-cat-icon').value.trim() || '📁';
    const description = document.getElementById('edit-cat-desc').value.trim();
    
    if (!name) {
        showToast('请输入分类名称');
        return;
    }
    
    localDataManager.handleRequest('/api/custom/categories/edit', 'POST', {
        category_id: categoryId,
        name: name,
        icon: icon,
        description: description
    })
    .then(data => {
        if (data.success) {
            showToast('保存成功');
            closeModal();
            loadCustomCategories();
        } else {
            showToast('保存失败：' + (data.error || '未知错误'));
        }
    })
    .catch(error => {
        showToast('保存失败');
        console.error(error);
    });
}

// 删除分类
function deleteCategory(categoryId) {
    if (!confirm('确定要删除这个分类吗？分类下的所有数据也会被删除。')) {
        return;
    }
    
    localDataManager.handleRequest('/api/custom/categories/delete', 'POST', { category_id: categoryId })
    .then(data => {
        if (data.success) {
            showToast('删除成功');
            if (customPageCategoryId === categoryId) {
                customPageCategoryId = null;
                document.getElementById('current-category-title').textContent = '选择一个分类';
                document.getElementById('add-item-btn').style.display = 'none';
                const exportBtn = document.getElementById('export-custom-btn');
                if (exportBtn) {
                    exportBtn.style.display = 'none';
                }
                document.getElementById('custom-item-list').innerHTML = '<div class="empty-state"><p>👆 请从上方选择一个分类</p></div>';
            }
            loadCustomCategories();
        } else {
            showToast('删除失败：' + (data.error || '未知错误'));
        }
    })
    .catch(error => {
        showToast('删除失败');
        console.error(error);
    });
}

// ==================== 自定义条目管理 ====================

// 加载分类下的条目
function loadCustomItems(categoryId) {
    localDataManager.handleRequest('/api/custom/items?category_id=' + categoryId)
        .then(data => {
            // 兼容两种格式：直接返回数组 或 返回 {items: [...]}
            let allItems = [];
            if (Array.isArray(data)) {
                allItems = data;
            } else {
                allItems = data.items || [];
            }
            // 按分类筛选
            customPageItems = allItems.filter(item => item.category_id === categoryId);
            renderCustomItems();
            
            // 同步到appData，供数据预览使用
            if (typeof appData !== 'undefined' && appData.customCategories) {
                const cat = appData.customCategories.find(c => c.id === categoryId);
                if (cat) {
                    cat.items = customPageItems;
                    // 重新渲染数据预览
                    if (typeof renderDataPreview === 'function') {
                        renderDataPreview();
                    }
                }
            }
        })
        .catch(error => {
            console.error('加载条目失败:', error);
        });
}

// 渲染条目列表
function renderCustomItems() {
    const itemList = document.getElementById('custom-item-list');
    if (!itemList) return;
    
    const cat = customPageCategories[customPageCategoryId];
    
    if (customPageItems.length === 0) {
        itemList.innerHTML = '<div class="empty-state"><p>暂无条目，点击右上角添加</p></div>';
        return;
    }
    
    let html = '';
    customPageItems.forEach(item => {
        // 获取条目标题（使用第一个字段）
        let title = item.name || item.id || '未命名';
        if (cat && cat.fields && cat.fields.length > 0) {
            const firstField = cat.fields[0];
            if (item[firstField.key]) {
                title = item[firstField.key];
            }
        }
        
        html += `
            <div class="custom-item-card">
                <div class="item-card-header">
                    <h4>${title}${renderIdBadge(item.id)}</h4>
                    <div class="item-card-actions">
                        <button class="action-btn" onclick="editCustomItem('${item.id}')" title="编辑">✏️</button>
                        <button class="action-btn" onclick="deleteCustomItem('${item.id}')" title="删除">🗑️</button>
                    </div>
                </div>
                <div class="item-card-body">
                    ${renderItemFields(item, cat)}
                </div>
            </div>
        `;
    });
    
    itemList.innerHTML = html;
}

// 渲染条目字段
function renderItemFields(item, cat) {
    if (!cat || !cat.fields) return '';
    
    let html = '';
    cat.fields.forEach(field => {
        if (field.key === 'name') return; // 跳过名称字段（已在标题显示）
        
        const value = item[field.key] || '-';
        html += `
            <div class="item-field">
                <span class="field-label">${field.label}：</span>
                <span class="field-value">${value}</span>
            </div>
        `;
    });
    
    return html;
}

// 显示添加条目弹窗
function showAddCustomItem() {
    if (!customPageCategoryId) {
        showToast('请先选择一个分类');
        return;
    }
    
    const cat = customPageCategories[customPageCategoryId];
    if (!cat) return;
    
    let formHtml = '';
    cat.fields.forEach(field => {
        const required = field.required ? '<span style="color:red;">*</span>' : '';
        
        if (field.type === 'textarea') {
            formHtml += `
                <div class="form-group">
                    <label>${field.label}${required}</label>
                    <textarea id="item-field-${field.key}" placeholder="请输入${field.label}"></textarea>
                </div>
            `;
        } else if (field.type === 'select') {
            const options = (field.options || []).map(opt => `<option value="${opt}">${opt}</option>`).join('');
            formHtml += `
                <div class="form-group">
                    <label>${field.label}${required}</label>
                    <select id="item-field-${field.key}">
                        <option value="">请选择</option>
                        ${options}
                    </select>
                </div>
            `;
        } else if (field.type === 'number') {
            formHtml += `
                <div class="form-group">
                    <label>${field.label}${required}</label>
                    <input type="number" id="item-field-${field.key}" placeholder="请输入${field.label}">
                </div>
            `;
        } else {
            formHtml += `
                <div class="form-group">
                    <label>${field.label}${required}</label>
                    <input type="text" id="item-field-${field.key}" placeholder="请输入${field.label}">
                </div>
            `;
        }
    });
    
    const html = `
        <div class="modal-content">
            <h3>➕ 添加${cat.name}</h3>
            ${formHtml}
            <div class="form-actions">
                <button class="btn-secondary" onclick="closeModal()">取消</button>
                <button class="btn-primary" onclick="addCustomItem()">添加</button>
            </div>
        </div>
    `;
    showModal(html);
}

// 添加条目
function addCustomItem() {
    const cat = customPageCategories[customPageCategoryId];
    if (!cat) return;
    
    const itemData = {};
    let hasError = false;
    
    cat.fields.forEach(field => {
        const el = document.getElementById(`item-field-${field.key}`);
        if (el) {
            itemData[field.key] = el.value.trim();
        }
        
        if (field.required && !itemData[field.key]) {
            showToast(`请输入${field.label}`);
            hasError = true;
        }
    });
    
    if (hasError) return;
    
    localDataManager.handleRequest('/api/custom/items/create', 'POST', {
        category_id: customPageCategoryId,
        data: itemData
    })
    .then(data => {
        if (data.success) {
            showToast('添加成功');
            closeModal();
            loadCustomItems(customPageCategoryId);
        } else {
            showToast('添加失败：' + (data.error || '未知错误'));
        }
    })
    .catch(error => {
        showToast('添加失败');
        console.error(error);
    });
}

// 编辑条目
function editCustomItem(itemId) {
    const cat = customPageCategories[customPageCategoryId];
    const item = customPageItems.find(i => i.id === itemId);
    if (!cat || !item) return;
    
    let formHtml = '';
    cat.fields.forEach(field => {
        const value = item[field.key] || '';
        const required = field.required ? '<span style="color:red;">*</span>' : '';
        
        if (field.type === 'textarea') {
            formHtml += `
                <div class="form-group">
                    <label>${field.label}${required}</label>
                    <textarea id="edit-item-field-${field.key}">${value}</textarea>
                </div>
            `;
        } else if (field.type === 'select') {
            const options = (field.options || []).map(opt => 
                `<option value="${opt}" ${opt === value ? 'selected' : ''}>${opt}</option>`
            ).join('');
            formHtml += `
                <div class="form-group">
                    <label>${field.label}${required}</label>
                    <select id="edit-item-field-${field.key}">
                        <option value="">请选择</option>
                        ${options}
                    </select>
                </div>
            `;
        } else if (field.type === 'number') {
            formHtml += `
                <div class="form-group">
                    <label>${field.label}${required}</label>
                    <input type="number" id="edit-item-field-${field.key}" value="${value}">
                </div>
            `;
        } else {
            formHtml += `
                <div class="form-group">
                    <label>${field.label}${required}</label>
                    <input type="text" id="edit-item-field-${field.key}" value="${value}">
                </div>
            `;
        }
    });
    
    const html = `
        <div class="modal-content">
            <h3>✏️ 编辑${cat.name}</h3>
            ${formHtml}
            <div class="form-actions">
                <button class="btn-secondary" onclick="closeModal()">取消</button>
                <button class="btn-primary" onclick="saveEditCustomItem('${itemId}')">保存</button>
            </div>
        </div>
    `;
    showModal(html);
}

// 保存条目编辑
function saveEditCustomItem(itemId) {
    const cat = customPageCategories[customPageCategoryId];
    if (!cat) return;
    
    const itemData = {};
    let hasError = false;
    
    cat.fields.forEach(field => {
        const el = document.getElementById(`edit-item-field-${field.key}`);
        if (el) {
            itemData[field.key] = el.value.trim();
        }
        
        if (field.required && !itemData[field.key]) {
            showToast(`请输入${field.label}`);
            hasError = true;
        }
    });
    
    if (hasError) return;
    
    localDataManager.handleRequest('/api/custom/items/edit', 'POST', {
        category_id: customPageCategoryId,
        item_id: itemId,
        data: itemData
    })
    .then(data => {
        if (data.success) {
            showToast('保存成功');
            closeModal();
            loadCustomItems(customPageCategoryId);
        } else {
            showToast('保存失败：' + (data.error || '未知错误'));
        }
    })
    .catch(error => {
        showToast('保存失败');
        console.error(error);
    });
}

// 删除条目
function deleteCustomItem(itemId) {
    if (!confirm('确定要删除这个条目吗？')) {
        return;
    }
    
    localDataManager.handleRequest('/api/custom/items/delete', 'POST', {
        category_id: customPageCategoryId,
        item_id: itemId
    })
    .then(data => {
        if (data.success) {
            showToast('删除成功');
            loadCustomItems(customPageCategoryId);
        } else {
            showToast('删除失败：' + (data.error || '未知错误'));
        }
    })
    .catch(error => {
        showToast('删除失败');
        console.error(error);
    });
}

console.log('custom_features.js 已加载');


// ==================== 自定义技能功能 ====================

// 显示添加自定义技能弹窗
function showAddCustomSkill() {
    const html = `
        <div class="modal-header">
            <h3>✨ 添加自定义技能</h3>
            <button class="modal-close" onclick="closeModal()">×</button>
        </div>
        <div class="modal-body">
            <div class="form-group">
                <label>技能名称</label>
                <input type="text" id="new-skill-name" placeholder="请输入技能名称">
            </div>
            <div class="form-group">
                <label>技能图标（emoji）</label>
                <input type="text" id="new-skill-icon" placeholder="例如：✨🔥⚔️" value="✨">
            </div>
            <div class="form-group">
                <label>技能描述</label>
                <textarea id="new-skill-desc" placeholder="请输入技能描述" rows="3"></textarea>
            </div>
            <div class="form-group">
                <label>技能威力</label>
                <input type="number" id="new-skill-damage" value="0" min="0">
            </div>
            <div class="form-group">
                <label>初始等级</label>
                <input type="number" id="new-skill-level" value="1" min="1">
            </div>
            <div class="modal-actions">
                <button class="btn-secondary" onclick="closeModal()">取消</button>
                <button class="btn-primary" onclick="addCustomSkill()">添加</button>
            </div>
        </div>
    `;
    showModal(html);
}

// 添加自定义技能
function addCustomSkill() {
    const name = document.getElementById('new-skill-name').value.trim();
    const icon = document.getElementById('new-skill-icon').value.trim() || '✨';
    const damage = document.getElementById('new-skill-damage').value.trim();
    const description = document.getElementById('new-skill-desc').value.trim();
    const level = parseInt(document.getElementById('new-skill-level').value) || 1;
    
    if (!name) {
        showToast('请输入技能名称', 'error');
        return;
    }
    
    localDataManager.handleRequest('/api/skills/custom/create', 'POST', {
        name: name,
        icon: icon,
        description: description,
        damage: damage,
        level: level
    })
    .then(result => {
        if (result.success) {
            showToast('技能添加成功');
            closeModal();
            loadCustomSkills();
        } else {
            showToast('添加失败: ' + (result.message || '未知错误'), 'error');
        }
    })
    .catch(error => {
        showToast('添加失败', 'error');
        console.error(error);
    });
}

// 编辑技能
function editSkill(skillId) {
    const skill = appData.skills.find(s => s.id === skillId);
    if (!skill) return;
    
    const html = `
        <div class="modal-header">
            <h3>✏️ 编辑技能</h3>
            <button class="modal-close" onclick="closeModal()">×</button>
        </div>
        <div class="modal-body">
            <div class="form-group">
                <label>技能名称</label>
                <input type="text" id="edit-skill-name" value="${skill.name || ''}">
            </div>
            <div class="form-group">
                <label>技能图标（emoji）</label>
                <input type="text" id="edit-skill-icon" value="${skill.icon || '✨'}">
            </div>
            <div class="form-group">
                <label>技能描述</label>
                <textarea id="edit-skill-desc" rows="3">${skill.description || ''}</textarea>
            </div>
            <div class="form-group">
                <label>等级</label>
                <input type="number" id="edit-skill-level" value="${skill.level || 1}" min="1">
            </div>
            <div class="form-group">
                <label>威力/伤害</label>
                <input type="number" id="edit-skill-damage" value="${skill.damage || 0}" min="0">
            </div>
            <div class="modal-actions">
                <button class="btn-secondary" onclick="closeModal()">取消</button>
                <button class="btn-danger" onclick="deleteSkill('${skillId}')">删除</button>
                <button class="btn-primary" onclick="saveEditSkill('${skillId}')">保存</button>
            </div>
        </div>
    `;
    showModal(html);
}

// 保存技能编辑
function saveEditSkill(skillId) {
    const name = document.getElementById('edit-skill-name').value.trim();
    const icon = document.getElementById('edit-skill-icon').value.trim() || '✨';
    const damage = document.getElementById('edit-skill-damage').value.trim();
    const description = document.getElementById('edit-skill-desc').value.trim();
    const level = parseInt(document.getElementById('edit-skill-level').value) || 1;
    
    if (!name) {
        showToast('请输入技能名称', 'error');
        return;
    }
    
    localDataManager.handleRequest('/api/skills/custom/edit', 'POST', {
        id: skillId,
        name: name,
        icon: icon,
        damage: damage,
        description: description,
        level: level
    })
    .then(result => {
        if (result.success) {
            showToast('保存成功');
            closeModal();
            loadCustomSkills();
        } else {
            showToast('保存失败: ' + (result.message || '未知错误'), 'error');
        }
    })
    .catch(error => {
        showToast('保存失败', 'error');
        console.error(error);
    });
}

// 删除技能（从自定义技能库删除 + 从已学列表遗忘）
function deleteSkill(skillId) {
    if (!confirm('确定要删除这个技能吗？')) return;
    
    // 先尝试从自定义技能库删除（使用 id 参数）
    localDataManager.handleRequest('/api/skills/custom/delete', 'POST', { id: skillId })
    .then(result => {
        // 再从已学技能列表中遗忘
        return localDataManager.handleRequest('/api/skills/forget', 'POST', { skill_id: skillId });
    })
    .then(result => {
        showToast('删除成功');
        closeModal();
        if (typeof loadSkills === 'function') {
            loadSkills();
        }
        loadCustomSkills();
    })
    .catch(error => {
        showToast('删除失败', 'error');
        console.error(error);
    });
}

// 遗忘技能
function forgetSkill(skillId) {
    if (!confirm('确定要遗忘这个技能吗？')) return;
    
    localDataManager.handleRequest('/api/skills/forget', 'POST', { skill_id: skillId })
    .then(result => {
        if (result.success) {
            showToast('已遗忘该技能');
            if (typeof loadSkills === 'function') {
                loadSkills();
            }
        } else {
            showToast('遗忘失败: ' + (result.error || '未知错误'), 'error');
        }
    })
    .catch(error => {
        showToast('遗忘失败', 'error');
        console.error(error);
    });
}

// 渲染带操作按钮的技能列表
function renderSkillsWithActions() {
    const container = document.getElementById('skill-list');
    if (!appData.skills || appData.skills.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">✨</div>
                <div>暂无技能，点击上方"添加技能"按钮创建</div>
            </div>
        `;
        return;
    }
    
    let html = '';
    appData.skills.forEach(skill => {
        html += `
            <div class="skill-card" onclick="editSkill('${skill.id}')">
                <div class="skill-icon">${skill.icon || '✨'}</div>
                <div class="skill-name">${skill.name}${renderIdBadge(skill.id)}</div>
                <div class="skill-level">Lv.${skill.level || 1}${skill.damage ? ' | 威力: ' + skill.damage : ''}</div>
                <div class="skill-description">${skill.description || ''}</div>
                <div class="item-card-actions" onclick="event.stopPropagation()">
                    <button class="action-btn" onclick="editSkill('${skill.id}')">编辑</button>
                    <button class="action-btn" onclick="forgetSkill('${skill.id}')">遗忘</button>
                    <button class="action-btn delete" onclick="deleteSkill('${skill.id}')">删除</button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

// ==================== 自定义任务功能 ====================

// 显示添加自定义任务弹窗
function showAddCustomQuest() {
    const html = `
        <div class="modal-header">
            <h3>📜 添加自定义任务</h3>
            <button class="modal-close" onclick="closeModal()">×</button>
        </div>
        <div class="modal-body">
            <div class="form-group">
                <label>任务名称</label>
                <input type="text" id="new-quest-name" placeholder="请输入任务名称">
            </div>
            <div class="form-group">
                <label>任务描述</label>
                <textarea id="new-quest-desc" placeholder="请输入任务描述" rows="3"></textarea>
            </div>
            <div class="form-group">
                <label>任务奖励</label>
                <textarea id="new-quest-reward" rows="2" placeholder="请输入任务奖励"></textarea>
            </div>
            <div class="form-group">
                <label>任务类型</label>
                <select id="new-quest-type">
                    <option value="main">主线任务</option>
                    <option value="side">支线任务</option>
                    <option value="daily">日常任务</option>
                    <option value="hidden">隐藏任务</option>
                </select>
            </div>
            <div class="form-group">
                <label>任务状态</label>
                <select id="new-quest-status">
                    <option value="in_progress">进行中</option>
                    <option value="completed">已完成</option>
                    <option value="failed">已失败</option>
                </select>
            </div>
            <div class="modal-actions">
                <button class="btn-secondary" onclick="closeModal()">取消</button>
                <button class="btn-primary" onclick="addCustomQuest()">添加</button>
            </div>
        </div>
    `;
    showModal(html);
}

// 添加自定义任务
function addCustomQuest() {
    const name = document.getElementById('new-quest-name').value.trim();
    const description = document.getElementById('new-quest-desc').value.trim();
    const reward = document.getElementById('new-quest-reward').value.trim();
    const type = document.getElementById('new-quest-type').value;
    const status = document.getElementById('new-quest-status').value;
    
    if (!name) {
        showToast('请输入任务名称', 'error');
        return;
    }
    
    localDataManager.handleRequest('/api/quests/custom/create', 'POST', {
        name: name,
        description: description,
        reward: reward,
        type: type,
        status: status
    })
    .then(result => {
        if (result.success) {
            showToast('任务添加成功');
            closeModal();
            loadCustomQuests();
        } else {
            showToast('添加失败: ' + (result.message || '未知错误'), 'error');
        }
    })
    .catch(error => {
        showToast('添加失败', 'error');
        console.error(error);
    });
}

// 编辑任务
function editQuest(questId) {
    const quest = appData.quests.find(q => q.id === questId);
    if (!quest) return;
    
    const html = `
        <div class="modal-header">
            <h3>✏️ 编辑任务</h3>
            <button class="modal-close" onclick="closeModal()">×</button>
        </div>
        <div class="modal-body">
            <div class="form-group">
                <label>任务名称</label>
                <input type="text" id="edit-quest-name" value="${quest.name || quest.title || ''}">
            </div>
            <div class="form-group">
                <label>任务描述</label>
                <textarea id="edit-quest-desc" rows="3">${quest.description || ''}</textarea>
            </div>
            <div class="form-group">
                <label>任务奖励</label>
                <textarea id="edit-quest-reward" rows="2">${quest.reward || ''}</textarea>
            </div>
            <div class="form-group">
                <label>任务类型</label>
                <select id="edit-quest-type">
                    <option value="main" ${quest.type === 'main' ? 'selected' : ''}>主线任务</option>
                    <option value="side" ${quest.type === 'side' ? 'selected' : ''}>支线任务</option>
                    <option value="daily" ${quest.type === 'daily' ? 'selected' : ''}>日常任务</option>
                    <option value="hidden" ${quest.type === 'hidden' ? 'selected' : ''}>隐藏任务</option>
                </select>
            </div>
            <div class="form-group">
                <label>任务状态</label>
                <select id="edit-quest-status">
                    <option value="in_progress" ${quest.status === 'in_progress' ? 'selected' : ''}>进行中</option>
                    <option value="completed" ${quest.status === 'completed' ? 'selected' : ''}>已完成</option>
                    <option value="failed" ${quest.status === 'failed' ? 'selected' : ''}>已失败</option>
                </select>
            </div>
            <div class="modal-actions">
                <button class="btn-secondary" onclick="closeModal()">取消</button>
                <button class="btn-danger" onclick="deleteQuest('${questId}')">删除</button>
                <button class="btn-primary" onclick="saveEditQuest('${questId}')">保存</button>
            </div>
        </div>
    `;
    showModal(html);
}

// 保存任务编辑
function saveEditQuest(questId) {
    const name = document.getElementById('edit-quest-name').value.trim();
    const description = document.getElementById('edit-quest-desc').value.trim();
    const reward = document.getElementById('edit-quest-reward').value.trim();
    const type = document.getElementById('edit-quest-type').value;
    const status = document.getElementById('edit-quest-status').value;
    
    if (!name) {
        showToast('请输入任务名称', 'error');
        return;
    }
    
    localDataManager.handleRequest('/api/quests/custom/edit', 'POST', {
        id: questId,
        name: name,
        description: description,
        reward: reward,
        type: type,
        status: status
    })
    .then(result => {
        if (result.success) {
            showToast('保存成功');
            closeModal();
            loadCustomQuests();
        } else {
            showToast('保存失败: ' + (result.message || '未知错误'), 'error');
        }
    })
    .catch(error => {
        showToast('保存失败', 'error');
        console.error(error);
    });
}

// 删除任务
function deleteQuest(questId) {
    if (!confirm('确定要删除这个任务吗？')) return;
    
    localDataManager.handleRequest('/api/quests/custom/delete', 'POST', { id: questId })
    .then(result => {
        if (result.success) {
            showToast('删除成功');
            closeModal();
            loadCustomQuests();
        } else {
            showToast('删除失败: ' + (result.message || '未知错误'), 'error');
        }
    })
    .catch(error => {
        showToast('删除失败', 'error');
        console.error(error);
    });
}

// 渲染带操作按钮的任务列表
function renderQuestsWithActions() {
    const container = document.getElementById('quest-list');
    if (!appData.quests || appData.quests.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📜</div>
                <div>暂无任务，点击上方"添加任务"按钮创建</div>
            </div>
        `;
        return;
    }
    
    let html = '';
    appData.quests.forEach(quest => {
        const statusText = {
            'in_progress': '进行中',
            'completed': '已完成',
            'failed': '已失败'
        }[quest.status] || quest.status;
        
        const statusClass = {
            'in_progress': 'quest-in-progress',
            'completed': 'quest-completed',
            'failed': 'quest-failed'
        }[quest.status] || '';
        
        html += `
            <div class="quest-card ${statusClass}" onclick="editQuest('${quest.id}')">
                <div class="quest-title">${quest.name || quest.title}${renderIdBadge(quest.id)}</div>
                <div class="quest-desc">${quest.description || ''}</div>
                <div class="quest-status">${statusText}</div>
                <div class="item-card-actions" onclick="event.stopPropagation()">
                    <button class="action-btn" onclick="editQuest('${quest.id}')">编辑</button>
                    <button class="action-btn delete" onclick="deleteQuest('${quest.id}')">删除</button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}


// 加载自定义技能
function loadCustomSkills() {
    localDataManager.handleRequest('/api/skills/custom/list')
        .then(result => {
            // 合并自定义技能与已加载的技能，避免覆盖已学技能
            const custom = (result && result.skills) ? result.skills : [];
            if (!Array.isArray(appData.skills)) appData.skills = [];
            const map = {};
            appData.skills.forEach(s => { if (s && s.id) map[s.id] = s; });
            custom.forEach(s => { if (s && s.id) map[s.id] = Object.assign({}, map[s.id] || {}, s); });
            appData.skills = Object.values(map);
            renderSkills();
        })
        .catch(error => {
            console.error('加载自定义技能失败:', error);
            renderSkills();
        });
}

// 加载自定义任务
function loadCustomQuests() {
    localDataManager.handleRequest('/api/quests/custom/list')
        .then(result => {
            if (result && result.quests) {
                appData.quests = result.quests;
                renderQuests();
            } else {
                appData.quests = [];
                renderQuests();
            }
        })
        .catch(error => {
            console.error('加载任务失败:', error);
            appData.quests = [];
            renderQuests();
        });
}

// 显示自定义技能库
function showCustomSkillLibrary() {
    if (!appData.skills || appData.skills.length === 0) {
        showToast('暂无技能，请先添加自定义技能', 'info');
        return;
    }
    
    let html = '<div style="max-height: 400px; overflow-y: auto;">';
    appData.skills.forEach(skill => {
        html += `
            <div style="padding: 12px; border-bottom: 1px solid #e2e8f0; cursor: pointer;" onclick="editSkill('${skill.id}')">
                <div style="font-weight: 500;">${skill.icon || '✨'} ${skill.name}</div>
                <div style="font-size: 12px; color: #64748b; margin-top: 4px;">${skill.description || ''}</div>
                <div style="font-size: 12px; color: #64748b; margin-top: 2px;">等级: ${skill.level || 1}</div>
            </div>
        `;
    });
    html += '</div>';
    
    showModal('技能库', html, [
        { text: '关闭', class: 'btn-secondary', action: closeModal }
    ]);
}

// 显示自定义任务模板
function showCustomQuestTemplates() {
    if (!appData.quests || appData.quests.length === 0) {
        showToast('暂无任务，请先添加自定义任务', 'info');
        return;
    }
    
    let html = '<div style="max-height: 400px; overflow-y: auto;">';
    appData.quests.forEach(quest => {
        const statusText = {
            'in_progress': '进行中',
            'completed': '已完成',
            'failed': '已失败'
        }[quest.status] || quest.status;
        
        html += `
            <div style="padding: 12px; border-bottom: 1px solid #e2e8f0; cursor: pointer;" onclick="editQuest('${quest.id}')">
                <div style="font-weight: 500;">📜 ${quest.name || quest.title}</div>
                <div style="font-size: 12px; color: #64748b; margin-top: 4px;">${quest.description || ''}</div>
                <div style="font-size: 12px; color: #64748b; margin-top: 2px;">状态: ${statusText}</div>
            </div>
        `;
    });
    html += '</div>';
    
    showModal('任务模板', html, [
        { text: '关闭', class: 'btn-secondary', action: closeModal }
    ]);
}


// ==================== 自定义模块导出 ====================

// 显示自定义分类导出选择弹窗
function showCustomExport() {
    // 获取所有分类
    const categories = Object.values(customPageCategories);
    
    if (categories.length === 0) {
        showToast('暂无分类', 'error');
        return;
    }
    
    let html = `
        <div class="modal-content">
            <h3>📤 导出自定义数据</h3>
            <p style="margin-bottom: 16px; color: #6b7280;">请选择要导出的分类：</p>
            <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px;">
                <button class="btn-secondary" onclick="exportCustomCategory('', '全部分类')" style="width: 100%; text-align: left;">
                    📋 全部分类（导出所有分类的数据）
                </button>
    `;
    
    categories.forEach(cat => {
        const icon = cat.icon || '📁';
        html += `
                <button class="btn-secondary" onclick="exportCustomCategory('${cat.id}', '${cat.name}')" style="width: 100%; text-align: left;">
                    ${icon} ${cat.name}
                </button>
        `;
    });
    
    html += `
            </div>
            <div style="display: flex; gap: 8px; justify-content: flex-end;">
                <button class="btn-secondary" onclick="closeModal()">取消</button>
            </div>
        </div>
    `;
    
    showModalHtml(html);
}

// 导出指定分类的自定义数据
function exportCustomCategory(categoryId, categoryName) {
    closeModal();
    
    let url;
    if (categoryId) {
        url = `/api/export/custom/category/${encodeURIComponent(categoryId)}/txt`;
    } else {
        url = '/api/export/module/custom/txt';
    }
    
    localDataManager.handleRequest(url)
        .then(data => {
            if (data.success) {
                const filename = data.filename || '自定义数据.txt';
                // 尝试使用 Capacitor Filesystem
                if (window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.Filesystem) {
                    const Filesystem = Capacitor.Plugins.Filesystem;
                    Filesystem.writeFile({
                        path: 'NovelManager/' + filename,
                        data: data.content,
                        directory: 'DOCUMENTS',
                        encoding: 'utf-8'
                    }).then(() => {
                        showToast(`已导出${categoryName}，保存在 Documents/NovelManager/${filename}`, 'success');
                    }).catch(err => {
                        console.warn('Filesystem 写入失败，回退到 Blob 下载:', err);
                        fallbackBlobDownload(data.content, filename);
                    });
                } else if (typeof fallbackBlobDownload === 'function') {
                    fallbackBlobDownload(data.content, filename);
                } else {
                    // 最终回退：直接 Blob 下载
                    const blob = new Blob([data.content], { type: 'text/plain;charset=utf-8' });
                    const blobUrl = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = blobUrl;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(blobUrl);
                    showToast(`已导出${categoryName}`, 'success');
                }
            } else {
                showToast('导出失败', 'error');
            }
        })
        .catch(err => {
            console.error('导出失败:', err);
            showToast('导出失败', 'error');
        });
}
