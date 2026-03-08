/* premium.js - Premium membership framework + compliance tracking */

// ====== Membership State ======

const PREMIUM_KEY = "kidneyCarePremium";

function loadPremiumState(){
  try{
    const raw = localStorage.getItem(PREMIUM_KEY);
    if(!raw) return { tier:"free", activatedAt:null, expiresAt:null };
    return JSON.parse(raw);
  }catch(_e){ return { tier:"free", activatedAt:null, expiresAt:null }; }
}

function savePremiumState(ps){
  try{ localStorage.setItem(PREMIUM_KEY, JSON.stringify(ps)); }catch(_e){}
}

// Internal beta: all features free for everyone. Flip to false when going to production.
const BETA_ALL_FREE = true;

function isPremium(){
  if(BETA_ALL_FREE) return true;
  const ps = loadPremiumState();
  if(ps.tier === "free") return false;
  if(ps.expiresAt){
    return new Date(ps.expiresAt) > new Date();
  }
  return true;
}

function premiumTierLabel(){
  if(BETA_ALL_FREE) return "v";
  return isPremium() ? "会员版" : "免费版";
}

// Pricing config
const PRICING = {
  monthly: { label:"月付", price: 8, unit:"月", days: 30 },
  yearly:  { label:"年付（8折）", price: 76.8, unit:"年", days: 365, discount:"8折", originalPrice: 96 },
};

function activatePremium(plan="yearly"){
  const p = PRICING[plan] || PRICING.yearly;
  const now = new Date();
  const expires = new Date(now.getTime() + p.days*24*3600*1000);
  savePremiumState({ tier:"member", plan, activatedAt: now.toISOString(), expiresAt: expires.toISOString() });
}

// ====== Premium Feature Gating ======

const PREMIUM_FEATURES = {
  ocrScan:       { label:"拍照录入", desc:"拍摄化验单自动识别提取指标数据（免费3次，会员无限）", free: true },
  trendCharts:   { label:"趋势图表", desc:"化验/血压/体重的可视化趋势图", free: true },
  trendAnalysis: { label:"智能趋势解读", desc:"通俗语言分析指标变化，给出就医建议", free: false },
  visitPrep:     { label:"复诊准备包", desc:"自动生成指标变化+建议问医生的问题清单", free: false },
  familyShare:   { label:"家属共享", desc:"生成共享码，家人远程查看你的健康概况", free: false },
  dietPersonal:  { label:"个性化饮食建议", desc:"根据最新化验结果动态生成饮食方案", free: false },
  weeklyReport:  { label:"周报摘要", desc:"每周自动生成健康管理报告", free: false },
  cloudSync:     { label:"云端同步", desc:"多设备同步 + 数据加密备份", free: false, upcoming: true },
  exportPDF:     { label:"PDF 导出", desc:"一键导出美观的复诊报告 PDF", free: false, upcoming: true },
};

function canUseFeature(featureKey){
  const feat = PREMIUM_FEATURES[featureKey];
  if(!feat) return true;
  if(feat.free) return true;
  return isPremium();
}

function requirePremium(featureKey, callback){
  if(canUseFeature(featureKey)){
    callback();
  } else {
    openUpgradeModal(featureKey);
  }
}

// ====== Upgrade Modal ======

