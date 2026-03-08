/* educationEngine.js — Personalized education rules engine
 *
 * Pure-function layer: no DOM, no state mutation, no side effects.
 * All functions take explicit inputs and return data.
 *
 * Usage:
 *   const profile = getEducationProfile(state);
 *   const cards   = getEducationCards(profile, EDUCATION_CARDS);
 *   const diet    = getDietWarnings(profile);
 *   const flags   = getRedFlags(profile);
 *   const top3    = getTopConcerns(profile, state);
 */

// ──────────────────────────────────────────────
// 1. Education Profile
// ──────────────────────────────────────────────

function getEducationProfile(st) {
  var ep = st.enabledPrograms || {};
  var kidney = st.kidney || {};
  var dialysis = st.dialysis || {};
  var peds = st.peds || {};
  var stone = st.stone || {};
  var dm = st.dm || {};
  var comorbid = st.comorbid || {};
  var lab = _latestLabFromState(st);

  return {
    // Enabled projects
    programs: {
      kidney:   !!ep.kidney,
      htn:      !!ep.htn,
      dm:       !!ep.dm,
      dialysis: !!ep.dialysis,
      stone:    !!ep.stone,
      peds:     !!ep.peds
    },
    activeProgram: st.activeProgram || "kidney",

    // Kidney specifics
    kidneyTrack:        kidney.track || "unknown",
    glomerularSubtype:  kidney.glomerularSubtype || "unknown",
    isTransplant:       kidney.track === "tx",
    isADPKD:            kidney.glomerularSubtype === "adpkd" || kidney.track === "adpkd",

    // Dialysis specifics
    dialysisModality:   dialysis.modality || "hd",
    isFluidRestricted:  dialysis.fluidRestricted === "true" || stone.fluidRestricted === "true" || !!comorbid.hf,

    // Pediatric
    isPediatric:        !!ep.peds,

    // Comorbidities
    hasHypertension:    !!ep.htn || !!comorbid.htn,
    hasDiabetes:        !!ep.dm || !!comorbid.dm,
    hasHeartFailure:    !!comorbid.hf,
    hasStone:           !!ep.stone,

    // Latest labs (for evidence-based filtering)
    latestLab: lab,
    hasHighK:   lab && _toNum(lab.k) !== null && _toNum(lab.k) >= 5.5,
    hasHighP:   lab && _toNum(lab.p) !== null && _toNum(lab.p) >= 1.6,
    hasLowNa:   lab && _toNum(lab.na) !== null && _toNum(lab.na) < 130,
    hasLabData: !!lab
  };
}

// ──────────────────────────────────────────────
// 2. Card Filtering — getEducationCards(profile, allCards)
// ──────────────────────────────────────────────

function getEducationCards(profile, allCards) {
  if (!Array.isArray(allCards)) return [];
  return allCards.filter(function(card) {
    return _cardMatchesProfile(card, profile);
  }).sort(function(a, b) {
    return _priorityRank(a.priority) - _priorityRank(b.priority);
  });
}

function _cardMatchesProfile(card, profile) {
  // Check project match
  if (!Array.isArray(card.project) || card.project.length === 0) return true;
  var hasMatchingProject = card.project.some(function(proj) {
    if (proj === "kidney") return profile.programs.kidney;
    if (proj === "htn")    return profile.programs.htn || profile.hasHypertension;
    if (proj === "dm")     return profile.programs.dm || profile.hasDiabetes;
    if (proj === "dialysis") return profile.programs.dialysis;
    if (proj === "stone")  return profile.programs.stone || profile.hasStone;
    if (proj === "peds")   return profile.programs.peds;
    return false;
  });
  if (!hasMatchingProject) return false;

  // Check subpath match (e.g., tx, hd, pd, adpkd)
  if (Array.isArray(card.subpath) && card.subpath.length > 0) {
    var subpathMatch = card.subpath.some(function(sp) {
      if (sp === "tx")    return profile.isTransplant;
      if (sp === "hd")    return profile.programs.dialysis && profile.dialysisModality === "hd";
      if (sp === "pd")    return profile.programs.dialysis && profile.dialysisModality === "pd";
      if (sp === "adpkd") return profile.isADPKD;
      return false;
    });
    if (!subpathMatch) return false;
  }

  // Check audience
  if (card.audience === "pediatric" && !profile.isPediatric) return false;
  if (card.audience === "adult" && profile.isPediatric) return false;

  return true;
}

function _priorityRank(p) {
  if (p === "p0") return 0;
  if (p === "p1") return 1;
  if (p === "p2") return 2;
  return 3;
}

