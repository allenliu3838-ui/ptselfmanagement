/* render.js - All rendering functions, navigation, and modal show/close */
function renderExplainPage(){
  const titleEl = qs("#expTitle");
  const subEl = qs("#expSubtitle");
  const bodyEl = qs("#expBody");
  const actionsEl = qs("#expActions");
  if(!titleEl || !bodyEl || !actionsEl) return; // page not present

  const id = state.ui?.explainerId || "";
  const e = explainerById(id);

  titleEl.textContent = e.title || "检查说明";
  if(subEl) subEl.textContent = e.subtitle || "";

  const mkList = (arr)=> arr && arr.length ? `<ul>${arr.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul>` : "";

  bodyEl.innerHTML = `
    <div class="explain-section">
      <div class="explain-h">为什么要做</div>
      <div class="explain-p">${escapeHtml(e.why || "")}</div>
    </div>
    <div class="explain-section">
      <div class="explain-h">我们重点看什么</div>
      <div class="explain-p">${mkList(e.focus)}</div>
    </div>
    <div class="explain-section">
      <div class="explain-h">怎么做更有用</div>
      <div class="explain-p">${mkList(e.howto)}</div>
    </div>
    <div class="explain-section">
      <div class="explain-h">这条数据会用到哪里</div>
      <div class="explain-p">${mkList(e.usedfor)}</div>
    </div>
    <div class="explain-section">
      <div class="explain-h">什么时候要尽快联系团队/就医（红旗）</div>
      <div class="explain-p">${mkList(e.redflags)}</div>
    </div>
    ${e.review ? `<div class="note">内容审核：${escapeHtml(e.review)}</div>` : `<div class="note">提示：该说明用于随访教育与复诊整理，不替代医生诊疗决策。</div>`}
  `;

  actionsEl.innerHTML = "";
  const backBtn = document.createElement("button");
  backBtn.className = "ghost";
  backBtn.textContent = "返回";
  backBtn.onclick = overlayBack;
  actionsEl.appendChild(backBtn);

  if(e.action?.fn){
    const actBtn = document.createElement("button");
    actBtn.className = "primary";
    actBtn.textContent = e.action.label || "去记录";
    actBtn.onclick = ()=>{
      // Return first (reduce context loss), then run the action.
      const fn = e.action.fn;
      overlayBack();
      setTimeout(()=>runActionFn(fn), 0);
    };
    actionsEl.appendChild(actBtn);
  }
}

function renderGuidePage(){
  const bodyEl = qs("#guideBody");
  if(!bodyEl) return;

  const prog = state.activeProgram;
  const progName = programLabel(prog);

  const headline = {
    kidney: "肾脏随访的意义：把‘零散检查’变成‘可行动的趋势’",
    dialysis: "透析随访的意义：少出意外、少折腾、复诊更高效",
    stone: "结石随访的意义：减少复发、把发作变成可解释的时间线",
    peds: "儿肾随访的意义：把生长与肾功能放在同一条时间线上",
  }[prog] || "随访的意义";

  bodyEl.innerHTML = `
    <div class="guide-title">${escapeHtml(headline)}</div>

    <div class="guide-section">
      <div class="guide-h">为什么要随访？（一句话）</div>
      <div class="guide-p">随访不是“多做检查”，而是“更早发现风险 → 更早沟通 → 少住院/少并发症”。</div>
    </div>

    <div class="guide-section">
      <div class="guide-h">你能得到什么？（最重要的 3 件事）</div>
      <ul>
        <li><b>更早发现变化</b>：趋势比单次数值更可靠（血压/体重/尿检/化验）。</li>
        <li><b>复诊更高效</b>：一页摘要把“最近变化点”整理好，医生更容易抓重点。</li>
        <li><b>更安全</b>：红旗优先（胸痛、气促、意识异常、少尿/无尿、发热+剧烈腰痛等）会被置顶提醒。</li>
      </ul>
    </div>

    <div class="guide-section">
      <div class="guide-h">我们希望你怎么用？（最省力的做法）</div>
      <ol>
        <li>每天打开一次 <b>首页 → 今日行动</b>，完成 1–2 项关键记录。</li>
        <li>有检查报告就上传到 <b>资料库</b>（活检/基因/影像/免疫学报告）。</li>
        <li>复诊前 1 分钟：在 <b>我的 → 一页摘要</b> 复制发给医生/随访护士。</li>
      </ol>
    </div>

    <div class="guide-section">
      <div class="guide-h">为什么每一项都要解释“意义”？</div>
      <ul>
        <li>因为每个检查都在回答一个问题：例如“肾功能稳定吗？”“蛋白尿有没有改善？”“水分管理是否合适？”</li>
        <li>当你理解“目的”，你更容易坚持，也更不焦虑。</li>
        <li>所以你会在每个任务旁看到 <b>i</b>：点开就是该项的独立说明页。</li>
      </ul>
    </div>

    <div class="disclaimer" style="margin-top:14px;">
      <strong>边界：</strong>本工具用于记录、教育与复诊整理，不提供诊断或处方。出现红旗症状，请立即就医或联系随访团队。
    </div>
  `;
}

function setTabLabel(key, label){
  const btn = qs(`.tab[data-nav="${key}"]`);
  if(btn) btn.textContent = label;
}

function renderTabbar(){
  const prog = state.activeProgram;
  const cfg = WORKSPACE_TABS[prog] || WORKSPACE_TABS.kidney;

  // Primary tabs
  setTabLabel("home", "首页");
  setTabLabel("records", cfg.records);
  setTabLabel("docs", "资料库");
  setTabLabel("me", "我的");

  // Optional AI tab (can be hidden to reduce confusion)
  const showAI = showAITab();
  const aiBtn = qs('.tab[data-nav="ai"]');
  if(aiBtn){
    aiBtn.classList.toggle("hidden", !showAI);
    if(showAI) setTabLabel("ai", "AI");
  }

  // Layout: 4 tabs by default, 5 if AI is shown
  const bar = qs("nav.tabbar");
  if(bar) bar.setAttribute("data-cols", showAI ? "5" : "4");

  // If AI tab is hidden but currently selected, fall back to Home
  if(!showAI && currentTabKey === "ai") currentTabKey = "home";
}


function renderHeader(){
  qs("#versionPill").textContent = `v${VERSION} · 内测`;
  qs("#meVersion").textContent = VERSION;

  qs("#brandSubtitle").textContent = `项目：${programLabel(state.activeProgram)}`;
  qs("#meProgram").textContent = programLabel(state.activeProgram);

  const enabled = Object.keys(PROGRAMS).filter(k=>isProgramEnabled(k)).map(k=>programLabel(k)).join("、");
  qs("#meEnabled").textContent = enabled;

  qs("#pillIdentity").textContent = `身份：${identityText()}`;

  renderTabbar();
}

function homeMoreOpen(){
  if(state.ui && typeof state.ui.homeMoreOpen !== "undefined") return !!state.ui.homeMoreOpen;
  return !!(state.ui && state.ui.homeMoreDefault);
}

function applyHomeMoreUI(){
  const open = homeMoreOpen();
  try{ document.body.setAttribute("data-home-more", open ? "1" : "0"); }catch(_e){}
  const btn = qs("#btnHomeMoreToggle");
  if(btn) btn.textContent = open ? "收起更多内容" : "展开更多内容";
}

function toggleHomeMore(){
  state.ui = state.ui || {};
  state.ui.homeMoreOpen = !homeMoreOpen();
  saveState();
  applyHomeMoreUI();
}