function openUpgradeModal(featureKey){
  const feat = PREMIUM_FEATURES[featureKey];
  const triggerLabel = feat ? feat.label : "此功能";

  let featListHtml = "";
  Object.entries(PREMIUM_FEATURES).forEach(([k,f])=>{
    const isCurrent = k === featureKey;
    const upcoming = f.upcoming ? ' <span class="badge" style="font-size:9px;">即将推出</span>' : "";
    const highlight = isCurrent ? ' style="background:#f0f7ff;border-color:#1a5fe6;"' : "";
    featListHtml += `<div class="list-item"${highlight}>
      <div class="t">${f.free?"✅":"⭐"} ${escapeHtml(f.label)}${upcoming}</div>
      <div class="s">${escapeHtml(f.desc)}</div>
    </div>`;
  });

  const bodyHtml = `
    <div class="note" style="margin-bottom:12px;">
      <b>"${escapeHtml(triggerLabel)}"</b> 是会员功能。升级后解锁全部高级功能：
    </div>
    ${featListHtml}
    <div style="margin-top:14px;">
      <div class="plan-picker" style="display:flex;gap:10px;justify-content:center;">
        <label class="plan-option" id="planMonthly" style="flex:1;max-width:140px;text-align:center;padding:12px 8px;border-radius:12px;border:2px solid var(--border);cursor:pointer;transition:border-color .2s;">
          <input type="radio" name="premiumPlan" value="monthly" style="display:none;">
          <div style="font-size:22px;font-weight:900;color:var(--text);">¥8<span style="font-size:13px;color:var(--muted);font-weight:400;">/月</span></div>
          <div style="font-size:11px;color:var(--muted);margin-top:4px;">按月订阅</div>
        </label>
        <label class="plan-option selected" id="planYearly" style="flex:1;max-width:140px;text-align:center;padding:12px 8px;border-radius:12px;border:2px solid var(--primary);cursor:pointer;background:#f0f7ff;transition:border-color .2s;position:relative;">
          <input type="radio" name="premiumPlan" value="yearly" checked style="display:none;">
          <div style="position:absolute;top:-8px;right:-4px;background:var(--danger);color:#fff;font-size:9px;font-weight:700;padding:2px 6px;border-radius:6px;">省 ¥19.2</div>
          <div style="font-size:22px;font-weight:900;color:var(--primary);">¥76.8<span style="font-size:13px;color:var(--muted);font-weight:400;">/年</span></div>
          <div style="font-size:11px;color:var(--muted);margin-top:4px;"><s>¥96</s> 8折</div>
        </label>
      </div>
      <div class="note subtle" style="text-align:center;margin-top:8px;">年付更划算，相当于每月只需 ¥6.4</div>
    </div>
  `;

  openSimpleModal("升级会员版", "解锁更多健康管理功能", bodyHtml, `
    <button class="primary" id="btnUpgradeNow">立即升级</button>
    <button class="ghost" data-close="modalSimple">暂不升级</button>
  `);

  setTimeout(()=>{
    // Plan picker toggle
    const pm = qs("#planMonthly");
    const py = qs("#planYearly");
    const btnUp = qs("#btnUpgradeNow");

    function selectPlan(el, other){
      el.style.borderColor = "var(--primary)";
      el.style.background = "#f0f7ff";
      other.style.borderColor = "var(--border)";
      other.style.background = "";
    }
    if(pm) pm.onclick = ()=>{ pm.querySelector("input").checked=true; selectPlan(pm,py); };
    if(py) py.onclick = ()=>{ py.querySelector("input").checked=true; selectPlan(py,pm); };

    if(btnUp) btnUp.onclick = ()=>{
      const selected = document.querySelector('input[name="premiumPlan"]:checked');
      const plan = selected ? selected.value : "yearly";
      openPaymentFlow(plan);
    };
    qsa("#modalSimple [data-close]").forEach(b=>b.onclick = ()=>closeModal("modalSimple"));
  }, 0);
}

function openPaymentFlow(plan="yearly"){
  const p = PRICING[plan];
  closeModal("modalSimple");
  openSimpleModal("支付确认", "", `
    <div style="text-align:center;">
      <div style="margin-bottom:8px;">
        <span style="font-size:12px;color:var(--muted);">已选：</span>
        <span style="font-weight:700;">${escapeHtml(p.label)} ¥${p.price}/${p.unit}</span>
      </div>
      <div style="font-size:16px;margin-bottom:12px;">免费体验全部功能</div>
      <div class="note subtle">正式版将接入微信支付/支付宝，敬请期待</div>
    </div>
  `, `
    <button class="primary" id="btnActivateFree">免费激活体验</button>
    <button class="ghost" data-close="modalSimple">取消</button>
  `);
  setTimeout(()=>{
    const btn = qs("#btnActivateFree");
    if(btn) btn.onclick = ()=>{
      activatePremium(plan);
      closeModal("modalSimple");
      toast("已激活，全部功能已解锁");
      renderAll();
    };
    qsa("#modalSimple [data-close]").forEach(b=>b.onclick = ()=>closeModal("modalSimple"));
  }, 0);
}


// ====== Compliance & Engagement Tracking ======

