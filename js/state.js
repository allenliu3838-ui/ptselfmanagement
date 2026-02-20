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
      // 糖尿病随访：血糖记录频率/单位
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
    labs: [],
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

/* Generate realistic demo data for a sample IgA nephropathy patient (age 42).
   Covers 3 weeks of vitals, 2 lab entries, 1 urine test, symptoms, meds log. */
function seedDemoData(){
  const s = defaultState();
  s.engagement.onboarded = true;
  s.engagement.streak = 5;
  s.engagement.longestStreak = 12;

  // Profile: IgA nephropathy patient with hypertension comorbidity
  s.activeProgram = "kidney";
  s.enabledPrograms = { kidney:true, htn:true, dm:false, dialysis:false, stone:false, peds:false };
  s.comorbid = { htn:true, dm:false, masld:false, hf:false, aki:false };
  s.kidney = { track:"glomerular", glomerularSubtype:"iga", dxCertainty:"biopsy", txStage:"stable" };
  s.htn = { bpFreq:"daily1", targetSys:"130", targetDia:"80" };
  s.ui.showAI = true;
  s.ui.homeMoreDefault = true;

  // Helper: date N days ago
  const daysAgo = (n)=>{
    const d = new Date(); d.setDate(d.getDate()-n);
    return yyyyMMdd(d);
  };
  const isoAgo = (n, h=8, m=0)=>{
    const d = new Date(); d.setDate(d.getDate()-n);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };

  // Labs: 2 entries (6 weeks ago + 3 days ago)
  s.labs = [
    { date:daysAgo(42), scrUnit:"umolL", scr:"128", egfr:"58", k:"4.8", na:"139", ca:"2.25", mg:"0.82", p:"1.35", glu:"5.6", hba1c:"", flags:{} },
    { date:daysAgo(3), scrUnit:"umolL", scr:"122", egfr:"61", k:"4.5", na:"141", ca:"2.30", mg:"0.85", p:"1.28", glu:"5.3", hba1c:"", flags:{} },
  ];

  // Urine tests
  s.urineTests = [
    { date:daysAgo(42), protein:"2+", blood:"1+", note:"晨尿" },
    { date:daysAgo(3), protein:"1+", blood:"±", note:"晨尿，运动后" },
  ];

  // Blood pressure: 18 readings over 3 weeks
  const bpData = [
    {d:21,sys:142,dia:92,ctx:"晨起"}, {d:20,sys:138,dia:88,ctx:"晚间"},
    {d:19,sys:140,dia:90,ctx:"晨起"}, {d:18,sys:136,dia:86,ctx:"晨起"},
    {d:17,sys:134,dia:85,ctx:"晚间"}, {d:16,sys:138,dia:88,ctx:"晨起"},
    {d:14,sys:135,dia:84,ctx:"晨起"}, {d:13,sys:132,dia:82,ctx:"晚间"},
    {d:12,sys:136,dia:86,ctx:"晨起"}, {d:10,sys:130,dia:80,ctx:"晨起"},
    {d:9,sys:134,dia:84,ctx:"服药前"}, {d:7,sys:128,dia:78,ctx:"晨起"},
    {d:6,sys:132,dia:82,ctx:"晚间"}, {d:5,sys:130,dia:80,ctx:"晨起"},
    {d:4,sys:126,dia:78,ctx:"晨起"}, {d:3,sys:128,dia:80,ctx:"晚间"},
    {d:2,sys:124,dia:76,ctx:"晨起"}, {d:1,sys:130,dia:82,ctx:"晨起"},
  ];
  s.vitals.bp = bpData.map(x=>({ dateTime:isoAgo(x.d, 7, 30), sys:x.sys, dia:x.dia, context:x.ctx }));

  // Weight: 10 readings
  const wtData = [
    {d:21,kg:72.5}, {d:18,kg:72.8}, {d:14,kg:72.2}, {d:11,kg:72.0},
    {d:8,kg:71.8}, {d:6,kg:72.1}, {d:4,kg:71.5}, {d:3,kg:71.6},
    {d:2,kg:71.3}, {d:1,kg:71.4},
  ];
  s.vitals.weight = wtData.map(x=>({ dateTime:isoAgo(x.d, 7, 0), kg:x.kg }));

  // Temperature: a few readings
  s.vitals.temp = [
    { dateTime:isoAgo(14, 8, 0), value:36.5 },
    { dateTime:isoAgo(7, 8, 0), value:36.7 },
    { dateTime:isoAgo(1, 8, 0), value:36.4 },
  ];

  // Symptoms
  s.symptoms = [
    { dateTime:isoAgo(15), tags:["浮肿","乏力"], note:"晨起眼睑稍肿，下午踝部也有" },
    { dateTime:isoAgo(5), tags:["乏力"], note:"近几天容易累，可能和睡眠不好有关" },
  ];

  // Meds log
  s.medsLog = [
    { dateTime:isoAgo(3, 8, 0), program:"kidney", status:"taken", category:"RAAS阻断剂", note:"" },
    { dateTime:isoAgo(2, 8, 0), program:"kidney", status:"taken", category:"RAAS阻断剂", note:"" },
    { dateTime:isoAgo(1, 8, 0), program:"kidney", status:"taken", category:"RAAS阻断剂", note:"" },
    { dateTime:isoAgo(3, 8, 0), program:"htn", status:"taken", category:"降压药", note:"" },
    { dateTime:isoAgo(2, 8, 0), program:"htn", status:"taken", category:"降压药", note:"" },
    { dateTime:isoAgo(1, 8, 15), program:"htn", status:"partial", category:"降压药", note:"今早迟服了1小时" },
  ];

  // Task history: some days marked done
  s.tasksDone = {};
  for(let i = 1; i <= 5; i++){
    const key = daysAgo(i);
    s.tasksDone[key] = { kidney_bp:true, kidney_weight:true };
  }
  s.engagement.lastActiveDate = daysAgo(0);

  // Chat: one demo exchange
  s.chat = [
    { role:"ai", text:"你好，我是随访助手。我可以帮你：看懂化验趋势、整理复诊问题、把记录汇总成一页摘要。注意：我不提供诊断或处方，红旗症状请立即就医或联系团队。" },
    { role:"me", text:"帮我看看最近的化验趋势" },
    { role:"ai", text:"好的，根据你最近两次化验（6周前 vs 3天前）：\n\n• 肌酐：128 → 122 μmol/L（略有改善）\n• eGFR：58 → 61（稳定偏好）\n• 血钾：4.8 → 4.5（从偏高回到正常范围）\n• 尿蛋白：2+ → 1+（有改善趋势）\n\n总体趋势向好。血压近3周也有下降趋势（从142/92降到130/82左右）。建议复诊时和医生讨论：蛋白尿改善是否稳定、是否需要调整RAAS药物剂量。\n\n提醒：以上仅为趋势整理，不是诊断。" },
  ];

  return s;
}
