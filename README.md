# 小说数据管理器 v3.2.0

一个面向小说创作者的多端数据管理工具，帮助作者系统化管理角色、剧情、世界观、章节、术语表等各类创作数据，并内置 AI 写作辅助能力。

## 架构概览

项目采用 **多端共享前端 + 多原生壳** 架构：核心业务逻辑全部用 Web 技术（HTML/CSS/JS）实现，由不同的原生壳包装为桌面应用、原生桌面应用和 Android 应用。

| 端 | 原生壳 | 前端资源 | 入口 |
| --- | --- | --- | --- |
| 桌面（Electron） | Electron 42 | `desktop/www/` | `desktop/main.js` |
| 桌面（Tauri 原生） | Tauri 2 + Rust | 复用 `desktop/www/` | `tauri/src-tauri/src/lib.rs` |
| 开发调试 | Node http server | `desktop/www/` | `desktop/dev_server.js` → http://localhost:8000 |
| Android | Capacitor 5 | `novel_manager_android/www/` | `novel_manager_android/` |

> **说明**：Tauri 壳是 Rust，但仅作原生入口（提供文件对话框、平台识别等原生 API）；主体业务逻辑在前端 JS，不在 Rust。

## 技术栈

- **前端**：原生 HTML/CSS/JavaScript（无构建步骤，零打包工具）
- **桌面壳 1**：Electron 42 + electron-builder
- **桌面壳 2**：Tauri 2（Rust）+ tauri-plugin-dialog/shell
- **移动壳**：Capacitor 5（@capacitor/core、@capacitor/filesystem）
- **开发服务器**：Node.js 原生 `http` 模块（`desktop/dev_server.js`）
- **编辑器**：CodeMirror 5（章节正文审查，CDN 引入）
- **数据存储**：JSON 文件（`data/`）+ 浏览器 localStorage（用户配置）

## 项目结构

```
novel_manager_v3.1.0/
├── desktop/                      # 桌面端（Electron + dev_server 共用）
│   ├── main.js                   # Electron 主进程
│   ├── preload.js                # Electron 预加载（暴露 electronAPI）
│   ├── dev_server.js             # Node 开发服务器 (localhost:8000)
│   ├── package.json              # electron-builder 配置
│   └── www/                      # 前端资源（Electron/Tauri/dev_server 共用）
│       ├── index.html            # 主页面
│       └── static/
│           ├── css/style.css
│           └── js/
│               ├── app.js                # 前端主入口
│               ├── module_registry.js    # 模块注册框架
│               ├── legacy_modules_register.js  # 13 个原生模块注册
│               ├── local_data_manager.js # 本地数据管理
│               ├── ai_chat.js            # AI 对话栏（全局底栏）
│               ├── test_api.js           # 开发测试 API（仅 localhost）
│               ├── tauri_adapter.js      # Tauri 兼容层
│               ├── svg_icon_lib.js       # SVG 图标库
│               ├── desktop_search.js     # 桌面搜索
│               ├── advanced_features.js  # 角色模板等高级功能
│               ├── custom_features.js    # 自定义数据功能
│               ├── v183_features.js      # 地点/关系功能
│               └── modules/              # 18 个功能模块
│                   ├── mod_api_config.js         # AI API 配置
│                   ├── mod_chapter_review.js     # 章节正文审查（AI 增强）
│                   ├── mod_chapters.js           # 章节列表
│                   ├── mod_dark_mode.js          # 主题切换
│                   ├── mod_data_import.js        # 数据导入
│                   ├── mod_fulltext_search.js    # 全文搜索
│                   ├── mod_generators.js         # 生成器
│                   ├── mod_glossary.js           # 术语表
│                   ├── mod_id_manager.js         # ID 管理
│                   ├── mod_inspiration.js        # 灵感库
│                   ├── mod_multi_project.js      # 多项目管理
│                   ├── mod_phrase_library.js     # 短语库
│                   ├── mod_print_export.js       # 打印导出
│                   ├── mod_stats_charts.js       # 数据统计图表
│                   ├── mod_timeline.js           # 时间线
│                   ├── mod_version_history.js    # 版本历史
│                   ├── mod_worldview.js          # 世界观
│                   └── mod_writing_dashboard.js  # 写作仪表盘
├── tauri/                        # Tauri 原生壳
│   └── src-tauri/
│       ├── src/{main.rs,lib.rs}  # Rust 入口（save_file/open_folder/platform）
│       ├── tauri.conf.json       # frontendDist 指向 desktop/www
│       ├── Cargo.toml
│       └── icons/icon.ico
├── novel_manager_android/        # Android 端（Capacitor）
│   ├── capacitor.config.json     # webDir: www
│   ├── package.json
│   └── www/                      # Android 专用前端资源
│       ├── index.html
│       └── static/
│           ├── css/{style.css,mobile.css}
│           └── js/               # 含 mobile_nav.js 等移动端独有文件
├── data/                         # 数据目录（JSON）
│   ├── character.json            # 角色
│   ├── currency.json             # 货币
│   ├── inventory.json            # 背包
│   ├── equipment.json            # 装备
│   ├── equipment_slots.json      # 装备槽位
│   ├── quests.json               # 任务
│   ├── skills.json               # 技能
│   ├── skills_custom.json        # 自定义技能
│   ├── story.json                # 剧情/伏笔
│   ├── map.json                  # 地图地点
│   ├── relationships.json        # 人物关系
│   ├── item_library.json         # 物品库
│   ├── item_categories.json      # 物品分类
│   ├── custom_categories.json    # 自定义分类
│   ├── custom_items.json         # 自定义条目
│   ├── settings.json             # 设置
│   └── backups/                  # 备份（.gitkeep 占位）
├── .gitignore
├── CHANGELOG.md
└── README.md
```

