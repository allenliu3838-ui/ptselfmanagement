/* summary.js - Follow-up summary page (P0-2), export/share (P0-3), CTAs (P0-4) */

var _summaryDays = 30;

/* ===== Helpers ===== */
function getSummaryPeriodRecords(arr, days, dateKey){
  dateKey = dateKey || 'dateTime';
  var cutoff = new Date(Date.now() - days * 24 * 3600 * 1000);
  return (arr || []).filter(function(r){
    var d = new Date(r[dateKey]);
    return !isNaN(d.getTime()) && d >= cutoff;
  }).sort(function(a,b){ return new Date(a[dateKey]) - new Date(b[dateKey]); });
}

function computeTrendArrow(values){
  if(!values || values.length < 2) return { arrow:'—', text:'数据不足' };
  var first = values[0], last = values[values.length - 1];
  var delta = Math.round((last - first) * 10) / 10;
  if(Math.abs(delta) < 0.5) return { arrow:'→', text:'持平' };
  if(delta > 0) return { arrow:'↑', text:'+' + delta };
  return { arrow:'↓', text:String(delta) };
}

function countRecordsInLast7Days(){
  var cutoff = new Date(Date.now() - 7*24*3600*1000);
  var count = 0;
  ['bp','weight','glucose','temp'].forEach(function(k){
    (state.vitals[k]||[]).forEach(function(r){
      if(new Date(r.dateTime) >= cutoff) count++;
    });
  });
  (state.labs||[]).forEach(function(r){ if(new Date(r.date) >= cutoff) count++; });
  (state.symptoms||[]).forEach(function(r){ if(new Date(r.dateTime) >= cutoff) count++; });
  return count;
}

