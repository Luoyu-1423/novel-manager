// ============================================================
// 简易开发测试服务器 (dev_server.js)
// 用途: 零构建测试 desktop/www 前端（无需启动 Electron/Tauri）
// 用法: 在 desktop 目录执行  node dev_server.js
// 然后浏览器打开 http://localhost:8000
// 按 Ctrl+C 停止
// ============================================================
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, 'www');
const PORT = process.env.PORT || 8000;

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js':   'application/javascript; charset=utf-8',
    '.mjs':  'application/javascript; charset=utf-8',
    '.css':  'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif':  'image/gif',
    '.svg':  'image/svg+xml',
    '.ico':  'image/x-icon',
    '.woff': 'font/woff',
    '.woff2':'font/woff2',
    '.map':  'application/json',
    '.txt':  'text/plain; charset=utf-8'
};

const server = http.createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath === '/') urlPath = '/index.html';

    let filePath = path.join(ROOT, urlPath);
    // 防止目录穿越
    if (!filePath.startsWith(ROOT)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            // 回退到 index.html（便于 SPA 风格路由）
            fs.readFile(path.join(ROOT, 'index.html'), (e2, idx) => {
                if (e2) {
                    res.writeHead(404);
                    res.end('Not Found: ' + urlPath);
                    return;
                }
                res.writeHead(200, {
                    'Content-Type': 'text/html; charset=utf-8',
                    'Cache-Control': 'no-cache, no-store, must-revalidate'
                });
                res.end(idx);
            });
            return;
        }
        const ext = path.extname(filePath).toLowerCase();
        const mime = MIME[ext] || 'application/octet-stream';
        res.writeHead(200, {
            'Content-Type': mime,
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log('');
    console.log('============================================================');
    console.log('  小说数据管理器 - 开发测试服务器');
    console.log('============================================================');
    console.log('  地址:  http://localhost:' + PORT);
    console.log('  目录:  ' + ROOT);
    console.log('  按 Ctrl+C 停止');
    console.log('');
    console.log('  提示: 数据保存在浏览器 localStorage 中，');
    console.log('        清除浏览器缓存会丢失测试数据。');
    console.log('============================================================');
    console.log('');
});
