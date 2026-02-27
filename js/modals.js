/* modals.js - All modal dialogs and quick entry forms */

/* Generate a concise inline tip box for quick-entry modals.
   Shows a one-line "why" from EXPLAINERS + a link to the full explain page. */
function whyTip(explainerId){
  const e = EXPLAINERS[explainerId];
  if(!e) return "";
  const why = e.why || "";
  return `<div class="why-tip"><span class="why-text">${escapeHtml(why)}</span> <button type="button" class="info-btn tiny" data-exp="${escapeHtml(explainerId)}" aria-label="详细说明">i</button></div>`;
}

function explainerById(id){
  const e = EXPLAINERS[id];
  if(e) return e;
  return {
    title: "为什么要做这项记录？",
    subtitle: "内测版提示",
    why: "这项记录用于随访整理与复诊沟通。",
    focus: ["趋势比单次更重要", "如有不适请优先联系医生/就医"],
    howto: ["按医嘱或中心宣教执行"],
    usedfor: ["进入一页摘要"],
    redflags: ["出现红旗症状请立即就医或联系团队"],
  };
}

function openExplainerModal(explainerId){
  const e = explainerById(explainerId);
  const mkList = (arr)=> arr && arr.length ? `<ul>${arr.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul>` : "";
  const body = `
    <div class="list-item explain-list"><div class="t">为什么要做</div><div class="s">${escapeHtml(e.why)}</div></div>
    <div class="list-item explain-list"><div class="t">我们重点看什么</div><div class="s">${mkList(e.focus)}</div></div>
    <div class="list-item explain-list"><div class="t">怎么做更有用</div><div class="s">${mkList(e.howto)}</div></div>
    <div class="list-item explain-list"><div class="t">这条数据会用到哪里</div><div class="s">${mkList(e.usedfor)}</div></div>
    <div class="list-item explain-list"><div class="t">什么时候要尽快联系团队/就医（红旗）</div><div class="s">${mkList(e.redflags)}</div></div>
    ${e.review ? `<div class="note">内容审核：${escapeHtml(e.review)}</div>` : `<div class="note">提示：该说明用于随访教育与复诊整理，不替代医生诊疗决策。</div>`}
  `;
  const footer = (()=>{
    if(e.action?.fn){
      return `
        <button class="primary" id="btnExplainerAction">${escapeHtml(e.action.label || "去记录")}</button>
        <button class="ghost" data-close="modalSimple">关闭</button>
      `;
    }
    return `<button class="ghost" data-close="modalSimple">关闭</button>`;
  })();
  openSimpleModal(e.title, e.subtitle || "", body, footer);

  // bind action
  if(e.action?.fn){
    setTimeout(()=>{
      const b = qs("#btnExplainerAction");
      if(!b) return;
      b.onclick = ()=>{
        closeModal("modalSimple");
        // route by fn
        const fn = e.action.fn;
        if(typeof window[fn] === "function"){
          window[fn]();
        } else if(typeof globalThis[fn] === "function"){
          globalThis[fn]();
        } else {
          // map known actions
          try{
            if(fn === "openAddLab") openAddLab();
            else if(fn === "openAddUrine") openAddUrine();
            else if(fn === "openQuickBP") openQuickBP();
            else if(fn === "openQuickWeight") openQuickWeight();
            else if(fn === "openQuickHeight") openQuickHeight();
            else if(fn === "openQuickGlucose") openQuickGlucose();
            else if(fn === "openQuickTemp") openQuickTemp();
            else if(fn === "quickSymptoms") quickSymptoms();
            else if(fn === "openDocUploadModal") openDocUploadModal();
            else if(fn === "openAddMarkerModal") openAddMarkerModal();
            else if(fn === "openDialysisSessionModal") openDialysisSessionModal();
            else if(fn === "openStoneEventModal") openStoneEventModal();
            else if(fn === "openProgramMainModal") openProgramMainModal();
            else if(fn === "openTriageModal") openTriageModal();
          }catch(_e){/* ignore */}
        }
      };
    },0);
  }
}



// ====== Overlay pages: per-item explainer page + follow-up meaning guide ======
// Rationale:
// - Patients reported that putting explanations inside a single modal feels "chatty" and confusing.
// - We therefore show each item explanation on its own dedicated page (still in-app), with a clear title.

function runActionFn(fn){
  if(!fn) return;
  try{
    if(typeof globalThis[fn] === "function") return globalThis[fn]();
  }catch(_e){/* ignore */}
  try{
    if(fn === "openAddLab") openAddLab();
    else if(fn === "openAddUrine") openAddUrine();
    else if(fn === "openQuickBP") openQuickBP();
    else if(fn === "openQuickWeight") openQuickWeight();
    else if(fn === "openQuickHeight") openQuickHeight();
    else if(fn === "openQuickGlucose") openQuickGlucose();
    else if(fn === "openQuickTemp") openQuickTemp();
    else if(fn === "quickSymptoms") quickSymptoms();
    else if(fn === "openDocUploadModal") openDocUploadModal();
    else if(fn === "openAddMarkerModal") openAddMarkerModal();
    else if(fn === "openDialysisSessionModal") openDialysisSessionModal();
    else if(fn === "openStoneEventModal") openStoneEventModal();
    else if(fn === "openProgramMainModal") openProgramMainModal();
    else if(fn === "openTriageModal") openTriageModal();
  }catch(_e){/* ignore */}
}

function openExplainPage(explainerId){
  state.ui = state.ui || { overlayReturn: currentTabKey, explainerId: "" };
  state.ui.overlayReturn = currentTabKey;
  state.ui.explainerId = String(explainerId || "");
  saveState();
  navigate("explain");
}

function openGuidePage(){
  state.ui = state.ui || { overlayReturn: currentTabKey, explainerId: "" };
  state.ui.overlayReturn = currentTabKey;
  saveState();
  navigate("guide");
}

function openUsagePage(){
  state.ui = state.ui || { overlayReturn: currentTabKey, explainerId: "" };
  state.ui.overlayReturn = currentTabKey;
  saveState();
  navigate("usage");
}

function overlayBack(){
  const target = (state.ui && state.ui.overlayReturn) ? state.ui.overlayReturn : (currentTabKey || "home");
  const after = (state.ui && state.ui.afterOverlay) ? state.ui.afterOverlay : null;
  if(after){
    try{ delete state.ui.afterOverlay; }catch(_e){}
    saveState();
  }
  navigate(target);
  if(after){
    // Re-open the previous workflow (e.g., marker entry) after returning from an overlay page.
    setTimeout(()=>{
      try{
        if(after.kind === "markerDraft" && after.draft){
          openAddMarkerModal(after.draft);
        }
      }catch(_e){/* ignore */}
    }, 50);
  }
}
function openTriageModal(){
  const items = [
    {key:"chest", label:"胸痛/心悸明显"},
    {key:"breath", label:"呼吸困难/气促明显"},
    {key:"confuse", label:"意识改变/嗜睡/抽搐"},
    {key:"anuria", label:"少尿/无尿明显"},
    {key:"feverPain", label:"发热伴剧烈腰痛/寒战（结石红旗）"},
    {key:"vomit", label:"持续呕吐/严重腹泻导致无法进食/用药"},
  ];

  // DM add-ons (if enabled or marked as comorbid)
  if(state.enabledPrograms?.dm || state.comorbid?.dm){
    items.push({key:"dm_hypo", label:"糖尿病：疑似严重低血糖（出汗/手抖/意识不清/无法进食）"});
    items.push({key:"dm_hyper", label:"糖尿病：血糖极高伴恶心呕吐/深快呼吸/意识异常（红旗）"});
  }

  // HTN add-on
  if(state.enabledPrograms?.htn || state.comorbid?.htn){
    items.push({key:"htn_crisis", label:"血压很高伴剧烈头痛/视物模糊/神经系统症状"});
  }
  // Dialysis add-ons
  if(state.enabledPrograms?.dialysis){
    const mod = state.dialysis?.modality || "hd";
    if(mod === "pd") items.push({key:"pd_peritonitis", label:"腹透：透析液混浊/腹痛/发热（腹膜炎红旗）"});
    if(mod === "hd") items.push({key:"access_bleed", label:"血透：通路出血不止/通路异常（红旗）"});
  }
  const body = `
    <div class="note">勾选你目前出现的情况（示意分诊）。若任何一项为“是”，建议优先联系医生/急诊。</div>
    ${items.map(i=>`
      <label class="task" style="cursor:pointer;">
        <div class="left">
          <div class="checkbox" data-triage="${i.key}"></div>
          <div>
            <div class="title">${escapeHtml(i.label)}</div>
            <div class="meta">红旗症状：不建议仅靠AI/自我处理</div>
          </div>
        </div>
        <div class="badge danger">红旗</div>
      </label>
    `).join("")}
  `;
  openSimpleModal(
    "红旗分诊",
    "出现红旗：请立即就医/联系随访团队。App 只做提醒与整理。",
    body,
    `<button class="primary" id="btnTriageSubmit">生成行动卡</button>
     <button class="ghost" data-close="modalSimple">关闭</button>`
  );

  const selected = new Set();
  qsa("#modalSimple .checkbox[data-triage]").forEach(box=>{
    box.addEventListener("click", (e)=>{
      e.preventDefault();
      const k = box.getAttribute("data-triage");
      if(selected.has(k)) selected.delete(k); else selected.add(k);
      box.style.background = selected.has(k) ? "var(--primary)" : "transparent";
      box.style.borderColor = selected.has(k) ? "var(--primary)" : "#c6d4f5";
      if(selected.has(k)) box.innerHTML = "✓"; else box.innerHTML = "";
      box.style.color = "#fff";
    });
  });

  qs("#btnTriageSubmit").onclick = ()=>{
    const has = selected.size > 0;
    const action = has
      ? `<div class="list-item"><div class="t">建议行动（红旗）</div><div class="s">你选择了红旗症状：${[...selected].map(k=>items.find(i=>i.key===k)?.label).filter(Boolean).join("、")}。建议<strong>立即</strong>联系随访团队或就近急诊。可以复制“一页摘要”给医生。</div></div>`
      : `<div class="list-item"><div class="t">建议行动（非红旗）</div><div class="s">目前未选择红旗症状。建议按计划记录关键指标，并准备复诊问题清单。如症状加重请及时就医。</div></div>`;
    openSimpleModal("行动卡", "可复制摘要给医生/家属", action, `<button class="primary" id="btnCopyExport3">复制一页摘要</button><button class="ghost" data-close="modalSimple">关闭</button>`);
    const b = qs("#btnCopyExport3");
    if(b) b.onclick = ()=>copyExport();
  };
}

