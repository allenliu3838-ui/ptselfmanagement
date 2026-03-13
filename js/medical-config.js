/* medical-config.js — Centralized medical thresholds and text constants
 *
 * PURPOSE: Single source of truth for all medical thresholds, dietary advice,
 * and auto-generated question templates used across the app.
 *
 * VERSIONED: Bump MEDICAL_CONFIG_VERSION when content changes.
 * REVIEW: All thresholds should be reviewed by clinical team before release.
 *
 * NOTE: These are population-level defaults. They do NOT account for
 * individual patient context (age, baseline, medications, comorbidities).
 * The app should always display appropriate disclaimers.
 */

var MEDICAL_CONFIG_VERSION = "1.0.0";

// ──────────────────────────────────────────────
// 1. Lab Thresholds (used by trends.js, diet advice, safety signals)
// ──────────────────────────────────────────────

var THRESHOLDS = {
  // Potassium (mmol/L)
  k: {
    dangerHigh: 5.5,   // "严格限钾" trigger
    warnHigh:   5.0,    // "注意控钾" trigger
    warnLow:    3.5,    // "血钾偏低" trigger
  },

  // Phosphorus (mmol/L)
  p: {
    dangerHigh: 1.45,   // "严格限磷" trigger
    warnHigh:   1.3,    // "注意控磷" trigger
  },

  // eGFR (mL/min/1.73m²)
  egfr: {
    lowProteinDiet:  30,  // trigger for 0.6-0.8g/kg protein advice
    moderateProtein: 60,  // trigger for 0.8g/kg protein advice
    monthlyDeclineRate: -2, // mL/min per month = "rapid decline"
  },

  // Blood Pressure (mmHg)
  bp: {
    dangerSys: 140,
    dangerDia: 90,
    targetSys: 130,
    targetDia: 80,
    crisisSys: 180,
    crisisDia: 120,
  },

  // Creatinine (percentage change)
  scr: {
    significantRisePct: 20,  // >20% = "上升明显"
  },

  // Weight (kg)
  weight: {
    significantChangeKg: 2,  // ±2kg = noteworthy
  },
};

// ──────────────────────────────────────────────
// 2. Diet Advice Templates (used by openPersonalDietModal)
// ──────────────────────────────────────────────

var DIET_ADVICE = {
  k_danger: {
    icon: "🔴",
    title: "严格限钾",
    items: [
      "避免：香蕉、橙子、红枣、土豆、番茄、菠菜、蘑菇",
      "建议：苹果、梨、黄瓜、圆白菜、冬瓜",
      "烹饪：蔬菜切小块焯水后再烹调（文献报道可减少部分钾含量，具体效果因食材而异）",
      "提醒：低钠盐含大量钾，肾病患者禁用"
    ]
  },
  k_warn: {
    icon: "🟡",
    title: "注意控钾",
    items: [
      "减少：香蕉、橙汁、干果、坚果的摄入频率",
      "优选：苹果、梨、白菜、冬瓜等低钾蔬果",
      "避免：低钠盐（含氯化钾）"
    ]
  },
  k_normal: {
    icon: "🟢",
    title: "血钾正常",
    items: ["保持均衡饮食，继续监测"]
  },

  p_danger: {
    icon: "🔴",
    title: "严格限磷",
    items: [
      "避免：可乐/碳酸饮料、加工肉类（火腿/香肠）、方便面",
      "减少：内脏类、蛋黄、全谷物",
      "优选：白面、白米、瘦肉（选择新鲜食材而非加工品）",
      "关键：看食品标签，含"磷酸盐"的添加剂吸收率高于天然食物磷"
    ]
  },
  p_warn: {
    icon: "🟡",
    title: "注意控磷",
    items: [
      "减少加工食品和碳酸饮料",
      "优先选择新鲜食材"
    ]
  },

  protein_low_egfr: {
    icon: "🟡",
    title: "低蛋白饮食建议",
    items: [
      "每日蛋白摄入建议 0.6-0.8g/kg 体重（具体请遵医嘱）",
      "优先选择高质量蛋白：蛋清、鱼肉、瘦肉",
      "α-酮酸补充需遵医嘱，不要自行使用",
      "减少植物蛋白（豆类）摄入比例"
    ]
  },
  protein_moderate: {
    icon: "🟡",
    title: "适度控蛋白",
    items: [
      "每日蛋白摄入建议 0.8g/kg 体重（具体请遵医嘱）",
      "避免高蛋白饮食（如大量红肉、蛋白粉）",
      "均衡搭配动物蛋白和植物蛋白"
    ]
  },

  dialysis_diet: {
    icon: "📋",
    title: "透析饮食要点",
    items: [
      "透析患者蛋白需求较高：1.0-1.2g/kg 体重/天（具体请遵医嘱）",
      "每次透析后适当补充优质蛋白",
      "严格控制液体摄入（两次透析之间体重增长<干体重5%）",
      "注意控钾控磷，按医嘱服用磷结合剂"
    ]
  },

  low_salt: {
    icon: "🧂",
    title: "低盐饮食",
    items: [
      "每日盐摄入 <5g（约1茶匙）",
      "避免：腌制食品、咸菜、酱油过多",
      "注意：味精/鸡精也含钠",
      "用醋、柠檬汁、香料替代部分盐分调味"
    ]
  },

  dm_diet: {
    icon: "🍚",
    title: "控糖建议",
    items: [
      "选择低GI主食：糙米饭、全麦面（注意CKD患者需权衡控磷与控糖）",
      "每餐搭配蔬菜、蛋白质，减缓血糖上升",
      "避免含糖饮料和甜食",
      "水果选择低糖种类：草莓、蓝莓（每日限量）"
    ]
  },

  no_data: {
    icon: "💡",
    title: "暂无个性化建议",
    items: [
      "录入化验数据后将自动生成针对性的饮食建议",
      "建议录入：血钾(K)、血磷(P)、eGFR 等指标"
    ]
  }
};