function renderHome(){
  applyHomeMoreUI();
  qs("#todayDate").textContent = niceDate(yyyyMMdd(new Date()));
  const tasks = todayTasks();
  const list = qs("#todayTasks");
  list.innerHTML = "";
  tasks.forEach(t=>{
    const el = document.createElement("div");
    el.className = "task" + (t.done ? " done":"");
    el.innerHTML = `
      <div class="left">
        <div class="checkbox" role="checkbox" aria-checked="${t.done}" title="${t.autoDone?"已由记录自动完成":(t.manualDone?"已标记完成":"")}"></div>
        <div>
          <div class="title">${escapeHtml(t.title)}</div>
          <div class="meta">${escapeHtml(t.meta||"")}${t.autoDone?` <span class="muted">· 已记录</span>`:""}</div>
        </div>
      </div>
      <div class="right">
        ${t.action ? `<button class="ghost small task-action" data-task-act="${escapeHtml(t.id)}">${escapeHtml(t.action.label)}</button>` : ``}
        ${t.exp ? `<button class="info-btn small" data-exp="${escapeHtml(t.exp)}" aria-label="为什么要做">i</button>` : ``}
        ${t.badge ? `<div class="badge ${badgeClass(t.badge.type)}">${escapeHtml(t.badge.text)}</div>` : ``}
      </div>
    `;
    // Default row click: for action tasks -> go to action; otherwise toggle.
    el.addEventListener("click", ()=>{
      if(t.action && typeof t.action.onClick === "function"){
        t.action.onClick();
      }else{
        toggleTask(t.id);
      }
    });

    // Checkbox: keep manual toggle available for non-auto-done tasks
    const cb = el.querySelector(".checkbox");
    if(cb){
      cb.onclick = (e)=>{
        e.preventDefault();
        e.stopPropagation();
        if(t.autoDone){
          toast("该任务已由记录自动完成");
          return;
        }
        toggleTask(t.id);
      };
    }

    // Task action button: stop propagation so it doesn't toggle
    const btn = el.querySelector("button.task-action");
    if(btn){
      btn.onclick = (e)=>{
        e.preventDefault();
        e.stopPropagation();
        if(t.action && typeof t.action.onClick === "function") t.action.onClick();
      };
    }
    list.appendChild(el);
  });

  qs("#btnMarkAllDone").onclick = ()=>markAllTasksDone(tasks);
  const bPlan = qs("#btnGoPlan");
  if(bPlan) bPlan.onclick = ()=>navigate("followup");

  // Safety
  const safety = safetySignals();
  const safetyBox = qs("#safetyContent");
  safetyBox.innerHTML = safety.map(s => `
    <div class="list-item">
      <div class="t">${badgeDot(s.level)} ${escapeHtml(s.title)}</div>
      <div class="s">${escapeHtml(s.detail)}</div>
    </div>
  `).join("");

  // Program main card
  renderProgramMainCard();

  // Diet (v1 food library: 高钾/高磷食物库)
  const diet = dietSignals();
  const focus = dietFocus();
  const dietBox = qs("#dietContent");

  const badgesHtml = diet.length
    ? `<div class="row">${diet.map(t=>`<div class="badge info">${escapeHtml(t.label)}</div>`).join("")}</div>`
    : ``;

  const focusLines = [];
  if(focus.highK){
    const kTxt = (focus.k===null) ? "" : String(focus.k);
    focusLines.push(`血钾偏高${kTxt?`（${kTxt}）`:``}：本周优先关注“高钾食物/代盐避坑”。`);
  }
  if(focus.highP){
    const pTxt = (focus.p===null) ? "" : String(focus.p);
    focusLines.push(`血磷偏高${pTxt?`（${pTxt}）`:``}：本周优先减少“含磷添加剂”的加工食品。`);
  }

  const focusHtml = focusLines.length
    ? `<div class="list-item"><div class="t">本周重点</div><div class="s">${escapeHtml(focusLines.join(" "))}</div></div>`
    : `<div class="note">想知道“能不能吃”？点右上角【饮食中心】搜索食物；每个食物都有单独的解释与替代选择。</div>`;

  dietBox.innerHTML = `
    ${badgesHtml}
    ${focusHtml}
    <div class="row" style="margin-top:10px;">
      <button class="ghost small" data-diet-open="highK">高钾食物</button>
      <button class="ghost small" data-diet-open="highP">高磷食物</button>
      <button class="ghost small" data-diet-open="both">钾+磷双高</button>
      <button class="ghost small" data-diet-open="additiveP">磷添加剂避坑</button>
    </div>
    <div class="note subtle">提示：饮食仅做健康教育与避坑提醒；具体限制与目标请以医生/营养师个体化方案为准。</div>
  `;

  qsa('#dietContent [data-diet-open]').forEach(btn=>{
    btn.onclick = (e)=>{
      e.preventDefault();
      e.stopPropagation();
      openDietModal(btn.getAttribute('data-diet-open'));
    };
  });

  // Knowledge
  const rec = recommendKnowledge();
  const box = qs("#knowledgeContent");
  if(!rec.length){
    box.innerHTML = `<div class="note">暂无推荐（示意）。你可以先完善“资料/项目”，或录入一次化验后再看推荐。</div>`;
  }else{
    box.innerHTML = rec.map(a => `
      <div class="list-item">
        <div class="t">${escapeHtml(a.title)}</div>
        <div class="s">${escapeHtml(a.body)}</div>
        <div class="row" style="margin-top:10px;">
          <button class="ghost small" data-knowledge="${a.id}">做一个行动：${escapeHtml(a.action.label)}</button>
        </div>
      </div>
    `).join("");
    qsa("button[data-knowledge]").forEach(btn=>{
      btn.onclick = ()=>doKnowledgeAction(btn.getAttribute("data-knowledge"));
    });
  }

  // Recent
  const recentBox = qs("#recentContent");
  recentBox.innerHTML = renderRecent();

  // Dialysis card on Home: only show when dialysis program is enabled or active
  const dCard = qs("#cardDialysisHome");
  if(dCard) dCard.classList.toggle("hidden", !(state.activeProgram==="dialysis" || state.enabledPrograms?.dialysis));

  // buttons
  qs("#btnExport").onclick = ()=>copyExport();
  qs("#btnDiet").onclick = ()=>openDietModal();
  qs("#btnKnowledge").onclick = ()=>openKnowledgeModal();
  qs("#btnProgramMainAction").onclick = ()=>openProgramMainModal();
  qs("#btnTriage").onclick = ()=>openTriageModal();
}