/* ===== Build summary HTML card ===== */
function buildSummaryHTML(days){
  var cutoff = new Date(Date.now() - days * 24 * 3600 * 1000);
  var html = '';
  var hasAnyData = false;

  html += '<div class="summary-header">';
  html += '<div class="summary-title">随访摘要（近 ' + days + ' 天）</div>';
  html += '<div class="summary-meta">' + nowISO() + ' · ' + programLabel(state.activeProgram) + '</div>';
  html += '</div>';

  /* Last record timestamp */
  var allDates = [];
  ['bp','weight','glucose','temp'].forEach(function(k){
    (state.vitals[k]||[]).forEach(function(r){ allDates.push(new Date(r.dateTime)); });
  });
  (state.labs||[]).forEach(function(r){ allDates.push(new Date(r.date)); });
  (state.symptoms||[]).forEach(function(r){ allDates.push(new Date(r.dateTime)); });
  allDates = allDates.filter(function(d){ return !isNaN(d.getTime()); }).sort(function(a,b){ return b-a; });

  if(allDates.length){
    hasAnyData = true;
    html += '<div class="summary-section"><div class="summary-label">最近一次记录</div>';
    html += '<div class="summary-value">' + niceDate(yyyyMMdd(allDates[0])) + '</div></div>';
  }

  /* Blood pressure */
  var bpRecs = getSummaryPeriodRecords(state.vitals.bp, days);
  if(bpRecs.length){
    hasAnyData = true;
    var lastBP = bpRecs[bpRecs.length-1];
    var sysTr = computeTrendArrow(bpRecs.map(function(r){return r.sys;}));
    var diaTr = computeTrendArrow(bpRecs.map(function(r){return r.dia;}));
    html += '<div class="summary-section">';
    html += '<div class="summary-label">血压 <span class="summary-count">(' + bpRecs.length + '次)</span></div>';
    html += '<div class="summary-value">最近：' + lastBP.sys + '/' + lastBP.dia + ' mmHg';
    if(lastBP.context) html += ' · ' + escapeHtml(lastBP.context);
    html += '</div>';
    html += '<div class="summary-trend">收缩压 ' + sysTr.arrow + ' ' + sysTr.text + ' · 舒张压 ' + diaTr.arrow + ' ' + diaTr.text + '</div>';
    if(bpRecs.length >= 2) html += '<div style="margin-top:4px;">' + sparklineSvg(bpRecs.map(function(r){return r.sys;}),{w:120,h:22}) + '</div>';
    html += '</div>';
  }

  /* Weight */
  var wtRecs = getSummaryPeriodRecords(state.vitals.weight, days);
  if(wtRecs.length){
    hasAnyData = true;
    var lastWt = wtRecs[wtRecs.length-1];
    var wtTr = computeTrendArrow(wtRecs.map(function(r){return r.kg;}));
    html += '<div class="summary-section">';
    html += '<div class="summary-label">体重 <span class="summary-count">(' + wtRecs.length + '次)</span></div>';
    html += '<div class="summary-value">最近：' + lastWt.kg + ' kg</div>';
    html += '<div class="summary-trend">趋势 ' + wtTr.arrow + ' ' + wtTr.text + ' kg</div>';
    if(wtRecs.length >= 2) html += '<div style="margin-top:4px;">' + sparklineSvg(wtRecs.map(function(r){return r.kg;}),{w:120,h:22}) + '</div>';
    html += '</div>';
  }

  /* Blood glucose */
  var gluRecs = getSummaryPeriodRecords(state.vitals.glucose, days);
  if(gluRecs.length){
    hasAnyData = true;
    var lastGlu = gluRecs[gluRecs.length-1];
    var gVal = toNum(lastGlu.value);
    var gUnit = (lastGlu.unit||'mmolL') === 'mgdl' ? 'mg/dL' : 'mmol/L';
    html += '<div class="summary-section">';
    html += '<div class="summary-label">血糖 <span class="summary-count">(' + gluRecs.length + '次)</span></div>';
    html += '<div class="summary-value">最近：' + (gVal!==null?gVal:'—') + ' ' + gUnit + '</div>';
    html += '</div>';
  }

  /* Labs */
  var labRecs = (state.labs||[]).filter(function(r){
    var d = new Date(r.date); return !isNaN(d.getTime()) && d >= cutoff;
  }).sort(function(a,b){ return (a.date||'').localeCompare(b.date||''); });
  if(labRecs.length){
    hasAnyData = true;
    var ll = labRecs[labRecs.length-1];
    html += '<div class="summary-section">';
    html += '<div class="summary-label">化验 <span class="summary-count">(最近：' + niceDate(ll.date) + ')</span></div>';
    var lp = [];
    if(ll.scr) lp.push('Scr ' + ll.scr + (ll.scrUnit==='mgdl'?' mg/dL':' μmol/L'));
    if(ll.egfr) lp.push('eGFR ' + ll.egfr);
    if(ll.k) lp.push('K ' + ll.k);
    if(ll.na) lp.push('Na ' + ll.na);
    if(ll.ca) lp.push('Ca ' + ll.ca);
    if(ll.p) lp.push('P ' + ll.p);
    if(ll.glu) lp.push('Glu ' + ll.glu);
    if(ll.hba1c) lp.push('HbA1c ' + ll.hba1c + '%');
    html += '<div class="summary-value">' + lp.join(' · ') + '</div>';
    if(labRecs.length >= 2){
      var prev = labRecs[labRecs.length-2];
      if(ll.egfr && prev.egfr){
        var ed = toNum(ll.egfr) - toNum(prev.egfr);
        if(ed !== null){
          var ea = ed > 0.5 ? '↑' : (ed < -0.5 ? '↓' : '→');
          html += '<div class="summary-trend">eGFR变化：' + ea + ' ' + (ed>0?'+':'') + (Math.round(ed*10)/10) + '</div>';
        }
      }
    }
    html += '</div>';
  }

  /* Urine tests */
  var urRecs = (state.urineTests||[]).filter(function(r){
    var d = new Date(r.date); return !isNaN(d.getTime()) && d >= cutoff;
  }).sort(function(a,b){ return (a.date||'').localeCompare(b.date||''); });
  if(urRecs.length){
    hasAnyData = true;
    var lu = urRecs[urRecs.length-1];
    html += '<div class="summary-section">';
    html += '<div class="summary-label">尿检</div>';
    html += '<div class="summary-value">' + niceDate(lu.date) + ' · 蛋白 ' + (lu.protein||'—') + ' · 潜血 ' + (lu.blood||'—');
    if(lu.note) html += ' · ' + escapeHtml(lu.note);
    html += '</div></div>';
  }

  /* Symptoms */
  var symRecs = getSummaryPeriodRecords(state.symptoms, days);
  if(symRecs.length){
    hasAnyData = true;
    html += '<div class="summary-section">';
    html += '<div class="summary-label">症状/事件 <span class="summary-count">(' + symRecs.length + '条)</span></div>';
    symRecs.forEach(function(s){
      html += '<div class="summary-sym">';
      html += '<span class="summary-sym-date">' + niceDate(String(s.dateTime).slice(0,10)) + '</span> ';
      html += (s.tags||[]).map(function(t){return escapeHtml(t);}).join('、');
      if(s.note) html += ' — ' + escapeHtml(s.note);
      html += '</div>';
    });
    html += '</div>';
  }

  /* Meds */
  var medRecs = getSummaryPeriodRecords(state.medsLog, days);
  if(medRecs.length){
    hasAnyData = true;
    var taken = medRecs.filter(function(m){return m.status==='taken';}).length;
    html += '<div class="summary-section">';
    html += '<div class="summary-label">用药打卡</div>';
    html += '<div class="summary-value">' + medRecs.length + '次记录，按时 ' + taken + '次';
    var missed = medRecs.filter(function(m){return m.status==='missed';}).length;
    if(missed) html += '，漏服 ' + missed + '次';
    html += '</div></div>';
  }

  html += '<div class="summary-disclaimer">本摘要用于随访沟通与复诊准备，不提供医疗诊断或治疗建议。指标异常或不适请及时联系医生，紧急情况请立即就医。</div>';

  if(!hasAnyData){
    return '<div class="empty-cta"><div class="emoji">📋</div>' +
      '<div class="msg">还没有记录数据<br>先去"记录"页添加一条血压、体重或化验，摘要就会自动生成</div>' +
      '<button class="primary" onclick="navigate(\'records\');trackEvent(\'page_view\',{page:\'records\'});">去记录</button></div>';
  }
  return html;
}