// ──────────────────────────────────────────────
// 3. Diet Warnings — Conflict Gates
// ──────────────────────────────────────────────

function getDietWarnings(profile) {
  var warnings = [];

  // GATE 1: Dialysis / fluid restriction → suppress generic "drink more water"
  if (profile.programs.dialysis || profile.isFluidRestricted) {
    warnings.push({
      id: "suppress_hydration",
      type: "suppress",
      message: "你有限水/透析相关设置，普通'多喝水'建议已被过滤。饮水量请遵医嘱。",
      reason: profile.programs.dialysis ? "因为你启用了透析项目" : "因为你设置了限水",
      suppress: ["hydration_general", "stone_drink_more"]
    });
  }

  // GATE 2: Pediatric → suppress adult dietary restriction language
  if (profile.isPediatric) {
    warnings.push({
      id: "peds_diet_caution",
      type: "context",
      message: "儿童的饮食建议需要营养师指导，不能直接套用成人限制方案。严格限制可能影响生长发育。",
      reason: "因为你当前是儿肾项目"
    });
  }

  // GATE 3: Transplant → suppress generic low-protein CKD advice
  if (profile.isTransplant) {
    warnings.push({
      id: "tx_protein_caution",
      type: "suppress",
      message: "移植后通常需要充足蛋白摄入（而非限制蛋白）。饮食方案请咨询营养师。",
      reason: "因为你是肾移植后状态",
      suppress: ["ckd_low_protein"]
    });
    warnings.push({
      id: "tx_food_safety",
      type: "context",
      message: "移植后免疫力降低，应避免生食、未煮熟的肉蛋奶、未洗净的水果蔬菜。",
      reason: "因为你是肾移植后状态"
    });
  }

  // GATE 4: Stone + fluid restricted → hydration conflict
  if (profile.hasStone && profile.isFluidRestricted) {
    warnings.push({
      id: "stone_fluid_conflict",
      type: "conflict",
      message: "你同时有结石和限水设置。饮水量请以限水医嘱为准，不要套用普通结石补水建议。由医生设定优先级。",
      reason: "因为你同时有结石和限水医嘱"
    });
  }

  // GATE 5: No lab support for K/P restriction → don't push restriction
  if (!profile.hasHighK) {
    warnings.push({
      id: "no_k_restriction_needed",
      type: "info",
      message: "你最近的血钾正常，不需要严格限钾。保持均衡饮食即可。",
      reason: profile.hasLabData ? "因为你最近的血钾在正常范围" : "因为没有最近的血钾化验支持限钾"
    });
  }
  if (!profile.hasHighP) {
    warnings.push({
      id: "no_p_restriction_needed",
      type: "info",
      message: "你最近的血磷正常，不需要严格限磷。",
      reason: profile.hasLabData ? "因为你最近的血磷在正常范围" : "因为没有最近的血磷化验支持限磷"
    });
  }

  return warnings;
}

// Check if a specific diet advice ID should be suppressed
function isDietSuppressed(adviceId, warnings) {
  for (var i = 0; i < warnings.length; i++) {
    if (warnings[i].type === "suppress" && Array.isArray(warnings[i].suppress)) {
      if (warnings[i].suppress.indexOf(adviceId) >= 0) return true;
    }
  }
  return false;
}

// ──────────────────────────────────────────────
// 4. Red Flags — Profile-aware
// ──────────────────────────────────────────────