function renderProgramMainCard(){
  const title = qs("#programMainTitle");
  const subtitle = qs("#programMainSubtitle");
  const content = qs("#programMainContent");
  const actionBtn = qs("#btnProgramMainAction");

  if(state.activeProgram === "kidney"){
    title.textContent = "肾脏随访速览";
    subtitle.textContent = "关键趋势：肾功/尿检/血压（示意）";
    const lab = latestLab();
    const bp = latestVital(state.vitals.bp);
    const wt = latestVital(state.vitals.weight);
    // Optional: show key advanced marker snapshot for relevant populations (avoid clutter)
    const scope = markerScopeFromState();
    const latestMk = (type)=>{
      return (state.markers||[])
        .filter(m => m.type===type && (m.scope||"kidney")===scope)
        .sort((a,b)=> (a.date||"").localeCompare(b.date||""))
        .slice(-1)[0] || null;
    };
    let mkShort = "";
    if(scope === "tx"){
      const a = latestMk("ddcfDNA");
      const d = latestMk("dsa");
      const p = [];
      if(a?.payload?.value) p.push(`dd-cfDNA ${a.payload.value}${a.payload.unit?" "+a.payload.unit:"%"}`);
      if(d?.payload?.result) p.push(`DSA ${d.payload.result}${d.payload.maxMfi?"(MFI "+d.payload.maxMfi+")":""}`);
      mkShort = p.join(" · ");
    } else if(scope === "mn"){
      const m = latestMk("antiPLA2R");
      if(m?.payload?.value) mkShort = `anti-PLA2R ${m.payload.value}${m.payload.unit?" "+m.payload.unit:""}`;
    } else if(scope === "ln"){
      const a = latestMk("dsDNA");
      const c3 = latestMk("c3");
      const c4 = latestMk("c4");
      const p = [];
      if(a?.payload?.value) p.push(`dsDNA ${a.payload.value}${a.payload.unit?" "+a.payload.unit:""}`);
      if(c3?.payload?.value) p.push(`C3 ${c3.payload.value}${c3.payload.unit?" "+c3.payload.unit:""}`);
      if(c4?.payload?.value) p.push(`C4 ${c4.payload.value}${c4.payload.unit?" "+c4.payload.unit:""}`);
      mkShort = p.join(" · ");
    } else if(scope === "mcd" || scope === "fsgs"){
      const m = latestMk("antiNephrin");
      if(m?.payload?.extra || m?.payload?.value){
        mkShort = `anti-nephrin ${m.payload.extra||""}${m.payload.value?" "+m.payload.value:""}`.trim();
      }
    }

    // Document vault brief
    const docs = docsForProgram("kidney");
    const docsShort = docs.length
      ? `${docs.length}份（最近：${docCategoryLabel(docs[0].category)} ${docs[0].date?niceDate(docs[0].date):""}）`
      : "";
    content.innerHTML = `
      <div class="kv"><span>最近化验</span><span>${lab?.date ? niceDate(lab.date) : "暂无"}</span></div>
      <div class="kv"><span>肌酐</span><span>${lab?.scr ? `${lab.scr} ${lab.scrUnit==="mgdl"?"mg/dL":"μmol/L"}` : "—"}</span></div>
      <div class="kv"><span>eGFR</span><span>${lab?.egfr ? `${lab.egfr}` : "—"}</span></div>
      <div class="kv"><span>最近血压</span><span>${bp ? `${bp.sys}/${bp.dia} (${niceDate(bp.dateTime.slice(0,10))})` : "—"}</span></div>
      <div class="kv"><span>最近体重</span><span>${wt ? `${wt.kg} kg (${niceDate(wt.dateTime.slice(0,10))})` : "—"}</span></div>
      ${mkShort ? `<div class="kv"><span>高级指标</span><span>${escapeHtml(mkShort)}</span></div>` : ``}
      ${docsShort ? `<div class="kv"><span>资料库</span><span>${escapeHtml(docsShort)}</span></div>` : ``}
      <div class="note subtle">建议：每次复诊带上“90天趋势 + 关键问题清单”。</div>
    `;
    actionBtn.textContent = "去录入化验";
  } else if(state.activeProgram === "htn"){
    title.textContent = "高血压随访速览";
    subtitle.textContent = "家庭血压趋势 + 用药依从（示意）";

    const bp = latestVital(state.vitals.bp);
    const bpSorted = [...(state.vitals.bp||[])].sort((a,b)=> (a.dateTime||"").localeCompare(b.dateTime||""));
    const lastN = bpSorted.slice(-14);
    const avg = (arr, key)=>{
      const vals = arr.map(x=>toNum(x?.[key])).filter(v=>v!==null);
      if(!vals.length) return null;
      const s = vals.reduce((a,b)=>a+b,0);
      return Math.round((s/vals.length)*10)/10;
    };
    const avgSys = avg(lastN, "sys");
    const avgDia = avg(lastN, "dia");
    const tgt = (state.htn?.targetSys || state.htn?.targetDia) ? `${state.htn?.targetSys||"—"}/${state.htn?.targetDia||"—"}` : "未设置";
    const freqTxt = (state.htn?.bpFreq === "daily2") ? "每日2次" : "每日1次";

    const lastMeds = (state.medsLog||[])
      .filter(m=>m.program==="htn")
      .sort((a,b)=> (a.dateTime||"").localeCompare(b.dateTime||""))
      .slice(-1)[0] || null;

    content.innerHTML = `
      <div class="kv"><span>频率</span><span>${escapeHtml(freqTxt)}</span></div>
      <div class="kv"><span>目标（可选）</span><span>${escapeHtml(tgt)}</span></div>
      <div class="kv"><span>最近血压</span><span>${bp ? `${bp.sys}/${bp.dia} (${niceDate(bp.dateTime.slice(0,10))})` : "—"}</span></div>
      <div class="kv"><span>近14条平均</span><span>${(avgSys!==null && avgDia!==null) ? `${avgSys}/${avgDia}` : "—"}</span></div>
      <div class="kv"><span>最近用药打卡</span><span>${lastMeds ? `${niceDate(lastMeds.dateTime.slice(0,10))} · ${escapeHtml(labelMedsStatus(lastMeds.status))}` : "—"}</span></div>
      <div class="note subtle">提示：阈值与目标请以医生建议为准；本内测版提供记录与复诊整理。</div>
    `;
    actionBtn.textContent = "记录一次血压";
  } else if(state.activeProgram === "dm"){
    title.textContent = "糖尿病随访速览";
    subtitle.textContent = "血糖趋势 + HbA1c（示意）";

    const unit = state.dm?.glucoseUnit === "mgdl" ? "mg/dL" : "mmol/L";
    const toUnit = (mmol)=>{
      if(mmol===null) return null;
      return (unit==="mg/dL") ? Math.round((mmol*18)*10)/10 : Math.round(mmol*10)/10;
    };
    const gSorted = [...(state.vitals.glucose||[])].sort((a,b)=> (a.dateTime||"").localeCompare(b.dateTime||""));
    const lastG = gSorted.slice(-1)[0] || null;
    const lastGMmol = (lastG && toNum(lastG.value)!==null)
      ? ((lastG.unit||"mmolL")==="mgdl" ? toNum(lastG.value)/18 : toNum(lastG.value))
      : null;
    const lastN = gSorted.slice(-14);
    const avgMmol = (()=>{
      const vals = lastN.map(x=>{
        const v = toNum(x?.value);
        if(v===null) return null;
        const u = x?.unit || "mmolL";
        return (u==="mgdl") ? (v/18) : v;
      }).filter(v=>v!==null);
      if(!vals.length) return null;
      const s = vals.reduce((a,b)=>a+b,0);
      return s/vals.length;
    })();

    const lab = latestLab();
    const lastA1c = lab?.hba1c ? `${lab.hba1c}%` : "—";
    const tgtA1c = state.dm?.a1cTarget ? `${state.dm.a1cTarget}%` : "未设置";
    const lastMeds = (state.medsLog||[])
      .filter(m=>m.program==="dm")
      .sort((a,b)=> (a.dateTime||"").localeCompare(b.dateTime||""))
      .slice(-1)[0] || null;

    content.innerHTML = `
      <div class="kv"><span>单位</span><span>${escapeHtml(unit)}</span></div>
      <div class="kv"><span>最近血糖</span><span>${(lastGMmol!==null) ? `${toUnit(lastGMmol)} ${escapeHtml(unit)}${lastG?.tag?` · ${escapeHtml(lastG.tag)}`:""} (${niceDate(lastG.dateTime.slice(0,10))})` : "—"}</span></div>
      <div class="kv"><span>近14条平均</span><span>${avgMmol!==null ? `${toUnit(avgMmol)} ${escapeHtml(unit)}` : "—"}</span></div>
      <div class="kv"><span>HbA1c</span><span>${escapeHtml(lastA1c)} · 目标（可选）${escapeHtml(tgtA1c)}</span></div>
      <div class="kv"><span>最近用药打卡</span><span>${lastMeds ? `${niceDate(lastMeds.dateTime.slice(0,10))} · ${escapeHtml(labelMedsStatus(lastMeds.status))}` : "—"}</span></div>
      <div class="note subtle">提示：不要凭单次血糖自行调整用药；出现红旗症状优先就医/联系团队。</div>
    `;
    actionBtn.textContent = "记录一次血糖";
  } else if(state.activeProgram === "stone"){
    title.textContent = "结石管理速览";
    subtitle.textContent = "喝水 + 发作事件 + 红旗分诊（示意）";
    const today = yyyyMMdd(new Date());
    const cur = toNum(state.stone.intakeLog?.[today]) || 0;
    const tgt = toNum(state.stone.targetMl);
    const pct = tgt ? clamp(Math.round(cur/tgt*100), 0, 999) : null;
    const limit = state.stone.fluidRestricted === "true";
    content.innerHTML = `
      <div class="kv"><span>今日饮水</span><span>${cur} ml${tgt?` / ${tgt} ml`:``}</span></div>
      <div class="kv"><span>模式</span><span>${limit ? "限水（以医嘱为准）" : "非限水"}</span></div>
      ${tgt && !limit ? `<div class="kv"><span>达成</span><span>${pct}%</span></div>` : ``}
      <div class="note subtle">提示：发热伴腰痛/寒战、无尿/少尿明显属于红旗，优先就医。</div>
      <div class="row">
        <button class="primary small" id="btnAddWater250">+250ml</button>
        <button class="ghost small" id="btnStoneEvent">记录症状</button>
      </div>
    `;
    actionBtn.textContent = "打开结石面板";
    setTimeout(()=>{
      const b = qs("#btnAddWater250");
      if(b) b.onclick = ()=>addWater(250);
      const e = qs("#btnStoneEvent");
      if(e) e.onclick = ()=>quickSymptoms({preset:["腰痛/绞痛","血尿"]});
    }, 0);
  } else if(state.activeProgram === "dialysis"){
    title.textContent = "透析随访速览";
    subtitle.textContent = "血透/腹透：体重、血压、通路/腹透红旗（示意）";

    const mod = state.dialysis?.modality || "hd";
    const modTxt = labelDialysisModality(mod);
    const isDay = isDialysisDayToday();
    const daysTxt = (mod === "hd") ? (state.dialysis?.hdDays?.length ? state.dialysis.hdDays.map(labelWeekday).join("、") : "未设置") : "每日";
    const access = labelDialysisAccess(state.dialysis?.accessType || "unknown");
    const dry = state.dialysis?.dryWeightKg ? `${state.dialysis.dryWeightKg} kg` : "—";
    const limit = state.dialysis?.fluidRestricted === "true";
    const limitMl = state.dialysis?.fluidLimitMl ? `${state.dialysis.fluidLimitMl} ml/天` : "—";
    const bp = latestVital(state.vitals.bp);
    const wt = latestVital(state.vitals.weight);
    const lastSession = state.dialysis?.sessions?.length ? state.dialysis.sessions.slice(-1)[0] : null;

    content.innerHTML = `
      <div class="kv"><span>方式</span><span>${escapeHtml(modTxt)}</span></div>
      <div class="kv"><span>${mod === "hd" ? "透析日" : "频率"}</span><span>${escapeHtml(daysTxt)}${mod === "hd" ? (isDay ? "（今日）" : "") : ""}</span></div>
      <div class="kv"><span>通路/导管</span><span>${escapeHtml(access)}</span></div>
      <div class="kv"><span>干体重（可选）</span><span>${escapeHtml(dry)}</span></div>
      <div class="kv"><span>限水</span><span>${limit ? `是 · ${escapeHtml(limitMl)}` : "不确定/否"}</span></div>
      <div class="kv"><span>最近血压</span><span>${bp ? `${bp.sys}/${bp.dia} (${niceDate(bp.dateTime.slice(0,10))})` : "—"}</span></div>
      <div class="kv"><span>最近体重</span><span>${wt ? `${wt.kg} kg (${niceDate(wt.dateTime.slice(0,10))})` : "—"}</span></div>
      <div class="kv"><span>最近透析记录</span><span>${lastSession ? `${niceDate(lastSession.dateTime.slice(0,10))} · ${lastSession.modality === "pd" ? "PD" : "HD"}` : "—"}</span></div>
      <div class="note subtle">提示：出现胸痛/呼吸困难/意识改变/抽搐、导管或腹透红旗等，请优先联系透析团队/就医。</div>
      <div class="row">
        <button class="primary small" id="btnDialysisRecord">记录一次透析</button>
        <button class="ghost small" id="btnDialysisTriage">红旗分诊</button>
      </div>
    `;

    actionBtn.textContent = "透析面板";
    setTimeout(()=>{
      const b = qs("#btnDialysisRecord");
      if(b) b.onclick = ()=>openDialysisSessionModal();
      const t = qs("#btnDialysisTriage");
      if(t) t.onclick = ()=>openTriageModal();
    },0);
  } else if(state.activeProgram === "peds"){
    title.textContent = "儿肾随访速览";
    subtitle.textContent = "生长 + 儿科血压/肾功能（示意）";
    const age = computeAgeYears(state.peds.dob);
    const lab = latestLab();
    const lastH = latestVital(state.vitals.height);
    const lastW = latestVital(state.vitals.weight);
    const h = toNum(lastH?.cm ?? state.peds.heightCm);
    const w = toNum(lastW?.kg ?? state.peds.weightKg);
    const bmi = (h && w) ? Math.round((w / Math.pow(h/100,2))*10)/10 : null;
    const hv = computeVelocityInfo(state.vitals.height, "cm", { preferDays: 180, minDays: 30 });
    const wv = computeVelocityInfo(state.vitals.weight, "kg", { preferDays: 180, minDays: 30 });
    let egfr = null;
    if(lab?.scr){
      egfr = pedsEgfrBedsideSchwartz(h, lab.scr, lab.scrUnit || "umolL");
    }
    content.innerHTML = `
      <div class="kv"><span>孩子</span><span>${escapeHtml(state.peds.childName || "未命名")} ${age===null?"":`${age}岁`}</span></div>
      <div class="kv"><span>最近身高</span><span>${h?`${h} cm`:"—"}</span></div>
      <div class="kv"><span>最近体重</span><span>${w?`${w} kg`:"—"}</span></div>
      <div class="kv"><span>BMI</span><span>${bmi!==null?bmi:"—"}</span></div>
      <div class="kv"><span>身高生长速度</span><span>${hv?`${hv.perYear} cm/年（${hv.days}天）`:"—"}</span></div>
      <div class="kv"><span>体重增长速度</span><span>${wv?`${wv.perYear} kg/年（${wv.days}天）`:"—"}</span></div>
      <div class="kv"><span>儿科eGFR（估算）</span><span>${egfr!==null?`${egfr}（Bedside Schwartz）`:"—"}</span></div>
      <div class="note subtle">说明：儿童血压与肾功能解读更依赖身高/年龄百分位与医生判读；本内测版先做“记录与复诊整理”。</div>
    `;
    actionBtn.textContent = "去记录身高";
  } else {
    title.textContent = "项目卡片";
    subtitle.textContent = "请选择项目";
    content.textContent = "—";
    actionBtn.textContent = "打开";
  }
}