// ──────────────────────────────────────────────
// 3. Visit Prep Question Templates (used by share.js)
//    These are OBSERVATION-based prompts, NOT treatment recommendations.
// ──────────────────────────────────────────────

var VISIT_PREP_QUESTIONS = {
  // Data-triggered questions (softer phrasing, no treatment suggestions)
  egfr_decline: "我注意到 eGFR 有下降趋势，想请医生帮我看看这个变化。",
  k_high:       "最近血钾偏高，除了饮食调整外，还有什么需要注意的？",
  bp_high:      "血压最近控制不太理想，想请医生评估一下。",
  scr_rise:     "肌酐上升比较明显，需要做哪些进一步检查？",
  protein_change: "尿蛋白有变化，想请医生看看是否需要调整方案。",

  // Default questions (always included)
  general_plan:  "我目前的整体管理方案是否需要调整？",
  next_visit:    "下次复诊建议什么时候？需要做哪些检查？",

  // REMOVED: "是否需要开始为透析/移植做准备？"
  // Reason: This is a major medical decision that should be initiated by
  // the treating physician, not prompted by an automated system.
  // Instead, we use a softer observation-based prompt:
  egfr_very_low: "我注意到肾功能指标变化较大，想请医生帮我整体评估一下未来的管理计划。",
};

// ──────────────────────────────────────────────
// 4. Trend Interpretation Templates
// ──────────────────────────────────────────────

var TREND_MESSAGES = {
  egfr: {
    improving:   "eGFR 趋势向好，你的管理在起效果",
    rapidDecline:"eGFR 下降较快，建议复诊时和医生聊聊",
    slowDecline: "eGFR 缓慢变化中，持续观察趋势更重要",
    stable:      "eGFR 保持稳定，这就是你坚持管理的成果",
    rapidAdvice: "建议复诊时与医生讨论，不用太担心，及时沟通最重要",
  },
  scr: {
    significantRise: "肌酐上升明显，建议尽早和医生沟通",
    slightRise:      "肌酐略有波动，继续观察趋势",
    improved:        "肌酐有改善，你的努力在见效",
    riseAdvice:      "肌酐短期变化需关注，建议尽早复诊让医生评估",
  },
  k: {
    dangerHigh: "血钾偏高，需要注意饮食调整",
    warnHigh:   "血钾接近临界值，留意高钾食物",
    warnLow:    "血钾偏低，可适当补充",
    dangerDetail: "高钾需要重视，限制高钾食物并尽快复诊",
  },
  bp: {
    high:      "血压偏高，复诊时可以和医生讨论调整方案",
    improving: "血压在改善中，你的坚持有回报了",
    good:      "血压控制得很好，继续保持",
    needWatch: "血压还需继续观察，坚持记录就是最好的方式",
    highAdvice:"建议复诊时与医生讨论，一起找到更好的控制方案",
  },
  weight: {
    increase: "体重有所上升",
    decrease: "体重有所下降",
    stable:   "体重保持稳定，管理得不错",
    fluctuationNote: "短期体重波动可能反映水钠变化，持续观察更有价值",
  },
};

// ──────────────────────────────────────────────
// 5. Common Disclaimers
// ──────────────────────────────────────────────

var DISCLAIMERS = {
  general:    "以上为数据趋势整理，不是诊断。具体请遵医嘱。",
  diet:       "饮食内容用于健康教育与"避坑提醒"，不替代医生/营养师的个体化方案。",
  visitPrep:  "以上为自动整理，供复诊参考，不替代医生判断。",
  personalDiet: "以上为基于化验数据的通用建议，不替代医生/营养师的个体化方案。具体饮食方案请遵医嘱。",
  redFlag:    "如出现胸痛、呼吸困难、意识改变、抽搐、少尿/无尿、发热伴剧烈腰痛等红旗，请立即就医或联系团队。",
};