function openProgramMainModal(){
  if(state.activeProgram === "kidney"){
    navigate("records");
    openAddLab();
  } else if(state.activeProgram === "htn"){
    // HTN workspace: main action is BP recording
    openQuickBP();
  } else if(state.activeProgram === "dm"){
    // DM workspace: main action is glucose recording
    openQuickGlucose();
  } else if(state.activeProgram === "stone"){
    openSimpleModal(
      "结石面板（内测）",
      "结石模块被项目化隔离，避免与CKD/移植混在一起造成混乱。",
      `<div class="list-item"><div class="t">喝水</div><div class="s">点击“+250ml”快速记录。若限水，目标仅作记录。</div></div>
       <div class="list-item"><div class="t">发作事件</div><div class="s">腰痛/血尿/发热等建议记录时间线，复诊沟通更清晰。</div></div>
       <div class="row">
         <button class="primary" id="btnWater250InModal">+250ml</button>
         <button class="ghost" id="btnStoneSymInModal">记录症状</button>
       </div>`,
      `<button class="ghost" data-close="modalSimple">关闭</button>`
    );
    setTimeout(()=>{
      const b = qs("#btnWater250InModal");
      if(b) b.onclick = ()=>addWater(250);
      const s = qs("#btnStoneSymInModal");
      if(s) s.onclick = ()=>quickSymptoms({preset:["腰痛/绞痛","血尿"]});
    },0);
  } else if(state.activeProgram === "peds"){
    openSimpleModal(
      "儿肾面板（内测）",
      "儿肾项目单列，避免使用成人阈值。重点：生长 + 记录 + 复诊整理。",
      `<div class="list-item"><div class="t">生长记录</div><div class="s">建议每月记录身高与体重一次（或按医嘱）。</div></div>
       <div class="list-item"><div class="t">儿科血压</div><div class="s">儿童血压多以百分位解读；本版先做结构化记录与复诊整理。</div></div>
       <div class="row">
         <button class="primary" id="btnPedsHeightInModal">记录身高</button>
         <button class="ghost" id="btnPedsBPInModal">记录血压</button>
       </div>`,
      `<button class="ghost" data-close="modalSimple">关闭</button>`
    );
    setTimeout(()=>{
      const b = qs("#btnPedsHeightInModal");
      if(b) b.onclick = ()=>openQuickHeight();
      const s = qs("#btnPedsBPInModal");
      if(s) s.onclick = ()=>openQuickBP();
    },0);
  } else if(state.activeProgram === "dialysis"){
    const mod = state.dialysis?.modality || "hd";
    const modTxt = mod === "pd" ? "腹透" : "血透";
    const limit = state.dialysis?.fluidRestricted === "true";
    openSimpleModal(
      "透析面板（内测）",
      "透析项目独立于 CKD/移植/结石：避免规则冲突。",
      `<div class="list-item"><div class="t">方式</div><div class="s">当前：${escapeHtml(modTxt)}。建议记录体重、血压、症状；血透可记录透前/透后与超滤量。</div></div>
       <div class="list-item"><div class="t">限水提示</div><div class="s">${limit?"已标记为限水（以透析中心医嘱为准）":"未标记/不确定"}。如同时使用结石项目，系统会显示“控水/限水”标签以避免误导。</div></div>
       <div class="row">
         <button class="primary" id="btnDialysisRecordInModal">记录一次透析</button>
         <button class="ghost" id="btnDialysisBPInModal">记录血压</button>
         <button class="ghost" id="btnDialysisTriageInModal">红旗分诊</button>
       </div>`,
      `<button class="ghost" data-close="modalSimple">关闭</button>`
    );
    setTimeout(()=>{
      const b = qs("#btnDialysisRecordInModal");
      if(b) b.onclick = ()=>openDialysisSessionModal();
      const bp = qs("#btnDialysisBPInModal");
      if(bp) bp.onclick = ()=>openQuickBP();
      const t = qs("#btnDialysisTriageInModal");
      if(t) t.onclick = ()=>openTriageModal();
    },0);
  }
}

function openSimpleModal(title, subtitle, bodyHtml, footerHtml){
  qs("#simpleTitle").textContent = title;
  qs("#simpleSubtitle").textContent = subtitle || "";
  qs("#simpleBody").innerHTML = bodyHtml || "";
  qs("#simpleFooter").innerHTML = footerHtml || `<button class="ghost" data-close="modalSimple">关闭</button>`;
  showModal("modalSimple");
  // bind close buttons
  qsa("#modalSimple [data-close]").forEach(b=>{
    b.onclick = ()=>closeModal(b.getAttribute("data-close"));
  });
}

// ====== Doctor finder (placeholder + API interface reserved) ======
// NOTE: 内测版仅提供"UI + 接口占位 + 示例数据"。正式版需要：医生/机构库、地理编码、
// 合规与质量审核（避免误导/广告/灰产），并为患者提供透明的信息来源与更新时间。
// PROVIDER_MOCK is defined in constants.js

