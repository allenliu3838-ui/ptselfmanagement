/* trends.js - Trend visualization (SVG charts) + intelligent interpretation */

// ====== SVG Line Chart Renderer ======

function trendChart(container, series, opts={}){
  // series: [{ label, color, data: [{x: Date|string, y: number}] }]
  // opts: { width, height, yLabel, yMin, yMax, targets: [{y, label, color}], showDots }
  if(!container) return;
  const W = opts.width || container.clientWidth || 300;
  const H = opts.height || 180;
  const PAD = { top:22, right:14, bottom:28, left:42 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  // Flatten all data points for axis calculation
  const allY = [];
  const allX = [];
  series.forEach(s=>{
    s.data.forEach(d=>{
      const yv = toNum(d.y);
      if(yv !== null) allY.push(yv);
      allX.push(typeof d.x === "string" ? new Date(d.x) : d.x);
    });
  });
  if(opts.targets) opts.targets.forEach(t=>allY.push(t.y));
  if(!allY.length || !allX.length){ container.innerHTML = ""; return; }

  let yMin = opts.yMin !== undefined ? opts.yMin : Math.min(...allY);
  let yMax = opts.yMax !== undefined ? opts.yMax : Math.max(...allY);
  if(yMin === yMax){ yMin -= 1; yMax += 1; }
  const yPad = (yMax - yMin) * 0.1;
  yMin = opts.yMin !== undefined ? yMin : yMin - yPad;
  yMax = opts.yMax !== undefined ? yMax : yMax + yPad;

  const xMin = Math.min(...allX.map(d=>d.getTime()));
  const xMax = Math.max(...allX.map(d=>d.getTime()));
  const xRange = xMax - xMin || 1;

  const sx = (t)=> PAD.left + ((t - xMin) / xRange) * plotW;
  const sy = (v)=> PAD.top + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

  let svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" style="display:block;">`;

  // Grid lines (4 horizontal)
  const gridN = 4;
  for(let i = 0; i <= gridN; i++){
    const yv = yMin + (yMax - yMin) * i / gridN;
    const py = sy(yv);
    svg += `<line x1="${PAD.left}" y1="${py}" x2="${W-PAD.right}" y2="${py}" stroke="#e4e9f3" stroke-width="1"/>`;
    svg += `<text x="${PAD.left-4}" y="${py+4}" text-anchor="end" font-size="10" fill="#5d6b85">${Math.round(yv*10)/10}</text>`;
  }

  // Target/reference lines
  if(opts.targets){
    opts.targets.forEach(t=>{
      const py = sy(t.y);
      if(py >= PAD.top && py <= PAD.top + plotH){
        svg += `<line x1="${PAD.left}" y1="${py}" x2="${W-PAD.right}" y2="${py}" stroke="${t.color||"#d93025"}" stroke-width="1" stroke-dasharray="4,3"/>`;
        svg += `<text x="${W-PAD.right+2}" y="${py+3}" font-size="9" fill="${t.color||"#d93025"}">${escapeHtml(t.label||"")}</text>`;
      }
    });
  }

  // X-axis date labels (up to 5)
  const datePoints = allX.map(d=>d.getTime()).sort((a,b)=>a-b);
  const uniqueDates = [...new Set(datePoints)];
  const step = Math.max(1, Math.floor(uniqueDates.length / 5));
  for(let i = 0; i < uniqueDates.length; i += step){
    const t = uniqueDates[i];
    const px = sx(t);
    const label = new Date(t).toLocaleDateString("zh-CN", {month:"numeric", day:"numeric"});
    svg += `<text x="${px}" y="${H-4}" text-anchor="middle" font-size="10" fill="#5d6b85">${label}</text>`;
  }

  // Data lines + dots
  series.forEach(s=>{
    const pts = s.data
      .map(d=>({ x: (typeof d.x === "string" ? new Date(d.x) : d.x).getTime(), y: toNum(d.y) }))
      .filter(d=> d.y !== null)
      .sort((a,b)=>a.x - b.x);
    if(!pts.length) return;

    const polyPts = pts.map(d=>`${sx(d.x)},${sy(d.y)}`).join(" ");
    svg += `<polyline points="${polyPts}" fill="none" stroke="${s.color||"#1a5fe6"}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;

    // Dots
    if(opts.showDots !== false){
      pts.forEach((d,i)=>{
        const isLast = i === pts.length - 1;
        const r = isLast ? 4 : 3;
        svg += `<circle cx="${sx(d.x)}" cy="${sy(d.y)}" r="${r}" fill="${isLast?s.color||"#1a5fe6":"#fff"}" stroke="${s.color||"#1a5fe6"}" stroke-width="2"/>`;
        // Value label on last point
        if(isLast){
          svg += `<text x="${sx(d.x)}" y="${sy(d.y)-8}" text-anchor="middle" font-size="11" font-weight="700" fill="${s.color||"#1a5fe6"}">${Math.round(d.y*10)/10}</text>`;
        }
      });
    }

    // Legend
    if(s.label){
      const idx = series.indexOf(s);
      const lx = PAD.left + idx * 80;
      svg += `<rect x="${lx}" y="2" width="10" height="10" rx="2" fill="${s.color||"#1a5fe6"}"/>`;
      svg += `<text x="${lx+14}" y="11" font-size="10" fill="#0b1220">${escapeHtml(s.label)}</text>`;
    }
  });

  svg += `</svg>`;
  container.innerHTML = svg;
}

