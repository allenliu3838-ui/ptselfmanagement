/* share.js - Family sharing + Visit prep pack */

// ====== Family Share Code ======

const SHARE_KEY = "kidneyCareShare";

function loadShareState(){
  try{
    const raw = localStorage.getItem(SHARE_KEY);
    if(!raw) return { code:null, createdAt:null, familyMembers:[], enabled:false };
    return JSON.parse(raw);
  }catch(_e){ return { code:null, createdAt:null, familyMembers:[], enabled:false }; }
}

function saveShareState(s){
  try{ localStorage.setItem(SHARE_KEY, JSON.stringify(s)); }catch(_e){}
}

function generateShareCode(){
  // 6-digit alphanumeric code (easy to type/read aloud)
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // exclude confusing chars: I,O,0,1
  let code = "";
  for(let i = 0; i < 6; i++) code += chars[Math.floor(Math.random()*chars.length)];
  return code;
}

// ====== Family Sharing Modal ======

function openFamilySharingModal(){
  requirePremium("familyShare", ()=>{
    const ss = loadShareState();
    const hasCode = ss.code && ss.enabled;

    if(hasCode){
      showShareActiveModal(ss);
    } else {
      showShareSetupModal();
    }
  });
}

function showShareSetupModal(){
  const bodyHtml = `
    <div style="text-align:center;padding:10px 0;">
      <div style="font-size:48px;margin-bottom:12px;">👨‍👩‍👧</div>
      <div style="font-size:16px;font-weight:700;margin-bottom:8px;">让家人安心</div>
      <div class="note" style="margin-bottom:16px;">
        开启后，家属可通过共享码查看你的：<br>
        <b>指标趋势 · 安全提醒 · 依从性情况</b><br>
        <span style="color:var(--muted);">家属只能查看，不能修改你的数据</span>
      </div>
      <div class="list-item" style="text-align:left;">
        <div class="t">工作原理</div>
        <div class="s">
          1. 生成你的专属共享码<br>
          2. 把码发给家属（微信/短信）<br>
          3. 家属打开本 App → 输入共享码 → 只读查看<br>
          <span style="color:var(--muted);">内测版：共享码为本地演示，正式版将通过云端实现实时同步</span>
        </div>
      </div>
    </div>
  `;
  openSimpleModal("家属共享", "让家人随时了解你的健康状况", bodyHtml, `
    <button class="primary" id="btnGenShareCode">生成共享码</button>
    <button class="ghost" data-close="modalSimple">暂不开启</button>
  `);
  setTimeout(()=>{
    const btn = qs("#btnGenShareCode");
    if(btn) btn.onclick = ()=>{
      const code = generateShareCode();
      const ss = loadShareState();
      ss.code = code;
      ss.createdAt = nowISO();
      ss.enabled = true;
      saveShareState(ss);
      closeModal("modalSimple");
      showShareActiveModal(ss);
    };
    qsa("#modalSimple [data-close]").forEach(b=>b.onclick = ()=>closeModal("modalSimple"));
  }, 0);
}

