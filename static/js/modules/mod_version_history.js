// ============================================================
// 模块: 数据版本历史 (mod_version_history.js)
// 版本: 3.2.0
// ============================================================
(function() {
    'use strict';
    const style = document.createElement('style');
    style.textContent = `
        .vh-container { display: flex; flex-direction: column; gap: 16px; }
        .vh-toolbar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .vh-snapshot-list { display: flex; flex-direction: column; gap: 8px; max-height: 500px; overflow: auto; }
        .vh-snapshot-item { display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--card-bg, #fff); border: 1px solid var(--border-color, #e5e7eb); border-radius: 8px; transition: box-shadow 0.2s; }
        .vh-snapshot-item:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
        .vh-snapshot-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px; background: var(--bg-color, #f3f4f6); }
        .vh-snapshot-info { flex: 1; }
        .vh-snapshot-title { font-size: 14px; font-weight: 600; }
        .vh-snapshot-meta { font-size: 12px; color: var(--text-secondary, #6b7280); margin-top: 2px; }
        .vh-snapshot-stats { font-size: 11px; color: var(--primary-color, #7c3aed); margin-top: 2px; }
        .vh-snapshot-actions { display: flex; gap: 6px; }
        .vh-diff-view { background: var(--bg-color, #f9fafb); border-radius: 8px; padding: 16px; max-height: 400px; overflow: auto; font-size: 13px; }
        .vh-diff-added { color: #10b981; background: rgba(16,185,129,0.08); padding: 1px 4px; border-radius: 2px; }
        .vh-diff-removed { color: #ef4444; background: rgba(239,68,68,0.08); padding: 1px 4px; border-radius: 2px; text-decoration: line-through; }
        .vh-diff-key { font-weight: 600; color: var(--text-color, #1f2937); }
        .vh-empty { text-align: center; padding: 40px; color: #9ca3af; }
    `;
    document.head.appendChild(style);

    let snapshots = [];

    async function loadData() {
        try {
            snapshots = await apiRequest('/api/mod/version_history') || [];
        } catch(e) { snapshots = []; }
    }

    function renderPage() {
        let html = '<section class="card">';
        html += '<div class="card-header"><h2>📜 版本历史</h2>';
        html += '<div style="display:flex;gap:8px;">';
        html += '<button class="btn-primary btn-small" onclick="VersionHistoryModule.createSnapshot()">📸 创建快照</button>';
        html += '<button class="btn-secondary btn-small" onclick="VersionHistoryModule.autoSnapshot()">⚙️ 自动快照</button>';
        html += '</div></div>';
        html += '<div class="vh-container">';
        html += '<div class="vh-toolbar" id="vh-toolbar">';
        html += `<span style="font-size:13px;color:#6b7280;">共 ${snapshots.length} 个快照</span>`;
        html += '</div>';
        html += '<div class="vh-snapshot-list" id="vh-snapshot-list"></div>';
        html += '<div id="vh-diff-section" style="display:none;">';
        html += '<h3 style="font-size:14px;margin-bottom:8px;">数据对比</h3>';
        html += '<div class="vh-diff-view" id="vh-diff-view"></div>';
        html += '</div>';
        html += '</div></section>';
        return html;
    }

    function refreshView() {
        renderList();
    }

    function renderList() {
        const el = document.getElementById('vh-snapshot-list');
        if (!el) return;
        if (snapshots.length === 0) {
            el.innerHTML = '<div class="vh-empty">暂无快照记录<br><span style="font-size:12px;">点击"创建快照"保存当前数据状态</span></div>';
            return;
        }
        let html = '';
        snapshots.slice().reverse().forEach((snap, idx) => {
            const realIdx = snapshots.length - 1 - idx;
            const date = new Date(snap.timestamp);
            const dateStr = date.toLocaleString('zh-CN');
            const keyCount = snap.data ? Object.keys(snap.data).length : 0;
            const totalItems = snap.data ? Object.values(snap.data).reduce((sum, v) => {
                if (Array.isArray(v)) return sum + v.length;
                if (v && typeof v === 'object') return sum + Object.keys(v).length;
                return sum + (v ? 1 : 0);
            }, 0) : 0;
            html += `<div class="vh-snapshot-item">`;
            html += `<div class="vh-snapshot-icon">${snap.auto ? '🔄' : '📸'}</div>`;
            html += `<div class="vh-snapshot-info">`;
            html += `<div class="vh-snapshot-title">${snap.label || '快照 #' + (realIdx + 1)}</div>`;
            html += `<div class="vh-snapshot-meta">${dateStr}</div>`;
            html += `<div class="vh-snapshot-stats">${keyCount} 个数据键 · ${totalItems} 条数据</div>`;
            html += `</div>`;
            html += `<div class="vh-snapshot-actions">`;
            if (realIdx > 0) {
                html += `<button class="btn-secondary btn-small" onclick="VersionHistoryModule.compare(${realIdx})">对比</button>`;
            }
            html += `<button class="btn-secondary btn-small" onclick="VersionHistoryModule.rollback(${realIdx})">回滚</button>`;
            html += `<button class="btn-small" style="color:#ef4444;" onclick="VersionHistoryModule.deleteSnapshot(${realIdx})">删除</button>`;
            html += `</div></div>`;
        });
        el.innerHTML = html;
    }

    async function createSnapshot() {
        const data = window.appData || {};
        const snap = {
            timestamp: Date.now(),
            label: '手动快照',
            auto: false,
            data: JSON.parse(JSON.stringify(data))
        };
        showModal('创建快照', '<div><label>快照名称:</label><input type="text" id="vh-snap-label" value="手动快照" style="width:100%;padding:8px;border:1px solid #e5e7eb;border-radius:6px;margin-top:4px;"></div>', [
            { text: '取消', class: 'btn-secondary', action: () => closeModal() },
            { text: '创建', class: 'btn-primary', action: async () => {
                snap.label = document.getElementById('vh-snap-label').value.trim() || '手动快照';
                snapshots.push(snap);
                if (snapshots.length > 50) snapshots = snapshots.slice(-50);
                await apiRequest('/api/mod/version_history/save', 'POST', snapshots);
                closeModal(); showToast('快照已创建', 'success');
                refreshView();
            }}
        ]);
    }

    async function autoSnapshot() {
        const data = window.appData || {};
        snapshots.push({
            timestamp: Date.now(),
            label: '自动快照',
            auto: true,
            data: JSON.parse(JSON.stringify(data))
        });
        if (snapshots.length > 50) snapshots = snapshots.slice(-50);
        await apiRequest('/api/mod/version_history/save', 'POST', snapshots);
        showToast('自动快照已创建', 'success');
        refreshView();
    }

    function compare(idx) {
        if (idx < 1) return;
        const oldSnap = snapshots[idx - 1];
        const newSnap = snapshots[idx];
        const diffEl = document.getElementById('vh-diff-view');
        const section = document.getElementById('vh-diff-section');
        if (!diffEl || !section) return;
        section.style.display = 'block';
        const diff = computeDiff(oldSnap.data || {}, newSnap.data || {});
        if (diff.length === 0) {
            diffEl.innerHTML = '<div style="text-align:center;padding:20px;color:#9ca3af;">两个快照数据完全相同</div>';
            return;
        }
        let html = '';
        diff.forEach(d => {
            if (d.type === 'added') {
                html += `<div><span class="vh-diff-key">${d.key}:</span> <span class="vh-diff-added">+ 新增 (${formatSize(d.value)})</span></div>`;
            } else if (d.type === 'removed') {
                html += `<div><span class="vh-diff-key">${d.key}:</span> <span class="vh-diff-removed">- 已删除 (${formatSize(d.value)})</span></div>`;
            } else if (d.type === 'changed') {
                html += `<div><span class="vh-diff-key">${d.key}:</span> <span class="vh-diff-removed">旧(${formatSize(d.oldValue)})</span> → <span class="vh-diff-added">新(${formatSize(d.newValue)})</span></div>`;
            }
        });
        diffEl.innerHTML = html;
    }

    function computeDiff(oldData, newData) {
        const diff = [];
        const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
        allKeys.forEach(key => {
            const oldVal = oldData[key];
            const newVal = newData[key];
            const oldStr = JSON.stringify(oldVal);
            const newStr = JSON.stringify(newVal);
            if (oldStr !== newStr) {
                if (oldVal === undefined) diff.push({ type: 'added', key, value: newVal });
                else if (newVal === undefined) diff.push({ type: 'removed', key, value: oldVal });
                else diff.push({ type: 'changed', key, oldValue: oldVal, newValue: newVal });
            }
        });
        return diff;
    }

    function formatSize(val) {
        if (Array.isArray(val)) return val.length + ' 条';
        if (val && typeof val === 'object') return Object.keys(val).length + ' 项';
        return String(val).substring(0, 20);
    }

    async function rollback(idx) {
        const snap = snapshots[idx];
        if (!snap || !snap.data) return;
        showModal('确认回滚', `<p>确定要回滚到 "${snap.label}" (${new Date(snap.timestamp).toLocaleString('zh-CN')}) 吗？</p><p style="color:#ef4444;font-size:13px;">⚠️ 当前数据将被覆盖，建议先创建快照备份。</p>`, [
            { text: '取消', class: 'btn-secondary', action: () => closeModal() },
            { text: '确认回滚', class: 'btn-danger', action: async () => {
                try {
                    await apiRequest('/api/mod/data/set', 'POST', snap.data);
                    if (typeof window.loadAllData === 'function') await window.loadAllData();
                    closeModal(); showToast('已回滚到快照', 'success');
                } catch(e) { showToast('回滚失败: ' + e.message, 'error'); }
            }}
        ]);
    }

    async function deleteSnapshot(idx) {
        if (!confirm('确定删除此快照？')) return;
        snapshots.splice(idx, 1);
        await apiRequest('/api/mod/version_history/save', 'POST', snapshots);
        refreshView();
    }

    function previewRenderer() { return '<p>版本历史: ' + snapshots.length + ' 个快照</p>'; }
    function exportFormatter() {
        let text = '=== 版本历史 ===\n\n';
        snapshots.forEach((s, i) => {
            text += `#${i + 1} ${s.label} - ${new Date(s.timestamp).toLocaleString('zh-CN')}\n`;
        });
        return text;
    }
    function searchIndexer() { return []; }

    window.VersionHistoryModule = { loadData, refreshView, createSnapshot, autoSnapshot, compare, rollback, deleteSnapshot };
    ModuleRegistry.register({
        id: 'version_history', name: '版本历史', icon: '📜', group: 'tools', order: 5,
        dataKeys: ['version_history'],
        previewRenderer, exportFormatter, searchIndexer,
        pageRenderer: renderPage,
        onPageShow: () => { loadData().then(() => refreshView()); }
    });
    console.log('[VersionHistory] 版本历史模块已注册');
})();
