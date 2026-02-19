/* export.js - Export, import, backup, and clipboard functions */

function buildExportTextShort(){
  const lines = [];
  lines.push(`【随访 摘要（微信版/内测）】`);
  lines.push(`日期：${niceDate(yyyyMMdd(new Date()))}`);
  lines.push(`项目：${programLabel(state.activeProgram)}；身份：${identityText()}`);
  if(state.activeProgram === "kidney"){
    lines.push(`肾病轨道：${labelKidneyTrack(state.kidney.track)}${state.kidney.track==="glomerular" ? `；类型：${labelGlomSubtype(state.kidney.glomerularSubtype)}` : ""}${state.kidney.track==="tx" ? `；阶段：${labelTxStage(state.kidney.txStage)}`:""}`);
  }
  if(state.activeProgram === "dialysis"){
    const mod = state.dialysis?.modality || "hd";
    lines.push(`透析方式：${mod==="pd"?"腹透(PD)":"血透(HD)"}；通路/出口：${labelDialysisAccess(state.dialysis?.accessType)}`);
  }
  if(state.activeProgram === "peds"){
    const age = computeAgeYears(state.peds.dob);
    const h = latestVital(state.vitals.height);
    const w = latestVital(state.vitals.weight);
    const hNum = toNum(h?.cm ?? state.peds.heightCm);
    const wNum = toNum(w?.kg ?? state.peds.weightKg);
    const bmi = (hNum && wNum) ? Math.round((wNum / Math.pow(hNum/100,2))*10)/10 : null;
    const hv = computeVelocityInfo(state.vitals.height, "cm", { preferDays: 180, minDays: 30 });
    const wv = computeVelocityInfo(state.vitals.weight, "kg", { preferDays: 180, minDays: 30 });
    lines.push(`儿肾：${state.peds.childName||"—"}；年龄：${age===null?"—":age+"岁"}；监护人：${state.peds.guardianName||"—"}`);
    lines.push(`生长：身高 ${hNum!==null?`${hNum}cm`:"—"}；体重 ${wNum!==null?`${wNum}kg`:"—"}；BMI ${bmi!==null?bmi:"—"}；身高生长速度 ${hv?`${hv.perYear}cm/年`:"—"}；体重增长速度 ${wv?`${wv.perYear}kg/年`:"—"}`);
  }
  lines.push("");

  const lab = latestLab();
  if(lab){
    const parts = [];
    const add = (label, v)=>{ if(v!==null && v!==undefined && String(v).trim()!=="") parts.push(`${label}${v}`); };
    if(lab.scr) add("Scr ", `${lab.scr}${lab.scrUnit==="mgdl"?" mg/dL":" μmol/L"}`);
    add("eGFR ", lab.egfr || "");
    add("K ", lab.k || "");
    add("P ", lab.p || "");
    add("Na ", lab.na || "");
    add("Ca ", lab.ca || "");
    add("Mg ", lab.mg || "");
    add("Glu ", lab.glu || "");
    if(lab.hba1c) add("HbA1c ", `${lab.hba1c}%`);
    if(parts.length) lines.push(`最近化验（${lab.date||"—"}）：${parts.join(" · ")}`);
  }

  const bp = latestVital(state.vitals.bp);
  if(bp) lines.push(`最近血压：${bp.sys}/${bp.dia}（${bp.dateTime}）`);
  const wt = latestVital(state.vitals.weight);
  if(wt) lines.push(`最近体重：${wt.kg} kg（${wt.dateTime}）`);

  // red flags (only show if danger exists)
  const safety = safetySignals();
  const danger = safety.find(s=>s.level==="danger");
  if(danger){
    lines.push("");
    lines.push(`【红旗提示】${danger.title}：${danger.detail}（如有不适请立即就医/联系团队）`);
  }

  lines.push("");
  lines.push("下一步建议：");
  lines.push("- 按计划完成今日/本周记录（血压/体重/血糖/尿检/透析或结石记录等）");
    lines.push("- 复诊前可复制“复诊版摘要”并附上资料库清单");
  lines.push("- 出现胸痛/气促/意识改变/抽搐/少尿无尿/高热剧痛等红旗请立即就医");
  return lines.join("\n");
}