function badgeClass(type){
  if(type === "danger") return "danger";
  if(type === "ok") return "ok";
  return "info";
}
function badgeDot(level){
  if(level === "danger") return `<span class="badge danger">红旗</span>`;
  if(level === "ok") return `<span class="badge ok">正常</span>`;
  return `<span class="badge info">提示</span>`;
}

function renderRecent(){
  const pieces = [];
  const lab = latestLab();
  if(lab){
    const parts = [];
    if(lab.scr) parts.push(`Scr ${lab.scr}${lab.scrUnit==="mgdl"?"mg/dL":"μmol/L"}`);
    if(lab.egfr) parts.push(`eGFR ${lab.egfr}`);
    if(lab.k) parts.push(`K ${lab.k}`);
    if(lab.na) parts.push(`Na ${lab.na}`);
    if(lab.glu) parts.push(`Glu ${lab.glu}`);
    pieces.push(`<div class="list-item"><div class="t">最近化验：${niceDate(lab.date||"")}</div><div class="s">${escapeHtml(parts.join(" · ") || "—")}</div></div>`);
  }
  const bp = latestVital(state.vitals.bp);
  if(bp) pieces.push(`<div class="list-item"><div class="t">最近血压</div><div class="s">${bp.sys}/${bp.dia} · ${niceDate(bp.dateTime.slice(0,10))} ${bp.context?`· ${escapeHtml(bp.context)}`:""}</div></div>`);
  const wt = latestVital(state.vitals.weight);
  if(wt) pieces.push(`<div class="list-item"><div class="t">最近体重</div><div class="s">${wt.kg} kg · ${niceDate(wt.dateTime.slice(0,10))}</div></div>`);

  // Dialysis sessions (if enabled)
  const ds = state.dialysis?.sessions?.length ? state.dialysis.sessions.slice(-1)[0] : null;
  if(ds){
    const line = (ds.modality==="pd")
      ? `PD · UF ${ds.ufMl||"—"} ml · 透析液：${ds.effluent||"—"}`
      : `HD · 透前 ${ds.preWeightKg||"—"} kg → 透后 ${ds.postWeightKg||"—"} kg · UF ${ds.ufMl||"—"} ml`;
    pieces.push(`<div class="list-item"><div class="t">最近透析记录</div><div class="s">${escapeHtml(line)} · ${niceDate(ds.dateTime.slice(0,10))}</div></div>`);
  }
  const ur = state.urineTests?.length ? [...state.urineTests].sort((a,b)=> (a.date||"").localeCompare(b.date||"")).slice(-1)[0] : null;
  if(ur) pieces.push(`<div class="list-item"><div class="t">最近尿检</div><div class="s">蛋白 ${escapeHtml(ur.protein||"—")} · 潜血 ${escapeHtml(ur.blood||"—")} · ${niceDate(ur.date)}</div></div>`);

  if(state.enabledPrograms?.stone){
    const today = yyyyMMdd(new Date());
    const cur = toNum(state.stone.intakeLog?.[today]);
    if(cur !== null){
      pieces.push(`<div class="list-item"><div class="t">今日饮水（结石）</div><div class="s">${cur} ml · ${niceDate(today)}</div></div>`);
    }
  }
  if(!pieces.length) return `<div class="note">还没有记录。建议先：填写资料 → 录入一次化验/血压/体重。</div>`;
  return pieces.join("");
}

