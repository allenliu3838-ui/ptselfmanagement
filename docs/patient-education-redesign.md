# 患者教育系统重构设计文档

> 日期：2026-03-08
> 仓库：ptselfmanagement (kidneyspherefolllowup.cn — 肾域·记录)

---

## 1. 内容 Schema

所有教育内容使用统一 JSON schema (`EducationCard`)：

```typescript
type EducationCard = {
  id: string                          // 唯一标识
  project: string[]                   // 适用项目: kidney | htn | dm | dialysis | stone | peds
  subpath?: string[]                  // 子路径: tx | hd | pd | adpkd
  audience?: 'adult' | 'pediatric' | 'caregiver' | 'all'
  priority: 'p0' | 'p1' | 'p2'
  title: string
  shortSummary: string
  whyItMatters?: string
  keyMetrics?: string[]
  actionToday?: string[]
  avoidOrDont?: string[]
  redFlags?: string[]
  askDoctor?: string[]
  personalization?: string[]
  maturity?: 'standard' | 'adjunct' | 'emerging'
  tags?: string[]
  requiresMedicalReview?: boolean
  reviewerStatus?: 'draft' | 'reviewed' | 'approved'
  updatedAt?: string
  version?: string
}
```

Lab explanation cards add:
- `commonMisconceptions: string[]`
- `whenToRecheck: string[]`
- `cannotTellAlone: string[]`

---

## 2. 规则矩阵

### 冲突闸门

| 场景 | 规则 | 函数 |
|---|---|---|
| 透析/限水 + 泛化"多喝水" | 禁止展示 hydration_general, stone_drink_more | `getDietWarnings()` |
| 儿肾 + 成人阈值 | 警告不能套用成人标准 | `getDietWarnings()`, `getRedFlags()` |
| 移植 + CKD低蛋白 | 禁止展示 ckd_low_protein | `getDietWarnings()` |
| 结石 + 限水 | 饮水按医嘱，不套用多喝水 | `getDietWarnings()` |
| 无化验支持 + 限钾/限磷 | 不主动推送限制建议 | `getDietWarnings()` |
| ADPKD | 强制插入颅内动脉瘤红旗 | `getRedFlags()` |
| 移植 | 强制插入抗排异依从 + 感染/排异红旗 | `getRedFlags()`, `getTopConcerns()` |

### Top Concerns 生成规则

| 项目 | 关注点 1 | 关注点 2 | 关注点 3 |
|---|---|---|---|
| CKD | eGFR 趋势 | UACR/尿蛋白 | 血压控制 |
| 高血压 | 正确测量 | 7天平均 | 何时急诊 |
| 糖尿病 | 血糖记录 | HbA1c 趋势 | 低血糖红旗 |
| 血透 | 透析日任务 | 间期体重增长 | 通路检查 |
| 腹透 | 今日换液 | 出口护理 | 腹透红旗 |
| 移植 | 抗排异药依从 | 血压/体重/尿量 | 感染/排异红旗 |
| 儿肾 | 身高体重趋势 | 今天要做什么 | 不套成人规则 |

---

## 3. 卡片清单

### P0 卡片（15 张）

