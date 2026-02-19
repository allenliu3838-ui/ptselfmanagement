/* ai.js - AI chat and demo response generation */

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
    lines.push("- 目前没有化验记录：建议到"记录→化验录入"补充一次。");
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
  lines.push("我已准备：化验单/记录趋势/一页摘要（可在"我的→复制摘要"获取）。");
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
  parts.push("我可以帮你把这次情况整理成"复诊更高效"的结构：");
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
  parts.push("- 在首页"今日行动"把血压/体重/尿检或身高体重记录补齐，然后复制"一页摘要"发给医生。");
  if(diet) parts.push(`4）饮食关注点（示意）：${diet}（仅教育提示，具体以医生/营养师方案为准）`);
  parts.push("如果你现在有胸痛/呼吸困难/意识改变/抽搐/少尿无尿/发热伴剧烈腰痛等红旗，请立即就医或联系团队。");
  return parts.join("\n");
}
