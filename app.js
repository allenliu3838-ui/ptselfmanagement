/* Kidney Care PWA - Programized v7 (internal beta)
   - One app, multiple Programs: Kidney follow-up / Stone / Pediatric nephrology
   - Safety overlay: electrolyte & red-flag triage
   - Local-first: data stored in localStorage
*/
// Versioning note (Netlify + PWA):
// - Bump VERSION whenever you deploy to ensure SW cache separation and visible build identity.
const VERSION = "9.1.1";
const STORAGE_KEY = "kidneyCareStateV7";

const PROGRAMS = {
  kidney: { key: "kidney", name: "肾脏随访", subtitle: "肾功/尿蛋白/移植等随访整理（可联动慢病）" },
  htn:    { key: "htn",    name: "高血压随访", subtitle: "家庭血压/用药依从/风险信号（示意）" },
  dm:     { key: "dm",     name: "糖尿病随访", subtitle: "血糖/HbA1c/低血糖事件（示意）" },
  dialysis:{ key: "dialysis", name: "透析随访", subtitle: "血透/腹透：控水、电解质、通路/腹透红旗（示意）" },
  stone:  { key: "stone",  name: "肾结石管理", subtitle: "喝水/发作事件/影像复查提醒（示意）" },
  peds:   { key: "peds",   name: "儿肾随访", subtitle: "家长协作 + 生长 + 儿科血压/肾功能" },
};


// Workspace tab labels (reduce confusion: each program feels like its own "workspace")
const WORKSPACE_TABS = {
  kidney:  { records: "病历", followup: "随访" },
  htn:     { records: "血压", followup: "计划" },
  dm:      { records: "控糖", followup: "计划" },
  dialysis:{ records: "透析", followup: "计划" },
  stone:   { records: "结石", followup: "计划" },
  peds:    { records: "成长", followup: "随访" },
};

// Tab pages (overlay pages like 'explain'/'guide' should NOT reset tab highlight)
const TAB_KEYS = ["home","ai","records","docs","me"];
let currentTabKey = "home";

// Tab visibility (reduce confusion for first-time testers)
function showAITab(){
  try{
    if(state && state.ui && typeof state.ui.showAI !== "undefined") return !!state.ui.showAI;
  }catch(_e){}
  return true;
}


const COMORB = [
  { key: "htn", label: "高血压" },
  { key: "dm",  label: "糖尿病" },
  { key: "masld", label: "脂肪肝/MASLD（NASH/MASH）" },
  { key: "hf",  label: "心衰/心血管" },
  { key: "aki", label: "AKI/AKD康复" },
];

const DIET_TAGS = {
  lowNa: { key:"lowNa", label:"控盐/控钠" },
  lowK:  { key:"lowK",  label:"限钾" },
  lowP:  { key:"lowP",  label:"控磷" },
  lowSugar:{ key:"lowSugar", label:"控糖" },
  fluidLimit:{ key:"fluidLimit", label:"控水/限水" },
  caMbd: { key:"caMbd", label:"钙/骨矿物" },
  foodSafety:{ key:"foodSafety", label:"移植食品安全" },
  drugFood:{ key:"drugFood", label:"药食相互作用" },
};


// ====== Diet Food Library (v1) ======
// Goals:
// - High potassium / high phosphorus food library with search + per-item explanation
// - Keep the patient mental model: 指标异常 -> 本周重点 -> 点食物看解释与替代
// NOTE: 这是内测版教育内容占位；正式版建议由中心/营养师审核并可配置下发。

const DIET_LIBRARY_VERSION = "1.0";

const FOOD_TAG = {
  highK: { key:"highK", label:"高钾" },
  highP: { key:"highP", label:"高磷" },
  additiveP: { key:"additiveP", label:"磷添加剂/高度加工" },
  double: { key:"double", label:"钾+磷双高" },
  tip: { key:"tip", label:"避坑提示" },
  tx: { key:"tx", label:"移植食品安全" },
};

const FOOD_LEVEL = {
  high:   { key:"high",   label:"重点少吃", badge:"danger" },
  caution:{ key:"caution",label:"谨慎/看份量", badge:"info" },
  tip:    { key:"tip",    label:"避坑", badge:"info" },
  safer:  { key:"safer",  label:"相对更稳", badge:"ok" },
};