function computeComplianceStats(days=7){
  const result = { days, tasksTotal:0, tasksDone:0, daysActive:0, streakCurrent:0, streakLongest:0 };

  const now = new Date();
  for(let i = 0; i < days; i++){
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = yyyyMMdd(d);
    const dayTasks = state.tasksDone?.[key];
    if(dayTasks && typeof dayTasks === "object"){
      const doneCount = Object.values(dayTasks).filter(v=>v===true).length;
      if(doneCount > 0) result.daysActive++;
      result.tasksDone += doneCount;
      result.tasksTotal += Math.max(doneCount, Object.keys(dayTasks).length);
    }
  }

  result.streakCurrent = state.engagement?.streak || 0;
  result.streakLongest = state.engagement?.longestStreak || 0;
  result.complianceRate = result.tasksTotal > 0 ? Math.round((result.tasksDone/result.tasksTotal)*100) : 0;

  return result;
}

function buildWeeklyReport(){
  const stats = computeComplianceStats(7);
  const insights = analyzeTrends();
  const safety = safetySignals();

  const lines = [];
  lines.push("【KidneySphere Followup · 周报】");
  lines.push(`生成时间：${nowISO()}`);
  lines.push(`项目：${programLabel(state.activeProgram)}`);
  lines.push("");

  // Compliance
  lines.push("📋 本周执行情况");
  lines.push(`• 活跃天数：${stats.daysActive}/7`);
  lines.push(`• 任务完成率：${stats.complianceRate}%`);
  lines.push(`• 当前连续打卡：${stats.streakCurrent} 天`);
  lines.push(`• 历史最长连续：${stats.streakLongest} 天`);
  lines.push("");

  // Trends
  if(insights.length){
    lines.push("📊 指标趋势");
    insights.forEach(i=>{
      const icon = i.level==="danger"?"🔴":i.level==="warn"?"🟡":"🟢";
      lines.push(`${icon} ${i.title}：${i.detail}`);
    });
    lines.push("");
  }

  // Safety
  const dangerSignals = safety.filter(s=>s.level==="danger");
  if(dangerSignals.length){
    lines.push("🚨 安全提醒");
    dangerSignals.forEach(s=>{
      lines.push(`• ${s.title}：${s.detail}`);
    });
    lines.push("");
  }

  lines.push("下周建议：");
  if(stats.complianceRate < 50) lines.push("• 尝试每天至少完成 1 项记录任务（哪怕只测一次血压）");
  if(stats.complianceRate >= 50 && stats.complianceRate < 80) lines.push("• 继续保持，争取完成率 80% 以上");
  if(stats.complianceRate >= 80) lines.push("• 优秀！保持当前节奏，复诊时展示周报给医生");
  lines.push("• 按时服药，遵医嘱调整");
  lines.push("");
  lines.push("提醒：以上为自动生成的趋势整理，不替代医生诊断。");

  return lines.join("\n");
}

function openWeeklyReportModal(){
  requirePremium("weeklyReport", ()=>{
    const text = buildWeeklyReport();
    const stats = computeComplianceStats(7);

    const rateColor = stats.complianceRate >= 80 ? "var(--ok)" : stats.complianceRate >= 50 ? "#f59e0b" : "var(--danger)";

    const bodyHtml = `
      <div style="display:flex;gap:12px;margin-bottom:14px;flex-wrap:wrap;">
        <div style="flex:1;min-width:80px;text-align:center;padding:10px;background:#f5f7fb;border-radius:12px;">
          <div style="font-size:24px;font-weight:900;color:${rateColor};">${stats.complianceRate}%</div>
          <div style="font-size:11px;color:var(--muted);">完成率</div>
        </div>
        <div style="flex:1;min-width:80px;text-align:center;padding:10px;background:#f5f7fb;border-radius:12px;">
          <div style="font-size:24px;font-weight:900;">${stats.daysActive}/7</div>
          <div style="font-size:11px;color:var(--muted);">活跃天数</div>
        </div>
        <div style="flex:1;min-width:80px;text-align:center;padding:10px;background:#f5f7fb;border-radius:12px;">
          <div style="font-size:24px;font-weight:900;">${stats.streakCurrent}</div>
          <div style="font-size:11px;color:var(--muted);">连续打卡</div>
        </div>
      </div>
      <div style="white-space:pre-wrap;font-size:12px;line-height:1.6;background:#f9fafb;padding:10px;border-radius:10px;max-height:40vh;overflow:auto;">${escapeHtml(text)}</div>
    `;
    openSimpleModal("本周报告", `${niceDate(yyyyMMdd(new Date()))}`, bodyHtml, `
      <button class="ghost" id="btnCopyWeekly">复制周报</button>
      <button class="ghost" data-close="modalSimple">关闭</button>
    `);
    setTimeout(()=>{
      const btn = qs("#btnCopyWeekly");
      if(btn) btn.onclick = async ()=>{
        try{ await navigator.clipboard.writeText(text); toast("已复制周报"); }
        catch(_e){ prompt("复制：", text); }
      };
      qsa("#modalSimple [data-close]").forEach(b=>b.onclick = ()=>closeModal("modalSimple"));
    }, 0);
  });
}