function renderLabsList(){
  const labsBox = qs("#labsList");
  if(!labsBox) return;
  if(!state.labs?.length){
    labsBox.innerHTML = `<div class="note">暂无化验。点击“新增”录入一次。</div>`;
  } else {
    const sorted = [...state.labs].sort((a,b)=> (a.date||"").localeCompare(b.date||"")).reverse();
    labsBox.innerHTML = sorted.slice(0,8).map(l => {
      const items = [];
      if(l.scr) items.push(`Scr ${l.scr}${l.scrUnit==="mgdl"?"mg/dL":"μmol/L"}`);
      if(l.egfr) items.push(`eGFR ${l.egfr}`);
      if(l.k) items.push(`K ${l.k}`);
      if(l.na) items.push(`Na ${l.na}`);
      if(l.p) items.push(`P ${l.p}`);
      if(l.ca) items.push(`Ca ${l.ca}`);
      if(l.mg) items.push(`Mg ${l.mg}`);
      if(l.glu) items.push(`Glu ${l.glu}`);
      if(l.hba1c) items.push(`HbA1c ${l.hba1c}`);
      return `<div class="list-item">
        <div class="t">${niceDate(l.date||"")}</div>
        <div class="s">${escapeHtml(items.join(" · ") || "—")}</div>
      </div>`;
    }).join("");
  }
}

function renderUrineList(){
  const urineBox = qs("#urineList");
  if(!urineBox) return;
  if(!state.urineTests?.length){
    urineBox.innerHTML = `<div class="note">暂无尿检记录。肾小球病/ADPKD 建议做时间线记录（示意）。</div>`;
  } else {
    const sorted = [...state.urineTests].sort((a,b)=> (a.date||"").localeCompare(b.date||"")).reverse();
    urineBox.innerHTML = sorted.slice(0,8).map(u => `
      <div class="list-item">
        <div class="t">${niceDate(u.date||"")}</div>
        <div class="s">蛋白：${escapeHtml(u.protein||"—")} · 潜血：${escapeHtml(u.blood||"—")} ${u.note?`· 备注：${escapeHtml(u.note)}`:""}</div>
      </div>
    `).join("");
  }
}

function renderDialysisSessionsInto(box){
  if(!box) return;
  if(!state.enabledPrograms?.dialysis){
    box.innerHTML = `<div class="note">未启用透析项目。到“资料”里开启后可记录透析数据（示意）。</div>`;
    return;
  }
  if(!state.dialysis?.sessions?.length){
    box.innerHTML = `<div class="note">暂无透析记录。点击“新增”记录一次（血透：透前/透后；腹透：UF/透析液）。</div>`;
    return;
  }
  const sorted = [...state.dialysis.sessions].sort((a,b)=> (a.dateTime||"").localeCompare(b.dateTime||"")).reverse();
  box.innerHTML = sorted.slice(0,8).map(s=>{
    const isPD = s.modality === "pd";
    const t = niceDate(s.dateTime?.slice(0,10) || "");
    const desc = isPD
      ? `PD · UF ${s.ufMl||"—"} ml · 透析液 ${s.effluent||"—"}${s.abdPain?" · 腹痛":""}${s.fever?" · 发热":""}${s.note?` · ${escapeHtml(s.note)}`:""}`
      : `HD · 透前 ${s.preWeightKg||"—"} kg/${s.preSys||"—"}/${s.preDia||"—"} → 透后 ${s.postWeightKg||"—"} kg/${s.postSys||"—"}/${s.postDia||"—"} · UF ${s.ufMl||"—"} ml${s.note?` · ${escapeHtml(s.note)}`:""}`;
    return `<div class="list-item"><div class="t">${t}</div><div class="s">${desc}</div></div>`;
  }).join("");
}

