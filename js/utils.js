/* utils.js - Utility and helper functions */

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

function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

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
