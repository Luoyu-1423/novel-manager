// preload.js - 预加载脚本
const { contextBridge, ipcRenderer } = require('electron');

// 暴露一个标识，让前端知道运行在 Electron 环境
contextBridge.exposeInMainWorld('electronAPI', {
    platform: process.platform,
    isElectron: true,
    // 保存文件（原生对话框）
    saveFile: (content, filename) => ipcRenderer.invoke('save-file', content, filename),
    // 打开文件所在文件夹
    openFolder: (filePath) => ipcRenderer.invoke('open-folder', filePath)
});
