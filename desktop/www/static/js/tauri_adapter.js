/**
 * Tauri 适配器 - 在 Tauri 环境下提供兼容 Electron 的 API
 * 必须在所有其他脚本之前加载
 */
(function() {
    // 检测 Tauri 环境 (withGlobalTauri: true 时注入)
    var tauri = window.__TAURI__;
    if (!tauri) return;

    // 获取 invoke 函数
    var invoke = (tauri.core && tauri.core.invoke) || tauri.invoke;
    if (!invoke) {
        console.warn('[Tauri Adapter] invoke function not found');
        return;
    }

    console.log('[Tauri Adapter] Tauri environment detected, setting up compatibility layer');

    // 暴露兼容 API
    window.electronAPI = {
        isElectron: true,
        platform: 'win32',

        // 保存文件（原生对话框）
        saveFile: function(content, filename) {
            return invoke('save_file', { content: content, filename: filename });
        },

        // 打开文件所在文件夹
        openFolder: function(filePath) {
            return invoke('open_folder', { filePath: filePath });
        }
    };
})();
