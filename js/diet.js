/* diet.js - Diet food library, search, and diet modal */
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
            <div class="s">针对不同健康需求的饮食方案，均已做肾友好适配（限钾/控磷提醒）。</div>
      <div class="row" style="margin-top:10px;flex-wrap:wrap;gap:8px;">
        <button class="primary small" data-diet-guide="dash">DASH 得舒饮食（降压）</button>
        <button class="primary small" data-diet-guide="mediterranean">地中海饮食（心血管保护）</button>
        <button class="ghost small" data-diet-guide="masld">脂肪肝/MASLD 饮食</button>
      </div>
      <div class="note subtle">提示：所有指南均包含"肾病患者特别注意事项"，帮你避免照搬导致的钾/磷/蛋白质风险。</div>
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