function buildExportText(){
  const lines = [];
  lines.push(`【肾域随访 一页摘要（内测）】`);
  lines.push(`日期：${niceDate(yyyyMMdd(new Date()))}`);
  lines.push(`当前项目：${programLabel(state.activeProgram)}`);
  lines.push(`身份：${identityText()}`);
  lines.push("");

  if(state.activeProgram === "peds"){
    const age = computeAgeYears(state.peds.dob);
    lines.push(`- 儿肾：${state.peds.childName||"—"}；年龄：${age===null?"—":age+"岁"}；监护人：${state.peds.guardianName||"—"}`);
    lines.push(`- 儿肾主诊断：${labelPedsDx(state.peds.dx)}`);
    const h = latestVital(state.vitals.height);
    const w = latestVital(state.vitals.weight);
    const hNum = toNum(h?.cm ?? state.peds.heightCm);
    const wNum = toNum(w?.kg ?? state.peds.weightKg);
    const bmi = (hNum && wNum) ? Math.round((wNum / Math.pow(hNum/100,2))*10)/10 : null;
    const hv = computeVelocityInfo(state.vitals.height, "cm", { preferDays: 180, minDays: 30 });
    const wv = computeVelocityInfo(state.vitals.weight, "kg", { preferDays: 180, minDays: 30 });
    lines.push(`- 生长：身高 ${hNum!==null?`${hNum} cm`:"—"}；体重 ${wNum!==null?`${wNum} kg`:"—"}；BMI ${bmi!==null?bmi:"—"}`);
    lines.push(`- 生长速度（年化）：身高 ${hv?`${hv.perYear} cm/年（${hv.fromDate}→${hv.toDate}）`:"—"}；体重 ${wv?`${wv.perYear} kg/年（${wv.fromDate}→${wv.toDate}）`:"—"}`);
  }

  const lab = latestLab();
  if(lab){
    const items = [];
    if(lab.scr) items.push(`Scr ${lab.scr}${lab.scrUnit==="mgdl"?"mg/dL":"μmol/L"}`);
    if(lab.egfr) items.push(`eGFR ${lab.egfr}`);
    if(lab.k) items.push(`K ${lab.k}`);
    if(lab.na) items.push(`Na ${lab.na}`);
    if(lab.p) items.push(`P ${lab.p}`);
    if(lab.ca) items.push(`Ca ${lab.ca}`);
    if(lab.mg) items.push(`Mg ${lab.mg}`);
    if(lab.glu) items.push(`Glu ${lab.glu}`);
    if(lab.hba1c) items.push(`HbA1c ${lab.hba1c}`);
    lines.push(`- 最近化验：${niceDate(lab.date||"—")}：${items.join(" · ")}`);
  } else {
    lines.push(`- 最近化验：—`);
  }

  // Advanced markers snapshot (kidney program)
  if(state.activeProgram === "kidney"){
    const scope = markerScopeFromState();
    const latestByType = (type)=>{
      return (state.markers||[])
        .filter(m => m.type===type && (m.scope||"kidney")===scope)
        .sort((a,b)=> (a.date||"").localeCompare(b.date||""))
        .slice(-1)[0] || null;
    };
    const fmt = (m)=>{
      if(!m) return "—";
      if(m.type === "dsa"){
        const r = m.payload?.result || "—";
        const mfi = m.payload?.maxMfi ? ` (maxMFI ${m.payload.maxMfi})` : "";
        return `${r}${mfi} · ${niceDate(m.date)}`;
      }
      const v = m.payload?.value ?? "—";
      const u = m.payload?.unit || MARKER_DEFS[m.type]?.unit || "";
      const extra = m.payload?.extra ? ` · ${m.payload.extra}` : "";
      return `${v}${u?" "+u:""}${extra} · ${niceDate(m.date)}`;
    };

    const parts = [];
    if(scope === "tx"){
      parts.push(`dd-cfDNA：${fmt(latestByType("ddcfDNA"))}`);
      parts.push(`DSA：${fmt(latestByType("dsa"))}`);
    }
    if(scope === "mn"){
      parts.push(`anti-PLA2R：${fmt(latestByType("antiPLA2R"))}`);
    }
    if(scope === "ln"){
      parts.push(`dsDNA：${fmt(latestByType("dsDNA"))}`);
      parts.push(`C3：${fmt(latestByType("c3"))}`);
      parts.push(`C4：${fmt(latestByType("c4"))}`);
    }
    if(scope === "mcd" || scope === "fsgs"){
      parts.push(`anti-nephrin：${fmt(latestByType("antiNephrin"))}`);
    }
    if(parts.length) lines.push(`- 高级指标（摘要）：${parts.join(" · ")}`);
  }

  // Document vault snapshot (all programs)
  {
    const docs = docsForProgram(state.activeProgram);
    if(docs.length){
      const latest = docs[0];
      const d = latest?.date || (latest?.createdAt ? latest.createdAt.slice(0,10) : "");
      const keyCounts = {
        biopsy_report: 0,
        biopsy_image: 0,
        genetic_report: 0,
        immune_report: 0,
        imaging: 0,
        lab_report: 0
      };
      docs.forEach(x=>{ if(keyCounts.hasOwnProperty(x.category)) keyCounts[x.category]++; });
      const brief = [];
      if(keyCounts.biopsy_report || keyCounts.biopsy_image) brief.push(`活检 ${keyCounts.biopsy_report + keyCounts.biopsy_image}`);
      if(keyCounts.genetic_report) brief.push(`基因 ${keyCounts.genetic_report}`);
      if(keyCounts.immune_report) brief.push(`免疫学/高级指标 ${keyCounts.immune_report}`);
      if(keyCounts.imaging) brief.push(`影像 ${keyCounts.imaging}`);
      if(keyCounts.lab_report) brief.push(`化验单 ${keyCounts.lab_report}`);
      lines.push(`- 资料库：已上传 ${docs.length} 份${brief.length?`（${brief.join("，")}）`:""}；最近：${docCategoryLabel(latest.category)} · ${niceDate(d||"—")}`);
    }
  }

  const bp = latestVital(state.vitals.bp);
  if(bp) lines.push(`- 最近血压：${bp.sys}/${bp.dia}（${bp.dateTime}）${bp.context?` · ${bp.context}`:""}`);
  const wt = latestVital(state.vitals.weight);
  if(wt) lines.push(`- 最近体重：${wt.kg} kg（${wt.dateTime}）`);
  const ht = latestVital(state.vitals.height);
  if(ht) lines.push(`- 最近身高：${ht.cm} cm（${ht.dateTime}）`);

  const gl = latestVital(state.vitals.glucose);
  if(gl){
    const raw = toNum(gl.value);
    if(raw !== null){
      const mmol = (gl.unit||"mmolL") === "mgdl" ? (raw/18) : raw;
      const outUnit = (state.dm?.glucoseUnit === "mgdl") ? "mg/dL" : "mmol/L";
      const outVal = (outUnit === "mg/dL") ? (Math.round(mmol*18*10)/10) : (Math.round(mmol*10)/10);
      lines.push(`- 最近血糖：${outVal} ${outUnit}${gl.tag?` · ${gl.tag}`:""}（${gl.dateTime}）`);
    }
  }

  const meds = latestMedsLogFor(state.activeProgram);
  if(meds){
    lines.push(`- 最近用药打卡：${niceDate(meds.dateTime.slice(0,10))} · ${labelMedsStatus(meds.status)}${meds.category?` · ${meds.category}`:""}${meds.note?` · 备注：${meds.note}`:""}`);
  }

  // Dialysis snapshot (if enabled)
  if(state.enabledPrograms?.dialysis){
    const mod = state.dialysis?.modality || "hd";
    const modTxt = (mod === "pd") ? "腹透(PD)" : "血透(HD)";
    const daysTxt = (mod === "hd")
      ? (state.dialysis?.hdDays?.length ? state.dialysis.hdDays.map(labelWeekday).join("、") : "未设置")
      : "每日";
    const scheduleLine = (mod === "hd") ? `透析日 ${daysTxt}` : "频率 每日";
    const access = labelDialysisAccess(state.dialysis?.accessType || "unknown");
    const limit = state.dialysis?.fluidRestricted === "true";
    const limitMl = state.dialysis?.fluidLimitMl ? `${state.dialysis.fluidLimitMl} ml/天` : "—";
    lines.push(`- 透析：${modTxt} · ${scheduleLine} · 通路：${access} · 控水：${limit ? limitMl : "不确定/否"}`);

    const ds = state.dialysis?.sessions?.length ? state.dialysis.sessions.slice(-1)[0] : null;
    if(ds){
      const dsLine = (ds.modality === "pd")
        ? `PD ${niceDate(ds.dateTime.slice(0,10))} · UF ${ds.ufMl||"—"} ml · 透析液 ${ds.effluent||"—"}${ds.abdPain?" · 腹痛":""}${ds.fever?" · 发热":""}`
        : `HD ${niceDate(ds.dateTime.slice(0,10))} · 透前 ${ds.preWeightKg||"—"}kg → 透后 ${ds.postWeightKg||"—"}kg · UF ${ds.ufMl||"—"}ml`;
      lines.push(`- 最近透析记录：${dsLine}`);
    }
  }

  // Stone snapshot (if enabled)
  if(state.enabledPrograms?.stone){
    const today = yyyyMMdd(new Date());
    const cur = toNum(state.stone.intakeLog?.[today]);
    if(cur !== null){
      const limit = state.stone.fluidRestricted === "true";
      lines.push(`- 结石：今日饮水 ${cur} ml${limit?"（限水模式）":""}`);
    }
  }

  const ur = state.urineTests?.length ? [...state.urineTests].sort((a,b)=> (a.date||"").localeCompare(b.date||"")).slice(-1)[0] : null;
  if(ur) lines.push(`- 最近尿检：${niceDate(ur.date)} · 蛋白 ${ur.protein} · 潜血 ${ur.blood}${ur.note?` · 备注：${ur.note}`:""}`);

  const diet = dietSignals();
  if(diet.length) lines.push(`- 饮食关注点（示意）：${diet.map(t=>t.label).join("、")}`);

  // recent symptoms (last 3)
  const sym = state.symptoms?.length ? state.symptoms.slice(-3) : [];
  if(sym.length){
    lines.push(`- 近期症状（近${sym.length}条）：`);
    sym.forEach(s=>{
      lines.push(`  · ${s.dateTime}：${(s.tags||[]).join("、")}${s.note?`（${s.note}）`:""}`);
    });
  }

  lines.push("");
  lines.push("说明：本摘要用于随访沟通与复诊准备，不替代医生诊治。红旗症状请立即就医/联系团队。");
  return lines.join("\n");
}