// ====== Sparkline (mini inline chart) ======

function sparklineSVG(values, opts={}){
  const W = opts.width || 60;
  const H = opts.height || 20;
  const nums = values.map(v=>toNum(v)).filter(v=>v!==null);
  if(nums.length < 2) return "";
  const yMin = Math.min(...nums);
  const yMax = Math.max(...nums);
  const yRange = yMax - yMin || 1;
  const pts = nums.map((v,i)=>{
    const x = (i/(nums.length-1))*W;
    const y = H - ((v - yMin)/yRange)*(H-4) - 2;
    return `${x},${y}`;
  }).join(" ");
  const color = opts.color || (nums[nums.length-1] >= nums[0] ? "#138a4b" : "#d93025");
  return `<svg class="spark" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}


// ====== Trend Analysis Engine ======

function analyzeTrends(){
  const insights = [];

  // --- eGFR trend ---
  const egfrVals = (state.labs||[])
    .filter(l=>l.egfr && l.date)
    .sort((a,b)=>(a.date||"").localeCompare(b.date||""))
    .map(l=>({ date: l.date, value: toNum(l.egfr) }))
    .filter(d=>d.value!==null);

  if(egfrVals.length >= 2){
    const first = egfrVals[0];
    const last = egfrVals[egfrVals.length-1];
    const diff = last.value - first.value;
    const days = Math.max(1, (new Date(last.date) - new Date(first.date)) / (24*3600*1000));
    const monthlyRate = (diff / days) * 30;
    const rounded = Math.round(monthlyRate*10)/10;

    if(diff > 0){
      insights.push({ type:"egfr", level:"ok", title:"eGFR 趋势向好",
        detail:`从 ${first.value} 升至 ${last.value}（${first.date} → ${last.date}），平均每月 +${rounded}`,
        sparkData: egfrVals.map(d=>d.value) });
    } else if(monthlyRate < -2){
      insights.push({ type:"egfr", level:"danger", title:"eGFR 下降较快",
        detail:`从 ${first.value} 降至 ${last.value}（${first.date} → ${last.date}），平均每月 ${rounded}。建议复诊时与医生讨论`,
        sparkData: egfrVals.map(d=>d.value) });
    } else if(diff < 0){
      insights.push({ type:"egfr", level:"warn", title:"eGFR 缓慢下降",
        detail:`从 ${first.value} 降至 ${last.value}（${first.date} → ${last.date}），平均每月 ${rounded}`,
        sparkData: egfrVals.map(d=>d.value) });
    } else {
      insights.push({ type:"egfr", level:"ok", title:"eGFR 稳定",
        detail:`维持在 ${last.value} 左右`,
        sparkData: egfrVals.map(d=>d.value) });
    }
  }

  // --- Creatinine trend ---
  const scrVals = (state.labs||[])
    .filter(l=>l.scr && l.date)
    .sort((a,b)=>(a.date||"").localeCompare(b.date||""))
    .map(l=>({ date: l.date, value: toNum(l.scr), unit: l.scrUnit||"umolL" }))
    .filter(d=>d.value!==null);

  if(scrVals.length >= 2){
    const first = scrVals[0];
    const last = scrVals[scrVals.length-1];
    const diff = last.value - first.value;
    const pct = Math.round((diff / first.value)*100);
    const unit = last.unit === "mgdl" ? "mg/dL" : "μmol/L";

    if(pct > 20){
      insights.push({ type:"scr", level:"danger", title:"肌酐上升明显",
        detail:`从 ${first.value} 升至 ${last.value} ${unit}（+${pct}%）。肌酐短期大幅上升需关注，建议尽早复诊`,
        sparkData: scrVals.map(d=>d.value) });
    } else if(diff > 0){
      insights.push({ type:"scr", level:"warn", title:"肌酐略有上升",
        detail:`从 ${first.value} 升至 ${last.value} ${unit}（+${pct}%）`,
        sparkData: scrVals.map(d=>d.value) });
    } else if(diff < 0){
      insights.push({ type:"scr", level:"ok", title:"肌酐有改善",
        detail:`从 ${first.value} 降至 ${last.value} ${unit}（${pct}%）`,
        sparkData: scrVals.map(d=>d.value) });
    }
  }

  // --- Potassium trend ---
  const kVals = (state.labs||[])
    .filter(l=>l.k && l.date)
    .sort((a,b)=>(a.date||"").localeCompare(b.date||""))
    .map(l=>({ date: l.date, value: toNum(l.k) }))
    .filter(d=>d.value!==null);

  if(kVals.length >= 1){
    const last = kVals[kVals.length-1];
    if(last.value > 5.5){
      insights.push({ type:"k", level:"danger", title:"血钾偏高",
        detail:`最近血钾 ${last.value} mmol/L（>5.5）。高钾血症有心脏风险，需限制高钾食物并复诊`,
        sparkData: kVals.map(d=>d.value) });
    } else if(last.value > 5.0){
      insights.push({ type:"k", level:"warn", title:"血钾偏高边缘",
        detail:`最近血钾 ${last.value} mmol/L（正常 3.5-5.0），建议注意饮食`,
        sparkData: kVals.map(d=>d.value) });
    } else if(last.value < 3.5){
      insights.push({ type:"k", level:"warn", title:"血钾偏低",
        detail:`最近血钾 ${last.value} mmol/L（<3.5），可能需要补钾`,
        sparkData: kVals.map(d=>d.value) });
    }
  }

  // --- Blood Pressure trend ---
  const bpArr = state.vitals?.bp || [];
  if(bpArr.length >= 3){
    const sorted = [...bpArr].sort((a,b)=>(a.dateTime||"").localeCompare(b.dateTime||""));
    const recent7 = sorted.slice(-7);
    const avgSys = Math.round(recent7.reduce((s,v)=>s+(toNum(v.sys)||0),0)/recent7.length);
    const avgDia = Math.round(recent7.reduce((s,v)=>s+(toNum(v.dia)||0),0)/recent7.length);

    // Check trend: compare first half vs second half
    const mid = Math.floor(sorted.length/2);
    const firstHalf = sorted.slice(0, mid);
    const secondHalf = sorted.slice(mid);
    const avg1Sys = firstHalf.reduce((s,v)=>s+(toNum(v.sys)||0),0)/firstHalf.length;
    const avg2Sys = secondHalf.reduce((s,v)=>s+(toNum(v.sys)||0),0)/secondHalf.length;
    const sysDiff = Math.round(avg2Sys - avg1Sys);

    if(avgSys >= 140 || avgDia >= 90){
      insights.push({ type:"bp", level:"danger", title:"血压偏高",
        detail:`近 ${recent7.length} 次平均 ${avgSys}/${avgDia} mmHg。建议复诊调药`,
        sparkData: recent7.map(v=>toNum(v.sys)) });
    } else if(sysDiff < -5){
      insights.push({ type:"bp", level:"ok", title:"血压改善趋势",
        detail:`近期均值 ${avgSys}/${avgDia} mmHg，较前期降低约 ${Math.abs(sysDiff)} mmHg`,
        sparkData: sorted.slice(-10).map(v=>toNum(v.sys)) });
    } else if(avgSys <= 130 && avgDia <= 80){
      insights.push({ type:"bp", level:"ok", title:"血压控制良好",
        detail:`近 ${recent7.length} 次平均 ${avgSys}/${avgDia} mmHg，达标`,
        sparkData: recent7.map(v=>toNum(v.sys)) });
    } else {
      insights.push({ type:"bp", level:"warn", title:"血压需继续关注",
        detail:`近 ${recent7.length} 次平均 ${avgSys}/${avgDia} mmHg`,
        sparkData: recent7.map(v=>toNum(v.sys)) });
    }
  }

  // --- Proteinuria trend ---
  const proteinMap = {"—":0, "阴性":0, "-":0, "±":0.5, "1+":1, "2+":2, "3+":3, "4+":4};
  const urineArr = (state.urineTests||[])
    .filter(u=>u.date && u.protein)
    .sort((a,b)=>(a.date||"").localeCompare(b.date||""));

  if(urineArr.length >= 2){
    const first = urineArr[0];
    const last = urineArr[urineArr.length-1];
    const fv = proteinMap[first.protein] ?? 0;
    const lv = proteinMap[last.protein] ?? 0;

    if(lv < fv){
      insights.push({ type:"protein", level:"ok", title:"尿蛋白改善",
        detail:`从 ${first.protein} 降至 ${last.protein}（${first.date} → ${last.date}）`,
        sparkData: urineArr.map(u=>proteinMap[u.protein]??0) });
    } else if(lv > fv){
      insights.push({ type:"protein", level:"warn", title:"尿蛋白上升",
        detail:`从 ${first.protein} 升至 ${last.protein}（${first.date} → ${last.date}），建议关注`,
        sparkData: urineArr.map(u=>proteinMap[u.protein]??0) });
    }
  }

  // --- Weight trend ---
  const wtArr = state.vitals?.weight || [];
  if(wtArr.length >= 3){
    const sorted = [...wtArr].sort((a,b)=>(a.dateTime||"").localeCompare(b.dateTime||""));
    const recent = sorted.slice(-5);
    const first = sorted[0];
    const last = sorted[sorted.length-1];
    const fv = toNum(first.kg);
    const lv = toNum(last.kg);
    if(fv !== null && lv !== null){
      const diff = Math.round((lv - fv)*10)/10;
      if(Math.abs(diff) >= 2){
        insights.push({ type:"weight", level: diff > 0 ? "warn" : "info", title: diff > 0 ? "体重上升" : "体重下降",
          detail:`从 ${fv}kg → ${lv}kg（${diff>0?"+":""}${diff}kg），短期体重波动可能反映水钠潴留`,
          sparkData: sorted.slice(-10).map(v=>toNum(v.kg)) });
      }
    }
  }

  return insights;
}

// ====== Build Trend Interpretation Text ======

function buildTrendSummaryText(insights){
  if(!insights || !insights.length) return "数据不足，暂无法生成趋势分析。录入更多化验和测量数据后将自动生成。";
  const lines = insights.map(ins=>{
    const icon = ins.level === "danger" ? "🔴" : ins.level === "warn" ? "🟡" : "🟢";
    return `${icon} ${ins.title}：${ins.detail}`;
  });
  lines.push("");
  lines.push("提醒：以上为数据趋势整理，不是诊断。具体请遵医嘱。");
  return lines.join("\n");
}

// ====== Render Trend Card on Records Page ======

function renderTrendCard(){
  const box = qs("#trendContent");
  if(!box) return;

  const insights = analyzeTrends();
  if(!insights.length){
    box.innerHTML = `<div class="empty-cta"><div class="emoji">📊</div><div class="msg">录入 2 次以上化验或多次血压/体重后，自动生成趋势分析与图表</div></div>`;
    return;
  }

  let html = "";
  insights.forEach(ins=>{
    const dot = ins.level === "danger" ? "danger" : ins.level === "warn" ? "warn" : "ok";
    const spark = ins.sparkData ? sparklineSVG(ins.sparkData, { width:60, height:18 }) : "";
    html += `<div class="list-item trend-item" data-trend-type="${ins.type}">
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="badge ${dot}" style="font-size:10px;">${ins.level==="danger"?"警告":ins.level==="warn"?"关注":"良好"}</span>
        <div style="flex:1;">
          <div class="t">${escapeHtml(ins.title)}</div>
          <div class="s">${escapeHtml(ins.detail)}</div>
        </div>
        ${spark}
      </div>
    </div>`;
  });

  box.innerHTML = html;

  // Click to open chart modal
  qsa(".trend-item").forEach(el=>{
    el.style.cursor = "pointer";
    el.onclick = ()=> openTrendChartModal(el.getAttribute("data-trend-type"));
  });
}

// ====== Full Chart Modal ======

function openTrendChartModal(type){
  let title = "趋势图表";
  let chartSeries = [];
  let targets = [];
  let yLabel = "";

  if(type === "egfr"){
    title = "eGFR 趋势";
    const data = (state.labs||[]).filter(l=>l.egfr && l.date)
      .map(l=>({ x: l.date, y: toNum(l.egfr) })).filter(d=>d.y!==null);
    chartSeries = [{ label:"eGFR", color:"#1a5fe6", data }];
    targets = [{ y:60, label:"CKD3", color:"#f59e0b" }, { y:30, label:"CKD4", color:"#d93025" }];
    yLabel = "mL/min/1.73m²";
  } else if(type === "scr"){
    title = "肌酐趋势";
    const data = (state.labs||[]).filter(l=>l.scr && l.date)
      .map(l=>({ x: l.date, y: toNum(l.scr) })).filter(d=>d.y!==null);
    const unit = (state.labs||[]).find(l=>l.scrUnit)?.scrUnit || "umolL";
    chartSeries = [{ label: unit==="mgdl"?"Scr (mg/dL)":"Scr (μmol/L)", color:"#e67e22", data }];
  } else if(type === "k"){
    title = "血钾趋势";
    const data = (state.labs||[]).filter(l=>l.k && l.date)
      .map(l=>({ x: l.date, y: toNum(l.k) })).filter(d=>d.y!==null);
    chartSeries = [{ label:"K (mmol/L)", color:"#8b5cf6", data }];
    targets = [{ y:5.5, label:"高", color:"#d93025" }, { y:3.5, label:"低", color:"#f59e0b" }];
  } else if(type === "bp"){
    title = "血压趋势";
    const sorted = [...(state.vitals?.bp||[])].sort((a,b)=>(a.dateTime||"").localeCompare(b.dateTime||""));
    const sysData = sorted.map(v=>({ x: v.dateTime, y: toNum(v.sys) })).filter(d=>d.y!==null);
    const diaData = sorted.map(v=>({ x: v.dateTime, y: toNum(v.dia) })).filter(d=>d.y!==null);
    chartSeries = [
      { label:"收缩压", color:"#d93025", data: sysData },
      { label:"舒张压", color:"#1a5fe6", data: diaData }
    ];
    targets = [{ y:130, label:"目标", color:"#138a4b" }];
  } else if(type === "protein"){
    title = "尿蛋白趋势";
    const proteinMap = {"—":0, "阴性":0, "-":0, "±":0.5, "1+":1, "2+":2, "3+":3, "4+":4};
    const data = (state.urineTests||[]).filter(u=>u.date && u.protein)
      .sort((a,b)=>(a.date||"").localeCompare(b.date||""))
      .map(u=>({ x: u.date, y: proteinMap[u.protein]??0 }));
    chartSeries = [{ label:"尿蛋白", color:"#e67e22", data }];
  } else if(type === "weight"){
    title = "体重趋势";
    const sorted = [...(state.vitals?.weight||[])].sort((a,b)=>(a.dateTime||"").localeCompare(b.dateTime||""));
    const data = sorted.map(v=>({ x: v.dateTime, y: toNum(v.kg) })).filter(d=>d.y!==null);
    chartSeries = [{ label:"体重 (kg)", color:"#138a4b", data }];
    // Dry weight target for dialysis
    if(state.dialysis?.dryWeightKg){
      const dw = toNum(state.dialysis.dryWeightKg);
      if(dw) targets.push({ y: dw, label:"干体重", color:"#1a5fe6" });
    }
  }

  const insights = analyzeTrends().filter(i=>i.type===type);
  const interpretation = insights.length
    ? insights.map(i=>{
        const icon = i.level==="danger"?"🔴":i.level==="warn"?"🟡":"🟢";
        return `<div class="note" style="margin-bottom:6px;">${icon} <b>${escapeHtml(i.title)}</b>：${escapeHtml(i.detail)}</div>`;
      }).join("")
    : "";

  const bodyHtml = `
    <div id="trendChartArea" style="width:100%;min-height:180px;margin-bottom:10px;"></div>
    ${interpretation}
    <div class="note subtle" style="margin-top:8px;">点击可查看详细数据。趋势分析仅供参考，不替代医生判断。</div>
  `;

  openSimpleModal(title, "数据趋势可视化", bodyHtml, `
    <button class="ghost" id="btnCopyTrend">复制解读</button>
    <button class="ghost" data-close="modalSimple">关闭</button>
  `);

  // Render chart after modal opens
  setTimeout(()=>{
    const area = qs("#trendChartArea");
    if(area && chartSeries.length){
      trendChart(area, chartSeries, { height:200, targets, showDots:true });
    }
    const btnCopy = qs("#btnCopyTrend");
    if(btnCopy) btnCopy.onclick = async ()=>{
      const text = buildTrendSummaryText(analyzeTrends().filter(i=>i.type===type));
      try{ await navigator.clipboard.writeText(text); toast("已复制趋势解读"); }
      catch(_e){ prompt("复制：", text); }
    };
    qsa("#modalSimple [data-close]").forEach(b=>b.onclick = ()=>closeModal("modalSimple"));
  }, 50);
}

// ====== Personalized Diet Advice (Premium) ======

function openPersonalDietModal(){
  const lab = latestLab();
  const focus = dietFocus();
  const advices = [];

  // Potassium-based advice
  const kVal = lab ? toNum(lab.k) : null;
  if(kVal !== null){
    if(kVal > 5.5){
      advices.push({ icon:"🔴", title:"严格限钾", items:["避免：香蕉、橙子、红枣、土豆、番茄、菠菜、蘑菇","建议：苹果、梨、黄瓜、圆白菜、冬瓜","烹饪：蔬菜切小块焯水后再烹调（可减少30-50%钾）","提醒：低钠盐含大量钾，肾病患者禁用"] });
    } else if(kVal > 5.0){
      advices.push({ icon:"🟡", title:"注意控钾", items:["减少：香蕉、橙汁、干果、坚果的摄入频率","优选：苹果、梨、白菜、冬瓜等低钾蔬果","避免：低钠盐（含氯化钾）"] });
    } else {
      advices.push({ icon:"🟢", title:"血钾正常", items:[`当前 ${kVal} mmol/L，在正常范围内`,"保持均衡饮食，继续监测"] });
    }
  }

  // Phosphorus-based advice
  const pVal = lab ? toNum(lab.p) : null;
  if(pVal !== null){
    if(pVal > 1.45){
      advices.push({ icon:"🔴", title:"严格限磷", items:["避免：可乐/碳酸饮料、加工肉类（火腿/香肠）、方便面","减少：内脏类、蛋黄、全谷物","优选：白面、白米、瘦肉（选择新鲜食材而非加工品）","关键：看食品标签，含"磷酸盐"的添加剂吸收率极高"] });
    } else if(pVal > 1.3){
      advices.push({ icon:"🟡", title:"注意控磷", items:["减少加工食品和碳酸饮料","优先选择新鲜食材"] });
    }
  }

  // eGFR-based protein advice
  const egfrVal = lab ? toNum(lab.egfr) : null;
  if(egfrVal !== null && state.activeProgram !== "dialysis"){
    if(egfrVal < 30){
      advices.push({ icon:"🟡", title:"低蛋白饮食建议", items:["每日蛋白摄入建议 0.6-0.8g/kg 体重","优先选择高质量蛋白：蛋清、鱼肉、瘦肉","可考虑 α-酮酸补充（需遵医嘱）","减少植物蛋白（豆类）摄入比例"] });
    } else if(egfrVal < 60){
      advices.push({ icon:"🟡", title:"适度控蛋白", items:["每日蛋白摄入建议 0.8g/kg 体重","避免高蛋白饮食（如大量红肉、蛋白粉）","均衡搭配动物蛋白和植物蛋白"] });
    }
  }

  // Dialysis patients: different advice
  if(state.activeProgram === "dialysis"){
    advices.push({ icon:"📋", title:"透析饮食要点", items:["透析患者蛋白需求较高：1.0-1.2g/kg 体重/天","每次透析后适当补充优质蛋白","严格控制液体摄入（两次透析之间体重增长<干体重5%）","注意控钾控磷，按医嘱服用磷结合剂"] });
  }

  // Sodium advice (if HTN)
  if(state.comorbid?.htn || state.enabledPrograms?.htn){
    advices.push({ icon:"🧂", title:"低盐饮食", items:["每日盐摄入 <5g（约1茶匙）","避免：腌制食品、咸菜、酱油过多","注意：味精/鸡精也含钠","用醋、柠檬汁、香料替代部分盐分调味"] });
  }

  // DM advice
  if(state.comorbid?.dm || state.enabledPrograms?.dm){
    advices.push({ icon:"🍚", title:"控糖建议", items:["选择低GI主食：糙米饭、全麦面（注意CKD患者需权衡控磷与控糖）","每餐搭配蔬菜、蛋白质，减缓血糖上升","避免含糖饮料和甜食","水果选择低糖种类：草莓、蓝莓（每日限量）"] });
  }

  if(!advices.length){
    advices.push({ icon:"💡", title:"暂无个性化建议", items:["录入化验数据后将自动生成针对性的饮食建议","建议录入：血钾(K)、血磷(P)、eGFR 等指标"] });
  }

  const dateStr = lab ? `基于 ${niceDate(lab.date||"")} 化验结果` : "暂无化验数据";
  const bodyHtml = `
    <div class="note subtle" style="margin-bottom:10px;">${escapeHtml(dateStr)} · 个性化生成</div>
    ${advices.map(a=>`
      <div class="list-item" style="margin-bottom:8px;">
        <div class="t">${a.icon} ${escapeHtml(a.title)}</div>
        <div class="s"><ul style="margin:4px 0 0 16px;padding:0;list-style:disc;">${a.items.map(i=>`<li style="margin-bottom:3px;">${escapeHtml(i)}</li>`).join("")}</ul></div>
      </div>
    `).join("")}
    <div class="note subtle" style="margin-top:10px;">以上为基于化验数据的通用建议，不替代医生/营养师的个体化方案。</div>
  `;

  openSimpleModal("今日个性化饮食建议", "⭐ 会员功能", bodyHtml, `
    <button class="ghost" data-close="modalSimple">关闭</button>
  `);
  qsa("#modalSimple [data-close]").forEach(b=>b.onclick = ()=>closeModal("modalSimple"));
}


// ====== Open full trends overview ======

function openAllTrendsModal(){
  const insights = analyzeTrends();
  if(!insights.length){
    toast("数据不足，暂无趋势分析。请录入更多化验和测量数据。");
    return;
  }

  const text = buildTrendSummaryText(insights);
  const bodyHtml = `
    <div style="white-space:pre-wrap;font-size:13px;line-height:1.6;">${escapeHtml(text)}</div>
  `;
  openSimpleModal("趋势总览", "基于你的全部记录", bodyHtml, `
    <button class="ghost" id="btnCopyAllTrends">复制全部</button>
    <button class="ghost" data-close="modalSimple">关闭</button>
  `);
  setTimeout(()=>{
    const btn = qs("#btnCopyAllTrends");
    if(btn) btn.onclick = async ()=>{
      try{ await navigator.clipboard.writeText(text); toast("已复制全部趋势解读"); }
      catch(_e){ prompt("复制：", text); }
    };
    qsa("#modalSimple [data-close]").forEach(b=>b.onclick = ()=>closeModal("modalSimple"));
  }, 0);
}