function haversineKm(lat1,lng1,lat2,lng2){
  const toRad = d => (d * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

async function providerSearch(params){
  // Interface reserved for future backend:
  // return fetch(`/api/providers/search?lat=${lat}&lng=${lng}&specialty=${specialty}&radiusKm=${radiusKm}&q=${encodeURIComponent(keyword||"")}`)
  //   .then(r=>r.json());
  const { lat, lng, specialty, radiusKm, keyword, city } = params || {};
  let arr = [...PROVIDER_MOCK];
  if(specialty && specialty !== "all"){
    arr = arr.filter(p => (p.specialties||[]).includes(specialty));
  }
  const q = String(keyword||"").trim().toLowerCase();
  const c = String(city||"").trim().toLowerCase();
  if(q){
    arr = arr.filter(p => (p.name||"").toLowerCase().includes(q) || (p.address||"").toLowerCase().includes(q));
  }
  if(c){
    arr = arr.filter(p => (p.city||"").toLowerCase().includes(c));
  }

  // If location provided, compute distances and filter by radius
  if(lat !== null && lat !== undefined && lng !== null && lng !== undefined){
    arr = arr.map(p => {
      if(p.lat===null || p.lat===undefined || p.lng===null || p.lng===undefined) return { ...p, distanceKm: null };
      const d = haversineKm(lat, lng, p.lat, p.lng);
      return { ...p, distanceKm: d };
    });
    const r = toNum(radiusKm) || 10;
    arr = arr.filter(p => p.distanceKm===null || p.distanceKm <= r);
    arr.sort((a,b)=>{
      if(a.distanceKm===null && b.distanceKm===null) return 0;
      if(a.distanceKm===null) return 1;
      if(b.distanceKm===null) return -1;
      return a.distanceKm - b.distanceKm;
    });
  }

  return arr.slice(0, 10);
}

function openDoctorFinderModal(){
  const options = [
    {key:"all", label:"全部"},
    {key:"nephrology", label:"肾内科"},
    {key:"dialysis", label:"透析中心/血透室"},
    {key:"urology", label:"泌尿外科/结石"},
    {key:"peds_nephrology", label:"儿肾/儿科肾脏"},
  ];
  let def = "nephrology";
  if(state.activeProgram==="stone") def = "urology";
  if(state.activeProgram==="dialysis") def = "dialysis";
  if(state.activeProgram==="peds") def = "peds_nephrology";

  const body = `
    <div class="note">这是“接口占位 + 示例数据”页面：用于提前把前端流程跑通。正式版将接入医生/机构库与地图服务，并明确数据来源与更新时间。</div>
    <div class="two">
      <label class="field"><span>专科/机构类型</span>
        <select id="dfSpecialty">
          ${options.map(o=>`<option value="${o.key}">${escapeHtml(o.label)}</option>`).join("")}
        </select>
      </label>
      <label class="field"><span>范围 (km)</span>
        <select id="dfRadius">
          <option value="3">3</option>
          <option value="5">5</option>
          <option value="10" selected>10</option>
          <option value="20">20</option>
          <option value="50">50</option>
        </select>
      </label>
    </div>
    <div class="two">
      <label class="field"><span>关键词（可选）</span><input id="dfKeyword" type="text" placeholder="医院名/医生名/透析中心..." /></label>
      <label class="field"><span>城市（无定位时可选）</span><input id="dfCity" type="text" placeholder="例如：北京" /></label>
    </div>
    <div class="row">
      <button class="primary" id="dfLocateSearch">使用定位搜索</button>
      <button class="ghost" id="dfKeywordSearch">不定位搜索</button>
    </div>
    <div id="dfStatus" class="note subtle"></div>
    <div id="dfResults"></div>
    <details style="margin-top:12px;">
      <summary>接口预留（给后端/合规/地图服务的对接说明）</summary>
      <div class="note subtle" style="margin-top:10px;">
        预期接口：<span class="mono">GET /api/providers/search</span><br/>
        参数：lat,lng,radiusKm,specialty,q,city,page,pageSize<br/>
        返回：[{id,name,specialties,address,city,phone,lat,lng,verifiedLevel,source,updatedAt}]
      </div>
    </details>
  `;

  openSimpleModal("附近医生/机构（内测占位）", "未来：按定位搜索，并对医生/机构信息做质量控制", body,
    `<button class="ghost" data-close="modalSimple">关闭</button>`
  );

  // bind
  setTimeout(()=>{
    const sp = qs("#dfSpecialty");
    if(sp) sp.value = def;
    const status = qs("#dfStatus");
    const results = qs("#dfResults");
    const render = (arr)=>{
      if(!results) return;
      if(!arr || !arr.length){
        results.innerHTML = `<div class="note">暂无匹配结果。你可以尝试调整范围/关键词/城市。</div>`;
        return;
      }
      results.innerHTML = arr.map(p=>{
        const dist = (p.distanceKm!==null && p.distanceKm!==undefined) ? `${Math.round(p.distanceKm*10)/10} km` : "—";
        const spec = (p.specialties||[]).map(s=>{
          const m = {nephrology:"肾内科", dialysis:"透析", urology:"泌尿/结石", peds_nephrology:"儿肾"};
          return m[s] || s;
        }).join("、") || "—";
        return `<div class="list-item">
          <div class="t">${escapeHtml(p.name)} ${p.city?`<span class="badge info">${escapeHtml(p.city)}</span>`:""}</div>
          <div class="s">专科：${escapeHtml(spec)} · 距离：${escapeHtml(dist)}<br/>地址：${escapeHtml(p.address||"—")}</div>
        </div>`;
      }).join("");
    };

    const doSearch = async ({lat,lng,locHint})=>{
      const params = {
        lat, lng,
        specialty: qs("#dfSpecialty")?.value || "all",
        radiusKm: qs("#dfRadius")?.value || "10",
        keyword: qs("#dfKeyword")?.value || "",
        city: qs("#dfCity")?.value || "",
      };
      if(status) status.textContent = locHint || "正在搜索（示意数据）...";
      const arr = await providerSearch(params);
      if(status) status.textContent = locHint ? `${locHint} · 返回 ${arr.length} 条` : `返回 ${arr.length} 条`;
      render(arr);
    };

    const btnLocate = qs("#dfLocateSearch");
    if(btnLocate) btnLocate.onclick = ()=>{
      if(!navigator.geolocation){
        if(status) status.textContent = "当前浏览器不支持定位。你可以用“不定位搜索”并填写城市/关键词。";
        return;
      }
      if(status) status.textContent = "正在获取定位（需要你授权）...";
      navigator.geolocation.getCurrentPosition(
        (pos)=>{
          // privacy: coarsen location
          const lat = Math.round(pos.coords.latitude*100)/100;
          const lng = Math.round(pos.coords.longitude*100)/100;
          doSearch({lat,lng,locHint:`已获取定位（已模糊）：${lat}, ${lng}`});
        },
        (err)=>{
          if(status) status.textContent = `定位失败/被拒绝：${err.message}。你可以用“不定位搜索”并填写城市/关键词。`;
        },
        { enableHighAccuracy:false, timeout:6000, maximumAge: 5*60*1000 }
      );
    };

    const btnKeyword = qs("#dfKeywordSearch");
    if(btnKeyword) btnKeyword.onclick = ()=>doSearch({lat:null,lng:null,locHint:"不使用定位"});

    // initial render with defaults (no location)
    doSearch({lat:null,lng:null,locHint:"不使用定位"});
  }, 0);
}

function renderProgramList(){
  const box = qs("#programList");
  const items = Object.keys(PROGRAMS).filter(k=>isProgramEnabled(k));
  box.innerHTML = items.map(k=>{
    const p = PROGRAMS[k];
    const active = state.activeProgram === k;
    return `
      <div class="list-item">
        <div class="t">${escapeHtml(p.name)} ${active?`<span class="badge ok">当前</span>`:""}</div>
        <div class="s">${escapeHtml(p.subtitle)}</div>
        <div class="row" style="margin-top:10px;">
          <button class="${active?"ghost":"primary"} small" data-switch="${k}">${active?"已在此项目":"切换到此项目"}</button>
        </div>
      </div>
    `;
  }).join("");

  qsa("button[data-switch]", box).forEach(btn=>{
    btn.onclick = ()=>{
      const k = btn.getAttribute("data-switch");
      state.activeProgram = k;
      // If user enters an HTN/DM workspace, keep comorb in sync so diet/safety/knowledge联动更一致。
      if(k==="htn") state.comorbid.htn = true;
      if(k==="dm") state.comorbid.dm = true;
      saveState();
      closeModal("modalProgram");
      navigate("home");
      renderAll();
    };
  });
}

function renderProfileModal(){
  // chips: enabled programs
  const enabledBox = qs("#enabledChips");
  const chipHtml = Object.keys(PROGRAMS).map(k=>{
    const active = isProgramEnabled(k);
    return `<button type="button" class="chip ${active?"active":""}" data-enable="${k}">${escapeHtml(programLabel(k))}</button>`;
  }).join("");
  enabledBox.innerHTML = chipHtml;
  qsa("button[data-enable]", enabledBox).forEach(btn=>{
    btn.onclick = ()=>{
      const k = btn.getAttribute("data-enable");
      const next = !isProgramEnabled(k);

      // Guard: at least one program must remain enabled
      if(!next && wouldDisableLastProgram(k)){
        toast("至少保留 1 个随访项目");
        return;
      }

      state.enabledPrograms[k] = next;

      // Keep comorb flags coherent when user explicitly启用慢病项目
      if(next && k==="htn") state.comorbid.htn = true;
      if(next && k==="dm") state.comorbid.dm = true;

      // keep state.stone/peds toggles coherent
      if(k==="stone" && !next){
        state.stone.fluidRestricted = "unknown";
        state.stone.targetMl = "";
      }
      if(k==="peds" && !next){
        state.peds = defaultState().peds;
        if(state.activeProgram==="peds") state.activeProgram = pickFallbackProgram();
      }
      if(k==="dialysis" && !next){
        state.dialysis = defaultState().dialysis;
        if(state.activeProgram==="dialysis") state.activeProgram = pickFallbackProgram();
      }
      if(k==="htn" && !next){
        state.htn = defaultState().htn;
        if(state.activeProgram==="htn") state.activeProgram = pickFallbackProgram();
      }
      if(k==="dm" && !next){
        state.dm = defaultState().dm;
        if(state.activeProgram==="dm") state.activeProgram = pickFallbackProgram();
      }

      // If disabling kidney, ensure active program is still enabled.
      if(k==="kidney" && !next){
        ensureActiveProgramEnabled();
      }

      ensureActiveProgramEnabled();
      saveState();
      renderProfileModal();
      renderProgramList();
      renderHeader();
    };
  });

  // comorb chips
  const cBox = qs("#comorbChips");
  cBox.innerHTML = COMORB.map(c=>{
    const active = !!state.comorbid[c.key];
    return `<button type="button" class="chip ${active?"active":""}" data-comorb="${c.key}">${escapeHtml(c.label)}</button>`;
  }).join("");
  qsa("button[data-comorb]", cBox).forEach(btn=>{
    btn.onclick = ()=>{
      const k = btn.getAttribute("data-comorb");
      state.comorbid[k] = !state.comorbid[k];
      saveState();
      renderProfileModal();
      renderAll();
    };
  });

  // kidney track
  qs("#kidneyTrack").value = state.kidney.track || "unknown";
  qs("#kidneyTrack").onchange = ()=>{
    state.kidney.track = qs("#kidneyTrack").value;
    saveState();
    updateConditionalBoxes();
    renderAll();
  };

  qs("#glomerularSubtype").value = state.kidney.glomerularSubtype || "unknown";
  qs("#dxCertainty").value = state.kidney.dxCertainty || "unknown";
  qs("#txStage").value = state.kidney.txStage || "stable";

  qs("#glomerularSubtype").onchange = ()=>{ state.kidney.glomerularSubtype = qs("#glomerularSubtype").value; saveState(); renderAll(); };
  qs("#dxCertainty").onchange = ()=>{ state.kidney.dxCertainty = qs("#dxCertainty").value; saveState(); renderAll(); };
  qs("#txStage").onchange = ()=>{ state.kidney.txStage = qs("#txStage").value; saveState(); renderAll(); };

  // enable peds
  qs("#enablePeds").value = state.enabledPrograms.peds ? "true":"false";
  qs("#enableStone").value = state.enabledPrograms.stone ? "true":"false";
  const enableDialysisEl = qs("#enableDialysis");
  if(enableDialysisEl) enableDialysisEl.value = state.enabledPrograms.dialysis ? "true":"false";

  // enable HTN / DM (optional)
  const enableHTNEl = qs("#enableHTN");
  if(enableHTNEl) enableHTNEl.value = state.enabledPrograms.htn ? "true":"false";
  const enableDMEl = qs("#enableDM");
  if(enableDMEl) enableDMEl.value = state.enabledPrograms.dm ? "true":"false";
  qs("#enablePeds").onchange = ()=>{
    const v = qs("#enablePeds").value === "true";
    state.enabledPrograms.peds = v;
    if(!v){
      state.peds = defaultState().peds;
      if(state.activeProgram==="peds") state.activeProgram = pickFallbackProgram();
    }else{
      // if enabling, switch to peds for convenience
      state.activeProgram = "peds";
    }
    ensureActiveProgramEnabled();
    saveState();
    updateConditionalBoxes();
    renderProgramList();
    renderAll();
  };
  qs("#enableStone").onchange = ()=>{
    const v = qs("#enableStone").value === "true";
    state.enabledPrograms.stone = v;
    if(!v){
      state.stone.fluidRestricted = "unknown";
      state.stone.targetMl = "";
      if(state.activeProgram==="stone") state.activeProgram = pickFallbackProgram();
    }
    ensureActiveProgramEnabled();
    saveState();
    updateConditionalBoxes();
    renderProgramList();
    renderAll();
  };

  if(enableHTNEl){
    enableHTNEl.onchange = ()=>{
      const v = enableHTNEl.value === "true";
      state.enabledPrograms.htn = v;
      if(v){
        state.comorbid.htn = true;
        state.activeProgram = "htn";
      } else {
        state.htn = defaultState().htn;
        if(state.activeProgram==="htn") state.activeProgram = pickFallbackProgram();
      }
      ensureActiveProgramEnabled();
      saveState();
      updateConditionalBoxes();
      renderProgramList();
      renderAll();
    };
  }

  if(enableDMEl){
    enableDMEl.onchange = ()=>{
      const v = enableDMEl.value === "true";
      state.enabledPrograms.dm = v;
      if(v){
        state.comorbid.dm = true;
        state.activeProgram = "dm";
      } else {
        state.dm = defaultState().dm;
        if(state.activeProgram==="dm") state.activeProgram = pickFallbackProgram();
      }
      ensureActiveProgramEnabled();
      saveState();
      updateConditionalBoxes();
      renderProgramList();
      renderAll();
    };
  }

  if(enableDialysisEl){
    enableDialysisEl.onchange = ()=>{
      const v = enableDialysisEl.value === "true";
      state.enabledPrograms.dialysis = v;
      if(!v){
        state.dialysis = defaultState().dialysis;
        if(state.activeProgram==="dialysis") state.activeProgram = pickFallbackProgram();
      } else {
        // If enabling, switch to dialysis for convenience
        state.activeProgram = "dialysis";
      }
      ensureActiveProgramEnabled();
      saveState();
      updateConditionalBoxes();
      renderProgramList();
      renderAll();
    };
  }

  // peds fields
  qs("#childName").value = state.peds.childName || "";
  qs("#childDob").value = state.peds.dob || "";
  qs("#childSex").value = state.peds.sex || "unknown";
  qs("#childHeight").value = state.peds.heightCm || "";
  qs("#childWeight").value = state.peds.weightKg || "";
  qs("#guardianName").value = state.peds.guardianName || "";
  qs("#pedsDx").value = state.peds.dx || "unknown";

  // stone fields
  qs("#fluidRestricted").value = state.stone.fluidRestricted || "unknown";
  qs("#waterTarget").value = state.stone.targetMl || "";

  // HTN fields
  const htnFreqEl = qs("#htnFreq");
  if(htnFreqEl){
    if(!state.htn) state.htn = defaultState().htn;
    htnFreqEl.value = state.htn.bpFreq || "daily1";
    htnFreqEl.onchange = ()=>{ state.htn.bpFreq = htnFreqEl.value; saveState(); renderAll(); };
  }
  const hts = qs("#htnTargetSys");
  if(hts) hts.value = state.htn?.targetSys || "";
  const htd = qs("#htnTargetDia");
  if(htd) htd.value = state.htn?.targetDia || "";

  // DM fields
  const dmFreqEl = qs("#dmGlucoseFreq");
  if(dmFreqEl){
    if(!state.dm) state.dm = defaultState().dm;
    dmFreqEl.value = state.dm.glucoseFreq || "daily1";
    dmFreqEl.onchange = ()=>{ state.dm.glucoseFreq = dmFreqEl.value; saveState(); renderAll(); };
  }
  const dmUnitEl = qs("#dmGlucoseUnit");
  if(dmUnitEl){
    dmUnitEl.value = state.dm?.glucoseUnit || "mmolL";
    dmUnitEl.onchange = ()=>{ state.dm.glucoseUnit = dmUnitEl.value; saveState(); renderAll(); };
  }
  const dmA1cEl = qs("#dmA1cTarget");
  if(dmA1cEl) dmA1cEl.value = state.dm?.a1cTarget || "";
  const dmTherapyEl = qs("#dmTherapy");
  if(dmTherapyEl) dmTherapyEl.value = state.dm?.therapy || "unknown";
  const dmTypeEl = qs("#dmType");
  if(dmTypeEl) dmTypeEl.value = state.dm?.dmType || "unknown";

  // dialysis fields (optional)
  const modEl = qs("#dialysisModality");
  if(modEl){
    modEl.value = state.dialysis?.modality || "hd";
    modEl.onchange = ()=>{
      state.dialysis.modality = modEl.value;
      saveState();
      updateConditionalBoxes();
      renderAll();
    };
  }
  const accessEl = qs("#dialysisAccess");
  if(accessEl){
    accessEl.value = state.dialysis?.accessType || "unknown";
    accessEl.onchange = ()=>{ state.dialysis.accessType = accessEl.value; saveState(); renderAll(); };
  }
  const dryEl = qs("#dryWeightKg");
  if(dryEl) dryEl.value = state.dialysis?.dryWeightKg || "";
  const pdEx = qs("#pdExchanges");
  if(pdEx) pdEx.value = state.dialysis?.pdExchangesPerDay || "";
  const dFR = qs("#dialysisFluidRestricted");
  if(dFR){
    dFR.value = state.dialysis?.fluidRestricted || "unknown";
    dFR.onchange = ()=>{ state.dialysis.fluidRestricted = dFR.value; saveState(); renderAll(); };
  }
  const dFL = qs("#dialysisFluidLimitMl");
  if(dFL) dFL.value = state.dialysis?.fluidLimitMl || "";

  // HD days chips
  const hdBox = qs("#hdDaysChips");
  if(hdBox){
    const dayList = [
      {d:1,l:"一"},{d:2,l:"二"},{d:3,l:"三"},{d:4,l:"四"},{d:5,l:"五"},{d:6,l:"六"},{d:0,l:"日"},
    ];
    if(!Array.isArray(state.dialysis.hdDays)) state.dialysis.hdDays = [1,3,5];
    hdBox.innerHTML = dayList.map(x=>{
      const active = state.dialysis.hdDays.includes(x.d);
      return `<button type="button" class="chip ${active?"active":""}" data-hdday="${x.d}">${x.l}</button>`;
    }).join("");
    qsa("button[data-hdday]", hdBox).forEach(b=>{
      b.onclick = ()=>{
        const d = parseInt(b.getAttribute("data-hdday"), 10);
        const cur = new Set(state.dialysis.hdDays || []);
        if(cur.has(d)) cur.delete(d); else cur.add(d);
        state.dialysis.hdDays = [...cur].sort((a,b)=>a-b);
        saveState();
        renderProfileModal();
        renderAll();
      };
    });
  }

  updateConditionalBoxes();
}

function updateConditionalBoxes(){
  const kidneyOn = !!state.enabledPrograms?.kidney;
  const kSec = qs("#kidneySection");
  if(kSec) kSec.classList.toggle("hidden", !kidneyOn);

  // show glomerular/tx box only when kidney program is enabled
  qs("#glomerularBox").classList.toggle("hidden", !(kidneyOn && state.kidney.track === "glomerular"));
  qs("#txBox").classList.toggle("hidden", !(kidneyOn && state.kidney.track === "tx"));
  qs("#pedsBox").classList.toggle("hidden", !state.enabledPrograms.peds);
  qs("#stoneBox").classList.toggle("hidden", !state.enabledPrograms.stone);
  const htnBox = qs("#htnBox");
  if(htnBox) htnBox.classList.toggle("hidden", !state.enabledPrograms.htn);
  const dmBox = qs("#dmBox");
  if(dmBox) dmBox.classList.toggle("hidden", !state.enabledPrograms.dm);

  // dialysis
  const dBox = qs("#dialysisBox");
  if(dBox) dBox.classList.toggle("hidden", !state.enabledPrograms.dialysis);
  const hdRow = qs("#hdDaysRow");
  if(hdRow) hdRow.classList.toggle("hidden", !(state.enabledPrograms.dialysis && (state.dialysis?.modality || "hd") === "hd"));
  const pdRow = qs("#pdExchangesRow");
  if(pdRow) pdRow.classList.toggle("hidden", !(state.enabledPrograms.dialysis && (state.dialysis?.modality || "hd") === "pd"));
}

function openProfile(){
  renderProfileModal();
  showModal("modalProfile");
}

function saveProfileFromModal(){
  // kidney
  state.kidney.track = qs("#kidneyTrack").value;
  state.kidney.glomerularSubtype = qs("#glomerularSubtype").value;
  state.kidney.dxCertainty = qs("#dxCertainty").value;
  state.kidney.txStage = qs("#txStage").value;

  // peds enabled
  const pedsEnabled = qs("#enablePeds").value === "true";
  state.enabledPrograms.peds = pedsEnabled;
  if(pedsEnabled){
    state.peds.childName = qs("#childName").value.trim();
    state.peds.dob = qs("#childDob").value;
    state.peds.sex = qs("#childSex").value;
    state.peds.heightCm = qs("#childHeight").value;
    state.peds.weightKg = qs("#childWeight").value;
    state.peds.guardianName = qs("#guardianName").value.trim();
    state.peds.dx = qs("#pedsDx").value;
  }else{
    state.peds = defaultState().peds;
    if(state.activeProgram==="peds") state.activeProgram = pickFallbackProgram();
  }

  // stone enabled
  const stoneEnabled = qs("#enableStone").value === "true";
  state.enabledPrograms.stone = stoneEnabled;
  if(stoneEnabled){
    state.stone.fluidRestricted = qs("#fluidRestricted").value;
    state.stone.targetMl = qs("#waterTarget").value;
  }else{
    state.stone.fluidRestricted = "unknown";
    state.stone.targetMl = "";
    if(state.activeProgram==="stone") state.activeProgram = pickFallbackProgram();
  }

  // hypertension enabled
  const htnEnableEl = qs("#enableHTN");
  const htnEnabled = htnEnableEl ? (htnEnableEl.value === "true") : !!state.enabledPrograms.htn;
  state.enabledPrograms.htn = htnEnabled;
  if(htnEnabled){
    if(!state.htn) state.htn = defaultState().htn;
    const f = qs("#htnFreq");
    if(f) state.htn.bpFreq = f.value;
    const ts = qs("#htnTargetSys");
    if(ts) state.htn.targetSys = ts.value;
    const td = qs("#htnTargetDia");
    if(td) state.htn.targetDia = td.value;
    state.comorbid.htn = true;
  } else {
    state.htn = defaultState().htn;
    if(state.activeProgram==="htn") state.activeProgram = pickFallbackProgram();
  }

  // diabetes enabled
  const dmEnableEl = qs("#enableDM");
  const dmEnabled = dmEnableEl ? (dmEnableEl.value === "true") : !!state.enabledPrograms.dm;
  state.enabledPrograms.dm = dmEnabled;
  if(dmEnabled){
    if(!state.dm) state.dm = defaultState().dm;
    const gf = qs("#dmGlucoseFreq");
    if(gf) state.dm.glucoseFreq = gf.value;
    const gu = qs("#dmGlucoseUnit");
    if(gu) state.dm.glucoseUnit = gu.value;
    const at = qs("#dmA1cTarget");
    if(at) state.dm.a1cTarget = at.value;
    const th = qs("#dmTherapy");
    if(th) state.dm.therapy = th.value;
    const ty = qs("#dmType");
    if(ty) state.dm.dmType = ty.value;
    state.comorbid.dm = true;
  } else {
    state.dm = defaultState().dm;
    if(state.activeProgram==="dm") state.activeProgram = pickFallbackProgram();
  }

  // dialysis enabled
  const dEnableEl = qs("#enableDialysis");
  const dialysisEnabled = dEnableEl ? (dEnableEl.value === "true") : state.enabledPrograms.dialysis;
  state.enabledPrograms.dialysis = dialysisEnabled;
  if(dialysisEnabled){
    if(!state.dialysis) state.dialysis = defaultState().dialysis;
    const modEl = qs("#dialysisModality");
    if(modEl) state.dialysis.modality = modEl.value;
    const accEl = qs("#dialysisAccess");
    if(accEl) state.dialysis.accessType = accEl.value;
    const dw = qs("#dryWeightKg");
    if(dw) state.dialysis.dryWeightKg = dw.value;
    const pde = qs("#pdExchanges");
    if(pde) state.dialysis.pdExchangesPerDay = pde.value;
    const fr = qs("#dialysisFluidRestricted");
    if(fr) state.dialysis.fluidRestricted = fr.value;
    const fl = qs("#dialysisFluidLimitMl");
    if(fl) state.dialysis.fluidLimitMl = fl.value;
  } else {
    state.dialysis = defaultState().dialysis;
    if(state.activeProgram==="dialysis") state.activeProgram = pickFallbackProgram();
  }

  // ensure at least one program + ensure active program is enabled
  ensureActiveProgramEnabled();

  saveState();
  closeModal("modalProfile");
  renderProgramList();
  renderAll();
}

function openAddLab(){
  const lab = latestLab() || {};
  const body = `
    ${whyTip("labs")}
    <div class="note">提示：也可以用📷 拍照录入，自动识别化验单数据。</div>
    <div class="two">
      <label class="field"><span>日期</span><input id="labDate" type="date" value="${escapeHtml(lab.date || yyyyMMdd(new Date()))}"></label>
      <label class="field"><span>肌酐单位</span>
        <select id="scrUnit">
          <option value="umolL">μmol/L</option>
          <option value="mgdl">mg/dL</option>
        </select>
      </label>
    </div>

    <div class="two">
      <label class="field"><span>肌酐（Scr）</span><input id="labScr" type="number" inputmode="decimal" placeholder="例如：120"></label>
      <label class="field"><span>eGFR（如已知）</span><input id="labEgfr" type="number" inputmode="decimal" placeholder="可留空"></label>
    </div>

    <div class="two">
      <label class="field"><span>血钾 K（mmol/L）</span><input id="labK" type="number" inputmode="decimal" placeholder="例如：4.2"></label>
      <label class="field"><span>血钠 Na（mmol/L）</span><input id="labNa" type="number" inputmode="decimal" placeholder="例如：140"></label>
    </div>

    <div class="two">
      <label class="field"><span>血磷 P（mmol/L）</span><input id="labP" type="number" inputmode="decimal" placeholder="例如：1.2"></label>
      <label class="field"><span>血钙 Ca（mmol/L）</span><input id="labCa" type="number" inputmode="decimal" placeholder="例如：2.3"></label>
    </div>

    <div class="two">
      <label class="field"><span>血镁 Mg（mmol/L）</span><input id="labMg" type="number" inputmode="decimal" placeholder="例如：0.8"></label>
      <label class="field"><span>血糖 Glu（mmol/L）</span><input id="labGlu" type="number" inputmode="decimal" placeholder="例如：6.1"></label>
    </div>

    <label class="field"><span>HbA1c（%）</span><input id="labHbA1c" type="number" inputmode="decimal" placeholder="例如：6.5"></label>
  `;
  openSimpleModal("新增化验（内测）","录入后会触发：饮食提醒/安全提醒/计划建议", body,
    `<button class="primary" id="btnSaveLab">保存</button><button class="ghost" data-close="modalSimple">取消</button>`);
  qs("#scrUnit").value = lab.scrUnit || "umolL";

  qs("#btnSaveLab").onclick = ()=>{
    const entry = {
      date: qs("#labDate").value || yyyyMMdd(new Date()),
      scrUnit: qs("#scrUnit").value,
      scr: qs("#labScr").value,
      egfr: qs("#labEgfr").value,
      k: qs("#labK").value,
      na: qs("#labNa").value,
      p: qs("#labP").value,
      ca: qs("#labCa").value,
      mg: qs("#labMg").value,
      glu: qs("#labGlu").value,
      hba1c: qs("#labHbA1c").value,
      flags: {}
    };

    // If active program is peds, attempt to compute eGFR if missing
    if((state.activeProgram==="peds" || state.enabledPrograms.peds) && !entry.egfr && entry.scr){
      const h = toNum(latestVital(state.vitals.height)?.cm ?? state.peds.heightCm);
      const egfr = pedsEgfrBedsideSchwartz(h, entry.scr, entry.scrUnit);
      if(egfr !== null){
        entry.egfr = String(egfr);
      }
    }

    state.labs.push(entry);
    saveState();
    if(typeof trackEvent === "function") trackEvent("record_submit", {type:"lab"});
    closeModal("modalSimple");
    renderAll();
  };
}

function openAddUrine(){
  const body = `
    ${whyTip("urine")}
    <div class="two">
      <label class="field"><span>日期</span><input id="uDate" type="date" value="${yyyyMMdd(new Date())}"></label>
      <label class="field"><span>备注（可选）</span><input id="uNote" type="text" placeholder="例如：晨尿/发热后/运动后"></label>
    </div>
    <div class="two">
      <label class="field"><span>尿蛋白</span>
        <select id="uProtein">
          <option value="阴性">阴性</option>
          <option value="±">±</option>
          <option value="1+">1+</option>
          <option value="2+">2+</option>
          <option value="3+">3+</option>
          <option value="4+">4+</option>
        </select>
      </label>
      <label class="field"><span>尿潜血</span>
        <select id="uBlood">
          <option value="阴性">阴性</option>
          <option value="±">±</option>
          <option value="1+">1+</option>
          <option value="2+">2+</option>
          <option value="3+">3+</option>
        </select>
      </label>
    </div>
    <div class="note subtle">提示：仅做随访记录；如出现肉眼血尿、少尿、明显水肿等，请及时联系医生。</div>
  `;
  openSimpleModal("新增尿检记录","肾小球病/ADPKD 建议做时间线记录", body,
    `<button class="primary" id="btnSaveUrine">保存</button><button class="ghost" data-close="modalSimple">取消</button>`);
  qs("#btnSaveUrine").onclick = ()=>{
    state.urineTests.push({
      date: qs("#uDate").value || yyyyMMdd(new Date()),
      protein: qs("#uProtein").value,
      blood: qs("#uBlood").value,
      note: qs("#uNote").value.trim()
    });
    saveState();
    closeModal("modalSimple");
    renderAll();
  };
}

// ====== Document Vault (upload / view) ======

function scopeLabel(scope){
  const m = {
    kidney: "肾脏随访",
    tx: "肾移植",
    glomerular: "肾小球病",
    iga: "IgA肾病",
    mn: "膜性肾病",
    hbv: "乙肝相关肾病",
    mcd: "微小病变(MCD)",
    fsgs: "原发FSGS",
    ln: "狼疮性肾炎",
    anca: "ANCA相关肾损害",
    c3g: "C3肾小球病",
    adpkd: "多囊肾(ADPKD)",
    genetic: "遗传性肾病",
    dialysis: "透析",
    stone: "结石",
    peds: "儿肾",
    htn: "高血压",
    dm: "糖尿病",
  };
  return m[scope] || scope;
}

function docsForProgram(prog){
  const all = state.documents || [];
  return all
    .filter(d => (d.program || "kidney") === prog)
    .sort((a,b)=> (a.date||"").localeCompare(b.date||""))
    .reverse();
}

function renderDocsList(){
  const box = qs("#docList");
  if(!box) return;
  const prog = state.activeProgram;
  const docs = docsForProgram(prog).slice(0, 5);
  if(!docs.length){
    box.innerHTML = `<div class="doc-empty">暂无资料。建议上传：肾活检报告/图片、基因检测报告、免疫学指标（dd-cfDNA/anti-PLA2R 等）、影像检查等。</div>`;
    return;
  }
  box.innerHTML = docs.map(d=>{
    const title = d.title || d.fileName || docCategoryLabel(d.category);
    const scopeTxt = (d.scope && d.scope !== "kidney" && d.scope !== d.program) ? ` · ${escapeHtml(scopeLabel(d.scope))}` : "";
    const meta = `${escapeHtml(docCategoryLabel(d.category))}${scopeTxt} · ${escapeHtml(niceDate(d.date)||"—")}`;
    const fileMeta = `${escapeHtml(d.fileName||"")}${d.size?` · ${escapeHtml(humanFileSize(d.size))}`:""}`;
    return `
      <div class="list-item">
        <div class="t">${escapeHtml(title)}</div>
        <div class="s">${meta}</div>
        <div class="doc-meta">${fileMeta}</div>
        <div class="doc-actions">
          <button class="ghost small" data-doc-open="${escapeHtml(d.id)}">打开</button>
          <button class="ghost small" data-doc-del="${escapeHtml(d.id)}">删除</button>
        </div>
      </div>
    `;
  }).join("");

  qsa("#docList [data-doc-open]").forEach(btn=>{
    btn.onclick = ()=>openDocViewerModal(btn.getAttribute("data-doc-open"));
  });
  qsa("#docList [data-doc-del]").forEach(btn=>{
    btn.onclick = ()=>deleteDocument(btn.getAttribute("data-doc-del"));
  });
}

function openDocUploadModal(preset={}){
  const today = yyyyMMdd(new Date());
  const scope = markerScopeFromState();
  const showScope = state.activeProgram === "kidney";
  const scopeOptions = [
    {v:"kidney", t:"肾脏随访（通用）"},
    {v:"tx", t:"肾移植"},
    {v:"mn", t:"膜性肾病"},
    {v:"ln", t:"狼疮性肾炎"},
    {v:"mcd", t:"微小病变(MCD)"},
    {v:"fsgs", t:"原发FSGS"},
    {v:"iga", t:"IgA肾病"},
    {v:"c3g", t:"C3肾小球病"},
    {v:"adpkd", t:"多囊肾(ADPKD)"},
    {v:"genetic", t:"遗传性肾病"},
    {v:"unknown", t:"其他/不确定"},
  ];

  const body = `
    ${whyTip("docs_vault")}
    <div class="note">内测：文件仅保存在本机（IndexedDB）。建议只上传非敏感/脱敏资料用于测试流程。</div>
    <label class="field"><span>资料类型</span>
      <select id="docCategory">
        <option value="biopsy_report">肾活检报告（PDF/图片）</option>
        <option value="biopsy_image">病理图片（显微镜/切片）</option>
        <option value="genetic_report">基因检测报告</option>
        <option value="immune_report">免疫学/高级指标（dd-cfDNA/DSA/anti-PLA2R等）</option>
        <option value="imaging">影像检查（超声/CT/MRI等）</option>
        <option value="discharge">出院小结/门诊病历</option>
        <option value="lab_report">化验单（原件）</option>
        <option value="other">其他</option>
      </select>
    </label>

    ${showScope ? `
      <label class="field"><span>关联子类型（可选）</span>
        <select id="docScope">
          ${scopeOptions.map(o=>`<option value="${o.v}">${escapeHtml(o.t)}</option>`).join("")}
        </select>
        <div class="note subtle">用于后续给不同人群推送内容/提醒（例如膜性随访 anti-PLA2R）。不确定就选“其他/不确定”。</div>
      </label>
    ` : ""}

    <div class="two">
      <label class="field"><span>检查日期（可选）</span><input id="docDate" type="date" value="${escapeHtml(preset.date || today)}" /></label>
      <label class="field"><span>标题（可选）</span><input id="docTitle" type="text" value="${escapeHtml(preset.title || "")}" placeholder="例如：2026-03 肾活检报告" /></label>
    </div>

    <label class="field"><span>选择文件（可多选）</span>
      <input id="docFiles" type="file" multiple accept="image/*,application/pdf" />
      <div class="note subtle">建议：PDF/图片都可以。体积太大可能会保存失败（与设备空间/浏览器限制有关）。</div>
    </label>

    <label class="field"><span>备注（可选）</span><input id="docNote" type="text" value="${escapeHtml(preset.note || "")}" placeholder="例如：Banff提示… / PLA2R阳性…" /></label>
  `;

  openSimpleModal(
    "上传资料（内测）",
    "用于随访整理与复诊沟通；不用于诊断或处方。",
    body,
    `<button class="primary" id="btnSaveDocUpload">保存</button><button class="ghost" data-close="modalSimple">取消</button>`
  );

  // preset scope
  const scopeEl = qs("#docScope");
  if(scopeEl) scopeEl.value = preset.scope || scope || "kidney";

  // preset category
  const catEl = qs("#docCategory");
  if(catEl && preset.category) catEl.value = preset.category;

  const maybeReturnToMarkerDraft = ()=>{
    const after = state.ui && state.ui.afterDocUpload ? state.ui.afterDocUpload : null;
    if(!after) return;
    try{ delete state.ui.afterDocUpload; }catch(_e){}
    saveState();
    setTimeout(()=>{
      try{
        if(after.kind === "markerDraft" && after.draft){
          openAddMarkerModal(after.draft);
        }
      }catch(_e){/* ignore */}
    }, 50);
  };

  // Override close buttons: if doc upload was launched from another workflow (e.g., marker entry),
  // return to it after closing to avoid losing context on mobile.
  qsa("#modalSimple [data-close]").forEach(b=>{
    b.onclick = ()=>{ closeModal(b.getAttribute("data-close")); maybeReturnToMarkerDraft(); };
  });



  qs("#btnSaveDocUpload").onclick = async ()=>{
    const files = qs("#docFiles")?.files;
    if(!files || files.length === 0){ toast("请先选择文件（可多选）"); return; }
    const cat = qs("#docCategory")?.value || "other";
    const date = qs("#docDate")?.value || "";
    const titleInput = qs("#docTitle")?.value?.trim() || "";
    const note = qs("#docNote")?.value?.trim() || "";
    const dScope = showScope ? (qs("#docScope")?.value || "kidney") : state.activeProgram;

    const btn = qs("#btnSaveDocUpload");
    if(btn){ btn.disabled = true; btn.textContent = "保存中…"; }

    let ok = 0;
    for(const f of Array.from(files)){
      try{
        const fileId = await idbPutFile(f);
        state.documents.push({
          id: uid("doc"),
          program: state.activeProgram,
          scope: dScope,
          category: cat,
          date,
          title: titleInput || `${docCategoryLabel(cat)} · ${f.name}`,
          note,
          fileId,
          fileName: f.name,
          mime: f.type || "application/octet-stream",
          size: f.size || 0,
          createdAt: nowISO(),
        });
        ok++;
      }catch(e){
        console.error(e);
        toast("保存失败：可能是浏览器/空间限制。可尝试压缩图片或只保存摘要。\n（提示：正式版会接云端存储）");
      }
    }
    saveState();
    closeModal("modalSimple");
    renderAll();
    if(ok) toast(`已保存 ${ok} 份资料（本地）`);
    // If we entered from marker entry, return to marker draft for a smooth flow.
    maybeReturnToMarkerDraft();
  };
}

async function openDocViewerModal(docId){
  const doc = (state.documents||[]).find(d=>d.id===docId);
  if(!doc){ toast("未找到该资料"); return; }
  let rec = null;
  try{ rec = doc.fileId ? await idbGetFile(doc.fileId) : null; }catch(e){ console.error(e); }

  let url = "";
  if(rec?.blob){
    try{ url = URL.createObjectURL(rec.blob); }catch(_e){ url = ""; }
  }

  const title = doc.title || doc.fileName || "资料";
  const meta = `${docCategoryLabel(doc.category)} · ${niceDate(doc.date)||"—"}${doc.scope?` · ${scopeLabel(doc.scope)}`:""}`;
  const note = doc.note ? `<div class="list-item"><div class="t">备注</div><div class="s">${escapeHtml(doc.note)}</div></div>` : "";
  const fileLine = `<div class="note">文件：${escapeHtml(doc.fileName||"—")} ${doc.size?`（${escapeHtml(humanFileSize(doc.size))}）`:""}</div>`;

  let preview = "";
  if(!url){
    preview = `<div class="list-item"><div class="t">预览不可用</div><div class="s">可能是浏览器清理了本地缓存/权限受限。你仍可重新上传该文件。</div></div>`;
  }else if((doc.mime||"").startsWith("image/")){
    preview = `<div class="doc-preview"><img src="${escapeHtml(url)}" alt="preview" /></div>`;
  }else{
    preview = `<div class="list-item"><div class="t">PDF/文件预览</div><div class="s">点击“在新窗口打开”查看文件。</div></div>`;
  }

  openSimpleModal(
    title,
    meta,
    `${note}${fileLine}${preview}`,
    `<button class="primary" id="btnOpenDocExt">在新窗口打开</button>
     <button class="ghost" id="btnDelDoc">删除</button>
     <button class="ghost" data-close="modalSimple">关闭</button>`
  );

  const revoke = ()=>{ try{ if(url) URL.revokeObjectURL(url); }catch(_e){} };
  qsa("#modalSimple [data-close]").forEach(b=>{
    const old = b.onclick;
    b.onclick = ()=>{ revoke(); if(typeof old==="function") old(); else closeModal("modalSimple"); };
  });

  const bOpen = qs("#btnOpenDocExt");
  if(bOpen) bOpen.onclick = ()=>{
    if(!url){ toast("无法打开：文件未找到（可能已被清理）"); return; }
    try{ window.open(url, "_blank"); }catch(e){ console.error(e); }
  };

  const bDel = qs("#btnDelDoc");
  if(bDel) bDel.onclick = ()=>{ revoke(); deleteDocument(docId); closeModal("modalSimple"); };
}

function deleteDocument(docId){
  const doc = (state.documents||[]).find(d=>d.id===docId);
  if(!doc) return;
  if(!confirm("确认删除该资料？（仅删除本地）")) return;
  // delete meta
  state.documents = (state.documents||[]).filter(d=>d.id!==docId);
  saveState();
  // best-effort delete blob
  if(doc.fileId){ idbDeleteFile(doc.fileId).catch(e=>console.error(e)); }
  renderAll();
}


// ====== Docs vault (page) ======
function docsFiltered(){
  const all = state.documents || [];
  let docs = all.slice();

  const prog = docsUI.prog || "active";
  if(prog === "active"){
    docs = docs.filter(d => (d.program || "kidney") === state.activeProgram);
  } else if(prog !== "all"){
    docs = docs.filter(d => (d.program || "kidney") === prog);
  }

  const cat = docsUI.cat || "all";
  if(cat !== "all"){
    docs = docs.filter(d => (d.category || "other") === cat);
  }

  const q = (docsUI.query || "").trim().toLowerCase();
  if(q){
    docs = docs.filter(d=>{
      const hay = `${d.title||""} ${d.note||""} ${d.fileName||""} ${docCategoryLabel(d.category)||""} ${programLabel(d.program||"kidney")}`.toLowerCase();
      return hay.includes(q);
    });
  }

  docs.sort((a,b)=> (a.date||"").localeCompare(b.date||"")).reverse();
  return docs;
}

function renderDocsPage(){
  const list = qs("#docsVaultList");
  if(!list) return;

  // keep UI in sync
  const progSel = qs("#docsProgFilter");
  const catSel  = qs("#docsCatFilter");
  const qInput  = qs("#docsSearch");
  if(progSel) progSel.value = docsUI.prog || "active";
  if(catSel)  catSel.value  = docsUI.cat  || "all";
  if(qInput && typeof qInput.value !== "string") {} // noop
  if(qInput && qInput.value !== (docsUI.query||"")) qInput.value = (docsUI.query||"");

  const docs = docsFiltered();

  // meta chips
  const meta = qs("#docsMeta");
  if(meta){
    const chips = [];
    const scopeTxt = (docsUI.prog==="active") ? `当前：${escapeHtml(programLabel(state.activeProgram))}` : (docsUI.prog==="all" ? "范围：全部项目" : `范围：${escapeHtml(programLabel(docsUI.prog))}`);
    chips.push(`<div class="badge info">${scopeTxt}</div>`);
    if(docsUI.cat && docsUI.cat!=="all") chips.push(`<div class="badge ok">类别：${escapeHtml(docCategoryLabel(docsUI.cat))}</div>`);
    if(docsUI.query && docsUI.query.trim()) chips.push(`<div class="badge ok">搜索：${escapeHtml(docsUI.query.trim())}</div>`);
    chips.push(`<div class="badge ok">共 ${docs.length} 份</div>`);
    meta.innerHTML = chips.join("");
  }

  if(!docs.length){
    list.innerHTML = `<div class="doc-empty">暂无资料。建议先上传：肾活检报告/图片、基因检测报告、免疫学指标（dd-cfDNA/anti-PLA2R 等）、影像检查等。</div>`;
  } else {
    list.innerHTML = docs.map(d=>{
      const title = d.title || d.fileName || docCategoryLabel(d.category);
      const meta1 = `${docCategoryLabel(d.category)} · ${niceDate(d.date|| (d.createdAt? d.createdAt.slice(0,10): "" ) || "—")}`;
      const meta2 = `项目：${programLabel(d.program||"kidney")}${d.scope && d.scope !== d.program ? ` · 细分：${scopeLabel(d.scope)}`:""}`;
      const note = d.note ? escapeHtml(d.note) : "";
      const file = d.fileName ? escapeHtml(d.fileName) : "";
      return `
        <div class="list-item">
          <div>
            <div class="t">${escapeHtml(title)}</div>
            <div class="s">${escapeHtml(meta1)} · ${escapeHtml(meta2)}</div>
            ${note ? `<div class="s">备注：${note}</div>` : (file? `<div class="s">文件：${file}</div>`:"")}
          </div>
          <div class="actions">
            <button class="ghost small" data-doc-open="${escapeHtml(d.id)}">打开</button>
            <button class="ghost small" data-doc-del="${escapeHtml(d.id)}">删除</button>
          </div>
        </div>
      `;
    }).join("");
  }

  qsa("#docsVaultList [data-doc-open]").forEach(btn=>btn.onclick = ()=>openDocViewerModal(btn.getAttribute("data-doc-open")));
  qsa("#docsVaultList [data-doc-del]").forEach(btn=>btn.onclick = ()=>deleteDocument(btn.getAttribute("data-doc-del")));

  // Visit pack preview (safe: text only)
  const vp = qs("#visitPackPreview");
  if(vp){
    vp.textContent = buildVisitPackText(90);
  }
}

function openDocsVaultModal(){
  const prog = state.activeProgram;
  const allDocs = state.documents || [];
  const body = `
    <div class="note">你可以把肾活检/基因/免疫学指标/影像/病历等集中放在这里，复诊时更好找。</div>
    <label class="field"><span>按项目筛选</span>
      <select id="docProgFilter">
        <option value="all">全部</option>
        ${Object.keys(PROGRAMS).map(k=>`<option value="${k}">${escapeHtml(programLabel(k))}</option>`).join("")}
      </select>
    </label>
    <div id="docVaultList"></div>
  `;
  openSimpleModal("资料库（内测）","本地保存：更换设备不会同步（正式版可上云）", body, `<button class="ghost" data-close="modalSimple">关闭</button>`);

  const sel = qs("#docProgFilter");
  if(sel) sel.value = prog;

  const renderVault = ()=>{
    const f = qs("#docProgFilter")?.value || "all";
    const list = (f==="all" ? allDocs : allDocs.filter(d => (d.program||"kidney")===f))
      .sort((a,b)=> (a.createdAt||"").localeCompare(b.createdAt||""))
      .reverse();
    const box = qs("#docVaultList");
    if(!box) return;
    if(!list.length){ box.innerHTML = `<div class="doc-empty">暂无资料。</div>`; return; }
    box.innerHTML = list.map(d=>`
      <div class="list-item">
        <div class="t">${escapeHtml(d.title || d.fileName || docCategoryLabel(d.category))}</div>
        <div class="s">${escapeHtml(programLabel(d.program||"kidney"))} · ${escapeHtml(docCategoryLabel(d.category))}${d.scope?` · ${escapeHtml(scopeLabel(d.scope))}`:""} · ${escapeHtml(niceDate(d.date)||"—")}</div>
        <div class="doc-meta">${escapeHtml(d.fileName||"")}${d.size?` · ${escapeHtml(humanFileSize(d.size))}`:""}</div>
        <div class="doc-actions">
          <button class="ghost small" data-doc-open="${escapeHtml(d.id)}">打开</button>
          <button class="ghost small" data-doc-del="${escapeHtml(d.id)}">删除</button>
        </div>
      </div>
    `).join("");
    qsa("#docVaultList [data-doc-open]").forEach(btn=>btn.onclick = ()=>openDocViewerModal(btn.getAttribute("data-doc-open")));
    qsa("#docVaultList [data-doc-del]").forEach(btn=>btn.onclick = ()=>deleteDocument(btn.getAttribute("data-doc-del")));
  };
  if(sel) sel.onchange = ()=>renderVault();
  renderVault();
}

// ====== Advanced markers (structured) ======

function markersForScope(scope){
  const all = state.markers || [];
  return all.filter(m => (m.scope||"kidney") === scope)
    .sort((a,b)=> (a.date||"").localeCompare(b.date||""))
    .reverse();
}

function renderMarkersList(){
  const box = qs("#markerList");
  if(!box) return;
  const scope = markerScopeFromState();
  const list = markersForScope(scope).slice(0, 8);
  if(!list.length){
    const options = markerOptionsForCurrentUser();
    const suggest = options.length ? options.map(o=>o.label).join("、") : "暂无（当前随访路径不需要）";
    box.innerHTML = `<div class="doc-empty">暂无高级指标记录。可新增：${escapeHtml(suggest)}。更推荐同时上传报告原件到“资料库”。</div>`;
    return;
  }

  const fmt = (m)=>{
    if(m.type === "dsa"){
      const r = m.payload?.result || "";
      const mfi = m.payload?.maxMfi ? ` · maxMFI ${m.payload.maxMfi}` : "";
      return `${escapeHtml(r)}${escapeHtml(mfi)}`;
    }
    const v = m.payload?.value ?? "";
    const u = m.payload?.unit ? ` ${m.payload.unit}` : (MARKER_DEFS[m.type]?.unit ? ` ${MARKER_DEFS[m.type].unit}` : "");
    const extra = m.payload?.extra ? ` · ${m.payload.extra}` : "";
    return `${escapeHtml(v)}${escapeHtml(u)}${escapeHtml(extra)}`;
  };

  box.innerHTML = list.map(m=>`
    <div class="list-item">
      <div class="t">${escapeHtml(markerLabel(m.type))}</div>
      <div class="s">${escapeHtml(niceDate(m.date)||"—")} · ${fmt(m)}${m.note?` · 备注：${escapeHtml(m.note)}`:""}</div>
      <div class="doc-actions">
        <button class="ghost small" data-mk-del="${escapeHtml(m.id)}">删除</button>
      </div>
    </div>
  `).join("");
  qsa("#markerList [data-mk-del]").forEach(btn=>{
    btn.onclick = ()=>deleteMarker(btn.getAttribute("data-mk-del"));
  });
}

function openAddMarkerModal(draft){
  const scope = markerScopeFromState();
  const opts = markerOptionsForCurrentUser();
  if(!opts.length){
    openSimpleModal(
      "高级监测指标",
      "当前随访路径暂无预设指标",
      `<div class="note">你当前的随访路径/项目下没有预设“高级指标”。你仍然可以把报告原件上传到“资料库”。</div>`,
      `<button class="ghost" data-close="modalSimple">关闭</button>`
    );
    return;
  }

  const today = yyyyMMdd(new Date());
  const defaultType = (draft && draft.type && opts.some(o=>o.key===draft.type)) ? draft.type : opts[0].key;
  const defaultDate = (draft && draft.date) ? draft.date : today;
  const defaultNote = (draft && draft.note) ? draft.note : "";

  const body = `
    <div class="note">建议：高级指标最好同时上传原始报告（资料库），这里录入摘要便于做趋势与复诊整理。</div>

    <label class="field"><span>指标类型（根据你当前人群自动筛选）</span>
      <select id="mkType">
        ${opts.map(o=>`<option value="${o.key}"${o.key===defaultType?" selected":""}>${escapeHtml(o.label)}</option>`).join("")}
      </select>
    </label>

    <div id="mkExplainCard"></div>

    <label class="field"><span>采样/抽血日期</span><input id="mkDate" type="date" value="${defaultDate}" /></label>
    <div id="mkFields"></div>

    <div class="row" style="justify-content:flex-end; margin:0;">
      <button class="ghost small" id="btnMkAdvancedToggle">高级选项</button>
    </div>
    <div id="mkAdvanced" class="hidden"></div>

    <div class="note subtle">范围提示：本功能只做记录与整理，不替代医生判读。</div>
  `;

  openSimpleModal("新增高级指标","范围：随访整理（非诊断/处方）", body,
    `<button class="primary" id="btnSaveMarker">保存</button><button class="ghost" data-close="modalSimple">取消</button>`);

  const mkList = (arr)=> arr && arr.length ? `<ul>${arr.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul>` : "";

  const getDraftFromUI = ()=>{
    const type = qs("#mkType")?.value || defaultType;
    const date = qs("#mkDate")?.value || defaultDate;
    const note = qs("#mkNote")?.value?.trim() || "";

    let payload = {};
    if(type === "dsa"){
      payload = { result: qs("#mkDsaRes")?.value || "不确定", maxMfi: qs("#mkDsaMfi")?.value || "" };
    } else if(type === "antiNephrin"){
      payload = { value: qs("#mkValue")?.value?.trim() || "", unit: qs("#mkUnit")?.value?.trim() || "", extra: qs("#mkNephRes")?.value || "" };
    } else {
      payload = { value: qs("#mkValue")?.value?.trim() || "", unit: qs("#mkUnit")?.value?.trim() || "" };
    }
    return { type, date, note, payload };
  };

  const openExplainForCurrent = ()=>{
    const d = getDraftFromUI();
    // Close current modal first to avoid nested sheets on mobile
    closeModal("modalSimple");
    state.ui = state.ui || { overlayReturn: currentTabKey, explainerId: '' };
    state.ui.afterOverlay = { kind: "markerDraft", draft: d };
    saveState();
    openExplainPage(markerExplainerId(d.type));
  };

  const openUploadForCurrent = ()=>{
    const d = getDraftFromUI();
    // Close current modal first to avoid nested sheets on mobile
    closeModal("modalSimple");
    state.ui = state.ui || {};
    state.ui.afterDocUpload = { kind: "markerDraft", draft: d };
    saveState();

    // Prefill: immune report + current scope + date
    const presetTitle = `${markerLabel(d.type)} 报告`;
    const presetNote = `关联高级指标：${markerLabel(d.type)}`;
    openDocUploadModal({ category: "immune_report", scope: scope, date: d.date, title: presetTitle, note: presetNote });
  };

  const fmtMarker = (m)=>{
    if(!m) return '';
    if(m.type === "dsa"){
      const r = m.payload?.result || "";
      const mfi = m.payload?.maxMfi ? ` · maxMFI ${m.payload.maxMfi}` : "";
      return `${r}${mfi}`.trim();
    }
    const v = m.payload?.value ?? "";
    const u = m.payload?.unit ? ` ${m.payload.unit}` : (MARKER_DEFS[m.type]?.unit ? ` ${MARKER_DEFS[m.type].unit}` : "");
    const extra = m.payload?.extra ? ` · ${m.payload.extra}` : "";
    return `${v}${u}${extra}`.trim();
  };

  const renderExplainCard = ()=>{
    const type = qs("#mkType")?.value || defaultType;
    const e = explainerById(markerExplainerId(type));
    const box = qs("#mkExplainCard");
    if(!box) return;

    // Slightly detailed but not overwhelming: show why + 2 focus bullets
    const focus = (e.focus || []).slice(0,2);

    // Show last record to reduce重复录入/增强趋势感
    const last = markersForScope(scope).find(m=>m.type===type) || null;
    const lastLine = last ? `最近一次：${niceDate(last.date)||"—"} · ${fmtMarker(last)}` : "暂无历史记录：保存后会自动形成时间线。";

    box.innerHTML = `
      <div class="explain-card">
        <div class="explain-card-top">
          <div class="explain-card-title">为什么要记这项：${escapeHtml(markerLabel(type))}</div>
          <div class="row" style="gap:8px; margin:0;">
            <button class="ghost small" id="btnMkExplain">说明</button>
            <button class="ghost small" id="btnMkUpload">上传报告</button>
          </div>
        </div>
        <div class="explain-card-body">${escapeHtml(e.why || "")}</div>
        ${focus.length ? `<div class="explain-card-list">${mkList(focus)}</div>` : ``}
        <div class="note subtle">${escapeHtml(lastLine)}</div>
      </div>
    `;

    const b = qs("#btnMkExplain");
    if(b) b.onclick = openExplainForCurrent;
    const u = qs("#btnMkUpload");
    if(u) u.onclick = openUploadForCurrent;
  };

  const valuePlaceholderFor = (t)=>{
    if(t === 'ddcfDNA') return '例如：0.5';
    if(t === 'antiPLA2R') return '例如：20 或 阴性';
    if(t === 'dsDNA') return '例如：阳性/阴性 或 数值';
    if(t === 'c3' || t === 'c4') return '例如：0.8';
    if(t === 'antiTHSD7A') return '例如：阳性/阴性 或 数值';
    return '例如：0.8 或 阴性';
  };

  let mkAdvOpen = false;
const setMkAdvanced = (open)=>{
  mkAdvOpen = !!open;
  const box = qs("#mkAdvanced");
  if(box) box.classList.toggle("hidden", !mkAdvOpen);
  const btn = qs("#btnMkAdvancedToggle");
  if(btn) btn.textContent = mkAdvOpen ? "收起高级" : "高级选项";
};
const toggleMkAdvanced = ()=>setMkAdvanced(!mkAdvOpen);

const bAdv = qs("#btnMkAdvancedToggle");
if(bAdv) bAdv.onclick = toggleMkAdvanced;

const renderFields = ()=>{
  const t = qs("#mkType")?.value || defaultType;
  const def = MARKER_DEFS[t] || {};

  let main = "";
  let adv = "";

  if(t === "dsa"){
    main = `
      <label class="field"><span>结果</span>
        <select id="mkDsaRes">
          <option value="阴性">阴性</option>
          <option value="阳性">阳性</option>
          <option value="不确定">不确定/未说明</option>
        </select>
      </label>
    `;
    adv = `
      <label class="field"><span>max MFI（可选）</span><input id="mkDsaMfi" type="number" inputmode="numeric" placeholder="例如：5000" /></label>
      <label class="field"><span>备注（可选）</span><input id="mkNote" type="text" value="${escapeHtml(defaultNote)}" placeholder="例如：复查/治疗后第2周…" /></label>
    `;
  } else if(t === "antiNephrin"){
    main = `
      <label class="field"><span>结果</span>
        <select id="mkNephRes">
          <option value="阴性">阴性</option>
          <option value="阳性">阳性</option>
          <option value="不确定">不确定/未说明</option>
        </select>
      </label>
      <label class="field"><span>滴度/数值（可选）</span><input id="mkValue" type="text" placeholder="例如：1:160 或 20" /></label>
    `;
    adv = `
      <label class="field"><span>单位（可选）</span><input id="mkUnit" type="text" placeholder="例如：RU/mL" /></label>
      <label class="field"><span>备注（可选）</span><input id="mkNote" type="text" value="${escapeHtml(defaultNote)}" placeholder="例如：复查/治疗后第2周…" /></label>
    `;
  } else {
    main = `
      <label class="field"><span>数值/结果</span><input id="mkValue" type="text" inputmode="decimal" placeholder="${escapeHtml(valuePlaceholderFor(t))}" /></label>
    `;
    adv = `
      <label class="field"><span>单位（可选）</span><input id="mkUnit" type="text" value="${escapeHtml(def.unit||"")}" placeholder="例如：% / RU/mL / g/L" /></label>
      <label class="field"><span>备注（可选）</span><input id="mkNote" type="text" value="${escapeHtml(defaultNote)}" placeholder="例如：复查/治疗后第2周…" /></label>
    `;
  }

  if(def.tip){
    main += `<div class="note subtle">提示：${escapeHtml(def.tip)}</div>`;
  }

  const box = qs("#mkFields");
  if(box) box.innerHTML = main;

  const advBox = qs("#mkAdvanced");
  if(advBox) advBox.innerHTML = adv;

  // Fill draft payload after rendering fields
  const d = (draft && draft.type && opts.some(o=>o.key===draft.type)) ? draft : null;
  if(d && (d.type === t) && d.payload){
    if(t === 'dsa'){
      const r = qs('#mkDsaRes');
      const mfi = qs('#mkDsaMfi');
      if(r && d.payload.result) r.value = d.payload.result;
      if(mfi && d.payload.maxMfi) mfi.value = d.payload.maxMfi;
    } else if(t === 'antiNephrin'){
      const r = qs('#mkNephRes');
      const v = qs('#mkValue');
      const u = qs('#mkUnit');
      if(r && d.payload.extra) r.value = d.payload.extra;
      if(v && d.payload.value) v.value = d.payload.value;
      if(u && d.payload.unit) u.value = d.payload.unit;
    } else {
      const v = qs('#mkValue');
      const u = qs('#mkUnit');
      if(v && d.payload.value) v.value = d.payload.value;
      if(u && d.payload.unit) u.value = d.payload.unit;
    }
  }

  // Fill draft note
  if(d && (d.type === t) && (d.note || "")){
    const n = qs('#mkNote');
    if(n) n.value = d.note || "";
  }

  // Auto-open advanced options if draft has extra info
  const shouldOpen = !!(d && d.type===t && (
    (d.note && d.note.trim()) ||
    (d.payload && (d.payload.unit && (""+d.payload.unit).trim())) ||
    (d.payload && (d.payload.maxMfi && (""+d.payload.maxMfi).trim()))
  ));
  if(shouldOpen && !mkAdvOpen) setMkAdvanced(true);
};

renderExplainCard();
  renderFields();

  const typeSel = qs("#mkType");
  if(typeSel) typeSel.onchange = ()=>{ renderExplainCard(); renderFields(); };

  // Save marker
  const bSave = qs("#btnSaveMarker");
  if(bSave) bSave.onclick = ()=>{
    const d = getDraftFromUI();

    // minimal validation
    if(d.type !== "dsa" && !d.payload.value && !d.payload.extra){ toast("请填写数值/结果"); return; }

    state.markers.push({ id: uid("mk"), type: d.type, scope, date: d.date, payload: d.payload, note: d.note, createdAt: nowISO() });
    saveState();
    closeModal("modalSimple");
    renderAll();
  };
}


function deleteMarker(markerId){
  if(!confirm("确认删除该指标记录？")) return;
  state.markers = (state.markers||[]).filter(m=>m.id!==markerId);
  saveState();
  renderAll();
}

function openDialysisSessionModal(){
  // Ensure dialysis program is enabled for recording
  state.enabledPrograms.dialysis = true;
  if(!state.dialysis) state.dialysis = defaultState().dialysis;

  const mod = state.dialysis?.modality || "hd";
  const title = "记录透析";
  const subtitle = mod === "pd" ? "腹透：记录 UF/透析液/红旗" : "血透：记录透前/透后 + 超滤量";

  const baseNote = `<div class="note">内测版：以"结构化记录 + 复诊整理"为主。任何红旗（胸痛、气促、抽搐、腹透液混浊/腹痛/发热等）请优先联系透析团队/就医。</div>`;

  let body = "";
  if(mod === "hd"){
    body = `
      ${whyTip("hd_session")}
      ${baseNote}
      <div class="two">
        <label class="field"><span>透前体重 (kg)</span><input id="hdPreW" type="number" inputmode="decimal" placeholder="例如：70.2"></label>
        <label class="field"><span>透后体重 (kg)</span><input id="hdPostW" type="number" inputmode="decimal" placeholder="例如：68.4"></label>
      </div>
      <div class="two">
        <label class="field"><span>透前血压（收缩/舒张）</span><input id="hdPreBP" type="text" placeholder="例如：140/85"></label>
        <label class="field"><span>透后血压（收缩/舒张）</span><input id="hdPostBP" type="text" placeholder="例如：130/80"></label>
      </div>
      <label class="field"><span>超滤量 UF (ml，可选)</span><input id="hdUF" type="number" inputmode="numeric" placeholder="例如：2000"></label>
      <label class="field"><span>备注（可选）</span><input id="hdNote" type="text" placeholder="例如：透析中低血压/抽筋/通路不适"></label>
      <div class="note subtle">提示：透前/透后记录有助于评估干体重与间期体重增长；具体处理以透析中心医嘱为准。</div>
    `;
  } else {
    body = `
      ${whyTip("pd_session")}
      ${baseNote}
      <label class="field"><span>超滤量 UF (ml，可选)</span><input id="pdUF" type="number" inputmode="numeric" placeholder="例如：800"></label>
      <label class="field"><span>透析液外观</span>
        <select id="pdEffluent">
          <option value="清亮">清亮</option>
          <option value="稍浑浊">稍浑浊</option>
          <option value="明显浑浊">明显浑浊</option>
        </select>
      </label>
      <div class="two">
        <label class="field"><span>是否腹痛</span>
          <select id="pdPain">
            <option value="false">否</option>
            <option value="true">是</option>
          </select>
        </label>
        <label class="field"><span>是否发热</span>
          <select id="pdFever">
            <option value="false">否</option>
            <option value="true">是</option>
          </select>
        </label>
      </div>
      <label class="field"><span>备注（可选）</span><input id="pdNote" type="text" placeholder="例如：出口红肿/渗液/腹胀"></label>
      <div class="note subtle">提示：透析液混浊/腹痛/发热属于红旗，请优先联系透析团队或就医。</div>
    `;
  }

  openSimpleModal(title, subtitle, body,
    `<button class="primary" id="btnSaveDialysis">保存</button><button class="ghost" data-close="modalSimple">取消</button>`
  );

  qs("#btnSaveDialysis").onclick = ()=>{
    const dateTime = nowISO();
    const sess = { dateTime, modality: mod };

    if(mod === "hd"){
      const preW = qs("#hdPreW").value;
      const postW = qs("#hdPostW").value;
      const [preSys, preDia] = parseBPText(qs("#hdPreBP").value);
      const [postSys, postDia] = parseBPText(qs("#hdPostBP").value);
      sess.preWeightKg = preW;
      sess.postWeightKg = postW;
      sess.preSys = preSys;
      sess.preDia = preDia;
      sess.postSys = postSys;
      sess.postDia = postDia;
      sess.ufMl = qs("#hdUF").value;
      sess.note = qs("#hdNote").value.trim();
    } else {
      sess.ufMl = qs("#pdUF").value;
      sess.effluent = qs("#pdEffluent").value;
      sess.abdPain = qs("#pdPain").value === "true";
      sess.fever = qs("#pdFever").value === "true";
      sess.note = qs("#pdNote").value.trim();
    }

    if(!state.dialysis.sessions) state.dialysis.sessions = [];
    state.dialysis.sessions.push(sess);
    saveState();
    closeModal("modalSimple");
    renderAll();
  };
}

function parseBPText(s){
  // Accept formats: "140/85" or "140 85"; returns [sys, dia] as strings
  const t = String(s || "").trim();
  if(!t) return ["", ""];
  const m = t.match(/(\d{2,3})\s*[\/\s]\s*(\d{2,3})/);
  if(m) return [m[1], m[2]];
  return ["", ""];
}

function openQuickBP(){
  const body = `
    ${whyTip("bp")}
    <div class="two">
      <label class="field"><span>收缩压</span><input id="bpSys" type="number" inputmode="numeric" placeholder="例如：120"></label>
      <label class="field"><span>舒张压</span><input id="bpDia" type="number" inputmode="numeric" placeholder="例如：80"></label>
    </div>
    <label class="field"><span>场景（可选）</span><input id="bpCtx" type="text" placeholder="例如：早晨、服药前、运动后"></label>
    <div class="note subtle">${state.activeProgram==="peds" ? "儿童血压通常需要按年龄/性别/身高百分位解读；本内测版先做记录与整理。" : "不建议仅看单次数值；更推荐周均值与波动。"} </div>
  `;
  openSimpleModal("记录血压","将自动进入随访摘要", body,
    `<button class="primary" id="btnSaveBP">保存</button><button class="ghost" data-close="modalSimple">取消</button>`);
  qs("#btnSaveBP").onclick = ()=>{
    const sys = toNum(qs("#bpSys").value);
    const dia = toNum(qs("#bpDia").value);
    if(sys===null || dia===null){
      alert("请填写收缩压和舒张压");
      return;
    }
    state.vitals.bp.push({ dateTime: nowISO(), sys, dia, context: qs("#bpCtx").value.trim() });
    saveState();
    if(typeof trackEvent === "function") trackEvent("record_submit", {type:"bp"});
    closeModal("modalSimple");
    renderAll();
  };
}

function openQuickWeight(){
  const body = `
    ${whyTip("weight")}
    <label class="field"><span>体重（kg）</span><input id="wKg" type="number" inputmode="decimal" placeholder="例如：62.5"></label>
    <div class="note subtle">水肿/体液变化时，体重趋势很关键。</div>
  `;
  openSimpleModal("记录体重","将用于趋势与复诊摘要", body,
    `<button class="primary" id="btnSaveW">保存</button><button class="ghost" data-close="modalSimple">取消</button>`);
  qs("#btnSaveW").onclick = ()=>{
    const kg = toNum(qs("#wKg").value);
    if(kg===null){ alert("请填写体重"); return; }
    state.vitals.weight.push({ dateTime: nowISO(), kg });
    saveState();
    if(typeof trackEvent === "function") trackEvent("record_submit", {type:"weight"});
    closeModal("modalSimple");
    renderAll();
  };
}

function openQuickHeight(){
  const body = `
    ${whyTip("peds_growth")}
    <label class="field"><span>身高（cm）</span><input id="hCm" type="number" inputmode="decimal" placeholder="例如：128"></label>
    <div class="note subtle">儿肾随访建议至少每月记录一次身高（或按医嘱）。身高也用于儿科 eGFR 估算。</div>
  `;
  openSimpleModal("记录身高","儿肾项目核心数据之一", body,
    `<button class="primary" id="btnSaveH">保存</button><button class="ghost" data-close="modalSimple">取消</button>`);
  qs("#btnSaveH").onclick = ()=>{
    const cm = toNum(qs("#hCm").value);
    if(cm===null){ alert("请填写身高"); return; }
    state.vitals.height.push({ dateTime: nowISO(), cm });
    // also update profile default
    if(state.enabledPrograms.peds) state.peds.heightCm = String(cm);
    saveState();
    closeModal("modalSimple");
    renderAll();
  };
}

function openQuickGlucose(){
  const preferred = state.dm?.glucoseUnit || "mmolL";
  const body = `
    ${whyTip("glucose")}
    <label class="field"><span>血糖数值</span><input id="gVal" type="number" inputmode="decimal" placeholder="例如：6.1"></label>
    <label class="field"><span>单位</span>
      <select id="gUnit">
        <option value="mmolL">mmol/L</option>
        <option value="mgdl">mg/dL</option>
      </select>
    </label>
    <label class="field"><span>标签（可选）</span>
      <select id="gTag">
        <option value="">未选择</option>
        <option value="空腹">空腹</option>
        <option value="餐后2小时">餐后2小时</option>
        <option value="睡前">睡前</option>
        <option value="随机">随机</option>
      </select>
    </label>
    <div class="note subtle">仅用于随访记录与复诊沟通；不提供用药调整建议。目标与阈值以医生建议为准。</div>
  `;
  openSimpleModal("记录血糖","适用于糖尿病/移植激素相关血糖波动", body,
    `<button class="primary" id="btnSaveG">保存</button><button class="ghost" data-close="modalSimple">取消</button>`);
  const unitEl = qs("#gUnit");
  if(unitEl) unitEl.value = preferred;
  qs("#btnSaveG").onclick = ()=>{
    const v = toNum(qs("#gVal").value);
    if(v===null){ alert("请填写血糖"); return; }
    const unit = qs("#gUnit")?.value || preferred;
    state.vitals.glucose.push({ dateTime: nowISO(), value: v, unit, tag: qs("#gTag").value });
    // remember preferred unit (DM workspace preference)
    if(!state.dm) state.dm = defaultState().dm;
    state.dm.glucoseUnit = unit;
    saveState();
    closeModal("modalSimple");
    renderAll();
  };
}

function openQuickTemp(){
  const body = `
    ${whyTip("tx_temp")}
    <label class="field"><span>体温（℃）</span><input id="tVal" type="number" inputmode="decimal" placeholder="例如：36.8"></label>
    <div class="note subtle">移植/免疫抑制期出现发热请及时联系团队。</div>
  `;
  openSimpleModal("记录体温","用于感染风险随访", body,
    `<button class="primary" id="btnSaveT">保存</button><button class="ghost" data-close="modalSimple">取消</button>`);
  qs("#btnSaveT").onclick = ()=>{
    const v = toNum(qs("#tVal").value);
    if(v===null){ alert("请填写体温"); return; }
    state.vitals.temp.push({ dateTime: nowISO(), value: v });
    saveState();
    closeModal("modalSimple");
    renderAll();
  };
}

function openMedsCheckModal(programHint=null){
  // A lightweight adherence log (内测). Not a medication list or prescription.
  const defaultProg = programHint || state.activeProgram || "kidney";
  const showProgSelect = !programHint;
  const progOptions = ["kidney","htn","dm","dialysis","peds","stone"].filter(k=>PROGRAMS[k]);

  const body = `
    ${whyTip("tx_meds")}
    ${showProgSelect ? `
      <label class="field"><span>归属项目</span>
        <select id="medProg">
          ${progOptions.map(k=>`<option value="${k}" ${k===defaultProg?"selected":""}>${escapeHtml(programLabel(k))}</option>`).join("")}
        </select>
      </label>
    ` : ``}
    <label class="field"><span>结果</span>
      <select id="medStatus">
        <option value="taken">已按医嘱服用</option>
        <option value="partial">部分/不确定</option>
        <option value="missed">漏服/延迟</option>
      </select>
    </label>
    <label class="field"><span>药物/类别（可选）</span><input id="medCat" type="text" placeholder="例如：降压药 / 降糖药 / 免疫抑制剂"></label>
    <label class="field"><span>备注（可选）</span><input id="medNote" type="text" placeholder="例如：今早外出忘带药，已补服"></label>
    <div class="note subtle">本功能仅用于随访记录与复诊整理，不提供用药调整建议。</div>
  `;
  openSimpleModal("用药打卡","记录依从性", body,
    `<button class="primary" id="btnSaveMeds">保存</button><button class="ghost" data-close="modalSimple">取消</button>`);
  qs("#btnSaveMeds").onclick = ()=>{
    const prog = showProgSelect ? (qs("#medProg")?.value || defaultProg) : defaultProg;
    const status = qs("#medStatus")?.value || "taken";
    const category = (qs("#medCat")?.value || "").trim();
    const note = (qs("#medNote")?.value || "").trim();
    state.medsLog = state.medsLog || [];
    state.medsLog.push({ dateTime: nowISO(), program: prog, status, category, note });
    // Keep comorb flags in sync for HTN/DM
    if(prog==="htn") state.comorbid.htn = true;
    if(prog==="dm") state.comorbid.dm = true;
    saveState();
    closeModal("modalSimple");
    renderAll();
  };
}

function quickSymptoms(opts={}){
  const preset = opts.preset || [];
  const list = ["浮肿","乏力","尿量减少","尿色变红","发热","咳嗽","腹泻","呕吐","胸痛/心悸","呼吸困难","腰痛/绞痛"].sort();
  const body = `
    ${whyTip("symptoms")}
    <div class="note">选择你的症状（可多选）。红旗症状请优先就医/联系团队。</div>
    <div class="chips" id="symChips">
      ${list.map(s=>`<button type="button" class="chip ${preset.includes(s)?"active":""}" data-sym="${escapeHtml(s)}">${escapeHtml(s)}</button>`).join("")}
    </div>
    <label class="field"><span>备注（可选）</span><input id="symNote" type="text" placeholder="例如：从昨晚开始，伴随…"></label>
  `;
  openSimpleModal("记录症状","用于随访时间线与复诊沟通", body,
    `<button class="primary" id="btnSaveSym">保存</button><button class="ghost" data-close="modalSimple">取消</button>`);
  const selected = new Set(preset);
  qsa("#symChips button[data-sym]").forEach(btn=>{
    btn.onclick = ()=>{
      const s = btn.getAttribute("data-sym");
      if(selected.has(s)) selected.delete(s); else selected.add(s);
      btn.classList.toggle("active", selected.has(s));
    };
  });
  qs("#btnSaveSym").onclick = ()=>{
    state.symptoms.push({ dateTime: nowISO(), tags: [...selected], note: qs("#symNote").value.trim() });
    if(typeof trackEvent === "function") trackEvent("record_submit", {type:"symptom"});
    saveState();
    closeModal("modalSimple");
    renderAll();
  };
}


function openWaterCustomModal(){
  if(!state.enabledPrograms?.stone) return;
  openSimpleModal(
    "记录饮水",
    "输入本次饮水量（ml）。若医生要求限水，请以医嘱为准。",
    `${whyTip("water_stone")}<label class="field"><span>饮水量（ml）</span><input id="waterCustomMl" type="number" inputmode="numeric" placeholder="例如 200" /></label>`,
    `<button class="ghost" data-close="modalSimple">取消</button><button class="primary" id="btnSaveWaterCustom">保存</button>`
  );
  setTimeout(()=>{
    const b = qs("#btnSaveWaterCustom");
    if(!b) return;
    b.onclick = ()=>{
      const ml = toNum(qs("#waterCustomMl")?.value);
      if(ml === null || ml <= 0){ toast("请输入正确的饮水量"); return; }
      addWater(Math.round(ml));
      closeModal("modalSimple");
    };
  },0);
}

function openStoneEventModal(){
  if(!state.enabledPrograms?.stone) return;
  const now = new Date();
  const d0 = yyyyMMdd(now);
  const t0 = hhmm(now);
  openSimpleModal(
    "新增结石发作事件",
    "用于复诊沟通与随访记录（不用于诊断）。出现发热伴腰痛/寒战等红旗，请优先就医/联系团队。",
    `
      ${whyTip("stone_event")}
      <label class="field"><span>日期</span><input id="stoneEvtDate" type="date" value="${d0}" /></label>
      <label class="field"><span>时间</span><input id="stoneEvtTime" type="time" value="${t0}" /></label>

      <label class="field"><span>疼痛程度（0–10）</span>
        <select id="stoneEvtPain">
          <option value="">未填</option>
          ${Array.from({length:11}).map((_,i)=>`<option value="${i}">${i}</option>`).join("")}
        </select>
      </label>

      <div class="section" style="margin:12px 0 0;">
        <div class="section-title">症状（可多选）</div>
        <label class="check"><input type="checkbox" id="stoneEvtHem" /> 血尿</label>
        <label class="check"><input type="checkbox" id="stoneEvtFever" /> 发热</label>
        <label class="check"><input type="checkbox" id="stoneEvtChills" /> 寒战</label>
        <label class="check"><input type="checkbox" id="stoneEvtNausea" /> 恶心/呕吐</label>
      </div>

      <div class="section" style="margin:12px 0 0;">
        <div class="section-title">处置（可选）</div>
        <label class="check"><input type="checkbox" id="stoneEvtER" /> 已就医/急诊</label>
        <label class="field"><span>影像检查（可选）</span>
          <select id="stoneEvtImg">
            <option value="">未填</option>
            <option value="超声">超声</option>
            <option value="CT">CT</option>
            <option value="KUB">KUB</option>
            <option value="其他">其他</option>
          </select>
        </label>
      </div>

      <label class="field"><span>备注</span><input id="stoneEvtNote" type="text" placeholder="例如：疼痛持续2小时，服药后缓解…" /></label>
    `,
    `<button class="ghost" data-close="modalSimple">取消</button><button class="primary" id="btnSaveStoneEvt">保存</button>`
  );

  setTimeout(()=>{
    const b = qs("#btnSaveStoneEvt");
    if(!b) return;
    b.onclick = ()=>{
      const d = qs("#stoneEvtDate")?.value || d0;
      const t = qs("#stoneEvtTime")?.value || "00:00";
      const pain = qs("#stoneEvtPain")?.value || "";
      const hem = !!qs("#stoneEvtHem")?.checked;
      const fever = !!qs("#stoneEvtFever")?.checked;
      const chills = !!qs("#stoneEvtChills")?.checked;
      const nausea = !!qs("#stoneEvtNausea")?.checked;
      const er = !!qs("#stoneEvtER")?.checked;
      const imaging = qs("#stoneEvtImg")?.value || "";
      const note = qs("#stoneEvtNote")?.value?.trim() || "";

      const evt = {
        dateTime: `${d} ${t}`,
        pain: pain ? String(pain) : "",
        hematuria: hem,
        fever,
        chills,
        nausea,
        er,
        imaging,
        note
      };
      if(!state.stone.events) state.stone.events = [];
      state.stone.events.push(evt);
      saveState();
      renderAll();
      closeModal("modalSimple");
      // safety nudge
      if(fever && (chills || hem)){
        toast("提示：发热/寒战等属于红旗，请优先就医或联系随访团队。");
      }
    };
  },0);
}

function addWater(ml){
  if(!state.enabledPrograms.stone) return;
  const today = yyyyMMdd(new Date());
  if(!state.stone.intakeLog) state.stone.intakeLog = {};
  const cur = toNum(state.stone.intakeLog[today]) || 0;
  state.stone.intakeLog[today] = String(cur + ml);
  saveState();
  renderAll();
}