function getRedFlags(profile) {
  var flags = [];

  // Universal BP red flag
  if (profile.hasHypertension || profile.programs.kidney) {
    flags.push({
      id: "bp_crisis",
      priority: "p0",
      title: "血压危急值",
      summary: "血压 ≥180/120 伴头痛/胸痛/视物模糊 → 急诊",
      project: "通用"
    });
  }

  // Dialysis: PD peritonitis
  if (profile.programs.dialysis && profile.dialysisModality === "pd") {
    flags.push({
      id: "pd_peritonitis",
      priority: "p0",
      title: "腹透红旗：引流液浑浊/腹痛/发热",
      summary: "疑似腹膜炎 → 立即联系透析团队",
      project: "透析(腹透)"
    });
  }

  // Dialysis: HD access
  if (profile.programs.dialysis && profile.dialysisModality === "hd") {
    flags.push({
      id: "hd_access",
      priority: "p0",
      title: "血透通路红旗：发热/发红/疼痛/震颤消失",
      summary: "通路感染或失功 → 立即联系透析中心",
      project: "透析(血透)"
    });
  }

  // Transplant
  if (profile.isTransplant) {
    flags.push({
      id: "tx_rejection",
      priority: "p0",
      title: "移植排异/感染红旗",
      summary: "发热/尿量减少/肌酐升高/移植肾区痛 → 联系移植团队",
      project: "移植"
    });
  }

  // ADPKD
  if (profile.isADPKD) {
    flags.push({
      id: "adpkd_aneurysm",
      priority: "p0",
      title: "ADPKD：突发爆炸样/雷击样头痛",
      summary: "可能颅内动脉瘤破裂 → 立即拨打 120",
      project: "ADPKD"
    });
  }

  // High potassium
  if (profile.hasHighK) {
    flags.push({
      id: "high_k",
      priority: "p0",
      title: "血钾偏高",
      summary: "伴心悸/胸闷/乏力 → 紧急就医",
      project: "通用"
    });
  }

  // Diabetes: hypoglycemia
  if (profile.hasDiabetes) {
    flags.push({
      id: "hypoglycemia",
      priority: "p0",
      title: "低血糖识别",
      summary: "出汗/心慌/手抖/意识模糊 → 立即进食 15g 碳水并复测",
      project: "糖尿病"
    });
  }

  // Pediatric: no adult thresholds
  if (profile.isPediatric) {
    flags.push({
      id: "peds_no_adult_thresholds",
      priority: "p0",
      title: "儿童不能用成人标准",
      summary: "血压/eGFR/营养需求需按年龄/百分位判断",
      project: "儿肾"
    });
  }

  return flags;
}

// ──────────────────────────────────────────────
// 5. Top Concerns — "你现在最该关注的 3 件事"
// ──────────────────────────────────────────────

function getTopConcerns(profile, st) {
  var concerns = [];

  // CKD / Glomerular disease (not transplant, not dialysis, not peds — those have their own)
  if (profile.programs.kidney && !profile.isPediatric && !profile.programs.dialysis && !profile.isTransplant) {
    concerns.push({ id: "ckd_egfr",   title: "eGFR 趋势", detail: "关注肾功能变化方向", icon: "🔬" });
    concerns.push({ id: "ckd_uacr",   title: "UACR/尿蛋白", detail: "蛋白尿是肾损伤的独立信号", icon: "🧪" });
    concerns.push({ id: "ckd_bp",     title: "血压控制", detail: "每天测量，看平均趋势", icon: "💓" });
  }

  // Hypertension primary
  if (profile.programs.htn && !profile.programs.kidney) {
    concerns.push({ id: "htn_measure", title: "正确测量血压", detail: "上臂式、静坐5分钟、连测2次", icon: "💓" });
    concerns.push({ id: "htn_avg",     title: "最近 7 天平均", detail: "看平均趋势，不要只看最高值", icon: "📊" });
    concerns.push({ id: "htn_when",    title: "何时紧急就医", detail: "≥180/120 + 头痛/胸痛 → 急诊", icon: "🚨" });
  }

  // Diabetes primary
  if (profile.programs.dm) {
    concerns.push({ id: "dm_record",  title: "血糖记录", detail: "标注时间点（空腹/餐后/睡前）", icon: "📝" });
    concerns.push({ id: "dm_a1c",     title: "HbA1c 趋势", detail: "长期控糖看这个，目标因人而异", icon: "📈" });
    concerns.push({ id: "dm_hypo",    title: "低血糖红旗", detail: "出汗/心慌/手抖 → 立即进食碳水", icon: "🚨" });
  }

  // Dialysis
  if (profile.programs.dialysis) {
    if (profile.dialysisModality === "hd") {
      concerns.push({ id: "dial_task",   title: "透析日任务", detail: "透前/透后体重、血压、超滤量", icon: "📋" });
      concerns.push({ id: "dial_weight", title: "间期体重增长", detail: "控制在干体重 3-5% 以内", icon: "⚖️" });
      concerns.push({ id: "dial_access", title: "通路检查", detail: "看/摸/听，发热发红疼痛 → 紧急联系", icon: "🚨" });
    } else {
      concerns.push({ id: "pd_exchange", title: "今日换液", detail: "记录引流液颜色、量", icon: "📋" });
      concerns.push({ id: "pd_exit",     title: "出口护理", detail: "检查出口部位红肿/渗液", icon: "👀" });
      concerns.push({ id: "pd_redflag",  title: "腹透红旗", detail: "浑浊/腹痛/发热 → 立即联系", icon: "🚨" });
    }
  }

  // Transplant
  if (profile.isTransplant) {
    concerns.push({ id: "tx_meds",    title: "抗排异药依从", detail: "今天按时吃药了吗？", icon: "💊" });
    concerns.push({ id: "tx_vitals",  title: "血压/体重/尿量", detail: "每日记录，观察变化", icon: "📊" });
    concerns.push({ id: "tx_redflag", title: "感染/排异红旗", detail: "发热/尿量减少/肌酐升高 → 联系团队", icon: "🚨" });
  }

  // Pediatric
  if (profile.isPediatric) {
    concerns.push({ id: "peds_growth",   title: "身高体重趋势", detail: "看生长曲线方向", icon: "📏" });
    concerns.push({ id: "peds_guardian",  title: "今天要做什么", detail: "测量、记录、观察症状", icon: "📝" });
    concerns.push({ id: "peds_noadult",   title: "不套成人规则", detail: "血压/eGFR/营养目标不同", icon: "⚠️" });
  }

  // ADPKD (add to existing concerns)
  if (profile.isADPKD) {
    concerns.push({ id: "adpkd_headache", title: "突发头痛红旗", detail: "雷击样头痛 → 立即急救", icon: "🚨" });
  }

  // Stone
  if (profile.hasStone && !profile.programs.dialysis) {
    concerns.push({ id: "stone_water", title: "分次饮水", detail: profile.isFluidRestricted ? "限水优先，遵医嘱" : "全天分次补水 2-3L", icon: "💧" });
  }

  // Take top 3 (de-duplicated, priority to project-specific)
  var seen = {};
  var result = [];
  for (var i = 0; i < concerns.length && result.length < 3; i++) {
    if (!seen[concerns[i].id]) {
      seen[concerns[i].id] = true;
      result.push(concerns[i]);
    }
  }
  return result;
}

