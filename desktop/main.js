const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        title: '小说数据管理器 v3.1.0',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        },
        backgroundColor: '#f5f0e8',
        show: true
    });

    mainWindow.loadFile(path.join(__dirname, 'www', 'index.html'));

    const menuTemplate = [
        {
            label: '文件',
            submenu: [
                {
                    label: '退出',
                    accelerator: 'CmdOrCtrl+Q',
                    click: () => app.quit()
                }
            ]
        },
        {
            label: '视图',
            submenu: [
                { role: 'reload', label: '刷新' },
                { role: 'toggleDevTools', label: '开发者工具' },
                { type: 'separator' },
                { role: 'zoomIn', label: '放大' },
                { role: 'zoomOut', label: '缩小' },
                { role: 'resetZoom', label: '重置缩放' }
            ]
        },
        {
            label: '帮助',
            submenu: [
                {
                    label: '关于',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: '关于',
                            message: '小说数据管理器 v3.1.0',
                            detail: '一个独立的小说创作数据管理工具\n支持角色、技能、物品、任务、剧情等多种数据管理\n\n所有数据保存在本地，无需网络连接'
                        });
                    }
                }
            ]
        }
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));

    // IPC: 保存文件（原生对话框）
    ipcMain.handle('save-file', async (event, content, filename) => {
        try {
            const result = await dialog.showSaveDialog(mainWindow, {
                title: '导出文件',
                defaultPath: filename,
                filters: [
                    { name: '文本文件', extensions: ['txt'] },
                    { name: '所有文件', extensions: ['*'] }
                ]
            });
            
            if (result.canceled || !result.filePath) {
                return { success: false, message: '用户取消保存' };
            }
            
            fs.writeFileSync(result.filePath, content, 'utf-8');
            return { success: true, path: result.filePath };
        } catch (err) {
            return { success: false, message: err.message };
        }
    });

    // IPC: 打开文件所在文件夹
    ipcMain.handle('open-folder', async (event, filePath) => {
        try {
            if (filePath && fs.existsSync(filePath)) {
                shell.showItemInFolder(filePath);
                return { success: true };
            }
            return { success: false, message: '文件不存在' };
        } catch (err) {
            return { success: false, message: err.message };
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    app.quit();
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