function renderStoneWater(){
  const box = qs("#stoneWaterList");
  if(!box) return;
  if(!state.enabledPrograms?.stone){
    box.innerHTML = `<div class="note">未启用结石项目。到“资料”里开启后可记录饮水与发作事件（示意）。</div>`;
    return;
  }
  const today = yyyyMMdd(new Date());
  const cur = toNum(state.stone.intakeLog?.[today]) || 0;
  const tgt = toNum(state.stone.targetMl);
  const limit = state.stone.fluidRestricted === "true";
  const pct = (tgt && !limit) ? clamp(Math.round(cur/tgt*100),0,999) : null;

  const lines = [];
  lines.push(`<div class="list-item"><div class="t">今日饮水</div><div class="s">${cur} ml${tgt?` / 目标 ${tgt} ml`:``}${limit?"（限水模式）":""}${pct!==null?` · 达成 ${pct}%`:""}</div></div>`);

  // conflict note (dialysis fluid restriction)
  const dialLimit = state.enabledPrograms?.dialysis && state.dialysis?.fluidRestricted === "true";
  if(dialLimit){
    lines.push(`<div class="note">你已标记“透析控水/限水”。结石喝水目标仅作记录，务必以透析中心医嘱为准。</div>`);
  }

  // last 7 days
  const days = [];
  for(let i=0;i<7;i++){
    const d = new Date();
    d.setDate(d.getDate()-i);
    const key = yyyyMMdd(d);
    const v = toNum(state.stone.intakeLog?.[key]);
    if(v !== null) days.push({key, v});
  }
  if(days.length){
    lines.push(`<div class="note subtle">近7天（有记录的天）：</div>`);
    lines.push(days.map(x=>`<div class="list-item"><div class="t">${niceDate(x.key)}</div><div class="s">${x.v} ml</div></div>`).join(""));
  } else {
    lines.push(`<div class="note subtle">近7天暂无饮水记录。可以从“+250ml”开始建立习惯。</div>`);
  }

  box.innerHTML = lines.join("");
}

function renderStoneEvents(){
  const box = qs("#stoneEventList");
  if(!box) return;
  if(!state.enabledPrograms?.stone){
    box.innerHTML = `<div class="note">未启用结石项目。</div>`;
    return;
  }
  const arr = state.stone?.events || [];
  if(!arr.length){
    box.innerHTML = `<div class="note">暂无发作事件。建议记录：腰痛/血尿/发热、是否就医/影像检查，复诊沟通更清晰。</div>`;
    return;
  }
  const sorted = [...arr].sort((a,b)=> (a.dateTime||"").localeCompare(b.dateTime||"")).reverse();
  box.innerHTML = sorted.slice(0,10).map(e=>{
    const tags = [];
    if(e.pain) tags.push(`疼痛 ${e.pain}/10`);
    if(e.hematuria) tags.push("血尿");
    if(e.fever) tags.push("发热");
    if(e.chills) tags.push("寒战");
    if(e.nausea) tags.push("恶心/呕吐");
    if(e.er) tags.push("已就医");
    if(e.imaging) tags.push(`影像：${escapeHtml(e.imaging)}`);
    const t = e.dateTime ? e.dateTime : "—";
    return `<div class="list-item">
      <div class="t">${escapeHtml(t)}</div>
      <div class="s">${escapeHtml(tags.join(" · ") || "—")}${e.note?` · 备注：${escapeHtml(e.note)}`:""}</div>
    </div>`;
  }).join("");
}

function renderPedsGrowth(){
  const box = qs("#pedsGrowthContent");
  if(!box) return;
  const age = computeAgeYears(state.peds.dob);
  const h = latestVital(state.vitals.height);
  const w = latestVital(state.vitals.weight);
  const hNum = toNum(h?.cm ?? state.peds.heightCm);
  const wNum = toNum(w?.kg ?? state.peds.weightKg);
  const bmi = (hNum && wNum) ? Math.round((wNum / Math.pow(hNum/100,2))*10)/10 : null;
  const hv = computeVelocityInfo(state.vitals.height, "cm", { preferDays: 180, minDays: 30 });
  const wv = computeVelocityInfo(state.vitals.weight, "kg", { preferDays: 180, minDays: 30 });
  const lines = [];
  lines.push(`<div class="list-item"><div class="t">孩子</div><div class="s">${escapeHtml(state.peds.childName||"—")} · ${age===null?"—":age+"岁"} · 监护人：${escapeHtml(state.peds.guardianName||"—")}</div></div>`);
  lines.push(`<div class="list-item"><div class="t">最近身高</div><div class="s">${h?`${h.cm} cm（${niceDate(h.dateTime.slice(0,10))}）`:"—"}</div></div>`);
  lines.push(`<div class="list-item"><div class="t">最近体重</div><div class="s">${w?`${w.kg} kg（${niceDate(w.dateTime.slice(0,10))}）`:"—"}</div></div>`);
  lines.push(`<div class="list-item"><div class="t">BMI</div><div class="s">${bmi!==null?bmi:"—"}</div></div>`);
  lines.push(`<div class="list-item"><div class="t">身高生长速度（年化）</div><div class="s">${hv?`${hv.perYear} cm/年（${hv.fromDate}→${hv.toDate}）`:"—"}</div></div>`);
  lines.push(`<div class="list-item"><div class="t">体重增长速度（年化）</div><div class="s">${wv?`${wv.perYear} kg/年（${wv.fromDate}→${wv.toDate}）`:"—"}</div></div>`);
  lines.push(`<div class="note subtle">提示：儿肾项目强调“生长 + 记录 + 复诊整理”。阈值与解读以儿肾医生为准。</div>`);
  box.innerHTML = lines.join("");
}

function renderRecords(){
  const prog = state.activeProgram;

  const showKidney = prog === "kidney";
  const showPeds = prog === "peds";
  const showDialysis = prog === "dialysis";
  const showStone = prog === "stone";
  const showHtn = prog === "htn";
  const showDm = prog === "dm";

  // show/hide panels
  const cardDialysis = qs("#cardDialysisRecords");
  const cardStoneWater = qs("#cardStoneWater");
  const cardStoneEvents = qs("#cardStoneEvents");
  const cardPedsGrowth = qs("#cardPedsGrowth");
  const cardDocs = qs("#cardDocs");
  const cardMarkers = qs("#cardMarkers");
  const groupLabsUrine = qs("#groupLabsUrine");
  const cardUrine = qs("#cardUrine");
  const cardVitals = qs("#cardVitals");

  if(cardDialysis) cardDialysis.classList.toggle("hidden", !showDialysis);
  if(cardStoneWater) cardStoneWater.classList.toggle("hidden", !showStone);
  if(cardStoneEvents) cardStoneEvents.classList.toggle("hidden", !showStone);
  if(cardPedsGrowth) cardPedsGrowth.classList.toggle("hidden", !showPeds);

  // Document vault always available (all programs may upload imaging/biopsy/etc)
  if(cardDocs) cardDocs.classList.toggle("hidden", false);

  // Advanced markers only shown when relevant (avoid clutter)
  const curScope = markerScopeFromState();
  const hasMarkerData = (state.markers||[]).some(m => (m.scope||"kidney") === curScope);
  const hasMarkerDefs = markerOptionsForCurrentUser().length > 0;
  const showMarkers = showKidney && (state.kidney?.track === "tx" || state.kidney?.track === "glomerular") && (hasMarkerData || hasMarkerDefs);
  if(cardMarkers) cardMarkers.classList.toggle("hidden", !showMarkers);

  // Labs are useful across CKD/透析/儿肾/HTN/DM；尿检仅在肾小球病/儿肾等更常用
  if(groupLabsUrine) groupLabsUrine.classList.toggle("hidden", showStone);
  if(cardUrine) cardUrine.classList.toggle("hidden", !(showKidney || showPeds));
  if(cardVitals) cardVitals.classList.toggle("hidden", showStone);

  // Adjust labs subtitle by program
  const labsTitle = qs("#cardLabs .card-title");
  const labsSub = qs("#cardLabs .card-subtitle");
  if(labsTitle && labsSub){
    if(showDialysis){
      labsTitle.textContent = "关键化验（可选）";
      labsSub.textContent = "透析常用：K/Na/Ca/P/血糖等（示意）";
    } else if(showPeds){
      labsTitle.textContent = "化验录入";
      labsSub.textContent = "儿科：肌酐单位 + 身高用于 eGFR（示意）";
    } else {
      labsTitle.textContent = "化验录入";
      labsSub.textContent = "支持肾功、电解质、代谢（示意）";
    }
  }

  // lists
  if(showKidney || showPeds || showDialysis || showHtn || showDm) renderLabsList();
  if(showKidney || showPeds) renderUrineList();

  // program panels
  if(showDialysis) renderDialysisSessionsInto(qs("#dialysisRecordsList"));
  if(showStone){
    renderStoneWater();
    renderStoneEvents();
  }
  if(showPeds) renderPedsGrowth();

  // Docs + markers
  renderDocsList();
  if(showMarkers) renderMarkersList();

  // keep home dialysis list fresh if present
  renderDialysisSessionsInto(qs("#dialysisList"));

  // quick tiles visibility (reduce confusion)
  const btnH = qs("#btnQuickHeight"); if(btnH) btnH.classList.toggle("hidden", !showPeds);
  const btnG = qs("#btnQuickGlucose"); if(btnG) btnG.classList.toggle("hidden", !(showKidney || showDialysis || showDm));
  const btnT = qs("#btnQuickTemp"); if(btnT) btnT.classList.toggle("hidden", showStone);
  const btnBP = qs("#btnQuickBP"); if(btnBP) btnBP.classList.toggle("hidden", showStone);
  const btnW = qs("#btnQuickWeight"); if(btnW) btnW.classList.toggle("hidden", showStone);
  const btnS = qs("#btnQuickSymptoms"); if(btnS) btnS.classList.toggle("hidden", showStone);
}