/* ===== Build plain text for copy ===== */
function buildSummaryText(days){
  var cutoff = new Date(Date.now() - days * 24 * 3600 * 1000);
  var L = [];
  L.push('【随访摘要（近' + days + '天）】');
  L.push('时间：' + nowISO() + '  项目：' + programLabel(state.activeProgram));
  L.push('');

  var bpRecs = getSummaryPeriodRecords(state.vitals.bp, days);
  if(bpRecs.length){
    var lb = bpRecs[bpRecs.length-1];
    var st = computeTrendArrow(bpRecs.map(function(r){return r.sys;}));
    L.push('血压(' + bpRecs.length + '次)：最近 ' + lb.sys + '/' + lb.dia + ' mmHg  趋势 ' + st.arrow + st.text);
  }
  var wtRecs = getSummaryPeriodRecords(state.vitals.weight, days);
  if(wtRecs.length){
    var lw = wtRecs[wtRecs.length-1];
    var wt = computeTrendArrow(wtRecs.map(function(r){return r.kg;}));
    L.push('体重(' + wtRecs.length + '次)：最近 ' + lw.kg + ' kg  趋势 ' + wt.arrow + wt.text + ' kg');
  }
  var labRecs = (state.labs||[]).filter(function(r){ var d=new Date(r.date); return !isNaN(d.getTime())&&d>=cutoff; });
  if(labRecs.length){
    var ll = labRecs[labRecs.length-1];
    var pp = [];
    if(ll.scr) pp.push('Scr ' + ll.scr);
    if(ll.egfr) pp.push('eGFR ' + ll.egfr);
    if(ll.k) pp.push('K ' + ll.k);
    if(ll.na) pp.push('Na ' + ll.na);
    if(ll.ca) pp.push('Ca ' + ll.ca);
    if(ll.p) pp.push('P ' + ll.p);
    if(ll.glu) pp.push('Glu ' + ll.glu);
    if(ll.hba1c) pp.push('HbA1c ' + ll.hba1c + '%');
    L.push('化验(' + niceDate(ll.date) + ')：' + pp.join(' · '));
  }
  var urRecs = (state.urineTests||[]).filter(function(r){ var d=new Date(r.date); return !isNaN(d.getTime())&&d>=cutoff; });
  if(urRecs.length){
    var lu = urRecs[urRecs.length-1];
    L.push('尿检(' + niceDate(lu.date) + ')：蛋白 ' + (lu.protein||'—') + ' 潜血 ' + (lu.blood||'—'));
  }
  var symRecs = getSummaryPeriodRecords(state.symptoms, days);
  if(symRecs.length){
    L.push('');
    L.push('症状/事件：');
    symRecs.forEach(function(s){
      L.push('  ' + niceDate(String(s.dateTime).slice(0,10)) + '：' + (s.tags||[]).join('、') + (s.note?'（'+s.note+'）':''));
    });
  }
  var q = (state.summaryQuestions||'').trim();
  if(q){ L.push(''); L.push('想问医生的问题：'); L.push(q); }
  L.push('');
  L.push('——');
  L.push('本摘要用于随访沟通与复诊准备，不替代医生诊治。');
  return L.join('\n');
}

