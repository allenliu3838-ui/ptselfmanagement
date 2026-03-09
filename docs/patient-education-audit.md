# 患者教育系统现状审计

> 审计日期：2026-03-08
> 仓库：ptselfmanagement (kidneyspherefolllowup.cn — 肾域·记录)

---

## 1. 技术栈识别

| 层 | 技术 |
|---|---|
| 前端框架 | 无框架，Vanilla JS SPA |
| 路由 | 自定义 `navigate(pageKey)` + `currentTabKey` + overlay 模式 |
| 状态管理 | 全局 `state` 对象 + `loadState()` / `saveState()` (localStorage) |
| 数据持久化 | localStorage (主状态) + IndexedDB (文档/附件 via `js/db.js`) |
| 内容来源 | **全部硬编码** — `js/constants.js` (KNOWLEDGE_CARDS / EXPLAINERS / FOOD_DB / DIET_GUIDES 等) |
| 构建 | 无构建步骤，直接 Netlify 静态部署 |
| PWA | `sw.js` + `manifest.json`，网络优先缓存策略 |

---

## 2. 页面与模块映射

| 模块 | 主文件 | 关键函数/区域 | 说明 |
|---|---|---|---|
| 首页 | `index.html` #pageHome + `js/render.js` renderHome() | 今日任务、安全信号、饮食提醒、快速开始 | 有安全信号前置但不够突出 |
| 随访指南 | `index.html` #pageFollowup + `js/render.js` renderFollowup() | 项目切换、每日任务、趋势图、知识卡 | 内容来自 TASKS / KNOWLEDGE_CARDS |
| 饮食中心 | `js/diet.js` | renderDietLibrary(), renderDietGuide(), renderDietFoodDetail() | FOOD_DB + DIET_GUIDES 硬编码 |
| 检查说明 | `js/render.js` renderExplainer() | EXPLAINERS 常量 | 结构较简单，无统一模板 |
| 红旗分诊 | `js/programs.js` safetySignals() | 首页 renderSafety() 调用 | 基于化验值 + 生命体征触发 |
| AI 随访助手 | `js/ai.js` | handleAIChat(), generateAIResponse() | 规则拼接 + 黑箱结论，无原始值展示 |
| 项目配置 | `js/modals.js` renderProfileModal() | 6 个项目开关 + 子配置 | 配置完整但未联动内容层 |
| 复诊摘要 | `js/summary.js` renderSummary() | 30天/7天切换，复制/打印 | P0-2 新增模块 |
| 资料库 | `js/modals.js` openDocsVault() | 文档上传/查看 | Overlay 页面 |
| 高级监测 | `js/modals.js` | dd-cfDNA / DSA / anti-PLA2R 等 | 无成熟度标注 |

---

## 3. 风险扫描

### 3.1 泛化内容 — 缺乏个体化

| 问题 | 位置 | 严重度 |
|---|---|---|
| 饮食建议不分项目：限钾/限磷建议推给所有用户 | `FOOD_DB` / `DIET_GUIDES` (constants.js) | **高** |
| "多喝水"类建议未排除透析/限水用户 | `DIET_GUIDES` stone 相关 | **高** |
| 血压阈值用成人固定值(180/120)，儿肾无百分位 | `safetySignals()` (programs.js:158-165) | **高** |
| 知识卡 KNOWLEDGE_CARDS 按 tags 过滤，但大部分内容是泛化的 | constants.js:500-622 | **中** |
| EXPLAINERS 不区分透析/移植/儿肾 | constants.js:630+ | **中** |

### 3.2 潜在冲突教育

| 冲突场景 | 现状 | 风险 |
|---|---|---|
| 透析限水 + 结石多喝水 | `safetySignals()` 有提示但饮食中心未拦截 | 饮食页面仍可能展示"多喝水" |
| 儿肾 + 成人血压/eGFR阈值 | render.js 有 note 提醒但阈值仍是成人标准 | 用户可能误读 |
| 移植 + 普通CKD低蛋白饮食建议 | 饮食中心无区分 | 移植后需营养支持非限制蛋白 |
| ADPKD + 统一饮水建议 | 无ADPKD特异逻辑 | Tolvaptan用户等需个体化 |

### 3.3 红旗前置不足

| 场景 | 现状 |
|---|---|
| 移植排异/感染红旗 | 无专门红旗卡，靠用户主动进入知识库 |
| ADPKD 突发头痛 | 无专门红旗卡 |
| 血透通路感染 | 无专门红旗卡 (仅腹透有) |
| 血压危急值 | safetySignals() 有但无单独教育卡 |
| 低血糖 | safetySignals() 有但无详细教育卡 |

### 3.4 AI 输出问题

| 问题 | 位置 |
|---|---|
| AI 结论无原始值/日期/单位佐证 | `js/ai.js` generateAIResponse() |
| 触发规则不透明 | 用户看不到"为什么推荐这条" |
| 无 fallback 安全兜底 | 部分路径缺少"建议联系医生"兜底 |

### 3.5 重复维护

| 内容 | 重复位置 |
|---|---|
| 血压教育 | KNOWLEDGE_CARDS + EXPLAINERS + renderFollowup() 硬编码 |
| 透析红旗 | safetySignals() + KNOWLEDGE_CARDS + renderFollowup() |
| 饮食限制规则 | dietSignals() + DIET_GUIDES 文案 + renderHome() |

---

## 4. 现有问题清单

1. **P0**: 所有教育内容硬编码在 constants.js (65KB)，不可维护
2. **P0**: 饮食建议泛化，无项目隔离（透析/限水/移植/儿肾）
3. **P0**: 核心指标（eGFR/UACR/BP）在首页不够显性
4. **P0**: 高风险红旗未前置（移植/ADPKD/通路/血压危急值）
5. **P0**: AI 输出是黑箱结论
6. **P1**: 检查说明页结构不统一，无"常见误解"和"不能单独说明什么"
7. **P1**: 儿肾复用成人阈值
8. **P1**: 高级指标无成熟度标注

---

## 5. 改造文件清单

### 新增文件
| 文件 | 用途 |
|---|---|
| `content/education/*.json` | 配置驱动教育卡片 (按病种拆分) |
| `js/educationEngine.js` | 个体化规则引擎 + 内容注册表 |
| `tests/educationEngine.test.js` | 规则引擎单元测试 |
| `docs/patient-education-redesign.md` | 重构设计文档 |

### 修改文件
| 文件 | 改动 |
|---|---|
| `js/render.js` | 首页"最关注3件事"、随访指南接入配置内容 |
| `js/diet.js` | 饮食中心个体化过滤 + "为什么看到这条" |
| `js/ai.js` | AI 输出增加原始值/规则透明 |
| `js/modals.js` | 检查说明统一结构 |
| `js/programs.js` | safetySignals() 扩展红旗 |
| `index.html` | 新增首页教育区块 |
| `style.css` | 教育卡片统一样式 |
| `sw.js` | 新增 content/ 文件缓存 |

---

## 6. 推荐改造顺序

1. 建立内容 schema + 内容文件（解耦基础）
2. 建立规则引擎（个体化核心）
3. 改首页（用户第一印象）
4. 改随访指南（接入配置内容）
5. 改饮食中心（冲突消除）
6. 改检查说明（结构统一）
7. 改 AI 输出（透明化）
8. 补测试
9. 补文档