function renderFollowup(){
  const prog = state.activeProgram;
  const planBox = qs("#planContent");
  const lab = latestLab();

  // ===== Plan =====
  if(prog === "kidney"){
    const lines = [];
    lines.push(`<div class="list-item"><div class="t">本周建议（示意）</div><div class="s">1）至少记录 3 次血压（更看趋势）；2）如有蛋白尿/水肿，补充体重与尿检；3）复诊前复制“一页摘要”。</div></div>`);
    if(state.kidney.track === "tx"){
      lines.push(`<div class="list-item"><div class="t">移植提醒（示意）</div><div class="s">如需测药物谷浓度，请遵循中心流程（通常抽血前不先服药，抽完再服）。具体以移植中心宣教为准。</div></div>`);
    }
    planBox.innerHTML = lines.join("");
  } else if(prog === "htn"){
    const freqTxt = (state.htn?.bpFreq === "daily2") ? "每日2次" : "每日1次";
    const tgt = (state.htn?.targetSys || state.htn?.targetDia) ? `${state.htn?.targetSys||"—"}/${state.htn?.targetDia||"—"}` : "未设置";
    planBox.innerHTML = `
      <div class="list-item"><div class="t">本周建议（示意）</div><div class="s">1）按计划记录家庭血压（${escapeHtml(freqTxt)}），固定时段更有价值；2）把“场景/症状/漏服”记下来；3）复诊前复制摘要，医生更容易判断波动与药物方案。</div></div>
      <div class="list-item"><div class="t">目标（可选）</div><div class="s">当前：${escapeHtml(tgt)}。目标与阈值请以医生建议为准。</div></div>
    `;
  } else if(prog === "dm"){
    const freqTxt = (state.dm?.glucoseFreq === "daily2") ? "每日2次" : "每日1次";
    const unitTxt = (state.dm?.glucoseUnit === "mgdl") ? "mg/dL" : "mmol/L";
    const a1cTxt = lab?.hba1c ? `${lab.hba1c}%` : "暂无";
    planBox.innerHTML = `
      <div class="list-item"><div class="t">本周建议（示意）</div><div class="s">1）按计划记录血糖（${escapeHtml(freqTxt)} · ${escapeHtml(unitTxt)}）并打标签（空腹/餐后/睡前/随机）；2）每 3 个月关注一次 HbA1c（如有）；3）出现低血糖/严重高血糖红旗，优先就医/联系医生。</div></div>
      <div class="list-item"><div class="t">HbA1c</div><div class="s">最近：${escapeHtml(a1cTxt)}；目标（可选）：${escapeHtml(state.dm?.a1cTarget?state.dm.a1cTarget+"%":"未设置")}。</div></div>
    `;
  } else if(prog === "stone"){
    const today = yyyyMMdd(new Date());
    const cur = toNum(state.stone.intakeLog?.[today]) || 0;
    const tgt = toNum(state.stone.targetMl);
    const limit = state.stone.fluidRestricted === "true";
    planBox.innerHTML = `
      <div class="list-item"><div class="t">今日喝水</div><div class="s">${cur} ml${tgt?` / 目标 ${tgt} ml`:``}${limit?"（限水模式）":""}</div></div>
      <div class="list-item"><div class="t">本周建议（示意）</div><div class="s">保持分次饮水；如出现发热伴腰痛/寒战、无尿/少尿明显等红旗，优先就医。</div></div>
    `;
  } else if(prog === "dialysis"){
    const mod = state.dialysis?.modality || "hd";
    const modTxt = labelDialysisModality(mod);
    const isDay = isDialysisDayToday();
    const daysTxt = (mod === "hd") ? (state.dialysis?.hdDays?.length ? state.dialysis.hdDays.map(labelWeekday).join("、") : "未设置") : "每日";
    const limit = state.dialysis?.fluidRestricted === "true";
    const limitMl = state.dialysis?.fluidLimitMl ? `${state.dialysis.fluidLimitMl} ml/天` : "—";
    planBox.innerHTML = `
      <div class="list-item"><div class="t">方式</div><div class="s">${escapeHtml(modTxt)} · ${mod==="hd"?`透析日：${escapeHtml(daysTxt)}${isDay?"（今日）":""}`:"频率：每日"}</div></div>
      <div class="list-item"><div class="t">控水/限水</div><div class="s">${limit?`已标记：${escapeHtml(limitMl)}（以透析中心医嘱为准）`:"不确定/未标记"}</div></div>
      <div class="list-item"><div class="t">本周建议（示意）</div><div class="s">透析日：记录透前/透后体重与血压（可选超滤量）；非透析日：关注间期体重增长、咸食与饮水。出现通路/腹透红旗、胸痛/气促/抽搐等，请优先联系透析团队/就医。</div></div>
    `;
  } else if(prog === "peds"){
    const age = computeAgeYears(state.peds.dob);
    planBox.innerHTML = `
      <div class="list-item"><div class="t">儿肾随访重点（示意）</div><div class="s">生长（身高/体重）、血压记录、症状事件、化验（肌酐单位与身高配合）。复诊时以儿肾医生判读为准。</div></div>
      <div class="list-item"><div class="t">本周任务建议</div><div class="s">至少记录 2–3 次血压；每周记录体重；每月记录身高一次（或按医嘱）。</div></div>
      <div class="list-item"><div class="t">孩子 ${age===null?"—":age+"岁"} 的过渡建议（示意）</div><div class="s">逐步让孩子参与：自己描述症状、准备复诊三问、在家测一次血压。</div></div>
    `;
  } else {
    planBox.innerHTML = `<div class="note">请选择项目。</div>`;
  }

  // ===== Trends (compact but actionable) =====
  const trend = qs("#trendContent");
  const parts = [];

  const bpSorted = [...(state.vitals.bp||[])].sort((a,b)=> (a.dateTime||"").localeCompare(b.dateTime||""));
  const wSorted  = [...(state.vitals.weight||[])].sort((a,b)=> (a.dateTime||"").localeCompare(b.dateTime||""));
  const hSorted  = [...(state.vitals.height||[])].sort((a,b)=> (a.dateTime||"").localeCompare(b.dateTime||""));
  const gSorted  = [...(state.vitals.glucose||[])].sort((a,b)=> (a.dateTime||"").localeCompare(b.dateTime||""));

  const last14BP = bpSorted.slice(-14);
  if(last14BP.length){
    const sys = last14BP.map(x=>toNum(x.sys)).filter(v=>v!==null);
    const dia = last14BP.map(x=>toNum(x.dia)).filter(v=>v!==null);
    const last = last14BP[last14BP.length-1];
    const avgSys = sys.length ? Math.round(sys.reduce((a,b)=>a+b,0)/sys.length) : null;
    const avgDia = dia.length ? Math.round(dia.reduce((a,b)=>a+b,0)/dia.length) : null;
    parts.push(`<div class="list-item"><div class="t">血压趋势 ${sparklineSvg(sys)}</div><div class="s">最近：${last?.sys?`${last.sys}/${last.dia}`:"—"} · 近${last14BP.length}条均值：${(avgSys!==null&&avgDia!==null)?`${avgSys}/${avgDia}`:"—"}</div></div>`);
  }

  const last14W = wSorted.slice(-14);
  if(last14W.length){
    const vals = last14W.map(x=>toNum(x.kg)).filter(v=>v!==null);
    const last = last14W[last14W.length-1];
    const wv = (prog === "peds") ? computeVelocityInfo(state.vitals.weight, "kg", { preferDays: 180, minDays: 30 }) : null;
    parts.push(`<div class="list-item"><div class="t">体重趋势 ${sparklineSvg(vals)}</div><div class="s">最近：${last?.kg?`${last.kg} kg`:"—"} · ${last?.dateTime?niceDate(last.dateTime.slice(0,10)):""}${(prog==="peds") ? ` · 增长速度：${wv?`${wv.perYear} kg/年`:"—"}` : ""}</div></div>`);
  }

  if(prog === "peds"){
    const lastH = hSorted.slice(-12);
    if(lastH.length){
      const vals = lastH.map(x=>toNum(x.cm)).filter(v=>v!==null);
      const last = lastH[lastH.length-1];
      const hv = computeVelocityInfo(state.vitals.height, "cm", { preferDays: 180, minDays: 30 });
      parts.push(`<div class="list-item"><div class="t">身高趋势 ${sparklineSvg(vals)}</div><div class="s">最近：${last?.cm?`${last.cm} cm`:"—"} · ${last?.dateTime?niceDate(last.dateTime.slice(0,10)):""} · 生长速度：${hv?`${hv.perYear} cm/年`:"—"}</div></div>`);
    }
  }

  const last14G = gSorted.slice(-14);
  if(last14G.length){
    const unit = (state.dm?.glucoseUnit === "mgdl") ? "mg/dL" : "mmol/L";
    const toUnit = (mmol)=> (unit==="mg/dL" ? Math.round((mmol*18)*10)/10 : Math.round(mmol*10)/10);
    const mmolVals = last14G.map(x=>{
      const v = toNum(x.value);
      if(v===null) return null;
      const u = x.unit || "mmolL";
      return (u==="mgdl") ? (v/18) : v;
    }).filter(v=>v!==null);
    const last = last14G[last14G.length-1];
    const lastMmol = (last && toNum(last.value)!==null)
      ? ((last.unit||"mmolL")==="mgdl" ? toNum(last.value)/18 : toNum(last.value))
      : null;
    parts.push(`<div class="list-item"><div class="t">血糖趋势 ${sparklineSvg(mmolVals)}</div><div class="s">最近：${lastMmol!==null?`${toUnit(lastMmol)} ${escapeHtml(unit)}`:"—"}${last?.tag?` · ${escapeHtml(last.tag)}`:""}</div></div>`);
  }

  if(prog === "stone"){
    const today = yyyyMMdd(new Date());
    const cur = toNum(state.stone.intakeLog?.[today]) || 0;
    const tgt = toNum(state.stone.targetMl);
    parts.push(`<div class="list-item"><div class="t">今日饮水</div><div class="s">${cur} ml${tgt?` / 目标 ${tgt} ml`:``}${state.stone.fluidRestricted==="true"?"（限水模式）":""}</div></div>`);
  }

  if(!parts.length){
    trend.innerHTML = `<div class="note">暂无趋势数据。可从“记录”页先补充一次血压/体重/血糖或化验。</div>`;
  }else{
    trend.innerHTML = parts.join("");
  }

  // ===== quick record buttons visibility =====
  const bWater = qs("#btnPlanRecordWater");
  if(bWater) bWater.classList.toggle("hidden", prog !== "stone");
  const bUrine = qs("#btnPlanRecordUrine");
  if(bUrine) bUrine.classList.toggle("hidden", !(prog==="kidney" || prog==="peds"));
  const bDial = qs("#btnPlanRecordDialysis");
  if(bDial) bDial.classList.toggle("hidden", prog !== "dialysis");
  const bGlu = qs("#btnPlanRecordGlucose");
  if(bGlu) bGlu.classList.toggle("hidden", !(prog==="dm" || (prog==="kidney" && state.comorbid.dm) || prog==="dialysis"));
}

