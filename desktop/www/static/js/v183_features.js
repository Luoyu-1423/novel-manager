// ==================== v1.8.3 新功能模块 ====================

// 全局数据
let v183Data = {
    locations: [],
    locationTags: [],
    selectedLocationId: null,
    expandedLocations: new Set(),
    
    characters: [],
    relations: [],
    relationTypes: [],
    selectedCharacterId: null,
    filterCharacterId: null,
    currentView: 'list',
    
    // 网络模式相关
    networkZoom: 1,
    networkPanX: 0,
    networkPanY: 0,
    networkNodes: [],
    networkLinks: []
};

// 颜色配置（用于不同层级的三角形）
const levelColors = [
    '#6366f1', // 一级 - 靛蓝
    '#8b5cf6', // 二级 - 紫色
    '#ec4899', // 三级 - 粉色
    '#f43f5e', // 四级 - 玫红
    '#f97316', // 五级 - 橙色
    '#eab308', // 六级 - 黄色
    '#22c55e', // 七级 - 绿色
    '#14b8a6', // 八级 - 青色
    '#06b6d4', // 九级 - 天蓝
    '#3b82f6'  // 十级 - 蓝色
];

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', function() {
    // 页面切换时加载对应数据
    const originalSwitchPage = window.switchPage;
    if (originalSwitchPage) {
        window.switchPage = function(pageId) {
            originalSwitchPage(pageId);
            if (pageId === 'map') {
                loadLocations();
            } else if (pageId === 'relation') {
                loadCharacters();
                loadRelations();
                loadRelationTypes();
            } else if (pageId === 'item-library') {
                if (typeof renderItemLibrary === 'function') renderItemLibrary();
            }
        };
    }

    // 初始化时就加载一次数据，避免页面显示"加载中"
    setTimeout(function() {
        loadLocations();
        loadCharacters();
        loadRelations();
        loadRelationTypes();
    }, 500);
});

// ==================== 地点管理 ====================

// 加载地点列表
function loadLocations() {
    localDataManager.handleRequest('/api/locations').then(function(locations) {
        localDataManager.handleRequest('/api/locations/types').then(function(types) {
            // 保存数据到全局
            window._mapData = {
                locations: locations || {},
                types: types || {}
            };
            renderLocations(locations);
        });
    });
}

// 渲染地点列表（树状结构）
// 全局状态
window._mapState = {
    expanded: new Set(),  // 展开的节点ID
    selected: null,       // 选中的节点ID
    selectedData: null    // 选中的节点数据
};

