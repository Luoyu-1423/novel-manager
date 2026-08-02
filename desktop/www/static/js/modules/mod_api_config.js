// ============================================================
// 模块: API 配置 (mod_api_config.js)
// 版本: 3.2.0
// 功能: 配置 LLM 审查所用的 API（OpenAI 兼容协议）
//       支持 DeepSeek / 智谱 / Kimi / OpenAI / Ollama 等
// 字段: {api_url, api_key, model, system_prompt, temperature, max_tokens}
// ============================================================

(function() {
    'use strict';

    const style = document.createElement('style');
    style.textContent = `
        .api-config-form { display: flex; flex-direction: column; gap: 14px; max-width: 720px; }
        .api-config-form label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 4px; color: var(--text-color, #111); }
        .api-config-form .modal-input, .api-config-form input[type="text"], .api-config-form input[type="number"], .api-config-form textarea, .api-config-form select { width: 100%; padding: 8px 12px; border: 1px solid var(--border-color, #e5e7eb); border-radius: 6px; font-size: 14px; background: var(--bg-color, #fff); color: var(--text-color, #111); box-sizing: border-box; }
        .api-config-form textarea { font-family: "Microsoft YaHei", monospace; resize: vertical; }
        .api-presets { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
        .api-preset-btn { padding: 5px 12px; border: 1px solid var(--border-color, #e5e7eb); border-radius: 4px; background: var(--card-bg, #fff); cursor: pointer; font-size: 12px; transition: all 0.15s; }
        .api-preset-btn:hover { background: var(--primary-color, #6366f1); color: #fff; border-color: var(--primary-color); }
        .api-test-result { padding: 10px 12px; border-radius: 6px; font-size: 13px; margin-top: 8px; white-space: pre-wrap; word-break: break-word; max-height: 200px; overflow-y: auto; }
        .api-test-result.ok { background: rgba(16, 185, 129, 0.12); color: #047857; border: 1px solid #10b981; }
        .api-test-result.err { background: rgba(220, 38, 38, 0.12); color: #991b1b; border: 1px solid #dc2626; }
        .api-test-result.info { background: rgba(59, 130, 246, 0.12); color: #1e40af; border: 1px solid #3b82f6; }
        .api-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
        .api-hint { font-size: 12px; color: var(--text-secondary, #6b7280); line-height: 1.6; }
    `;
    document.head.appendChild(style);

    let config = {
        api_url: '', api_key: '', model: '',
        system_prompt: '', temperature: 0.3, max_tokens: 4096
    };

    // 预设服务方
    const PRESETS = [
        { name: 'DeepSeek', api_url: 'https://api.deepseek.com/v1/chat/completions', model: 'deepseek-chat' },
        { name: '智谱 GLM', api_url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions', model: 'glm-4' },
        { name: 'Kimi (Moonshot)', api_url: 'https://api.moonshot.cn/v1/chat/completions', model: 'moonshot-v1-8k' },
        { name: 'OpenAI', api_url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' },
        { name: 'Ollama 本地', api_url: 'http://localhost:11434/v1/chat/completions', model: 'qwen2.5:7b' }
    ];

    async function loadData() {
        try {
            const saved = await apiRequest('/api/mod/api_config') || {};
            config = { ...config, ...saved };
        } catch(e) { /* 用默认 */ }
        renderForm();
    }

    function renderPage() {
        let html = '<section class="card">';
        html += '<div class="card-header"><h2>⚙️ API 配置</h2></div>';
        html += '<div class="api-config-form" id="api-config-form"></div>';
        html += '</section>';
        return html;
    }

    function renderForm() {
        const el = document.getElementById('api-config-form');
        if (!el) return;
        let presetHtml = '<div class="api-presets"><span style="font-size:12px;color:var(--text-secondary,#6b7280);align-self:center;margin-right:4px;">快速预设:</span>';
        PRESETS.forEach((p, i) => {
            presetHtml += `<button class="api-preset-btn" onclick="ApiConfigModule.applyPreset(${i})">${p.name}</button>`;
        });
        presetHtml += '</div>';

        el.innerHTML = `
            ${presetHtml}
            <div>
                <label>API URL</label>
                <input type="text" id="ac-url" value="${escapeHtml(config.api_url)}" placeholder="https://api.deepseek.com/v1/chat/completions">
                <div class="api-hint">OpenAI 兼容的 chat/completions 接口地址</div>
            </div>
            <div>
                <label>API Key</label>
                <input type="text" id="ac-key" value="${escapeHtml(config.api_key)}" placeholder="sk-...">
                <div class="api-hint">本地存储，仅本机使用；Ollama 等本地服务可留空</div>
            </div>
            <div>
                <label>Model</label>
                <input type="text" id="ac-model" value="${escapeHtml(config.model)}" placeholder="deepseek-chat / glm-4 / gpt-4o-mini">
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div>
                    <label>Temperature</label>
                    <input type="number" id="ac-temp" step="0.1" min="0" max="2" value="${config.temperature}">
                </div>
                <div>
                    <label>Max Tokens</label>
                    <input type="number" id="ac-max" step="64" min="256" value="${config.max_tokens}">
                </div>
            </div>
            <div>
                <label>System Prompt（留空使用内置默认）</label>
                <textarea id="ac-sys" rows="6" placeholder="你是一位严谨的中文小说编辑...">${escapeHtml(config.system_prompt)}</textarea>
            </div>
            <div class="api-actions">
                <button class="btn-primary" onclick="ApiConfigModule.save()">💾 保存配置</button>
                <button class="btn-secondary" onclick="ApiConfigModule.test()">🔌 测试连接</button>
                <button class="btn-secondary" onclick="ApiConfigModule.resetSysPrompt()">↺ 重置默认 Prompt</button>
            </div>
            <div id="api-test-result"></div>
        `;
    }

    function readForm() {
        return {
            api_url: (document.getElementById('ac-url').value || '').trim(),
            api_key: (document.getElementById('ac-key').value || '').trim(),
            model: (document.getElementById('ac-model').value || '').trim(),
            system_prompt: document.getElementById('ac-sys').value,
            temperature: parseFloat(document.getElementById('ac-temp').value) || 0.3,
            max_tokens: parseInt(document.getElementById('ac-max').value) || 4096
        };
    }

    async function save() {
        const cfg = readForm();
        // 写入内存 + 持久化
        config = cfg;
        try {
            await apiRequest('/api/mod/api_config/save', 'POST', cfg);
            showToast('配置已保存', 'success');
        } catch(e) {
            showToast('保存失败: ' + e.message, 'error');
        }
    }

    function applyPreset(i) {
        const p = PRESETS[i];
        const url = document.getElementById('ac-url');
        const model = document.getElementById('ac-model');
        if (url) url.value = p.api_url;
        if (model) model.value = p.model;
        showToast(`已套用 ${p.name} 预设（记得填写 API Key 并保存）`, 'success');
    }

    function resetSysPrompt() {
        const ta = document.getElementById('ac-sys');
        if (ta) ta.value = '';
        showToast('已清空，将使用内置默认 System Prompt', 'success');
    }

    async function test() {
        const cfg = readForm();
        if (!cfg.api_url) { showTestResult('err', '请先填写 API URL'); return; }
        showTestResult('info', '正在测试连接...');
        try {
            const sys = cfg.system_prompt && cfg.system_prompt.trim()
                ? cfg.system_prompt : '你好，请回复"OK"。';
            const body = {
                model: cfg.model || '',
                messages: [
                    { role: 'system', content: sys },
                    { role: 'user', content: '请仅回复：OK' }
                ],
                temperature: cfg.temperature,
                max_tokens: 64,
                stream: false
            };
            const headers = { 'Content-Type': 'application/json' };
            if (cfg.api_key) headers['Authorization'] = 'Bearer ' + cfg.api_key;
            const t0 = Date.now();
            const resp = await fetch(cfg.api_url, {
                method: 'POST', headers, body: JSON.stringify(body)
            });
            const dt = Date.now() - t0;
            const txt = await resp.text().catch(() => '');
            if (!resp.ok) {
                showTestResult('err', `连接失败 HTTP ${resp.status} ${resp.statusText}\n响应: ${txt.slice(0, 400)}`);
                return;
            }
            let data;
            try { data = JSON.parse(txt); } catch(_) { data = null; }
            // 解析回复
            let reply = '';
            if (data && data.choices && data.choices[0] && data.choices[0].message) {
                reply = data.choices[0].message.content || '';
            } else if (typeof data === 'string') {
                reply = data;
            }
            showTestResult('ok', `✅ 连接成功（耗时 ${dt}ms）\n模型回复: ${reply.slice(0, 200) || '(空)'}\n\n建议：测试无误后点击「保存配置」。`);
        } catch(e) {
            showTestResult('err', '测试出错: ' + e.message + '\n\n常见原因：\n- CORS 跨域限制（部分服务方需通过本地代理）\n- API URL 错误\n- 网络不通');
        }
    }

    function showTestResult(type, msg) {
        const el = document.getElementById('api-test-result');
        if (!el) return;
        el.className = 'api-test-result ' + type;
        el.textContent = msg;
    }

    function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }

    // 暴露给审查模块读取
    window.ApiConfigModule = {
        loadData, save, test, applyPreset, resetSysPrompt,
        getConfig: () => config
    };

    ModuleRegistry.register({
        id: 'api_config',
        name: 'API 配置',
        icon: 'settings',
        group: 'system',
        order: 4,
        dataKeys: ['api_config'],
        pageRenderer: renderPage,
        onPageShow: () => { loadData(); }
    });

    console.log('[ApiConfig] API 配置模块已注册');
})();