function downloadTextFile(filename, text, mime="text/plain;charset=utf-8"){
  try{
    const blob = new Blob([text], {type:mime});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 1500);
  }catch(e){
    console.error(e);
    prompt("复制下面内容：", text);
  }
}

function buildVisitPackText(days=90){
  const daysN = Number(days||90);
  const cutoff = new Date(Date.now() - daysN*24*3600*1000);

  const lines = [];
  lines.push(`【肾域随访 复诊包（内测）】`);
  lines.push(`生成：${niceDate(yyyyMMdd(new Date()))}`);
  lines.push(`项目：${programLabel(state.activeProgram)}；范围：近 ${daysN} 天`);
  lines.push("");

  // Use clinic-style export as the core (structured + more complete)
  lines.push(buildExportText());
  lines.push("");
  lines.push(`【近${daysN}天资料清单】`);

  const docsAll = docsForProgram(state.activeProgram);
  const docs = docsAll.filter(d=>{
    const ds = d.date || (d.createdAt ? d.createdAt.slice(0,10) : "");
    if(!ds) return true;
    const dt = new Date(ds);
    if(String(dt) === "Invalid Date") return true;
    return dt >= cutoff;
  });

  if(!docs.length){
    lines.push("—（暂无上传资料）");
  }else{
    docs.forEach(d=>{
      const ds = d.date || (d.createdAt ? d.createdAt.slice(0,10) : "");
      const title = d.title || d.fileName || docCategoryLabel(d.category);
      const note = d.note ? `；备注：${d.note}` : "";
      const scopeTxt = (d.scope && d.scope !== "kidney" && d.scope !== d.program) ? `；细分：${scopeLabel(d.scope)}` : "";
      lines.push(`- ${ds||"—"} ${docCategoryLabel(d.category)}：${title}${scopeTxt}${note}`);
    });
  }

  lines.push("");
    lines.push("提示：本版本资料文件保存在本机（IndexedDB）。若医生需要文件本体，请在“资料库”里打开后截图或使用系统分享。");
  return lines.join("\n");
}

