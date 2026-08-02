/**
 * SVG 通用图标库 v1.0
 * 用法:
 *   renderSvgIcon('sword', 24)           → 返回 SVG HTML 字符串
 *   renderSvgIcon('sword', 24, '#dc2626') → 带颜色
 *   renderSvgIcon('unknown_key')          → 返回 null（调用方可 fallback 到 emoji）
 *   getSvgIconKeys()                      → 返回所有可用图标 key 数组
 *   getSvgIconCategories()                → 返回分类结构
 *   isSvgIcon(key)                        → 判断是否是已注册的 SVG 图标
 *
 * 数据兼容:
 *   - 物品 icon 字段存 emoji 字符串 → 正常显示 emoji
 *   - 物品 icon 字段存 SVG key（如 'sword'） → 自动渲染 SVG
 *   - 未设置 icon → 使用默认图标 'box'
 */

var SvgIconLib = (function() {
    'use strict';

    // 24x24 viewBox, 通用 stroke 风格
    var S = 'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"';
    var SF = 'fill="currentColor" stroke="none"'; // fill-only

    var icons = {
        // ==================== 武器 ====================
        sword:       '<svg viewBox="0 0 24 24" '+S+'><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M16 16l4 4"/><path d="M19 21l2-2"/></svg>',
        greatsword:  '<svg viewBox="0 0 24 24" '+S+'><path d="M12 2L8 6v8l4 4 4-4V6z"/><path d="M8 14H5l-2 2 3 3h4"/><path d="M16 14h3l2 2-3 3h-4"/><path d="M12 18v4"/></svg>',
        dagger:      '<svg viewBox="0 0 24 24" '+S+'><path d="M14 4l6 6-10 10H4v-6z"/><path d="M14 4l6 6"/></svg>',
        axe:         '<svg viewBox="0 0 24 24" '+S+'><path d="M14 12l-8 8a2 2 0 01-3-3l8-8"/><path d="M14 12l6-6c2-2 2-5 0-7s-5-2-7 0l-6 6"/></svg>',
        bow:         '<svg viewBox="0 0 24 24" '+S+'><path d="M18 2c-4 0-8 4-8 10s4 10 8 10"/><path d="M18 2v20"/><path d="M10 12H3"/><path d="M5 9l-3 3 3 3"/></svg>',
        staff:       '<svg viewBox="0 0 24 24" '+S+'><circle cx="12" cy="4" r="2.5"/><path d="M12 6.5V22"/><path d="M9 22h6"/><path d="M10 14h4"/></svg>',
        wand:        '<svg viewBox="0 0 24 24" '+S+'><path d="M15 4l-9 9 5 5 9-9z"/><path d="M19 2l1 3 3 1-3 1-1 3-1-3-3-1 3-1z"/></svg>',
        spear:       '<svg viewBox="0 0 24 24" '+S+'><path d="M12 2l3 6h-6z"/><path d="M12 8v14"/><path d="M9 12h6"/></svg>',
        hammer:      '<svg viewBox="0 0 24 24" '+S+'><rect x="13" y="2" width="8" height="6" rx="1"/><path d="M17 8v7"/><path d="M17 15l-6 6"/><path d="M9 12l3 3"/></svg>',
        crossbow:    '<svg viewBox="0 0 24 24" '+S+'><path d="M4 8c4-4 12-4 16 0"/><path d="M12 6v12"/><path d="M9 21l3-3 3 3"/><path d="M8 12h8"/></svg>',
        scythe:      '<svg viewBox="0 0 24 24" '+S+'><path d="M5 21V10"/><path d="M5 10c0-4 3-7 7-7h7"/><path d="M19 3c-3 0-6 3-7 7"/><path d="M3 18l4 3"/></svg>',
        whip:        '<svg viewBox="0 0 24 24" '+S+'><path d="M4 20c4-2 6-6 8-10s4-6 8-7"/><path d="M3 21l2-2"/><circle cx="20" cy="3" r="1" '+SF+'/></svg>',

        // ==================== 防具 ====================
        shield:      '<svg viewBox="0 0 24 24" '+S+'><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>',
        helmet:      '<svg viewBox="0 0 24 24" '+S+'><path d="M4 14v-2c0-4.4 3.6-8 8-8s8 3.6 8 8v2"/><path d="M4 14h16v2c0 2-2 4-4 4H8c-2 0-4-2-4-4v-2z"/><path d="M4 14h16"/></svg>',
        armor:       '<svg viewBox="0 0 24 24" '+S+'><path d="M12 2L6 5v4c0 6 6 10 6 10s6-4 6-10V5z"/><path d="M6 5l3 1v4"/><path d="M18 5l-3 1v4"/><path d="M9 18h6v3H9z"/></svg>',
        boots:       '<svg viewBox="0 0 24 24" '+S+'><path d="M8 2v10l-4 6v2h10v-2l-2-6V2"/><path d="M4 18h16v2H4z"/></svg>',
        gloves:      '<svg viewBox="0 0 24 24" '+S+'><path d="M6 12V8c0-2 1-4 3-4h0c1 0 2 1 2 2v6"/><path d="M11 6c0-1 1-2 2-2h0c1 0 2 1 2 2v6"/><path d="M15 8c0-1 1-2 2-2h0c1 0 2 1 2 2v4l-4 8H7l-3-6"/></svg>',
        cloak:       '<svg viewBox="0 0 24 24" '+S+'><path d="M6 3h12l2 18H4z"/><path d="M6 3c0 3 2.7 6 6 6s6-3 6-6"/></svg>',
        gauntlets:   '<svg viewBox="0 0 24 24" '+S+'><path d="M5 22V12l2-8h10l2 8v10"/><path d="M9 12v6"/><path d="M15 12v6"/><path d="M5 16h14"/></svg>',

        // ==================== 饰品 ====================
        ring:        '<svg viewBox="0 0 24 24" '+S+'><circle cx="12" cy="14" r="6"/><circle cx="12" cy="14" r="2.5"/><path d="M12 8V4"/><path d="M9.5 5L12 8l2.5-3"/></svg>',
        necklace:    '<svg viewBox="0 0 24 24" '+S+'><path d="M5 3c0 6 3 10 7 12 4-2 7-6 7-12"/><circle cx="12" cy="17" r="3"/></svg>',
        bracelet:    '<svg viewBox="0 0 24 24" '+S+'><ellipse cx="12" cy="12" rx="8" ry="4"/><ellipse cx="12" cy="12" rx="5.5" ry="2.5"/></svg>',
        earring:     '<svg viewBox="0 0 24 24" '+S+'><circle cx="12" cy="6" r="2"/><path d="M12 8v8"/><circle cx="12" cy="18" r="3"/><path d="M10 4h4"/></svg>',
        amulet:      '<svg viewBox="0 0 24 24" '+S+'><path d="M8 2h8l2 8-8 12L2 10z"/><path d="M2 10h20"/><circle cx="12" cy="12" r="2"/></svg>',
        crown:       '<svg viewBox="0 0 24 24" '+S+'><path d="M3 18l2-10 5 4 2-8 2 8 5-4 2 10z"/><path d="M3 18h18v3H3z"/></svg>',
        tiara:       '<svg viewBox="0 0 24 24" '+S+'><path d="M4 16c0-4 3-8 8-8s8 4 8 8"/><path d="M4 16h16"/><circle cx="12" cy="8" r="2"/><circle cx="7" cy="11" r="1.5"/><circle cx="17" cy="11" r="1.5"/></svg>',

        // ==================== 消耗品 ====================
        potion:      '<svg viewBox="0 0 24 24" '+S+'><path d="M9 3h6"/><path d="M10 3v6l-4 8a2 2 0 002 2h8a2 2 0 002-2l-4-8V3"/><path d="M7 15h10"/></svg>',
        potion2:     '<svg viewBox="0 0 24 24" '+S+'><path d="M9 3h6"/><path d="M10 3v6l-4 8a2 2 0 002 2h8a2 2 0 002-2l-4-8V3"/><path d="M7 15h10"/><path d="M10 12h4"/></svg>',
        flask:       '<svg viewBox="0 0 24 24" '+S+'><path d="M9 3h6"/><path d="M10 3v4l-5 10a2 2 0 002 3h10a2 2 0 002-3l-5-10V3"/><circle cx="12" cy="15" r="2"/></svg>',
        food:        '<svg viewBox="0 0 24 24" '+S+'><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><path d="M6 1v3M10 1v3M14 1v3"/></svg>',
        apple:       '<svg viewBox="0 0 24 24" '+S+'><path d="M12 4c-4 0-7 3-7 7s3 9 7 9 7-5 7-9-3-7-7-7z"/><path d="M12 4c-1-2-4-1-4 1"/><path d="M12 4v4"/></svg>',
        bread:       '<svg viewBox="0 0 24 24" '+S+'><path d="M5 8c0-3 3-5 7-5s7 2 7 5c0 2-1 3-2 3H7c-1 0-2-1-2-3z"/><path d="M5 11v6c0 2 3 4 7 4s7-2 7-4v-6"/></svg>',
        herb:        '<svg viewBox="0 0 24 24" '+S+'><path d="M12 22V10"/><path d="M7 10c0-3 2-5 5-5s5 2 5 5-2 5-5 5"/><path d="M7 10c-2 0-4 1-4 3s2 3 4 3"/><path d="M17 10c2 0 4 1 4 3s-2 3-4 3"/></svg>',
        candy:       '<svg viewBox="0 0 24 24" '+S+'><circle cx="12" cy="12" r="5"/><path d="M8 8l-4-4"/><path d="M16 16l4 4"/><path d="M7 7l-2 0 0-2"/><path d="M17 17l2 0 0 2"/></svg>',
        meat:        '<svg viewBox="0 0 24 24" '+S+'><path d="M15 4a5 5 0 010 10c-3 0-5-2-5-5l-4 4a3 3 0 11-2-2l4-4c-3 0-5-2-5-5a5 5 0 0110 0z"/></svg>',
        fish:        '<svg viewBox="0 0 24 24" '+S+'><path d="M2 12c3-5 8-7 14-5l-4 5 4 5c-6 2-11 0-14-5z"/><path d="M18 7c2 1 3 3 3 5s-1 4-3 5"/><circle cx="15" cy="12" r="1" '+SF+'/></svg>',
        cheese:      '<svg viewBox="0 0 24 24" '+S+'><path d="M2 18l10-14 10 8v6z"/><circle cx="10" cy="14" r="1.5"/><circle cx="15" cy="12" r="1"/><circle cx="8" cy="10" r="1"/></svg>',

        // ==================== 材料/宝物 ====================
        gem:         '<svg viewBox="0 0 24 24" '+S+'><path d="M6 3h12l4 6-10 12L2 9z"/><path d="M2 9h20"/><path d="M10 3l-2 6 4 12"/><path d="M14 3l2 6-4 12"/></svg>',
        crystal:     '<svg viewBox="0 0 24 24" '+S+'><path d="M12 2l4 6-4 14-4-14z"/><path d="M8 8h8"/><path d="M6 3l2 5"/><path d="M18 3l-2 5"/></svg>',
        ore:         '<svg viewBox="0 0 24 24" '+S+'><path d="M4 18l4-12h8l4 12z"/><path d="M8 6l2 12"/><path d="M16 6l-2 12"/><path d="M2 18h20"/></svg>',
        coin:        '<svg viewBox="0 0 24 24" '+S+'><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="6"/><path d="M12 8v8"/><path d="M10 10h4a2 2 0 010 4h-4"/></svg>',
        gold:        '<svg viewBox="0 0 24 24" '+S+'><rect x="3" y="8" width="18" height="8" rx="2"/><path d="M7 8V6a2 2 0 012-2h6a2 2 0 012 2v2"/><path d="M3 12h18"/></svg>',
        scroll:      '<svg viewBox="0 0 24 24" '+S+'><path d="M8 3c-1.5 0-3 1-3 3v12c0 2 1.5 3 3 3"/><path d="M8 3h10c1.5 0 3 1 3 3v12c0 2-1.5 3-3 3H8"/><path d="M10 8h6"/><path d="M10 12h4"/></svg>',
        feather:     '<svg viewBox="0 0 24 24" '+S+'><path d="M20 4L8 16"/><path d="M20 4c-4 0-8 4-10 8l4 4c4-2 8-6 8-10z"/><path d="M6 18l-2 2"/></svg>',
        bone:        '<svg viewBox="0 0 24 24" '+S+'><path d="M5 8c-1.5-1.5-1-4 1-4s3 1.5 3 3"/><path d="M19 16c1.5 1.5 1 4-1 4s-3-1.5-3-3"/><path d="M9 7l8 8"/></svg>',
        key:         '<svg viewBox="0 0 24 24" '+S+'><circle cx="8" cy="15" r="5"/><path d="M12 11l8-8"/><path d="M17 6l3 3"/><path d="M15 8l2 2"/></svg>',
        lock:        '<svg viewBox="0 0 24 24" '+S+'><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/><circle cx="12" cy="16" r="1.5" '+SF+'/></svg>',
        rope:        '<svg viewBox="0 0 24 24" '+S+'><path d="M4 4c4 4 8 0 8 4s-4 4-4 8 4 4 4 4"/><path d="M12 4c4 4 8 0 8 4s-4 4-4 8"/></svg>',
        cloth:       '<svg viewBox="0 0 24 24" '+S+'><path d="M3 6l4-3 4 3 4-3 4 3 2-1v15l-2 1-4-3-4 3-4-3-4 3-2-1V5z"/><path d="M7 3v18"/><path d="M15 3v18"/></svg>',
        leather:     '<svg viewBox="0 0 24 24" '+S+'><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 4v16"/><path d="M4 8h16"/></svg>',
        wood:        '<svg viewBox="0 0 24 24" '+S+'><rect x="3" y="8" width="18" height="8" rx="4"/><path d="M7 8v8"/><path d="M12 8v8"/><path d="M17 8v8"/></svg>',
        metal:       '<svg viewBox="0 0 24 24" '+S+'><path d="M4 20l4-16h8l4 16"/><path d="M2 20h20"/><path d="M8 12h8"/></svg>',

        // ==================== 知识/魔法 ====================
        book:        '<svg viewBox="0 0 24 24" '+S+'><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M4 4.5A2.5 2.5 0 016.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15z"/><path d="M8 7h8"/><path d="M8 11h4"/></svg>',
        spell:       '<svg viewBox="0 0 24 24" '+S+'><path d="M12 2l2.5 5.5H20l-4.5 3.5L17 17l-5-3.5L7 17l1.5-6L4 7.5h5.5z"/></svg>',
        rune:        '<svg viewBox="0 0 24 24" '+S+'><circle cx="12" cy="12" r="9"/><path d="M12 3v18"/><path d="M12 8l5 4-5 4"/><path d="M7 7l5 5"/></svg>',
        map:         '<svg viewBox="0 0 24 24" '+S+'><path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/><path d="M8 2v16"/><path d="M16 6v16"/></svg>',
        note:        '<svg viewBox="0 0 24 24" '+S+'><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h4"/></svg>',
        letter:      '<svg viewBox="0 0 24 24" '+S+'><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 5l9 7 9-7"/></svg>',
        compass:     '<svg viewBox="0 0 24 24" '+S+'><circle cx="12" cy="12" r="9"/><polygon points="16,8 14,14 8,16 10,10" '+SF+'/></svg>',
        telescope:   '<svg viewBox="0 0 24 24" '+S+'><path d="M3 17l6-6 4 4 6-6"/><circle cx="18" cy="6" r="3"/><path d="M3 17l2 4"/></svg>',
        hourglass:   '<svg viewBox="0 0 24 24" '+S+'><path d="M6 2h12v5l-4 5 4 5v5H6v-5l4-5-4-5z"/><path d="M6 2h12"/><path d="M6 22h12"/></svg>',

        // ==================== 自然/元素 ====================
        fire:        '<svg viewBox="0 0 24 24" '+S+'><path d="M12 2c0 4-4 6-4 10a4 4 0 008 0c0-4-4-6-4-10z"/><path d="M12 18a2 2 0 002-2c0-2-2-3-2-5"/></svg>',
        ice:         '<svg viewBox="0 0 24 24" '+S+'><path d="M12 2v20"/><path d="M2 12h20"/><path d="M5 5l14 14"/><path d="M19 5L5 19"/><path d="M12 2l-2 3h4z"/><path d="M12 22l-2-3h4z"/></svg>',
        lightning:   '<svg viewBox="0 0 24 24" '+S+'><path d="M13 2L3 14h9l-1 8 10-12h-9z"/></svg>',
        water:       '<svg viewBox="0 0 24 24" '+S+'><path d="M12 2c-4 5.5-7 8-7 12a7 7 0 0014 0c0-4-3-6.5-7-12z"/></svg>',
        wind:        '<svg viewBox="0 0 24 24" '+S+'><path d="M3 8h12a3 3 0 100-3"/><path d="M3 16h16a3 3 0 110 3"/><path d="M3 12h10"/></svg>',
        earth:       '<svg viewBox="0 0 24 24" '+S+'><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c-3 3-3 9 0 18"/><path d="M12 3c3 3 3 9 0 18"/></svg>',
        leaf:        '<svg viewBox="0 0 24 24" '+S+'><path d="M4 20c0-8 4-16 16-16 0 8-4 16-16 16z"/><path d="M4 20c4-4 8-8 12-10"/></svg>',
        sun:         '<svg viewBox="0 0 24 24" '+S+'><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/></svg>',
        moon:        '<svg viewBox="0 0 24 24" '+S+'><path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"/></svg>',
        star:        '<svg viewBox="0 0 24 24" '+S+'><polygon points="12,2 15,9 22,9 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9 9,9"/></svg>',

        // ==================== 生物 ====================
        dragon:      '<svg viewBox="0 0 24 24" '+S+'><path d="M12 4c-3 0-6 3-6 7 0 3 2 5 4 6l-2 4h8l-2-4c2-1 4-3 4-6 0-4-3-7-6-7z"/><path d="M8 4l-3-2"/><path d="M16 4l3-2"/><circle cx="10" cy="10" r="1" '+SF+'/><circle cx="14" cy="10" r="1" '+SF+'/></svg>',
        wolf:        '<svg viewBox="0 0 24 24" '+S+'><path d="M4 16l2-8 4-4v4l4-4v4l4 4 2 4v4l-4 2H8l-4-2z"/><circle cx="10" cy="12" r="1" '+SF+'/><circle cx="14" cy="12" r="1" '+SF+'/></svg>',
        bird:        '<svg viewBox="0 0 24 24" '+S+'><path d="M2 12c3-6 7-8 10-6 3-2 7 0 10 6"/><path d="M12 6v4"/><path d="M8 18c0-2 2-4 4-4s4 2 4 4"/></svg>',
        snake:       '<svg viewBox="0 0 24 24" '+S+'><path d="M4 8c0-3 2-5 5-5s5 2 5 5c0 4-4 4-4 8s4 4 4 4"/><circle cx="6" cy="6" r="1" '+SF+'/></svg>',
        spider:      '<svg viewBox="0 0 24 24" '+S+'><circle cx="12" cy="12" r="4"/><path d="M8 12l-6-4M8 12l-6 4M16 12l6-4M16 12l6 4M12 8V2M12 16v6"/></svg>',
        fish2:       '<svg viewBox="0 0 24 24" '+S+'><path d="M2 12c3-5 8-7 14-5l-4 5 4 5c-6 2-11 0-14-5z"/><path d="M18 7c2 1 3 3 3 5s-1 4-3 5"/><circle cx="15" cy="12" r="1" '+SF+'/></svg>',
        skeleton:    '<svg viewBox="0 0 24 24" '+S+'><circle cx="12" cy="6" r="4"/><path d="M12 10v8"/><path d="M8 14h8"/><path d="M10 18l-2 4"/><path d="M14 18l2 4"/><circle cx="10" cy="5" r="1" '+SF+'/><circle cx="14" cy="5" r="1" '+SF+'/></svg>',
        ghost:       '<svg viewBox="0 0 24 24" '+S+'><path d="M6 10a6 6 0 0112 0v10l-3-2-3 2-3-2-3 2z"/><circle cx="10" cy="10" r="1" '+SF+'/><circle cx="14" cy="10" r="1" '+SF+'/></svg>',

        // ==================== UI/动作 ====================
        box:         '<svg viewBox="0 0 24 24" '+S+'><path d="M21 16V8a2 2 0 00-1-1.7l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.7l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><path d="M3.3 7L12 12l8.7-5"/><path d="M12 22V12"/></svg>',
        search:      '<svg viewBox="0 0 24 24" '+S+'><circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/></svg>',
        plus:        '<svg viewBox="0 0 24 24" '+S+'><path d="M12 5v14M5 12h14"/></svg>',
        minus:       '<svg viewBox="0 0 24 24" '+S+'><path d="M5 12h14"/></svg>',
        check:       '<svg viewBox="0 0 24 24" '+S+'><path d="M5 13l4 4L19 7"/></svg>',
        cross:       '<svg viewBox="0 0 24 24" '+S+'><path d="M18 6L6 18M6 6l12 12"/></svg>',
        edit:        '<svg viewBox="0 0 24 24" '+S+'><path d="M17 3l4 4L7 21H3v-4z"/><path d="M14 6l4 4"/></svg>',
        trash:       '<svg viewBox="0 0 24 24" '+S+'><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M5 6l1 14a2 2 0 002 2h8a2 2 0 002-2l1-14"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>',
        download:    '<svg viewBox="0 0 24 24" '+S+'><path d="M12 3v12"/><path d="M8 11l4 4 4-4"/><path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"/></svg>',
        upload:      '<svg viewBox="0 0 24 24" '+S+'><path d="M12 17V5"/><path d="M8 9l4-4 4 4"/><path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"/></svg>',
        copy:        '<svg viewBox="0 0 24 24" '+S+'><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>',
        settings:    '<svg viewBox="0 0 24 24" '+S+'><circle cx="12" cy="12" r="3"/><path d="M12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>',
        heart:       '<svg viewBox="0 0 24 24" '+S+'><path d="M12 21C12 21 3 13.5 3 8.5 3 5.4 5.4 3 8.5 3c1.7 0 3.4.8 3.5 2.5C12.1 3.8 13.8 3 15.5 3 18.6 3 21 5.4 21 8.5 21 13.5 12 21 12 21z"/></svg>',
        skull:       '<svg viewBox="0 0 24 24" '+S+'><path d="M12 2c-5 0-8 3.5-8 7.5 0 2.5 1.5 5 4 6v4h8v-4c2.5-1 4-3.5 4-6C20 5.5 17 2 12 2z"/><circle cx="9" cy="10" r="1.5" '+SF+'/><circle cx="15" cy="10" r="1.5" '+SF+'/><path d="M10 15h4"/></svg>',
        trophy:      '<svg viewBox="0 0 24 24" '+S+'><path d="M8 2h8v8a4 4 0 01-8 0z"/><path d="M4 4h4v2a3 3 0 01-3 3H4z"/><path d="M20 4h-4v2a3 3 0 003 3h1z"/><path d="M12 14v4"/><path d="M8 22h8"/><path d="M8 18h8"/></svg>',
        flag:        '<svg viewBox="0 0 24 24" '+S+'><path d="M4 22V4"/><path d="M4 4l12 4-12 4"/></svg>',
        target:      '<svg viewBox="0 0 24 24" '+S+'><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" '+SF+'/></svg>',
        clock:       '<svg viewBox="0 0 24 24" '+S+'><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
        eye:         '<svg viewBox="0 0 24 24" '+S+'><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>',
        bell:        '<svg viewBox="0 0 24 24" '+S+'><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/></svg>',
        chat:        '<svg viewBox="0 0 24 24" '+S+'><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
        link:        '<svg viewBox="0 0 24 24" '+S+'><path d="M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.5 1.5"/><path d="M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.5-1.5"/></svg>',
        refresh:     '<svg viewBox="0 0 24 24" '+S+'><path d="M1 4v6h6"/><path d="M23 20v-6h-6"/><path d="M20.5 9A9 9 0 005.3 5L1 10"/><path d="M3.5 15a9 9 0 0015.2 4L23 14"/></svg>',
        filter:      '<svg viewBox="0 0 24 24" '+S+'><path d="M22 3H2l8 9.5V19l4 2v-8.5z"/></svg>',
        sort:        '<svg viewBox="0 0 24 24" '+S+'><path d="M3 6h18"/><path d="M7 12h10"/><path d="M11 18h2"/></svg>',
        grid:        '<svg viewBox="0 0 24 24" '+S+'><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
        list:        '<svg viewBox="0 0 24 24" '+S+'><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1" '+SF+'/><circle cx="4" cy="12" r="1" '+SF+'/><circle cx="4" cy="18" r="1" '+SF+'/></svg>',
        home:        '<svg viewBox="0 0 24 24" '+S+'><path d="M3 12l9-9 9 9"/><path d="M5 10v10a1 1 0 001 1h3v-6h6v6h3a1 1 0 001-1V10"/></svg>',
        folder:      '<svg viewBox="0 0 24 24" '+S+'><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>',
        tag:         '<svg viewBox="0 0 24 24" '+S+'><path d="M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0L3 13V3h10l7.6 7.6a2 2 0 010 2.8z"/><circle cx="7.5" cy="7.5" r="1.5" '+SF+'/></svg>',
        zap:         '<svg viewBox="0 0 24 24" '+S+'><path d="M13 2L3 14h9l-1 8 10-12h-9z"/></svg>',
        anchor:      '<svg viewBox="0 0 24 24" '+S+'><circle cx="12" cy="5" r="3"/><path d="M12 8v14"/><path d="M5 12H2a10 10 0 0020 0h-3"/></svg>',
        music:       '<svg viewBox="0 0 24 24" '+S+'><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
        camera:      '<svg viewBox="0 0 24 24" '+S+'><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>',
        save:        '<svg viewBox="0 0 24 24" '+S+'><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/></svg>',
        print:       '<svg viewBox="0 0 24 24" '+S+'><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',
        moon_icon:   '<svg viewBox="0 0 24 24" '+S+'><path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"/></svg>',
        backup:      '<svg viewBox="0 0 24 24" '+S+'><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>',
        lightbulb:   '<svg viewBox="0 0 24 24" '+S+'><path d="M9 21h6M12 3a6 6 0 00-4 10.5V17h8v-3.5A6 6 0 0012 3z"/><path d="M10 17h4v2h-4z"/></svg>',
        hash:        '<svg viewBox="0 0 24 24" '+S+'><path d="M4 9h16M4 15h16M10 3l-2 18M16 3l-2 18"/></svg>',
        chart:       '<svg viewBox="0 0 24 24" '+S+'><path d="M18 20V10M12 20V4M6 20v-6"/><path d="M3 20h18"/></svg>',
        dice:        '<svg viewBox="0 0 24 24" '+S+'><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5" '+SF+'/><circle cx="15.5" cy="8.5" r="1.5" '+SF+'/><circle cx="8.5" cy="15.5" r="1.5" '+SF+'/><circle cx="15.5" cy="15.5" r="1.5" '+SF+'/><circle cx="12" cy="12" r="1.5" '+SF+'/></svg>',

        // ==================== 古风修仙 ====================
        // 法宝兵器
        spirit_sword:   '<svg viewBox="0 0 24 24" '+S+'><path d="M14 3l7 7-10 10H4v-7z"/><path d="M14 3l7 7"/><path d="M10 13l-4 4"/><circle cx="16" cy="8" r="1.5" '+SF+'/><path d="M6 18l-2 2"/></svg>',
        magic_treasure: '<svg viewBox="0 0 24 24" '+S+'><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1" '+SF+'/><path d="M12 4v2M12 18v2M4 12h2M18 12h2"/></svg>',
        cauldron:       '<svg viewBox="0 0 24 24" '+S+'><path d="M6 8h12a4 4 0 014 4v1a8 8 0 01-8 8h-4a8 8 0 01-8-8v-1a4 4 0 014-4z"/><path d="M8 8V5a2 2 0 012-2h4a2 2 0 012 2v3"/><path d="M9 14h6"/></svg>',
        pill:           '<svg viewBox="0 0 24 24" '+S+'><circle cx="12" cy="12" r="7"/><path d="M9 9c2-2 4-2 6 0"/><path d="M9 15c2 2 4 2 6 0"/><circle cx="12" cy="12" r="2" '+SF+'/></svg>',
        talisman:       '<svg viewBox="0 0 24 24" '+S+'><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M9 6h6"/><path d="M9 10h6"/><path d="M9 14h6"/><path d="M12 6v10"/></svg>',
        formation:      '<svg viewBox="0 0 24 24" '+S+'><circle cx="12" cy="12" r="9"/><path d="M12 3l3 6-3 6-3-6z"/><path d="M12 9l6 3-6 3-3-6z"/><circle cx="12" cy="12" r="2" '+SF+'/></svg>',
        spirit_root:    '<svg viewBox="0 0 24 24" '+S+'><path d="M12 22V8"/><path d="M8 8c0-2 2-4 4-4s4 2 4 4"/><path d="M6 12c-2 0-3 1-3 3s1 3 3 3"/><path d="M18 12c2 0 3 1 3 3s-1 3-3 3"/><path d="M9 4l3-2 3 2"/></svg>',
        golden_core:    '<svg viewBox="0 0 24 24" '+S+'><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="2" '+SF+'/><path d="M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4"/></svg>',
        nascent_soul:   '<svg viewBox="0 0 24 24" '+S+'><circle cx="12" cy="8" r="4"/><path d="M8 12c0 4 2 8 4 8s4-4 4-8"/><path d="M10 6h4"/><path d="M12 4v4"/><path d="M9 16l-2 4M15 16l2 4"/></svg>',
        // 仙山灵境
        immortal_mtn:   '<svg viewBox="0 0 24 24" '+S+'><path d="M3 20l5-12 4 6 3-4 6 10z"/><path d="M8 8c0-2 2-4 4-4s4 2 4 4"/><path d="M10 6l2-3 2 3"/></svg>',
        cloud_sea:      '<svg viewBox="0 0 24 24" '+S+'><path d="M4 14c0-3 2-5 5-5 1 0 2 0 3 1 1-2 3-3 5-3 3 0 5 2 5 5s-2 4-5 4H9c-3 0-5-1-5-4z"/><path d="M2 18h20"/><path d="M6 20h12"/></svg>',
        lotus:          '<svg viewBox="0 0 24 24" '+S+'><path d="M12 20c-4 0-7-3-7-7 0-2 1-4 3-5 1-1 2-1 4-1s3 0 4 1c2 1 3 3 3 5 0 4-3 7-7 7z"/><path d="M12 20v-8"/><path d="M9 14c-1-1-2-3-2-5"/><path d="M15 14c1-1 2-3 2-5"/><path d="M12 12c-2-2-3-5-3-8"/><path d="M12 12c2-2 3-5 3-8"/></svg>',
        bamboo:         '<svg viewBox="0 0 24 24" '+S+'><path d="M12 2v20"/><path d="M10 6h4M10 12h4M10 18h4"/><path d="M8 4c-2 1-3 3-3 5"/><path d="M16 8c2 1 3 3 3 5"/><path d="M8 10c-2 1-3 3-3 5"/><path d="M16 14c2 1 3 3 3 5"/></svg>',
        // 神兽灵禽
        azure_dragon:   '<svg viewBox="0 0 24 24" '+S+'><path d="M4 12c0-4 3-7 7-7h2c4 0 7 3 7 7 0 3-2 5-4 6l2 4h-4l-2-4c-1 0-2 0-3-1l-2 3H5l2-4c-2-1-3-3-3-4z"/><circle cx="10" cy="10" r="1" '+SF+'/><path d="M7 5l-2-2M17 5l2-2"/><path d="M12 5v-3"/></svg>',
        phoenix:        '<svg viewBox="0 0 24 24" '+S+'><path d="M12 4c-3 0-5 2-5 5 0 2 1 3 2 4l-2 6h4l1-3 1 3h4l-2-6c1-1 2-2 2-4 0-3-2-5-5-5z"/><path d="M9 9h6"/><circle cx="10" cy="8" r="1" '+SF+'/><path d="M7 4l-2-2M17 4l2-2M12 4V2"/></svg>',
        qilin:          '<svg viewBox="0 0 24 24" '+S+'><path d="M5 16l2-8 3-3v3l4-3v3l4 3 2 5v3l-4 2H8l-3-2z"/><circle cx="10" cy="12" r="1" '+SF+'/><circle cx="14" cy="12" r="1" '+SF+'/><path d="M8 8l-2-3M16 8l2-3"/><path d="M12 8v-4"/></svg>',
        spirit_fox:     '<svg viewBox="0 0 24 24" '+S+'><path d="M4 16l3-10 3-3v3l4-3v3l3 3 3 7v3l-4 2H8l-4-2z"/><circle cx="10" cy="12" r="1" '+SF+'/><circle cx="14" cy="12" r="1" '+SF+'/><path d="M7 6l-3-3M17 6l3-3"/><path d="M10 15c1 1 3 1 4 0"/></svg>',
        xuanwu:         '<svg viewBox="0 0 24 24" '+S+'><ellipse cx="12" cy="14" rx="8" ry="6"/><path d="M8 8c0-2 2-4 4-4s4 2 4 4"/><path d="M4 14c-1 0-2 1-2 2s1 2 2 2"/><path d="M20 14c1 0 2 1 2 2s-1 2-2 2"/><path d="M9 12h6M9 16h6"/></svg>',
        crane:          '<svg viewBox="0 0 24 24" '+S+'><path d="M2 12c3-6 7-8 10-6 3-2 7 0 10 6"/><path d="M12 6v4"/><path d="M8 18c0-2 2-4 4-4s4 2 4 4"/><circle cx="10" cy="10" r="1" '+SF+'/><path d="M12 6l-1-3h2z" '+SF+'/></svg>',
        // 修仙元素
        spiritual_qi:   '<svg viewBox="0 0 24 24" '+S+'><circle cx="12" cy="12" r="3" '+SF+'/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/><path d="M5 5l3 3M16 16l3 3M5 19l3-3M16 8l3-3"/></svg>',
        tribulation:    '<svg viewBox="0 0 24 24" '+S+'><path d="M13 2L3 14h9l-1 8 10-12h-9z" '+SF+'/><path d="M13 2L3 14h9l-1 8 10-12h-9z"/></svg>',
        yin_yang:       '<svg viewBox="0 0 24 24" '+S+'><circle cx="12" cy="12" r="9"/><path d="M12 3c-5 0-9 4-9 9s4 9 9 9 9-4 9-9"/><path d="M12 3c2.5 0 4.5 2 4.5 4.5S14.5 12 12 12s-4.5 2-4.5 4.5S9.5 21 12 21"/><circle cx="12" cy="7.5" r="1.5" '+SF+'/><circle cx="12" cy="16.5" r="1.5"/></svg>',
        bagua:          '<svg viewBox="0 0 24 24" '+S+'><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/><path d="M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4"/><circle cx="12" cy="12" r="3"/></svg>',
        five_elements:  '<svg viewBox="0 0 24 24" '+S+'><circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="10" r="2.5"/><circle cx="19" cy="10" r="2.5"/><circle cx="7" cy="18" r="2.5"/><circle cx="17" cy="18" r="2.5"/><path d="M12 7.5v9M7.5 11l7 5M16.5 11l-7 5"/></svg>',
        // 文房雅物
        ink_brush:      '<svg viewBox="0 0 24 24" '+S+'><path d="M12 2v14"/><path d="M10 16c0 2 1 4 2 4s2-2 2-4"/><path d="M9 2h6"/><path d="M10 6h4"/></svg>',
        ink_stone:      '<svg viewBox="0 0 24 24" '+S+'><rect x="3" y="8" width="18" height="10" rx="3"/><ellipse cx="12" cy="13" rx="6" ry="3"/><circle cx="9" cy="13" r="1" '+SF+'/></svg>',
        guqin:          '<svg viewBox="0 0 24 24" '+S+'><rect x="2" y="10" width="20" height="4" rx="2"/><path d="M5 10v4M9 10v4M13 10v4M17 10v4M21 10v4"/><path d="M2 12h20"/></svg>',
        jade_pendant:   '<svg viewBox="0 0 24 24" '+S+'><circle cx="12" cy="14" r="6"/><circle cx="12" cy="14" r="3"/><path d="M12 8V4"/><path d="M9 4h6"/><path d="M12 11v6"/></svg>',
    };

    // 分类映射
    var categories = {
        '武器': ['sword','greatsword','dagger','axe','bow','staff','wand','spear','hammer','crossbow','scythe','whip'],
        '防具': ['shield','helmet','armor','boots','gloves','cloak','gauntlets'],
        '饰品': ['ring','necklace','bracelet','earring','amulet','crown','tiara'],
        '消耗品': ['potion','potion2','flask','food','apple','bread','herb','candy','meat','fish','cheese'],
        '材料': ['gem','crystal','ore','coin','gold','scroll','feather','bone','key','lock','rope','cloth','leather','wood','metal'],
        '知识': ['book','spell','rune','map','note','letter','compass','telescope','hourglass'],
        '元素': ['fire','ice','lightning','water','wind','earth','leaf','sun','moon','star'],
        '生物': ['dragon','wolf','bird','snake','spider','fish2','skeleton','ghost'],
        'UI': ['box','search','plus','minus','check','cross','edit','trash','download','upload','copy','settings','heart','skull','trophy','flag','target','clock','eye','bell','chat','link','refresh','filter','sort','grid','list','home','folder','tag','zap','anchor','music','camera','save','print','moon_icon','backup','lightbulb','hash','chart','dice'],
        '修仙法宝': ['spirit_sword','magic_treasure','cauldron','pill','talisman','formation','spirit_root','golden_core','nascent_soul'],
        '仙山灵境': ['immortal_mtn','cloud_sea','lotus','bamboo'],
        '神兽灵禽': ['azure_dragon','phoenix','qilin','spirit_fox','xuanwu','crane'],
        '修仙元素': ['spiritual_qi','tribulation','yin_yang','bagua','five_elements'],
        '文房雅物': ['ink_brush','ink_stone','guqin','jade_pendant'],
    };

    // ==================== 公共 API ====================

    /**
     * 渲染 SVG 图标 HTML 字符串
     * @param {string} key - 图标 key 或 emoji 字符串
     * @param {number} [size=24] - 尺寸(px)
     * @param {string} [color] - CSS 颜色值
     * @returns {string|null} SVG HTML 字符串，如果 key 不是已注册图标则返回 null
     */
    function renderIcon(key, size, color) {
        if (!key || !icons[key]) return null;
        var s = size || 24;
        var style = 'width:' + s + 'px;height:' + s + 'px;display:inline-block;vertical-align:middle;line-height:1;';
        if (color) style += 'color:' + color + ';';
        return '<span class="svg-icon" style="' + style + '">' + icons[key] + '</span>';
    }

    /**
     * 渲染图标，自动 fallback：如果是已知 SVG key 则渲染 SVG，否则当 emoji 文本渲染
     * @param {string} keyOrEmoji - SVG key 或 emoji 字符串
     * @param {number} [size=24]
     * @param {string} [color]
     * @returns {string} HTML 字符串
     */
    function renderAuto(keyOrEmoji, size, color) {
        if (!keyOrEmoji) return renderIcon('box', size, color) || '';
        var svg = renderIcon(keyOrEmoji, size, color);
        if (svg) return svg;
        // fallback: 当作文本 emoji 渲染
        var s = size || 24;
        var style = 'font-size:' + Math.round(s * 0.85) + 'px;line-height:1;display:inline-block;vertical-align:middle;';
        if (color) style += 'color:' + color + ';';
        return '<span class="emoji-icon" style="' + style + '">' + keyOrEmoji + '</span>';
    }

    /**
     * 判断是否是已注册的 SVG 图标 key
     */
    function isSvgIcon(key) {
        return !!(key && icons[key]);
    }

    /**
     * 获取所有图标 key 数组
     */
    function getKeys() {
        return Object.keys(icons);
    }

    /**
     * 获取分类结构
     */
    function getCategories() {
        return JSON.parse(JSON.stringify(categories));
    }

    /**
     * 获取原始 SVG 字符串（不包装）
     */
    function getRaw(key) {
        return icons[key] || null;
    }

    /**
     * 获取图标总数
     */
    function count() {
        return Object.keys(icons).length;
    }

    return {
        render: renderIcon,
        renderAuto: renderAuto,
        is: isSvgIcon,
        getKeys: getKeys,
        getCategories: getCategories,
        getRaw: getRaw,
        count: count,
        icons: icons,
    };
})();