/* ===== Render summary page ===== */
function renderSummary(){
  var content = qs('#summaryContent');
  if(!content) return;

  content.innerHTML = buildSummaryHTML(_summaryDays);

  /* Period toggle highlight */
  var b7 = qs('#btnSummary7d'), b30 = qs('#btnSummary30d');
  if(b7) b7.className = (_summaryDays===7) ? 'primary small' : 'ghost small';
  if(b30) b30.className = (_summaryDays===30) ? 'primary small' : 'ghost small';

  /* Questions textarea */
  var qa = qs('#summaryQuestions');
  if(qa) qa.value = state.summaryQuestions || '';

  /* CTA: show on summary page when user has ≥1 record (P0-4 scenario 1) */
  renderSummaryCTA();
}

function renderSummaryCTA(){
  var el = qs('#summaryCta');
  if(!el) return;
  var hasRecs = (state.vitals.bp||[]).length > 0 || (state.labs||[]).length > 0 ||
                (state.vitals.weight||[]).length > 0 || (state.symptoms||[]).length > 0;
  if(hasRecs && !state.ctaRemoteDismissed){
    el.classList.remove('hidden');
    el.innerHTML =
      '<div class="cta-card">' +
        '<div class="cta-text">开启远程随访（自动提醒 / 医生协作）</div>' +
        '<div class="cta-desc">远程随访可提供：自动提醒、医生协作、报告归档（试用中）</div>' +
        '<div class="cta-actions">' +
          '<a href="https://kidneysphereremote.cn/?from=followup&trigger=summary_share" target="_blank" rel="noopener" ' +
            'class="cta-link" onclick="trackEvent(\'cta_remote_click\',{trigger:\'summary_cta\'})">了解远程随访</a>' +
          '<button class="ghost small" id="ctaDismissSummary">暂不需要</button>' +
        '</div>' +
      '</div>';
    setTimeout(function(){
      var d = qs('#ctaDismissSummary');
      if(d) d.onclick = function(){ state.ctaRemoteDismissed = true; saveState(); el.classList.add('hidden'); };
    }, 0);
  } else {
    el.classList.add('hidden');
  }
}

/* ===== Home CTA: 3+ records in 7 days (P0-4 scenario 3) ===== */
function renderHomeCTA(){
  var el = qs('#homeCtaRemote');
  if(!el) return;
  var cnt = countRecordsInLast7Days();
  if(cnt >= 3 && !state.ctaHomeDismissed){
    el.classList.remove('hidden');
    el.innerHTML =
      '<div class="cta-card">' +
        '<div class="cta-text">你已坚持记录，下一步可开启自动提醒</div>' +
        '<div class="cta-desc">远程随访提供：自动提醒、医生协作、报告归档（试用中）</div>' +
        '<div class="cta-actions">' +
          '<a href="https://kidneysphereremote.cn/?from=followup&trigger=home_streak" target="_blank" rel="noopener" ' +
            'class="cta-link" onclick="trackEvent(\'cta_remote_click\',{trigger:\'home_streak\'})">了解远程随访</a>' +
          '<button class="ghost small" id="ctaDismissHome">关闭</button>' +
        '</div>' +
      '</div>';
    setTimeout(function(){
      var d = qs('#ctaDismissHome');
      if(d) d.onclick = function(){ state.ctaHomeDismissed = true; saveState(); el.classList.add('hidden'); };
    }, 0);
  } else {
    el.classList.add('hidden');
  }
}