// Minimal, practical starter list (Top items). Expand iteratively based on real patient questions.
const FOOD_DB = [
  // --- 高钾避坑（特别重要） ---
  {
    id:"salt_substitute",
    name:"低钠盐/盐替代品",
    aliases:["低钠盐","代盐","盐替代","氯化钾","钾盐"],
    tags:["highK","tip"],
    level:"high",
    summary:"很多‘低钠盐’用氯化钾替代部分氯化钠，血钾偏高时要特别谨慎。",
    why:[
      "当血钾偏高时，额外摄入钾可能加重高钾风险。",
      "部分患者同时用影响血钾的药物时，更需要先问团队再换盐。"
    ],
    tips:[
      "先看配料表：是否含‘氯化钾/钾盐’。",
      "如果医生提示血钾偏高，不要自行继续使用代盐；尽快咨询随访团队。"
    ],
    alternatives:["普通食盐（控制总量）","用香辛料/醋/柠檬增味（减少盐用量）"],
    caution:"饮食建议仅作教育提示；如你在透析/移植随访，请以中心个体化方案为准。"
  },
  {
    id:"coconut_water",
    name:"椰子水/椰汁",
    aliases:["椰子水","椰汁"],
    tags:["highK"],
    level:"high",
    summary:"常被当作‘健康饮料’，但可能含较多钾。",
    why:["血钾偏高时，应优先避免或严格控制含钾饮料的摄入。"],
    tips:["选择白水/无糖茶更稳妥。"],
    alternatives:["白水","无糖茶"],
    caution:"不同品牌配方差异大；如果你在控钾，请先以‘不喝/少喝’作为默认策略。"
  },
  {
    id:"veg_juice",
    name:"果蔬汁/浓汤/火锅汤底",
    aliases:["果汁","蔬菜汁","浓汤","火锅汤","汤底"],
    tags:["highK","tip"],
    level:"high",
    summary:"把多种食材‘浓缩’进液体里，钾更容易累积。",
    why:["血钾偏高时，液体形式的‘浓缩钾’更容易超量。"],
    tips:["优先吃‘原型食物’，少喝汤。若必须饮用，先与团队确认份量。"],
    alternatives:["清淡主食+少量配菜","白水"],
    caution:"如果你同时有透析限水/心衰控水，请优先按限水医嘱。"
  },

  // --- 常见高钾水果 ---
  {
    id:"banana",
    name:"香蕉",
    aliases:["香蕉"],
    tags:["highK"],
    level:"high",
    summary:"常见高钾水果；血钾偏高时不建议随意加量。",
    why:["血钾偏高时，香蕉可能让控钾更困难。"],
    tips:["如医生允许，考虑小份量+降低频率；先把‘代盐/饮料’这些更隐蔽的钾源控制住。"],
    alternatives:["苹果","梨","葡萄（按量）","草莓等浆果（按量）"],
    caution:"不同患者的钾目标不同；透析/移植/CKD 分期不同，策略也不同。"
  },
  {
    id:"orange_juice",
    name:"橙子/橙汁",
    aliases:["橙子","橙汁","柑橘"],
    tags:["highK"],
    level:"high",
    summary:"整果与果汁都需要注意；果汁更容易喝多。",
    why:["果汁形式更容易一次摄入较多钾。"],
    tips:["优先吃整果而不是果汁；血钾偏高时建议先避免。"],
    alternatives:["白水","无糖茶","小份量低钾水果（按医嘱）"],
    caution:"如你同时控糖，果汁也不建议。"
  },
  {
    id:"kiwi",
    name:"猕猴桃",
    aliases:["猕猴桃"],
    tags:["highK"],
    level:"caution",
    summary:"部分高钾水果；血钾高时建议减少或先停。",
    why:["血钾偏高时应优先避免高钾水果。"],
    tips:["先看你最近的血钾趋势，再决定是否/多少。"],
    alternatives:["苹果","梨"],
    caution:"如果你近期血钾正常，未必需要严格限制；以团队建议为准。"
  },
  {
    id:"melon",
    name:"哈密瓜/甜瓜",
    aliases:["哈密瓜","甜瓜","香瓜"],
    tags:["highK"],
    level:"caution",
    summary:"部分瓜类水果钾不低；容易一次吃多。",
    why:["血钾偏高时，大份量水果可能让钾摄入超标。"],
    tips:["若医生允许，尽量小份量；避免当‘解渴’大量摄入。"],
    alternatives:["少量低钾水果（按医嘱）","白水"],
    caution:"如果你有透析限水医嘱，‘用瓜果解渴’更容易失控。"
  },
  {
    id:"avocado",
    name:"牛油果",
    aliases:["牛油果","鳄梨"],
    tags:["highK"],
    level:"high",
    summary:"经常被忽略的高钾食物。",
    why:["血钾偏高时，牛油果可能不适合作为日常‘加餐’。"],
    tips:["如果你喜欢，建议把它当作‘偶尔少量’，并先与团队确认。"],
    alternatives:["少量橄榄油调味","少量低钾水果（按医嘱）"],
    caution:"同时控脂/控糖的患者，仍需关注总能量。"
  },
  {
    id:"dried_fruit",
    name:"干果/蜜饯（枣、葡萄干等）",
    aliases:["枣","葡萄干","杏干","蜜饯","果脯"],
    tags:["highK"],
    level:"high",
    summary:"干制会‘浓缩’营养与钾，容易一口气吃多。",
    why:["血钾偏高时，干果/蜜饯可能让钾摄入迅速累积。"],
    tips:["血钾偏高时建议先避免；如果只是想解馋，尽量选择低钾替代（按医嘱）。"],
    alternatives:["少量低钾水果（按医嘱）"],
    caution:"很多蜜饯含糖高；糖尿病/移植用激素人群更要谨慎。"
  },

  // --- 常见高钾蔬菜/主食 ---
  {
    id:"potato",
    name:"土豆/土豆泥/薯条",
    aliases:["土豆","土豆泥","薯条","薯片"],
    tags:["highK"],
    level:"high",
    summary:"土豆类往往钾较高；油炸/加工形式还会带来额外负担。",
    why:["血钾偏高时，土豆类可能增加控钾难度。"],
    tips:["若医生允许，可考虑‘切块→先焯/先煮→弃水’再烹饪的做法，帮助减少钾（但仍要看份量）。"],
    alternatives:["米饭","面条","馒头等主食（按个体方案）"],
    caution:"如果你同时控磷/控脂/控糖，请综合选择烹饪方式与份量。"
  },
  {
    id:"sweet_potato",
    name:"红薯/地瓜",
    aliases:["红薯","地瓜","紫薯"],
    tags:["highK"],
    level:"high",
    summary:"常见高钾根茎类；易被当作‘粗粮健康食品’而吃多。",
    why:["血钾偏高时，红薯类可能不适合当主食大量摄入。"],
    tips:["若医生允许，尽量小份量；优先把‘饮料/代盐’这些隐蔽钾源先控制住。"],
    alternatives:["米饭/面条等（按医嘱）"],
    caution:"不同烹饪方式与份量差异很大。"
  },
  {
    id:"tomato_products",
    name:"番茄及番茄制品（番茄酱/番茄汁）",
    aliases:["番茄","西红柿","番茄酱","番茄汁"],
    tags:["highK"],
    level:"caution",
    summary:"番茄制品更容易‘浓缩’，血钾偏高时要注意份量。",
    why:["番茄制品（酱/汁）更容易一次摄入较多钾。"],
    tips:["血钾偏高时，优先减少番茄酱/番茄汁；少量新鲜番茄是否可用以医嘱为准。"],
    alternatives:["用葱姜蒜/醋/香草做调味"],
    caution:"加工番茄酱同时可能含盐高；高血压人群也要注意。"
  },
  {
    id:"spinach_cooked",
    name:"熟菠菜",
    aliases:["菠菜"],
    tags:["highK"],
    level:"caution",
    summary:"部分绿叶菜钾不低；烹饪与份量很关键。",
    why:["血钾偏高时，绿叶菜的大份量摄入可能增加钾负担。"],
    tips:["可考虑焯水后再炒/拌，帮助减少部分可溶性成分；但最终仍看份量与医嘱。"],
    alternatives:["部分瓜类/菌菇类（按个体方案）"],
    caution:"蔬菜总体仍重要，避免把‘限钾’理解成‘不吃菜’。"
  },
  {
    id:"seaweed",
    name:"海带/紫菜等海藻类",
    aliases:["海带","紫菜","海藻"],
    tags:["highK"],
    level:"high",
    summary:"海藻类矿物质含量高，血钾偏高时不建议常吃。",
    why:["血钾偏高时，海藻类可能增加钾摄入。"],
    tips:["喜欢喝紫菜汤的患者，血钾高时建议先停。"],
    alternatives:["清淡蔬菜汤（少喝汤）"],
    caution:"部分海藻类也可能影响碘摄入；以医生建议为准。"
  },
  {
    id:"beans",
    name:"豆类（红豆/绿豆/扁豆等）",
    aliases:["红豆","绿豆","黄豆","扁豆","鹰嘴豆"],
    tags:["highK","highP","double"],
    level:"caution",
    summary:"豆类常同时涉及钾与磷；是否限制取决于人群与份量。",
    why:[
      "对需要控钾/控磷的人群，豆类可能不是‘随意加量’的食物。",
      "豆类也有蛋白与纤维价值，是否限制应个体化。"
    ],
    tips:["把‘份量’作为第一原则；如果你同时在透析/控磷，建议把问题带给营养师/医生。"],
    alternatives:["按方案选择适合的蛋白来源（鸡蛋清/鱼肉等需个体化）"],
    caution:"植物性磷的吸收率与添加剂不同；正式版建议接入营养师配置。"
  },
  {
    id:"mushroom",
    name:"菌菇类（香菇等）",
    aliases:["香菇","蘑菇","菌菇"],
    tags:["highK"],
    level:"caution",
    summary:"部分菌菇钾不低；看份量。",
    why:["血钾偏高时，大份量菌菇类可能增加钾负担。"],
    tips:["若你血钾正常，多数情况下不必恐慌；高钾时优先把‘代盐/饮料/汤’先控制。"],
    alternatives:["少量其他蔬菜（按医嘱）"],
    caution:"不同品种差异较大。"
  },

  // --- 高磷核心：添加剂与高度加工（最该优先避开） ---
  {
    id:"phos_additives",
    name:"含磷添加剂的加工食品（重点）",
    aliases:["磷添加剂","磷酸盐","phos","加工食品"],
    tags:["highP","additiveP","tip"],
    level:"high",
    summary:"很多高度加工食品含‘磷酸盐添加剂’，更隐蔽、吸收率更高。",
    why:[
      "含磷添加剂（无机磷）更容易被吸收，对控磷更不利。",
      "相同‘磷含量’，添加剂来源通常比天然食物更需要优先避开。"
    ],
    tips:[
      "看配料表：出现‘磷酸盐/磷酸/焦磷酸/多聚磷酸盐’或英文含‘PHOS’字样时要提高警惕。",
      "优先选择少加工/原型食物；同类食品尽量选‘配料表更短’的。"
    ],
    alternatives:["新鲜现做饭菜","原型肉/蛋/菜（按个体方案）"],
    caution:"控磷通常需要结合透析参数/药物（如磷结合剂）与医生方案；App 不替代医疗决策。"
  },
  {
    id:"cola",
    name:"可乐/深色碳酸饮料",
    aliases:["可乐","深色汽水","碳酸饮料"],
    tags:["highP","additiveP"],
    level:"high",
    summary:"部分深色碳酸饮料含磷酸盐/磷酸，控磷人群建议先避免。",
    why:["控磷阶段，饮料可能成为‘最容易减少且收益很大’的来源之一。"],
    tips:["优先白水/无糖茶；同时控糖人群也更适合。"],
    alternatives:["白水","无糖茶"],
    caution:"不同品牌/口味差异大；如果你处于透析控磷阶段，建议默认避免。"
  },
  {
    id:"processed_meat",
    name:"加工肉制品（火腿/香肠/培根/午餐肉）",
    aliases:["火腿","香肠","培根","午餐肉","腊肉"],
    tags:["highP","additiveP"],
    level:"high",
    summary:"常含磷添加剂且盐也高；对控磷/控盐都不友好。",
    why:["控磷时应优先减少加工食品；加工肉往往是典型‘双不友好’。"],
    tips:["想吃肉时，优先选择‘原型肉’少加工做法，并注意总盐。"],
    alternatives:["新鲜瘦肉/鱼肉（按个体方案）"],
    caution:"移植人群需注意食品安全：避免生冷、注意加热与保存。"
  },
  {
    id:"instant_food",
    name:"方便面/速食/预制菜",
    aliases:["方便面","速食","预制菜"],
    tags:["highP","additiveP","tip"],
    level:"high",
    summary:"配料复杂，可能同时带来磷添加剂与高盐。",
    why:["控磷/控盐人群，减少高度加工食品通常收益很大。"],
    tips:["如果实在需要：尽量少用调料包、少喝汤，并增加新鲜蔬菜（按医嘱）。"],
    alternatives:["简单现做：米饭+清炒菜+少量蛋白（按个体方案）"],
    caution:"‘少用调料包’并不等于安全；最稳妥仍是减少频率。"
  },
  {
    id:"processed_cheese",
    name:"加工芝士/奶酪片",
    aliases:["芝士","奶酪","芝士片"],
    tags:["highP","additiveP"],
    level:"caution",
    summary:"部分加工奶酪可能含磷添加剂，控磷人群要注意。",
    why:["控磷阶段应减少含添加剂的乳制品/加工奶酪。"],
    tips:["如你需要补蛋白/补钙，请先与医生/营养师确定优先级。"],
    alternatives:["按个体方案选择乳制品或其他来源"],
    caution:"控磷与补钙/骨矿物管理常需要一起评估。"
  },

  // --- 天然高磷：更强调‘份量/人群’ ---
  {
    id:"nuts",
    name:"坚果/花生酱",
    aliases:["坚果","花生","杏仁","核桃","花生酱"],
    tags:["highK","highP","double"],
    level:"caution",
    summary:"常同时涉及钾与磷；也可能能量高。",
    why:["在控钾/控磷阶段，坚果不适合作为‘随手一大把’的加餐。"],
    tips:["如果医生允许，尽量‘小份量’；更优先减少‘加工食品+含添加剂’。"],
    alternatives:["按个体方案选择更合适的加餐"],
    caution:"不同坚果差异很大；正式版可做‘按份量可视化’。"
  },
  {
    id:"organ_meat",
    name:"动物内脏",
    aliases:["内脏","肝","腰子"],
    tags:["highP"],
    level:"high",
    summary:"磷含量往往较高；控磷人群不建议常吃。",
    why:["控磷阶段，减少内脏类摄入通常更稳妥。"],
    tips:["若你是为了补铁/补营养，请让团队给出更安全的替代方案。"],
    alternatives:["按个体方案选择蛋白/补铁途径"],
    caution:"不同人群差异很大：移植/透析/CKD 的重点不同。"
  },
  {
    id:"egg_yolk",
    name:"蛋黄",
    aliases:["蛋黄"],
    tags:["highP"],
    level:"caution",
    summary:"蛋黄磷相对更多；是否限制取决于你的控磷目标与蛋白需求。",
    why:["控磷人群常需要平衡‘优质蛋白’与‘磷负担’。"],
    tips:["如果医生强调控磷，可考虑与营养师讨论‘蛋白来源’与‘频率’。"],
    alternatives:["鸡蛋清（蛋白）等（需个体化）"],
    caution:"不要自行长期低蛋白/过度限制，避免营养不良。"
  },
  {
    id:"milk",
    name:"牛奶/奶粉/酸奶",
    aliases:["牛奶","奶粉","酸奶"],
    tags:["highP"],
    level:"caution",
    summary:"乳制品含磷；是否需要限制取决于你的血磷与医生方案。",
    why:["控磷阶段，乳制品可能需要重新规划‘份量与频率’。"],
    tips:["如果你同时在做骨矿物管理（钙/维D/PTH），更建议让团队给出一揽子方案。"],
    alternatives:["按个体方案选择乳制品或其他来源"],
    caution:"不同品牌/配方差异大。"
  },

  // --- 移植食品安全（占位提醒） ---
  {
    id:"tx_food_safety",
    name:"移植期：食品安全优先",
    aliases:["移植","免疫抑制","食品安全"],
    tags:["tx","tip"],
    level:"tip",
    summary:"免疫抑制期更怕食源性感染：避免生食/半生，注意分餐与冷藏。",
    why:["移植期饮食首先要守住‘食品安全’，很多风险来自不洁/生冷食物。"],
    tips:["避免生鱼片/生蛋/未充分加热的肉；外卖尽量选择熟食与正规商家。"],
    alternatives:["熟食/现做热食"],
    caution:"具体以你的移植中心宣教为准。"
  },
];

// ====== Diet Guides (v1) ======
// 目的：把“原则性饮食方案”做成独立页面，避免与单个食物解释混在一起。
// 说明：正式版建议由肝病/营养团队审核；此处用于内测结构与交互验证。

const DIET_GUIDE_VERSION = "1.0";

const DIET_GUIDES = [
  {
    id: "masld",
    title: "脂肪肝/MASLD（NASH/MASH）饮食要点",
    subtitle: "核心：逐步减重 + 少糖少加工（肾友好版本示意）",
    sections: [
      {
        t: "先说明术语",
        s: [
          "你可能听过 NAFLD/NASH。近年更常用 MASLD（代谢相关脂肪性肝病）与 MASH（代谢相关脂肪性肝炎）来描述同类问题。",
          "无论叫法如何，管理的第一核心通常都是：体重管理 + 代谢改善（血糖/血脂/血压）。"
        ]
      },
      {
        t: "最重要的目标",
        s: [
          "如果超重/肥胖：在医生/营养师指导下‘逐步’减重更安全。",
          "很多宣教会把‘减重 7–10%’作为改善肝脏炎症/纤维化的常见目标；更小的减重也可能降低肝脂肪。",
          "避免‘快速减重/极端节食’，可能适得其反。"
        ]
      },
      {
        t: "饮食原则（最省力、最不容易走偏）",
        s: [
          "少含糖饮料与果汁：它们更容易导致总能量过量与血糖波动。",
          "少精制主食与甜点：把‘白米面/甜点’逐步换成更耐饱的主食（按你的肾功能与医生建议决定份量）。",
          "少油炸与高饱和脂肪：减少肥肉、油炸、奶油/酥点等。",
          "多‘原型食物’：新鲜食材、清淡烹饪；少高度加工食品（也有助于控磷添加剂）。",
          "优先优质蛋白：鱼、禽、蛋、瘦肉、豆制品等（肾功能不同，蛋白目标不同，请以随访方案为准）。"
        ]
      },
      {
        t: "运动与生活方式（对肝和肾都加分）",
        s: [
          "如果条件允许：每周累计≥150分钟中等强度运动（如快走）+ 每周2次抗阻训练，是常见推荐。",
          "运动即使不明显减重，也可能带来代谢改善。",
          "如有心衰/透析/术后等情况，运动强度请先和医生确认。"
        ]
      },
      {
        t: "与肾病/移植/透析如何兼容（非常重要）",
        s: [
          "如果你在‘限钾/控磷/限水’，请优先遵循肾脏随访方案：本App 的高钾/高磷食物库用于‘避坑’。",
          "地中海式饮食常含坚果、豆类、部分水果蔬菜——但这些在‘高钾/高磷’时可能需要‘份量控制或替代’，不要盲目照搬。",
          "最稳的顺序：先把含糖饮料/甜点/油炸/加工食品减少；再在医生允许范围内优化蔬果与主食结构。"
        ]
      },
    ],
    footer: "边界：本指南为健康教育提示，不替代肝病/肾病医生与营养师的个体化处方。若出现黄疸、呕血黑便、明显腹胀、意识异常等情况请及时就医。"
  }
];

function dietFocus(){
  const lab = latestLab();
  const k = toNum(lab?.k);
  const p = toNum(lab?.p);
  const highK = (k !== null && k >= 5.5);
  const highP = (p !== null && p >= 1.6);
  return { k, p, highK, highP };
}

// Diet library UI state (not persisted fully; only remember last filter/query)
let dietUI = { view:"list", filter:"all", query:"", selected:null, guide:null };
// Docs vault UI (page)
let docsUI = { prog:"active", cat:"all", query:"" };

