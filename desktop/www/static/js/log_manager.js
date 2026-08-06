// ============================================================
// 运行日志 + 崩溃日志系统 (log_manager.js)
// 必须在所有业务脚本之前加载，尽可能早地捕获错误
// 功能:
//   1. 拦截 console.* / window.onerror / unhandledrejection 自动记录
//   2. localStorage 环形存储（运行日志 + 崩溃日志），重启不丢失
//   3. 日志查看弹窗（工具页"运行日志"入口）
//   4. 导出日志文件（浏览器下载 / Tauri 原生保存）
//   5. Tauri 桌面版：同步写盘到程序目录 logs/（自动生成日志文件）
// ============================================================
(function() {
    'use strict';

    var STORAGE_LOG_KEY = 'app_runtime_logs';   // 运行日志
    var STORAGE_CRASH_KEY = 'app_crash_logs';   // 崩溃日志
    var MAX_LOG = 500;    // 运行日志上限条数
    var MAX_CRASH = 100;  // 崩溃日志上限条数

    // Tauri 环境检测（withGlobalTauri: true 时 window.__TAURI__ 可用）
    function isTauri() {
        return !!(window.__TAURI__ && (window.__TAURI__.core || window.__TAURI__.invoke));
    }

    function tauriInvoke(cmd, args) {
        try {
            var tauri = window.__TAURI__;
            var invoke = (tauri.core && tauri.core.invoke) || tauri.invoke;
            if (!invoke) return Promise.resolve(null);
            return Promise.resolve(invoke(cmd, args || {})).catch(function() {});
        } catch (e) {
            return Promise.resolve(null);
        }
    }

    // ---------- 工具 ----------
    function pad2(n) { return n < 10 ? '0' + n : '' + n; }

    function formatTime(ts) {
        var d = ts ? new Date(ts) : new Date();
        return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) +
            ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds()) +
            '.' + (d.getMilliseconds() < 100 ? '0' : '') + (d.getMilliseconds() < 10 ? '0' : '') + d.getMilliseconds();
    }

    function serializeValue(v, maxLen) {
        if (v === undefined) return 'undefined';
        if (v === null) return 'null';
        var str;
        if (typeof v === 'string') {
            str = v;
        } else if (v instanceof Error) {
            str = v.message + (v.stack ? ' | ' + v.stack : '');
        } else if (v instanceof Event) {
            str = v.type || 'Event';
        } else {
            try { str = JSON.stringify(v); } catch (e) { str = String(v); }
        }
        var limit = maxLen || 2000;
        if (str && str.length > limit) str = str.substring(0, limit) + '…(截断)';
        return str;
    }

    function readStorage(key) {
        try {
            var raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function writeStorage(key, list) {
        try {
            localStorage.setItem(key, JSON.stringify(list));
        } catch (e) {
            // localStorage 满或不可用：降级为内存存储
        }
    }

    function pushLog(key, max, entry) {
        var list = readStorage(key);
        list.push(entry);
        if (list.length > max) list = list.slice(list.length - max);
        writeStorage(key, list);
    }

    // ---------- 磁盘写盘队列（仅 Tauri 环境使用，防抖批量写入） ----------
    var diskQueue = [];
    var diskTimer = null;

    function flushDisk() {
        if (diskTimer) { clearTimeout(diskTimer); diskTimer = null; }
        if (!isTauri() || diskQueue.length === 0) return;
        var batch = diskQueue.join('\n');
        diskQueue = [];
        tauriInvoke('write_log', { content: batch });
    }

    function scheduleFlush() {
        if (!isTauri()) return;
        if (diskTimer) clearTimeout(diskTimer);
        diskTimer = setTimeout(flushDisk, 300);
    }

    // ---------- 核心 ----------
    var LogManager = {
        version: '1.0.0',

        /** 记录一条日志（level: debug/info/warn/error） */
        log: function(level, message, data) {
            try {
                var entry = {
                    t: Date.now(),
                    ts: formatTime(),
                    level: level || 'info',
                    msg: serializeValue(message, 4000),
                    data: data === undefined ? null : serializeValue(data, 1000)
                };
                pushLog(STORAGE_LOG_KEY, MAX_LOG, entry);
                if (level === 'error' || level === 'warn') {
                    pushLog(STORAGE_CRASH_KEY, MAX_CRASH, entry);
                }
                if (isTauri()) {
                    diskQueue.push('[' + entry.ts + '] [' + (level || 'info').toUpperCase() + '] ' + entry.msg + (entry.data ? ' | ' + entry.data : ''));
                    scheduleFlush();
                }
            } catch (e) { /* 日志系统自身异常时静默 */ }
        },

        debug: function(msg, data) { this.log('debug', msg, data); },
        info: function(msg, data) { this.log('info', msg, data); },
        warn: function(msg, data) { this.log('warn', msg, data); },
        error: function(msg, data) { this.log('error', msg, data); },

        /** 记录崩溃（带堆栈） */
        crash: function(type, message, stack) {
            try {
                var entry = {
                    t: Date.now(),
                    ts: formatTime(),
                    level: 'error',
                    type: type || 'unknown',
                    msg: serializeValue(message, 4000),
                    stack: serializeValue(stack, 4000)
                };
                pushLog(STORAGE_CRASH_KEY, MAX_CRASH, entry);
                if (isTauri()) {
                    diskQueue.push('[CRASH] [' + entry.ts + '] [' + entry.type + '] ' + entry.msg + (entry.stack ? ' | ' + entry.stack : ''));
                    flushDisk(); // 崩溃立即写盘
                }
            } catch (e) { /* 静默 */ }
        },

        /** 获取运行日志 */
        getLogs: function() { return readStorage(STORAGE_LOG_KEY); },

        /** 获取崩溃日志 */
        getCrashLogs: function() { return readStorage(STORAGE_CRASH_KEY); },

        /** 清空日志 */
        clearLogs: function() {
            try {
                localStorage.removeItem(STORAGE_LOG_KEY);
                localStorage.removeItem(STORAGE_CRASH_KEY);
            } catch (e) {}
        },

        /** 拼接完整日志文本（用于导出） */
        formatLogText: function() {
            var lines = [];
            lines.push('==============================================');
            lines.push('创作工坊 (NovelForge) 运行日志');
            lines.push('导出时间: ' + formatTime());
            lines.push('版本: ' + (window.__APP_VERSION__ || '1.0.0-dev'));
            lines.push('环境: ' + (isTauri() ? 'Tauri 桌面版' : '浏览器'));
            lines.push('UserAgent: ' + (navigator.userAgent || ''));
            lines.push('主题: ' + (document.body ? document.body.getAttribute('data-theme') : '') || 'default');
            lines.push('==============================================');
            lines.push('');
            var logs = readStorage(STORAGE_LOG_KEY);
            if (logs.length === 0) {
                lines.push('（暂无运行日志）');
            }
            logs.forEach(function(e) {
                lines.push('[' + (e.ts || formatTime(e.t)) + '] [' + (e.level || 'info').toUpperCase() + '] ' + e.msg + (e.data ? ' | ' + e.data : ''));
            });
            lines.push('');
            lines.push('---------------- 崩溃日志 ----------------');
            var crashes = readStorage(STORAGE_CRASH_KEY);
            if (crashes.length === 0) {
                lines.push('（暂无崩溃日志）');
            }
            crashes.forEach(function(e) {
                lines.push('[' + (e.ts || formatTime(e.t)) + '] [' + (e.type || e.level || 'error').toUpperCase() + '] ' + e.msg + (e.stack ? ' | ' + e.stack : ''));
            });
            lines.push('');
            lines.push('============ 日志结束 ============');
            return lines.join('\n');
        },

        /** 导出日志文件 */
        exportLog: function() {
            var text = this.formatLogText();
            var filename = 'novel_manager_log_' + formatTime().replace(/[-: ]/g, '').replace('.', '') + '.log';
            if (window.electronAPI && window.electronAPI.saveFile) {
                // Tauri 原生保存对话框
                window.electronAPI.saveFile(text, filename).then(function(result) {
                    if (result && result.success) {
                        if (typeof showToast === 'function') showToast('日志已导出: ' + result.path, 'success');
                    } else if (result && result.message) {
                        if (typeof showToast === 'function') showToast(result.message, 'error');
                    }
                });
                return;
            }
            // 浏览器下载
            try {
                var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
                var a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                setTimeout(function() {
                    URL.revokeObjectURL(a.href);
                    a.remove();
                }, 2000);
                if (typeof showToast === 'function') showToast('日志已导出: ' + filename, 'success');
            } catch (e) {
                if (typeof showToast === 'function') showToast('导出日志失败', 'error');
            }
        },

        /** 记录一次应用启动 */
        markStartup: function() {
            var ua = navigator.userAgent || '';
            this.info('应用启动 (' + (isTauri() ? 'Tauri 桌面版' : '浏览器') + ')，主题=' + ((document.body && document.body.getAttribute('data-theme')) || 'default') + '，UA=' + ua.substring(0, 120));
            if (isTauri()) {
                tauriInvoke('write_log', { content: '\n=== 应用启动 ' + formatTime() + ' ===' });
            }
        }
    };

    // ============ 全局自动捕获 ============

    // 1. console 拦截
    (function() {
        var methods = ['log', 'info', 'warn', 'error', 'debug'];
        methods.forEach(function(m) {
            var orig = console[m];
            console[m] = function() {
                try {
                    var args = Array.prototype.slice.call(arguments);
                    var msg = args.map(function(a) {
                        if (typeof a === 'string') return a;
                        if (a instanceof Error) return a.message;
                        if (typeof a === 'object' && a !== null) {
                            try { return JSON.stringify(a); } catch (e) { return String(a); }
                        }
                        return String(a);
                    }).join(' ');
                    if (msg && msg.length > 2000) msg = msg.substring(0, 2000) + '…(截断)';
                    var level = m === 'log' ? 'info' : m;
                    if (level === 'debug') level = 'debug';
                    LogManager.log(level, msg, null);
                } catch (e) { /* 静默 */ }
                try {
                    orig.apply(console, arguments);
                } catch (e) { /* 静默 */ }
            };
        });
    })();

    // 2. 未捕获 JS 异常（运行时崩溃）
    window.addEventListener('error', function(event) {
        var err = event.error || null;
        LogManager.crash('runtime_error',
            (event.message || '未知错误') + (event.filename ? ' (' + event.filename + ':' + event.lineno + ':' + event.colno + ')' : ''),
            err && err.stack ? err.stack : null);
    });

    // 3. 未处理的 Promise 拒绝
    window.addEventListener('unhandledrejection', function(event) {
        var reason = event.reason;
        var msg = '未处理的 Promise 拒绝';
        var stack = null;
        if (reason instanceof Error) {
            msg = '未处理的 Promise 拒绝: ' + reason.message;
            stack = reason.stack;
        } else if (reason !== undefined && reason !== null) {
            msg = '未处理的 Promise 拒绝: ' + serializeValue(reason, 500);
        }
        LogManager.crash('unhandledrejection', msg, stack);
    });

    // ============ 暴露 ============
    window.LogManager = LogManager;

    // 记录启动（此时 body 可能未就绪，主题读取放在 DOMContentLoaded 后）
    document.addEventListener('DOMContentLoaded', function() {
        LogManager.markStartup();
    });
})();

