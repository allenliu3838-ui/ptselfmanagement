/* render.js - All rendering functions, navigation, and modal show/close */
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

function renderUsagePage(){
  const bodyEl = qs("#usageBody");
  if(!bodyEl) return;

  const prog = state.activeProgram;
  const progName = programLabel(prog);

  // Quick-start scenario based on whether user has any data
  const hasLabs = (state.labs||[]).length > 0;
  const hasBP = (state.vitals?.bp||[]).length > 0;
  const hasAnyData = hasLabs || hasBP;

  const quickStartHtml = hasAnyData
    ? `<div class="guide-p" style="background:#e8f5e9;padding:10px 12px;border-radius:10px;"><b>你已经开始了！</b>已有 ${(state.labs||[]).length} 次化验、${(state.vitals?.bp||[]).length} 次血压记录。继续保持，每天 1 分钟就够。</div>`
    : `<div class="guide-p" style="background:#fff8e1;padding:10px 12px;border-radius:10px;"><b>你还没有任何记录。</b>建议现在就完成第一步：回到首页，录入一次血压或体重（30 秒）。有了第一条数据，后面的功能才会"活"起来。</div>`;

  bodyEl.innerHTML = `
    <div class="guide-title">3 分钟学会使用肾域随访</div>
    ${quickStartHtml}

    <div class="guide-section">
      <div class="guide-h">30 秒了解：这个 App 帮你做什么？</div>
      <div class="guide-p">在两次门诊之间，帮你<b>记录数据 → 发现变化 → 整理摘要 → 带去复诊</b>。</div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;margin:8px 0;">
        <span style="flex:1;min-width:70px;text-align:center;padding:8px 4px;background:#f0f7ff;border-radius:8px;font-size:12px;"><b>记录</b><br><span style="color:var(--muted);">血压/体重<br>化验/尿检</span></span>
        <span style="color:var(--primary);display:flex;align-items:center;">→</span>
        <span style="flex:1;min-width:70px;text-align:center;padding:8px 4px;background:#f0f7ff;border-radius:8px;font-size:12px;"><b>分析</b><br><span style="color:var(--muted);">趋势图表<br>安全提醒</span></span>
        <span style="color:var(--primary);display:flex;align-items:center;">→</span>
        <span style="flex:1;min-width:70px;text-align:center;padding:8px 4px;background:#f0f7ff;border-radius:8px;font-size:12px;"><b>整理</b><br><span style="color:var(--muted);">一页摘要<br>复诊准备包</span></span>
        <span style="color:var(--primary);display:flex;align-items:center;">→</span>
        <span style="flex:1;min-width:70px;text-align:center;padding:8px 4px;background:#e8f5e9;border-radius:8px;font-size:12px;"><b>复诊</b><br><span style="color:var(--muted);">给医生看<br>问对问题</span></span>
      </div>
    </div>

    <div class="guide-section">
      <div class="guide-h">场景一：刚确诊 / 第一次用</div>
      <ol>
        <li><b>建档</b>：点首页顶部「资料」→ 填写基本信息（年龄、身份、诊断）</li>
        <li><b>录入最近一次化验</b>：底部「记录」→「化验录入」→ 新增（如果手边有化验单，可以直接用📷 拍照）</li>
        <li><b>录入今天的血压和体重</b>：「记录」→ 点对应方块，填数字，保存</li>
        <li><b>上传手头的报告</b>：底部「资料库」→ 上传活检/基因/影像报告</li>
      </ol>
      <div class="guide-p">完成以上 4 步，系统就能开始为你生成趋势分析和安全提醒了。</div>
    </div>

    <div class="guide-section">
      <div class="guide-h">场景二：日常使用（每天 1 分钟）</div>
      <ol>
        <li>打开 App → 首页显示<b>「今日行动」</b></li>
        <li>完成 1–2 项打勾（通常是血压 + 体重）</li>
        <li>看一眼<b>安全提醒</b>（如果是绿色就不用管）</li>
      </ol>
      <div class="guide-p" style="color:var(--muted);font-size:12px;">小技巧：固定一个时间点（如起床后、睡前）测量并记录，更容易养成习惯。连续记录会点亮 🔥 连续天数。</div>
    </div>

    <div class="guide-section">
      <div class="guide-h">场景三：拿到新化验单</div>
      <ol>
        <li>底部「记录」→ 化验卡片 → 点<b>「📷 拍照」</b>或「新增」</li>
        <li>拍照：对准化验单拍一张 → 系统识别 → 核对数字 → 保存</li>
        <li>手动：直接填数字 → 保存</li>
      </ol>
      <div class="guide-p">保存后自动触发：趋势更新、饮食建议刷新、安全提醒重新计算。</div>
    </div>

    <div class="guide-section">
      <div class="guide-h">场景四：复诊前（最重要！）</div>
      <ol>
        <li>底部「我的」→ 点<b>「复诊准备包 → 生成」</b></li>
        <li>查看：指标变化对比、建议问医生的问题清单</li>
        <li>点「复制全部」→ 粘贴到备忘录/微信，或者直接让医生看手机屏幕</li>
      </ol>
      <div class="guide-p"><b>效果</b>：医生能在 30 秒内看完你的全部变化，不用你一项项回忆。这会让门诊时间更有效率。</div>
    </div>

    <div class="guide-section">
      <div class="guide-h">场景五：家人想了解你的情况</div>
      <ol>
        <li>底部「我的」→ 点<b>「家属共享 → 开启」</b></li>
        <li>生成 6 位共享码 → 发给家人</li>
        <li>家人打开 App 输入共享码 → 能看到你的指标趋势和安全提醒</li>
      </ol>
      <div class="guide-p" style="color:var(--muted);font-size:12px;">家属只能查看，不能修改你的数据。你可以随时关闭共享或更换共享码。</div>
    </div>

    <div class="guide-section">
      <div class="guide-h">5 个标签页，各管什么</div>
      <table style="width:100%;font-size:12px;border-collapse:collapse;">
        <tr style="background:#f8f9fa;"><td style="padding:6px;font-weight:700;">标签</td><td style="padding:6px;font-weight:700;">用途</td><td style="padding:6px;font-weight:700;">使用频率</td></tr>
        <tr style="border-top:1px solid #eee;"><td style="padding:6px;">首页</td><td style="padding:6px;">今日任务、安全提醒、关键数据速览</td><td style="padding:6px;">每天</td></tr>
        <tr style="border-top:1px solid #eee;"><td style="padding:6px;">记录</td><td style="padding:6px;">录入血压/体重/化验/尿检/透析/饮水等</td><td style="padding:6px;">每天</td></tr>
        <tr style="border-top:1px solid #eee;"><td style="padding:6px;">资料库</td><td style="padding:6px;">上传管理检查报告（活检/基因/影像等）</td><td style="padding:6px;">有报告时</td></tr>
        <tr style="border-top:1px solid #eee;"><td style="padding:6px;">我的</td><td style="padding:6px;">摘要、复诊包、家属共享、设置、备份</td><td style="padding:6px;">复诊前</td></tr>
        <tr style="border-top:1px solid #eee;"><td style="padding:6px;">AI</td><td style="padding:6px;">AI 助手（化验解读、问题生成）</td><td style="padding:6px;">按需</td></tr>
      </table>
    </div>

    <div class="guide-section">
      <div class="guide-h">数据安全</div>
      <ul>
        <li>所有数据<b>只存在你的手机/电脑上</b>，不上传云端</li>
        <li>建议<b>每周备份一次</b>：「我的」→「数据备份」→「完整备份」</li>
        <li>清除浏览器数据或卸载会丢失数据 — 请务必先备份</li>
        <li>超过 7 天未备份系统会自动提醒</li>
      </ul>
    </div>

    <div class="guide-section">
      <div class="guide-h">常见问题</div>
      <ul>
        <li><b>Q：我不懂那些医学指标怎么办？</b><br>A：每个指标旁边都有 <b>i</b> 按钮，点开就有通俗解释。你不需要记住数值含义，系统会自动判断并提醒。</li>
        <li><b>Q：数据填错了怎么改？</b><br>A：目前需要在「我的 → 数据备份」导出后手动修改 JSON。后续会加入直接编辑功能。</li>
        <li><b>Q：换新手机了怎么办？</b><br>A：在旧手机上导出完整备份 → 在新手机上导入即可恢复全部数据和文件。</li>
        <li><b>Q：家人帮忙录入可以吗？</b><br>A：完全可以。子女帮父母录入是最常见的使用方式。</li>
      </ul>
    </div>

    <div class="disclaimer" style="margin-top:14px;">
      <strong>重要提醒：</strong>本工具用于健康数据记录和复诊整理，不提供诊断或处方。出现胸痛、气促、意识改变、少尿无尿、高热剧痛等红旗症状，请<b>立即就医</b>。
    </div>
  `;
}

