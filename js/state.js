/* state.js - State management, persistence, and PWA update banner */

// Diet library UI state (not persisted fully; only remember last filter/query)
let dietUI = { view:"list", filter:"all", query:"", selected:null, guide:null };
// Docs vault UI (page)
let docsUI = { prog:"active", cat:"all", query:"" };

function defaultState(){
  const today = yyyyMMdd(new Date());
  return {
    version: VERSION,
    activeProgram: "kidney",
    enabledPrograms: { kidney: true, stone: false, peds: false, dialysis: false, htn: false, dm: false },
    ui: { overlayReturn: 'home', explainerId: '', showAI: true, homeMoreDefault: false },
    engagement: { onboarded: false, streak: 0, lastActiveDate: "", longestStreak: 0 },
    comorbid: { htn:false, dm:false, masld:false, hf:false, aki:false },
    diet: { favorites: [], lastFilter: "", lastQuery: "" },
    kidney: {
      track: "unknown",
      glomerularSubtype: "unknown",
      dxCertainty: "unknown",
      txStage: "stable",
    },
    htn: {
      // 家庭血压随访：频率与目标仅作提醒（不替代医生）
      bpFreq: "daily1", // daily1 | daily2
      targetSys: "",
      targetDia: "",
    },
    dm: {
      // 糖尿病随访：血糖记录频率/单位（示意）
      glucoseFreq: "daily1", // daily1 | daily2
      glucoseUnit: "mmolL", // mmolL | mgdl
      dmType: "unknown",     // unknown | t1 | t2 | gdm | other
      therapy: "unknown",    // unknown | lifestyle | oral | insulin | mixed
      a1cTarget: "",         // % (optional)
    },
    peds: {
      childName: "",
      dob: "",
      sex: "unknown",
      heightCm: "",
      weightKg: "",
      guardianName: "",
      dx: "unknown",
    },
    stone: {
      enabled: false,
      fluidRestricted: "unknown", // "true"|"false"|"unknown"
      targetMl: "",
      intakeLog: {}, // yyyy-mm-dd -> ml
      events: [],
    },
    dialysis: {
      enabled: false,
      modality: "hd", // "hd"|"pd"
      hdDays: [1,3,5], // JS getDay(): 0=Sun ... 6=Sat
      accessType: "fistula", // fistula|graft|cvc|pdcatheter|unknown
      dryWeightKg: "",
      fluidRestricted: "unknown", // "true"|"false"|"unknown"
      fluidLimitMl: "",
      pdExchangesPerDay: "",
      sessions: [],
    },
    labs: [
      { date: today, scr: "", scrUnit:"umolL", egfr:"", k:"", na:"", ca:"", mg:"", p:"", glu:"", hba1c:"", flags: {} }
    ],
    urineTests: [],
    vitals: {
      bp: [],
      weight: [],
      height: [],
      glucose: [],
      temp: []
    },
    // Medication check-in (optional): simple adherence log for any program (HTN/DM/移植等)
    medsLog: [],
    symptoms: [],
    tasksDone: {},
    // Advanced markers (structured) + Document Vault (files)
    // - markers: dd-cfDNA, DSA, anti-PLA2R, anti-nephrin, dsDNA/C3/C4...
    // - documents: biopsy report/images, genetic report, imaging, discharge summary...
    markers: [],
    documents: [],
    chat: [
      { role:"ai", text:"你好，我是随访助手（内测版）。我可以帮你：看懂化验趋势、整理复诊问题、把记录汇总成一页摘要。注意：我不提供诊断或处方，红旗症状请立即就医或联系团队。" }
    ],
  };
}

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return defaultState();
    const st = JSON.parse(raw);
    // minimal migration
    if(!st.version) st.version = VERSION;
    if(!st.enabledPrograms) st.enabledPrograms = {kidney:true, stone:false, peds:false, dialysis:false, htn:false, dm:false};
    if(st.enabledPrograms && typeof st.enabledPrograms.kidney === "undefined") st.enabledPrograms.kidney = true;
    if(st.enabledPrograms && typeof st.enabledPrograms.dialysis === "undefined") st.enabledPrograms.dialysis = false;
    if(st.enabledPrograms && typeof st.enabledPrograms.htn === "undefined") st.enabledPrograms.htn = false;
    if(st.enabledPrograms && typeof st.enabledPrograms.dm === "undefined") st.enabledPrograms.dm = false;
    if(!st.comorbid) st.comorbid = {htn:false, dm:false, masld:false, hf:false, aki:false};
    if(st.comorbid && typeof st.comorbid.masld === "undefined") st.comorbid.masld = false;
    if(!st.diet) st.diet = defaultState().diet;
    if(st.diet && !Array.isArray(st.diet.favorites)) st.diet.favorites = [];
    if(st.diet && typeof st.diet.lastFilter === "undefined") st.diet.lastFilter = "";
    if(st.diet && typeof st.diet.lastQuery === "undefined") st.diet.lastQuery = "";
    if(!st.ui) st.ui = defaultState().ui;
    if(st.ui && typeof st.ui.overlayReturn === 'undefined') st.ui.overlayReturn = 'home';
    if(st.ui && typeof st.ui.explainerId === 'undefined') st.ui.explainerId = '';
    if(st.ui && typeof st.ui.showAI === 'undefined') st.ui.showAI = true;
    if(st.ui && typeof st.ui.homeMoreDefault === 'undefined') st.ui.homeMoreDefault = false;
    if(!st.kidney) st.kidney = defaultState().kidney;
    if(!st.htn) st.htn = defaultState().htn;
    if(!st.dm) st.dm = defaultState().dm;
    if(!st.peds) st.peds = defaultState().peds;
    if(!st.stone) st.stone = defaultState().stone;
    if(st.stone && !st.stone.events) st.stone.events = [];
    if(!st.dialysis) st.dialysis = defaultState().dialysis;
    if(!Array.isArray(st.medsLog)) st.medsLog = [];
    if(!st.tasksDone) st.tasksDone = {};
    if(!st.markers) st.markers = [];
    if(!st.documents) st.documents = [];
    if(!st.chat) st.chat = defaultState().chat;

    // Engagement migration: add engagement tracking for existing users
    if(!st.engagement) st.engagement = { onboarded: true, streak: 0, lastActiveDate: "", longestStreak: 0 };
    if(typeof st.engagement.longestStreak === "undefined") st.engagement.longestStreak = 0;

    // Glucose unit migration: old records have no unit -> assume mmol/L
    if(st.vitals && Array.isArray(st.vitals.glucose)){
      st.vitals.glucose = st.vitals.glucose.map(g=>{
        if(!g) return g;
        if(typeof g.unit === "undefined" || !g.unit) return { ...g, unit: "mmolL" };
        return g;
      });
    }

    return st;
  }catch(e){
    console.error(e);
    return defaultState();
  }
}

function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();

// PWA update UX
let _swReg = null;
let _waitingWorker = null;

function showUpdateBanner(worker){
  _waitingWorker = worker;
  const banner = qs("#updateBanner");
  if(banner) banner.classList.remove("hidden");
}

function hideUpdateBanner(){
  _waitingWorker = null;
  const banner = qs("#updateBanner");
  if(banner) banner.classList.add("hidden");
}
