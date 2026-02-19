/* tasks.js - Daily task generation (todayTasks) */
function todayTasks(){
  const prog = state.activeProgram;
  const dateStr = yyyyMMdd(new Date());
  const k = ensureTaskDateKey();
  const doneMap = state.tasksDone[k] || {};
  const tasks = [];

  const act = (label, onClick) => ({ label, onClick });
  const add = (id, title, meta, badge=null, exp=null, action=null, auto=null) => {
    tasks.push({
      id,
      title,
      meta,
      badge,
      exp,
      action,
      auto,
      manualDone: !!doneMap[id],
      autoDone: false,
      done: false
    });
  };

  // ===== Kidney (adult) =====
  if(prog === "kidney"){
    add("kidney_bp", "测量血压", "建议固定时间、坐位安静后测；趋势比单次更重要。", {type:"info", text:"高价值"}, "bp", act("去记录", ()=>openQuickBP()), {type:"bp", minCount:1});
    add("kidney_weight", "记录体重/水肿", "水肿与体重变化对蛋白尿/用药调整很重要。", null, "weight", act("去记录", ()=>openQuickWeight()), {type:"weight", minCount:1});
    if(state.kidney.track === "glomerular"){
      add("kidney_urine", "记录尿检/尿蛋白", "蛋白尿与血尿建议做时间线记录，复诊更高效。", {type:"info", text:"肾小球病"}, "urine", act("去记录", ()=>openAddUrine()), {type:"urine"});
    }
    if(state.kidney.track === "adpkd"){
      add("kidney_adpkd_sym", "记录症状事件", "腰腹痛、血尿、发热等事件建议记录时间线。", {type:"info", text:"ADPKD"}, "symptoms", act("去记录", ()=>quickSymptoms()), {type:"symptoms", minCount:1});
    }
    if(state.kidney.track === "tx"){
      add("kidney_tx_meds", "免疫抑制剂打卡", "按医嘱按时服用。抽血测谷浓度时请遵循中心流程。", {type:"danger", text:"移植关键"}, "tx_meds", act("用药打卡", ()=>openMedsCheckModal("kidney")), {type:"meds", program:"kidney"});
      add("kidney_tx_temp", "记录体温/感染自评", "发热/咳嗽/腹泻等症状出现请及时联系团队。", {type:"info", text:"安全"}, "tx_temp", act("去记录", ()=>openQuickTemp()), {type:"temp", minCount:1});
    }
    if(state.comorbid.dm){
      add("kidney_glu", "记录血糖（可选）", "餐前/餐后标签化记录，便于复诊沟通。", {type:"info", text:"糖尿病"}, "glucose", act("去记录", ()=>openQuickGlucose()), {type:"glucose", minCount:1});
    }
    add("kidney_sym", "症状自评", "乏力、气促、少尿、头晕等。出现红旗立即就医/联系团队。", {type:"danger", text:"红旗优先"}, "symptoms", act("去记录", ()=>quickSymptoms()), {type:"symptoms", minCount:1});
  }

  // ===== Hypertension (independent) =====
  if(prog === "htn"){
    const freq = state.htn?.bpFreq || "daily1";
    add("htn_bp_1", "记录家庭血压（第 1 次）", "建议固定时间、坐位安静后测；连续测两次取平均。", {type:"info", text:"家庭测量"}, "bp", act("去记录", ()=>openQuickBP()), {type:"bp", minCount:1});
    if(freq === "daily2"){
      add("htn_bp_2", "记录家庭血压（第 2 次）", "如医生建议晨/晚两次，请尽量固定时段，便于看波动。", {type:"info", text:"2次/日"}, "bp", act("去记录", ()=>openQuickBP()), {type:"bp", minCount:2});
    }
    add("htn_meds", "用药打卡（可选）", "按医嘱坚持是控压的关键。若出现头晕/乏力等不适，请备注。", {type:"info", text:"依从"}, "tx_meds", act("用药打卡", ()=>openMedsCheckModal("htn")), {type:"meds", program:"htn"});
    add("htn_sym", "症状自评", "头痛、胸闷、心悸、头晕等。红旗优先就医/联系团队。", {type:"danger", text:"红旗"}, "symptoms", act("去记录", ()=>quickSymptoms()), {type:"symptoms", minCount:1});
  }

  // ===== Diabetes (independent) =====
  if(prog === "dm"){
    const freq = state.dm?.glucoseFreq || "daily1";
    const unitTxt = (state.dm?.glucoseUnit === "mgdl") ? "mg/dL" : "mmol/L";
    add("dm_glu_1", `记录血糖（第 1 次 · ${unitTxt}）`, "建议打标签（空腹/餐后/睡前/随机）。趋势与低血糖事件同样重要。", {type:"info", text:"控糖"}, "glucose", act("去记录", ()=>openQuickGlucose()), {type:"glucose", minCount:1});
    if(freq === "daily2"){
      add("dm_glu_2", `记录血糖（第 2 次 · ${unitTxt}）`, "如医生建议多次监测，可用标签帮助复诊解读。", {type:"info", text:"2次/日"}, "glucose", act("去记录", ()=>openQuickGlucose()), {type:"glucose", minCount:2});
    }
    add("dm_meds", "用药打卡（可选）", "请勿凭单次血糖自行调整用药；如有异常请联系医生。", {type:"info", text:"依从"}, "tx_meds", act("用药打卡", ()=>openMedsCheckModal("dm")), {type:"meds", program:"dm"});
    // Many DM users also track weight; keep optional but high-value
    add("dm_weight", "记录体重（可选）", "体重变化能帮助医生判断饮食/运动与药物方案效果。", {type:"info", text:"代谢"}, "weight", act("去记录", ()=>openQuickWeight()), {type:"weight", minCount:1});
    if(state.comorbid.htn){
      add("dm_bp", "记录血压（如合并高血压）", "糖尿病 + 高血压常需要协同管理，建议固定时间测量。", {type:"info", text:"联动"}, "bp", act("去记录", ()=>openQuickBP()), {type:"bp", minCount:1});
    }
    add("dm_sym", "症状自评", "出汗、心慌、手抖、乏力、头晕等（尤其疑似低血糖）。红旗优先处理。", {type:"danger", text:"红旗"}, "symptoms", act("去记录", ()=>quickSymptoms()), {type:"symptoms", minCount:1});
  }

  // ===== Stone =====
  if(prog === "stone"){
    const tMl = toNum(state.stone.targetMl);
    const cur = toNum(state.stone.intakeLog?.[dateStr]) || 0;
    if(state.stone.fluidRestricted === "true"){
      add("stone_water", "记录饮水（限水模式）", "仅做记录；喝水目标请以医嘱为准。", {type:"danger", text:"限水"}, "water_stone", act("去记录", ()=>openWaterCustomModal()), {type:"stone_water"});
    }else{
      add("stone_water", "分次饮水", `今日已记录：${cur} ml` + (tMl?` / 目标 ${tMl} ml`:""), {type:"info", text:"预防复发"}, "water_stone", act("+250ml", ()=>addWater(250)), {type:"stone_water"});
    }
    add("stone_sym", "结石相关症状/事件记录", "腰痛/绞痛、血尿、发热寒战、恶心呕吐等。发热+腰痛/无尿是急症风险。", {type:"danger", text:"红旗"}, "stone_event", act("去记录", ()=>openStoneEventModal()), {type:"stone_event"});
  }

  // ===== Dialysis =====
  if(prog === "dialysis"){
    const mod = state.dialysis?.modality || "hd";
    const limit = state.dialysis?.fluidRestricted === "true";
    const limitTxt = limit ? "（限水：以透析中心医嘱为准）" : "";

    add("dialysis_bp", "记录血压", `透析日建议记录透前/透后；非透析日建议固定时间记录。${limitTxt}`, {type:"info", text:"基础"}, "bp", act("去记录", ()=>openQuickBP()), {type:"bp", minCount:1});
        add("dialysis_weight", "记录体重", `建议记录“干体重/间期体重增长”趋势。${limitTxt}`, {type:"info", text:"基础"}, "weight", act("去记录", ()=>openQuickWeight()), {type:"weight", minCount:1});

    if(mod === "hd"){
      const isDay = isDialysisDayToday();
      add("dialysis_hd_session", isDay ? "今天透析：记录透前/透后" : "非透析日：关注间期体重增长", isDay ? "建议：透前体重/血压 → 透后体重/血压（可选记录超滤量）。" : "建议：记录体重与饮水/咸食，复诊时更好评估控水策略。", {type:isDay?"danger":"info", text:isDay?"透析日":"间期"}, "hd_session", act("记录一次", ()=>openDialysisSessionModal()), {type:"dialysis_session"});
      add("dialysis_access", "血管通路自检（示意）", "内瘘/人工血管：有无震颤/杂音改变、红肿痛；导管：有无渗血/发热。异常及时联系透析团队。", {type:"danger", text:"安全"}, "dialysis_access", null, null);
    } else {
      add("dialysis_pd_session", "腹透记录（示意）", "记录超滤量/出入量、透析液是否混浊；腹痛/发热/混浊属于红旗，优先联系透析团队。", {type:"danger", text:"腹透"}, "pd_session", act("记录一次", ()=>openDialysisSessionModal()), {type:"dialysis_session"});
      add("dialysis_pd_exit", "出口护理（示意）", "出口红肿渗液、发热或腹痛需及时处理。", {type:"info", text:"护理"}, "pd_exit", null, null);
    }

    add("dialysis_sym", "症状自评", "胸痛/呼吸困难/意识改变/抽搐、少尿无尿、发热寒战等红旗优先就医/联系团队。", {type:"danger", text:"红旗"}, "symptoms", act("去记录", ()=>quickSymptoms()), {type:"symptoms", minCount:1});
  }

  // ===== Peds =====
  if(prog === "peds"){
    const age = computeAgeYears(state.peds.dob);
    const by = state.peds.guardianName ? `记录人：${state.peds.guardianName}` : "建议监护人协助记录";
    add("peds_bp", "记录血压", `儿童血压常需按年龄/性别/身高百分位解读。${by}`, {type:"info", text:"儿科"}, "bp_peds", act("去记录", ()=>openQuickBP()), {type:"bp", minCount:1});
    add("peds_weight", "记录体重", "生长与营养是儿肾随访核心之一。", {type:"info", text:"生长"}, "peds_growth", act("去记录", ()=>openQuickWeight()), {type:"weight", minCount:1});

    // height monthly
    const lastH = latestVital(state.vitals.height);
    const lastDate = lastH?.dateTime?.slice(0,10);
    const now = new Date();
    let needH = true;
    if(lastDate){
      const ld = new Date(lastDate);
      const diffDays = Math.round((now-ld)/(1000*60*60*24));
      needH = diffDays >= 30;
    }
    add(
      "peds_height",
      needH ? "本月记录一次身高" : "身高已记录（本月）",
      needH ? "建议每月记录身高一次（或按医嘱）。" : `最近记录：${niceDate(lastDate)}`,
      {type:"info", text: needH ? "待完成" : "已覆盖"},
      "height_peds",
      act("去记录", ()=>openQuickHeight()),
      {type:"static", done: !needH}
    );

    add("peds_sym", "症状自评", "发热、腹泻、呕吐、尿量减少等；红旗立即就医/联系团队。", {type:"danger", text:"红旗"}, "symptoms", act("去记录", ()=>quickSymptoms()), {type:"symptoms", minCount:1});
    add("peds_upload", "上传/录入化验（如有）", "儿科 eGFR 估算常需要身高与肌酐单位，复诊时以医生判读为准。", null, "labs_upload_peds", act("去录入", ()=>openAddLab()), null);
    if(age !== null && age >= 12){
      add("peds_transition", "过渡训练：让孩子参与自我管理（示意）", "例如：让孩子自己报症状、记一次血压、准备复诊问题。", {type:"info", text:"过渡"}, "peds_growth", null, null);
    }
  }

  // ===== Compute auto-done from real records =====
  const bpCount = countRecordsOnDate(state?.vitals?.bp, dateStr, "dateTime");
  const weightCount = countRecordsOnDate(state?.vitals?.weight, dateStr, "dateTime");
  const heightCount = countRecordsOnDate(state?.vitals?.height, dateStr, "dateTime");
  const gluCount = countRecordsOnDate(state?.vitals?.glucose, dateStr, "dateTime");
  const tempCount = countRecordsOnDate(state?.vitals?.temp, dateStr, "dateTime");
  const symCount = countRecordsOnDate(state?.symptoms, dateStr, "dateTime");
  const urineToday = (state?.urineTests || []).some(u => (u?.date || "") === dateStr);
  const dialysisSessionToday = (state?.dialysis?.sessions || []).some(s => String(s?.dateTime || "").startsWith(dateStr));
  const stoneWaterMl = toNum(state?.stone?.intakeLog?.[dateStr]) || 0;
  const stoneEventToday = (state?.stone?.events || []).some(e => String(e?.dateTime || "").startsWith(dateStr));
  const medsDone = (progKey)=> (state?.medsLog || []).some(m => String(m?.dateTime || "").startsWith(dateStr) && (!progKey || m?.program === progKey));

  for(const t of tasks){
    const a = t.auto;
    let autoDone = false;
    if(a){
      const min = a.minCount || 1;
      switch(a.type){
        case "bp": autoDone = bpCount >= min; break;
        case "weight": autoDone = weightCount >= min; break;
        case "height": autoDone = heightCount >= min; break;
        case "glucose": autoDone = gluCount >= min; break;
        case "temp": autoDone = tempCount >= min; break;
        case "symptoms": autoDone = symCount >= min; break;
        case "urine": autoDone = urineToday; break;
        case "dialysis_session": autoDone = dialysisSessionToday; break;
        case "stone_water": autoDone = stoneWaterMl > 0; break;
        case "stone_event": autoDone = stoneEventToday; break;
        case "meds": autoDone = medsDone(a.program || null); break;
        case "static": autoDone = !!a.done; break;
        default: autoDone = false;
      }
    }
    t.autoDone = autoDone;
    t.done = t.manualDone || autoDone;
  }

  return tasks;
}
