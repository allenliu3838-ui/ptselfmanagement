/* programs.js - Program helpers and label functions */

function dietFocus(){
  const lab = latestLab();
  const k = toNum(lab?.k);
  const p = toNum(lab?.p);
  const highK = (k !== null && k >= 5.5);
  const highP = (p !== null && p >= 1.6);
  return { k, p, highK, highP };
}

function programLabel(key){
  return PROGRAMS[key]?.name || key;
}

function isProgramEnabled(key){
  // Backward compatible: very old states may not have enabledPrograms.
  if(!state.enabledPrograms) return key === "kidney";
  // If a key is missing, default to false (except kidney which defaults true for legacy).
  if(typeof state.enabledPrograms[key] === "undefined"){
    return key === "kidney";
  }
  return !!state.enabledPrograms[key];
}

function enabledProgramKeys(){
  const keys = Object.keys(PROGRAMS);
  return keys.filter(k => !!state.enabledPrograms?.[k]);
}

function pickFallbackProgram(preferOrder=null){
  const order = preferOrder || ["kidney","htn","dm","dialysis","stone","peds"];
  for(const k of order){
    if(isProgramEnabled(k)) return k;
  }
  // As a last resort, pick any enabled program.
  const any = Object.keys(PROGRAMS).find(k => isProgramEnabled(k));
  return any || "kidney";
}

function ensureAtLeastOneProgram(){
  const enabled = enabledProgramKeys();
  if(enabled.length) return true;
  // Safety fallback: keep app usable.
  state.enabledPrograms = state.enabledPrograms || {};
  state.enabledPrograms.kidney = true;
  return false;
}

function ensureActiveProgramEnabled(){
  if(!ensureAtLeastOneProgram()){
    state.activeProgram = "kidney";
    return;
  }
  if(isProgramEnabled(state.activeProgram)) return;
  state.activeProgram = pickFallbackProgram();
}

function wouldDisableLastProgram(disableKey){
  const enabled = enabledProgramKeys();
  // If disableKey isn't enabled, it won't reduce enabled count.
  if(!enabled.includes(disableKey)) return false;
  return enabled.length <= 1;
}

function ensureTaskDateKey(){
  const k = yyyyMMdd(new Date());
  if(!state.tasksDone[k]) state.tasksDone[k] = {};
  return k;
}

function toggleTask(taskId){
  const k = ensureTaskDateKey();
  state.tasksDone[k][taskId] = !state.tasksDone[k][taskId];
  saveState();
  renderAll();
}

function markAllTasksDone(tasks){
  const k = ensureTaskDateKey();
  for(const t of tasks){
    state.tasksDone[k][t.id] = true;
  }
  saveState();
  renderAll();
}

function latestLab(){
  if(!state.labs || state.labs.length === 0) return null;
  // assume already in insertion order; pick most recent by date
  const sorted = [...state.labs].sort((a,b)=> (a.date||"").localeCompare(b.date||""));
  return sorted[sorted.length-1];
}

function latestVital(arr){
  if(!arr || arr.length===0) return null;
  return [...arr].sort((a,b)=> (a.dateTime||"").localeCompare(b.dateTime||"")).slice(-1)[0];
}

function latestMedsLogFor(programKey){
  const list = (state.medsLog||[]).filter(m=>!programKey || m.program===programKey);
  if(!list.length) return null;
  return [...list].sort((a,b)=> (a.dateTime||"").localeCompare(b.dateTime||"")).slice(-1)[0];
}

function countRecordsOnDate(arr, dateStr, field="dateTime"){
  if(!Array.isArray(arr) || !dateStr) return 0;
  return arr.filter(r => String(r?.[field] || "").startsWith(dateStr)).length;
}

function hasRecordOnDate(arr, dateStr, field="dateTime"){
  return countRecordsOnDate(arr, dateStr, field) > 0;
}

