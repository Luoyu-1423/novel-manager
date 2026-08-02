// ============================================================
// 模块: 数据导入 (mod_data_import.js)
// 版本: 3.2.0
// ============================================================
(function() {
    'use strict';
    const style = document.createElement('style');
    style.textContent = `
        .imp-container { display: flex; flex-direction: column; gap: 16px; }
        .imp-drop-zone { border: 2px dashed var(--border-color, #e5e7eb); border-radius: 12px; padding: 40px; text-align: center; cursor: pointer; transition: all 0.2s; }
        .imp-drop-zone:hover, .imp-drop-zone.drag-over { border-color: var(--primary-color, #7c3aed); background: rgba(124,58,237,0.04); }
        .imp-drop-zone p { margin: 8px 0; color: var(--text-secondary, #6b7280); }
        .imp-drop-zone .imp-icon { font-size: 48px; }
        .imp-formats { display: flex; gap: 8px; justify-content: center; margin-top: 8px; }
        .imp-format-badge { padding: 3px 10px; background: var(--bg-color, #f3f4f6); border-radius: 12px; font-size: 11px; color: var(--text-secondary, #6b7280); }
        .imp-preview-area { background: var(--bg-color, #f9fafb); border-radius: 8px; padding: 16px; max-height: 300px; overflow: auto; font-size: 13px; font-family: monospace; white-space: pre-wrap; word-break: break-all; }
        .imp-mapping { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .imp-mapping-row { display: contents; }
        .imp-mapping-row label, .imp-mapping-row select { padding: 6px 10px; font-size: 13px; }
        .imp-mapping-row select { border: 1px solid var(--border-color, #e5e7eb); border-radius: 4px; }
        .imp-progress { height: 6px; background: var(--bg-color, #f3f4f6); border-radius: 3px; overflow: hidden; }
        .imp-progress-bar { height: 100%; background: var(--primary-color, #7c3aed); transition: width 0.3s; }
        .imp-log { max-height: 150px; overflow: auto; font-size: 12px; padding: 8px; background: var(--bg-color, #f9fafb); border-radius: 6px; }
        .imp-log-item { padding: 2px 0; color: var(--text-secondary, #6b7280); }
        .imp-log-item.success { color: #10b981; }
        .imp-log-item.error { color: #ef4444; }
    `;
    document.head.appendChild(style);

    let parsedData = null;
    let importLog = [];

    async function loadData() {}

    function renderPage() {
        let html = '<section class="card">';
        html += '<div class="card-header"><h2>📥 数据导入</h2></div>';
        html += '<div class="imp-container" id="imp-container">';
        html += '<div class="imp-drop-zone" id="imp-drop-zone" onclick="document.getElementById(\'imp-file-input\').click()">';
        html += '<div class="imp-icon">📁</div>';
        html += '<p><strong>点击选择文件</strong> 或拖拽文件到此处</p>';
        html += '<div class="imp-formats">';
        html += '<span class="imp-format-badge">JSON</span>';
        html += '<span class="imp-format-badge">TXT</span>';
        html += '<span class="imp-format-badge">CSV</span>';
        html += '</div>';
        html += '<input type="file" id="imp-file-input" style="display:none" accept=".json,.txt,.csv" onchange="FulltextSearchModule;DataImportModule.handleFile(this.files[0])">';
        html += '</div>';
        html += '<div id="imp-preview-section" style="display:none;">';
        html += '<h3 style="font-size:14px;margin-bottom:8px;">数据预览</h3>';
        html += '<div class="imp-preview-area" id="imp-preview"></div>';
        html += '</div>';
        html += '<div id="imp-mapping-section" style="display:none;">';
        html += '<h3 style="font-size:14px;margin-bottom:8px;">字段映射</h3>';
        html += '<div class="imp-mapping" id="imp-mapping"></div>';
        html += '</div>';
        html += '<div id="imp-action-section" style="display:none;">';
        html += '<div style="display:flex;gap:8px;align-items:center;">';
        html += '<select id="imp-target-module" style="flex:1;padding:8px;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;"></select>';
        html += '<button class="btn-primary btn-small" onclick="DataImportModule.startImport()">开始导入</button>';
        html += '</div>';
        html += '<div class="imp-progress" id="imp-progress" style="display:none;margin-top:8px;"><div class="imp-progress-bar" id="imp-progress-bar" style="width:0%"></div></div>';
        html += '<div class="imp-log" id="imp-log" style="display:none;margin-top:8px;"></div>';
        html += '</div>';
        html += '</div></section>';
        return html;
    }

    function refreshView() {
        setupDropZone();
        populateTargetModules();
    }

    function setupDropZone() {
        const zone = document.getElementById('imp-drop-zone');
        if (!zone) return;
        zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
        zone.addEventListener('dragleave', () => { zone.classList.remove('drag-over'); });
        zone.addEventListener('drop', (e) => {
            e.preventDefault(); zone.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
        });
    }

    function populateTargetModules() {
        const sel = document.getElementById('imp-target-module');
        if (!sel) return;
        const modules = ModuleRegistry.getAllModules();
        const moduleList = Array.isArray(modules) ? modules : Object.values(modules || {});
        sel.innerHTML = '<option value="">选择目标模块...</option>';
        moduleList.forEach(m => {
            if (m.dataKeys && m.dataKeys.length > 0) {
                sel.innerHTML += `<option value="${m.id}">${m.icon || ''} ${m.name}</option>`;
            }
        });
    }

    function handleFile(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            const ext = file.name.split('.').pop().toLowerCase();
            try {
                if (ext === 'json') {
                    parsedData = JSON.parse(content);
                } else if (ext === 'csv') {
                    parsedData = parseCSV(content);
                } else {
                    parsedData = parseTXT(content);
                }
                showPreview(content, parsedData);
            } catch(err) {
                showToast('文件解析失败: ' + err.message, 'error');
            }
        };
        reader.readAsText(file);
    }

    function parseCSV(content) {
        const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) return [];
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        return lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const obj = {};
            headers.forEach((h, i) => { obj[h] = values[i] || ''; });
            return obj;
        });
    }

    function parseTXT(content) {
        const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
        return lines.map((line, idx) => ({ id: idx + 1, content: line }));
    }

    function showPreview(rawContent, data) {
        const section = document.getElementById('imp-preview-section');
        const preview = document.getElementById('imp-preview');
        if (!section || !preview) return;
        section.style.display = 'block';
        let display = '';
        if (Array.isArray(data)) {
            display = `共 ${data.length} 条记录\n\n`;
            display += JSON.stringify(data.slice(0, 5), null, 2);
            if (data.length > 5) display += '\n... (仅显示前5条)';
        } else if (typeof data === 'object') {
            const keys = Object.keys(data);
            display = `对象，包含 ${keys.length} 个字段:\n${keys.join(', ')}\n\n`;
            display += JSON.stringify(data, null, 2).substring(0, 1000);
        } else {
            display = String(data).substring(0, 1000);
        }
        preview.textContent = display;
        document.getElementById('imp-action-section').style.display = 'block';
    }

    async function startImport() {
        if (!parsedData) { showToast('请先选择文件', 'error'); return; }
        const targetModule = document.getElementById('imp-target-module').value;
        if (!targetModule) { showToast('请选择目标模块', 'error'); return; }

        const mod = ModuleRegistry.getModule(targetModule);
        if (!mod) { showToast('目标模块未找到', 'error'); return; }

        const progressEl = document.getElementById('imp-progress');
        const progressBar = document.getElementById('imp-progress-bar');
        const logEl = document.getElementById('imp-log');
        if (progressEl) progressEl.style.display = 'block';
        if (logEl) logEl.style.display = 'block';
        importLog = [];

        const items = Array.isArray(parsedData) ? parsedData : [parsedData];
        const total = items.length;
        let success = 0, failed = 0;

        for (let i = 0; i < total; i++) {
            try {
                const key = mod.dataKeys[0];
                await apiRequest(`/api/mod/${key}/add`, 'POST', items[i]);
                success++;
                addLog(`✅ 导入第 ${i + 1} 条成功`, 'success');
            } catch(e) {
                failed++;
                addLog(`❌ 导入第 ${i + 1} 条失败: ${e.message}`, 'error');
            }
            if (progressBar) progressBar.style.width = ((i + 1) / total * 100) + '%';
        }

        addLog(`\n导入完成: 成功 ${success} 条, 失败 ${failed} 条`, failed > 0 ? 'error' : 'success');
        showToast(`导入完成: ${success} 成功, ${failed} 失败`, failed > 0 ? 'error' : 'success');
    }

    function addLog(msg, type) {
        importLog.push({ msg, type });
        const logEl = document.getElementById('imp-log');
        if (!logEl) return;
        logEl.innerHTML = importLog.map(l => `<div class="imp-log-item ${l.type || ''}">${l.msg}</div>`).join('');
        logEl.scrollTop = logEl.scrollHeight;
    }

    function previewRenderer() { return '<p>数据导入模块</p>'; }
    function exportFormatter() { return ''; }
    function searchIndexer() { return []; }

    window.DataImportModule = { loadData, refreshView, handleFile, startImport };
    ModuleRegistry.register({
        id: 'data_import', name: '数据导入', icon: 'download', group: 'tools', order: 2, hidden: true,
        dataKeys: [],
        previewRenderer, exportFormatter, searchIndexer,
        pageRenderer: renderPage,
        onPageShow: () => { loadData().then(() => refreshView()); }
    });
    console.log('[DataImport] 数据导入模块已注册');
})();