function showShareActiveModal(ss){
  const code = ss.code;
  const codeDisplay = code.split("").map(c=>`<span style="display:inline-block;width:32px;height:40px;line-height:40px;text-align:center;background:#f0f7ff;border:2px solid var(--primary);border-radius:8px;font-size:20px;font-weight:900;color:var(--primary);margin:0 2px;">${c}</span>`).join("");

  // Build a mini summary that family would see
  const lab = latestLab();
  const bp = latestVital(state.vitals?.bp);
  const insights = typeof analyzeTrends === "function" ? analyzeTrends() : [];
  const safety = typeof safetySignals === "function" ? safetySignals() : [];
  const streak = state.engagement?.streak || 0;

  let familyPreview = "";
  familyPreview += `<div class="list-item" style="margin-bottom:6px;"><div class="t">最近化验</div><div class="s">${lab ? `${niceDate(lab.date||"")}：eGFR ${lab.egfr||"—"} · Scr ${lab.scr||"—"}` : "暂无数据"}</div></div>`;
  familyPreview += `<div class="list-item" style="margin-bottom:6px;"><div class="t">最近血压</div><div class="s">${bp ? `${bp.sys}/${bp.dia} mmHg` : "暂无数据"}</div></div>`;
  familyPreview += `<div class="list-item" style="margin-bottom:6px;"><div class="t">打卡情况</div><div class="s">连续 ${streak} 天</div></div>`;

  const dangerCount = safety.filter(s=>s.level==="danger").length;
  if(dangerCount > 0){
    familyPreview += `<div class="list-item" style="margin-bottom:6px;border-color:var(--danger);"><div class="t" style="color:var(--danger);">安全提醒</div><div class="s">${dangerCount} 项需关注</div></div>`;
  }

  const bodyHtml = `
    <div style="text-align:center;margin-bottom:14px;">
      <div style="font-size:12px;color:var(--muted);margin-bottom:8px;">你的共享码</div>
      <div style="margin-bottom:8px;">${codeDisplay}</div>
      <div style="font-size:11px;color:var(--muted);">把这个码发给家属，他们就能查看你的健康概况</div>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:14px;justify-content:center;">
      <button class="ghost small" id="btnCopyShareCode">复制共享码</button>
      <button class="ghost small" id="btnShareWechat">发送给家属</button>
    </div>
    <div style="border-top:1px solid var(--border);padding-top:12px;">
      <div style="font-size:12px;font-weight:700;margin-bottom:8px;">家属看到的内容预览：</div>
      ${familyPreview}
    </div>
  `;
  openSimpleModal("家属共享", "已开启", bodyHtml, `
    <button class="ghost" id="btnRefreshShareCode">更换共享码</button>
    <button class="ghost" id="btnStopShare">关闭共享</button>
    <button class="ghost" data-close="modalSimple">完成</button>
  `);
  setTimeout(()=>{
    const btnCopy = qs("#btnCopyShareCode");
    if(btnCopy) btnCopy.onclick = async ()=>{
      try{ await navigator.clipboard.writeText(code); toast("已复制共享码：" + code); }
      catch(_e){ prompt("共享码：", code); }
    };

    const btnWechat = qs("#btnShareWechat");
    if(btnWechat) btnWechat.onclick = async ()=>{
      const text = `我在用"肾域随访"管理肾病随访数据。你可以通过共享码 ${code} 查看我的健康概况。下载地址：[App链接]`;
      try{ await navigator.clipboard.writeText(text); toast("已复制分享文案，可粘贴到微信发送"); }
      catch(_e){ prompt("复制分享文案：", text); }
    };

    const btnRefresh = qs("#btnRefreshShareCode");
    if(btnRefresh) btnRefresh.onclick = ()=>{
      const newCode = generateShareCode();
      const s = loadShareState();
      s.code = newCode;
      s.createdAt = nowISO();
      saveShareState(s);
      closeModal("modalSimple");
      showShareActiveModal(s);
      toast("已生成新共享码");
    };

    const btnStop = qs("#btnStopShare");
    if(btnStop) btnStop.onclick = ()=>{
      const s = loadShareState();
      s.enabled = false;
      saveShareState(s);
      closeModal("modalSimple");
      toast("已关闭家属共享");
    };

    qsa("#modalSimple [data-close]").forEach(b=>b.onclick = ()=>closeModal("modalSimple"));
  }, 0);
}

// ====== Family View Entry (for family members entering a code) ======

function openFamilyViewEntry(){
  const bodyHtml = `
    <div class="note" style="margin-bottom:12px;">输入家属分享给你的 6 位共享码，查看他们的健康概况。</div>
    <label class="field">
      <span>共享码</span>
      <input id="familyCodeInput" type="text" maxlength="6" placeholder="例如：ABC123" style="text-transform:uppercase;letter-spacing:4px;font-size:18px;font-weight:700;text-align:center;">
    </label>
    <div class="note subtle" style="margin-top:8px;">内测版：此功能需要云端支持，正式版上线后可用。</div>
  `;
  openSimpleModal("查看家属数据", "输入共享码", bodyHtml, `
    <button class="primary" id="btnFamilyViewGo">查看</button>
    <button class="ghost" data-close="modalSimple">取消</button>
  `);
  setTimeout(()=>{
    const btn = qs("#btnFamilyViewGo");
    if(btn) btn.onclick = ()=>{
      const code = qs("#familyCodeInput")?.value?.trim()?.toUpperCase();
      if(!code || code.length !== 6){
        toast("请输入 6 位共享码");
        return;
      }
      toast("内测版暂不支持远程查看，正式版将通过云端实现");
    };
    qsa("#modalSimple [data-close]").forEach(b=>b.onclick = ()=>closeModal("modalSimple"));
  }, 0);
}


// ====== Visit Prep Pack (复诊准备包) ======