function dietSignals(){
  // derive diet tags from comorb + kidney track + labs flags (simple demo rules)
  const tags = [];
  const lab = latestLab();
  const k = toNum(lab?.k);
  const p = toNum(lab?.p);
  const ca = toNum(lab?.ca);
  const glu = toNum(lab?.glu);
  const hba1c = toNum(lab?.hba1c);

  if(state.comorbid.htn || state.comorbid.hf) tags.push(DIET_TAGS.lowNa);
  // Fluid restriction is common in dialysis / heart failure; keep as an explicit tag to avoid conflicts (e.g., stone hydration).
  if(state.comorbid.hf) tags.push(DIET_TAGS.fluidLimit);
  if(state.enabledPrograms?.dialysis && state.dialysis?.fluidRestricted === "true") tags.push(DIET_TAGS.fluidLimit);
  if(state.enabledPrograms?.stone && state.stone?.fluidRestricted === "true") tags.push(DIET_TAGS.fluidLimit);
  if(state.comorbid.dm || (glu !== null && glu >= 7.0) || (hba1c !== null && hba1c >= 6.5)) tags.push(DIET_TAGS.lowSugar);

  if(k !== null && k >= 5.5) tags.push(DIET_TAGS.lowK);
  if(p !== null && p >= 1.6) tags.push(DIET_TAGS.lowP);

  if((ca !== null && (ca < 2.1 || ca > 2.6)) || (p !== null && p >= 1.6)) tags.push(DIET_TAGS.caMbd);

  if(state.kidney.track === "tx"){
    tags.push(DIET_TAGS.foodSafety);
    tags.push(DIET_TAGS.drugFood);
  }
  // de-dup
  const seen = new Set();
  return tags.filter(t => (seen.has(t.key) ? false : (seen.add(t.key), true)));
}

function safetySignals(){
  const lab = latestLab();
  const signals = [];
  const k = toNum(lab?.k);
  const na = toNum(lab?.na);
  const ca = toNum(lab?.ca);
  const mg = toNum(lab?.mg);

  // Vitals overlay (BP / glucose): use clear "红旗" messaging only, avoid giving treatment advice
  const bp = latestVital(state?.vitals?.bp);
  const sys = toNum(bp?.sys);
  const dia = toNum(bp?.dia);
  if(sys !== null && dia !== null){
    if(sys >= 180 || dia >= 120){
      signals.push({
        level:"danger",
        title:"血压非常高",
        detail:"最近一次血压已达较高水平。若伴随胸痛、呼吸困难、剧烈头痛、视物模糊、肢体麻木/言语不清等，请立即就医/联系团队。"
      });
    }
  }

  const glu = latestVital(state?.vitals?.glucose);
  const gValRaw = toNum(glu?.value);
  const gUnit = (glu?.unit || "mmolL");
  const gMmol = (gValRaw === null) ? null : (gUnit === "mgdl" ? (gValRaw / 18) : gValRaw);
  if(gMmol !== null){
    if(gMmol <= 3.9){
      signals.push({
        level:"danger",
        title:"疑似低血糖风险",
        detail:"最近一次血糖偏低。若出现出汗、心慌、手抖、意识模糊/晕厥等，请立即按医嘱处理并联系医生/就医。"
      });
    } else if(gMmol >= 16.7){
      signals.push({
        level:"info",
        title:"血糖偏高",
        detail:"最近一次血糖偏高。若伴明显口渴、多尿、呕吐、呼吸深快/意识改变等，请尽快就医/联系团队。"
      });
    }
  }

  if(k !== null && k >= 5.5) signals.push({level:"danger", title:"血钾偏高", detail:"高钾可能引发心律问题；如出现心悸、胸痛、呼吸困难、明显乏力等红旗症状，请立即就医/联系团队。"});
  if(na !== null && na < 130) signals.push({level:"danger", title:"血钠偏低", detail:"严重低钠可出现意识混乱、抽搐等；如有相关症状请立即就医。"});
  if(mg !== null && mg < 0.65) signals.push({level:"danger", title:"血镁偏低", detail:"严重低镁可能导致心律异常/抽搐等；出现红旗症状请尽快就医。"});
  if(ca !== null && (ca < 2.0 || ca > 2.75)) signals.push({level:"info", title:"血钙异常", detail:"钙磷代谢异常常需结合其他指标评估。不要自行大量补钙或停药，按医嘱复查/咨询。"});

  // Dialysis-specific red flags (from latest dialysis record)
  if(state.enabledPrograms?.dialysis && state.dialysis?.sessions?.length){
    const last = state.dialysis.sessions[state.dialysis.sessions.length-1];
    if(last?.modality === "pd"){
      const cloudy = String(last.effluent||"").includes("浑浊");
      if(cloudy || last.fever || last.abdPain){
        signals.unshift({
          level:"danger",
          title:"腹透红旗",
          detail:"最近记录提示：透析液可能混浊/腹痛/发热。存在腹膜炎风险时请立即联系透析团队或就医，不要等待下一次复查。"
        });
      }
    }
  }

  // Program conflict hint (hydration vs fluid restriction)
  if(state.enabledPrograms?.dialysis && state.enabledPrograms?.stone && state.dialysis?.fluidRestricted === "true"){
        signals.push({level:"info", title:"结石喝水 vs 透析限水可能冲突", detail:"若你同时有结石史与透析限水医嘱，请让透析团队知情并由医生设定“优先级与目标”。App 内测版不会自动替你做医学决策。"});
  }
  if(!signals.length){
    signals.push({level:"ok", title:"暂无突出实验室红旗", detail:"仍请关注胸痛、呼吸困难、意识改变、抽搐、少尿/无尿、发热伴剧烈腰痛等情况。"});
  }
  return signals;
}

