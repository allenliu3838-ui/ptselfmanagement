/* ui.js - UI event binding (bindUI) */
function bindUI(){
  // Global delegation for "为什么要做" buttons (works for dynamic task list too)
  document.addEventListener("click", (e)=>{
    const btn = e.target?.closest?.("[data-exp]");
    if(!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const id = btn.getAttribute("data-exp") || "";
    openExplainPage(id);
  });

  // tabs
  qsa(".tab").forEach(btn=>{
    btn.addEventListener("click", ()=>navigate(btn.getAttribute("data-nav")));
  });

  // overlay pages: follow-up meaning guide + per-item explanation
  const gh = qs("#btnGuideHome");
  if(gh) gh.addEventListener("click", (e)=>{ e.preventDefault(); openGuidePage(); });
  const gm = qs("#btnGuideOpen");
  if(gm) gm.addEventListener("click", ()=>openGuidePage());
  const eb = qs("#btnExpBack");
  if(eb) eb.addEventListener("click", ()=>overlayBack());
  const gb = qs("#btnGuideBack");
  if(gb) gb.addEventListener("click", ()=>overlayBack());

  // Usage guide page
  const uo = qs("#btnUsageOpen");
  if(uo) uo.addEventListener("click", ()=>openUsagePage());
  const ub = qs("#btnUsageBack");
  if(ub) ub.addEventListener("click", ()=>overlayBack());

  // Home: collapse/expand optional cards
  const hm = qs("#btnHomeMoreToggle");
  if(hm) hm.addEventListener("click", ()=>toggleHomeMore());

  // top buttons
  qs("#btnProgram").addEventListener("click", ()=>{
    renderProgramList();
    showModal("modalProgram");
  });
  qs("#btnProfile").addEventListener("click", ()=>openProfile());

  // modal close
  qsa("[data-close]").forEach(btn=>{
    btn.addEventListener("click", ()=>closeModal(btn.getAttribute("data-close")));
  });

  // profile save
  qs("#btnSaveProfile").addEventListener("click", ()=>saveProfileFromModal());

  // records
  qs("#btnAddLab").addEventListener("click", ()=>openAddLab());
  qs("#btnAddUrine").addEventListener("click", ()=>openAddUrine());

  // document vault + advanced markers
  const bUp = qs("#btnUploadDoc");
  if(bUp) bUp.addEventListener("click", ()=>openDocUploadModal());
  const bVault = qs("#btnViewAllDocs");
  if(bVault) bVault.addEventListener("click", ()=>navigate("docs"));

  // Docs page
  const bDocsUp = qs("#btnDocsUpload");
  if(bDocsUp) bDocsUp.addEventListener("click", ()=>openDocUploadModal());
  const bDocsVP = qs("#btnDocsVisitPack");
  if(bDocsVP) bDocsVP.addEventListener("click", ()=>{
    navigate("docs");
    setTimeout(()=>{ const el = qs("#visitPackPreview"); if(el) el.scrollIntoView({behavior:"smooth", block:"start"}); }, 80);
  });

  const docProgSel = qs("#docsProgFilter");
  if(docProgSel) docProgSel.onchange = ()=>{ docsUI.prog = docProgSel.value || "active"; renderDocsPage(); };
  const docCatSel = qs("#docsCatFilter");
  if(docCatSel) docCatSel.onchange = ()=>{ docsUI.cat = docCatSel.value || "all"; renderDocsPage(); };
  const docSearch = qs("#docsSearch");
  if(docSearch) docSearch.oninput = ()=>{ docsUI.query = docSearch.value || ""; renderDocsPage(); };

  const bCopyPack = qs("#btnDocsCopyPack");
  if(bCopyPack) bCopyPack.onclick = async ()=>{
    const text = buildVisitPackText(90);
    const prev = qs("#visitPackPreview"); if(prev) prev.textContent = text;
    try{ await navigator.clipboard.writeText(text); toast("已复制复诊包，可直接粘贴给医生/随访护士"); }
    catch(e){ prompt("复制下面内容：", text); }
  };
  const bDownPack = qs("#btnDocsDownloadPack");
  if(bDownPack) bDownPack.onclick = ()=>{
    const text = buildVisitPackText(90);
    const prev = qs("#visitPackPreview"); if(prev) prev.textContent = text;
    downloadTextFile(`kidney-visit-pack-${yyyyMMdd(new Date())}.txt`, text);
  };
  const bDownJSON = qs("#btnDocsDownloadJSON");
  if(bDownJSON) bDownJSON.onclick = ()=>{
    const payload = buildVisitPackJSON(90);
    downloadTextFile(`kidney-visit-pack-${yyyyMMdd(new Date())}.json`, JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
    toast("已导出复诊包 JSON（不含文件本体）");
  };

  // Internal settings
  const tAI = qs("#toggleShowAI");
  if(tAI) tAI.addEventListener("change", ()=>{
    state.ui = state.ui || {};
    state.ui.showAI = !!tAI.checked;
    saveState();
    renderAll();
    renderTabbar();
  });
  const tHome = qs("#toggleHomeMoreDefault");
  if(tHome) tHome.addEventListener("change", ()=>{
    state.ui = state.ui || {};
    state.ui.homeMoreDefault = !!tHome.checked;
    saveState();
    renderAll();
  });

  // Feedback helpers
  const bFb = qs("#btnCopyFeedback");
  if(bFb) bFb.onclick = async ()=>{
    const text = buildFeedbackText(false);
    const prev = qs("#feedbackPreview"); if(prev) prev.textContent = text;
    try{ await navigator.clipboard.writeText(text); toast("已复制反馈信息，可粘贴到内测群"); }
    catch(e){ prompt("复制下面内容：", text); }
  };
  const bFb2 = qs("#btnCopyFeedbackWithSummary");
  if(bFb2) bFb2.onclick = async ()=>{
    const text = buildFeedbackText(true);
    const prev = qs("#feedbackPreview"); if(prev) prev.textContent = text;
    try{ await navigator.clipboard.writeText(text); toast("已复制反馈+摘要，可直接发给产品/医生团队"); }
    catch(e){ prompt("复制下面内容：", text); }
  };

  // Data backup (metadata only; files stay in IndexedDB)
  const bExportData = qs("#btnExportData");
  if(bExportData) bExportData.onclick = ()=>{
    const payload = buildFullBackupJSON();
    downloadTextFile(`kidney-care-backup-${yyyyMMdd(new Date())}.json`, JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
    toast("已导出本机数据 JSON（不含文件本体）");
  };

  const fileImport = qs("#fileImportData");
  if(fileImport) fileImport.onchange = async ()=>{
    const f = fileImport.files && fileImport.files[0];
    if(!f) return;
    try{
      const text = await f.text();
      importBackupFromJSONText(text);
      toast("已导入数据，页面将刷新");
      setTimeout(()=>location.reload(), 600);
    }catch(e){
      console.error(e);
      toast("导入失败：请确认文件格式正确");
    }finally{
      try{ fileImport.value = ""; }catch(_e){}
    }
  };

  const bWipe = qs("#btnWipeData");
  if(bWipe) bWipe.onclick = async ()=>{
    const ok = confirm("确定清空所有数据？（本机 localStorage + IndexedDB 文件）");
    if(!ok) return;
    await wipeAllLocalData();
    toast("已清空，将刷新");
    setTimeout(()=>location.reload(), 600);
  };
  const bMk = qs("#btnAddMarker");
  if(bMk) bMk.addEventListener("click", ()=>openAddMarkerModal());

  qs("#btnQuickBP").addEventListener("click", ()=>openQuickBP());
  qs("#btnQuickWeight").addEventListener("click", ()=>openQuickWeight());
  qs("#btnQuickHeight").addEventListener("click", ()=>openQuickHeight());
  qs("#btnQuickGlucose").addEventListener("click", ()=>openQuickGlucose());
  qs("#btnQuickTemp").addEventListener("click", ()=>openQuickTemp());
  qs("#btnQuickSymptoms").addEventListener("click", ()=>quickSymptoms());

  // followup quick
  qs("#btnPlanRecordBP").addEventListener("click", ()=>openQuickBP());
  qs("#btnPlanRecordWeight").addEventListener("click", ()=>openQuickWeight());
  const btnPlanGlucose = qs("#btnPlanRecordGlucose");
  if(btnPlanGlucose) btnPlanGlucose.addEventListener("click", ()=>openQuickGlucose());
  qs("#btnPlanRecordUrine").addEventListener("click", ()=>openAddUrine());
  qs("#btnPlanRecordWater").addEventListener("click", ()=>{ state.activeProgram="stone"; saveState(); renderAll(); openProgramMainModal(); });
  const btnPlanDialysis = qs("#btnPlanRecordDialysis");
  if(btnPlanDialysis) btnPlanDialysis.addEventListener("click", ()=>{
    state.activeProgram = "dialysis";
    state.enabledPrograms.dialysis = true;
    saveState();
    renderAll();
    openDialysisSessionModal();
  });

  const btnAddDialysis = qs("#btnAddDialysis");
  if(btnAddDialysis) btnAddDialysis.addEventListener("click", ()=>openDialysisSessionModal());
  // Records page: dialysis
  const btnAddDialysisRecord = qs("#btnAddDialysisRecord");
  if(btnAddDialysisRecord) btnAddDialysisRecord.addEventListener("click", ()=>{
    state.activeProgram = "dialysis";
    state.enabledPrograms.dialysis = true;
    saveState();
    renderAll();
    openDialysisSessionModal();
  });

  // Records page: stone water
  const btnWater250 = qs("#btnWater250");
  const btnWaterCustom = qs("#btnWaterCustom");
  if(btnWater250) btnWater250.addEventListener("click", ()=>{
    state.activeProgram = "stone";
    state.enabledPrograms.stone = true;
    saveState();
    addWater(250);
  });
  if(btnWaterCustom) btnWaterCustom.addEventListener("click", ()=>{
    state.activeProgram = "stone";
    state.enabledPrograms.stone = true;
    saveState();
    openWaterCustomModal();
  });

  // Records page: stone events
  const btnAddStoneEvent = qs("#btnAddStoneEvent");
  if(btnAddStoneEvent) btnAddStoneEvent.addEventListener("click", ()=>{
    state.activeProgram = "stone";
    state.enabledPrograms.stone = true;
    saveState();
    openStoneEventModal();
  });

  // Records page: pediatric growth shortcuts
  const btnPedsH = qs("#btnPedsRecordHeight");
  const btnPedsW = qs("#btnPedsRecordWeight");
  if(btnPedsH) btnPedsH.addEventListener("click", ()=>{
    state.activeProgram = "peds";
    state.enabledPrograms.peds = true;
    saveState();
    renderAll();
    openQuickHeight();
  });
  if(btnPedsW) btnPedsW.addEventListener("click", ()=>{
    state.activeProgram = "peds";
    state.enabledPrograms.peds = true;
    saveState();
    renderAll();
    openQuickWeight();
  });



  // reset
  qs("#btnReset").addEventListener("click", ()=>{
    if(confirm("确认重置本地数据？（只影响当前手机/浏览器）")){
      localStorage.removeItem(STORAGE_KEY);
      state = defaultState();
      saveState();
      renderAll();
      navigate("home");
    }
  });

  // export
  qs("#btnExport2").addEventListener("click", ()=>copyExport());

  // doctor search placeholder
  const btnFind = qs("#btnFindDoctor");
  if(btnFind) btnFind.addEventListener("click", ()=>openDoctorFinderModal());


  // AI quick actions
  const bExplain = qs("#aiBtnExplain");
  const bQ = qs("#aiBtnQuestions");
  const bMsg = qs("#aiBtnMessage");
  const bTri = qs("#aiBtnTriage");
  if(bExplain) bExplain.addEventListener("click", ()=>aiQuickExplain());
  if(bQ) bQ.addEventListener("click", ()=>aiQuickQuestions());
  if(bMsg) bMsg.addEventListener("click", ()=>aiQuickMessage());
  if(bTri) bTri.addEventListener("click", ()=>aiQuickTriage());

  // AI send
  qs("#chatSend").addEventListener("click", ()=>sendChat());
  qs("#chatInput").addEventListener("keydown", (e)=>{
    if(e.key==="Enter") sendChat();
  });

  qs("#btnAIHelp").addEventListener("click", ()=>{
    openSimpleModal("AI 使用边界","内测版提醒", `
      <div class="list-item"><div class="t">能做</div><div class="s">解释化验趋势、整理复诊问题、把记录汇总成摘要、提醒红旗分诊。</div></div>
      <div class="list-item"><div class="t">不能做</div><div class="s">诊断疾病、开具处方、替代主诊医生决策。</div></div>
      <div class="list-item"><div class="t">红旗优先</div><div class="s">胸痛/呼吸困难/意识改变/抽搐/少尿无尿/发热伴剧烈腰痛等，请立即就医或联系团队。</div></div>
    `, `<button class="ghost" data-close="modalSimple">关闭</button>`);
  });

  // config placeholder
  qs("#btnConfig").addEventListener("click", ()=>{
    openSimpleModal("计划配置（内测）","下一步：接医生端可配置规则", `
      <div class="note">当前版本的任务与提醒由本地规则生成。正式版建议：所有阈值/频率/文案由中心配置下发（避免写死）。</div>
    `, `<button class="ghost" data-close="modalSimple">关闭</button>`);
  });

  // me export preview init
  qs("#btnExport").addEventListener("click", ()=>copyExport());

  // PWA update banner actions
  const btnDismiss = qs("#btnDismissUpdate");
  const btnUpdate = qs("#btnUpdateNow");
  if(btnDismiss) btnDismiss.addEventListener("click", ()=>hideUpdateBanner());
  if(btnUpdate) btnUpdate.addEventListener("click", ()=>{
    try{
      if(_waitingWorker) _waitingWorker.postMessage({type:"SKIP_WAITING"});
    }catch(_e){/* ignore */}
    hideUpdateBanner();
  });
}