function openVisitPrepModal(){
  requirePremium("visitPrep", ()=>{
    const lab = latestLab();
    const prevLabs = (state.labs||[]).filter(l=>l.date).sort((a,b)=>(a.date||"").localeCompare(b.date||""));
    const bp = latestVital(state.vitals?.bp);
    const wt = latestVital(state.vitals?.weight);
    const insights = typeof analyzeTrends === "function" ? analyzeTrends() : [];
    const safety = typeof safetySignals === "function" ? safetySignals() : [];

    // Determine "since last visit" period (use 90 days default or since 2nd-to-last lab)
    let sinceDate = "";
    if(prevLabs.length >= 2){
      sinceDate = prevLabs[prevLabs.length - 2].date;
    } else {
      const d = new Date();
      d.setDate(d.getDate() - 90);
      sinceDate = yyyyMMdd(d);
    }

    // Build changes since last visit
    const changes = [];
    if(prevLabs.length >= 2){
      const prev = prevLabs[prevLabs.length - 2];
      const curr = prevLabs[prevLabs.length - 1];
      const compare = (field, label, unit)=>{
        const pv = toNum(prev[field]);
        const cv = toNum(curr[field]);
        if(pv !== null && cv !== null){
          const diff = cv - pv;
          const arrow = diff > 0 ? "↑" : diff < 0 ? "↓" : "→";
          const diffStr = diff > 0 ? `+${Math.round(diff*10)/10}` : `${Math.round(diff*10)/10}`;
          changes.push({ label, prev: pv, curr: cv, diff: diffStr, arrow, unit: unit||"" });
        }
      };
      compare("egfr", "eGFR", "mL/min");
      compare("scr", "肌酐", curr.scrUnit === "mgdl" ? "mg/dL" : "μmol/L");
      compare("k", "血钾", "mmol/L");
      compare("p", "血磷", "mmol/L");
      compare("na", "血钠", "mmol/L");
      compare("ca", "血钙", "mmol/L");
      compare("glu", "血糖", "mmol/L");
      if(prev.hba1c && curr.hba1c) compare("hba1c", "HbA1c", "%");
    }

    // Build questions to ask the doctor
    const questions = [];
    if(insights.some(i=>i.type==="egfr" && i.level==="danger")){
      questions.push("eGFR 下降较快，是否需要调整治疗方案？");
    }
    if(insights.some(i=>i.type==="k" && i.level==="danger")){
      questions.push("血钾持续偏高，饮食之外是否需要药物干预？");
    }
    if(insights.some(i=>i.type==="bp" && i.level==="danger")){
      questions.push("血压控制不理想，是否需要调整降压药？");
    }
    if(insights.some(i=>i.type==="scr" && i.level==="danger")){
      questions.push("肌酐上升明显，需要做哪些进一步检查？");
    }
    if(insights.some(i=>i.type==="protein" && i.level==="warn")){
      questions.push("尿蛋白有变化，是否需要调整免疫抑制剂/RAAS阻断剂？");
    }
    // Default questions
    questions.push("目前的用药方案是否需要调整？");
    questions.push("下次复诊建议什么时候？需要做哪些检查？");
    if(state.activeProgram === "kidney" && lab?.egfr && toNum(lab.egfr) < 30){
      questions.push("是否需要开始为透析/移植做准备？");
    }

    // Build body HTML
    let bodyHtml = `<div class="note subtle" style="margin-bottom:10px;">覆盖范围：${niceDate(sinceDate)} 至今</div>`;

    // Changes table
    if(changes.length){
      bodyHtml += `<div class="list-item" style="margin-bottom:8px;"><div class="t">指标变化</div><div class="s">`;
      bodyHtml += `<table style="width:100%;font-size:12px;border-collapse:collapse;margin-top:4px;">`;
      bodyHtml += `<tr style="color:var(--muted);"><td>指标</td><td>上次</td><td>本次</td><td>变化</td></tr>`;
      changes.forEach(c=>{
        const color = c.arrow === "↑" && (c.label==="肌酐"||c.label==="血钾"||c.label==="血磷"||c.label==="血糖") ? "var(--danger)"
          : c.arrow === "↓" && c.label==="eGFR" ? "var(--danger)"
          : c.arrow === "↓" && (c.label==="肌酐"||c.label==="血钾") ? "var(--ok)"
          : c.arrow === "↑" && c.label==="eGFR" ? "var(--ok)"
          : "var(--text)";
        bodyHtml += `<tr style="border-top:1px solid #f0f0f0;"><td>${escapeHtml(c.label)}</td><td>${c.prev}</td><td><b>${c.curr}</b></td><td style="color:${color};font-weight:700;">${c.arrow} ${c.diff}</td></tr>`;
      });
      bodyHtml += `</table></div></div>`;
    }

    // Current status
    bodyHtml += `<div class="list-item" style="margin-bottom:8px;"><div class="t">当前状态</div><div class="s">`;
    if(lab) bodyHtml += `最近化验（${niceDate(lab.date||"")}）：eGFR ${lab.egfr||"—"} · Scr ${lab.scr||"—"}<br>`;
    if(bp) bodyHtml += `最近血压：${bp.sys}/${bp.dia} mmHg<br>`;
    if(wt) bodyHtml += `最近体重：${wt.kg} kg<br>`;
    bodyHtml += `</div></div>`;

    // Trend insights
    if(insights.length){
      bodyHtml += `<div class="list-item" style="margin-bottom:8px;"><div class="t">趋势摘要</div><div class="s">`;
      insights.forEach(i=>{
        const icon = i.level==="danger"?"🔴":i.level==="warn"?"🟡":"🟢";
        bodyHtml += `${icon} ${escapeHtml(i.title)}<br>`;
      });
      bodyHtml += `</div></div>`;
    }

    // Safety alerts
    const dangerSignals = safety.filter(s=>s.level==="danger");
    if(dangerSignals.length){
      bodyHtml += `<div class="list-item" style="margin-bottom:8px;border-color:var(--danger);"><div class="t" style="color:var(--danger);">安全提醒</div><div class="s">`;
      dangerSignals.forEach(s=>{ bodyHtml += `${escapeHtml(s.title)}：${escapeHtml(s.detail)}<br>`; });
      bodyHtml += `</div></div>`;
    }

    // Questions for doctor
    bodyHtml += `<div class="list-item" style="margin-bottom:8px;background:#f0f7ff;"><div class="t">建议问医生</div><div class="s">`;
    bodyHtml += `<ol style="margin:4px 0 0 16px;padding:0;">`;
    questions.forEach(q=>{ bodyHtml += `<li style="margin-bottom:3px;">${escapeHtml(q)}</li>`; });
    bodyHtml += `</ol></div></div>`;

    bodyHtml += `<div class="note subtle" style="margin-top:8px;">复诊时可直接给医生看此页面，或复制文字粘贴到备忘录/微信。</div>`;

    openSimpleModal("复诊准备包", "自动生成，复诊前查看", bodyHtml, `
      <button class="primary" id="btnCopyVisitPrep">复制全部</button>
      <button class="ghost" data-close="modalSimple">关闭</button>
    `);

    setTimeout(()=>{
      const btn = qs("#btnCopyVisitPrep");
      if(btn) btn.onclick = async ()=>{
        const text = buildVisitPrepText(changes, insights, questions, lab, bp, wt, sinceDate);
        try{ await navigator.clipboard.writeText(text); toast("已复制复诊准备包"); }
        catch(_e){ prompt("复制：", text); }
      };
      qsa("#modalSimple [data-close]").forEach(b=>b.onclick = ()=>closeModal("modalSimple"));
    }, 0);
  });
}