function renderMe(){
  const prev = qs("#exportPreview");
  if(prev) prev.textContent = buildExportText();

  const b = qs("#btnExport2");
  if(b) b.onclick = ()=>copyExport("clinic");

  const tAI = qs("#toggleShowAI");
  if(tAI) tAI.checked = showAITab();

  const tHome = qs("#toggleHomeMoreDefault");
  if(tHome) tHome.checked = !!(state.ui && state.ui.homeMoreDefault);

  const fbPrev = qs("#feedbackPreview");
  if(fbPrev) fbPrev.textContent = buildFeedbackText(false);
}


function renderAI(){
  const box = qs("#chatBox");
  box.innerHTML = "";
  state.chat.forEach(m=>{
    const bub = document.createElement("div");
    bub.className = "bubble" + (m.role==="me" ? " me":"");
    bub.innerHTML = `${escapeHtml(m.text)}<div class="meta">${m.role==="me"?"我":"AI"} · ${nowISO()}</div>`;
    box.appendChild(bub);
  });
  box.scrollTop = box.scrollHeight;
}

function renderAll(){
  renderHeader();
  renderHome();
  renderRecords();
  renderDocsPage();
  renderFollowup();
  renderMe();
  renderAI();
  renderExplainPage();
  renderGuidePage();
}

function navigate(pageKey){
  // Keep tab highlight stable when navigating to overlay pages (e.g., explain/guide).
  const isTab = (pageKey === "ai") ? showAITab() : TAB_KEYS.includes(pageKey);
  if(isTab) currentTabKey = pageKey;

  qsa(".page").forEach(p=>{
    p.classList.toggle("active", p.getAttribute("data-page") === pageKey);
  });
  qsa(".tab").forEach(t=>{
    t.classList.toggle("active", t.getAttribute("data-nav") === currentTabKey);
  });

  // on-demand render to keep state fresh
  renderAll();
}

function showModal(id){
  const m = qs("#"+id);
  if(!m) return;
  m.classList.add("show");
  m.setAttribute("aria-hidden","false");
}
function closeModal(id){
  const m = qs("#"+id);
  if(!m) return;
  m.classList.remove("show");
  m.setAttribute("aria-hidden","true");
}
