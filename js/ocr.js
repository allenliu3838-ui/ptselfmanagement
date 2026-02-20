/* ocr.js - Lab report photo recognition (OCR) */

const OCR_MAX_FILE_MB = 10;
const OCR_ALLOWED_TYPES = ["image/jpeg","image/png","image/webp","image/heic","image/heif"];

// ====== OCR Usage Tracking ======
const OCR_KEY = "kidneyCareOCR";
const OCR_FREE_LIMIT = 3;

function loadOCRState(){
  try{
    const raw = localStorage.getItem(OCR_KEY);
    if(!raw) return { usedCount:0, history:[] };
    return JSON.parse(raw);
  }catch(_e){ return { usedCount:0, history:[] }; }
}

function saveOCRState(s){
  try{ localStorage.setItem(OCR_KEY, JSON.stringify(s)); }catch(_e){}
}

function ocrUsedCount(){ return loadOCRState().usedCount; }

function canUseOCRFree(){
  return ocrUsedCount() < OCR_FREE_LIMIT || isPremium();
}

function ocrRemainingFree(){
  if(isPremium()) return Infinity;
  return Math.max(0, OCR_FREE_LIMIT - ocrUsedCount());
}

// ====== Open OCR Photo Entry ======

function openOCREntry(){
  if(!canUseOCRFree()){
    openUpgradeModal("ocrScan");
    return;
  }

  const remaining = ocrRemainingFree();
  const remainText = isPremium() ? "会员无限次" : `免费剩余 ${remaining}/${OCR_FREE_LIMIT} 次`;

  const bodyHtml = `
    <div class="note" style="margin-bottom:12px;">
      拍摄或上传化验单照片，自动识别并提取指标数据。${remainText}
    </div>
    <div id="ocrUploadArea" style="border:2px dashed var(--border);border-radius:14px;padding:20px;text-align:center;cursor:pointer;transition:border-color .2s;background:#fafbfd;">
      <div style="font-size:36px;margin-bottom:8px;">📷</div>
      <div style="font-size:14px;font-weight:700;">点击拍照或选择图片</div>
      <div style="font-size:11px;color:var(--muted);margin-top:4px;">支持 JPG/PNG，建议拍摄清晰、光线充足</div>
      <input type="file" id="ocrFileInput" accept="image/*" capture="environment" style="display:none;">
    </div>
    <div id="ocrPreviewArea" style="display:none;margin-top:12px;">
      <div style="position:relative;border-radius:12px;overflow:hidden;border:1px solid var(--border);">
        <img id="ocrPreviewImg" style="width:100%;max-height:300px;object-fit:contain;display:block;">
        <button class="ghost small" id="ocrRetake" style="position:absolute;top:8px;right:8px;background:rgba(255,255,255,.9);">重拍</button>
      </div>
    </div>
    <div id="ocrStatus" style="display:none;margin-top:12px;text-align:center;">
      <div class="note">正在识别中…</div>
    </div>
    <div id="ocrTips" style="margin-top:12px;">
      <div class="note subtle">拍摄技巧：1. 平放化验单，避免反光 2. 确保文字清晰可读 3. 包含完整的检验结果区域</div>
    </div>
  `;

  openSimpleModal("拍照录入化验", "AI 自动识别化验单", bodyHtml, `
    <button class="primary" id="btnOCRProcess" disabled>开始识别</button>
    <button class="ghost" data-close="modalSimple">取消</button>
  `);

  setTimeout(()=>{
    const fileInput = qs("#ocrFileInput");
    const uploadArea = qs("#ocrUploadArea");
    const previewArea = qs("#ocrPreviewArea");
    const previewImg = qs("#ocrPreviewImg");
    const btnProcess = qs("#btnOCRProcess");
    const retakeBtn = qs("#ocrRetake");

    let selectedFile = null;

    if(uploadArea) uploadArea.onclick = ()=> fileInput?.click();

    if(fileInput) fileInput.onchange = (e)=>{
      const file = e.target.files?.[0];
      if(!file) return;

      // Validate file type
      if(!file.type.startsWith("image/")){
        toast("请选择图片文件（JPG/PNG）");
        fileInput.value = "";
        return;
      }

      // Validate file size
      const sizeMB = file.size / (1024*1024);
      if(sizeMB > OCR_MAX_FILE_MB){
        toast(`图片过大（${sizeMB.toFixed(1)}MB），请选择 ${OCR_MAX_FILE_MB}MB 以内的图片`);
        fileInput.value = "";
        return;
      }

      selectedFile = file;
      const reader = new FileReader();
      reader.onload = (ev)=>{
        if(previewImg) previewImg.src = ev.target.result;
        if(uploadArea) uploadArea.style.display = "none";
        if(previewArea) previewArea.style.display = "block";
        if(btnProcess) btnProcess.disabled = false;
      };
      reader.onerror = ()=>{
        toast("图片读取失败，请重试或换一张图片");
        fileInput.value = "";
      };
      reader.readAsDataURL(file);
    };

    if(retakeBtn) retakeBtn.onclick = ()=>{
      selectedFile = null;
      if(uploadArea) uploadArea.style.display = "";
      if(previewArea) previewArea.style.display = "none";
      if(btnProcess) btnProcess.disabled = true;
      if(fileInput) fileInput.value = "";
    };

    if(btnProcess) btnProcess.onclick = ()=>{
      if(!selectedFile) return;
      processOCRImage(selectedFile);
    };

    qsa("#modalSimple [data-close]").forEach(b=>b.onclick = ()=>closeModal("modalSimple"));
  }, 0);
}