function buildVisitPackJSON(days=90){
  const daysN = Number(days||90);
  const cutoff = new Date(Date.now() - daysN*24*3600*1000);

  const docsAll = docsForProgram(state.activeProgram);
  const docs = docsAll.filter(d=>{
    const ds = d.date || (d.createdAt ? d.createdAt.slice(0,10) : "");
    if(!ds) return true;
    const dt = new Date(ds);
    if(String(dt) === "Invalid Date") return true;
    return dt >= cutoff;
  }).map(d=>({
    id: d.id,
    program: d.program || "kidney",
    scope: d.scope || "",
    category: d.category || "other",
    date: d.date || "",
    title: d.title || "",
    note: d.note || "",
    fileName: d.fileName || "",
    mime: d.mime || "",
    size: d.size || 0,
    createdAt: d.createdAt || "",
    fileId: d.fileId || ""
  }));

  return {
    exportedAt: nowISO(),
    appVersion: VERSION,
    activeProgram: state.activeProgram,
    identity: identityText(),
    comorbid: state.comorbid || {},
    kidney: state.kidney || {},
    dialysis: state.dialysis || {},
    vitals: {
      bp: latestVital(state.vitals.bp),
      weight: latestVital(state.vitals.weight),
      height: latestVital(state.vitals.height),
      glucose: latestVital(state.vitals.glucose),
      temp: latestVital(state.vitals.temp),
    },
    latestLab: latestLab(),
    docsRangeDays: daysN,
    docs
  };
}