// ──────────────────────────────────────────────
// 6. Diet Reason Tag — "为什么你看到这条"
// ──────────────────────────────────────────────

function getDietReasonTag(dietTagKey, profile) {
  var reasons = {
    lowNa:       profile.hasHypertension ? "因为你有高血压" : "因为你有心血管相关合并症",
    lowK:        profile.hasHighK ? "因为你最近的血钾偏高" : "因为你有 CKD 相关高钾风险",
    lowP:        profile.hasHighP ? "因为你最近的血磷偏高" : "因为你有 CKD 相关磷代谢风险",
    lowSugar:    "因为你有糖尿病或血糖偏高",
    fluidLimit:  profile.programs.dialysis ? "因为你启用了透析项目" : (profile.hasHeartFailure ? "因为你有心衰" : "因为你设置了限水"),
    caMbd:       "因为你有钙磷代谢异常相关化验",
    foodSafety:  "因为你是肾移植后状态",
    drugFood:    "因为移植后有药食相互作用风险"
  };
  return reasons[dietTagKey] || "";
}

// ──────────────────────────────────────────────
// 7. AI Evidence Builder
// ──────────────────────────────────────────────

function buildAIEvidence(st) {
  var evidence = [];
  var lab = _latestLabFromState(st);

  if (lab) {
    var fields = [
      { key: "cr",    label: "肌酐",    unit: "μmol/L" },
      { key: "egfr",  label: "eGFR",    unit: "mL/min/1.73m²" },
      { key: "k",     label: "血钾",    unit: "mmol/L" },
      { key: "p",     label: "血磷",    unit: "mmol/L" },
      { key: "na",    label: "血钠",    unit: "mmol/L" },
      { key: "alb",   label: "白蛋白",  unit: "g/L" },
      { key: "hba1c", label: "HbA1c",   unit: "%" },
      { key: "upcr",  label: "UPCR",    unit: "mg/g" },
      { key: "upro24", label: "24h尿蛋白", unit: "g/d" }
    ];

    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      var val = _toNum(lab[f.key]);
      if (val !== null) {
        evidence.push({
          label: f.label,
          value: val,
          unit: f.unit,
          date: lab.date || "未知日期"
        });
      }
    }
  }

  // Latest BP
  var bpArr = (st.vitals && st.vitals.bp) || [];
  if (bpArr.length > 0) {
    var lastBP = bpArr[bpArr.length - 1];
    evidence.push({
      label: "最近血压",
      value: (lastBP.sys || "?") + "/" + (lastBP.dia || "?"),
      unit: "mmHg",
      date: (lastBP.dateTime || "").substring(0, 10) || "未知日期"
    });
  }

  // Latest glucose
  var gluArr = (st.vitals && st.vitals.glucose) || [];
  if (gluArr.length > 0) {
    var lastGlu = gluArr[gluArr.length - 1];
    evidence.push({
      label: "最近血糖",
      value: lastGlu.value || "?",
      unit: (lastGlu.unit === "mgdl" ? "mg/dL" : "mmol/L"),
      date: (lastGlu.dateTime || "").substring(0, 10) || "未知日期"
    });
  }

  return evidence;
}

