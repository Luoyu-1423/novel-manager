// ============================================================
// 模块: 时间线 (mod_timeline.js)
// 版本: 3.2.0
// 功能: 按时间轴排列事件，展示故事发展脉络
// ============================================================

(function() {
    'use strict';

    const style = document.createElement('style');
    style.textContent = `
        .timeline-container { position: relative; padding-left: 30px; }
        .timeline-container::before { content: ''; position: absolute; left: 14px; top: 0; bottom: 0; width: 2px; background: var(--border-color, #e5e7eb); }
        .timeline-era { margin-bottom: 24px; }
        .timeline-era-title { font-size: 16px; font-weight: 700; color: var(--primary-color, #6366f1); margin-bottom: 12px; padding: 4px 0; }
        .timeline-event { position: relative; margin-bottom: 16px; padding: 12px 16px; background: var(--card-bg, #fff); border: 1px solid var(--border-color, #e5e7eb); border-radius: 8px; }
        .timeline-event::before { content: ''; position: absolute; left: -22px; top: 16px; width: 10px; height: 10px; border-radius: 50%; background: var(--primary-color, #6366f1); border: 2px solid var(--card-bg, #fff); }
        .timeline-event.important::before { width: 14px; height: 14px; left: -24px; background: #f59e0b; }
        .timeline-event-header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 6px; }
        .timeline-event-title { font-size: 15px; font-weight: 600; }
        .timeline-event-time { font-size: 13px; color: var(--primary-color, #6366f1); font-weight: 500; }
        .timeline-event-desc { font-size: 14px; color: var(--text-secondary, #6b7280); line-height: 1.5; }
        .timeline-event-actions { display: flex; gap: 6px; margin-top: 8px; }
        .timeline-toolbar { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
        .timeline-empty { text-align: center; color: #9ca3af; padding: 40px 0; }
    `;
    document.head.appendChild(style);

    let timelineEvents = [];
    let timelineEras = [];
    let sortAsc = true;

    async function loadData() {
        try {
            timelineEvents = await apiRequest('/api/mod/timeline') || [];
            timelineEras = await apiRequest('/api/mod/timeline_eras') || [];
        } catch(e) {
            timelineEvents = [];
            timelineEras = [];
        }
    }

    function renderPage() {
        let html = '<section class="card">';
        html += '<div class="card-header"><h2>📅 时间线</h2>';
        html += '<div style="display:flex;gap:8px;">';
        html += '<button class="btn-small" onclick="TimelineModule.exportData()">导出</button>';
        html += '<button class="btn-secondary btn-small" onclick="TimelineModule.toggleSort()">排序</button>';
        html += '<button class="btn-secondary btn-small" onclick="TimelineModule.showAddEra()">+ 纪元</button>';
        html += '<button class="btn-primary btn-small" onclick="TimelineModule.showAddEvent()">+ 添加事件</button>';
        html += '</div></div>';
        html += '<div class="timeline-toolbar" id="timeline-toolbar"></div>';
        html += '<div class="timeline-container" id="timeline-container"></div>';
        html += '</section>';
        return html;
    }

    function refreshView() {
        renderTimeline();
    }

    function renderTimeline() {
        const container = document.getElementById('timeline-container');
        if (!container) return;

        if (timelineEvents.length === 0 && timelineEras.length === 0) {
            container.innerHTML = '<div class="timeline-empty">暂无时间线数据，添加纪元和事件开始构建故事时间线</div>';
            return;
        }

        // 按纪元分组
        const eraMap = {};
        timelineEras.forEach(era => { eraMap[era.id] = { ...era, events: [] }; });
        const noEra = { id: '_no_era', name: '未分类', events: [] };

        timelineEvents.forEach(evt => {
            const eraId = evt.era_id || '_no_era';
            if (eraMap[eraId]) {
                eraMap[eraId].events.push(evt);
            } else {
                noEra.events.push(evt);
            }
        });

        let html = '';
        const sortedEras = [...Object.values(eraMap), ...(noEra.events.length > 0 ? [noEra] : [])]
            .sort((a, b) => (a.order || 0) - (b.order || 0));

        sortedEras.forEach(era => {
            const events = era.events.sort((a, b) => {
                const va = a.time_value || '';
                const vb = b.time_value || '';
                return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
            });

            if (events.length === 0 && era.id !== '_no_era') return;

            html += `<div class="timeline-era">`;
            if (era.id !== '_no_era') {
                html += `<div class="timeline-era-title">${era.icon || '⏳'} ${escapeHtml(era.name)}`;
                html += ` <span class="btn-tiny" onclick="TimelineModule.showEditEra('${era.id}')" style="vertical-align:middle;">✏️</span>`;
                html += ` <span class="btn-tiny btn-danger" onclick="TimelineModule.deleteEra('${era.id}')" style="vertical-align:middle;color:#ef4444;">✕</span>`;
                html += `</div>`;
            }

            events.forEach(evt => {
                const importantClass = evt.important ? ' important' : '';
                html += `<div class="timeline-event${importantClass}">`;
                html += `<div class="timeline-event-header">`;
                html += `<span class="timeline-event-title">${evt.important ? '⭐ ' : ''}${escapeHtml(evt.name)}${typeof renderIdBadge === 'function' ? renderIdBadge(evt.id) : ''}</span>`;
                html += `<span class="timeline-event-time">${escapeHtml(evt.time_value || '')}</span>`;
                html += `</div>`;
                if (evt.description) html += `<div class="timeline-event-desc">${escapeHtml(evt.description)}</div>`;
                html += `<div class="timeline-event-actions">`;
                html += `<button class="btn-tiny" onclick="TimelineModule.showEditEvent('${evt.id}')">编辑</button>`;
                html += `<button class="btn-tiny btn-danger" onclick="TimelineModule.deleteEvent('${evt.id}')">删除</button>`;
                html += `</div></div>`;
            });

            html += `</div>`;
        });

        container.innerHTML = html;
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    // ==================== CRUD: 纪元 ====================

    function showAddEra() {
        showModal('添加纪元', `
            <div style="display:flex;flex-direction:column;gap:12px;">
                <div><label>纪元名称</label><input type="text" id="tl-era-name" class="modal-input" placeholder="如：第一纪元、现代"></div>
                <div><label>图标</label><input type="text" id="tl-era-icon" class="modal-input" value="⏳"></div>
                <div><label>排序号</label><input type="number" id="tl-era-order" class="modal-input" value="${timelineEras.length + 1}"></div>
            </div>
        `, [
            { text: '取消', class: 'btn-secondary', action: () => closeModal() },
            { text: '添加', class: 'btn-primary', action: async () => {
                const name = document.getElementById('tl-era-name').value.trim();
                const icon = document.getElementById('tl-era-icon').value.trim() || '⏳';
                const order = parseInt(document.getElementById('tl-era-order').value) || 1;
                if (!name) { showToast('请输入纪元名称', 'error'); return; }
                const id = 'era_' + Date.now();
                timelineEras.push({ id, name, icon, order });
                await apiRequest('/api/mod/timeline_eras/save', 'POST', timelineEras);
                refreshView();
                closeModal();
                showToast('纪元已添加', 'success');
            }}
        ]);
    }

    function showEditEra(eraId) {
        const era = timelineEras.find(e => e.id === eraId);
        if (!era) return;
        showModal('编辑纪元', `
            <div style="display:flex;flex-direction:column;gap:12px;">
                <div><label>纪元名称</label><input type="text" id="tl-era-name" class="modal-input" value="${escapeHtml(era.name)}"></div>
                <div><label>图标</label><input type="text" id="tl-era-icon" class="modal-input" value="${era.icon || '⏳'}"></div>
                <div><label>排序号</label><input type="number" id="tl-era-order" class="modal-input" value="${era.order || 1}"></div>
            </div>
        `, [
            { text: '取消', class: 'btn-secondary', action: () => closeModal() },
            { text: '保存', class: 'btn-primary', action: async () => {
                era.name = document.getElementById('tl-era-name').value.trim();
                era.icon = document.getElementById('tl-era-icon').value.trim();
                era.order = parseInt(document.getElementById('tl-era-order').value) || 1;
                await apiRequest('/api/mod/timeline_eras/save', 'POST', timelineEras);
                refreshView();
                closeModal();
                showToast('纪元已更新', 'success');
            }}
        ]);
    }

    async function deleteEra(eraId) {
        if (!confirm('确定删除该纪元吗？其中的事件将变为未分类。')) return;
        timelineEras = timelineEras.filter(e => e.id !== eraId);
        timelineEvents.forEach(evt => { if (evt.era_id === eraId) evt.era_id = ''; });
        await apiRequest('/api/mod/timeline_eras/save', 'POST', timelineEras);
        await apiRequest('/api/mod/timeline/save', 'POST', timelineEvents);
        refreshView();
        showToast('纪元已删除', 'success');
    }

    // ==================== CRUD: 事件 ====================

    function showAddEvent() {
        let eraOptions = '<option value="">未分类</option>';
        timelineEras.forEach(era => {
            eraOptions += `<option value="${era.id}">${era.icon} ${escapeHtml(era.name)}</option>`;
        });
        showModal('添加事件', `
            <div style="display:flex;flex-direction:column;gap:12px;">
                <div><label>事件名称</label><input type="text" id="tl-evt-name" class="modal-input" placeholder="事件名称"></div>
                <div><label>时间/时期</label><input type="text" id="tl-evt-time" class="modal-input" placeholder="如：第3年春、1000年前"></div>
                <div><label>所属纪元</label><select id="tl-evt-era" class="modal-input">${eraOptions}</select></div>
                <div><label>描述</label><textarea id="tl-evt-desc" class="modal-input" rows="4" placeholder="事件详细描述..."></textarea></div>
                <div style="display:flex;align-items:center;gap:8px;"><input type="checkbox" id="tl-evt-important"><label>标记为重要事件 ⭐</label></div>
            </div>
        `, [
            { text: '取消', class: 'btn-secondary', action: () => closeModal() },
            { text: '添加', class: 'btn-primary', action: async () => {
                const name = document.getElementById('tl-evt-name').value.trim();
                const time_value = document.getElementById('tl-evt-time').value.trim();
                const era_id = document.getElementById('tl-evt-era').value;
                const description = document.getElementById('tl-evt-desc').value.trim();
                const important = document.getElementById('tl-evt-important').checked;
                if (!name) { showToast('请输入事件名称', 'error'); return; }
                const id = 'evt_' + Date.now();
                timelineEvents.push({ id, name, time_value, era_id, description, important });
                await apiRequest('/api/mod/timeline/save', 'POST', timelineEvents);
                refreshView();
                closeModal();
                showToast('事件已添加', 'success');
            }}
        ]);
    }

    function showEditEvent(evtId) {
        const evt = timelineEvents.find(e => e.id === evtId);
        if (!evt) return;
        let eraOptions = '<option value="">未分类</option>';
        timelineEras.forEach(era => {
            const selected = evt.era_id === era.id ? ' selected' : '';
            eraOptions += `<option value="${era.id}"${selected}>${era.icon} ${escapeHtml(era.name)}</option>`;
        });
        showModal('编辑事件', `
            <div style="display:flex;flex-direction:column;gap:12px;">
                <div><label>事件名称</label><input type="text" id="tl-evt-name" class="modal-input" value="${escapeHtml(evt.name)}"></div>
                <div><label>时间/时期</label><input type="text" id="tl-evt-time" class="modal-input" value="${escapeHtml(evt.time_value || '')}"></div>
                <div><label>所属纪元</label><select id="tl-evt-era" class="modal-input">${eraOptions}</select></div>
                <div><label>描述</label><textarea id="tl-evt-desc" class="modal-input" rows="4">${escapeHtml(evt.description || '')}</textarea></div>
                <div style="display:flex;align-items:center;gap:8px;"><input type="checkbox" id="tl-evt-important" ${evt.important ? 'checked' : ''}><label>标记为重要事件 ⭐</label></div>
            </div>
        `, [
            { text: '取消', class: 'btn-secondary', action: () => closeModal() },
            { text: '保存', class: 'btn-primary', action: async () => {
                evt.name = document.getElementById('tl-evt-name').value.trim();
                evt.time_value = document.getElementById('tl-evt-time').value.trim();
                evt.era_id = document.getElementById('tl-evt-era').value;
                evt.description = document.getElementById('tl-evt-desc').value.trim();
                evt.important = document.getElementById('tl-evt-important').checked;
                await apiRequest('/api/mod/timeline/save', 'POST', timelineEvents);
                refreshView();
                closeModal();
                showToast('事件已更新', 'success');
            }}
        ]);
    }

    async function deleteEvent(evtId) {
        if (!confirm('确定删除该事件吗？')) return;
        timelineEvents = timelineEvents.filter(e => e.id !== evtId);
        await apiRequest('/api/mod/timeline/save', 'POST', timelineEvents);
        refreshView();
        showToast('事件已删除', 'success');
    }

    function toggleSort() {
        sortAsc = !sortAsc;
        refreshView();
        showToast(sortAsc ? '已切换为正序' : '已切换为倒序', 'success');
    }

    // ==================== 预览/导出/搜索 ====================

    function previewRenderer() {
        if (!timelineEvents || timelineEvents.length === 0) return '<p>暂无时间线数据</p>';
        let html = `<p>共 ${timelineEvents.length} 个事件`;
        if (timelineEras.length > 0) html += `，${timelineEras.length} 个纪元`;
        html += '</p><ul style="margin-left:20px;">';
        const sorted = [...timelineEvents].sort((a, b) => (a.time_value || '').localeCompare(b.time_value || ''));
        sorted.slice(0, 8).forEach(evt => {
            html += `<li>${evt.important ? '⭐ ' : ''}${evt.name}${evt.time_value ? ' (' + evt.time_value + ')' : ''}</li>`;
        });
        if (sorted.length > 8) html += `<li>... 还有 ${sorted.length - 8} 个事件</li>`;
        html += '</ul>';
        return html;
    }

    function exportFormatter(data, detailed) {
        const events = data.timeline || [];
        const eras = data.timeline_eras || [];
        if (events.length === 0) return '';
        let text = '=== 时间线 ===\n\n';
        const eraMap = {};
        eras.forEach(era => { eraMap[era.id] = era; });
        const grouped = {};
        events.forEach(evt => {
            const eraName = evt.era_id && eraMap[evt.era_id] ? eraMap[evt.era_id].name : '未分类';
            if (!grouped[eraName]) grouped[eraName] = [];
            grouped[eraName].push(evt);
        });
        for (const [eraName, evts] of Object.entries(grouped)) {
            text += `--- ${eraName} ---\n`;
            evts.sort((a, b) => (a.time_value || '').localeCompare(b.time_value || ''));
            evts.forEach(evt => {
                text += `\n[${evt.time_value || '未知时间'}] ${evt.important ? '⭐ ' : ''}${evt.name}\n`;
                if (evt.description) text += `${evt.description}\n`;
            });
            text += '\n';
        }
        return text;
    }

    function searchIndexer(data, query) {
        const events = data.timeline || [];
        const results = [];
        events.forEach(evt => {
            if ((evt.name || '').toLowerCase().includes(query) ||
                (evt.description || '').toLowerCase().includes(query) ||
                (evt.time_value || '').toLowerCase().includes(query)) {
                results.push({ name: `时间线: ${evt.name}`, page: 'timeline' });
            }
        });
        return results;
    }

    // ==================== 注册 ====================
    window.TimelineModule = {
        loadData, refreshView, toggleSort,
        showAddEra, showEditEra, deleteEra,
        showAddEvent, showEditEvent, deleteEvent,
        exportData: () => { if (typeof exportModule === 'function') exportModule('timeline'); }
    };

    ModuleRegistry.register({
        id: 'timeline',
        name: '时间线',
        icon: 'hourglass',
        group: 'world',
        order: 3,
        dataKeys: ['timeline', 'timeline_eras'],
        previewRenderer: previewRenderer,
        exportFormatter: exportFormatter,
        searchIndexer: searchIndexer,
        pageRenderer: renderPage,
        onPageShow: () => { loadData().then(() => refreshView()); }
    });

    console.log('[Timeline] 时间线模块已注册');
})();