// ====== Process OCR Image ======

function processOCRImage(file){
  const statusEl = qs("#ocrStatus");
  const btnProcess = qs("#btnOCRProcess");
  if(statusEl) statusEl.style.display = "block";
  if(statusEl) statusEl.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;gap:8px;">
      <div class="spinner-small"></div>
      <span>正在识别化验单…</span>
    </div>
  `;
  if(btnProcess) btnProcess.disabled = true;

  // Simulate OCR processing (in production, this sends to Baidu/Tencent OCR API)
  // The simulation extracts realistic-looking values after a delay
  setTimeout(()=>{
    const extracted = simulateOCRExtraction(file.name);
    showOCRResults(extracted);
  }, 1500);
}

// ====== Simulate OCR Extraction ======
// In production, replace this with actual API call:
//   POST to Baidu OCR / Tencent Cloud OCR / Azure Form Recognizer
//   Parse response → map to lab fields

function simulateOCRExtraction(filename){
  // Return empty fields for user to fill - this simulates a "partially recognized" result
  // In real implementation, these would be populated from OCR API response
  return {
    recognized: false,
    message: "内测版：OCR 云端识别接口开发中",
    fields: {
      date: yyyyMMdd(new Date()),
      scr: "",
      scrUnit: "umolL",
      egfr: "",
      k: "",
      na: "",
      p: "",
      ca: "",
      mg: "",
      glu: "",
      hba1c: ""
    },
    confidence: null
  };
}

// ====== Show OCR Results for Confirmation ======

function showOCRResults(result){
  const f = result.fields;
  const confBadge = result.recognized
    ? `<span class="badge ok" style="font-size:10px;">识别成功（置信度 ${result.confidence}%）</span>`
    : `<span class="badge" style="font-size:10px;background:#f59e0b;color:#fff;">手动补充</span>`;

  const bodyHtml = `
    <div style="margin-bottom:10px;">
      ${confBadge}
      <span class="note subtle" style="margin-left:8px;">${escapeHtml(result.message || "请核对识别结果")}</span>
    </div>
    <div class="note" style="margin-bottom:10px;background:#fff8e1;padding:8px 10px;border-radius:8px;">
      请仔细核对每个数值，确认无误后保存。OCR 可能存在误差，<b>以化验单原件为准</b>。
    </div>
    <div class="two">
      <label class="field"><span>日期</span><input id="ocrDate" type="date" value="${escapeHtml(f.date)}"></label>
      <label class="field"><span>肌酐单位</span>
        <select id="ocrScrUnit">
          <option value="umolL" ${f.scrUnit==="umolL"?"selected":""}>μmol/L</option>
          <option value="mgdl" ${f.scrUnit==="mgdl"?"selected":""}>mg/dL</option>
        </select>
      </label>
    </div>
    <div class="two">
      <label class="field"><span>肌酐 Scr</span><input id="ocrScr" type="number" inputmode="decimal" value="${escapeHtml(f.scr)}" placeholder="例如：120"></label>
      <label class="field"><span>eGFR</span><input id="ocrEgfr" type="number" inputmode="decimal" value="${escapeHtml(f.egfr)}" placeholder="可留空"></label>
    </div>
    <div class="two">
      <label class="field"><span>血钾 K</span><input id="ocrK" type="number" inputmode="decimal" value="${escapeHtml(f.k)}" placeholder="mmol/L"></label>
      <label class="field"><span>血钠 Na</span><input id="ocrNa" type="number" inputmode="decimal" value="${escapeHtml(f.na)}" placeholder="mmol/L"></label>
    </div>
    <div class="two">
      <label class="field"><span>血磷 P</span><input id="ocrP" type="number" inputmode="decimal" value="${escapeHtml(f.p)}" placeholder="mmol/L"></label>
      <label class="field"><span>血钙 Ca</span><input id="ocrCa" type="number" inputmode="decimal" value="${escapeHtml(f.ca)}" placeholder="mmol/L"></label>
    </div>
    <div class="two">
      <label class="field"><span>血镁 Mg</span><input id="ocrMg" type="number" inputmode="decimal" value="${escapeHtml(f.mg)}" placeholder="mmol/L"></label>
      <label class="field"><span>血糖 Glu</span><input id="ocrGlu" type="number" inputmode="decimal" value="${escapeHtml(f.glu)}" placeholder="mmol/L"></label>
    </div>
    <label class="field"><span>HbA1c（%）</span><input id="ocrHbA1c" type="number" inputmode="decimal" value="${escapeHtml(f.hba1c)}" placeholder="例如：6.5"></label>
  `;

  closeModal("modalSimple");
  openSimpleModal("核对识别结果", "确认后保存到化验记录", bodyHtml, `
    <button class="primary" id="btnOCRSave">确认保存</button>
    <button class="ghost" id="btnOCREdit">返回重拍</button>
    <button class="ghost" data-close="modalSimple">取消</button>
  `);

  setTimeout(()=>{
    const btnSave = qs("#btnOCRSave");
    if(btnSave) btnSave.onclick = ()=> saveOCRResult();

    const btnEdit = qs("#btnOCREdit");
    if(btnEdit) btnEdit.onclick = ()=>{ closeModal("modalSimple"); openOCREntry(); };

    qsa("#modalSimple [data-close]").forEach(b=>b.onclick = ()=>closeModal("modalSimple"));
  }, 0);
}

// ====== Save OCR Result to State ======

function saveOCRResult(){
  const entry = {
    date: qs("#ocrDate")?.value || yyyyMMdd(new Date()),
    scrUnit: qs("#ocrScrUnit")?.value || "umolL",
    scr: qs("#ocrScr")?.value || "",
    egfr: qs("#ocrEgfr")?.value || "",
    k: qs("#ocrK")?.value || "",
    na: qs("#ocrNa")?.value || "",
    p: qs("#ocrP")?.value || "",
    ca: qs("#ocrCa")?.value || "",
    mg: qs("#ocrMg")?.value || "",
    glu: qs("#ocrGlu")?.value || "",
    hba1c: qs("#ocrHbA1c")?.value || "",
    source: "ocr",
    flags: {}
  };

  // Peds eGFR auto-calculation
  if((state.activeProgram==="peds" || state.enabledPrograms?.peds) && !entry.egfr && entry.scr){
    const h = toNum(latestVital(state.vitals.height)?.cm ?? state.peds?.heightCm);
    const egfr = typeof pedsEgfrBedsideSchwartz === "function"
      ? pedsEgfrBedsideSchwartz(h, entry.scr, entry.scrUnit)
      : null;
    if(egfr !== null) entry.egfr = String(egfr);
  }

  // Check that at least one field has data
  const hasData = entry.scr || entry.egfr || entry.k || entry.na || entry.p || entry.ca || entry.glu || entry.hba1c;
  if(!hasData){
    toast("请至少填写一项化验数据");
    return;
  }

  state.labs.push(entry);
  saveState();

  // Track OCR usage
  const ocrState = loadOCRState();
  ocrState.usedCount++;
  const populated = ["scr","egfr","k","na","p","ca","mg","glu","hba1c"].filter(f=>entry[f]);
  ocrState.history.push({ date: nowISO(), fields: populated });
  saveOCRState(ocrState);

  closeModal("modalSimple");
  toast("化验数据已保存");
  renderAll();
}