const KNOWLEDGE = [
  { id:"k_bp", tags:["kidney","htn"], title:"家庭血压：怎么测更准？", body:"固定时间、安静坐位、袖带合适、连续测两次取平均。把“周均值+波动”带去复诊，比单次数值更有用。", action:{label:"去记录血压", fn:"record_bp"} },
  { id:"htn_meds", tags:["htn"], title:"高血压用药：更重要的是‘坚持 + 记录’", body:"随访里最有价值的不是一次数字，而是：血压趋势 + 是否按医嘱服药 + 是否出现头晕/乏力等不适。App 内测版支持‘用药打卡’做复诊整理。", action:{label:"用药打卡", fn:"record_meds"} },
  { id:"k_protein", tags:["kidney","glomerular"], title:"尿蛋白/尿检怎么记录才对复诊有用？", body:"建议按日期记录：尿蛋白等级（或ACR/UPCR）、尿潜血、体重/水肿、血压。趋势比单次更重要。", action:{label:"去记录尿检", fn:"record_urine"} },
  { id:"k_tx_food", tags:["kidney","tx"], title:"移植期饮食：先守住“食品安全”", body:"免疫抑制期更怕食源性感染：避免生食/半生、注意分餐与冷藏、外卖选择更稳妥的熟食。具体以移植中心宣教为准。", action:{label:"查看饮食提醒", fn:"open_diet"} },
  { id:"k_electro", tags:["safety","electrolyte"], title:"电解质异常：先识别红旗，再谈饮食", body:"心悸、胸痛、抽搐、意识异常、呼吸困难等属于红旗。出现红旗应尽快就医/联系团队。饮食建议只能辅助，不能替代医疗处理。", action:{label:"打开红旗分诊", fn:"open_triage"} },
  { id:"s_water", tags:["stone"], title:"结石预防：把喝水拆成“分次策略”", body:"与其一次猛灌，不如把一天分成多个小目标（起床/上午/下午/晚间）。如果医生要求限水，请以医嘱为准。", action:{label:"去记录喝水", fn:"record_water"} },
  { id:"p_growth", tags:["peds"], title:"儿肾随访：把“生长”放到第一屏", body:"孩子的身高体重、生长速度与营养/肾功能密切相关。建议至少每月记录一次身高与体重（或按医生要求）。", action:{label:"去记录身高", fn:"record_height"} },
  { id:"p_bp", tags:["peds"], title:"儿童血压：不是固定阈值，而是“百分位”", body:"儿童血压解读常需要结合年龄/性别/身高百分位。App 内测版先做结构化记录与复诊整理，最终以儿肾医生判读为准。", action:{label:"去记录血压", fn:"record_bp"} },
  { id:"d_hd", tags:["dialysis"], title:"血透日：透前/透后记录能让复诊更高效", body:"建议记录：透前体重与血压、透后体重与血压、超滤量（如有）。长期看“间期体重增长趋势”比单次更有价值。", action:{label:"记录一次透析", fn:"record_dialysis"} },
  { id:"d_pd_redflag", tags:["dialysis"], title:"腹透红旗：透析液混浊/腹痛/发热要优先处理", body:"腹透出现透析液混浊、腹痛、发热等需要优先联系透析团队或就医。App 内测版先做“记录+分诊提示”。", action:{label:"打开红旗分诊", fn:"open_triage"} },
  { id:"d_fluid", tags:["dialysis"], title:"透析控水：先遵医嘱，再做记录", body:"透析患者常有控水/控盐要求。App 里会把“限水”作为高优先级提示，但具体目标以透析中心医嘱为准。", action:{label:"查看饮食提醒", fn:"open_diet"} },
  { id:"dm_glu", tags:["dm"], title:"血糖记录：给医生看的不是‘一个值’，是‘时间点+趋势’", body:"建议给每次血糖打标签（空腹/餐后/睡前/随机），并关注低血糖症状（出汗、心慌、手抖）。趋势与事件记录能显著提高复诊效率。", action:{label:"去记录血糖", fn:"record_glucose"} },
  { id:"dm_a1c", tags:["dm"], title:"HbA1c：更像‘过去2-3个月平均控糖的回放’", body:"HbA1c 常用于评估阶段性控糖水平。把每次结果按日期录入/上传报告，医生更容易判断是否需要调整方案。", action:{label:"去录入化验", fn:"record_labs"} },
];