## 功能模块

### 写作核心
- **章节列表** / **章节正文审查**：基于 CodeMirror 的正文编辑器，支持 AI 流式生成、续写、改写、停止生成（阶段 1-3 AI 增强已完成）
- **写作仪表盘**：写作进度统计
- **灵感库** / **短语库**：素材积累
- **生成器**：名字/地点等随机生成

### 世界与设定
- **世界观** / **术语表** / **时间线**：设定管理
- **地图**：地点层级管理
- **关系**：人物关系网络（列表 + Canvas 网络图）

### 角色与剧情
- **角色信息** / **货币** / **背包** / **装备** / **任务** / **技能** / **物品库**：经典 RPG 数据管理
- **剧情**：剧情标记 + 伏笔埋设/回收
- **自定义**：自定义分类与条目

### 系统
- **AI 对话栏**：全局底栏，调用 `mod_api_config` 配置的 LLM
- **AI API 配置**：配置 LLM 接口地址、密钥、模型
- **数据预览** / **打印导出** / **数据导入** / **全文搜索**
- **数据统计图表** / **版本历史** / **多项目** / **ID 管理** / **主题切换**

## 快速开始

### 方式 1：开发服务器（最快，无需安装任何依赖）

```bash
cd desktop
node dev_server.js
```

浏览器打开 http://localhost:8000 即可使用。数据保存在浏览器 localStorage 中。

### 方式 2：Electron 桌面应用

```bash
cd desktop
npm install
npm start                # 运行
npm run build            # 打包为 portable exe（dist/NovelManager-v3.2.0.exe）
```

### 方式 3：Tauri 原生桌面应用

前置：已安装 Rust 工具链（CARGO_HOME/RUSTUP_HOME 已配置在 `G:\code\.cargo` / `G:\code\.rustup`）。

```bash
cd tauri/src-tauri
cargo tauri dev          # 开发模式
cargo tauri build        # 构建 NSIS 安装包
```

### 方式 4：Android 应用（Capacitor）

```bash
cd novel_manager_android
npm install
# 需要 Android Studio + JDK 17
cd android
./gradlew.bat assembleDebug    # 生成 APK
```

## 数据存储

- **业务数据**：`data/*.json`，每个模块一个文件，采用 JSON 格式便于备份迁移
- **用户配置**：浏览器 localStorage（侧边栏分组折叠、收藏、API 配置等）
- **备份**：`data/backups/`（已 gitignore，仅保留 `.gitkeep`）

## AI 功能说明

AI 能力通过 `mod_api_config` 配置外部 LLM 接口（兼容 OpenAI API 格式），支持：

- **章节审查模块**：正文续写、改写、风格调整，SSE 流式输出 + 实时字数 + 中途停止
- **全局 AI 对话栏**：底部固定输入框，向 AI 提问而不污染正文

API 密钥保存在浏览器 localStorage，不会上传到任何第三方服务。

## 构建产物

| 产物 | 路径 | 命令 |
| --- | --- | --- |
| Windows portable exe | `desktop/dist/NovelManager-v3.2.0.exe` | `cd desktop && npm run build` |
| Tauri NSIS 安装包 | `tauri/src-tauri/target/release/bundle/nsis/` | `cd tauri/src-tauri && cargo tauri build` |
| Android APK | `novel_manager_android/android/app/build/outputs/apk/` | `cd novel_manager_android/android && ./gradlew.bat assembleDebug` |

## 版本历史

详见 [CHANGELOG.md](CHANGELOG.md)。

主要版本：
- **v3.2.0**：多端架构重组（Electron + Tauri + Android），18 模块分组导航，AI 章节审查阶段 1-3（流式生成/停止/续写改写）
- **v3.1.0**：物品库独立页面，装备槽位管理修复
- **v3.0.x**：C++ httplib 后端 + 前端 JS（已被当前架构取代）

## 许可证

本项目仅供个人学习和使用。

## 相关链接

- GitHub 仓库：https://github.com/Luoyu-1423/novel-manager
- Wiki：https://github.com/Luoyu-1423/novel-manager/wiki