function buildFeedbackText(withSummary=false){
  const lines = [];
  lines.push("【肾域随访 内测反馈】");
  lines.push(`时间：${nowISO()}`);
  lines.push(`版本：${VERSION}`);
  lines.push(`设备/浏览器：${navigator.userAgent}`);
  lines.push(`当前项目：${programLabel(state.activeProgram)}`);
  const enabled = Object.keys(state.enabledPrograms||{}).filter(k=>state.enabledPrograms[k]).join("、") || "—";
  lines.push(`启用项目：${enabled}`);
  lines.push("");
  lines.push("请补充：");
  lines.push("- 发生了什么：");
  lines.push("- 我点了哪里（复现步骤1/2/3）：");
  lines.push("- 期望结果：");
  lines.push("- 实际结果：");
  lines.push("- 是否可复现：是/否/不确定");
  if(withSummary){
    lines.push("");
    lines.push("【附：微信版摘要】");
    lines.push(buildExportTextShort());
  }
  return lines.join("\n");
}

function buildFullBackupJSON(){
  // NOTE: 文件本体存在 IndexedDB；这里只导出元数据与记录。
  return {
    exportedAt: nowISO(),
    appVersion: VERSION,
    storageKey: STORAGE_KEY,
    state
  };
}

function importBackupFromJSONText(text){
  const obj = JSON.parse(text);
  const st = obj && obj.state ? obj.state : obj;
  if(!st || typeof st !== "object") throw new Error("Invalid backup");
  localStorage.setItem(STORAGE_KEY, JSON.stringify(st));
}

function deleteIndexedDB(dbName){
  return new Promise((resolve)=>{
    try{
      const req = indexedDB.deleteDatabase(dbName);
      req.onsuccess = ()=>resolve();
      req.onerror = ()=>resolve();
      req.onblocked = ()=>resolve();
    }catch(e){
      resolve();
    }
  });
}

async function wipeAllLocalData(){
  try{ localStorage.removeItem(STORAGE_KEY); }catch(_e){}
  await deleteIndexedDB(FILE_DB_NAME);
}




async function copyExport(mode="short"){
  mode = (mode==="clinic") ? "clinic" : "short";
  const text = (mode === "clinic") ? buildExportText() : buildExportTextShort();
  try{
    await navigator.clipboard.writeText(text);
    toast(mode === "clinic" ? "已复制复诊版摘要（结构化），可粘贴给医生/随访护士" : "已复制微信版摘要，可直接粘贴给医生/家属");
  }catch(e){
    // fallback
    prompt("复制下面内容：", text);
  }
  qs("#exportPreview").textContent = text;
}

function toast(msg){
  openSimpleModal("提示", "", `<div class="note">${escapeHtml(msg)}</div>`, `<button class="primary" data-close="modalSimple">知道了</button>`);
  qsa("#modalSimple [data-close]").forEach(b=>b.onclick = ()=>closeModal("modalSimple"));
}