// ====== Streak Badge Rendering ======

function streakBadgeHTML(){
  const streak = state.engagement?.streak || 0;
  if(streak < 1) return "";
  let badge = "";
  if(streak >= 30) badge = "🏆";
  else if(streak >= 14) badge = "🔥";
  else if(streak >= 7)  badge = "⭐";
  else if(streak >= 3)  badge = "💪";
  else badge = "✅";
  return `<span title="连续打卡 ${streak} 天" style="cursor:help;">${badge} ${streak}天</span>`;
}

// ====== Render Premium Badge ======

function renderPremiumBadge(){
  const el = qs("#premiumBadge");
  if(!el) return;
  if(BETA_ALL_FREE){
    el.innerHTML = `<span class="badge ok" style="font-size:10px;cursor:pointer;" id="badgePremiumClick">KidneySphere Followup</span>`;
  } else if(isPremium()){
    el.innerHTML = `<span class="badge ok" style="font-size:10px;cursor:pointer;" id="badgePremiumClick">⭐ 会员版</span>`;
  } else {
    el.innerHTML = `<span class="badge" style="font-size:10px;cursor:pointer;background:#f59e0b;color:#fff;" id="badgePremiumClick">升级会员</span>`;
  }
  setTimeout(()=>{
    const b = qs("#badgePremiumClick");
    if(b) b.onclick = ()=> BETA_ALL_FREE ? showBetaInfo() : (isPremium() ? showPremiumInfo() : openUpgradeModal("trendAnalysis"));
  }, 0);
}

function showBetaInfo(){
  let featListHtml = "";
  Object.values(PREMIUM_FEATURES).forEach(f=>{
    if(f.upcoming) return;
    featListHtml += `<div class="list-item"><div class="t">✅ ${escapeHtml(f.label)}</div><div class="s">${escapeHtml(f.desc)}</div></div>`;
  });
  openSimpleModal("KidneySphere Followup", "© KidneySphere", `
    <div class="note" style="margin-bottom:12px;">
      当前所有功能<b>完全免费</b>开放，无需付费、无需激活。
    </div>
    ${featListHtml}
    <div class="note subtle" style="margin-top:12px;">升级后的使用数据和记录将完整保留。</div>
  `, `<button class="ghost" data-close="modalSimple">知道了</button>`);
  setTimeout(()=>{
    qsa("#modalSimple [data-close]").forEach(b=>b.onclick = ()=>closeModal("modalSimple"));
  }, 0);
}

function showPremiumInfo(){
  const ps = loadPremiumState();
  const exp = ps.expiresAt ? new Date(ps.expiresAt).toLocaleDateString("zh-CN") : "永久";
  const planInfo = PRICING[ps.plan] || PRICING.yearly;
  openSimpleModal("会员状态", "", `
    <div class="list-item"><div class="t">⭐ 会员版</div><div class="s">已解锁全部高级功能</div></div>
    <div class="list-item"><div class="t">当前方案</div><div class="s">${escapeHtml(planInfo.label)} · ¥${planInfo.price}/${planInfo.unit}</div></div>
    <div class="list-item"><div class="t">有效期至</div><div class="s">${exp}</div></div>
    <div class="list-item"><div class="t">激活时间</div><div class="s">${ps.activatedAt ? new Date(ps.activatedAt).toLocaleDateString("zh-CN") : "—"}</div></div>
  `, `<button class="ghost" data-close="modalSimple">关闭</button>`);
  qsa("#modalSimple [data-close]").forEach(b=>b.onclick = ()=>closeModal("modalSimple"));
}