| ID | 文件 | 标题 | 项目 | 审校状态 |
|---|---|---|---|---|
| ckd_core_metrics | ckd-core.json | 先看这三个：eGFR、尿蛋白、血压 | kidney | draft |
| ckd_single_abnormal | ckd-core.json | 一次异常不等于长期进展 | kidney,htn,dm | draft |
| ckd_medication_safety | ckd-core.json | 用药安全 | kidney,htn,dm,dialysis | draft |
| bp_home_measurement | bp-education.json | 家庭血压测量 | all | draft |
| bp_crisis_redflags | bp-education.json | 血压危急值 | all | draft |
| diet_individualized_principle | diet-individualized.json | 不是所有肾病都要统一限制 | all | draft |
| hd_access_redflags | dialysis-redflags.json | 血透通路红旗 | dialysis(HD) | draft |
| pd_redflags | dialysis-redflags.json | 腹透红旗 | dialysis(PD) | draft |
| tx_adherence_redflags | transplant.json | 移植依从与红旗 | kidney(TX) | draft |
| dm_goals_individualized | diabetes.json | 糖尿病目标个体化 | dm | draft |
| peds_growth_card | pediatric.json | 儿肾成长卡 | peds | draft |
| stone_hydration_safety | stone-adpkd.json | 结石饮水安全 | stone | draft |
| adpkd_specific | stone-adpkd.json | ADPKD特异教育 | kidney(ADPKD) | **requiresMedicalReview** |
| advanced_marker_maturity | advanced-markers.json | 高级指标成熟度 | kidney | **requiresMedicalReview** |
| vaccine_reminder | vaccines.json | 疫苗提醒 | kidney,dialysis | **requiresMedicalReview** |

### Lab Explanation 卡片（4 张）

| ID | 标题 | 审校 |
|---|---|---|
| lab_creatinine_egfr | 肌酐与 eGFR | draft |
| lab_uacr_proteinuria | UACR 与尿蛋白 | draft |
| lab_electrolytes | 电解质（钾、磷等） | draft |
| lab_hba1c_glucose | HbA1c 与血糖 | draft |

---

## 4. 页面接入点

| 页面 | 接入方式 | 函数 |
|---|---|---|
| 首页 | "最该关注的3件事"卡 + 红旗卡 + 饮食理由标签 | `renderTopConcerns()`, `renderRedFlagsEdu()`, `renderDietReasons()` |
| 随访指南 | 教育卡片 + 红旗区块 | `renderFollowup()` 内调用引擎 |
| 饮食中心 | 个体化冲突警告 + "为什么看到这条" | `renderDietModal()` 内调用引擎 |
| 检查说明 | 统一结构（常见误解 + 不能单独说明什么） | `renderExplainPage()` 查找 lab card |
| AI 助手 | 数据依据 + 触发规则展示 | `buildAIEvidence()`, `buildTriggeredRules()` |
| 知识推荐 | 配置驱动教育卡片渲染 | `renderEducationCards()` |

---

## 5. 待临床审校项

以下内容标记为 `requiresMedicalReview: true`：

1. **ADPKD 特异教育卡** — 颅内动脉瘤风险比例、饮水策略细节
2. **高级指标成熟度卡** — 各指标的分类是否准确
3. **疫苗提醒卡** — 各阶段疫苗推荐的准确性

以下内容为 `reviewerStatus: "draft"`，建议经临床团队审核后改为 "reviewed"：
- 所有 15 张 P0 教育卡片
- 所有 4 张检查说明卡片

---

## 6. 架构

```
content/education/
├── ckd-core.json           # CKD 核心 (3 cards)
├── bp-education.json       # 血压 (2 cards)
├── diet-individualized.json # 饮食个体化 (1 card)
├── dialysis-redflags.json  # 透析红旗 (2 cards)
├── transplant.json         # 移植 (1 card)
├── diabetes.json           # 糖尿病 (1 card)
├── pediatric.json          # 儿肾 (1 card)
├── stone-adpkd.json        # 结石/ADPKD (2 cards)
├── advanced-markers.json   # 高级指标 (1 card)
├── vaccines.json           # 疫苗 (1 card)
└── lab-explanations.json   # 检查说明 (4 cards)

js/
├── educationEngine.js      # 规则引擎 (纯函数)
└── educationContent.js     # 内容加载器 (XHR)

tests/
└── educationEngine.test.js # 58 个单元测试
```

---

## 7. 后续扩展

- P1 卡片：肾小球病复发、激素教育、家属协助、复诊准备、检查前准备
- 医生审稿系统：通过 reviewerStatus 字段管理审核流程
- 内容版本管理：通过 version + updatedAt 字段追踪
- 多语言：schema 支持，当前为中文