// ====== Explainables ("为什么要做") ======
// Design goals:
// - Slightly detailed (6–10 lines) but not overwhelming
// - Same structure everywhere: 目的/看什么/怎么做/会用到哪里/红旗
// - Program-aware: tasks & record cards reference a stable explainer id
// NOTE: 文案是内测版占位，正式版建议由中心/医生端审核与配置下发。
const EXPLAINERS = {
  bp: {
    title: "家庭血压：为什么要测？",
    subtitle: "用于随访整理与复诊沟通（不替代医生）",
    why: "血压是肾脏与心血管风险的‘日常信号灯’，趋势比单次数字更重要。",
    focus: [
      "近7–14天平均值与波动幅度",
      "是否持续偏高/偏低，是否与头晕、胸闷、气促等症状相关",
      "是否与体重（体液变化）、尿蛋白/肾功能变化同步"
    ],
    howto: [
      "安静坐位休息3–5分钟后测量；袖带大小合适，手臂与心脏同水平",
      "尽量固定时间（晨起/晚间）记录，便于比较趋势",
      "若一次异常，建议间隔1–2分钟复测并备注当时情况"
    ],
    usedfor: [
      "进入趋势与一页摘要，帮助医生快速判断随访与管理重点",
      "触发安全提醒（如低血压症状/明显波动时的红旗提示）"
    ],
    redflags: ["胸痛、呼吸困难", "意识异常/抽搐/晕厥", "剧烈头痛伴肢体麻木或说话不清"],
    action: { label:"去记录血压", fn:"openQuickBP" }
  },
  weight: {
    title: "体重：为什么要记录？",
    subtitle: "短期体重变化常反映体液变化（水肿/脱水）",
    why: "肾病/透析/心血管人群中，体重是评估‘水分变化’最直观的家庭指标之一。",
    focus: [
      "几天内是否明显快速增加或下降",
      "是否伴浮肿、气促、尿量变化",
      "透析人群重点看‘间期体重增长’与干体重匹配"
    ],
    howto: [
      "建议每天同一时间（如晨起排空后）称重；同一秤/相近衣着",
      "透析日可分别记录透前/透后体重（如适用）",
      "备注可能影响体重的因素：外食很咸、腹泻/呕吐、发热、用药变化"
    ],
    usedfor: [
      "进入趋势与一页摘要，帮助团队评估控水/用药/随访频率",
      "与血压、尿量、症状合并解读更可靠"
    ],
    redflags: ["体重快速上升且气促/浮肿明显", "尿量明显减少/无尿", "明显头晕乏力或持续呕吐腹泻"],
    action: { label:"去记录体重", fn:"openQuickWeight" }
  },
  urine: {
    title: "尿检/尿蛋白：为什么要记录？",
    subtitle: "对肾小球病活动度与风险评估非常关键",
    why: "尿蛋白/血尿等信息能反映肾小球受损与疾病活动度，趋势比单次更有价值。",
    focus: [
      "尿蛋白（ACR/UPCR/24h尿蛋白）趋势",
      "潜血/红细胞变化与是否反复",
      "是否与血压、体重（水肿）同步变化"
    ],
    howto: [
      "按医院要求留取（常用中段尿）；尽量固定同一类指标以便趋势对比",
      "女性经期、剧烈运动、发热感染等请备注（可影响结果）",
      "若有报告原件/照片，建议同步上传到资料库，复诊更省时"
    ],
    usedfor: [
      "进入趋势与一页摘要，用于复诊沟通与随访计划调整",
      "可与专病指标（如MN的anti-PLA2R、LN的dsDNA/C3/C4）合并整理"
    ],
    redflags: ["肉眼血尿", "发热伴尿痛/腰痛", "血尿伴明显少尿/无尿"],
    action: { label:"去记录尿检", fn:"openAddUrine" }
  },
  labs: {
    title: "化验：为什么要录入？",
    subtitle: "肾功能、电解质、代谢与治疗安全的核心信息",
    why: "化验能帮助尽早发现肾功能波动、电解质紊乱与代谢异常，并为复诊决策提供依据。",
    focus: [
      "肌酐/eGFR：肾功能趋势",
      "K/Na/Ca/P/Mg：电解质与骨矿物相关线索",
      "血糖/HbA1c（如合并糖尿病）与相关风险"
    ],
    howto: [
      "尽量在同一实验室/同一单位随访；不同医院方法可能不同",
      "是否空腹按医院要求；近期感染、腹泻、用药变化请备注",
      "若上传化验单原件，后续更容易与医生核对"
    ],
    usedfor: [
      "触发安全提醒与饮食教育标签（如限钾/控磷/控糖等）",
      "进入趋势与一页摘要，并可被AI用于生成复诊问题清单（不诊断）"
    ],
    redflags: ["心悸/胸闷/抽搐/意识异常等症状时，优先就医或联系团队", "持续呕吐腹泻、明显乏力"],
    action: { label:"去录入化验", fn:"openAddLab" }
  },
  symptoms: {
    title: "症状自评：为什么要记录？",
    subtitle: "症状常早于化验变化，能帮助团队快速定位风险",
    why: "很多风险事件先表现为症状变化；结构化记录能减少漏诊并让复诊更高效。",
    focus: [
      "出现时间、严重程度、是否影响日常生活",
      "是否伴随发热、少尿/无尿、胸痛/气促等红旗",
      "与血压、体重、尿检、化验变化是否同向"
    ],
    howto: [
      "建议用‘时间+强度+伴随症状’三要素记录",
      "必要时可拍照（如水肿/透析液变化/皮疹等）并上传资料库",
      "出现红旗请不要只记录：优先联系随访团队或就医"
    ],
    usedfor: [
      "红旗分诊与安全提醒置顶",
      "进入一页摘要，并可由AI帮助整理成复诊沟通要点（不替代医生）"
    ],
    redflags: ["胸痛、呼吸困难", "意识异常/抽搐", "明显少尿/无尿", "发热寒战（尤其伴剧烈腰痛）"],
    action: { label:"去记录症状", fn:"quickSymptoms" }
  },
  tx_meds: {
    title: "移植：免疫抑制剂打卡为什么重要？",
    subtitle: "按时、按量、按流程，减少风险（以移植中心方案为准）",
    why: "免疫抑制剂需要稳定服用；漏服/延迟或时间点不清，会让风险评估与浓度解读更困难。",
    focus: [
      "是否漏服/延迟、是否自行增减",
      "抽血测谷浓度时的服药时间点与流程",
      "腹泻/呕吐等可能影响吸收的情况"
    ],
    howto: [
      "按医嘱固定时间服药；如要抽血测谷浓度，务必遵循中心流程",
      "出现严重腹泻/呕吐导致无法服药时，应尽快联系移植团队",
      "不要自行调整剂量，复诊时带上记录更有效"
    ],
    usedfor: [
      "进入一页摘要‘移植关键段’，减少复诊沟通成本",
      "与肌酐/eGFR、dd-cfDNA/DSA等信息合并整理"
    ],
    redflags: ["无法正常服药", "持续呕吐腹泻", "高热寒战/精神状态变差"],
    action: { label:"记录一次症状", fn:"quickSymptoms" }
  },
  tx_temp: {
    title: "移植：体温/感染自评为什么要做？",
    subtitle: "免疫抑制期感染风险更高，早发现更安全",
    why: "移植与免疫抑制期更容易出现感染；体温与症状记录有助于尽早识别并联系团队。",
    focus: [
      "是否持续发热、是否伴寒战",
      "伴随咳嗽、腹泻、尿痛等线索",
      "与近期用药、化验变化是否同向"
    ],
    howto: [
      "尽量固定同一种测温方式；记录发热开始时间与最高温",
      "若有外院化验/影像，请上传资料库便于团队快速查看",
      "出现明显不适请优先联系随访团队/就医"
    ],
    usedfor: [
      "触发安全提醒（红旗优先）",
      "进入一页摘要，帮助团队快速做下一步评估安排"
    ],
    redflags: ["高热寒战", "呼吸困难", "意识改变/嗜睡明显"],
    action: { label:"去红旗分诊", fn:"openTriageModal" }
  },
  glucose: {
    title: "血糖：为什么要记录？",
    subtitle: "合并糖尿病或用激素者：趋势与低血糖风险更重要",
    why: "血糖管理与心血管风险、感染风险及整体恢复相关；结构化记录能提高复诊效率。",
    focus: [
      "空腹/餐后（标注时间点）",
      "是否出现低血糖症状（出汗、心慌、手抖）",
      "HbA1c趋势（如有）"
    ],
    howto: [
      "记录时标注餐前/餐后/睡前等标签，便于医生判断",
      "出现低血糖按医嘱处理并记录事件",
      "不要仅凭单次值自行调整用药"
    ],
    usedfor: [
      "触发控糖饮食教育标签（示意）",
      "进入一页摘要并可生成复诊问题清单"
    ],
    redflags: ["意识模糊/晕厥疑似严重低血糖", "持续呕吐无法进食"],
    action: { label:"去记录血糖", fn:"openQuickGlucose" }
  },
  docs_vault: {
    title: "资料库：为什么要上传报告/图片？",
    subtitle: "把关键资料集中在一处，复诊沟通更高效",
    why: "活检、基因、影像、免疫学报告等‘原件’对医生判断非常关键。集中保存可减少遗漏与反复翻找。",
    focus: [
      "报告类型/日期/医院（越清晰越好）",
      "关键结论与图片清晰度",
      "同一检查多次随访时，按时间线归档"
    ],
    howto: [
      "优先上传PDF原件；如为照片，建议光线充足、对焦清晰",
      "上传时选择分类（活检/基因/影像/化验单等）便于复诊快速定位",
      "内测版为本地保存；正式版可接云端与医生端共享（需权限控制）"
    ],
    usedfor: [
      "资料汇总会进入一页摘要（数量+最近上传）",
      "未来可作为‘与医生共享的材料入口’（预留接口）"
    ],
    redflags: ["若报告提示紧急异常且伴明显不适，请优先联系医生/就医"],
    action: { label:"去上传资料", fn:"openDocUploadModal" }
  },
  markers_advanced: {
    title: "高级监测指标：为什么要记录？",
    subtitle: "用于随访整理与趋势（不做自我诊断）",
    review: "内测文案（待中心审核）",
    why: "dd-cfDNA、DSA、anti-PLA2R、dsDNA/C3/C4等指标常用于专病管理与复诊沟通。记录趋势能帮助团队更快抓重点。",
    focus: [
      "同一方法/单位下的趋势变化",
      "与肾功能、尿蛋白、症状是否同步",
      "尽量保留报告原件（不同医院差异很大）"
    ],
    howto: [
      "优先‘上传报告原件’，再补充结构化录入（日期/单位/结果）",
      "不要根据单项指标自行调整治疗方案",
      "出现红旗症状或肾功能快速变化时，优先联系团队"
    ],
    usedfor: [
      "进入一页摘要‘专病/移植关键段’，并支持AI生成复诊问题清单",
      "减少‘只记得阳性/阴性’导致的沟通信息损失"
    ],
    redflags: ["发热寒战、明显少尿/无尿、胸痛/气促、意识异常等红旗优先处理"],
    action: { label:"新增一次高级指标", fn:"openAddMarkerModal" }
  },
  mk_ddcfDNA: {
    title: "dd-cfDNA：为什么要记录？",
    subtitle: "移植随访常用辅助指标之一（不同平台差异大）",
    review: "内测文案（待中心审核）",
    why: "dd-cfDNA 常作为评估移植肾受损/免疫风险变化的辅助线索之一，通常需要结合肌酐/eGFR、尿蛋白、症状与其他免疫学信息一起看。我们记录它的目的，是让随访团队复诊时更快抓住趋势与变化点。",
    focus: [
      "更关注趋势变化（连续升高/降低）而非单次数值",
      "记录检测平台/单位/日期（不同平台参考范围可能不同）",
      "与肾功能、尿量变化、发热/腹泻等情况是否同步"
    ],
    howto: [
      "建议同步上传原始报告（PDF/图片），以保留平台信息与参考范围",
      "日期尽量填采样/抽血日期；不确定可填报告日期并在备注说明",
      "不要仅凭该指标自行判断或调整用药，出现不适请优先联系移植中心"
    ],
    usedfor: [
      "进入移植随访的一页摘要‘关键免疫/监测’段落",
      "支持趋势整理，AI 可辅助生成复诊问题清单（不诊断/不处方）"
    ],
    redflags: ["发热寒战/精神状态明显变差", "尿量明显减少/无尿", "持续呕吐腹泻导致无法服药"],
    action: { label:"去新增高级指标", fn:"openAddMarkerModal" }
  },
  mk_dsa: {
    title: "DSA：为什么要记录/上传？",
    subtitle: "供者特异性抗体报告常较复杂，原件更重要",
    review: "内测文案（待中心审核）",
    why: "DSA 报告通常包含分型与强度等信息（不同实验室展示方式不同）。记录/上传的意义在于：复诊时团队可以快速核对关键字段，并与肾功能、活检、dd-cfDNA 等信息综合判断。",
    focus: [
      "是否为新出现或明显变化（以医生解读为准）",
      "尽量保留完整报告原件（截图易漏关键字段）",
      "与肌酐/eGFR、蛋白尿、症状是否同时变化"
    ],
    howto: [
      "强烈建议上传完整报告（PDF/清晰照片），此处仅做摘要字段补充",
      "若报告有 MFI/分型等字段，可在备注中补充（可选）",
      "不要自行据此调整免疫抑制方案"
    ],
    usedfor: [
      "进入移植随访的一页摘要，减少复诊沟通成本",
      "支持时间线归档（便于团队对比前后变化）"
    ],
    redflags: ["合并肾功能快速变化", "发热寒战/明显不适", "明显少尿/无尿"],
    action: { label:"去上传报告", fn:"openDocUploadModal" }
  },
  mk_antiPLA2R: {
    title: "anti-PLA2R：为什么要记录？",
    subtitle: "膜性肾病随访常用免疫学指标（以医生解释为准）",
    review: "内测文案（待中心审核）",
    why: "在膜性肾病随访中，anti-PLA2R 常用于反映免疫活动的线索。把它与尿蛋白、肾功能、症状放在同一条时间线上，能让复诊沟通更高效。",
    focus: [
      "更关注趋势变化，而不是单次结果",
      "尽量同一实验室/同一方法随访（单位与参考范围可能不同）",
      "与尿蛋白/水肿、肌酐/eGFR 是否同步"
    ],
    howto: [
      "建议上传原始报告并填写采样/抽血日期（不确定可备注）",
      "如果报告写‘阴性/阳性’，也可以直接记录为结果",
      "不要仅凭该指标自行调整治疗，复诊时让医生综合判读"
    ],
    usedfor: [
      "进入MN（膜性肾病）工作区的趋势与一页摘要",
      "AI 可协助整理‘抗体-蛋白尿-肾功能’的变化点用于复诊提问"
    ],
    redflags: ["蛋白尿/水肿突然明显加重", "尿量明显减少/无尿", "出现胸痛、气促、意识异常等红旗"],
    action: { label:"去新增高级指标", fn:"openAddMarkerModal" }
  },
  mk_antiTHSD7A: {
    title: "anti-THSD7A：为什么要记录？",
    subtitle: "膜性肾病的可选补充指标（以中心检测为准）",
    review: "内测文案（待中心审核）",
    why: "部分膜性肾病患者可能会检测 anti-THSD7A 作为补充线索。记录/上传的意义主要在于复诊整理与时间线对比。",
    focus: ["是否做过该检测与结果（以报告为准）", "与尿蛋白与肾功能趋势是否同步"],
    howto: ["建议上传原始报告；如仅口头结论，建议备注检测机构/日期", "不要据此自行调整治疗"],
    usedfor: ["进入MN工作区资料汇总与一页摘要"],
    redflags: ["蛋白尿/水肿明显加重时尽快联系医生"],
    action: { label:"去上传报告", fn:"openDocUploadModal" }
  },
  mk_dsDNA: {
    title: "抗dsDNA：为什么要记录？",
    subtitle: "狼疮肾随访常用血清学线索之一（需综合解读）",
    review: "内测文案（待中心审核）",
    why: "在狼疮肾随访中，抗dsDNA 常与补体、尿蛋白/尿沉渣和肾功能一起用于评估免疫活动线索。记录的意义在于把变化放入时间线，方便复诊讨论。",
    focus: ["趋势变化（同一方法更可比）", "与补体C3/C4、蛋白尿、症状是否同向"],
    howto: ["建议上传报告原件并记录日期/单位（不同医院差异较大）", "不要用单项指标替代医生判断"],
    usedfor: ["进入LN工作区摘要与趋势整理", "AI 生成复诊问题清单（不诊断）"],
    redflags: ["发热寒战/明显不适", "尿量明显减少/无尿", "蛋白尿/水肿明显加重"],
    action: { label:"去新增高级指标", fn:"openAddMarkerModal" }
  },
  mk_c3: {
    title: "补体C3：为什么要记录？",
    subtitle: "狼疮肾/C3肾病等随访常用线索（参考范围因院而异）",
    review: "内测文案（待中心审核）",
    why: "C3 常用于反映免疫活动或补体消耗的线索之一，需要结合疾病类型、其他化验与临床表现综合解读。",
    focus: ["是否低于本院参考范围（以报告为准）", "与C4、dsDNA、尿蛋白/尿沉渣变化是否相关"],
    howto: ["建议同时上传原报告，保留参考范围与检测方法信息", "不同医院参考范围不同，尽量同院随访更可比"],
    usedfor: ["进入专病摘要与复诊整理"],
    redflags: ["出现明显不适或肾功能快速变化时优先联系医生"],
    action: { label:"去上传报告", fn:"openDocUploadModal" }
  },
  mk_c4: {
    title: "补体C4：为什么要记录？",
    subtitle: "狼疮肾随访常用线索（参考范围因院而异）",
    review: "内测文案（待中心审核）",
    why: "C4 常与C3、dsDNA等一起用于评估免疫活动线索。记录趋势能帮助复诊更快回顾变化。",
    focus: ["是否低于本院参考范围（以报告为准）", "与dsDNA、蛋白尿、症状是否同向"],
    howto: ["建议上传原报告并记录日期", "不同医院参考范围不同，趋势解读需由医生完成"],
    usedfor: ["进入LN工作区摘要与趋势整理"],
    redflags: ["发热寒战/精神差", "尿量明显减少/无尿"],
    action: { label:"去新增高级指标", fn:"openAddMarkerModal" }
  },
  mk_antiNephrin: {
    title: "anti-nephrin：为什么要记录？",
    subtitle: "MCD/FSGS 等人群的可选高级指标（以中心方案为准）",
    review: "内测文案（待中心审核）",
    why: "anti-nephrin 在部分中心用于肾病综合征/MCD 等人群的研究或辅助评估线索。对多数患者并非必查项，因此我们把它作为‘可选高级指标’：以归档与复诊整理为主。",
    focus: ["是否检测过与结果（阳性/阴性/滴度）", "与蛋白尿、水肿变化是否相关（由医生综合判断）"],
    howto: ["优先上传报告原件；此处可记录阳性/阴性或滴度/数值", "不要据此自行调整治疗"],
    usedfor: ["进入专病资料汇总与一页摘要（沟通用）"],
    redflags: ["蛋白尿/水肿突然明显加重", "明显少尿/无尿"],
    action: { label:"去上传报告", fn:"openDocUploadModal" }
  },
  hd_session: {
    title: "血透记录：为什么要记透前/透后？",
    subtitle: "水分管理与透析耐受的核心数据",
    why: "透前/透后体重血压与超滤量（UF）能反映控水策略与透析耐受，便于团队调整干体重与处方。",
    focus: [
      "间期体重增长趋势（比单次更重要）",
      "透析中/透后不适（头晕、抽筋、恶心等）",
      "超滤量与透后血压是否过低"
    ],
    howto: [
      "透析日尽量记录：透前体重/血压 → 透后体重/血压（可选UF）",
      "把当日特殊情况备注清楚（补液/抽筋/恶心/低血压处理等）",
      "若被要求限水/控盐，目标以透析中心医嘱为准"
    ],
    usedfor: [
      "生成‘最近3次透析摘要’，复诊讨论更高效",
      "与电解质（K/P等）趋势合并看更有意义"
    ],
    redflags: ["透后胸痛气促", "晕厥/意识异常", "持续明显低血压伴症状"],
    action: { label:"记录一次透析", fn:"openDialysisSessionModal" }
  },
  dialysis_access: {
    title: "通路/出口自检：为什么要做？",
    subtitle: "早发现功能异常或感染风险，避免严重并发症",
    why: "透析通路（内瘘/人工血管/导管/腹透出口）一旦感染或功能异常，风险高且处理紧迫。",
    focus: [
      "红肿热痛、渗液、出血",
      "内瘘震颤/杂音是否改变",
      "是否伴发热寒战"
    ],
    howto: [
      "建议每天简单自检；任何异常尽快联系透析中心",
      "不要自行处理渗液/化脓，按中心流程处理",
      "如果同时出现全身不适或发热，优先就医/联系团队"
    ],
    usedfor: [
      "触发安全提醒置顶",
      "帮助团队快速判断是否需要尽快就诊/处理"
    ],
    redflags: ["发热寒战", "通路剧痛/大量渗血", "意识异常"],
    action: { label:"打开红旗分诊", fn:"openTriageModal" }
  },
  pd_session: {
    title: "腹透记录：为什么要记UF/透析液外观？",
    subtitle: "腹膜炎等风险事件常先从‘浑浊/腹痛/发热’开始",
    why: "腹透相关风险（如腹膜炎）常先体现在透析液浑浊、腹痛、发热、UF变化。早记录早处理更安全。",
    focus: [
      "透析液是否清澈/浑浊（建议拍照）",
      "超滤量（UF）趋势是否明显变化",
      "是否伴腹痛、发热、恶心"
    ],
    howto: [
      "如出现浑浊，建议拍照并立即记录（不要等到复诊）",
      "按透析中心流程联系团队进行评估",
      "不要用App替代医疗处理：红旗优先"
    ],
    usedfor: [
      "红旗分诊与安全提醒（置顶）",
      "进入透析随访摘要，便于团队快速回顾事件时间线"
    ],
    redflags: ["透析液浑浊", "腹痛明显", "发热寒战"],
    action: { label:"记录一次腹透", fn:"openDialysisSessionModal" }
  },
  pd_exit: {
    title: "腹透出口护理：为什么要做？",
    subtitle: "出口护理是预防感染的关键",
    why: "出口感染往往先从局部红肿渗液开始；规范护理能降低感染风险。",
    focus: ["出口是否红肿、渗液、疼痛", "敷料是否潮湿/污染", "是否伴发热"],
    howto: ["按透析中心宣教流程护理与换药", "发现异常及时联系透析团队", "如有渗液/红肿可拍照上传资料库"],
    usedfor: ["护理提醒与事件记录", "帮助团队评估是否需要尽快处理"],
    redflags: ["渗液增多/脓性", "发热寒战", "局部剧痛"],
    action: { label:"打开红旗分诊", fn:"openTriageModal" }
  },
  water_stone: {
    title: "结石：饮水记录为什么重要？",
    subtitle: "提高尿量有助于降低复发风险；限水人群以医嘱优先",
    why: "结石管理中，足够尿量与分次饮水策略常是预防复发的基础。但若医生要求限水，必须以医嘱为准。",
    focus: ["是否做到分次饮水（比一次猛灌更可持续）", "哪些场景容易漏喝（外出/忙碌/夜间）", "尿色是否经常偏深"],
    howto: ["把一天拆成多个小目标（起床/上午/下午/晚间）", "睡前少量即可，避免夜间负担", "限水模式：只记录，不追‘喝够’目标"],
    usedfor: ["生成饮水达标周报与复诊摘要", "与发作事件时间线合并，帮助医生判断风险"],
    redflags: ["腰痛伴发热寒战", "无尿/少尿明显", "呕吐严重无法进食"],
    action: { label:"去记录饮水", fn:"openProgramMainModal" }
  },
  stone_event: {
    title: "结石发作事件：为什么要记录时间线？",
    subtitle: "时间线决定复诊效率，也能识别感染等急症风险",
    why: "结石发作的时间、症状与是否伴感染线索，会影响是否需要影像复查与处理路径。",
    focus: ["疼痛评分与持续时间", "血尿/尿量变化", "发热寒战（感染红旗）", "是否就医与影像结果"],
    howto: ["尽量记录开始时间与高峰时间", "如有影像/化验单请上传资料库", "发热+腰痛/寒战请优先就医"],
    usedfor: ["生成发作时间线摘要，复诊沟通更清晰", "减少‘说不清楚什么时候开始’造成的信息损失"],
    redflags: ["发热+腰痛/寒战", "无尿/少尿明显", "剧烈疼痛伴反复呕吐"],
    action: { label:"新增一次发作事件", fn:"openStoneEventModal" }
  },
  peds_growth: {
    title: "儿肾：为什么把生长放在第一屏？",
    subtitle: "身高/体重增长速度与营养、药物、肾功能密切相关",
    why: "儿肾随访不仅看化验，更要看生长趋势。持续监测可帮助团队更早发现营养或慢病影响。",
    focus: ["每月身高（建议）与体重趋势", "食欲/活动量变化", "与化验（肌酐/eGFR）同步情况"],
    howto: ["固定测量方式：同一尺、同一秤、同一时间段", "尽量每月记录一次身高（或按医嘱）", "监护人可协助记录与备注"],
    usedfor: ["生成生长趋势摘要，复诊时更容易讨论营养与治疗目标", "与儿科eGFR估算（需要身高）联动（示意）"],
    redflags: ["发热精神差", "持续呕吐腹泻", "尿量明显减少"],
    action: { label:"去记录身高", fn:"openQuickHeight" }
  },
  height_peds: {
    title: "儿肾：为什么要定期记录身高？",
    subtitle: "身高是生长速度的关键指标，也是部分评估的基础数据",
    why: "身高能反映生长速度；在儿肾随访中常用于综合评估营养与疾病影响，并可用于部分估算（示意）。",
    focus: ["是否有生长速度放缓", "与体重变化是否不匹配", "是否与近期疾病/用药变化相关"],
    howto: ["建议每月记录一次（或按医嘱），同一测量方式更可比", "记录日期与测量环境（晨/晚）", "如有明显变化可备注近期情况"],
    usedfor: ["进入生长趋势摘要，复诊讨论更具体", "用于儿科eGFR估算的必要字段之一（示意）"],
    redflags: ["明显消瘦或精神状态明显变差", "持续呕吐腹泻"],
    action: { label:"去记录身高", fn:"openQuickHeight" }
  },
  bp_peds: {
    title: "儿肾：儿童血压为什么要记录？",
    subtitle: "儿童血压解读常需结合年龄/性别/身高百分位",
    why: "儿童血压不像成人有固定阈值，通常需要结合年龄、性别、身高百分位综合判断；记录越规范越有价值。",
    focus: ["固定时间的趋势", "与头晕、乏力、肾功能/尿检变化的关联", "在复诊时提供‘家庭测量方案’依据"],
    howto: ["袖带大小要适合儿童；安静坐位后测量", "建议监护人协助固定时间记录", "App内测版用于整理，最终判读以儿肾医生为准"],
    usedfor: ["进入儿肾摘要与复诊问题清单", "帮助医生决定是否需要进一步检查（如ABPM等）"],
    redflags: ["胸痛/呼吸困难", "意识异常/抽搐", "持续严重头痛"],
    action: { label:"去记录血压", fn:"openQuickBP" }
  },
  labs_upload_peds: {
    title: "儿肾：上传/录入化验为什么重要？",
    subtitle: "儿科解读往往需要身高+肌酐单位+时间线",
    why: "儿科随访常需要把化验放在生长背景里解读；记录日期、单位与身高信息能显著提升复诊效率。",
    focus: ["肌酐单位与日期", "是否同时有身高记录（便于整理）", "尿检/蛋白尿与症状"],
    howto: ["建议同时记录身高与肌酐单位（医院间差异较大）", "有报告原件可上传资料库", "不要自行解读‘单次异常’决定用药"],
    usedfor: ["进入儿肾摘要与趋势整理（示意）", "帮助医生调整随访频率与评估计划"],
    redflags: ["明显少尿/无尿", "持续发热精神差"],
    action: { label:"去录入化验", fn:"openAddLab" }
  },
};

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