function buildTriggeredRules(profile) {
  var rules = [];

  if (profile.hasHighK)         rules.push("血钾偏高 → 限钾饮食提醒已激活");
  if (profile.hasHighP)         rules.push("血磷偏高 → 控磷饮食提醒已激活");
  if (profile.isFluidRestricted) rules.push("限水设置 → 饮水建议已调整为限水模式");
  if (profile.isTransplant)     rules.push("移植后 → 抗排异依从 + 感染/排异红旗已前置");
  if (profile.isADPKD)          rules.push("ADPKD → 突发头痛红旗已前置");
  if (profile.isPediatric)      rules.push("儿肾 → 已禁用成人固定阈值");
  if (profile.programs.dialysis) {
    if (profile.dialysisModality === "pd") rules.push("腹透 → 腹膜炎红旗已前置");
    else rules.push("血透 → 通路红旗已前置");
  }

  return rules;
}

// ──────────────────────────────────────────────
// 8. Marker Maturity Labels
// ──────────────────────────────────────────────

var MARKER_MATURITY = {
  "anti-PLA2R":   { maturity: "standard",  label: "标准",  badge: "ok",     note: "膜性肾病确诊与监测的标准血清学指标" },
  "anti-THSD7A":  { maturity: "standard",  label: "标准",  badge: "ok",     note: "膜性肾病少见亚型的标准指标" },
  "DSA":          { maturity: "standard",  label: "标准",  badge: "ok",     note: "移植排异监测的标准指标" },
  "dd-cfDNA":     { maturity: "adjunct",   label: "辅助",  badge: "info",   note: "移植排异的辅助监测指标，与活检互补" },
  "anti-nephrin": { maturity: "emerging",  label: "探索中", badge: "warn",   note: "微小病变/FSGS 的新兴标志物，临床验证中" },
  "dsDNA":        { maturity: "standard",  label: "标准",  badge: "ok",     note: "狼疮肾炎活动性的标准指标" },
  "C3":           { maturity: "standard",  label: "标准",  badge: "ok",     note: "补体消耗，常见于狼疮/MPGN 等" },
  "C4":           { maturity: "standard",  label: "标准",  badge: "ok",     note: "补体消耗，常见于狼疮" },
  "sPLA2R":       { maturity: "adjunct",   label: "辅助",  badge: "info",   note: "可溶性 PLA2R，部分中心用于监测膜性" },
  "suPAR":        { maturity: "emerging",  label: "探索中", badge: "warn",   note: "FSGS 相关生物标志物，尚在研究中" }
};

function getMarkerMaturity(markerName) {
  return MARKER_MATURITY[markerName] || { maturity: "unknown", label: "未分类", badge: "info", note: "暂无分类信息" };
}

// ──────────────────────────────────────────────
// 9. Internal Helpers (pure, no global state access)
// ──────────────────────────────────────────────

function _latestLabFromState(st) {
  if (!st.labs || st.labs.length === 0) return null;
  var sorted = st.labs.slice().sort(function(a, b) {
    return (a.date || "").localeCompare(b.date || "");
  });
  return sorted[sorted.length - 1];
}

function _toNum(v) {
  if (v === null || v === undefined || v === "") return null;
  var n = Number(v);
  return isNaN(n) ? null : n;
}

// ──────────────────────────────────────────────
// 10. Education Card Registry (loaded at runtime)
// ──────────────────────────────────────────────

var EDUCATION_CARDS = [];

function registerEducationCards(cards) {
  if (Array.isArray(cards)) {
    EDUCATION_CARDS = EDUCATION_CARDS.concat(cards);
  }
}

function getAllEducationCards() {
  return EDUCATION_CARDS;
}

// ──────────────────────────────────────────────
// 11. Lab Explanation Cards Registry
// ──────────────────────────────────────────────

var LAB_EXPLANATION_CARDS = [];

function registerLabExplanations(cards) {
  if (Array.isArray(cards)) {
    LAB_EXPLANATION_CARDS = LAB_EXPLANATION_CARDS.concat(cards);
  }
}

function getLabExplanations(profile) {
  return LAB_EXPLANATION_CARDS.filter(function(card) {
    return _cardMatchesProfile(card, profile);
  });
}
