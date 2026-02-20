/* app.js - App initialization and service worker registration */

// Service worker
async function registerSW(){
  if(!("serviceWorker" in navigator)) return;
  try{
    const reg = await navigator.serviceWorker.register("./sw.js");
    _swReg = reg;

    // 1) Prompt if a worker is already waiting (common when Chrome is "stuck" on old version)
    if(reg.waiting && navigator.serviceWorker.controller){
      showUpdateBanner(reg.waiting);
    }

    // 2) Listen for updates
    reg.addEventListener("updatefound", ()=>{
      const nw = reg.installing;
      if(!nw) return;
      nw.addEventListener("statechange", ()=>{
        if(nw.state === "installed"){
          // If we already have a controller, this is an update.
          if(navigator.serviceWorker.controller){
            showUpdateBanner(nw);
          }
        }
      });
    });

    // 3) Auto-reload once the new SW takes control (after user clicks "立即更新")
    let reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", ()=>{
      if(reloading) return;
      reloading = true;
      window.location.reload();
    });

    // 4) Force an update check at key moments (helps when index/sw is cached)
    try{ await reg.update(); }catch(_e){/* ignore */}
    document.addEventListener("visibilitychange", ()=>{
      if(document.visibilityState === "visible") reg.update().catch(()=>{});
    });
  }catch(e){
    console.warn("SW register failed", e);
  }
}

function completeOnboarding(prog){
  if(!state.engagement) state.engagement = { onboarded:false, streak:0, lastActiveDate:"", longestStreak:0 };
  state.engagement.onboarded = true;
  if(prog && PROGRAMS[prog]){
    state.activeProgram = prog;
    state.enabledPrograms[prog] = true;
  }
  saveState();
}

function init(){
  // Ensure at least one program + active program is enabled
  ensureActiveProgramEnabled();
  // ensure stone enabled boolean coherent
  state.enabledPrograms.stone = !!state.enabledPrograms.stone;
  state.enabledPrograms.peds = !!state.enabledPrograms.peds;
  state.enabledPrograms.dialysis = !!state.enabledPrograms.dialysis;

  registerSW();
  bindUI();

  // ===== 3-step onboarding wizard =====
  let obProg = "kidney"; // default selection

  // Step 1: Welcome
  const btnOb1Next = qs("#btnOb1Next");
  const btnOb1Demo = qs("#btnOb1Demo");
  if(btnOb1Next) btnOb1Next.addEventListener("click", ()=>{
    qs("#obStep1").classList.add("hidden");
    qs("#obStep2").classList.remove("hidden");
  });
  if(btnOb1Demo) btnOb1Demo.addEventListener("click", ()=>{
    state = seedDemoData();
    saveState();
    renderAll();
    navigate("home");
    toast("已加载示例数据，可以体验完整功能");
  });

  // Step 2: Choose program
  qsa(".ob-prog-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      qsa(".ob-prog-btn").forEach(b=>b.classList.remove("selected"));
      btn.classList.add("selected");
      obProg = btn.getAttribute("data-ob-prog") || "kidney";
      // Auto advance after a brief delay
      setTimeout(()=>{
        qs("#obStep2").classList.add("hidden");
        qs("#obStep3").classList.remove("hidden");
      }, 300);
    });
  });

  // Step 3: First record or skip
  const btnOb3Record = qs("#btnOb3Record");
  const btnOb3Skip = qs("#btnOb3Skip");
  if(btnOb3Record) btnOb3Record.addEventListener("click", ()=>{
    completeOnboarding(obProg);
    renderAll();
    navigate("home");
    setTimeout(()=>openQuickBP(), 200);
  });
  if(btnOb3Skip) btnOb3Skip.addEventListener("click", ()=>{
    completeOnboarding(obProg);
    renderAll();
    navigate("home");
  });

  renderProgramList();
  renderAll();

  // Show onboarding on first launch, otherwise go home
  if(!state.engagement?.onboarded){
    navigate("onboard");
  } else {
    navigate("home");
  }
}

init();
