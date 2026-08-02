// ============================================================
// 测试 API (test_api.js)  版本 3.2.0
// 用途:
//   1. 注入/清除测试数据（全民穿越海岛求生，2 章带各类错误的正文）
//   2. 暴露 window.NovelTestAPI 供 AI 自动化操作（导航/读改数据/触发审查）
// 仅在本地开发环境（localhost / 127.0.0.1 / file://）下激活，避免污染正式版
// ============================================================
(function() {
    'use strict';

    const isDev = (function() {
        const h = location.hostname || '';
        return h === 'localhost' || h === '127.0.0.1' || h === '' || location.protocol === 'file:';
    })();
    if (!isDev) { console.log('[TestAPI] 非开发环境，跳过测试 API 注入'); return; }

    // ==================== 测试数据 ====================
    // 术语表：灵晶(能源) / 潮汐兽(怪物) / 潮汐岛 / 蔚蓝议会 / 林墨 / 苏婉
    // 正文中故意埋的错（供 LLM 审查检出）：
    //   - typo: "穿越"→"穿月"、"潮汐兽"→"潮夕兽"、"挣扎"→"挣札"
    //   - punctuation: 问句用逗号、引号不配对、"的/地"混用
    //   - missing: 句子漏字
    //   - improve: 啰嗦/口语化表达
    //   - consistency: 术语表叫"灵晶"，正文某处写成"能量石"
    //   - foreshadow: 印记/信号塔/无标签药剂（与伏笔呼应或冲突）

    const SEED = {
        chapters: [
            {
                id: 'ch_seed_1',
                title: '第一章 穿越潮汐岛',
                word_count: 0,
                outline: '林墨在教室醒来发现全班被传送到海岛。觉醒"潮汐感知"能力。结识医学生苏婉。首次遭遇潮汐兽，用灵晶驱动能力击退。手腕银色印记首次发光（伏笔）。',
                status: 'draft',
                notes: '测试章节，正文含刻意错误',
                order: 1,
                content: '第一章 穿越潮汐岛\n\n' +
                    '林墨睁开眼时，映入眼帘的不是教室的天花板，而是一片陌生的天空，海风带着咸腥味扑面而来，他挣札着坐起身，环顾四周。\n\n' +
                    '"这...这是哪里，"他喃喃自语，声音被海浪声盖过。\n\n' +
                    '沙滩上散落着十几个同样迷茫的同学，有人惊慌失措的奔跑，有人呆坐不动。林墨抬头望向远方，一座被薄雾笼罩的岛屿静默地矗立在海面上，岛心隐约有一座高塔的轮廓。\n\n' +
                    '他低头看自己的手腕，一道银色的印记正泛着微光，那印记他在穿月前就见过，却始终想不起来历。\n\n' +
                    '"你...你还好吗，"一个清瘦的女生跌跌撞撞走来，她自我介绍叫苏婉，医学院的学生。\n\n' +
                    '两人正交谈时，一道冰冷的提示音在所有人脑海中响起：\n\n' +
                    '【全民穿越已开启，每人觉醒一项能力，请收集灵晶以求生。】\n\n' +
                    '林墨的心头一震，他试着集中精神，感知到海面下有什么东西正在靠近。\n\n' +
                    '"小心！"他一把拉过苏婉。\n\n' +
                    '一头浑身覆盖着青色鳞片的潮汐兽从浪花中扑出，利爪擦着林墨的肩膀划过，留下血痕。情急之下，他本能地握紧手腕，印记骤然亮起，一道无形的波动扩散开来，将潮汐兽震退数米。\n\n' +
                    '潮夕兽发出刺耳的咆哮，再度扑来，林墨侧身闪避，顺手从地上捡起一块发着幽蓝光芒的能量石，那能量石触手温热，他猛地将能量石捏碎，灵力顺着印记涌入体内，潮汐感知的范围瞬间扩大三倍。\n\n' +
                    '"我的能力...是潮汐感知，"他喘着粗气，总算看清了怪物的动作轨迹。\n\n' +
                    '苏婉颤抖着从包里翻出绷带，手忙脚乱地替他包扎，嘴里念叨着："别怕，别怕，会没事的，一定不会有事的，肯定没事的。"\n\n' +
                    '他终于看清了怪物的弱点——左眼下方的鳞片缺口。\n\n' +
                    '"苏婉，趴下！"\n\n' +
                    '林墨纵身跃起，借着潮汐的推力，一拳砸在怪物的弱点上，潮汐兽惨叫一声，坠入海中，消失不见。\n\n' +
                    '战斗结束，沙滩上一片死寂，所有人都用敬畏的目光看着林墨，而手腕上的印记，又恢复了原本的银白色。\n\n' +
                    '他望向岛心的高塔，那里似乎在夜幕降临前，闪过一道微弱的信号光。',
                review_cache: null
            },
            {
                id: 'ch_seed_2',
                title: '第二章 第一夜',
                word_count: 0,
                outline: '夜幕降临，幸存者聚集。蔚蓝议会雏形出现。岛心信号塔闪烁（伏笔）。苏婉发现医药箱里一瓶无标签药剂（伏笔）。林墨印记再次发光，与信号塔产生共鸣。',
                status: 'draft',
                notes: '测试章节，正文含刻意错误',
                order: 2,
                content: '第二章 第一夜\n\n' +
                    '夜幕降临的很快，海风变得凛冽，幸存者们围着篝火挤成一团，火光映照着每一张疲惫而惊恐的脸。\n\n' +
                    '一个自称"老周"的中年男人站了出来，他用一种不容置疑的口吻说："各位，现在不是慌乱的时候，我们必须组织起来，我提议成立一个临时的管理会，叫蔚蓝议会。"\n\n' +
                    '林墨皱了皱眉，他不喜欢老周那种眼神，但眼下确实需要秩序，便没有反对。\n\n' +
                    '苏婉坐在他身旁，低头整理着那个不知怎么就跟着她一起穿越过来的医药箱，箱子里有一瓶没有标签的淡蓝色药剂，她拿起来对着火光端详了许久，却始终想不起这是从哪来的。\n\n' +
                    '"留着吧，也许有用，"林墨轻声说。\n\n' +
                    '就在这时，远处岛心的方向，那座高塔忽然亮起了一串有节奏的信号光，一短两长，一短两长，像是某种召唤。\n\n' +
                    '林墨手腕上的印记跟着灼热起来，他与那信号之间，仿佛有一根看不见的线在牵动。\n\n' +
                    '"你感觉到了吗，"苏婉紧张地抓住他的袖子。\n\n' +
                    '林墨点了点头，没有说话，他怕自己的判断会让身边的人陷入更大的危险。\n\n' +
                    '老周注意到这边的动静，走过来问："小伙子，你刚才打退了那个怪物，你有什么想法，"\n\n' +
                    '"明天，我想去岛心看看，"林墨斟酌着措辞，"那座塔，可能是我们回去的关键。"\n\n' +
                    '人群里响起一阵窃窃私语，有人支持，有人反对，老周沉吟片刻，拍了拍他的肩膀："好，明天一早出发，我派两个人跟你去。"\n\n' +
                    '夜深了，篝火渐渐暗下去，林墨却怎么也睡不着，他盯着自己手腕上已经恢复暗淡的印记，心想：这到底是什么，为什么会选中我，\n\n' +
                    '而远处的信号塔，依然在一短两长地闪烁着，仿佛在等待什么人的回应。',
                review_cache: null
            }
        ],

        glossary: [
            { id: 'gl_1', name: '林墨', category: '人名', definition: '主角，男，大三学生，冷静理性，觉醒"潮汐感知"能力', aliases: ['墨哥'] },
            { id: 'gl_2', name: '苏婉', category: '人名', definition: '女主，医学院学生，温柔细心', aliases: ['婉儿'] },
            { id: 'gl_3', name: '潮汐岛', category: '地名', definition: '全民穿越后众人降落的初始海岛', aliases: [] },
            { id: 'gl_4', name: '灵晶', category: '物品', definition: '海岛上的能量结晶，驱动一切能力与生存的硬通货', aliases: ['能量结晶'] },
            { id: 'gl_5', name: '潮汐兽', category: '怪物', definition: '海岛上的原生怪物，青色鳞片，弱点在左眼下方的鳞片缺口', aliases: [] },
            { id: 'gl_6', name: '蔚蓝议会', category: '组织', definition: '幸存者自发成立的管理组织，由老周发起', aliases: [] },
            { id: 'gl_7', name: '潮汐感知', category: '能力', definition: '林墨觉醒的能力，可感知潮汐与生物的位置和弱点', aliases: [] }
        ],

        worldview: {
            background: '全球人类被神秘力量传送到随机海岛，被迫求生',
            rules: '每人初始觉醒一项能力；灵晶是硬通货；岛心有神秘高塔每晚闪烁信号',
            timeline: '第1天降临，第2夜信号塔首次闪烁',
            location: '潮汐岛，被薄雾笼罩，岛心有高塔'
        },

        story: {
            marks: {},
            foreshadowing: [
                { id: 'fs_1', title: '林墨手腕的银色印记', desc: '穿越前就存在的印记，会发光，与岛心信号塔共鸣', status: 'open' },
                { id: 'fs_2', title: '岛心信号塔', desc: '每晚一短两长闪烁，似在召唤特定的人', status: 'open' },
                { id: 'fs_3', title: '苏婉的无标签药剂', desc: '医药箱里一瓶淡蓝色药剂，来源不明', status: 'open' }
            ]
        },

        phrase_library: [
            { id: 'ph_1', content: '海浪一波波拍打礁石，咸腥的风裹着水雾扑面而来，远处海天一线，分不清哪里是尽头。', category: '描写', tags: ['海岛', '环境'], source_chapter: '第一章' },
            { id: 'ph_2', content: '"别动。"他压低声音，眼神锐利如刀，"再走一步，你就真的没命了。"', category: '对话', tags: ['紧张', '警告'], source_chapter: '第一章' },
            { id: 'ph_3', content: '他侧身一闪，借势拧腰，拳头破风而出，正中要害，对方甚至来不及发出一声惊呼便倒了下去。', category: '动作', tags: ['战斗', '格斗'], source_chapter: '第一章' },
            { id: 'ph_4', content: '夜色如墨，星光被云层吞没，唯有远处的信号塔在黑暗中一明一灭，像是大地唯一的脉搏。', category: '场景', tags: ['夜晚', '氛围'], source_chapter: '第二章' }
        ],

        api_config: {
            api_url: '',
            api_key: '',
            model: '',
            system_prompt: '',
            temperature: 0.3,
            max_tokens: 4096
        }
    };

    // ==================== console.error 收集（供 AI 读取）====================
    const consoleErrors = [];
    const MAX_ERR = 100;
    const _origError = console.error.bind(console);
    console.error = function(...args) {
        try {
            consoleErrors.push(args.map(a => {
                if (a instanceof Error) return a.message + '\n' + (a.stack || '').split('\n').slice(0, 3).join('\n');
                if (typeof a === 'object') { try { return JSON.stringify(a); } catch(_) { return String(a); } }
                return String(a);
            }).join(' '));
            if (consoleErrors.length > MAX_ERR) consoleErrors.shift();
        } catch(_) {}
        _origError.apply(console, args);
    };

    // ==================== 工具函数 ====================
    function now() { return new Date().toISOString(); }

    function log(msg, level) {
        const tag = '[TestAPI]';
        if (level === 'error') console.log(`${tag} ❌ ${msg}`);
        else if (level === 'warn') console.log(`${tag} ⚠ ${msg}`);
        else console.log(`${tag} ✓ ${msg}`);
    }

    // ==================== 数据读写 ====================
    async function setModule(name, data) {
        return await apiRequest('/api/mod/' + name + '/save', 'POST', data);
    }
    async function getModule(name) {
        return await apiRequest('/api/mod/' + name);
    }

    // ==================== 注入 / 清除 ====================
    async function seedTestData() {
        log('开始注入测试数据...');
        // 重算字数
        SEED.chapters.forEach(ch => {
            ch.word_count = (ch.content || '').replace(/\s/g, '').length;
            ch.review_cache = null; // 重置缓存
        });
        await setModule('chapters', SEED.chapters);
        await setModule('glossary', SEED.glossary);
        await setModule('worldview', SEED.worldview);
        await setModule('story', SEED.story);
        await setModule('phrase_library', SEED.phrase_library);
        // api_config 不覆盖（保留用户已配置的 API）
        const existingApi = await getModule('api_config');
        if (!existingApi || !existingApi.api_url) {
            await setModule('api_config', SEED.api_config);
        }
        log('测试数据已注入：2 章 / ' + SEED.glossary.length + ' 术语 / ' + SEED.phrase_library.length + ' 预设 / 3 伏笔');
        return {
            ok: true,
            summary: {
                chapters: SEED.chapters.length,
                glossary: SEED.glossary.length,
                phrase_library: SEED.phrase_library.length,
                foreshadowing: SEED.story.foreshadowing.length,
                totalWords: SEED.chapters.reduce((s, c) => s + c.word_count, 0)
            },
            seededAt: now()
        };
    }

    async function clearTestData() {
        log('清除测试数据...');
        await setModule('chapters', []);
        await setModule('glossary', []);
        await setModule('worldview', {});
        await setModule('story', { marks: {}, foreshadowing: [] });
        await setModule('phrase_library', []);
        await setModule('review_history', []);
        log('已清除');
        return { ok: true, clearedAt: now() };
    }

    // ==================== 导航 ====================
    function navigateTo(moduleId) {
        if (typeof ModuleRegistry === 'undefined' || !ModuleRegistry.handleNavClick) {
            return { ok: false, error: 'ModuleRegistry 未就绪' };
        }
        ModuleRegistry.handleNavClick(moduleId);
        return { ok: true, moduleId };
    }

    function listModules() {
        if (typeof ModuleRegistry === 'undefined') return [];
        // ModuleRegistry 内部 modules 是私有的，通过 getModulesByGroup 遍历
        const groups = ['pinned', 'world', 'character', 'story', 'writing', 'system'];
        const out = [];
        groups.forEach(g => {
            if (ModuleRegistry.getModulesByGroup) {
                const mods = ModuleRegistry.getModulesByGroup(g) || [];
                mods.forEach(m => out.push({ id: m.id, name: m.name, group: m.group, order: m.order }));
            }
        });
        return out;
    }

    // ==================== 章节访问 ====================
    async function getChapters() { return await getModule('chapters') || []; }
    async function getChapter(id) {
        const chs = await getChapters();
        return chs.find(c => c.id === id) || null;
    }

    // ==================== 审查操作 ====================
    function selectChapter(id) {
        const m = window.ChapterReviewModule;
        if (!m || !m.setTargetChapter) return { ok: false, error: 'ChapterReviewModule 未就绪' };
        m.setTargetChapter(id);
        return { ok: true, chapterId: id };
    }

    async function runReview(chapterId) {
        const m = window.ChapterReviewModule;
        if (!m) return { ok: false, error: 'ChapterReviewModule 未就绪' };
        // 确保模块已加载页面
        const cur = document.getElementById('review-chapter-select');
        if (!cur) navigateTo('chapter_review');
        // 等待 onPageShow 完成
        await new Promise(r => setTimeout(r, 400));
        if (chapterId) selectChapter(chapterId);
        // 检查 API 配置
        const cfg = await getModule('api_config');
        if (!cfg || !cfg.api_url) {
            return { ok: false, error: '未配置 API，请先到「系统 → API 配置」设置 api_url', apiConfig: cfg };
        }
        await new Promise(r => setTimeout(r, 200));
        await m.runReview();
        // 读取结果
        const chs = await getChapters();
        const ch = chapterId ? chs.find(c => c.id === chapterId) : (chs[0] || null);
        const issues = (ch && ch.review_cache && ch.review_cache.issues) || [];
        return {
            ok: true,
            chapterId: ch ? ch.id : null,
            chapterTitle: ch ? ch.title : null,
            issueCount: issues.length,
            issues: issues,
            reviewedAt: now()
        };
    }

    function getReviewIssues() {
        const m = window.ChapterReviewModule;
        if (!m) return [];
        // 从当前 chapter 的 review_cache 读
        return issues_from_module(m);
    }
    function issues_from_module(m) {
        // mod_chapter_review 内部 issues 不直接暴露，从 currentChapter.review_cache 取
        // 通过 DOM 侧栏读取
        const list = document.getElementById('review-issue-list');
        if (!list) return [];
        const items = list.querySelectorAll('.review-issue-item');
        return Array.from(items).map(el => el.textContent.replace(/\s+/g, ' ').trim());
    }

    async function getReviewIssuesForChapter(id) {
        const ch = await getChapter(id);
        if (!ch || !ch.review_cache) return { ok: false, issues: [] };
        return { ok: true, chapterId: id, issues: ch.review_cache.issues || [], issueCount: (ch.review_cache.issues || []).length };
    }

    // ==================== API 配置 ====================
    async function getApiConfig() { return await getModule('api_config'); }
    async function setApiConfig(cfg) {
        const cur = await getModule('api_config') || {};
        const merged = Object.assign({}, cur, cfg);
        await setModule('api_config', merged);
        // 同步到 ApiConfigModule 内存（如果在当前页面）
        if (window.ApiConfigModule && typeof window.ApiConfigModule.loadData === 'function') {
            // 不强制刷新页面，仅刷新内存
        }
        return { ok: true, config: merged };
    }

    // ==================== 通用 eval（方便 AI 调试）====================
    function evalCode(code) {
        try {
            // eslint-disable-next-line no-eval
            const result = eval(code);
            return { ok: true, result };
        } catch(e) {
            return { ok: false, error: e.message, stack: e.stack };
        }
    }

    function getConsoleErrors(clear) {
        const errs = consoleErrors.slice();
        if (clear) consoleErrors.length = 0;
        return errs;
    }

    function version() {
        return {
            app: (typeof localDataManager !== 'undefined' && localDataManager.version) ? localDataManager.version : 'unknown',
            testApi: '3.2.0',
            time: now()
        };
    }

    // ==================== 操作反馈接口（供 AI 改进决策）====================
    // 返回综合状态：当前页面 + 关键 DOM 节点 + 活跃模块数据快照 + 最近错误
    function _safeText(el) {
        try { return (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim(); }
        catch (_) { return ''; }
    }
    function _summaryOf(el, max) {
        const t = _safeText(el);
        return t.length > max ? t.slice(0, max) + '...' : t;
    }

    async function getOperationFeedback(opts) {
        opts = opts || {};
        const maxText = opts.maxText || 200;
        const fb = {
            timestamp: now(),
            url: location.href,
            page: location.hash ? location.hash.slice(1) : '',
            title: document.title
        };

        // 1. 当前活跃页面（page-section 或 dynamic）
        const activeStatic = document.querySelector('.page-section.active');
        const dyn = document.getElementById('page-dynamic-container');
        let activePage = null;
        if (activeStatic) {
            activePage = {
                type: 'static',
                id: activeStatic.id || '',
                visibleText: _summaryOf(activeStatic, maxText),
                childCount: activeStatic.querySelectorAll(':scope > *').length
            };
        } else if (dyn && dyn.children.length > 0) {
            const first = dyn.firstElementChild;
            activePage = {
                type: 'dynamic',
                id: (dyn.dataset && dyn.dataset.moduleId) || (first && first.dataset && first.dataset.moduleId) || '',
                visibleText: _summaryOf(dyn, maxText),
                childCount: dyn.children.length
            };
        }
        fb.activePage = activePage;

        // 2. 活跃模块（侧边栏 nav 当前选中项）
        try {
            const activeNav = document.querySelector('.sidebar-nav .nav-btn.active, .sidebar-nav .active');
            fb.activeModule = activeNav ? {
                id: activeNav.getAttribute('data-module-id') || activeNav.getAttribute('data-id') || '',
                text: _safeText(activeNav).slice(0, 60)
            } : null;
        } catch (_) { fb.activeModule = null; }

        // 3. 关键 DOM 节点统计
        const keyNodes = {};
        const probe = {
            '#review-chapter-select': 'chapterReviewSelect',
            '.CodeMirror': 'codeMirrorEditors',
            '#review-issue-list .review-issue-item': 'reviewIssues',
            '#chapter-list .chapter-item, .chapter-list .chapter-item': 'chapterItems',
            'input[type=text], textarea': 'inputs',
            'button': 'buttons',
            '.modal, .modal-overlay': 'openModals',
            '#toast.show': 'toastVisible',
            '#ai-chat-bar': 'aiChatBar'
        };
        Object.keys(probe).forEach(sel => {
            try {
                const list = document.querySelectorAll(sel);
                keyNodes[probe[sel]] = list.length;
            } catch (_) {}
        });
        fb.keyDomNodes = keyNodes;

        // 4. 活跃模块数据快照（轻量、仅常见模块）
        fb.activeModuleData = {};
        try {
            // 当前章节审查的目标章节
            if (window.ChapterReviewModule && window.ChapterReviewModule.getState) {
                fb.activeModuleData.chapterReview = window.ChapterReviewModule.getState();
            }
        } catch (_) {}
        try {
            // 章节列表快照（仅 id + 标题 + 字数）
            const chs = await getChapters();
            if (Array.isArray(chs) && chs.length > 0) {
                fb.activeModuleData.chapters = chs.slice(0, 30).map(c => ({
                    id: c.id, title: c.title, word_count: c.word_count,
                    status: c.status, hasReview: !!(c.review_cache && c.review_cache.issues)
                }));
                fb.activeModuleData.chaptersTotal = chs.length;
            }
        } catch (_) {}

        // 5. 视口与滚动
        fb.viewport = {
            width: window.innerWidth,
            height: window.innerHeight,
            scrollX: window.scrollX,
            scrollY: window.scrollY,
            mainContentScroll: (function() {
                const mc = document.querySelector('.main-content');
                return mc ? { scrollTop: mc.scrollTop, scrollHeight: mc.scrollHeight, clientHeight: mc.clientHeight } : null;
            })()
        };

        // 6. AI 对话栏状态（若已加载）
        if (window.AiChatBar && typeof window.AiChatBar.getState === 'function') {
            fb.aiChat = window.AiChatBar.getState();
        }

        // 7. 最近错误（不清理）
        fb.recentErrors = (consoleErrors.slice(-5) || []);

        // 8. 可见元素计数（前 N 类，用于判断页面"丰满度"）
        fb.visibleElementCounts = {
            cards: document.querySelectorAll('.card').length,
            listItems: document.querySelectorAll('.item-list > *, .list > *').length,
            tables: document.querySelectorAll('table').length,
            forms: document.querySelectorAll('form').length
        };

        return fb;
    }

    // ==================== 一键自检（AI 友好）====================
    // 用法：await NovelTestAPI.selfCheck() —— 注入数据→刷新当前页→返回状态
    async function selfCheck() {
        const v = version();
        const seed = await seedTestData();
        const mods = listModules();
        return {
            ok: true,
            version: v,
            seeded: seed,
            modulesCount: mods.length,
            modules: mods,
            hint: '注入完成。可调用 navigateTo("chapter_review") 进入审查页，或 await runReview("ch_seed_1") 直接审查第一章。'
        };
    }

    // ==================== 暴露 ====================
    window.NovelTestAPI = {
        // 数据
        seedTestData,
        clearTestData,
        getModule,
        setModule,
        getChapters,
        getChapter,
        getApiConfig,
        setApiConfig,
        // 导航
        navigateTo,
        listModules,
        // 审查
        selectChapter,
        runReview,
        getReviewIssues,
        getReviewIssuesForChapter,
        // 调试
        evalCode,
        getConsoleErrors,
        version,
        selfCheck,
        // 操作反馈接口（供 AI 改进决策）
        getOperationFeedback,
        // 原始 seed 数据（只读参考）
        SEED
    };

    console.log('%c[TestAPI] 测试 API 已就绪 (v3.2.0)', 'color:#10b981;font-weight:bold;');
    console.log('%c[TestAPI] 快速开始：', 'color:#3b82f6;');
    console.log('  await NovelTestAPI.seedTestData()         // 注入测试数据（全民穿越海岛求生 2 章）');
    console.log('  NovelTestAPI.navigateTo("chapter_review")  // 跳转审查页');
    console.log('  await NovelTestAPI.runReview("ch_seed_1")  // 审查第一章（需先配 API）');
    console.log('  NovelTestAPI.getConsoleErrors()            // 读取控制台错误');
    console.log('  await NovelTestAPI.selfCheck()             // 一键自检');
})();