function recommendKnowledge(){
  const want = [];
  const prog = state.activeProgram;
  want.push(prog);
  if(state.comorbid.htn) want.push("htn");
  if(state.comorbid.dm) want.push("dm");
  if(state.kidney.track) want.push(state.kidney.track);
  // safety overlay: electrolyte
  const lab = latestLab();
  if(toNum(lab?.k) !== null && toNum(lab.k) >= 5.5) want.push("electrolyte");
  // scoring
  const scored = KNOWLEDGE.map(a => {
    let score = 0;
    for(const t of a.tags){
      if(want.includes(t)) score += 3;
      if(t === "safety" && want.includes("electrolyte")) score += 2;
    }
    // prefer current program
    if(a.tags.includes(prog)) score += 2;
    return {a, score};
  }).sort((x,y)=>y.score-x.score);
  return scored.filter(x=>x.score>0).slice(0,2).map(x=>x.a);
}

function identityText(){
  // show a human-friendly identity line
  if(state.activeProgram === "htn"){
    const freq = state.htn?.bpFreq === "daily2" ? "每日2次" : "每日1次";
    const tgt = (state.htn?.targetSys || state.htn?.targetDia) ? `${state.htn?.targetSys||"—"}/${state.htn?.targetDia||"—"}` : "未设置";
    return `高血压随访 · 频率：${freq} · 目标：${tgt}`;
  }
  if(state.activeProgram === "dm"){
    const t = state.dm?.dmType || "unknown";
    const typeTxt = ({unknown:"未设置", t1:"1型", t2:"2型", gdm:"妊娠", other:"其他"})[t] || "未设置";
    const unitTxt = (state.dm?.glucoseUnit === "mgdl") ? "mg/dL" : "mmol/L";
    return `糖尿病随访 · 类型：${typeTxt} · 单位：${unitTxt}`;
  }
  if(state.activeProgram === "peds"){
    const n = state.peds.childName || "儿童";
    const age = computeAgeYears(state.peds.dob);
    const ageTxt = (age===null) ? "" : ` · ${age}岁`;
    const dx = state.peds.dx && state.peds.dx !== "unknown" ? ` · ${labelPedsDx(state.peds.dx)}` : "";
    return `儿肾：${n}${ageTxt}${dx}`;
  }
  if(state.activeProgram === "dialysis"){
    const mod = state.dialysis?.modality || "hd";
    const modTxt = mod === "pd" ? "腹透" : "血透";
    const access = state.dialysis?.accessType ? labelDialysisAccess(state.dialysis.accessType) : "—";
    const limit = state.dialysis?.fluidRestricted === "true" ? " · 限水" : "";
    return `透析：${modTxt} · 通路：${access}${limit}`;
  }
  if(state.activeProgram === "stone"){
    const limit = state.stone?.fluidRestricted === "true" ? "限水" : (state.stone?.fluidRestricted === "false" ? "非限水" : "不确定");
    return `结石管理 · ${limit}`;
  }
  // adult kidney
  let parts = ["肾脏随访"];
  if(state.kidney.track && state.kidney.track !== "unknown"){
    parts.push(labelKidneyTrack(state.kidney.track));
  }
  if(state.kidney.track === "glomerular" && state.kidney.glomerularSubtype && state.kidney.glomerularSubtype !== "unknown"){
    parts.push(labelGlomSubtype(state.kidney.glomerularSubtype));
  }
  if(state.kidney.track === "tx"){
    parts.push(`移植阶段：${labelTxStage(state.kidney.txStage)}`);
  }
  const c = COMORB.filter(x=>state.comorbid[x.key]).map(x=>x.label);
  if(c.length) parts.push(`合并：${c.join("、")}`);
  return parts.join(" · ");
}

