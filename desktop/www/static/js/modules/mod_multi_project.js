// ============================================================
// 模块: 多项目管理 (mod_multi_project.js)
// 版本: 3.2.0
// ============================================================
(function() {
    'use strict';
    const style = document.createElement('style');
    style.textContent = `
        .mp-container { display: flex; flex-direction: column; gap: 16px; }
        .mp-current { padding: 16px; background: var(--card-bg, #fff); border: 2px solid var(--primary-color, #7c3aed); border-radius: 10px; }
        .mp-current h3 { margin: 0 0 8px 0; font-size: 15px; color: var(--primary-color, #7c3aed); }
        .mp-current-info { display: flex; gap: 16px; flex-wrap: wrap; font-size: 13px; color: var(--text-secondary, #6b7280); }
        .mp-current-info span { display: flex; align-items: center; gap: 4px; }
        .mp-project-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
        .mp-project-card { padding: 16px; background: var(--card-bg, #fff); border: 1px solid var(--border-color, #e5e7eb); border-radius: 10px; transition: all 0.2s; }
        .mp-project-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
        .mp-project-card.active { border-color: var(--primary-color, #7c3aed); }
        .mp-project-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
        .mp-project-icon { width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px; background: var(--bg-color, #f3f4f6); }
        .mp-project-name { font-size: 15px; font-weight: 600; }
        .mp-project-desc { font-size: 12px; color: var(--text-secondary, #6b7280); margin-bottom: 8px; }
        .mp-project-stats { font-size: 11px; color: var(--text-secondary, #6b7280); margin-bottom: 12px; }
        .mp-project-actions { display: flex; gap: 6px; }
        .mp-create-form { display: flex; flex-direction: column; gap: 12px; }
        .mp-create-form input, .mp-create-form textarea { padding: 8px 12px; border: 1px solid var(--border-color, #e5e7eb); border-radius: 6px; font-size: 13px; }
        .mp-create-form textarea { min-height: 60px; resize: vertical; }
        .mp-icon-picker { display: flex; gap: 6px; flex-wrap: wrap; }
        .mp-icon-option { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 6px; cursor: pointer; border: 2px solid transparent; font-size: 18px; background: var(--bg-color, #f3f4f6); }
        .mp-icon-option.selected { border-color: var(--primary-color, #7c3aed); }
    `;
    document.head.appendChild(style);

    const PROJECT_ICONS = ['📖','📚','✍️','🗡️','🏰','🐉','⭐','🌟','🔮','👑','🌙','☀️','🔥','💎','🎭','🎪'];

    let projects = [];
    let currentProjectId = null;

    async function loadData() {
        try {
            projects = await apiRequest('/api/mod/projects') || [];
            const savedId = localStorage.getItem('current_project_id');
            currentProjectId = savedId || (projects.length > 0 ? projects[0].id : null);
        } catch(e) { projects = []; currentProjectId = null; }
    }

    function renderPage() {
        let html = '<section class="card">';
        html += '<div class="card-header"><h2>📁 多项目管理</h2>';
        html += '<button class="btn-primary btn-small" onclick="MultiProjectModule.showCreate()">+ 新建项目</button>';
        html += '</div>';
        html += '<div class="mp-container" id="mp-container"></div>';
        html += '</section>';
        return html;
    }

    function refreshView() {
        const el = document.getElementById('mp-container');
        if (!el) return;
        const current = projects.find(p => p.id === currentProjectId);
        let html = '';
        // Current project
        if (current) {
            const data = window.appData || {};
            const keyCount = Object.keys(data).length;
            html += '<div class="mp-current">';
            html += `<h3>${current.icon || '📖'} 当前项目: ${current.name}</h3>`;
            html += '<div class="mp-current-info">';
            html += `<span>📅 创建于 ${new Date(current.createdAt).toLocaleDateString('zh-CN')}</span>`;
            html += `<span>📊 ${keyCount} 个数据键</span>`;
            if (current.description) html += `<span>📝 ${current.description}</span>`;
            html += '</div></div>';
        } else {
            html += '<div class="mp-current"><h3>未选择项目</h3><p style="color:#9ca3af;">请创建或选择一个项目</p></div>';
        }
        // Project list
        html += '<h3 style="font-size:14px;margin:16px 0 8px;">所有项目</h3>';
        html += '<div class="mp-project-list">';
        if (projects.length === 0) {
            html += '<div style="text-align:center;padding:40px;color:#9ca3af;grid-column:1/-1;">暂无项目，点击"新建项目"开始</div>';
        }
        projects.forEach(p => {
            const isActive = p.id === currentProjectId;
            html += `<div class="mp-project-card ${isActive ? 'active' : ''}">`;
            html += `<div class="mp-project-header"><div class="mp-project-icon">${p.icon || '📖'}</div><div class="mp-project-name">${p.name}</div></div>`;
            if (p.description) html += `<div class="mp-project-desc">${p.description}</div>`;
            html += `<div class="mp-project-stats">创建于 ${new Date(p.createdAt).toLocaleDateString('zh-CN')}</div>`;
            html += '<div class="mp-project-actions">';
            if (!isActive) {
                html += `<button class="btn-primary btn-small" onclick="MultiProjectModule.switchTo('${p.id}')">切换</button>`;
            } else {
                html += `<span style="font-size:12px;color:var(--primary-color);font-weight:600;">当前使用中</span>`;
            }
            html += `<button class="btn-secondary btn-small" onclick="MultiProjectModule.renameProject('${p.id}')">重命名</button>`;
            html += `<button class="btn-small" style="color:#ef4444;" onclick="MultiProjectModule.deleteProject('${p.id}')">删除</button>`;
            html += '</div></div>';
        });
        html += '</div>';
        el.innerHTML = html;
    }

    function showCreate() {
        let selectedIcon = '📖';
        let html = '<div class="mp-create-form">';
        html += '<div><label style="font-size:13px;font-weight:600;">项目名称</label>';
        html += '<input type="text" id="mp-new-name" placeholder="例如：我的第二部小说"></div>';
        html += '<div><label style="font-size:13px;font-weight:600;">项目描述</label>';
        html += '<textarea id="mp-new-desc" placeholder="可选的项目描述..."></textarea></div>';
        html += '<div><label style="font-size:13px;font-weight:600;">项目图标</label>';
        html += '<div class="mp-icon-picker" id="mp-icon-picker">';
        PROJECT_ICONS.forEach((icon, i) => {
            html += `<div class="mp-icon-option ${i === 0 ? 'selected' : ''}" onclick="MultiProjectModule.pickIcon(this, '${icon}')">${icon}</div>`;
        });
        html += '</div></div></div>';

        showModal('新建项目', html, [
            { text: '取消', class: 'btn-secondary', action: () => closeModal() },
            { text: '创建', class: 'btn-primary', action: async () => {
                const name = document.getElementById('mp-new-name').value.trim();
                if (!name) { showToast('请输入项目名称', 'error'); return; }
                const desc = document.getElementById('mp-new-desc').value.trim();
                const project = {
                    id: 'proj_' + Date.now(),
                    name: name,
                    description: desc,
                    icon: selectedIcon,
                    createdAt: Date.now()
                };
                projects.push(project);
                await apiRequest('/api/mod/projects/save', 'POST', projects);
                closeModal(); showToast('项目已创建', 'success');
                refreshView();
            }}
        ]);
    }

    function pickIcon(el, icon) {
        document.querySelectorAll('.mp-icon-option').forEach(e => e.classList.remove('selected'));
        el.classList.add('selected');
    }

    async function switchTo(projectId) {
        const project = projects.find(p => p.id === projectId);
        if (!project) return;
        showModal('切换项目', `<p>切换到 "${project.name}" 将加载该项目的数据。</p><p style="color:#f59e0b;font-size:13px;">⚠️ 请确保当前数据已保存。</p>`, [
            { text: '取消', class: 'btn-secondary', action: () => closeModal() },
            { text: '切换', class: 'btn-primary', action: async () => {
                currentProjectId = projectId;
                localStorage.setItem('current_project_id', projectId);
                closeModal();
                showToast('已切换到 ' + project.name, 'success');
                if (typeof window.loadAllData === 'function') await window.loadAllData();
                refreshView();
            }}
        ]);
    }

    function renameProject(id) {
        const project = projects.find(p => p.id === id);
        if (!project) return;
        showModal('重命名项目', `<div><label>新名称:</label><input type="text" id="mp-rename-input" value="${project.name}" style="width:100%;padding:8px;border:1px solid #e5e7eb;border-radius:6px;margin-top:4px;"></div>`, [
            { text: '取消', class: 'btn-secondary', action: () => closeModal() },
            { text: '保存', class: 'btn-primary', action: async () => {
                const newName = document.getElementById('mp-rename-input').value.trim();
                if (!newName) return;
                project.name = newName;
                await apiRequest('/api/mod/projects/save', 'POST', projects);
                closeModal(); showToast('已重命名', 'success');
                refreshView();
            }}
        ]);
    }

    async function deleteProject(id) {
        const project = projects.find(p => p.id === id);
        if (!project) return;
        if (!confirm(`确定删除项目 "${project.name}"？此操作不可恢复。`)) return;
        projects = projects.filter(p => p.id !== id);
        await apiRequest('/api/mod/projects/save', 'POST', projects);
        if (currentProjectId === id) {
            currentProjectId = projects.length > 0 ? projects[0].id : null;
            localStorage.setItem('current_project_id', currentProjectId || '');
        }
        showToast('项目已删除', 'success');
        refreshView();
    }

    function previewRenderer() { return `<p>项目管理: ${projects.length} 个项目</p>`; }
    function exportFormatter() {
        let text = '=== 项目列表 ===\n\n';
        projects.forEach(p => {
            text += `${p.icon} ${p.name} - ${p.description || '无描述'}\n`;
            text += `  创建于: ${new Date(p.createdAt).toLocaleString('zh-CN')}\n`;
            text += `  ${p.id === currentProjectId ? '(当前项目)' : ''}\n\n`;
        });
        return text;
    }
    function searchIndexer() { return []; }

    window.MultiProjectModule = { loadData, refreshView, showCreate, pickIcon, switchTo, renameProject, deleteProject };
    ModuleRegistry.register({
        id: 'multi_project', name: '多项目管理', icon: 'folder', group: 'tools', order: 7, hidden: true,
        dataKeys: ['projects'],
        previewRenderer, exportFormatter, searchIndexer,
        pageRenderer: renderPage,
        onPageShow: () => { loadData().then(() => refreshView()); }
    });
    console.log('[MultiProject] 多项目管理模块已注册');
})();
