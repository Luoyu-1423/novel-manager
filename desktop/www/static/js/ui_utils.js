// ============================================================
// UIUtils - 全局 UI 公共工具函数层
// 版本: 3.2.0
// 用途: 抽离各模块重复实现的工具函数（escapeHtml/复制/空状态/chips等）
// 使用: 所有函数同时挂到 window 顶层（escapeHtml/copyText/...）和
//       window.UIUtils 命名空间，兼容新旧调用方式。
// 注意: 现有模块内部的同名局部函数优先，不受影响；新代码应优先使用本层。
// ============================================================
(function () {
    'use strict';

    // ==================== 工具函数 ====================

    /**
     * HTML 转义（防止 XSS / 内容注入）
     */
    function escapeHtml(s) {
        if (s === null || s === undefined) return '';
        const d = document.createElement('div');
        d.textContent = String(s);
        return d.innerHTML;
    }

    /**
     * 复制文本到剪贴板（优先 navigator.clipboard，回退 execCommand）
     * @param {string} text 要复制的文本
     * @param {string} [successMsg] 成功提示文案，默认 '已复制'
     * @returns {Promise<boolean>}
     */
    function copyText(text, successMsg) {
        const done = () => {
            if (typeof window.showToast === 'function') {
                window.showToast(successMsg || '已复制', 'success');
            }
        };
        const fallback = () => {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); } catch (_) {}
            document.body.removeChild(ta);
            done();
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text)
                .then(done)
                .catch(() => { fallback(); return true; });
        }
        fallback();
        return Promise.resolve(true);
    }

    /**
     * 空状态 HTML（grid 内居中）
     * @param {string} msg 提示文案
     * @param {string} [icon] emoji 图标
     */
    function emptyState(msg, icon) {
        return `<div class="empty-state"><div class="empty-icon">${icon || '📭'}</div><p>${msg || '暂无数据'}</p></div>`;
    }

    /**
     * 字数统计（去掉空白符）
     */
    function countWords(text) {
        return (text || '').replace(/\s+/g, '').length;
    }

    /**
     * 生成 filter chips 渲染 HTML
     * @param {Array<{id:string,label:string,icon?:string,count?:number|string,onClick?:string,active?:boolean}>} items chips 数据（active 提供时优先于 activeId 判断）
     * @param {string|Array} activeId 当前激活的 id（'' 表示"全部"）；传数组时按包含关系判断
     * @param {string} chipClass chips 的 CSS 类名
     * @param {string} onClickExpr 点击时的 JS 表达式模板，占位符 {id}（若 item.onClick 提供则优先）
     * @example renderChips([{id:'',label:'全部'},{id:'a',label:'A'}], 'a', 'my-chip', "MyModule.setFilter('{id}')")
     */
    function renderChips(items, activeId, chipClass, onClickExpr) {
        const activeSet = Array.isArray(activeId) ? new Set(activeId) : null;
        return (items || []).map(it => {
            let isActive;
            if (it.active !== undefined) isActive = !!it.active;
            else if (activeSet) isActive = activeSet.has(it.id);
            else isActive = it.id === activeId;
            const active = isActive ? ' active' : '';
            const safeId = String(it.id).replace(/'/g, "\\'");
            const onClick = (it.onClick || onClickExpr || '').replace(/\{id\}/g, safeId);
            let label = escapeHtml(it.label);
            if (it.icon) {
                const iconHtml = (typeof SvgIconLib !== 'undefined' && SvgIconLib.renderAuto)
                    ? SvgIconLib.renderAuto(it.icon, 12)
                    : escapeHtml(it.icon);
                label = iconHtml + ' ' + label;
            }
            if (it.count !== undefined) label += ' (' + it.count + ')';
            return `<button type="button" class="${chipClass || 'chip'}${active}" data-id="${escapeHtml(it.id)}" ${onClick ? `onclick="${onClick}"` : ''}>${label}</button>`;
        }).join('');
    }

    /**
     * 确认删除流程（confirm 后执行回调）
     * @param {string} msg 确认文案
     * @param {Function} onConfirm 确认后的回调（可 async）
     */
    function confirmDelete(msg, onConfirm) {
        if (!confirm(msg || '确定删除吗？')) return;
        const r = onConfirm && onConfirm();
        if (r && typeof r.catch === 'function') r.catch(e => console.error('[UIUtils] confirmDelete 回调失败:', e));
    }

    /**
     * 获取所有可用的模块列表（按组排序）
     * @returns {Array} 模块对象数组
     */
    function getAllModulesList() {
        if (typeof ModuleRegistry === 'undefined' || !ModuleRegistry.getAllModules) return [];
        return Object.values(ModuleRegistry.getAllModules())
            .sort((a, b) => (a.order || 50) - (b.order || 50));
    }

    /**
     * 渲染标准卡片页面骨架（card + header + 按钮组 + 主体内容）
     * @param {string} title 标题（可含 SVG 图标 HTML）
     * @param {string} actionsHtml 头部右侧按钮 HTML
     * @param {string} bodyHtml 卡片主体内容 HTML（toolbar/grid/列表等，平铺在 card 内）
     * @returns {string} HTML
     */
    function renderCardPage(title, actionsHtml, bodyHtml) {
        return `
            <section class="card">
                <div class="card-header">
                    <h2>${title}</h2>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">${actionsHtml || ''}</div>
                </div>
                ${bodyHtml || ''}
            </section>
        `;
    }

    // ==================== 暴露 ====================

    window.UIUtils = {
        escapeHtml,
        copyText,
        emptyState,
        countWords,
        renderChips,
        confirmDelete,
        getAllModulesList,
        renderCardPage
    };

    // 兼容：直接挂到 window 顶层，便于旧式内联调用
    window.escapeHtml = escapeHtml;
    window.copyTextToClipboard = copyText;
    window.emptyStateHTML = emptyState;
    window.countWords = countWords;

    console.log('[UIUtils] 全局 UI 工具层就绪');
})();