/* ===== Privacy & Terms pages (P0-6) ===== */
function renderPrivacy(){
  var el = qs('#privacyBody');
  if(!el) return;
  el.innerHTML =
    '<div class="guide-title">隐私政策（简版）</div>' +
    '<div class="guide-section"><div class="guide-h">数据存储</div>' +
    '<div class="guide-p">所有健康数据（血压、体重、化验等）仅保存在您的本地设备（浏览器 localStorage / IndexedDB）中。我们不会上传、收集或存储您的个人健康数据。</div></div>' +
    '<div class="guide-section"><div class="guide-h">匿名统计</div>' +
    '<div class="guide-p">为改善产品体验，我们可能收集匿名的使用统计信息（如页面访问次数、功能使用频率等），这些数据不包含任何个人身份信息或健康数据。</div></div>' +
    '<div class="guide-section"><div class="guide-h">数据安全</div>' +
    '<div class="guide-p">您可以随时通过"我的 → 数据备份"导出或删除所有本地数据。清除浏览器数据将永久删除所有记录，请提前备份。</div></div>' +
    '<div class="guide-section"><div class="guide-h">第三方服务</div>' +
    '<div class="guide-p">本应用当前不接入任何第三方登录、广告或数据分析服务。如未来接入，将提前更新隐私政策并告知用户。</div></div>' +
    '<div class="guide-section"><div class="guide-h">联系方式</div>' +
    '<div class="guide-p">如有隐私相关问题，请联系：privacy@kidneysphere.cn（占位）</div></div>' +
    '<div class="note" style="margin-top:14px;">最后更新：2025年2月 · 上海胤域医学科技有限公司</div>';
}

function renderTerms(){
  var el = qs('#termsBody');
  if(!el) return;
  el.innerHTML =
    '<div class="guide-title">用户协议（简版）</div>' +
    '<div class="guide-section"><div class="guide-h">服务说明</div>' +
    '<div class="guide-p">肾域随访是一款健康管理与随访记录工具，帮助用户记录血压、体重、化验等健康数据，并生成趋势分析和随访摘要。本工具<b>不提供医疗诊断、治疗建议或处方服务</b>。</div></div>' +
    '<div class="guide-section"><div class="guide-h">免责声明</div>' +
    '<div class="guide-p">本工具中的趋势分析、安全提醒等功能仅供参考，不能替代专业医疗人员的判断。出现胸痛、呼吸困难、意识改变、抽搐、少尿/无尿、发热伴剧烈腰痛等紧急情况，请<b>立即就医或拨打急救电话</b>。</div></div>' +
    '<div class="guide-section"><div class="guide-h">使用责任</div>' +
    '<div class="guide-p">用户应确保录入数据的准确性。本工具的输出内容（摘要、趋势等）基于用户录入的数据生成，可能存在不完整或不准确的情况。重要健康决策请以医生建议为准。</div></div>' +
    '<div class="guide-section"><div class="guide-h">知识产权</div>' +
    '<div class="guide-p">本应用的界面设计、代码和内容的知识产权归上海胤域医学科技有限公司所有。</div></div>' +
    '<div class="note" style="margin-top:14px;">最后更新：2025年2月 · 上海胤域医学科技有限公司</div>';
}