// 渲染地点列表（类似Windows文件管理器的树状结构）
function renderLocations(locations) {
    const container = document.getElementById('location-list');
    if (!container) return;
    
    if (!locations || Object.keys(locations).length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>${SvgIconLib ? SvgIconLib.renderAuto('map', 16) : '🗺️'} 还没有地点</p>
                <p style="font-size: 12px; color: var(--text-secondary); margin-top: 8px;">点击右上角"添加地点"开始创建</p>
            </div>
        `;
        return;
    }
    
    // 构建树状结构
    const locationMap = {};
    const roots = [];
    
    for (const [id, loc] of Object.entries(locations)) {
        locationMap[id] = { ...loc, id, children: [] };
    }
    
    for (const [id, loc] of Object.entries(locationMap)) {
        if (loc.parent_id && locationMap[loc.parent_id]) {
            locationMap[loc.parent_id].children.push(loc);
        } else {
            roots.push(loc);
        }
    }
    
    // 渲染树状结构
    let html = '';
    
    // 顶部操作栏
    html += `
        <div style="margin-bottom: 12px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
            <button class="btn-small" onclick="showLocationTypeManager()">${SvgIconLib ? SvgIconLib.render('tag', 12) : '🏷️'} 标签管理</button>
            <div style="flex: 1;"></div>
            <button class="btn-small" onclick="expandAllLocations()">全部展开</button>
            <button class="btn-small" onclick="collapseAllLocations()">全部折叠</button>
        </div>
    `;
    
    // 选中地点的信息栏
    if (window._mapState.selected && window._mapState.selectedData) {
        const sel = window._mapState.selectedData;
        html += `
            <div style="background: color-mix(in srgb, var(--primary-color, #6366f1) 8%, var(--card-bg, #fff)); border: 1px solid color-mix(in srgb, var(--primary-color, #6366f1) 45%, var(--border-color, #e2e8f0)); border-radius: 8px; padding: 12px; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <span>${SvgIconLib ? SvgIconLib.renderAuto(sel.icon || 'pin', 18) : (sel.icon || '📍')}</span>
                    <span style="font-weight: 600; color: var(--primary-color, #4338ca);">${sel.name}</span>
                    <span style="font-size: 12px; color: var(--primary-color, #6366f1); background: color-mix(in srgb, var(--primary-color, #6366f1) 12%, var(--card-bg, #fff)); padding: 2px 8px; border-radius: 4px;">已选中</span>
                </div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <button class="btn-small" onclick="showAddChildLocation('${sel.id}')" style="background: #10b981; border-color: #10b981;">+ 添加子地点</button>
                    <button class="btn-small" onclick="editLocation('${sel.id}')">${SvgIconLib ? SvgIconLib.render('edit', 12) : '✏️'} 编辑</button>
                    <button class="btn-small" onclick="deleteLocation('${sel.id}')" style="background: #ef4444; border-color: #ef4444;">${SvgIconLib ? SvgIconLib.render('trash', 12) : '🗑️'} 删除</button>
                </div>
            </div>
        `;
    }
    
    // 树状结构
    html += '<div class="location-tree" style="background: var(--card-bg, #fff); border: 1px solid var(--border-color, #e2e8f0); border-radius: 8px; padding: 8px 0;">';
    roots.forEach(loc => {
        html += renderLocationTreeNode(loc, 0);
    });
    html += '</div>';
    
    container.innerHTML = html;
}

// 渲染单个地点树节点
function renderLocationTreeNode(location, level) {
    const types = window._mapData?.types || {};
    const typeInfo = types[location.type] || {};
    const typeName = typeInfo.name || location.type || '';
    const typeIcon = typeInfo.icon || '';
    
    const hasChildren = location.children && location.children.length > 0;
    const isExpanded = window._mapState.expanded.has(location.id);
    const isSelected = window._mapState.selected === location.id;
    
    const indent = level * 24;
    
    // 层级颜色（同级同色，不同级不同色）
    const levelColors = [
        { bg: '#dbeafe', text: '#2563eb', border: '#93c5fd' },  // 蓝色 - 第0级
        { bg: '#dcfce7', text: '#16a34a', border: '#86efac' },  // 绿色 - 第1级
        { bg: '#fef3c7', text: '#d97706', border: '#fcd34d' },  // 橙色 - 第2级
        { bg: '#ede9fe', text: '#7c3aed', border: '#c4b5fd' },  // 紫色 - 第3级
        { bg: '#fce7f3', text: '#db2777', border: '#f9a8d4' },  // 粉色 - 第4级
        { bg: '#f3f4f6', text: '#4b5563', border: '#d1d5db' },  // 灰色 - 第5级及以上
    ];
    const colorIdx = Math.min(level, levelColors.length - 1);
    const levelColor = levelColors[colorIdx];
    
    // 展开/折叠按钮
    let arrowHtml = '';
    if (hasChildren) {
        arrowHtml = `
            <span class="tree-expand-btn" onclick="event.stopPropagation(); toggleLocationExpand('${location.id}')" 
                  style="display: inline-flex; align-items: center; justify-content: center; 
                         width: 22px; height: 22px; 
                         background: ${levelColor.bg}; 
                         color: ${levelColor.text};
                         border: 1px solid ${levelColor.border};
                         border-radius: 4px;
                         cursor: pointer; 
                         user-select: none; 
                         font-size: 10px;
                         font-weight: bold;
                         margin-right: 4px;
                         transition: all 0.2s;">
                ${isExpanded ? '−' : '+'}
            </span>
        `;
    } else {
        arrowHtml = '<span style="display: inline-block; width: 26px;"></span>';
    }
    
    // 文件夹/文件图标
    let folderIcon;
    if (hasChildren) {
        folderIcon = SvgIconLib ? SvgIconLib.render(isExpanded ? 'folder_open' : 'folder', 14) : (isExpanded ? '📂' : '📁');
    } else {
        folderIcon = SvgIconLib ? SvgIconLib.render('description', 14) : '📄';
    }
    
    // 选中样式
    const selectedClass = isSelected ? 'location-item-selected' : '';
    const selectedStyle = isSelected ? 'background: color-mix(in srgb, var(--primary-color, #6366f1) 14%, var(--card-bg, #fff)); border-color: var(--primary-color, #6366f1);' : '';
    
    let html = `
        <div class="location-tree-node" style="margin-left: ${indent}px;">
            <div class="location-item ${selectedClass}" 
                 style="display: flex; align-items: center; padding: 6px 8px; margin: 2px 4px; border-radius: 4px; cursor: pointer; border: 1px solid transparent; ${selectedStyle}"
                 onclick="selectLocation('${location.id}')">
                ${arrowHtml}
                <span style="margin-right: 6px;">${location.icon || folderIcon}</span>
                <span style="flex: 1; font-size: 14px;">${escapeHtml(location.name)}${renderIdBadge(location.id)}</span>
                ${typeIcon && typeName ? `<span style="font-size: 11px; color: var(--text-secondary);">${typeIcon} ${typeName}</span>` : ''}
            </div>
        </div>
    `;
    
    // 递归渲染子节点（如果展开了）
    if (hasChildren && isExpanded) {
        location.children.forEach(child => {
            html += renderLocationTreeNode(child, level + 1);
        });
    }
    
    return html;
}

// 切换展开/折叠
function toggleLocationExpand(locationId) {
    if (window._mapState.expanded.has(locationId)) {
        window._mapState.expanded.delete(locationId);
    } else {
        window._mapState.expanded.add(locationId);
    }
    loadLocations();
}

// 选中地点
function selectLocation(locationId) {
    const locations = window._mapData?.locations || {};
    window._mapState.selected = locationId;
    if (locations[locationId]) {
        window._mapState.selectedData = { ...locations[locationId], id: locationId };
    } else {
        window._mapState.selectedData = null;
    }
    loadLocations();
}

// 全部展开
function expandAllLocations() {
    const locations = window._mapData?.locations || {};
    for (const id of Object.keys(locations)) {
        window._mapState.expanded.add(id);
    }
    loadLocations();
}

// 全部折叠
function collapseAllLocations() {
    window._mapState.expanded.clear();
    loadLocations();
}

// 显示添加子地点弹窗
function showAddChildLocation(parentId) {
    // 先获取所有地点和类型
    localDataManager.handleRequest('/api/locations').then(function(locations) {
        localDataManager.handleRequest('/api/locations/types').then(function(types) {
            const parent = locations[parentId];
            
            let typeOptions = '<option value="">无标签</option>';
            if (types && Object.keys(types).length > 0) {
                for (const [typeId, type] of Object.entries(types)) {
                    typeOptions += `<option value="${typeId}">${(type.icon && SvgIconLib && SvgIconLib.is(type.icon)) ? type.icon + ' ' : ''}${type.name || typeId}</option>`;
                }
            } else {
                typeOptions = '<option value="">无标签</option><option value="default">默认类型</option>';
            }
            
            const content = `
                <div style="background: var(--bg-color); padding: 8px 12px; border-radius: 6px; margin-bottom: 12px; font-size: 13px;">
                    ${SvgIconLib ? SvgIconLib.render('pin', 14) : '📍'} 父地点：<strong>${parent?.name || '未知'}</strong>
                </div>
                <div class="form-group">
                    <label>地点名称</label>
                    <input type="text" id="location-name" placeholder="请输入地点名称">
                </div>
                <div class="form-group">
                    <label>图标</label>
                    <input type="text" id="location-icon" value="pin" placeholder="SVG key 或 emoji">
                </div>
                <div class="form-group">
                    <label>标签</label>
                    <select id="location-type">
                        ${typeOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>描述</label>
                    <textarea id="location-description" placeholder="请输入地点描述" rows="3"></textarea>
                </div>
            `;
            
            showModal('添加子地点', content, [
                { text: '取消', action: closeModal },
                { text: '添加', action: function() { addLocationWithParent(parentId); }, primary: true }
            ]);
        });
    });
}

// 添加子地点
function addLocationWithParent(parentId) {
    const name = document.getElementById('location-name').value || '';
    const icon = document.getElementById('location-icon').value || 'pin';
    const type = document.getElementById('location-type').value || 'other';
    const description = document.getElementById('location-description').value || '';
    
    if (!name) {
        showToast('请输入地点名称', 'error');
        return;
    }
    
    const data = {
        name: name,
        icon: icon,
        type: type,
        parent_id: parentId,
        description: description
    };
    
    localDataManager.handleRequest('/api/locations/create', 'POST', data).then(function(result) {
        if (result.success) {
            showToast('地点添加成功', 'success');
            closeModal();
            // 自动展开父节点
            window._mapState.expanded.add(parentId);
            // 选中新添加的地点
            if (result.location_id) {
                window._mapState.selected = result.location_id;
            }
            loadLocations();
        } else {
            showToast(result.message || '添加失败', 'error');
        }
    });
}

function showAddLocation() {
    // 先获取所有地点和类型
    localDataManager.handleRequest('/api/locations').then(function(locations) {
        localDataManager.handleRequest('/api/locations/types').then(function(types) {
            let parentOptions = '<option value="">无（顶级地点）</option>';
            for (const [locId, loc] of Object.entries(locations)) {
                parentOptions += `<option value="${locId}">${loc.name}</option>`;
            }
            
            let typeOptions = '<option value="">无标签</option>';
            if (types && Object.keys(types).length > 0) {
                for (const [typeId, type] of Object.entries(types)) {
                    typeOptions += `<option value="${typeId}">${(type.icon && SvgIconLib && SvgIconLib.is(type.icon)) ? type.icon + ' ' : ''}${type.name || typeId}</option>`;
                }
            } else {
                typeOptions = '<option value="">无标签</option><option value="default">默认类型</option>';
            }
            
            const content = `
                <div class="form-group">
                    <label>地点名称</label>
                    <input type="text" id="location-name" placeholder="请输入地点名称">
                </div>
                <div class="form-group">
                    <label>图标</label>
                    <input type="text" id="location-icon" value="pin" placeholder="SVG key 或 emoji">
                </div>
                <div class="form-group">
                    <label>标签</label>
                    <select id="location-type">
                        ${typeOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>父地点</label>
                    <select id="location-parent">
                        ${parentOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>描述</label>
                    <textarea id="location-description" placeholder="请输入地点描述" rows="3"></textarea>
                </div>
            `;
            
            showModal('添加地点', content, [
                { text: '取消', action: closeModal },
                { text: '添加', action: function() { addLocation(); }, primary: true }
            ]);
        });
    });
}

// 添加地点
function addLocation() {
    const name = document.getElementById('location-name').value || '';
    const icon = document.getElementById('location-icon').value || 'pin';
    const type = document.getElementById('location-type').value || 'other';
    const parent_id = document.getElementById('location-parent').value || '';
    const description = document.getElementById('location-description').value || '';
    
    if (!name) {
        showToast('请输入地点名称', 'error');
        return;
    }
    
    const data = {
        name: name,
        icon: icon,
        type: type,
        parent_id: parent_id,
        description: description
    };
    
    localDataManager.handleRequest('/api/locations/create', 'POST', data).then(function(result) {
        if (result.success) {
            showToast('地点添加成功', 'success');
            closeModal();
            loadLocations();
        } else {
            showToast(result.message || '添加失败', 'error');
        }
    });
}

// 编辑地点
function editLocation(locationId) {
    localDataManager.handleRequest('/api/locations').then(function(locations) {
        localDataManager.handleRequest('/api/locations/types').then(function(types) {
            const location = locations[locationId];
            if (!location) return;
            
            let parentOptions = '<option value="">无（顶级地点）</option>';
            for (const [locId, loc] of Object.entries(locations)) {
                if (locId !== locationId) {
                    const selected = location.parent_id === locId ? 'selected' : '';
                    parentOptions += `<option value="${locId}" ${selected}>${loc.name}</option>`;
                }
            }
            
            let typeOptions = '<option value="">无标签</option>';
            if (types && Object.keys(types).length > 0) {
                for (const [typeId, type] of Object.entries(types)) {
                    const selected = location.type === typeId ? 'selected' : '';
                    typeOptions += `<option value="${typeId}" ${selected}>${(type.icon && SvgIconLib && SvgIconLib.is(type.icon)) ? type.icon + ' ' : ''}${type.name || typeId}</option>`;
                }
            } else {
                typeOptions = '<option value="">无标签</option><option value="default">默认类型</option>';
            }
            
            const content = `
                <div class="form-group">
                    <label>地点名称</label>
                    <input type="text" id="edit-location-name" value="${location.name || ''}">
                </div>
                <div class="form-group">
                    <label>图标</label>
                    <input type="text" id="edit-location-icon" value="${location.icon || 'pin'}">
                </div>
                <div class="form-group">
                    <label>标签</label>
                    <select id="edit-location-type">
                        ${typeOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>父地点</label>
                    <select id="edit-location-parent">
                        ${parentOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>描述</label>
                    <textarea id="edit-location-description" rows="3">${location.description || ''}</textarea>
                </div>
            `;
            
            showModal('编辑地点', content, [
                { text: '取消', action: closeModal },
                { text: '保存', action: function() { saveEditLocation(locationId); }, primary: true }
            ]);
        });
    });
}

// 保存编辑地点
function saveEditLocation(locationId) {
    const name = document.getElementById('edit-location-name').value || '';
    const icon = document.getElementById('edit-location-icon').value || 'pin';
    const type = document.getElementById('edit-location-type').value || 'other';
    const parent_id = document.getElementById('edit-location-parent').value || '';
    const description = document.getElementById('edit-location-description').value || '';
    
    const data = {
        location_id: locationId,
        name: name,
        icon: icon,
        type: type,
        parent_id: parent_id,
        description: description
    };
    
    localDataManager.handleRequest('/api/locations/edit', 'POST', data).then(function(result) {
        if (result.success) {
            showToast('地点保存成功', 'success');
            closeModal();
            loadLocations();
        } else {
            showToast(result.message || '保存失败', 'error');
        }
    });
}

// 删除地点
function deleteLocation(locationId) {
    showModal('确认删除', '确定要删除这个地点吗？子地点会变为顶级地点。此操作不可撤销。', [
        { text: '取消', action: closeModal },
        { text: '删除', action: function() {
            localDataManager.handleRequest('/api/locations/delete', 'POST', { location_id: locationId }).then(function(result) {
                if (result.success) {
                    showToast('地点已删除', 'success');
                    closeModal();
                    loadLocations();
                } else {
                    showToast(result.message || '删除失败', 'error');
                }
            });
        }, danger: true }
    ]);
}

// ==================== 地点标签管理 ====================

// 显示地点标签管理弹窗
function showLocationTypeManager() {
    localDataManager.handleRequest('/api/locations/types').then(function(types) {
        let html = '<div style="max-height: 400px; overflow-y: auto;">';
        
        if (!types || Object.keys(types).length === 0) {
            html += '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">暂无自定义类型</p>';
        } else {
            for (const [typeId, type] of Object.entries(types)) {
                html += `
                    <div style="padding: 12px; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span>${SvgIconLib ? SvgIconLib.renderAuto(type.icon || 'tag', 24) : (type.icon || '🏷️')}</span>
                            <div>
                                <div style="font-weight: 500;">${type.name || typeId}</div>
                                <div style="font-size: 12px; color: var(--text-secondary);">${typeId}</div>
                            </div>
                        </div>
                        <button class="btn-small" onclick="editLocationType('${typeId}')">编辑</button>
                    </div>
                `;
            }
        }
        
        html += '</div>';
        
        showModal('地点标签管理', html, [
            { text: '添加标签', action: function() { showAddLocationType(); }, primary: true },
            { text: '关闭', action: closeModal }
        ]);
    });
}

// 显示添加地点标签弹窗
function showAddLocationType() {
    const content = `
        <div class="form-group">
            <label>类型ID（英文）</label>
            <input type="text" id="new-type-id" placeholder="例如: city">
        </div>
        <div class="form-group">
            <label>名称</label>
            <input type="text" id="new-type-name" placeholder="例如: 城市">
        </div>
        <div class="form-group">
            <label>图标（SVG key 或 emoji）</label>
            <input type="text" id="new-type-icon" value="tag">
        </div>
        <div class="form-group">
            <label>颜色</label>
            <input type="color" id="new-type-color" value="#6366f1">
        </div>
    `;
    
    showModal('添加地点标签', content, [
        { text: '取消', action: closeModal },
        { text: '添加', action: function() { addLocationType(); }, primary: true }
    ]);
}

// 添加地点标签
function addLocationType() {
    const typeId = document.getElementById('new-type-id').value;
    const name = document.getElementById('new-type-name').value;
    const icon = document.getElementById('new-type-icon').value || 'tag';
    const color = document.getElementById('new-type-color').value || '#6366f1';
    
    if (!typeId || !name) {
        showToast('请填写ID和名称', 'error');
        return;
    }
    
    const data = {
        type_id: typeId,
        name: name,
        icon: icon,
        color: color
    };
    
    localDataManager.handleRequest('/api/locations/types/create', 'POST', data).then(function(result) {
        if (result.success) {
            showToast('类型添加成功', 'success');
            closeModal();
            // 刷新类型管理弹窗
            showLocationTypeManager();
            // 刷新地点列表
            loadLocations();
        } else {
            showToast(result.message || '添加失败', 'error');
        }
    });
}

// 编辑地点标签
function editLocationType(typeId) {
    localDataManager.handleRequest('/api/locations/types').then(function(types) {
        const type = types[typeId];
        if (!type) return;
        
        const content = `
            <div class="form-group">
                <label>名称</label>
                <input type="text" id="edit-type-name" value="${type.name || ''}">
            </div>
            <div class="form-group">
                <label>图标（SVG key 或 emoji）</label>
                <input type="text" id="edit-type-icon" value="${type.icon || 'tag'}">
            </div>
            <div class="form-group">
                <label>颜色</label>
                <input type="color" id="edit-type-color" value="${type.color || '#6366f1'}">
            </div>
        `;
        
        showModal('编辑地点标签', content, [
            { text: '删除', action: function() { deleteLocationType(typeId); }, danger: true },
            { text: '取消', action: closeModal },
            { text: '保存', action: function() { saveEditLocationType(typeId); }, primary: true }
        ]);
    });
}

// 保存编辑地点标签
function saveEditLocationType(typeId) {
    const name = document.getElementById('edit-type-name').value;
    const icon = document.getElementById('edit-type-icon').value || 'tag';
    const color = document.getElementById('edit-type-color').value || '#6366f1';
    
    const data = {
        type_id: typeId,
        name: name,
        icon: icon,
        color: color
    };
    
    localDataManager.handleRequest('/api/locations/types/edit', 'POST', data).then(function(result) {
        if (result.success) {
            showToast('类型保存成功', 'success');
            closeModal();
            // 刷新类型管理弹窗
            showLocationTypeManager();
            // 刷新地点列表
            loadLocations();
        } else {
            showToast(result.message || '保存失败', 'error');
        }
    });
}

// 删除地点标签
async function deleteLocationType(typeId) {
    if (!(await UIUtils.confirmDialog('确定删除这个类型吗？使用该类型的地点将变为默认类型。'))) return;
    
    localDataManager.handleRequest('/api/locations/types/delete', 'POST', { type_id: typeId }).then(function(result) {
        if (result.success) {
            showToast('类型已删除', 'success');
            closeModal();
            // 刷新类型管理弹窗
            showLocationTypeManager();
            // 刷新地点列表
            loadLocations();
        } else {
            showToast(result.message || '删除失败', 'error');
        }
    });
}



// 加载人物数据
async function loadCharacters() {
    const data = await localDataManager.handleRequest('/api/characters');
    if (data && data.success) {
        v183Data.characters = data.characters || [];
        renderCharacterFilter();
        renderCharacters();
    }
}

// 渲染人物筛选下拉框
function renderCharacterFilter() {
    const select = document.getElementById('relation-character-filter');
    if (!select) return;
    
    let html = '<option value="">全部人物</option>';
    v183Data.characters.forEach(char => {
        const selected = v183Data.filterCharacterId === char.id ? 'selected' : '';
        html += `<option value="${char.id}" ${selected}>${char.name}</option>`;
    });
    select.innerHTML = html;
}

// 渲染人物列表（列表模式）
function renderCharacters() {
    const container = document.getElementById('character-list');
    if (!container) return;
    
    let characters = v183Data.characters;
    
    // 如果筛选了人物，只显示该人物及其关系
    if (v183Data.filterCharacterId) {
        const filterChar = v183Data.characters.find(c => c.id === v183Data.filterCharacterId);
        if (filterChar) {
            characters = [filterChar];
        }
    }
    
    if (characters.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>暂无人物，点击上方"添加人物"开始创建</p></div>';
        return;
    }
    
    let html = '';
    characters.forEach(char => {
        const isSelected = v183Data.selectedCharacterId === char.id;
        const charRelations = v183Data.relations.filter(r => 
            r.character_id === char.id || r.target_id === char.id
        );
        
        html += `
            <div class="character-card ${isSelected ? 'selected' : ''}" data-id="${char.id}" onclick="selectCharacter('${char.id}')">
                <div class="character-header">
                    <div class="character-avatar">${SvgIconLib ? SvgIconLib.renderAuto(char.avatar || 'user', 24) : (char.avatar || '👤')}</div>
                    <div class="character-info">
                        <h3 class="character-name">${escapeHtml(char.name)}${renderIdBadge(char.id)}</h3>
                        ${char.description ? `<p class="character-desc">${escapeHtml(char.description.substring(0, 50))}${char.description.length > 50 ? '...' : ''}</p>` : ''}
                    </div>
                    <div class="character-actions" onclick="event.stopPropagation()">
                        <button class="btn-small" onclick="showEditV183Character('${char.id}')">${SvgIconLib ? SvgIconLib.render('edit', 12) : '✏️'}</button>
                        <button class="btn-small btn-danger" onclick="showDeleteCharacter('${char.id}')">${SvgIconLib ? SvgIconLib.render('trash', 12) : '🗑️'}</button>
                    </div>
                </div>
                <div class="character-relations">
                    <div class="relations-header">
                        <span>关系 (${charRelations.length})</span>
                        <button class="btn-small btn-primary" onclick="event.stopPropagation(); showAddRelation('${char.id}')">+ 添加关系</button>
                    </div>
                    ${isSelected ? renderCharacterRelations(char.id) : ''}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// 渲染人物的关系列表
function renderCharacterRelations(characterId) {
    const relations = v183Data.relations.filter(r => 
        r.character_id === characterId || r.target_id === characterId
    );
    
    if (relations.length === 0) {
        return '<div class="empty-relations">暂无关系</div>';
    }
    
    let html = '<div class="relations-list">';
    relations.forEach(rel => {
        const otherId = rel.character_id === characterId ? rel.target_id : rel.character_id;
        const otherChar = v183Data.characters.find(c => c.id === otherId);
        if (!otherChar) return;
        
        const relationType = v183Data.relationTypes.find(t => t.id === rel.type_id);
        const color = relationType ? relationType.color : '#64748b';
        
        html += `
            <div class="relation-item" style="border-left-color: ${color};">
                <div class="relation-target">
                    <span class="relation-avatar">${SvgIconLib ? SvgIconLib.renderAuto(otherChar.avatar || 'user', 22) : (otherChar.avatar || '👤')}</span>
                    <span class="relation-name">${escapeHtml(otherChar.name)}${renderIdBadge(rel.id)}</span>
                </div>
                <div class="relation-type" style="background: ${color};">
                    ${relationType ? relationType.name : '未知关系'}
                </div>
                ${rel.description ? `<div class="relation-desc">${rel.description}</div>` : ''}
                <div class="relation-actions">
                    <button class="btn-tiny" onclick="event.stopPropagation(); showEditRelation('${rel.id}')">${SvgIconLib ? SvgIconLib.render('edit', 12) : '✏️'} 编辑</button>
                    <button class="btn-tiny btn-danger" onclick="event.stopPropagation(); showDeleteRelation('${rel.id}')">${SvgIconLib ? SvgIconLib.render('trash', 12) : '🗑️'} 删除</button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    return html;
}

// 选中人物
function selectCharacter(characterId) {
    v183Data.selectedCharacterId = characterId;
    renderCharacters();
    
    // 如果在网络模式，重新渲染网络图
    if (v183Data.currentView === 'network') {
        renderNetworkGraph();
    }
}

// 显示添加人物弹窗
function showAddCharacter() {
    const content = `
        <div class="form-group">
            <label>姓名</label>
            <input type="text" id="character-name" placeholder="请输入人物姓名">
        </div>
        <div class="form-group">
            <label>头像（SVG key 或 emoji）</label>
            <input type="text" id="character-avatar" placeholder="例如：user / 🧙" value="user">
        </div>
        <div class="form-group">
            <label>描述</label>
            <textarea id="character-description" rows="3" placeholder="请输入人物描述"></textarea>
        </div>
    `;
    
    showModal('添加人物', content, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        { text: '添加', class: 'btn-primary', action: addCharacter }
    ]);
}

// 添加人物
function addCharacter() {
    const name = document.getElementById('character-name')?.value.trim();
    const avatar = document.getElementById('character-avatar')?.value.trim() || 'user';
    const description = document.getElementById('character-description')?.value.trim();
    
    if (!name) {
        showToast('请输入人物姓名', 'error');
        return;
    }
    
    (async () => {
        const data = await localDataManager.handleRequest('/api/characters/add', 'POST', {
            name: name,
            avatar: avatar,
            description: description
        });
        if (data && data.success) {
            v183Data.characters = data.characters;
            renderCharacterFilter();
            renderCharacters();
            closeModal();
            showToast('添加成功');
        } else {
            showToast((data && data.message) || '添加失败', 'error');
        }
    })();
}

// 显示编辑人物弹窗
function showEditV183Character(characterId) {
    const character = v183Data.characters.find(c => c.id === characterId);
    if (!character) return;
    
    const content = `
        <div class="form-group">
            <label>姓名</label>
            <input type="text" id="character-name" value="${character.name}">
        </div>
        <div class="form-group">
            <label>头像（SVG key 或 emoji）</label>
            <input type="text" id="character-avatar" value="${character.avatar || 'user'}">
        </div>
        <div class="form-group">
            <label>描述</label>
            <textarea id="character-description" rows="3">${character.description || ''}</textarea>
        </div>
    `;
    
    showModal('编辑人物', content, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        { text: '保存', class: 'btn-primary', action: () => saveEditCharacter(characterId) }
    ]);
}

// 保存编辑人物
function saveEditCharacter(characterId) {
    const name = document.getElementById('character-name')?.value.trim();
    const avatar = document.getElementById('character-avatar')?.value.trim() || 'user';
    const description = document.getElementById('character-description')?.value.trim();
    
    if (!name) {
        showToast('请输入人物姓名', 'error');
        return;
    }
    
    (async () => {
        const data = await localDataManager.handleRequest('/api/characters/edit', 'POST', {
            id: characterId,
            name: name,
            avatar: avatar,
            description: description
        });
        if (data && data.success) {
            v183Data.characters = data.characters;
            renderCharacterFilter();
            renderCharacters();
            closeModal();
            showToast('保存成功');
        } else {
            showToast((data && data.message) || '保存失败', 'error');
        }
    })();
}

// 显示删除人物确认
function showDeleteCharacter(characterId) {
    const character = v183Data.characters.find(c => c.id === characterId);
    if (!character) return;
    
    const relationCount = v183Data.relations.filter(r => 
        r.character_id === characterId || r.target_id === characterId
    ).length;
    
    const content = `
        <p>确定要删除人物「${character.name}」吗？</p>
        ${relationCount > 0 ? `<p style="color: var(--danger-color, #ef4444); display: flex; align-items: center; gap: 4px;">${SvgIconLib ? SvgIconLib.render('alert', 14) : '⚠️'} 该人物有 ${relationCount} 条关系，删除后相关关系也将被删除！</p>` : ''}
        <p>此操作不可撤销。</p>
    `;
    
    showModal('确认删除', content, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        { text: '删除', class: 'btn-danger', action: () => deleteCharacter(characterId) }
    ]);
}

// 删除人物
function deleteCharacter(characterId) {
    (async () => {
        const data = await localDataManager.handleRequest('/api/characters/delete', 'POST', { id: characterId });
        if (data && data.success) {
            v183Data.characters = data.characters;
            if (data.relations) v183Data.relations = data.relations;
            if (v183Data.selectedCharacterId === characterId) {
                v183Data.selectedCharacterId = null;
            }
            if (v183Data.filterCharacterId === characterId) {
                v183Data.filterCharacterId = null;
            }
            renderCharacterFilter();
            renderCharacters();
            closeModal();
            showToast('删除成功');
        } else {
            showToast((data && data.message) || '删除失败', 'error');
        }
    })();
}

// ==================== 关系模块 - 关系类型管理 ====================

// 加载关系类型
async function loadRelationTypes() {
    const data = await localDataManager.handleRequest('/api/relation-types');
    if (data && data.success) {
        v183Data.relationTypes = data.relation_types || [];
    }
}

// 显示关系类型管理
function showManageRelationTypes() {
    let typesHtml = '';
    v183Data.relationTypes.forEach(type => {
        typesHtml += `
            <div class="relation-type-item">
                <div class="relation-type-color" style="background: ${type.color};"></div>
                <span class="relation-type-name">${type.name}</span>
                <div class="relation-type-actions">
                    <button class="btn-tiny" onclick="showEditRelationType('${type.id}')">${SvgIconLib ? SvgIconLib.render('edit', 12) : '✏️'}</button>
                    <button class="btn-tiny btn-danger" onclick="showDeleteRelationType('${type.id}')">${SvgIconLib ? SvgIconLib.render('trash', 12) : '🗑️'}</button>
                </div>
            </div>
        `;
    });
    
    const content = `
        <div class="relation-types-list">
            ${typesHtml || '<div class="empty-state"><p>暂无关系类型</p></div>'}
        </div>
        <div style="margin-top: 16px;">
            <button class="btn-primary" onclick="showAddRelationType()">+ 添加关系类型</button>
        </div>
    `;
    
    showModal('关系类型管理', content, [
        { text: '关闭', class: 'btn-secondary', action: closeModal }
    ]);
}

// 显示添加关系类型
function showAddRelationType() {
    const content = `
        <div class="form-group">
            <label>关系名称</label>
            <input type="text" id="relation-type-name" placeholder="例如：朋友、敌人、师徒">
        </div>
        <div class="form-group">
            <label>颜色</label>
            <input type="color" id="relation-type-color" value="#6366f1">
        </div>
    `;
    
    showModal('添加关系类型', content, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        { text: '添加', class: 'btn-primary', action: addRelationType }
    ]);
}

// 添加关系类型
function addRelationType() {
    const name = document.getElementById('relation-type-name')?.value.trim();
    const color = document.getElementById('relation-type-color')?.value || '#6366f1';
    
    if (!name) {
        showToast('请输入关系名称', 'error');
        return;
    }
    
    (async () => {
        const data = await localDataManager.handleRequest('/api/relation-types/add', 'POST', { name: name, color: color });
        if (data && data.success) {
            v183Data.relationTypes = data.relation_types;
            showManageRelationTypes();
            showToast('添加成功');
        } else {
            showToast((data && data.message) || '添加失败', 'error');
        }
    })();
}

// 显示编辑关系类型
function showEditRelationType(typeId) {
    const type = v183Data.relationTypes.find(t => t.id === typeId);
    if (!type) return;
    
    const content = `
        <div class="form-group">
            <label>关系名称</label>
            <input type="text" id="relation-type-name" value="${type.name}">
        </div>
        <div class="form-group">
            <label>颜色</label>
            <input type="color" id="relation-type-color" value="${type.color}">
        </div>
    `;
    
    showModal('编辑关系类型', content, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        { text: '保存', class: 'btn-primary', action: () => saveEditRelationType(typeId) }
    ]);
}

// 保存编辑关系类型
function saveEditRelationType(typeId) {
    const name = document.getElementById('relation-type-name')?.value.trim();
    const color = document.getElementById('relation-type-color')?.value || '#6366f1';
    
    if (!name) {
        showToast('请输入关系名称', 'error');
        return;
    }
    
    (async () => {
        const data = await localDataManager.handleRequest('/api/relation-types/edit', 'POST', { id: typeId, name: name, color: color });
        if (data && data.success) {
            v183Data.relationTypes = data.relation_types;
            showManageRelationTypes();
            renderCharacters();
            showToast('保存成功');
        } else {
            showToast((data && data.message) || '保存失败', 'error');
        }
    })();
}

// 显示删除关系类型确认
function showDeleteRelationType(typeId) {
    const type = v183Data.relationTypes.find(t => t.id === typeId);
    if (!type) return;
    
    const content = `
        <p>确定要删除关系类型「${type.name}」吗？</p>
        <p>此操作不可撤销。</p>
    `;
    
    showModal('确认删除', content, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        { text: '删除', class: 'btn-danger', action: () => deleteRelationType(typeId) }
    ]);
}

// 删除关系类型
function deleteRelationType(typeId) {
    (async () => {
        const data = await localDataManager.handleRequest('/api/relation-types/delete', 'POST', { id: typeId });
        if (data && data.success) {
            v183Data.relationTypes = data.relation_types;
            if (data.relations) v183Data.relations = data.relations;
            showManageRelationTypes();
            renderCharacters();
            showToast('删除成功');
        } else {
            showToast((data && data.message) || '删除失败', 'error');
        }
    })();
}

// ==================== 关系模块 - 关系管理 ====================

// 加载关系数据
async function loadRelations() {
    const data = await localDataManager.handleRequest('/api/relations');
    if (data && data.success) {
        v183Data.relations = data.relations || [];
        renderCharacters();
    }
}

// 显示添加关系弹窗
function showAddRelation(characterId) {
    if (v183Data.characters.length < 2) {
        showToast('至少需要2个人物才能添加关系', 'error');
        return;
    }
    
    const otherCharacters = v183Data.characters.filter(c => c.id !== characterId);
    
    let targetOptions = '';
    otherCharacters.forEach(char => {
        targetOptions += `<option value="${char.id}">${char.name}</option>`;
    });
    
    let typeOptions = '<option value="">无标签</option>';
    v183Data.relationTypes.forEach(type => {
        typeOptions += `<option value="${type.id}">${type.name}</option>`;
    });
    
    const content = `
        <div class="form-group">
            <label>目标人物</label>
            <select id="relation-target">
                ${targetOptions}
            </select>
        </div>
        <div class="form-group">
            <label>关系类型</label>
            <select id="relation-type">
                ${typeOptions || '<option value="">请先添加关系类型</option>'}
            </select>
        </div>
        <div class="form-group">
            <label>关系描述（可选）</label>
            <textarea id="relation-description" rows="2" placeholder="例如：从小一起长大的好朋友"></textarea>
        </div>
    `;
    
    showModal('添加关系', content, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        { text: '添加', class: 'btn-primary', action: () => addRelation(characterId) }
    ]);
}

// 添加关系
function addRelation(characterId) {
    const targetId = document.getElementById('relation-target')?.value;
    const typeId = document.getElementById('relation-type')?.value;
    const description = document.getElementById('relation-description')?.value.trim();
    
    if (!targetId) {
        showToast('请选择目标人物', 'error');
        return;
    }
    
    if (!typeId) {
        showToast('请选择关系类型', 'error');
        return;
    }
    
    (async () => {
        const data = await localDataManager.handleRequest('/api/relations/add', 'POST', {
            character_id: characterId,
            target_id: targetId,
            type_id: typeId,
            description: description
        });
        if (data && data.success) {
            v183Data.relations = data.relations;
            renderCharacters();
            closeModal();
            showToast('添加成功');
        } else {
            showToast((data && data.message) || '添加失败', 'error');
        }
    })();
}

// 显示编辑关系弹窗
function showEditRelation(relationId) {
    const relation = v183Data.relations.find(r => r.id === relationId);
    if (!relation) return;
    
    let typeOptions = '<option value="">无标签</option>';
    v183Data.relationTypes.forEach(type => {
        const selected = type.id === relation.type_id ? 'selected' : '';
        typeOptions += `<option value="${type.id}" ${selected}>${type.name}</option>`;
    });
    
    const content = `
        <div class="form-group">
            <label>关系类型</label>
            <select id="relation-type">
                ${typeOptions}
            </select>
        </div>
        <div class="form-group">
            <label>关系描述（可选）</label>
            <textarea id="relation-description" rows="2">${relation.description || ''}</textarea>
        </div>
    `;
    
    showModal('编辑关系', content, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        { text: '保存', class: 'btn-primary', action: () => saveEditRelation(relationId) }
    ]);
}

// 保存编辑关系
function saveEditRelation(relationId) {
    const typeId = document.getElementById('relation-type')?.value;
    const description = document.getElementById('relation-description')?.value.trim();
    
    if (!typeId) {
        showToast('请选择关系类型', 'error');
        return;
    }
    
    (async () => {
        const data = await localDataManager.handleRequest('/api/relations/edit', 'POST', {
            id: relationId,
            type_id: typeId,
            description: description
        });
        if (data && data.success) {
            v183Data.relations = data.relations;
            renderCharacters();
            closeModal();
            showToast('保存成功');
        } else {
            showToast((data && data.message) || '保存失败', 'error');
        }
    })();
}

// 显示删除关系确认
function showDeleteRelation(relationId) {
    const content = `
        <p>确定要删除这条关系吗？</p>
        <p>此操作不可撤销。</p>
    `;
    
    showModal('确认删除', content, [
        { text: '取消', class: 'btn-secondary', action: closeModal },
        { text: '删除', class: 'btn-danger', action: () => deleteRelation(relationId) }
    ]);
}

// 删除关系
function deleteRelation(relationId) {
    (async () => {
        const data = await localDataManager.handleRequest('/api/relations/delete', 'POST', { id: relationId });
        if (data && data.success) {
            v183Data.relations = data.relations;
            renderCharacters();
            closeModal();
            showToast('删除成功');
        } else {
            showToast((data && data.message) || '删除失败', 'error');
        }
    })();
}

// 按人物筛选关系
function filterRelationsByCharacter() {
    const select = document.getElementById('relation-character-filter');
    v183Data.filterCharacterId = select?.value || null;
    renderCharacters();
}

// 切换视图模式
function switchRelationView(view) {
    v183Data.currentView = view;
    
    const listView = document.getElementById('relation-list-view');
    const networkView = document.getElementById('relation-network-view');
    const listBtn = document.getElementById('view-list-btn');
    const networkBtn = document.getElementById('view-network-btn');
    
    if (view === 'list') {
        listView.style.display = 'block';
        networkView.style.display = 'none';
        listBtn.classList.add('active');
        networkBtn.classList.remove('active');
    } else {
        listView.style.display = 'none';
        networkView.style.display = 'block';
        listBtn.classList.remove('active');
        networkBtn.classList.add('active');
        renderNetworkGraph();
    }
}

// ==================== 关系模块 - 网络模式 (Canvas 力导向图) ====================

// Canvas 力导向图状态
let _netCanvas, _netCtx, _netNodes = [], _netEdges = [];
let _netAnimFrame, _netDragNode = null, _netHoveredNode = null;
let _netOffsetX = 0, _netOffsetY = 0, _netScale = 1;
let _netIsDragging = false, _netLastMouse = { x: 0, y: 0 };
const _NET_COLORS = {
    'character': '#7c3aed', 'organization': '#3b82f6', 'location': '#10b981',
    'event': '#f59e0b', 'item': '#ef4444', 'default': '#6b7280'
};

// 渲染网络关系图（构建节点和边，启动力模拟）
function renderNetworkGraph() {
    const canvas = document.getElementById('network-canvas');
    if (!canvas) return;
    _netCanvas = canvas;
    const container = document.getElementById('network-container');
    canvas.width = container.clientWidth;
    canvas.height = 500;
    _netCtx = canvas.getContext('2d');

    // 构建节点和边
    _netNodes = [];
    _netEdges = [];
    const nodeMap = {};
    const characters = v183Data.characters || [];
    const relations = v183Data.relations || [];
    const relationTypes = v183Data.relationTypes || [];

    characters.forEach((c, i) => {
        const type = c.type || c.role_type || 'character';
        const node = {
            id: c.id || c.name || i,
            label: c.name || c.title || `角色${i}`,
            type: type,
            x: 100 + Math.random() * (canvas.width - 200),
            y: 80 + Math.random() * (canvas.height - 160),
            vx: 0, vy: 0,
            radius: 22,
            data: c
        };
        _netNodes.push(node);
        nodeMap[node.id] = node;
    });

    relations.forEach(r => {
        const fromId = r.character_id || r.from || r.source;
        const toId = r.target_id || r.to || r.target;
        const from = nodeMap[fromId];
        const to = nodeMap[toId];
        if (from && to) {
            const relType = relationTypes.find(t => t.id === r.type_id);
            _netEdges.push({
                source: from, target: to,
                label: relType ? relType.name : (r.type || r.relation_type || r.label || ''),
                color: relType ? relType.color || '#d1d5db' : '#d1d5db',
                data: r
            });
        }
    });

    // 更新信息
    const infoEl = document.getElementById('network-info');
    if (infoEl) infoEl.textContent = `节点: ${_netNodes.length} | 关系: ${_netEdges.length}`;

    // 绑定事件
    canvas.onmousedown = _netOnMouseDown;
    canvas.onmousemove = _netOnMouseMove;
    canvas.onmouseup = _netOnMouseUp;
    canvas.onwheel = _netOnWheel;
    canvas.ondblclick = _netOnDblClick;

    // 启动力模拟
    _netStartSimulation();
}

// 力模拟
function _netStartSimulation() {
    if (_netAnimFrame) cancelAnimationFrame(_netAnimFrame);
    let alpha = 1;
    function tick() {
        if (alpha > 0.001) {
            _netApplyForces(alpha);
            alpha *= 0.99;
        }
        _netDraw();
        _netAnimFrame = requestAnimationFrame(tick);
    }
    tick();
}

function _netApplyForces(alpha) {
    // 斥力
    for (let i = 0; i < _netNodes.length; i++) {
        for (let j = i + 1; j < _netNodes.length; j++) {
            let dx = _netNodes[j].x - _netNodes[i].x;
            let dy = _netNodes[j].y - _netNodes[i].y;
            let dist = Math.sqrt(dx * dx + dy * dy) || 1;
            let force = 5000 / (dist * dist);
            let fx = dx / dist * force * alpha;
            let fy = dy / dist * force * alpha;
            if (_netNodes[i] !== _netDragNode) { _netNodes[i].vx -= fx; _netNodes[i].vy -= fy; }
            if (_netNodes[j] !== _netDragNode) { _netNodes[j].vx += fx; _netNodes[j].vy += fy; }
        }
    }
    // 弹簧力
    _netEdges.forEach(e => {
        let dx = e.target.x - e.source.x;
        let dy = e.target.y - e.source.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        let force = (dist - 120) * 0.01 * alpha;
        let fx = dx / dist * force;
        let fy = dy / dist * force;
        if (e.source !== _netDragNode) { e.source.vx += fx; e.source.vy += fy; }
        if (e.target !== _netDragNode) { e.target.vx -= fx; e.target.vy -= fy; }
    });
    // 中心引力
    const cx = _netCanvas.width / 2, cy = _netCanvas.height / 2;
    _netNodes.forEach(n => {
        if (n === _netDragNode) return;
        n.vx += (cx - n.x) * 0.0005 * alpha;
        n.vy += (cy - n.y) * 0.0005 * alpha;
        n.vx *= 0.9; n.vy *= 0.9;
        n.x += n.vx; n.y += n.vy;
    });
}

// Canvas 绘制
function _netDraw() {
    if (!_netCtx) return;
    const ctx = _netCtx;
    ctx.clearRect(0, 0, _netCanvas.width, _netCanvas.height);
    ctx.save();
    ctx.translate(_netOffsetX, _netOffsetY);
    ctx.scale(_netScale, _netScale);

    // 绘制边
    _netEdges.forEach(e => {
        ctx.beginPath();
        ctx.moveTo(e.source.x, e.source.y);
        ctx.lineTo(e.target.x, e.target.y);
        ctx.strokeStyle = e.color || '#d1d5db';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // 边标签
        if (e.label) {
            const mx = (e.source.x + e.target.x) / 2;
            const my = (e.source.y + e.target.y) / 2;
            ctx.fillStyle = '#9ca3af';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(e.label, mx, my - 4);
        }
    });

    // 绘制节点
    _netNodes.forEach(n => {
        const color = _NET_COLORS[n.type] || _NET_COLORS.default;
        const isHovered = n === _netHoveredNode;
        if (isHovered) { ctx.shadowColor = color; ctx.shadowBlur = 12; }
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = isHovered ? '#fff' : 'rgba(255,255,255,0.6)';
        ctx.lineWidth = isHovered ? 3 : 2;
        ctx.stroke();
        ctx.shadowBlur = 0;
        // 标签
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label = n.label.length > 4 ? n.label.substring(0, 4) : n.label;
        ctx.fillText(label, n.x, n.y);
        // 名称在下方
        ctx.fillStyle = '#374151';
        ctx.font = '10px sans-serif';
        ctx.fillText(n.label, n.x, n.y + n.radius + 12);
    });

    ctx.restore();
}

// 交互事件
function _netScreenToWorld(sx, sy) {
    return { x: (sx - _netOffsetX) / _netScale, y: (sy - _netOffsetY) / _netScale };
}
function _netFindNode(x, y) {
    for (let i = _netNodes.length - 1; i >= 0; i--) {
        const dx = _netNodes[i].x - x, dy = _netNodes[i].y - y;
        if (dx * dx + dy * dy < _netNodes[i].radius * _netNodes[i].radius) return _netNodes[i];
    }
    return null;
}
function _netOnMouseDown(e) {
    const pos = _netScreenToWorld(e.offsetX, e.offsetY);
    _netDragNode = _netFindNode(pos.x, pos.y);
    if (!_netDragNode) { _netIsDragging = true; _netLastMouse = { x: e.offsetX, y: e.offsetY }; }
}
function _netOnMouseMove(e) {
    const pos = _netScreenToWorld(e.offsetX, e.offsetY);
    if (_netDragNode) {
        _netDragNode.x = pos.x; _netDragNode.y = pos.y;
        _netDragNode.vx = 0; _netDragNode.vy = 0;
    } else if (_netIsDragging) {
        _netOffsetX += e.offsetX - _netLastMouse.x;
        _netOffsetY += e.offsetY - _netLastMouse.y;
        _netLastMouse = { x: e.offsetX, y: e.offsetY };
    } else {
        _netHoveredNode = _netFindNode(pos.x, pos.y);
        const tooltip = document.getElementById('network-tooltip');
        if (tooltip && _netHoveredNode) {
            tooltip.style.display = 'block';
            tooltip.style.left = (e.offsetX + 12) + 'px';
            tooltip.style.top = (e.offsetY - 10) + 'px';
            const d = _netHoveredNode.data;
            tooltip.innerHTML = `<strong>${_netHoveredNode.label}</strong><br>类型: ${_netHoveredNode.type}${d.description ? '<br>' + d.description.substring(0, 60) : ''}`;
        } else if (tooltip) { tooltip.style.display = 'none'; }
    }
}
function _netOnMouseUp() { _netDragNode = null; _netIsDragging = false; }
function _netOnWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    _netScale *= delta;
    _netScale = Math.max(0.2, Math.min(3, _netScale));
    _updateNetZoomDisplay();
}
function _netOnDblClick(e) {
    const pos = _netScreenToWorld(e.offsetX, e.offsetY);
    const node = _netFindNode(pos.x, pos.y);
    if (node && node.data && node.data.id) {
        selectCharacter(node.data.id);
    }
}

// 缩放控制
function zoomInNetwork() {
    _netScale = Math.min(3, _netScale * 1.2);
    _updateNetZoomDisplay();
}
function zoomOutNetwork() {
    _netScale = Math.max(0.2, _netScale / 1.2);
    _updateNetZoomDisplay();
}
function resetNetworkView() {
    _netOffsetX = 0; _netOffsetY = 0; _netScale = 1;
    _updateNetZoomDisplay();
    renderNetworkGraph();
}
function fitNetworkView() {
    if (_netNodes.length === 0 || !_netCanvas) return;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    _netNodes.forEach(n => {
        minX = Math.min(minX, n.x - n.radius); maxX = Math.max(maxX, n.x + n.radius);
        minY = Math.min(minY, n.y - n.radius); maxY = Math.max(maxY, n.y + n.radius);
    });
    const gw = maxX - minX + 60, gh = maxY - minY + 60;
    _netScale = Math.min(_netCanvas.width / gw, _netCanvas.height / gh, 2);
    _netOffsetX = (_netCanvas.width - gw * _netScale) / 2 - minX * _netScale + 30 * _netScale;
    _netOffsetY = (_netCanvas.height - gh * _netScale) / 2 - minY * _netScale + 30 * _netScale;
    _updateNetZoomDisplay();
}
function exportNetworkImage() {
    if (!_netCanvas) return;
    const link = document.createElement('a');
    link.download = '关系图谱.png';
    link.href = _netCanvas.toDataURL('image/png');
    link.click();
    showToast('图片已导出', 'success');
}
function _updateNetZoomDisplay() {
    const el = document.getElementById('network-zoom-level');
    if (el) el.textContent = Math.round(_netScale * 100) + '%';
}