function renderGuidePage(){
  const bodyEl = qs("#guideBody");
  if(!bodyEl) return;

  const prog = state.activeProgram;

  // ====== Common sections (shared across all programs) ======
  const commonIntro = `
    <div class="guide-section">
      <div class="guide-h">随访是什么？</div>
      <div class="guide-p">随访 = 两次门诊之间，<b>你自己记录</b> + <b>系统帮你看趋势</b>。</div>
      <div class="guide-p">目标不是"多做检查"，而是<b>更早发现变化 → 更早沟通 → 少住院、少并发症</b>。</div>
      <div class="guide-p" style="background:#f0f7ff;padding:8px 10px;border-radius:8px;margin-top:8px;">
        类比：汽车每 5000 公里保养一次，但你每天会看仪表盘。随访就是你身体的"仪表盘"——不需要懂发动机，只需要在指针异常时及时去4S店。
      </div>
    </div>
    <div class="guide-section">
      <div class="guide-h">你每天需要做什么？</div>
      <table style="width:100%;font-size:12px;border-collapse:collapse;">
        <tr style="background:#f8f9fa;"><td style="padding:6px;font-weight:700;">频率</td><td style="padding:6px;font-weight:700;">做什么</td><td style="padding:6px;font-weight:700;">花多久</td></tr>
        <tr style="border-top:1px solid #eee;"><td style="padding:6px;">每天</td><td style="padding:6px;">测血压 + 称体重 → 在 App 记录</td><td style="padding:6px;">1 分钟</td></tr>
        <tr style="border-top:1px solid #eee;"><td style="padding:6px;">拿到化验单时</td><td style="padding:6px;">拍照录入或手动填写</td><td style="padding:6px;">2 分钟</td></tr>
        <tr style="border-top:1px solid #eee;"><td style="padding:6px;">复诊前 1 天</td><td style="padding:6px;">打开"复诊准备包"，复制给医生</td><td style="padding:6px;">1 分钟</td></tr>
      </table>
      <div class="guide-p" style="color:var(--muted);font-size:12px;margin-top:6px;">就这些。不需要每天花半小时。养成习惯后跟刷牙一样自然。</div>
    </div>`;

  const commonRedFlag = `
    <div class="guide-section">
      <div class="guide-h">什么时候必须立即就医？（红旗信号）</div>
      <div class="guide-p" style="background:#fef2f2;padding:10px 12px;border-radius:8px;border-left:3px solid var(--danger);">以下情况<b>不要等下次复诊</b>，请立即去急诊或联系你的医生：</div>
      <ul>
        <li><b>胸痛、气促</b> — 可能是心脏或肺的急症</li>
        <li><b>意识改变</b>（嗜睡、意识模糊）— 可能是电解质紊乱或脑血管事件</li>
        <li><b>少尿/无尿</b>（24小时尿量 &lt; 400ml）— 可能是急性肾损伤</li>
        <li><b>高热（&gt;38.5°C）+ 剧烈腰痛/腹痛</b> — 可能是感染</li>
        <li><b>肉眼血尿</b>（洗肉水色/鲜红色尿）</li>
        <li><b>严重水肿</b>（眼睑/下肢突然明显肿胀）</li>
        <li><b>血压 &gt; 180/120</b> 或伴头痛/视物模糊</li>
        <li><b>剧烈恶心呕吐</b>无法进食进水</li>
      </ul>
      <div class="guide-p" style="font-size:12px;color:var(--muted);">App 会在首页置顶显示红旗提醒。但如果你感觉"不对劲"，即使 App 没提醒，也请联系医生。相信自己的感觉。</div>
    </div>`;

  const commonEnding = `
    <div class="guide-section">
      <div class="guide-h">坚持不下去怎么办？</div>
      <ul>
        <li><b>忘了记录？</b>没关系。明天继续就行，不需要补。趋势看的是长期。</li>
        <li><b>看不懂数据？</b>不需要懂。系统会用绿/黄/红告诉你"好/注意/危险"。</li>
        <li><b>觉得没用？</b>当你下次复诊，直接把"复诊准备包"给医生看的时候，你会感受到区别。</li>
        <li><b>家人帮忙也行</b>：子女帮父母操作、配偶互相记录，都是最常见的用法。</li>
      </ul>
    </div>
    <div class="disclaimer" style="margin-top:14px;">
      <strong>边界：</strong>本工具用于记录、教育和复诊整理，<b>不提供诊断或处方</b>。所有内容仅供参考，请以你的主治医生意见为准。
    </div>`;

  // ====== Disease-specific content ======
  const diseaseContent = {
    kidney: `
      <div class="guide-title">肾脏随访指南</div>
      <div class="guide-p" style="font-size:14px;margin-bottom:14px;">把"零散检查"变成"看得见的趋势"，让医生用 30 秒就能抓住重点。</div>
      ${commonIntro}
      <div class="guide-section">
        <div class="guide-h">肾脏随访重点关注什么？</div>
        <div class="guide-p">肾脏病的核心是<b>慢</b>——变化往往以月、年为单位。单次化验说明不了问题，<b>趋势才有意义</b>。</div>
        <table style="width:100%;font-size:12px;border-collapse:collapse;margin-top:6px;">
          <tr style="background:#f8f9fa;"><td style="padding:6px;font-weight:700;">指标</td><td style="padding:6px;font-weight:700;">它在回答什么问题</td><td style="padding:6px;font-weight:700;">你需要做什么</td></tr>
          <tr style="border-top:1px solid #eee;"><td style="padding:6px;">肌酐 / eGFR</td><td style="padding:6px;">肾功能还剩多少？稳定还是在下降？</td><td style="padding:6px;">每次化验后录入</td></tr>
          <tr style="border-top:1px solid #eee;"><td style="padding:6px;">尿蛋白</td><td style="padding:6px;">肾脏的"屏障"漏不漏？治疗有没有效果？</td><td style="padding:6px;">每次尿检后录入</td></tr>
          <tr style="border-top:1px solid #eee;"><td style="padding:6px;">血压</td><td style="padding:6px;">肾脏最怕高血压。控制得好不好？</td><td style="padding:6px;">每天在家测一次</td></tr>
          <tr style="border-top:1px solid #eee;"><td style="padding:6px;">血钾 / 血磷</td><td style="padding:6px;">电解质安全吗？需要调整饮食吗？</td><td style="padding:6px;">化验后录入</td></tr>
          <tr style="border-top:1px solid #eee;"><td style="padding:6px;">体重</td><td style="padding:6px;">有没有水肿？营养状况如何？</td><td style="padding:6px;">每天称一次</td></tr>
        </table>
      </div>
      <div class="guide-section">
        <div class="guide-h">不同阶段，关注重点不同</div>
        <ul>
          <li><b>CKD 1-3 期（早中期）</b>：重点是延缓进展。关注 eGFR 趋势、血压达标率、蛋白尿变化。每 3-6 个月化验。</li>
          <li><b>CKD 4-5 期（晚期）</b>：重点是准备和过渡。关注 eGFR 下降速度、电解质、营养。每 1-3 个月化验。可能需要讨论透析/移植时机。</li>
          <li><b>肾小球病（IgA/膜性/微小病变等）</b>：重点是疗效评估。关注蛋白尿变化趋势（缓解/复发）、免疫抑制剂副作用监测。</li>
          <li><b>ADPKD（多囊肾）</b>：重点是长期趋势。关注 eGFR、肾脏体积（影像）、血压。</li>
          <li><b>肾移植</b>：重点是排斥和感染。关注肌酐稳定性、免疫抑制剂浓度、dd-cfDNA/DSA 等指标。</li>
        </ul>
      </div>
      <div class="guide-section">
        <div class="guide-h">饮食与肾脏</div>
        <div class="guide-p">肾病的饮食管理不是"什么都不能吃"，而是<b>根据化验结果动态调整</b>：</div>
        <ul>
          <li><b>血钾高</b> → 少吃高钾食物（香蕉、橙子、土豆、菌菇）。App 会根据化验自动提醒。</li>
          <li><b>血磷高</b> → 注意加工食品、动物内脏、碳酸饮料。</li>
          <li><b>蛋白尿明显</b> → 蛋白质摄入不宜过多（具体量请遵医嘱）。</li>
          <li><b>水肿/少尿</b> → 可能需要限制水和盐的摄入。</li>
        </ul>
        <div class="guide-p" style="font-size:12px;color:var(--muted);">App 的"饮食提醒"会根据最新化验自动调整建议，在首页展开更多内容即可看到。</div>
      </div>
      ${commonRedFlag}
      ${commonEnding}`,

    dialysis: `
      <div class="guide-title">透析随访指南</div>
      <div class="guide-p" style="font-size:14px;margin-bottom:14px;">少出意外、少折腾，让每次透析和复诊都更高效。</div>
      ${commonIntro}
      <div class="guide-section">
        <div class="guide-h">透析随访重点关注什么？</div>
        <table style="width:100%;font-size:12px;border-collapse:collapse;margin-top:6px;">
          <tr style="background:#f8f9fa;"><td style="padding:6px;font-weight:700;">指标</td><td style="padding:6px;font-weight:700;">为什么重要</td><td style="padding:6px;font-weight:700;">记录频率</td></tr>
          <tr style="border-top:1px solid #eee;"><td style="padding:6px;">透前/透后体重</td><td style="padding:6px;">判断超滤量是否合适，避免低血压/水肿</td><td style="padding:6px;">每次透析</td></tr>
          <tr style="border-top:1px solid #eee;"><td style="padding:6px;">透前/透后血压</td><td style="padding:6px;">评估容量状态和心血管风险</td><td style="padding:6px;">每次透析</td></tr>
          <tr style="border-top:1px solid #eee;"><td style="padding:6px;">干体重</td><td style="padding:6px;">目标体重，超过太多=水太多</td><td style="padding:6px;">医生调整时更新</td></tr>
          <tr style="border-top:1px solid #eee;"><td style="padding:6px;">血钾</td><td style="padding:6px;">透析间期钾升高是最常见的危险</td><td style="padding:6px;">化验后录入</td></tr>
          <tr style="border-top:1px solid #eee;"><td style="padding:6px;">通路/导管状态</td><td style="padding:6px;">瘘管通畅吗？导管有没有感染迹象？</td><td style="padding:6px;">有异常时记录</td></tr>
        </table>
      </div>
      <div class="guide-section">
        <div class="guide-h">血透 vs 腹透</div>
        <ul>
          <li><b>血透患者</b>：重点记录每次透前/透后体重和血压、超滤量。注意透析日和非透析日的血压差异。</li>
          <li><b>腹透患者</b>：重点记录每日超滤量、透析液颜色（浑浊=可能感染）、出口处状况。腹膜炎是最大威胁——腹痛+浑浊透析液→立即联系中心。</li>
        </ul>
      </div>
      <div class="guide-section">
        <div class="guide-h">透析患者饮食要点</div>
        <ul>
          <li><b>两次透析之间体重增长不超过干体重的 3-5%</b>（例如 60kg，增长不超过 1.8-3kg）</li>
          <li><b>限钾</b>：透析间期钾会升高，少吃高钾水果/蔬菜</li>
          <li><b>限磷</b>：磷升高会导致骨病和血管钙化，注意加工食品</li>
          <li><b>充足蛋白质</b>：透析会丢失蛋白，反而需要比透析前吃得稍多</li>
        </ul>
      </div>
      ${commonRedFlag}
      <div class="guide-section">
        <div class="guide-h">透析特有的紧急情况</div>
        <ul>
          <li><b>瘘管无震颤/杂音</b> → 可能血栓形成，24小时内联系透析中心</li>
          <li><b>导管处红肿/分泌物/发热</b> → 可能导管感染，立即联系</li>
          <li><b>腹透液浑浊 + 腹痛</b> → 疑似腹膜炎，立即联系</li>
          <li><b>透析后持续头晕/黑朦</b> → 可能低血压，卧位休息并报告医生</li>
        </ul>
      </div>
      ${commonEnding}`,

    stone: `
      <div class="guide-title">肾结石随访指南</div>
      <div class="guide-p" style="font-size:14px;margin-bottom:14px;">结石复发率很高——做好记录是减少复发的第一步。</div>
      ${commonIntro}
      <div class="guide-section">
        <div class="guide-h">为什么结石需要随访？</div>
        <div class="guide-p">肾结石不是"排掉就好了"。<b>5 年内复发率高达 50%</b>。随访的核心目标是<b>预防复发</b>。</div>
        <ul>
          <li><b>饮水量</b>是最重要的可控因素 — 每天 2000-2500ml，保持尿色淡黄</li>
          <li><b>发作事件记录</b>帮你和医生发现规律：什么季节容易发？和饮食/运动有关吗？</li>
          <li><b>结石成分分析</b>（如果做过）决定饮食调整方向</li>
        </ul>
      </div>
      <div class="guide-section">
        <div class="guide-h">结石随访重点</div>
        <table style="width:100%;font-size:12px;border-collapse:collapse;margin-top:6px;">
          <tr style="background:#f8f9fa;"><td style="padding:6px;font-weight:700;">记录项</td><td style="padding:6px;font-weight:700;">意义</td><td style="padding:6px;font-weight:700;">频率</td></tr>
          <tr style="border-top:1px solid #eee;"><td style="padding:6px;">每日饮水量</td><td style="padding:6px;">预防复发的第一道防线</td><td style="padding:6px;">每天</td></tr>
          <tr style="border-top:1px solid #eee;"><td style="padding:6px;">发作事件</td><td style="padding:6px;">腰痛/血尿/发热/急诊/手术，建立时间线</td><td style="padding:6px;">发生时</td></tr>
          <tr style="border-top:1px solid #eee;"><td style="padding:6px;">影像报告</td><td style="padding:6px;">结石大小/位置变化</td><td style="padding:6px;">复查时上传</td></tr>
          <tr style="border-top:1px solid #eee;"><td style="padding:6px;">24小时尿液分析</td><td style="padding:6px;">找出代谢异常，指导精准预防</td><td style="padding:6px;">医生安排时</td></tr>
        </table>
      </div>
      <div class="guide-section">
        <div class="guide-h">不同结石的饮食方向</div>
        <ul>
          <li><b>草酸钙结石</b>（最常见）：少吃高草酸食物（菠菜、坚果、浓茶、巧克力），适量补钙反而有益</li>
          <li><b>尿酸结石</b>：少吃高嘌呤食物（海鲜、内脏、酒），碱化尿液</li>
          <li><b>磷酸钙/感染性结石</b>：控制尿路感染是关键</li>
          <li><b>不确定成分</b>：最重要的是<b>多喝水</b>，这对所有类型都有效</li>
        </ul>
      </div>
      ${commonRedFlag}
      ${commonEnding}`,

    peds: `
      <div class="guide-title">儿肾随访指南</div>
      <div class="guide-p" style="font-size:14px;margin-bottom:14px;">把生长发育和肾功能放在同一条时间线上，让主治医生一眼看清。</div>
      ${commonIntro}
      <div class="guide-section">
        <div class="guide-h">为什么儿童肾病需要特别的随访？</div>
        <div class="guide-p">和成人不同，孩子在<b>长身体</b>。肾病可能影响生长发育，生长数据也能反映肾功能状况。所以儿肾随访必须同时追踪<b>肾功能 + 生长</b>。</div>
      </div>
      <div class="guide-section">
        <div class="guide-h">儿肾随访重点</div>
        <table style="width:100%;font-size:12px;border-collapse:collapse;margin-top:6px;">
          <tr style="background:#f8f9fa;"><td style="padding:6px;font-weight:700;">记录项</td><td style="padding:6px;font-weight:700;">为什么重要</td><td style="padding:6px;font-weight:700;">频率</td></tr>
          <tr style="border-top:1px solid #eee;"><td style="padding:6px;">身高 / 体重</td><td style="padding:6px;">评估生长速度，是否符合预期</td><td style="padding:6px;">每月至少 1 次</td></tr>
          <tr style="border-top:1px solid #eee;"><td style="padding:6px;">血压</td><td style="padding:6px;">儿童高血压标准不同（看百分位）</td><td style="padding:6px;">每周 1-2 次</td></tr>
          <tr style="border-top:1px solid #eee;"><td style="padding:6px;">尿蛋白</td><td style="padding:6px;">肾病综合征最关注，判断缓解/复发</td><td style="padding:6px;">每次尿检后</td></tr>
          <tr style="border-top:1px solid #eee;"><td style="padding:6px;">肌酐 / eGFR</td><td style="padding:6px;">儿童用 Schwartz 公式（和身高相关），App 自动算</td><td style="padding:6px;">化验后录入</td></tr>
          <tr style="border-top:1px solid #eee;"><td style="padding:6px;">用药记录</td><td style="padding:6px;">激素减量节奏、免疫抑制剂调整</td><td style="padding:6px;">调整时记录</td></tr>
        </table>
      </div>
      <div class="guide-section">
        <div class="guide-h">家长常见问题</div>
        <ul>
          <li><b>Q：孩子长得慢是肾病的原因吗？</b><br>A：有可能。慢性肾病、长期激素使用都可能影响生长。App 会追踪生长速度（cm/年），复诊时给医生参考。</li>
          <li><b>Q：尿蛋白反复怎么办？</b><br>A：肾病综合征复发很常见（尤其感冒后）。记录每次复发的时间和诱因，帮医生找规律。</li>
          <li><b>Q：可以让孩子运动吗？</b><br>A：大多数情况可以正常活动。具体限制请遵医嘱。</li>
          <li><b>Q：该孩子操作还是家长操作？</b><br>A：建议家长操作（尤其 12 岁以下）。青少年可以一起参与，培养自我管理意识。</li>
        </ul>
      </div>
      ${commonRedFlag}
      ${commonEnding}`,

    htn: `
      <div class="guide-title">高血压随访指南</div>
      <div class="guide-p" style="font-size:14px;margin-bottom:14px;">家庭血压监测是控压的关键——门诊血压只是快照，家庭血压才是电影。</div>
      ${commonIntro}
      <div class="guide-section">
        <div class="guide-h">高血压随访重点</div>
        <ul>
          <li><b>家庭血压 ≠ 门诊血压</b>：家庭血压通常比门诊低 5-10 mmHg，更接近真实水平</li>
          <li><b>达标标准</b>：一般目标 &lt; 130/80 mmHg（具体遵医嘱）</li>
          <li><b>晨起血压最重要</b>：起床后 1 小时内、排尿后、服药前测量</li>
          <li><b>趋势比单次重要</b>：偶尔一次偏高不用紧张，连续 3-5 天偏高需要关注</li>
        </ul>
      </div>
      <div class="guide-section">
        <div class="guide-h">正确测量血压</div>
        <ol>
          <li>坐椅子，双脚平放地面，静坐 5 分钟</li>
          <li>上臂式血压计，袖带绑在心脏同高</li>
          <li>测两次，间隔 1-2 分钟，取平均值</li>
          <li>测完立即在 App 记录（30 秒，不容易忘）</li>
        </ol>
      </div>
      <div class="guide-section">
        <div class="guide-h">降压药注意事项</div>
        <ul>
          <li><b>不要自行停药</b>：血压正常了是因为药在起效，停药会反弹</li>
          <li><b>不要自行加量</b>：偶尔偏高不等于要加药，先看趋势</li>
          <li>用 App 的"今日行动"打卡提醒自己按时服药</li>
          <li>调药后连续监测 2 周，帮医生评估效果</li>
        </ul>
      </div>
      ${commonRedFlag}
      ${commonEnding}`,

    dm: `
      <div class="guide-title">糖尿病随访指南</div>
      <div class="guide-p" style="font-size:14px;margin-bottom:14px;">管好血糖就是保护肾脏——糖尿病肾病是透析的头号原因。</div>
      ${commonIntro}
      <div class="guide-section">
        <div class="guide-h">糖尿病随访重点</div>
        <table style="width:100%;font-size:12px;border-collapse:collapse;margin-top:6px;">
          <tr style="background:#f8f9fa;"><td style="padding:6px;font-weight:700;">指标</td><td style="padding:6px;font-weight:700;">意义</td><td style="padding:6px;font-weight:700;">频率</td></tr>
          <tr style="border-top:1px solid #eee;"><td style="padding:6px;">空腹/餐后血糖</td><td style="padding:6px;">日常波动情况，调药依据</td><td style="padding:6px;">每天 1-2 次</td></tr>
          <tr style="border-top:1px solid #eee;"><td style="padding:6px;">HbA1c</td><td style="padding:6px;">过去 2-3 个月平均血糖，"成绩单"</td><td style="padding:6px;">每 3 个月</td></tr>
          <tr style="border-top:1px solid #eee;"><td style="padding:6px;">尿蛋白/肌酐</td><td style="padding:6px;">早期发现糖尿病肾病</td><td style="padding:6px;">每 3-6 个月</td></tr>
          <tr style="border-top:1px solid #eee;"><td style="padding:6px;">血压</td><td style="padding:6px;">糖尿病+高血压加速肾损害</td><td style="padding:6px;">每天</td></tr>
          <tr style="border-top:1px solid #eee;"><td style="padding:6px;">体重</td><td style="padding:6px;">体重管理是血糖控制的基础</td><td style="padding:6px;">每天</td></tr>
        </table>
      </div>
      <div class="guide-section">
        <div class="guide-h">血糖控制目标</div>
        <ul>
          <li><b>空腹血糖</b>：4.4-7.0 mmol/L（具体遵医嘱）</li>
          <li><b>餐后 2h 血糖</b>：&lt; 10.0 mmol/L</li>
          <li><b>HbA1c</b>：&lt; 7%（年轻/病程短可更严格；高龄可放宽）</li>
          <li>目标因人而异 — 记录数据，让医生帮你设定适合的标准</li>
        </ul>
      </div>
      <div class="guide-section">
        <div class="guide-h">低血糖比高血糖更危险</div>
        <div class="guide-p" style="background:#fef2f2;padding:8px 10px;border-radius:8px;">
          血糖 &lt; 3.9 mmol/L = 低血糖。症状：心慌、手抖、出冷汗、头晕。<br>
          <b>处理</b>：立即吃 15g 糖（3-4 块方糖/半杯果汁），15 分钟后复测。<br>
          <b>如果意识不清</b> → 不要喂食，拨打 120。
        </div>
      </div>
      ${commonRedFlag}
      ${commonEnding}`
  };

  const defaultContent = `
    <div class="guide-title">随访指南</div>
    <div class="guide-p" style="font-size:14px;margin-bottom:14px;">更早发现变化，让每次复诊更有效率。</div>
    ${commonIntro}
    ${commonRedFlag}
    ${commonEnding}`;

  bodyEl.innerHTML = diseaseContent[prog] || defaultContent;
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
  setTabLabel("summary", "摘要");
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
  const vp = qs("#versionPill");
  if(vp) vp.textContent = `v${VERSION} · 内测`;
  qs("#meVersion").textContent = VERSION;

  qs("#brandSubtitle").textContent = `项目：${programLabel(state.activeProgram)}`;
  qs("#meProgram").textContent = programLabel(state.activeProgram);

  const enabled = Object.keys(PROGRAMS).filter(k=>isProgramEnabled(k)).map(k=>programLabel(k)).join("、");
  qs("#meEnabled").textContent = enabled;

  const pi = qs("#pillIdentity");
  if(pi) pi.textContent = `身份：${identityText()}`;

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

// ===== Engagement helpers =====
function updateStreak(){
  if(!state.engagement) state.engagement = { onboarded:false, streak:0, lastActiveDate:"", longestStreak:0 };
  const today = yyyyMMdd(new Date());
  if(state.engagement.lastActiveDate === today) return; // already counted today
  const yesterday = yyyyMMdd(new Date(Date.now() - 86400000));
  if(state.engagement.lastActiveDate === yesterday){
    state.engagement.streak += 1;
  } else if(state.engagement.lastActiveDate && state.engagement.lastActiveDate !== today){
    state.engagement.streak = 1; // reset
  } else {
    state.engagement.streak = 1; // first day
  }
  if(state.engagement.streak > (state.engagement.longestStreak||0)){
    state.engagement.longestStreak = state.engagement.streak;
  }
  state.engagement.lastActiveDate = today;
  saveState();
}

function getGreeting(){
  const h = new Date().getHours();
  if(h < 6) return "夜深了";
  if(h < 11) return "早上好";
  if(h < 14) return "中午好";
  if(h < 18) return "下午好";
  return "晚上好";
}

function renderGreeting(){
  const el = qs("#greetingText");
  const sub = qs("#greetingSub");
  if(!el) return;
  const streak = state.engagement?.streak || 0;
  el.textContent = getGreeting();
  const msgs = [
    "今天的随访从这里开始",
    "每天花 1 分钟，复诊更从容",
    "坚持记录，趋势比单次更有价值",
    "你的健康数据在积累力量",
  ];
  const dayIndex = new Date().getDay();
  sub.innerHTML = escapeHtml(msgs[dayIndex % msgs.length]);
  const badge = streakBadgeHTML();
  if(badge){
    sub.innerHTML += ` <span class="streak-badge">${badge}</span>`;
  }
}

function renderProgressRing(done, total){
  const box = qs("#progressRing");
  if(!box) return;
  if(total === 0){ box.innerHTML = ""; return; }
  const pct = Math.round(done/total*100);
  const r = 20, circ = 2 * Math.PI * r;
  const offset = circ - (done/total) * circ;
  const complete = done === total;
  box.innerHTML = `
    <svg width="50" height="50">
      <circle class="ring-bg" cx="25" cy="25" r="${r}"/>
      <circle class="ring-fg${complete?" complete":""}" cx="25" cy="25" r="${r}"
        stroke-dasharray="${circ}" stroke-dashoffset="${offset}"/>
    </svg>
    <div class="ring-text">${pct}%</div>
  `;
  const badge = qs("#taskProgress");
  if(badge) badge.textContent = `${done}/${total}`;
}

function hasAnyRecordOnDate(dateStr){
  if(!dateStr) return false;
  const v = state.vitals || {};
  if(hasRecordOnDate(v.bp||[], dateStr)) return true;
  if(hasRecordOnDate(v.weight||[], dateStr)) return true;
  if(hasRecordOnDate(v.height||[], dateStr)) return true;
  if(hasRecordOnDate(v.glucose||[], dateStr)) return true;
  if(hasRecordOnDate(v.temp||[], dateStr)) return true;
  if((state.labs||[]).some(l => l.date === dateStr)) return true;
  if(hasRecordOnDate(state.urineTests||[], dateStr, "date")) return true;
  if(hasRecordOnDate(state.symptoms||[], dateStr)) return true;
  if(hasRecordOnDate(state.medsLog||[], dateStr)) return true;
  if(state.tasksDone?.[dateStr] && Object.keys(state.tasksDone[dateStr]).length > 0) return true;
  return false;
}

function renderWeekStrip(){
  const box = qs("#weekStrip");
  if(!box) return;
  const today = new Date();
  const todayStr = yyyyMMdd(today);
  const days = ["日","一","二","三","四","五","六"];
  let html = "";
  for(let i = 6; i >= 0; i--){
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = yyyyMMdd(d);
    const dayName = days[d.getDay()];
    const isToday = key === todayStr;
    const hasData = hasAnyRecordOnDate(key);
    const cls = isToday ? "today" : "";
    const fill = hasData ? "filled" : "";
    html += `<div class="week-dot"><div class="wd">${dayName}</div><div class="circle ${cls} ${fill}">${hasData?"✓":""}</div></div>`;
  }
  box.innerHTML = html;
}

function renderCelebration(tasks){
  const box = qs("#celebrateBox");
  if(!box) return;
  const total = tasks.length;
  const done = tasks.filter(t=>t.done).length;
  if(total > 0 && done === total){
    box.innerHTML = `<div class="celebrate"><div class="emoji">🎉</div><div class="msg">今日任务全部完成！</div><div class="sub">坚持记录是最好的随访习惯</div></div>`;
  } else {
    box.innerHTML = "";
  }
}

function renderHome(){
  // Bind button handlers FIRST — before any rendering that might throw.
  // This ensures navigation / action buttons always work even if a render section errors.
  try{
    const _be = qs("#btnExport");           if(_be) _be.onclick = ()=>copyExport();
    const _bd = qs("#btnDiet");             if(_bd) _bd.onclick = ()=>openDietModal();
    const _bk = qs("#btnKnowledge");        if(_bk) _bk.onclick = ()=>openKnowledgeModal();
    const _bp = qs("#btnProgramMainAction"); if(_bp) _bp.onclick = ()=>openProgramMainModal();
    const _bt = qs("#btnTriage");           if(_bt) _bt.onclick = ()=>openTriageModal();
  }catch(_e){ console.warn("renderHome: button binding error", _e); }

  applyHomeMoreUI();
  updateStreak();
  renderGreeting();
  qs("#todayDate").textContent = niceDate(yyyyMMdd(new Date()));
  const tasks = todayTasks();
  const total = tasks.length;
  const done = tasks.filter(t=>t.done).length;
  renderProgressRing(done, total);
  renderWeekStrip();
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

  const _bm = qs("#btnMarkAllDone");
  if(_bm) _bm.onclick = ()=>markAllTasksDone(tasks);
  const bPlan = qs("#btnGoPlan");
  if(bPlan) bPlan.onclick = ()=>{
    state.ui.overlayReturn = currentTabKey || 'home';
    saveState();
    navigate("followup");
  };

  // Celebration
  renderCelebration(tasks);

  // Safety — wrapped so errors don't break other sections
  try{
    const safety = safetySignals();
    const safetyBox = qs("#safetyContent");
    if(safetyBox) safetyBox.innerHTML = safety.map(s => `
      <div class="list-item">
        <div class="t">${badgeDot(s.level)} ${escapeHtml(s.title)}</div>
        <div class="s">${escapeHtml(s.detail)}</div>
      </div>
    `).join("");
  }catch(e){ console.warn("renderHome: safety error", e); }

  // Program main card
  try{ renderProgramMainCard(); }catch(e){ console.warn("renderHome: programCard error", e); }

  // Diet (v1 food library: 高钾/高磷食物库)
  try{
    const diet = dietSignals();
    const focus = dietFocus();
    const dietBox = qs("#dietContent");

    const badgesHtml = diet.length
      ? `<div class="row">${diet.map(t=>`<div class="badge info">${escapeHtml(t.label)}</div>`).join("")}</div>`
      : ``;

    const focusLines = [];
    if(focus.highK){
      const kTxt = (focus.k===null) ? "" : String(focus.k);
      focusLines.push(`血钾偏高${kTxt?`（${kTxt}）`:``}：本周优先关注"高钾食物/代盐避坑"。`);
    }
    if(focus.highP){
      const pTxt = (focus.p===null) ? "" : String(focus.p);
      focusLines.push(`血磷偏高${pTxt?`（${pTxt}）`:``}：本周优先减少"含磷添加剂"的加工食品。`);
    }

    const focusHtml = focusLines.length
      ? `<div class="list-item"><div class="t">本周重点</div><div class="s">${escapeHtml(focusLines.join(" "))}</div></div>`
      : `<div class="note">想知道"能不能吃"？点右上角【饮食中心】搜索食物；每个食物都有单独的解释与替代选择。</div>`;

    if(dietBox) dietBox.innerHTML = `
      ${badgesHtml}
      ${focusHtml}
      <div class="row" style="margin-top:10px;">
        <button class="ghost small" data-diet-open="highK">高钾食物</button>
        <button class="ghost small" data-diet-open="highP">高磷食物</button>
        <button class="ghost small" data-diet-open="both">钾+磷双高</button>
        <button class="ghost small" data-diet-open="additiveP">磷添加剂避坑</button>
      </div>
      <div style="margin-top:8px;"><button class="primary small" id="btnPersonalDiet">今日个性化建议 ⭐</button></div>
      <div class="note subtle">提示：饮食仅做健康教育与避坑提醒；具体限制与目标请以医生/营养师个体化方案为准。</div>
    `;

    const btnPD = qs("#btnPersonalDiet");
    if(btnPD) btnPD.onclick = ()=> requirePremium("dietPersonal", ()=> openPersonalDietModal());

    qsa('#dietContent [data-diet-open]').forEach(btn=>{
      btn.onclick = (e)=>{
        e.preventDefault();
        e.stopPropagation();
        openDietModal(btn.getAttribute('data-diet-open'));
      };
    });
  }catch(e){ console.warn("renderHome: diet error", e); }

  // Knowledge
  try{
    const rec = recommendKnowledge();
    const box = qs("#knowledgeContent");
    if(box){
      if(!rec.length){
        box.innerHTML = `<div class="empty-cta"><div class="emoji">💡</div><div class="msg">完善资料或录入化验后，系统会推荐个性化的健康知识。</div><button class="ghost small" onclick="openProfile()">完善资料</button></div>`;
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
    }
  }catch(e){ console.warn("renderHome: knowledge error", e); }

  // Recent
  try{
    const recentBox = qs("#recentContent");
    if(recentBox) recentBox.innerHTML = renderRecent();
  }catch(e){ console.warn("renderHome: recent error", e); }

  // Dialysis card on Home: only show when dialysis program is enabled or active
  const dCard = qs("#cardDialysisHome");
  if(dCard) dCard.classList.toggle("hidden", !(state.activeProgram==="dialysis" || state.enabledPrograms?.dialysis));

  // (button bindings moved to top of renderHome for robustness)
}

function renderProgramMainCard(){
  const title = qs("#programMainTitle");
  const subtitle = qs("#programMainSubtitle");
  const content = qs("#programMainContent");
  const actionBtn = qs("#btnProgramMainAction");

  if(state.activeProgram === "kidney"){
    title.textContent = "肾脏随访速览";
    subtitle.textContent = "关键趋势：肾功/尿检/血压";
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
    subtitle.textContent = "家庭血压趋势 + 用药依从";

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
    subtitle.textContent = "血糖趋势 + HbA1c";

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
    subtitle.textContent = "喝水 + 发作事件 + 红旗分诊";
    if(!state.stone) state.stone = defaultState().stone;
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
    subtitle.textContent = "血透/腹透：体重、血压、通路/腹透红旗";

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
    subtitle.textContent = "生长 + 儿科血压/肾功能";
    if(!state.peds) state.peds = defaultState().peds;
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
  if(!pieces.length) return `<div class="empty-cta"><div class="emoji">📋</div><div class="msg">还没有记录。试试先录入一次血压或体重，30 秒就能完成。</div><button class="primary small" onclick="openQuickBP()">记录血压</button></div>`;
  return pieces.join("");
}

function renderLabsList(){
  const labsBox = qs("#labsList");
  if(!labsBox) return;
  if(!state.labs?.length){
    labsBox.innerHTML = `<div class="empty-cta"><div class="emoji">🔬</div><div class="msg">暂无化验记录。录入一次后，系统会为你生成饮食提醒和安全提示。</div><button class="primary small" onclick="openAddLab()">录入化验</button></div>`;
  } else {
    const sorted = [...state.labs].sort((a,b)=> (a.date||"").localeCompare(b.date||"")).reverse();
    // Build sparkline data for eGFR
    const egfrSpark = sorted.length >= 2
      ? sparklineSVG(sorted.slice().reverse().map(l=>l.egfr).filter(Boolean), {width:50, height:16})
      : "";
    labsBox.innerHTML = sorted.slice(0,8).map((l,idx) => {
      const items = [];
      if(l.scr) items.push(`Scr ${l.scr}${l.scrUnit==="mgdl"?"mg/dL":"μmol/L"}`);
      if(l.egfr) items.push(`eGFR ${l.egfr}`);
      if(l.k) items.push(`K ${l.k}`);
      if(l.na) items.push(`Na ${l.na}`);
      if(l.p) items.push(`P ${l.p}`);
      if(l.ca) items.push(`Ca ${l.ca}`);
      if(l.mg) items.push(`Mg ${l.mg}`);
      if(l.glu) items.push(`Glu ${l.glu}`);
      if(l.hba1c) items.push(`HbA1c ${l.hba1c}`);
      const spark = (idx===0 && egfrSpark) ? ` ${egfrSpark}` : "";
      const ocrBadge = l.source === "ocr" ? ` <span style="display:inline-block;font-size:9px;padding:1px 5px;background:#e0f2fe;color:#0369a1;border-radius:4px;vertical-align:middle;">📷 拍照</span>` : "";
      return `<div class="list-item">
        <div class="t">${niceDate(l.date||"")}${ocrBadge}${spark}</div>
        <div class="s">${escapeHtml(items.join(" · ") || "—")}</div>
      </div>`;
    }).join("");
  }
}

function renderUrineList(){
  const urineBox = qs("#urineList");
  if(!urineBox) return;
  if(!state.urineTests?.length){
    urineBox.innerHTML = `<div class="empty-cta"><div class="emoji">🧪</div><div class="msg">暂无尿检记录。肾小球病/ADPKD 建议做时间线记录。</div><button class="primary small" onclick="openAddUrine()">录入尿检</button></div>`;
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
    box.innerHTML = `<div class="empty-cta"><div class="emoji">💉</div><div class="msg">未启用透析项目。在"资料"中开启后可记录透析数据。</div><button class="ghost small" onclick="openProfile()">去设置</button></div>`;
    return;
  }
  if(!state.dialysis?.sessions?.length){
    box.innerHTML = `<div class="empty-cta"><div class="emoji">📝</div><div class="msg">暂无透析记录。点击下方开始记录第一次。</div><button class="primary small" onclick="openDialysisSessionModal()">新增透析记录</button></div>`;
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
    box.innerHTML = `<div class="note">未启用结石项目。到“资料”里开启后可记录饮水与发作事件。</div>`;
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
      labsSub.textContent = "透析常用：K/Na/Ca/P/血糖等";
    } else if(showPeds){
      labsTitle.textContent = "化验录入";
      labsSub.textContent = "儿科：肌酐单位 + 身高用于 eGFR";
    } else {
      labsTitle.textContent = "化验录入";
      labsSub.textContent = "支持肾功、电解质、代谢";
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
    lines.push(`<div class="list-item"><div class="t">本周建议</div><div class="s">1）至少记录 3 次血压（更看趋势）；2）如有蛋白尿/水肿，补充体重与尿检；3）复诊前复制“一页摘要”。</div></div>`);
    if(state.kidney.track === "tx"){
      lines.push(`<div class="list-item"><div class="t">移植提醒</div><div class="s">如需测药物谷浓度，请遵循中心流程（通常抽血前不先服药，抽完再服）。具体以移植中心宣教为准。</div></div>`);
    }
    planBox.innerHTML = lines.join("");
  } else if(prog === "htn"){
    const freqTxt = (state.htn?.bpFreq === "daily2") ? "每日2次" : "每日1次";
    const tgt = (state.htn?.targetSys || state.htn?.targetDia) ? `${state.htn?.targetSys||"—"}/${state.htn?.targetDia||"—"}` : "未设置";
    planBox.innerHTML = `
      <div class="list-item"><div class="t">本周建议</div><div class="s">1）按计划记录家庭血压（${escapeHtml(freqTxt)}），固定时段更有价值；2）把“场景/症状/漏服”记下来；3）复诊前复制摘要，医生更容易判断波动与药物方案。</div></div>
      <div class="list-item"><div class="t">目标（可选）</div><div class="s">当前：${escapeHtml(tgt)}。目标与阈值请以医生建议为准。</div></div>
    `;
  } else if(prog === "dm"){
    const freqTxt = (state.dm?.glucoseFreq === "daily2") ? "每日2次" : "每日1次";
    const unitTxt = (state.dm?.glucoseUnit === "mgdl") ? "mg/dL" : "mmol/L";
    const a1cTxt = lab?.hba1c ? `${lab.hba1c}%` : "暂无";
    planBox.innerHTML = `
      <div class="list-item"><div class="t">本周建议</div><div class="s">1）按计划记录血糖（${escapeHtml(freqTxt)} · ${escapeHtml(unitTxt)}）并打标签（空腹/餐后/睡前/随机）；2）每 3 个月关注一次 HbA1c（如有）；3）出现低血糖/严重高血糖红旗，优先就医/联系医生。</div></div>
      <div class="list-item"><div class="t">HbA1c</div><div class="s">最近：${escapeHtml(a1cTxt)}；目标（可选）：${escapeHtml(state.dm?.a1cTarget?state.dm.a1cTarget+"%":"未设置")}。</div></div>
    `;
  } else if(prog === "stone"){
    const today = yyyyMMdd(new Date());
    const cur = toNum(state.stone.intakeLog?.[today]) || 0;
    const tgt = toNum(state.stone.targetMl);
    const limit = state.stone.fluidRestricted === "true";
    planBox.innerHTML = `
      <div class="list-item"><div class="t">今日喝水</div><div class="s">${cur} ml${tgt?` / 目标 ${tgt} ml`:``}${limit?"（限水模式）":""}</div></div>
      <div class="list-item"><div class="t">本周建议</div><div class="s">保持分次饮水；如出现发热伴腰痛/寒战、无尿/少尿明显等红旗，优先就医。</div></div>
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
      <div class="list-item"><div class="t">本周建议</div><div class="s">透析日：记录透前/透后体重与血压（可选超滤量）；非透析日：关注间期体重增长、咸食与饮水。出现通路/腹透红旗、胸痛/气促/抽搐等，请优先联系透析团队/就医。</div></div>
    `;
  } else if(prog === "peds"){
    const age = computeAgeYears(state.peds.dob);
    planBox.innerHTML = `
      <div class="list-item"><div class="t">儿肾随访重点</div><div class="s">生长（身高/体重）、血压记录、症状事件、化验（肌酐单位与身高配合）。复诊时以儿肾医生判读为准。</div></div>
      <div class="list-item"><div class="t">本周任务建议</div><div class="s">至少记录 2–3 次血压；每周记录体重；每月记录身高一次（或按医嘱）。</div></div>
      <div class="list-item"><div class="t">孩子 ${age===null?"—":age+"岁"} 的过渡建议</div><div class="s">逐步让孩子参与：自己描述症状、准备复诊三问、在家测一次血压。</div></div>
    `;
  } else {
    planBox.innerHTML = `<div class="note">请选择项目。</div>`;
  }

  // ===== Trends (compact but actionable) =====
  const trend = qs("#followupTrendContent");
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

function renderMe(){
  const prev = qs("#exportPreview");
  if(prev) prev.textContent = buildExportText();

  const b = qs("#btnExport2");
  if(b) b.onclick = ()=>copyExport("clinic");

  const tAI = qs("#toggleShowAI");
  if(tAI) tAI.checked = showAITab();

  const tHome = qs("#toggleHomeMoreDefault");
  if(tHome) tHome.checked = !!(state.ui && state.ui.homeMoreDefault);

  const fbPrev = qs("#feedbackPreview");
  if(fbPrev) fbPrev.textContent = buildFeedbackText(false);

  // Visit prep inline preview
  const vpp = qs("#visitPrepPreview");
  if(vpp){
    const lab = latestLab();
    const bp = latestVital(state.vitals?.bp);
    const labCount = (state.labs||[]).length;
    if(lab || bp){
      let html = "";
      if(lab) html += `<div class="kv"><span>最近化验</span><span>${niceDate(lab.date||"")} · eGFR ${lab.egfr||"—"}</span></div>`;
      if(bp) html += `<div class="kv"><span>最近血压</span><span>${bp.sys}/${bp.dia} mmHg</span></div>`;
      if(labCount >= 2) html += `<div class="note subtle" style="margin-top:4px;">有 ${labCount} 次记录可对比趋势</div>`;
      else html += `<div class="note subtle" style="margin-top:4px;">再录入 ${2-labCount} 次化验后可对比变化</div>`;
      vpp.innerHTML = html;
    } else {
      vpp.innerHTML = `<div class="note subtle">录入化验/血压后，这里会显示摘要</div>`;
    }
  }

  // Family share inline preview
  const fsp = qs("#familySharePreview");
  if(fsp){
    const ss = typeof loadShareState === "function" ? loadShareState() : {};
    if(ss.enabled && ss.code){
      fsp.innerHTML = `<div class="kv"><span>状态</span><span style="color:var(--ok);font-weight:700;">已开启</span></div><div class="kv"><span>共享码</span><span style="font-weight:700;letter-spacing:2px;">${escapeHtml(ss.code)}</span></div>`;
    } else {
      fsp.innerHTML = `<div class="note subtle">开启后家属可远程查看指标趋势</div>`;
    }
  }

  // Show last backup time
  const lbi = qs("#lastBackupInfo");
  if(lbi){
    const last = getLastBackupTime();
    if(last){
      const d = new Date(last);
      const days = daysSinceLastBackup();
      const timeStr = d.toLocaleString("zh-CN");
      const warn = days >= 7 ? " ⚠ 建议尽快备份" : "";
      lbi.textContent = `上次备份：${timeStr}（${days} 天前）${warn}`;
    } else {
      lbi.textContent = "尚未备份过，建议立即导出一份完整备份";
    }
  }
}


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
  const fns = [renderHeader,renderPremiumBadge,renderHome,renderRecords,renderTrendCard,renderDocsPage,renderFollowup,renderMe,renderAI,renderExplainPage,renderGuidePage,renderUsagePage];
  /* P0: summary, privacy, terms, quick-start, footer, CTA (defined in summary.js) */
  if(typeof renderSummary === "function") fns.push(renderSummary);
  if(typeof renderPrivacy === "function") fns.push(renderPrivacy);
  if(typeof renderTerms === "function") fns.push(renderTerms);
  if(typeof renderQuickStart === "function") fns.push(renderQuickStart);
  if(typeof renderSiteFooter === "function") fns.push(renderSiteFooter);
  if(typeof renderHomeCTA === "function") fns.push(renderHomeCTA);
  fns.forEach(fn=>{ try{ fn(); }catch(e){ console.error("renderAll error in "+fn.name, e); } });
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

  // P0-7: track page views
  if(typeof trackEvent === "function") trackEvent("page_view", {page: pageKey});
  // P0-2: track summary views specifically
  if(pageKey === "summary" && typeof trackEvent === "function") trackEvent("summary_view");

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