/* ===== Quick-start card for home (P0-1) ===== */
function renderQuickStart(){
  var el = qs('#quickStartCard');
  if(!el) return;
  var hasLabs = (state.labs||[]).length > 0;
  var hasBP = (state.vitals?.bp||[]).length > 0;
  var hasWeight = (state.vitals?.weight||[]).length > 0;
  /* Hide quick-start once user has at least 2 types of data */
  var typesCount = (hasLabs?1:0) + (hasBP?1:0) + (hasWeight?1:0);
  if(typesCount >= 2){
    el.classList.add('hidden');
    return;
  }
  el.classList.remove('hidden');
  el.innerHTML =
    '<div class="card-hd"><div>' +
      '<div class="card-title">3 步快速上手</div>' +
      '<div class="card-subtitle">随访记录更轻松，趋势一目了然</div>' +
    '</div></div>' +
    '<div class="quick-steps">' +
      '<div class="quick-step' + (typesCount>=1?' done':'') + '" onclick="navigate(\'records\');trackEvent(\'page_view\',{page:\'records\'});">' +
        '<div class="quick-step-num">' + (typesCount>=1?'✓':'1') + '</div>' +
        '<div class="quick-step-text"><b>添加一次记录</b><br><span>血压/体重/症状/化验任选其一</span></div>' +
      '</div>' +
      '<div class="quick-step' + (typesCount>=2?' done':'') + '" onclick="navigate(\'records\');">' +
        '<div class="quick-step-num">2</div>' +
        '<div class="quick-step-text"><b>看趋势</b><br><span>记录后自动生成图表</span></div>' +
      '</div>' +
      '<div class="quick-step" onclick="navigate(\'summary\');trackEvent(\'summary_view\');">' +
        '<div class="quick-step-num">3</div>' +
        '<div class="quick-step-text"><b>生成随访摘要</b><br><span>可分享给医生</span></div>' +
      '</div>' +
    '</div>';
}

/* ===== Global footer renderer ===== */
function renderSiteFooter(){
  qsa('.site-footer').forEach(function(el){
    el.innerHTML =
      '<div class="footer-disclaimer">本工具用于健康管理与随访记录，不提供医疗诊断或治疗建议。指标异常或不适请及时联系医生，紧急情况请立即就医/急救。</div>' +
      '<div class="footer-links">' +
        '<a href="#" onclick="event.preventDefault();openPrivacyPage();">隐私政策</a>' +
        '<span class="footer-sep">|</span>' +
        '<a href="#" onclick="event.preventDefault();openTermsPage();">用户协议</a>' +
        '<span class="footer-sep">|</span>' +
        '<span class="footer-muted">联系：contact@kidneysphere.cn</span>' +
      '</div>' +
      '<div class="footer-icp">ICP备案号：沪ICP备XXXXXXXX号（占位）</div>' +
      '<div class="footer-company">上海胤域医学科技有限公司</div>';
  });
}

/* Overlay page openers */
function openPrivacyPage(){
  state.ui.overlayReturn = currentTabKey || 'home';
  saveState();
  navigate('privacy');
  trackEvent('page_view', {page:'privacy'});
}
function openTermsPage(){
  state.ui.overlayReturn = currentTabKey || 'home';
  saveState();
  navigate('terms');
  trackEvent('page_view', {page:'terms'});
}

/* ===== Summary page action handlers ===== */
function handleSummaryCopy(){
  var text = buildSummaryText(_summaryDays);
  try{
    navigator.clipboard.writeText(text).then(function(){
      toast('已复制摘要文字，可粘贴发送给医生');
    });
  }catch(_e){
    prompt('复制下面内容：', text);
  }
  trackEvent('summary_copy');
}

function handleSummaryPrint(){
  trackEvent('summary_print');
  /* Show CTA toast before printing (P0-4 scenario 2) */
  if(!state.ctaRemoteDismissed){
    openSimpleModal('提示','',
      '<div class="note">如需自动提醒与医生协作，可<a href="https://kidneysphereremote.cn/?from=followup&trigger=summary_print" target="_blank" rel="noopener" onclick="trackEvent(\'cta_remote_click\',{trigger:\'summary_print\'})">开启远程随访</a></div>' +
      '<div class="note subtle" style="margin-top:6px;">点击"打印"继续导出 PDF</div>',
      '<button class="primary" id="btnDoPrint">打印</button><button class="ghost" data-close="modalSimple">取消</button>');
    setTimeout(function(){
      var bp = qs('#btnDoPrint');
      if(bp) bp.onclick = function(){ closeModal('modalSimple'); setTimeout(function(){ window.print(); }, 200); };
      qsa('#modalSimple [data-close]').forEach(function(b){ b.onclick = function(){ closeModal('modalSimple'); }; });
    }, 0);
  } else {
    window.print();
  }
}

function handleSummaryRemote(){
  trackEvent('cta_remote_click', {trigger:'summary_share'});
  window.open('https://kidneysphereremote.cn/?from=followup&trigger=summary_share', '_blank');
}