// ====== Build Visit Prep Plain Text ======

function buildVisitPrepText(changes, insights, questions, lab, bp, wt, sinceDate){
  const lines = [];
  lines.push("【肾域随访 · 复诊准备包】");
  lines.push(`生成时间：${nowISO()}`);
  lines.push(`项目：${programLabel(state.activeProgram)}`);
  lines.push(`覆盖范围：${niceDate(sinceDate)} 至今`);
  lines.push("");

  if(changes.length){
    lines.push("📊 指标变化");
    changes.forEach(c=>{
      lines.push(`  ${c.label}：${c.prev} → ${c.curr} ${c.unit}（${c.arrow} ${c.diff}）`);
    });
    lines.push("");
  }

  lines.push("📋 当前状态");
  if(lab) lines.push(`  最近化验（${lab.date||"—"}）：eGFR ${lab.egfr||"—"} · Scr ${lab.scr||"—"}`);
  if(bp) lines.push(`  最近血压：${bp.sys}/${bp.dia} mmHg`);
  if(wt) lines.push(`  最近体重：${wt.kg} kg`);
  lines.push("");

  if(insights.length){
    lines.push("📈 趋势摘要");
    insights.forEach(i=>{
      const icon = i.level==="danger"?"🔴":i.level==="warn"?"🟡":"🟢";
      lines.push(`  ${icon} ${i.title}：${i.detail}`);
    });
    lines.push("");
  }

  lines.push("❓ 建议问医生");
  questions.forEach((q,i)=>{
    lines.push(`  ${i+1}. ${q}`);
  });
  lines.push("");
  lines.push("提醒：以上为自动整理，供复诊参考，不替代医生判断。");

  return lines.join("\n");
}
