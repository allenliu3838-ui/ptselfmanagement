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

function completeOnboarding(){
  if(!state.engagement) state.engagement = { onboarded:false, streak:0, lastActiveDate:"", longestStreak:0 };
  state.engagement.onboarded = true;
  saveState();
  navigate("home");
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

  // Onboarding buttons
  const btnStart = qs("#btnOnboardStart");
  const btnSkip = qs("#btnOnboardSkip");
  if(btnStart) btnStart.addEventListener("click", ()=>{
    completeOnboarding();
    openProfile();
  });
  if(btnSkip) btnSkip.addEventListener("click", ()=>{
    completeOnboarding();
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