// renderGuidePage — now defined in js/render.js (modular version)
function defaultState(){
  const today = yyyyMMdd(new Date());
  return {
    version: VERSION,
    activeProgram: "kidney",
    enabledPrograms: { kidney: true, stone: false, peds: false, dialysis: false, htn: false, dm: false },
    ui: { overlayReturn: 'home', explainerId: '', showAI: true, homeMoreDefault: false, },
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

// Ensure active program is valid even if user disabled a previously-default program.
ensureActiveProgramEnabled();

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

function qs(sel, root=document){ return root.querySelector(sel); }
function qsa(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

function yyyyMMdd(d){
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function hhmm(d){
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}
function niceDate(s){
  if(!s) return "";
  return s.replaceAll("-","/");
}
function nowISO(){
  const d = new Date();
  return `${yyyyMMdd(d)} ${hhmm(d)}`;
}
function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }
function toNum(v){ const n = parseFloat(v); return Number.isFinite(n) ? n : null; }

function sparklineSvg(values, opts={}){
  const w = opts.w || 96;
  const h = opts.h || 26;
  const v = (values||[]).map(x=>toNum(x)).filter(x=>x!==null);
  if(v.length < 2) return "";
  let min = Math.min(...v);
  let max = Math.max(...v);
  if(min === max){
    // flat line: create a tiny range so we still render a visible path
    min = min - 1;
    max = max + 1;
  }
  const step = (w-2) / (v.length-1);
  const pts = v.map((num, i)=>{
    const x = 1 + i*step;
    const y = 1 + (h-2) * (1 - ((num-min)/(max-min)));
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const poly = pts.join(" ");
  return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${poly}" /></svg>`;
}

function computeAgeYears(dobStr){
  if(!dobStr) return null;
  const dob = new Date(dobStr);
  if(String(dob) === "Invalid Date") return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if(m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

function convertScrToMgDl(scr, unit){
  const v = toNum(scr);
  if(v === null) return null;
  if(unit === "mgdl") return v;
  // umol/L -> mg/dL (Cr: 88.4)
  return v / 88.4;
}

function pedsEgfrBedsideSchwartz(heightCm, scr, unit){
  const h = toNum(heightCm);
  const scrMg = convertScrToMgDl(scr, unit);
  if(h === null || scrMg === null || scrMg <= 0) return null;
  const egfr = 0.413 * h / scrMg;
  return Math.round(egfr * 10) / 10;
}

function parseDateFromDateTime(dt){
  if(!dt) return null;
  const d = String(dt).slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const x = new Date(d);
  if(Number.isNaN(x.getTime())) return null;
  return x;
}

function computeVelocityInfo(records, valueKey, opts={}){
  // Returns annualized velocity based on two points (prefer ~6 months window if available).
  const preferDays = toNum(opts.preferDays) ?? 180;
  const minDays = toNum(opts.minDays) ?? 30;
  const pts = (records || [])
    .map(r=>{
      const date = parseDateFromDateTime(r?.dateTime || r?.date);
      const v = toNum(r?.[valueKey]);
      return (date && v!==null) ? { date, v, raw:r } : null;
    })
    .filter(Boolean)
    .sort((a,b)=>a.date - b.date);

  if(pts.length < 2) return null;
  const last = pts[pts.length-1];
  const MS_DAY = 1000*60*60*24;

  let best = null;
  let bestScore = Infinity;
  for(let i=0; i<pts.length-1; i++){
    const p = pts[i];
    const days = (last.date - p.date) / MS_DAY;
    if(days < minDays) continue;
    const score = Math.abs(days - preferDays);
    if(score < bestScore){
      best = p;
      bestScore = score;
    }
  }
  if(!best) best = pts[pts.length-2];
  const days = (last.date - best.date) / MS_DAY;
  if(!(days > 0)) return null;
  const delta = last.v - best.v;
  const vel = (delta / days) * 365.25;
  return {
    perYear: Math.round(vel * 10) / 10,
    delta: Math.round(delta * 10) / 10,
    days: Math.round(days),
    fromDate: yyyyMMdd(best.date),
    toDate: yyyyMMdd(last.date),
    fromValue: best.v,
    toValue: last.v,
  };
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
        title:"血压非常高（示意）",
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
        title:"疑似低血糖风险（示意）",
        detail:"最近一次血糖偏低。若出现出汗、心慌、手抖、意识模糊/晕厥等，请立即按医嘱处理并联系医生/就医。"
      });
    } else if(gMmol >= 16.7){
      signals.push({
        level:"info",
        title:"血糖偏高（示意）",
        detail:"最近一次血糖偏高。若伴明显口渴、多尿、呕吐、呼吸深快/意识改变等，请尽快就医/联系团队。"
      });
    }
  }

  if(k !== null && k >= 5.5) signals.push({level:"danger", title:"血钾偏高（示意）", detail:"高钾可能引发心律问题；如出现心悸、胸痛、呼吸困难、明显乏力等红旗症状，请立即就医/联系团队。"});
  if(na !== null && na < 130) signals.push({level:"danger", title:"血钠偏低（示意）", detail:"严重低钠可出现意识混乱、抽搐等；如有相关症状请立即就医。"});
  if(mg !== null && mg < 0.65) signals.push({level:"danger", title:"血镁偏低（示意）", detail:"严重低镁可能导致心律异常/抽搐等；出现红旗症状请尽快就医。"});
  if(ca !== null && (ca < 2.0 || ca > 2.75)) signals.push({level:"info", title:"血钙异常（示意）", detail:"钙磷代谢异常常需结合其他指标评估。不要自行大量补钙或停药，按医嘱复查/咨询。"});

  // Dialysis-specific red flags (from latest dialysis record)
  if(state.enabledPrograms?.dialysis && state.dialysis?.sessions?.length){
    const last = state.dialysis.sessions[state.dialysis.sessions.length-1];
    if(last?.modality === "pd"){
      const cloudy = String(last.effluent||"").includes("浑浊");
      if(cloudy || last.fever || last.abdPain){
        signals.unshift({
          level:"danger",
          title:"腹透红旗（示意）",
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
    signals.push({level:"ok", title:"暂无突出实验室红旗（示意）", detail:"仍请关注胸痛、呼吸困难、意识改变、抽搐、少尿/无尿、发热伴剧烈腰痛等情况。"});
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

// renderLabsList — now defined in js/render.js (modular version with OCR badge + sparkline)

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

// renderMe — now defined in js/render.js (modular version)


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
  renderPremiumBadge();
  renderHome();
  renderRecords();
  renderDocsPage();
  renderFollowup();
  renderMe();
  renderAI();
  renderExplainPage();
  renderGuidePage();
  renderUsagePage();
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

function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

// ====== Local file vault (IndexedDB) ======
// 内测版：文件保存在本地 IndexedDB（仅当前设备/浏览器）。
// 正式版建议：文件上云（加密/权限/审计）并支持医生端共享。
const FILE_DB_NAME = "kidneyCareFilesDB";
const FILE_DB_VERSION = 1;
const FILE_STORE = "files";

function uid(prefix="id"){
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function humanFileSize(bytes){
  const b = Number(bytes||0);
  if(!Number.isFinite(b) || b <= 0) return "0 B";
  const units = ["B","KB","MB","GB"];
  let i = 0;
  let v = b;
  while(v >= 1024 && i < units.length-1){ v /= 1024; i++; }
  const n = (i === 0) ? Math.round(v) : Math.round(v*10)/10;
  return `${n} ${units[i]}`;
}

function openFilesDB(){
  return new Promise((resolve, reject)=>{
    try{
      const req = indexedDB.open(FILE_DB_NAME, FILE_DB_VERSION);
      req.onupgradeneeded = (e)=>{
        const db = req.result;
        if(!db.objectStoreNames.contains(FILE_STORE)){
          db.createObjectStore(FILE_STORE, { keyPath: "id" });
        }
      };
      req.onsuccess = ()=>resolve(req.result);
      req.onerror = ()=>reject(req.error);
    }catch(e){ reject(e); }
  });
}

async function idbPutFile(file){
  const db = await openFilesDB();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(FILE_STORE, "readwrite");
    const store = tx.objectStore(FILE_STORE);
    const id = uid("file");
    const rec = {
      id,
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size || 0,
      createdAt: Date.now(),
      blob: file
    };
    store.put(rec);
    tx.oncomplete = ()=>{ try{ db.close(); }catch(_e){} resolve(id); };
    tx.onerror = ()=>{ try{ db.close(); }catch(_e){} reject(tx.error || new Error("IDB 写入失败")); };
  });
}

async function idbGetFile(fileId){
  const db = await openFilesDB();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(FILE_STORE, "readonly");
    const store = tx.objectStore(FILE_STORE);
    const req = store.get(fileId);
    req.onsuccess = ()=>{ try{ db.close(); }catch(_e){} resolve(req.result || null); };
    req.onerror = ()=>{ try{ db.close(); }catch(_e){} reject(req.error || new Error("IDB 读取失败")); };
  });
}

async function idbDeleteFile(fileId){
  const db = await openFilesDB();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(FILE_STORE, "readwrite");
    const store = tx.objectStore(FILE_STORE);
    store.delete(fileId);
    tx.oncomplete = ()=>{ try{ db.close(); }catch(_e){} resolve(true); };
    tx.onerror = ()=>{ try{ db.close(); }catch(_e){} reject(tx.error || new Error("IDB 删除失败")); };
  });
}

function docCategoryLabel(key){
  const m = {
    biopsy_report: "肾活检报告",
    biopsy_image: "病理图片",
    genetic_report: "基因检测",
    immune_report: "免疫学/高级指标",
    imaging: "影像检查",
    discharge: "出院/门诊病历",
    lab_report: "化验单",
    other: "其他"
  };
  return m[key] || "其他";
}

function inferKidneyScope(){
  if(state.activeProgram !== "kidney") return state.activeProgram;
  if(state.kidney?.track === "tx") return "tx";
  if(state.kidney?.track === "glomerular"){
    const s = state.kidney?.glomerularSubtype || "unknown";
    return s;
  }
  if(state.kidney?.track === "adpkd") return "adpkd";
  if(state.kidney?.track === "genetic") return "genetic";
  return "kidney";
}

// ====== Advanced marker definitions (structured) ======
const MARKER_DEFS = {
  ddcfDNA: { key:"ddcfDNA", label:"dd-cfDNA（%）", unit:"%", scopes:["tx"], tip:"不同平台/单位可能不同；以移植中心解释为准。" },
  dsa: { key:"dsa", label:"DSA（供者特异性抗体）", unit:"", scopes:["tx"], tip:"建议上传完整报告；此处仅录入摘要字段。" },
  antiPLA2R: { key:"antiPLA2R", label:"anti-PLA2R（RU/mL）", unit:"RU/mL", scopes:["mn"], tip:"用于动态随访与复诊整理。" },
  antiTHSD7A: { key:"antiTHSD7A", label:"anti-THSD7A（可选）", unit:"", scopes:["mn"], tip:"如你有该检测，可作为补充录入/上传报告。" },
  antiNephrin: { key:"antiNephrin", label:"anti-nephrin（可选）", unit:"", scopes:["mcd","fsgs"], tip:"内测：建议优先上传报告原件；此处可录入阳性/阴性或滴度。" },
  dsDNA: { key:"dsDNA", label:"抗dsDNA", unit:"", scopes:["ln"], tip:"狼疮肾随访常用血清学指标之一。" },
  c3: { key:"c3", label:"补体C3", unit:"", scopes:["ln","c3g"], tip:"注意不同医院参考范围差异。" },
  c4: { key:"c4", label:"补体C4", unit:"", scopes:["ln"], tip:"注意不同医院参考范围差异。" },
};

// Map marker type -> dedicated explainer page (per-item explanation)
const MARKER_EXPLAINER_MAP = {
  ddcfDNA: 'mk_ddcfDNA',
  dsa: 'mk_dsa',
  antiPLA2R: 'mk_antiPLA2R',
  antiTHSD7A: 'mk_antiTHSD7A',
  antiNephrin: 'mk_antiNephrin',
  dsDNA: 'mk_dsDNA',
  c3: 'mk_c3',
  c4: 'mk_c4',
};

function markerExplainerId(type){
  return MARKER_EXPLAINER_MAP[type] || 'markers_advanced';
}

function markerLabel(key){ return MARKER_DEFS[key]?.label || key; }

function markerScopeFromState(){
  // markers are mainly for kidney program
  const scope = inferKidneyScope();
  return scope || "kidney";
}

function markerOptionsForCurrentUser(){
  const scope = markerScopeFromState();
  const defs = Object.values(MARKER_DEFS);
  return defs.filter(d => !d.scopes || d.scopes.includes(scope));
}

function doKnowledgeAction(id){
  const a = KNOWLEDGE.find(x=>x.id===id);
  if(!a) return;
  const fn = a.action?.fn;
  if(fn==="record_bp") openQuickBP();
  if(fn==="record_glucose") openQuickGlucose();
  if(fn==="record_urine") openAddUrine();
  if(fn==="record_labs") { navigate("records"); openAddLab(); }
  if(fn==="open_diet") openDietModal();
  if(fn==="open_triage") openTriageModal();
  if(fn==="record_meds") openMedsCheckModal();
  if(fn==="record_water") {
    state.activeProgram = "stone";
    saveState();
    renderAll();
    openProgramMainModal();
  }
  if(fn==="record_height") openQuickHeight();
  if(fn==="record_dialysis") {
    state.activeProgram = "dialysis";
    state.enabledPrograms.dialysis = true;
    saveState();
    renderAll();
    openDialysisSessionModal();
  }
}

function openKnowledgeModal(){
  const items = KNOWLEDGE
    .filter(a => a.tags.includes(state.activeProgram) || (state.activeProgram==="kidney" && a.tags.includes("kidney")) || a.tags.includes("safety"))
    .slice(0, 12);
  openSimpleModal(
    "知识库（内测）",
    "建议：短内容 + 一个行动；推送最终应由“阶段/状态”触发，而不仅是病名。",
    `
      ${items.map(a=>`
        <div class="list-item">
          <div class="t">${escapeHtml(a.title)}</div>
          <div class="s">${escapeHtml(a.body)}</div>
          <div class="row" style="margin-top:10px;">
            <button class="ghost small" data-knowledge="${a.id}">${escapeHtml(a.action.label)}</button>
          </div>
        </div>
      `).join("")}
    `,
    `<button class="ghost" data-close="modalSimple">关闭</button>`
  );
  qsa("#modalSimple button[data-knowledge]").forEach(btn=>{
    btn.onclick = ()=>doKnowledgeAction(btn.getAttribute("data-knowledge"));
  });
}

function dietFilterLabel(filter){
  const m = {
    all: "全部食物",
    highK: "高钾食物",
    highP: "高磷食物",
    both: "钾+磷双高",
    additiveP: "磷添加剂避坑",
    fav: "我的收藏",
  };
  return m[filter] || "食物库";
}

function normalizeQuery(s){
  return String(s||"").trim().toLowerCase();
}

function foodSearchText(food){
  const parts = [];
  if(food?.name) parts.push(String(food.name));
  if(Array.isArray(food?.aliases)) parts.push(food.aliases.join(" "));
  if(food?.summary) parts.push(String(food.summary));
  return parts.join(" ").toLowerCase();
}

function foodMatchesQuery(food, q){
  const qq = normalizeQuery(q);
  if(!qq) return true;
  return foodSearchText(food).includes(qq);
}

function foodMatchesFilter(food, filter){
  const tags = Array.isArray(food?.tags) ? food.tags : [];
  const hasK = tags.includes("highK");
  const hasP = tags.includes("highP") || tags.includes("additiveP");

  if(filter === "fav"){
    const fav = (state.diet && Array.isArray(state.diet.favorites)) ? state.diet.favorites : [];
    return fav.includes(food.id);
  }

  if(filter === "highK") return hasK;
  if(filter === "highP") return tags.includes("highP");
  if(filter === "additiveP") return tags.includes("additiveP");
  if(filter === "both") return tags.includes("double") || (hasK && hasP);
  return true; // all
}


function toggleFoodFavorite(foodId){
  if(!foodId) return;
  if(!state.diet) state.diet = defaultState().diet;
  const fav = Array.isArray(state.diet.favorites) ? state.diet.favorites : [];
  const idx = fav.indexOf(foodId);
  if(idx >= 0){
    fav.splice(idx, 1);
  }else{
    fav.unshift(foodId);
  }
  state.diet.favorites = fav.slice(0, 200);
  saveState();
}

function foodLevelBadge(levelKey){
  const meta = FOOD_LEVEL[levelKey] || FOOD_LEVEL.caution;
  const cls = badgeClass(meta.badge);
  return `<span class="badge ${cls}">${escapeHtml(meta.label)}</span>`;
}

function foodTagBadges(food){
  const tags = Array.isArray(food?.tags) ? food.tags : [];
  const uniq = [];
  for(const t of tags){
    if(!uniq.includes(t)) uniq.push(t);
  }
  return uniq.map(t=>{
    const def = FOOD_TAG[t];
    if(!def) return '';
    return `<div class="badge info">${escapeHtml(def.label)}</div>`;
  }).join('');
}

function renderDietList(){
  const listEl = qs('#dietList');
  const metaEl = qs('#dietMeta');
  if(!listEl) return;

  if(!state.diet) state.diet = defaultState().diet;
  const favSet = new Set(Array.isArray(state.diet.favorites) ? state.diet.favorites : []);

  const foods = FOOD_DB
    .filter(f => foodMatchesFilter(f, dietUI.filter))
    .filter(f => foodMatchesQuery(f, dietUI.query))
    .sort((a,b)=> (a.name||'').localeCompare(b.name||''));

  const chips = [];
  chips.push(`<div class="badge info">当前：${escapeHtml(dietFilterLabel(dietUI.filter))}</div>`);
  if(dietUI.query){
    chips.push(`<div class="badge ok">搜索：${escapeHtml(dietUI.query)}</div>`);
  }
  chips.push(`<div class="badge ok">共 ${foods.length} 项</div>`);
  if(favSet.size) chips.push(`<div class=\"badge info\">收藏 ${favSet.size}</div>`);
  if(metaEl) metaEl.innerHTML = `<div class="row">${chips.join('')}</div>`;

  if(!foods.length){
    listEl.innerHTML = `<div class="note">没有匹配结果。你可以换个关键词（例如“香蕉/番茄/可乐/火锅/代盐”），或切换上方筛选。</div>`;
    return;
  }

  listEl.innerHTML = foods.map(f=>{
    return `
      <div class="list-item">
        <div class="row" style="justify-content:space-between;align-items:center;">
          <div class="t">${escapeHtml(f.name)} &nbsp; ${foodLevelBadge(f.level)}</div>
          <button class="ghost small" data-fav="${escapeHtml(f.id)}" aria-label="收藏">${favSet.has(f.id) ? "★" : "☆"}</button>
        </div>
        <div class="s">${escapeHtml(f.summary||'')}</div>
        <div class="row" style="margin-top:8px;">${foodTagBadges(f)}</div>
        <div class="row" style="margin-top:8px;">
          <button class="ghost small" data-food="${escapeHtml(f.id)}">查看解释</button>
        </div>
      </div>
    `;
  }).join('');

  qsa('#dietList button[data-food]').forEach(btn=>{
    btn.onclick = ()=>{
      dietUI.view = 'detail';
      dietUI.selected = btn.getAttribute('data-food');
      renderDietModal();
    };
  });

  qsa('#dietList button[data-fav]').forEach(btn=>{
    btn.onclick = (e)=>{
      e.preventDefault();
      e.stopPropagation();
      const id = btn.getAttribute('data-fav');
      toggleFoodFavorite(id);
      renderDietList();
    };
  });
}

function renderDietFoodDetail(foodId){
  const food = FOOD_DB.find(f=>f.id===foodId);
  if(!food){
    dietUI.view = 'list';
    dietUI.selected = null;
    return renderDietModal();
  }

  if(!state.diet) state.diet = defaultState().diet;
  const favSet = new Set(Array.isArray(state.diet.favorites) ? state.diet.favorites : []);

  const lines = (arr)=>{
    if(!Array.isArray(arr) || !arr.length) return '<div class="s">—</div>';
    return `<div class="s">${arr.map(x=>`<div>• ${escapeHtml(x)}</div>`).join('')}</div>`;
  };

  const alt = (arr)=>{
    if(!Array.isArray(arr) || !arr.length) return '<div class="s">—</div>';
    return `<div class="s">${escapeHtml(arr.join('、'))}</div>`;
  };

  const body = `
    <div class="row">
      ${foodLevelBadge(food.level)}
      ${foodTagBadges(food)}
    </div>

    <div class="list-item">
      <div class="t">为什么要关注</div>
      ${lines(food.why)}
    </div>

    <div class="list-item">
      <div class="t">怎么做更省力（示意）</div>
      ${lines(food.tips)}
    </div>

    <div class="list-item">
      <div class="t">可替代的选择（示意）</div>
      ${alt(food.alternatives)}
    </div>

    ${food.caution ? `<div class="note subtle">备注：${escapeHtml(food.caution)}</div>` : ``}

    <div class="disclaimer" style="margin-top:12px;">
      <strong>边界：</strong>饮食内容用于健康教育与“避坑提醒”，不替代医生/营养师的个体化方案。
      若你出现心悸、胸痛、呼吸困难、意识异常、抽搐等红旗症状，请立即就医或联系团队。
    </div>
  `;

  openSimpleModal(
    food.name,
    `来源：内测教育库 v${DIET_LIBRARY_VERSION} · 点击“返回列表”继续搜索`,
    body,
    `<button class="ghost" id="btnDietBack">返回列表</button>
     <button class="primary" id="btnDietFav">${favSet.has(food.id) ? "★ 已收藏" : "☆ 收藏"}</button>
     <button class="ghost" data-close="modalSimple">关闭</button>`
  );

  setTimeout(()=>{
    const b = qs('#btnDietBack');
    if(b) b.onclick = ()=>{
      dietUI.view = 'list';
      dietUI.selected = null;
      renderDietModal();
    };

    const f = qs('#btnDietFav');
    if(f) f.onclick = ()=>{
      toggleFoodFavorite(food.id);
      // refresh detail to update button label
      renderDietFoodDetail(food.id);
    };
  },0);
}

function renderDietGuide(guideId){
  const g = DIET_GUIDES.find(x=>x.id===guideId);
  if(!g){
    dietUI.view = 'list';
    dietUI.guide = null;
    return renderDietModal();
  }

  const lines = (arr)=>{
    if(!Array.isArray(arr) || !arr.length) return '<div class="s">—</div>';
    return `<div class="s">${arr.map(x=>`<div>• ${escapeHtml(x)}</div>`).join('')}</div>`;
  };

  const body = `
    <div class="note subtle">专题指南 v${DIET_GUIDE_VERSION} · 以“少走弯路、容易坚持”为目标（内测教育内容）</div>

    ${state.comorbid?.masld ? `<div class="row"><div class="badge ok">你已标记：脂肪肝/MASLD</div></div>` : ``}

    ${g.sections.map(sec=>`
      <div class="list-item">
        <div class="t">${escapeHtml(sec.t)}</div>
        ${lines(sec.s)}
      </div>
    `).join('')}

    ${g.footer ? `<div class="note subtle">${escapeHtml(g.footer)}</div>` : ``}

    <div class="disclaimer" style="margin-top:12px;">
      <strong>边界：</strong>本指南用于健康教育与随访自我管理提示，不替代医生/营养师的个体化处方。
      若出现黄疸、呕血黑便、明显腹胀、意识异常或严重不适，请及时就医。
    </div>
  `;

  openSimpleModal(
    g.title,
    g.subtitle,
    body,
    `<button class="ghost" id="btnDietGuideBack">返回饮食中心</button>
     <button class="ghost" data-close="modalSimple">关闭</button>`
  );

  setTimeout(()=>{
    const b = qs('#btnDietGuideBack');
    if(b) b.onclick = ()=>{
      dietUI.view = 'list';
      dietUI.guide = null;
      renderDietModal();
    };
  },0);
}

function renderDietModal(){
  if(dietUI.view === 'detail' && dietUI.selected){
    return renderDietFoodDetail(dietUI.selected);
  }

  if(dietUI.view === 'guide' && dietUI.guide){
    return renderDietGuide(dietUI.guide);
  }

  // list view
  const tags = dietSignals();
  const focus = dietFocus();
  const focusLines = [];
  if(focus.highK) focusLines.push('血钾偏高：优先看“高钾食物/代盐避坑”。');
  if(focus.highP) focusLines.push('血磷偏高：优先看“磷添加剂避坑”。');

  const hasMasld = !!state.comorbid?.masld;

  const tagsHtml = tags.length
    ? `<div class="row">${tags.map(t=>`<div class=\"badge info\">${escapeHtml(t.label)}</div>`).join('')}</div>`
    : `<div class="note">尚未发现突出饮食关注点（示意）。你仍可以用食物库自查“能不能吃”。</div>`;

  const body = `
    <div class="note subtle">提示：点任意食物，查看“为什么要关注 + 替代选择”。（内测教育库，不替代医生/营养师）</div>

    ${tagsHtml}

    ${focusLines.length ? `<div class="list-item"><div class="t">本周重点</div><div class="s">${escapeHtml(focusLines.join(' '))}</div></div>` : ``}

    <div class="list-item">
      <div class="t">专题指南</div>
      <div class="s">${hasMasld ? '你已标记脂肪肝/MASLD：建议按“减重 + 少糖少加工”为核心。' : '如你有脂肪肝/脂肪性肝炎（NASH/MASH），可参考“减重 + 少糖少加工”的饮食思路。'}</div>
      <div class="row" style="margin-top:10px;">
        <button class="primary small" data-diet-guide="masld">脂肪肝/MASLD（NASH/MASH）饮食要点</button>
      </div>
      <div class="note subtle">提示：本指南会提醒与肾病限钾/控磷如何兼容，避免照搬导致混乱。</div>
    </div>

    <div class="two" style="margin-top:10px;">
      <button class="tile" data-diet-filter="highK">高钾食物</button>
      <button class="tile" data-diet-filter="highP">高磷食物</button>
    </div>
    <div class="two" style="margin-top:10px;">
      <button class="tile" data-diet-filter="both">钾+磷双高</button>
      <button class="tile" data-diet-filter="additiveP">磷添加剂避坑</button>
    </div>
    <div class="two" style="margin-top:10px;">
      <button class="tile" data-diet-filter="fav">我的收藏</button>
      <button class="tile" data-diet-filter="all">全部</button>
    </div>

    <label class="field" style="margin-top:12px;">
      <span>搜索食物</span>
      <input id="dietSearch" type="text" placeholder="输入：香蕉、番茄、可乐、火锅、代盐…" />
      <div class="note subtle">小技巧：很多患者的坑在“代盐/饮料/汤底/加工肉”。</div>
    </label>

    <div id="dietMeta"></div>
    <div id="dietList"></div>
  `;

  openSimpleModal(
    '饮食中心（v1）',
    '高钾/高磷食物库 · 每项单独解释 · 便于随访自我管理',
    body,
    `<button class="ghost" data-close="modalSimple">关闭</button>`
  );

  // bind filters
  qsa('#modalSimple [data-diet-filter]').forEach(btn=>{
    btn.onclick = ()=>{
      dietUI.filter = btn.getAttribute('data-diet-filter') || 'all';
      if(state.diet){
        state.diet.lastFilter = dietUI.filter;
        saveState();
      }
      renderDietList();
    };
  });

  // bind guides
  qsa('#modalSimple [data-diet-guide]').forEach(btn=>{
    btn.onclick = ()=>{
      dietUI.view = 'guide';
      dietUI.guide = btn.getAttribute('data-diet-guide');
      renderDietModal();
    };
  });

  // search
  const input = qs('#dietSearch');
  if(input){
    input.value = dietUI.query || '';
    input.oninput = ()=>{
      dietUI.query = input.value;
      if(state.diet){
        state.diet.lastQuery = dietUI.query;
        saveState();
      }
      renderDietList();
    };
    input.onkeydown = (e)=>{
      if(e.key === 'Enter'){
        e.preventDefault();
      }
    };
  }

  renderDietList();
}

function openDietModal(initialFilter){
  // persist only last filter/query; avoid breaking old localStorage
  if(!state.diet) state.diet = defaultState().diet;

  const focus = dietFocus();
  const derived = (focus.highK && focus.highP) ? 'both' : (focus.highK ? 'highK' : (focus.highP ? 'highP' : 'all'));

  dietUI.view = 'list';
  dietUI.selected = null;
  dietUI.guide = null;
  dietUI.filter = initialFilter || state.diet.lastFilter || derived;
  dietUI.query = state.diet.lastQuery || '';

  state.diet.lastFilter = dietUI.filter;
  state.diet.lastQuery = dietUI.query;
  saveState();

  renderDietModal();
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
    "红旗分诊（示意）",
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
// NOTE: 内测版仅提供“UI + 接口占位 + 示例数据”。正式版需要：医生/机构库、地理编码、
// 合规与质量审核（避免误导/广告/灰产），并为患者提供透明的信息来源与更新时间。
const PROVIDER_MOCK = [
  { id:"p1", name:"示例：某三甲医院 肾内科门诊", specialties:["nephrology"], city:"北京", address:"东城区（示意）", lat:39.9042, lng:116.4074 },
  { id:"p2", name:"示例：某医院 透析中心", specialties:["dialysis"], city:"北京", address:"西城区（示意）", lat:39.9139, lng:116.3740 },
  { id:"p3", name:"示例：某医院 泌尿外科结石门诊", specialties:["urology"], city:"上海", address:"浦东（示意）", lat:31.2304, lng:121.4737 },
  { id:"p4", name:"示例：某儿童医院 儿肾专科", specialties:["peds_nephrology"], city:"广州", address:"越秀（示意）", lat:23.1291, lng:113.2644 },
  { id:"p5", name:"示例：某肾内科团队（社区/互联网）", specialties:["nephrology"], city:"线上", address:"可按医院/城市检索（示意）", lat:null, lng:null },
];

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
    {key:"all", label:"全部（示意）"},
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
        results.innerHTML = `<div class="note">暂无匹配结果（示意）。你可以尝试调整范围/关键词/城市。</div>`;
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
      if(status) status.textContent = locHint ? `${locHint} · 返回 ${arr.length} 条（示意）` : `返回 ${arr.length} 条（示意）`;
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
    <div class="note">提示：内测先做“可用”，后续会接拍照识别、置信度、纠错确认与来源定位。</div>
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
  openSimpleModal("新增化验（内测）","录入后会触发：饮食提醒/安全提醒/计划建议（示意）", body,
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
    closeModal("modalSimple");
    renderAll();
  };
}

function openAddUrine(){
  const body = `
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
  openSimpleModal("新增尿检记录","肾小球病/ADPKD 建议做时间线记录（示意）", body,
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
  const subtitle = mod === "pd" ? "腹透：记录 UF/透析液/红旗（示意）" : "血透：记录透前/透后 + 超滤量（示意）";

  const baseNote = `<div class="note">内测版：以“结构化记录 + 复诊整理”为主。任何红旗（胸痛、气促、抽搐、腹透液混浊/腹痛/发热等）请优先联系透析团队/就医。</div>`;

  let body = "";
  if(mod === "hd"){
    body = `
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
    <div class="two">
      <label class="field"><span>收缩压</span><input id="bpSys" type="number" inputmode="numeric" placeholder="例如：120"></label>
      <label class="field"><span>舒张压</span><input id="bpDia" type="number" inputmode="numeric" placeholder="例如：80"></label>
    </div>
    <label class="field"><span>场景（可选）</span><input id="bpCtx" type="text" placeholder="例如：早晨、服药前、运动后"></label>
    <div class="note subtle">${state.activeProgram==="peds" ? "儿童血压通常需要按年龄/性别/身高百分位解读；本内测版先做记录与整理。" : "不建议仅看单次数值；更推荐周均值与波动。"} </div>
  `;
  openSimpleModal("记录血压","将自动进入随访摘要（示意）", body,
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
    closeModal("modalSimple");
    renderAll();
  };
}

function openQuickWeight(){
  const body = `
    <label class="field"><span>体重（kg）</span><input id="wKg" type="number" inputmode="decimal" placeholder="例如：62.5"></label>
    <div class="note subtle">水肿/体液变化时，体重趋势很关键（示意）。</div>
  `;
  openSimpleModal("记录体重","将用于趋势与复诊摘要", body,
    `<button class="primary" id="btnSaveW">保存</button><button class="ghost" data-close="modalSimple">取消</button>`);
  qs("#btnSaveW").onclick = ()=>{
    const kg = toNum(qs("#wKg").value);
    if(kg===null){ alert("请填写体重"); return; }
    state.vitals.weight.push({ dateTime: nowISO(), kg });
    saveState();
    closeModal("modalSimple");
    renderAll();
  };
}

function openQuickHeight(){
  const body = `
    <label class="field"><span>身高（cm）</span><input id="hCm" type="number" inputmode="decimal" placeholder="例如：128"></label>
    <div class="note subtle">儿肾随访建议至少每月记录一次身高（或按医嘱）。身高也用于儿科 eGFR 估算（示意）。</div>
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
  openSimpleModal("记录血糖","适用于糖尿病/移植激素相关血糖波动（示意）", body,
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
    <label class="field"><span>体温（℃）</span><input id="tVal" type="number" inputmode="decimal" placeholder="例如：36.8"></label>
    <div class="note subtle">移植/免疫抑制期出现发热请及时联系团队（示意）。</div>
  `;
  openSimpleModal("记录体温","用于感染风险随访（示意）", body,
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
  openSimpleModal("用药打卡","记录依从性（示意）", body,
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
    `<label class="field"><span>饮水量（ml）</span><input id="waterCustomMl" type="number" inputmode="numeric" placeholder="例如 200" /></label>`,
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

// Bind global UI actions
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


function aiPush(role, text){
  state.chat.push({role, text});
  saveState();
  renderAI();
}

function aiEnsureOnAIPage(){
  // stay on AI page so user sees the output
  navigate("ai");
}

function aiQuickExplain(){
  const lab = latestLab();
  const diet = dietSignals().map(t=>t.label).join("、");
  const prog = state.activeProgram;
  const lines = [];
  lines.push("【解读最近化验（随访整理，不替代医生）】");
  if(!lab){
    lines.push("- 目前没有化验记录：建议到“记录→化验录入”补充一次。");
  } else {
    lines.push(`- 日期：${niceDate(lab.date||"—")}`);
    const items = [];
    if(lab.scr) items.push(`肌酐 ${lab.scr}${lab.scrUnit==="mgdl"?"mg/dL":"μmol/L"}`);
    if(lab.egfr) items.push(`eGFR ${lab.egfr}`);
    if(lab.k) items.push(`血钾 ${lab.k}`);
    if(lab.na) items.push(`血钠 ${lab.na}`);
    if(lab.ca) items.push(`血钙 ${lab.ca}`);
    if(lab.p) items.push(`血磷 ${lab.p}`);
    if(lab.mg) items.push(`血镁 ${lab.mg}`);
    if(lab.glu) items.push(`血糖 ${lab.glu}`);
    if(lab.hba1c) items.push(`HbA1c ${lab.hba1c}`);
    lines.push(`- 关键项：${items.join(" · ") || "—"}`);
    if(diet) lines.push(`- 饮食关注点（示意）：${diet}`);
  }
  lines.push("");
  lines.push("【建议你带去复诊的 3 个问题】");
  if(prog==="dialysis"){
    lines.push("1）我的间期体重增长与干体重是否合适？控水/控盐目标是否需要调整？");
    lines.push("2）最近电解质（尤其血钾/血磷）是否需要进一步处理（药物/透析参数/饮食宣教）？");
    lines.push("3）通路（或腹透出口/透析液）有没有需要优先排查的风险点？");
  } else if(prog==="stone"){
    lines.push("1）是否需要进一步影像复查或代谢评估（如24小时尿）？");
    lines.push("2）我的饮水策略是否合适？若有心衰/透析限水，该怎么平衡？");
    lines.push("3）出现哪些症状必须立刻就医（红旗）？");
  } else if(prog==="peds"){
    lines.push("1）这次化验放在孩子身高/年龄背景下意味着什么？随访频率要不要调整？");
    lines.push("2）近期生长（身高/体重）是否符合预期？需要营养/药物/补充剂评估吗？");
    lines.push("3）血压家庭监测方案怎么做更合适？是否需要进一步检查（由儿肾医生决定）？");
  } else {
    lines.push("1）这次肾功能/电解质的变化是否需要调整随访频率或检查项目？");
    lines.push("2）血压/体重/尿检趋势是否提示需要加强某个管理环节？");
    lines.push("3）我当前的饮食/用药注意事项有哪些（以医嘱为准）？");
  }
  lines.push("");
  lines.push("提示：如出现胸痛、呼吸困难、意识改变、抽搐、少尿/无尿、发热伴剧烈腰痛等红旗，请立即就医或联系团队。");
  aiPush("ai", lines.join("\n"));
  aiEnsureOnAIPage();
}

function aiQuickQuestions(){
  const prog = state.activeProgram;
  const lines = [];
  lines.push("【复诊问题清单（可直接复制）】");
  if(prog==="kidney"){
    lines.push("1）我目前 CKD 分期/风险评估如何？接下来 3 个月最重要的目标是什么？");
    lines.push("2）血压/体重/尿蛋白（如有）趋势意味着什么？需要调整治疗或检查频率吗？");
    lines.push("3）我需要重点避免哪些药物/食物/补充剂？（尤其是保健品）");
  } else if(prog==="dialysis"){
    lines.push("1）干体重是否需要调整？间期体重增长目标是多少？");
    lines.push("2）电解质（钾/磷/钙/镁）哪一项最需要优先处理？");
    lines.push("3）通路/腹透出口护理有没有需要升级的地方？哪些症状属于红旗？");
  } else if(prog==="stone"){
    lines.push("1）我属于哪类结石风险？是否需要 24 小时尿或代谢评估？");
    lines.push("2）影像复查的频率与方式（超声/CT）怎么安排？");
    lines.push("3）在限水/心衰/透析等情况下，结石预防的饮水策略怎么做更安全？");
  } else if(prog==="peds"){
    lines.push("1）孩子近期生长是否达标？是否需要营养方案或进一步评估？");
    lines.push("2）血压如何监测与解读？是否需要更系统的监测（由医生决定）？");
    lines.push("3）未来 3–6 个月我们最应该关注的指标是什么？");
  }
  lines.push("");
  lines.push("我已准备：化验单/记录趋势/一页摘要（可在“我的→复制摘要”获取）。");
  aiPush("ai", lines.join("\n"));
  aiEnsureOnAIPage();
}

function aiQuickMessage(){
  const prog = programLabel(state.activeProgram);
  const text = buildExportText();
  const lines = [];
  lines.push(`医生您好，我是患者（或家属），想就【${prog}】随访请教。下面是一页摘要（内测 App 自动整理）：`);
  lines.push(text);
  lines.push("");
  lines.push("谢谢医生！如需我补充其他记录/化验，请告知。");
  aiPush("ai", lines.join("\n"));
  aiEnsureOnAIPage();
}

function aiQuickTriage(){
  // Prefer the existing triage modal to avoid pseudo-medical advice in text form.
  aiPush("ai", "我已为你打开【红旗分诊】。如果出现胸痛、呼吸困难、意识改变、抽搐、少尿/无尿、发热伴剧烈腰痛等情况，请立即就医或联系随访团队。");
  openTriageModal();
  aiEnsureOnAIPage();
}

function sendChat(){
  const input = qs("#chatInput");
  const text = input.value.trim();
  if(!text) return;
  state.chat.push({role:"me", text});
  // simple deterministic response for demo
  const response = generateAIDemoResponse(text);
  state.chat.push({role:"ai", text: response});
  input.value = "";
  saveState();
  renderAI();
}

function generateAIDemoResponse(text){
  // very simple: provide structure, not medical decisions
  const prog = state.activeProgram;
  const lab = latestLab();
  const diet = dietSignals().map(t=>t.label).join("、");
  const parts = [];
  parts.push("我可以帮你把这次情况整理成“复诊更高效”的结构：");
  parts.push("1）事实（你记录的数据）：");
  if(lab && (lab.scr || lab.k || lab.glu)){
    const facts = [];
    if(lab.scr) facts.push(`肌酐：${lab.scr}${lab.scrUnit==="mgdl"?"mg/dL":"μmol/L"}`);
    if(lab.egfr) facts.push(`eGFR：${lab.egfr}`);
    if(lab.k) facts.push(`血钾：${lab.k}`);
    if(lab.na) facts.push(`血钠：${lab.na}`);
    if(lab.glu) facts.push(`血糖：${lab.glu}`);
    parts.push(`- 最近化验（${niceDate(lab.date||"")}）：${facts.join("、")}`);
  } else {
    parts.push("- 目前还没有关键化验记录；建议先录入一次化验或上传报告。");
  }
  parts.push("2）你可以问医生的 3 个问题（示意）：");
  if(prog==="peds"){
    parts.push("- 这次结果放在孩子的年龄/身高背景下意味着什么？是否需要调整随访频率？");
    parts.push("- 近期生长（身高体重）是否符合预期？是否需要营养/药物方面的进一步评估？");
    parts.push("- 儿童血压需要怎么监测（是否需要ABPM/家庭测量方案）？");
  } else if(prog==="stone"){
    parts.push("- 是否需要进一步影像（超声/CT）或代谢评估（如24小时尿）？");
    parts.push("- 我目前的饮水策略是否合适（是否存在限水/心衰等冲突）？");
    parts.push("- 出现哪些症状需要立即就医？");
  } else {
    parts.push("- 这次变化属于波动还是趋势？下一次复查建议什么时候做？");
    parts.push("- 目前的用药/生活方式目标是否需要调整（以医嘱为准）？");
    parts.push("- 出现哪些情况需要我立即联系团队？");
  }
  parts.push("3）今天你能做的 1 件事：");
  parts.push("- 在首页“今日行动”把血压/体重/尿检或身高体重记录补齐，然后复制“一页摘要”发给医生。");
  if(diet) parts.push(`4）饮食关注点（示意）：${diet}（仅教育提示，具体以医生/营养师方案为准）`);
  parts.push("如果你现在有胸痛/呼吸困难/意识改变/抽搐/少尿无尿/发热伴剧烈腰痛等红旗，请立即就医或联系团队。");
  return parts.join("\n");
}

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

function init(){
  // Ensure at least one program + active program is enabled
  ensureActiveProgramEnabled();
  // ensure stone enabled boolean coherent
  state.enabledPrograms.stone = !!state.enabledPrograms.stone;
  state.enabledPrograms.peds = !!state.enabledPrograms.peds;
  state.enabledPrograms.dialysis = !!state.enabledPrograms.dialysis;

  registerSW();
  bindUI();
  renderProgramList();
  renderAll();
  navigate("home");
}

init();
