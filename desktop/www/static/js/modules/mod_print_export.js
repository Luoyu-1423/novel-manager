// ============================================================
// 模块: 打印/PDF导出 (mod_print_export.js)
// 版本: 3.2.1 - 修复模块选择bug + 预览bug
// ============================================================
(function() {
    'use strict';
    const style = document.createElement('style');
    style.textContent = `
        .pe-container { display: flex; flex-direction: column; gap: 16px; }
        .pe-section { padding: 16px; background: var(--card-bg, #fff); border: 1px solid var(--border-color, #e5e7eb); border-radius: 10px; }
        .pe-section h3 { margin: 0 0 12px 0; font-size: 15px; }
        .pe-module-list { display: flex; flex-direction: column; gap: 6px; max-height: 300px; overflow-y: auto; }
        .pe-module-item { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border: 1px solid var(--border-color, #e5e7eb); border-radius: 6px; cursor: pointer; transition: all 0.2s; user-select: none; }
        .pe-module-item:hover { background: var(--bg-color, #f9fafb); }
        .pe-module-item.selected { border-color: var(--primary-color, #7c3aed); background: rgba(124,58,237,0.04); }
        .pe-module-item input[type="checkbox"] { accent-color: var(--primary-color, #7c3aed); width: 16px; height: 16px; }
        .pe-format-btns { display: flex; gap: 8px; flex-wrap: wrap; }
        .pe-format-btn { padding: 10px 20px; border: 2px solid var(--border-color, #e5e7eb); border-radius: 8px; cursor: pointer; text-align: center; transition: all 0.2s; background: var(--card-bg, #fff); }
        .pe-format-btn:hover { border-color: var(--primary-color, #7c3aed); }
        .pe-format-btn.active { border-color: var(--primary-color, #7c3aed); background: rgba(124,58,237,0.06); }
        .pe-format-btn .pe-fmt-icon { font-size: 24px; display: block; margin-bottom: 4px; }
        .pe-format-btn .pe-fmt-name { font-size: 13px; font-weight: 600; }
        .pe-format-btn .pe-fmt-desc { font-size: 11px; color: var(--text-secondary, #6b7280); }
        .pe-config { display: flex; flex-direction: column; gap: 8px; }
        .pe-config-row { display: flex; align-items: center; gap: 12px; }
        .pe-config-row label { font-size: 13px; min-width: 80px; }
        .pe-config-row select, .pe-config-row input[type="checkbox"] { padding: 6px 10px; border: 1px solid var(--border-color, #e5e7eb); border-radius: 4px; font-size: 13px; }
        .pe-preview-area { background: #fff; color: #1f2937; padding: 24px; border-radius: 8px; border: 1px solid #e5e7eb; max-height: 400px; overflow: auto; font-size: 13px; line-height: 1.8; white-space: pre-wrap; }
        .pe-select-count { font-size: 12px; color: var(--primary-color, #7c3aed); font-weight: 600; }
    `;
    document.head.appendChild(style);

    let config = { format: 'txt', fontSize: 14, includeTOC: true, pageBreak: true };
    let selectedModules = [];

    // 安全获取模块列表（始终返回数组）
    function getModulesList() {
        const all = ModuleRegistry.getAllModules();
        return Object.values(all);
    }

    async function loadData() {
        try {
            config = { ...config, ...(await apiRequest('/api/mod/print_config') || {}) };
        } catch(e) {}
    }

    function renderPage() {
        let html = '<section class="card">';
        html += '<div class="card-header"><h2>🖨️ 打印/导出</h2></div>';
        html += '<div class="pe-container">';
        // 1. 模块选择
        html += '<div class="pe-section"><h3>1. 选择要导出的模块</h3>';
        html += '<div style="display:flex;gap:8px;margin-bottom:8px;align-items:center;">';
        html += '<button class="btn-secondary btn-small" onclick="PrintExportModule.selectAll()">✅ 全选</button>';
        html += '<button class="btn-secondary btn-small" onclick="PrintExportModule.selectNone()">❌ 取消全选</button>';
        html += '<span class="pe-select-count" id="pe-select-count"></span>';
        html += '</div>';
        html += '<div class="pe-module-list" id="pe-module-list"></div>';
        html += '</div>';
        // 2. 格式选择
        html += '<div class="pe-section"><h3>2. 选择导出格式</h3>';
        html += '<div class="pe-format-btns" id="pe-format-btns">';
        html += '<div class="pe-format-btn" data-fmt="txt" onclick="PrintExportModule.selectFormat(\'txt\')"><span class="pe-fmt-icon">📄</span><span class="pe-fmt-name">TXT</span><span class="pe-fmt-desc">纯文本格式</span></div>';
        html += '<div class="pe-format-btn" data-fmt="md" onclick="PrintExportModule.selectFormat(\'md\')"><span class="pe-fmt-icon">📝</span><span class="pe-fmt-name">Markdown</span><span class="pe-fmt-desc">Markdown格式</span></div>';
        html += '<div class="pe-format-btn" data-fmt="html" onclick="PrintExportModule.selectFormat(\'html\')"><span class="pe-fmt-icon">🌐</span><span class="pe-fmt-name">HTML</span><span class="pe-fmt-desc">网页格式</span></div>';
        html += '<div class="pe-format-btn" data-fmt="print" onclick="PrintExportModule.selectFormat(\'print\')"><span class="pe-fmt-icon">🖨️</span><span class="pe-fmt-name">打印</span><span class="pe-fmt-desc">直接打印/PDF</span></div>';
        html += '</div></div>';
        // 3. 排版设置
        html += '<div class="pe-section"><h3>3. 排版设置</h3>';
        html += '<div class="pe-config">';
        html += '<div class="pe-config-row"><label>字体大小:</label><select id="pe-font-size" onchange="PrintExportModule.updateConfig()"><option value="12">12px</option><option value="14" selected>14px</option><option value="16">16px</option><option value="18">18px</option></select></div>';
        html += '<div class="pe-config-row"><label>包含目录:</label><input type="checkbox" id="pe-include-toc" checked onchange="PrintExportModule.updateConfig()"></div>';
        html += '<div class="pe-config-row"><label>模块分页:</label><input type="checkbox" id="pe-page-break" checked onchange="PrintExportModule.updateConfig()"></div>';
        html += '</div></div>';
        // 4. 预览与导出
        html += '<div class="pe-section"><h3>4. 预览与导出</h3>';
        html += '<div style="display:flex;gap:8px;margin-bottom:12px;">';
        html += '<button class="btn-primary btn-small" onclick="PrintExportModule.preview()">👁️ 预览</button>';
        html += '<button class="btn-primary btn-small" onclick="PrintExportModule.doExport()">📤 导出</button>';
        html += '</div>';
        html += '<div class="pe-preview-area" id="pe-preview-area" style="display:none;"></div>';
        html += '</div>';
        html += '</div></section>';
        return html;
    }

    function refreshView() {
        renderModuleList();
        updateFormatSelection();
        // 恢复字体选择
        const fontSel = document.getElementById('pe-font-size');
        if (fontSel) fontSel.value = String(config.fontSize || 14);
        const tocCb = document.getElementById('pe-include-toc');
        if (tocCb) tocCb.checked = config.includeTOC !== false;
        const pbCb = document.getElementById('pe-page-break');
        if (pbCb) pbCb.checked = config.pageBreak !== false;
    }

    function renderModuleList() {
        const el = document.getElementById('pe-module-list');
        if (!el) return;
        const modules = getModulesList();
        let html = '';
        modules.forEach(m => {
            const checked = selectedModules.includes(m.id);
            html += '<label class="pe-module-item ' + (checked ? 'selected' : '') + '">';
            html += '<input type="checkbox" value="' + m.id + '" ' + (checked ? 'checked' : '') + ' onchange="PrintExportModule.toggleModule(\'' + m.id + '\', this.checked)">';
            html += '<span>' + (m.icon || '📦') + ' ' + m.name + '</span></label>';
        });
        el.innerHTML = html;
        updateSelectCount();
    }

    function updateSelectCount() {
        const el = document.getElementById('pe-select-count');
        if (el) el.textContent = '已选 ' + selectedModules.length + ' / ' + getModulesList().length + ' 个模块';
    }

    function toggleModule(id, checked) {
        if (checked && !selectedModules.includes(id)) {
            selectedModules.push(id);
        } else if (!checked) {
            selectedModules = selectedModules.filter(function(m) { return m !== id; });
        }
        renderModuleList();
    }

    function selectAll() {
        selectedModules = getModulesList().map(function(m) { return m.id; });
        renderModuleList();
    }

    function selectNone() {
        selectedModules = [];
        renderModuleList();
    }

    function selectFormat(fmt) {
        config.format = fmt;
        updateFormatSelection();
        saveConfig();
    }

    function updateFormatSelection() {
        var btns = document.querySelectorAll('.pe-format-btn');
        btns.forEach(function(b) { b.classList.remove('active'); });
        var activeBtn = document.querySelector('.pe-format-btn[data-fmt="' + config.format + '"]');
        if (activeBtn) activeBtn.classList.add('active');
    }

    function updateConfig() {
        config.fontSize = parseInt(document.getElementById('pe-font-size').value) || 14;
        config.includeTOC = document.getElementById('pe-include-toc').checked;
        config.pageBreak = document.getElementById('pe-page-break').checked;
        saveConfig();
    }

    async function saveConfig() {
        try { await apiRequest('/api/mod/print_config/save', 'POST', config); } catch(e) {}
    }

    function generateContent() {
        var data = window.appData || {};
        var content = '';
        var modules = getModulesList().filter(function(m) { return selectedModules.includes(m.id); });
        if (config.includeTOC) {
            content += '=== 目录 ===\n\n';
            modules.forEach(function(m, i) { content += (i + 1) + '. ' + (m.icon || '') + ' ' + m.name + '\n'; });
            content += '\n' + '='.repeat(40) + '\n\n';
        }
        modules.forEach(function(m, i) {
            if (i > 0 && config.pageBreak) content += '\n' + '='.repeat(40) + '\n\n';
            content += '\n' + (m.icon || '') + ' ' + m.name + '\n';
            if (m.exportFormatter) {
                try { content += m.exportFormatter(data, true) + '\n'; } catch(e) { content += '(导出失败)\n'; }
            } else {
                content += '(该模块未提供导出格式化)\n';
            }
        });
        return content;
    }

    function preview() {
        var el = document.getElementById('pe-preview-area');
        if (!el) return;
        if (selectedModules.length === 0) {
            showToast('请先选择要预览的模块', 'error');
            return;
        }
        el.style.display = 'block';
        var content = generateContent();
        el.style.fontSize = config.fontSize + 'px';
        el.textContent = content.substring(0, 5000) + (content.length > 5000 ? '\n\n... (预览截断)' : '');
    }

    function doExport() {
        if (selectedModules.length === 0) { showToast('请先选择要导出的模块', 'error'); return; }
        var content = generateContent();
        if (config.format === 'print') {
            var win = window.open('', '_blank');
            win.document.write('<html><head><title>小说数据导出</title><style>body{font-family:sans-serif;padding:20px;line-height:1.8;font-size:' + config.fontSize + 'px;} pre{white-space:pre-wrap;}</style></head><body><pre>' + content.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</pre></body></html>');
            win.document.close();
            setTimeout(function() { win.print(); }, 300);
        } else {
            var ext = config.format === 'md' ? 'md' : config.format === 'html' ? 'html' : 'txt';
            var blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            var now = new Date();
            var ts = now.getFullYear().toString().slice(-2) + '-' +
                     String(now.getMonth()+1).padStart(2,'0') + '-' +
                     String(now.getDate()).padStart(2,'0') + '_' +
                     String(now.getHours()).padStart(2,'0') + '-' +
                     String(now.getMinutes()).padStart(2,'0');
            a.href = url; a.download = '小说数据导出_' + ts + '.' + ext;
            a.click(); URL.revokeObjectURL(url);
            showToast('导出成功', 'success');
        }
    }

    function previewRenderer() { return '<p>打印/PDF导出模块</p>'; }
    function exportFormatter() { return ''; }
    function searchIndexer() { return []; }

    window.PrintExportModule = { loadData: loadData, refreshView: refreshView, toggleModule: toggleModule, selectAll: selectAll, selectNone: selectNone, selectFormat: selectFormat, updateConfig: updateConfig, preview: preview, doExport: doExport };
    ModuleRegistry.register({
        id: 'print_export', name: '打印导出', icon: 'print', group: 'tools', order: 6, hidden: true,
        dataKeys: ['print_config'],
        previewRenderer: previewRenderer, exportFormatter: exportFormatter, searchIndexer: searchIndexer,
        pageRenderer: renderPage,
        onPageShow: function() { loadData().then(function() { refreshView(); }); }
    });
    console.log('[PrintExport] 打印导出模块已注册');
})();