function labelKidneyTrack(v){
  const m = {
    unknown:"不确定",
    ckd:"肾功能/CKD",
    glomerular:"蛋白尿/肾小球病",
    adpkd:"多囊肾(ADPKD)",
    genetic:"遗传性肾病",
    tx:"肾移植随访",
  };
  return m[v] || v;
}
function labelGlomSubtype(v){
  const m = {
    unknown:"其他/不确定",
    iga:"IgA肾病",
    mn:"膜性肾病",
    hbv:"乙肝相关肾病",
    mcd:"微小病变(MCD)",
    fsgs:"原发FSGS",
    ln:"狼疮性肾炎",
    anca:"ANCA相关肾损害",
    c3g:"C3肾小球病",
  };
  return m[v] || v;
}
function labelTxStage(v){
  const m = { stable:"稳定期", early:"术后0–3月", mid:"术后3–12月", unstable:"异常/调整期" };
  return m[v] || v;
}
function labelPedsDx(v){
  const m = { unknown:"不确定/待确认", ckd:"慢性肾病/肾功能异常", glomerular:"蛋白尿/肾小球病", caukt:"CAKUT(示意)", tx:"肾移植随访", genetic:"遗传性肾病", stone:"结石/结晶(示意)" };
  return m[v] || v;
}

function labelDialysisModality(v){
  const m = { hd:"血液透析（HD）", pd:"腹膜透析（PD）" };
  return m[v] || v;
}

function labelDialysisAccess(v){
  const m = {
    fistula:"动静脉内瘘",
    graft:"人工血管",
    cvc:"中心静脉导管",
    pdcatheter:"腹透导管",
    unknown:"不确定",
  };
  return m[v] || v;
}

function labelMedsStatus(v){
  const m = {
    taken: "已按医嘱服用",
    partial: "部分/不确定",
    missed: "漏服/延迟",
    unknown: "未记录",
  };
  return m[v] || v || "未记录";
}

function labelWeekday(d){
  const m = {0:"周日",1:"周一",2:"周二",3:"周三",4:"周四",5:"周五",6:"周六"};
  return m[d] ?? String(d);
}

function isDialysisDayToday(){
  const mod = state.dialysis?.modality || "hd";
  if(mod !== "hd") return true; // PD treated as daily for tasks
  const days = state.dialysis?.hdDays || [];
  const today = new Date().getDay();
  return days.includes(today);
}

// Ensure active program is valid even if user disabled a previously-default program.
ensureActiveProgramEnabled();