// ============ 日志查看弹窗（工具页"运行日志"入口） ============
// 依赖全局 showModal/closeModal（app.js，页面加载完成后必然存在）

function logViewerEscape(s) {
    s = s === undefined || s === null ? '' : String(s);
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderLogEntryHtml(e) {
    var level = e.level || 'info';
    var color = level === 'error' ? '#ef4444' : level === 'warn' ? '#f59e0b' : level === 'debug' ? '#8b5cf6' : 'var(--text-secondary)';
    var type = e.type || level;
    var msg = logViewerEscape(e.msg);
    var extra = '';
    if (e.stack) {
        extra = '<div style="font-size:11px;color:var(--text-secondary);margin-top:4px;white-space:pre-wrap;word-break:break-all;">' + logViewerEscape(e.stack) + '</div>';
    } else if (e.data) {
        extra = '<div style="font-size:11px;color:var(--text-secondary);margin-top:4px;white-space:pre-wrap;word-break:break-all;">' + logViewerEscape(e.data) + '</div>';
    }
    return '<div style="padding:6px 10px;border-bottom:1px solid var(--border-color);font-size:12px;line-height:1.5;">' +
        '<span style="color:var(--text-secondary);font-size:11px;">' + logViewerEscape(e.ts || '') + '</span> ' +
        '<span style="color:' + color + ';font-weight:600;font-size:11px;">[' + logViewerEscape(String(type).toUpperCase()) + ']</span> ' +
        '<span style="color:var(--text-primary);word-break:break-all;">' + msg + '</span>' + extra + '</div>';
}

function logViewerListHtml(tab) {
    var list = tab === 'crash' ? window.LogManager.getCrashLogs() : window.LogManager.getLogs();
    if (!list || list.length === 0) {
        return '<div style="padding:24px;text-align:center;color:var(--text-secondary);font-size:13px;">' +
            (tab === 'crash' ? '暂无崩溃日志' : '暂无运行日志') + '</div>';
    }
    return list.map(renderLogEntryHtml).join('');
}

window.showLogViewer = function() {
    var logs = window.LogManager.getLogs();
    var crashes = window.LogManager.getCrashLogs();

    var content = '' +
        '<div style="display:flex;gap:8px;margin-bottom:10px;align-items:center;flex-wrap:wrap;">' +
            '<button class="btn-small" onclick="logViewerSwitch(\'run\')">运行日志 (' + logs.length + ')</button>' +
            '<button class="btn-small" onclick="logViewerSwitch(\'crash\')">崩溃日志 (' + crashes.length + ')</button>' +
            '<div style="flex:1;"></div>' +
            '<button class="btn-small" onclick="window.LogManager.exportLog()">导出日志文件</button>' +
            '<button class="btn-small btn-danger" onclick="logViewerClear()">清空日志</button>' +
        '</div>' +
        '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px;">' +
            (crashes.length > 0
                ? '<span style="color:#ef4444;">检测到 ' + crashes.length + ' 条错误/崩溃记录</span>，点击"导出日志文件"生成日志，方便定位问题。'
                : '运行正常，暂无错误记录。') +
        '</div>' +
        '<div id="log-viewer-list" style="max-height:380px;overflow-y:auto;border:1px solid var(--border-color);border-radius:8px;background:var(--card-bg);">' +
            logViewerListHtml('run') +
        '</div>';

    showModal('运行日志', content, [
        { text: '关闭', class: 'btn-secondary', action: closeModal }
    ]);
};

window.logViewerSwitch = function(tab) {
    var box = document.getElementById('log-viewer-list');
    if (!box) return;
    box.innerHTML = logViewerListHtml(tab);
};

window.logViewerClear = function() {
    if (confirm('确定清空全部运行日志和崩溃日志吗？')) {
        window.LogManager.clearLogs();
        window.LogManager.info('日志已手动清空');
        window.showLogViewer();
    }
};
