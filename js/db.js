/* db.js - IndexedDB file vault and marker/document helpers */

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

async function idbGetAllFiles(){
  const db = await openFilesDB();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(FILE_STORE, "readonly");
    const store = tx.objectStore(FILE_STORE);
    const req = store.getAll();
    req.onsuccess = ()=>{ try{ db.close(); }catch(_e){} resolve(req.result || []); };
    req.onerror = ()=>{ try{ db.close(); }catch(_e){} reject(req.error || new Error("IDB 读取全部文件失败")); };
  });
}

function blobToBase64(blob){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload = ()=> resolve(reader.result);
    reader.onerror = ()=> reject(reader.error || new Error("FileReader 失败"));
    reader.readAsDataURL(blob);
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
