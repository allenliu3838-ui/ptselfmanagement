/* educationEngine.test.js — Unit tests for the education rules engine
 *
 * Run: node tests/educationEngine.test.js
 */

// Load the engine (pure functions, no DOM dependency)
eval(require('fs').readFileSync('js/educationEngine.js', 'utf8'));

var passed = 0;
var failed = 0;
var tests = [];

function assert(condition, msg) {
  if (condition) {
    passed++;
    tests.push({ status: 'PASS', msg: msg });
  } else {
    failed++;
    tests.push({ status: 'FAIL', msg: msg });
    console.error('  FAIL: ' + msg);
  }
}

function makeState(overrides) {
  var base = {
    activeProgram: 'kidney',
    enabledPrograms: { kidney: true, htn: false, dm: false, dialysis: false, stone: false, peds: false },
    kidney: { track: 'unknown', glomerularSubtype: 'unknown' },
    dialysis: { modality: 'hd', fluidRestricted: 'false' },
    peds: {},
    stone: { fluidRestricted: 'false' },
    dm: {},
    comorbid: { htn: false, dm: false, masld: false, hf: false, aki: false },
    labs: [],
    vitals: { bp: [], weight: [], height: [], glucose: [], temp: [] }
  };
  // Shallow merge overrides
  for (var key in overrides) {
    if (typeof overrides[key] === 'object' && !Array.isArray(overrides[key]) && overrides[key] !== null) {
      base[key] = Object.assign({}, base[key] || {}, overrides[key]);
    } else {
      base[key] = overrides[key];
    }
  }
  return base;
}

// ──────────────────────────────────────────────
// 1. Profile Generation
// ──────────────────────────────────────────────

console.log('\n=== 1. Profile Generation ===');

(function() {
  var st = makeState({});
  var p = getEducationProfile(st);
  assert(p.programs.kidney === true, 'Default profile has kidney enabled');
  assert(p.programs.dialysis === false, 'Default profile has dialysis disabled');
  assert(p.isPediatric === false, 'Default profile is not pediatric');
  assert(p.isTransplant === false, 'Default profile is not transplant');
  assert(p.isFluidRestricted === false, 'Default profile is not fluid restricted');
})();

(function() {
  var st = makeState({
    enabledPrograms: { kidney: true, dialysis: true },
    kidney: { track: 'tx' },
    dialysis: { fluidRestricted: 'true' }
  });
  var p = getEducationProfile(st);
  assert(p.isTransplant === true, 'Transplant detected from track=tx');
  assert(p.isFluidRestricted === true, 'Fluid restricted detected from dialysis');
  assert(p.programs.dialysis === true, 'Dialysis program enabled');
})();

(function() {
  var st = makeState({
    enabledPrograms: { kidney: true, peds: true },
  });
  var p = getEducationProfile(st);
  assert(p.isPediatric === true, 'Pediatric detected');
})();

(function() {
  var st = makeState({
    kidney: { glomerularSubtype: 'adpkd' },
  });
  var p = getEducationProfile(st);
  assert(p.isADPKD === true, 'ADPKD detected from glomerularSubtype');
})();

(function() {
  var st = makeState({
    labs: [{ date: '2026-01-15', k: '6.0', p: '1.8' }]
  });
  var p = getEducationProfile(st);
  assert(p.hasHighK === true, 'High K detected from labs');
  assert(p.hasHighP === true, 'High P detected from labs');
})();

// ──────────────────────────────────────────────
// 2. Conflict Gates (Diet Warnings)
// ──────────────────────────────────────────────

console.log('\n=== 2. Conflict Gates ===');

(function() {
  var st = makeState({
    enabledPrograms: { kidney: true, dialysis: true, stone: true },
    dialysis: { fluidRestricted: 'true' }
  });
  var p = getEducationProfile(st);
  var w = getDietWarnings(p);
  var suppressIds = [];
  w.forEach(function(wi) {
    if (wi.type === 'suppress' && Array.isArray(wi.suppress)) {
      suppressIds = suppressIds.concat(wi.suppress);
    }
  });
  assert(suppressIds.indexOf('hydration_general') >= 0, 'Dialysis + fluid restriction suppresses generic hydration');
  assert(suppressIds.indexOf('stone_drink_more') >= 0, 'Dialysis + fluid restriction suppresses stone hydration');
  var conflict = w.find(function(wi) { return wi.id === 'stone_fluid_conflict'; });
  assert(!!conflict, 'Stone + fluid restriction triggers conflict warning');
})();

(function() {
  var st = makeState({
    enabledPrograms: { kidney: true, peds: true },
  });
  var p = getEducationProfile(st);
  var w = getDietWarnings(p);
  var pedsW = w.find(function(wi) { return wi.id === 'peds_diet_caution'; });
  assert(!!pedsW, 'Pediatric profile triggers diet caution');
  assert(pedsW.type === 'context', 'Pediatric diet warning is context type');
})();

(function() {
  var st = makeState({
    kidney: { track: 'tx' },
  });
  var p = getEducationProfile(st);
  var w = getDietWarnings(p);
  var txProtein = w.find(function(wi) { return wi.id === 'tx_protein_caution'; });
  assert(!!txProtein, 'Transplant triggers protein caution');
  var txFood = w.find(function(wi) { return wi.id === 'tx_food_safety'; });
  assert(!!txFood, 'Transplant triggers food safety warning');
})();

(function() {
  // No high K labs → should NOT push K restriction
  var st = makeState({ labs: [{ date: '2026-01-15', k: '4.0' }] });
  var p = getEducationProfile(st);
  assert(p.hasHighK === false, 'K=4.0 is not high K');
  var w = getDietWarnings(p);
  var noK = w.find(function(wi) { return wi.id === 'no_k_restriction_needed'; });
  assert(!!noK, 'Normal K triggers no-restriction-needed info');
})();

// ──────────────────────────────────────────────
// 3. Red Flags
// ──────────────────────────────────────────────

console.log('\n=== 3. Red Flags ===');

(function() {
  var st = makeState({
    enabledPrograms: { kidney: true, dialysis: true },
    dialysis: { modality: 'pd' }
  });
  var p = getEducationProfile(st);
  var flags = getRedFlags(p);
  var pd = flags.find(function(f) { return f.id === 'pd_peritonitis'; });
  assert(!!pd, 'PD patient gets peritonitis red flag');
  var hd = flags.find(function(f) { return f.id === 'hd_access'; });
  assert(!hd, 'PD patient does NOT get HD access red flag');
})();

(function() {
  var st = makeState({
    enabledPrograms: { kidney: true, dialysis: true },
    dialysis: { modality: 'hd' }
  });
  var p = getEducationProfile(st);
  var flags = getRedFlags(p);
  var hd = flags.find(function(f) { return f.id === 'hd_access'; });
  assert(!!hd, 'HD patient gets access red flag');
})();

(function() {
  var st = makeState({ kidney: { track: 'tx' } });
  var p = getEducationProfile(st);
  var flags = getRedFlags(p);
  var tx = flags.find(function(f) { return f.id === 'tx_rejection'; });
  assert(!!tx, 'Transplant patient gets rejection red flag');
})();

(function() {
  var st = makeState({ kidney: { glomerularSubtype: 'adpkd' } });
  var p = getEducationProfile(st);
  var flags = getRedFlags(p);
  var adpkd = flags.find(function(f) { return f.id === 'adpkd_aneurysm'; });
  assert(!!adpkd, 'ADPKD patient gets aneurysm/headache red flag');
})();

(function() {
  var st = makeState({
    enabledPrograms: { kidney: true, peds: true }
  });
  var p = getEducationProfile(st);
  var flags = getRedFlags(p);
  var peds = flags.find(function(f) { return f.id === 'peds_no_adult_thresholds'; });
  assert(!!peds, 'Pediatric patient gets no-adult-thresholds flag');
})();

(function() {
  var st = makeState({
    enabledPrograms: { kidney: true, dm: true }
  });
  var p = getEducationProfile(st);
  var flags = getRedFlags(p);
  var hypo = flags.find(function(f) { return f.id === 'hypoglycemia'; });
  assert(!!hypo, 'DM patient gets hypoglycemia red flag');
})();

(function() {
  var st = makeState({
    labs: [{ date: '2026-01-15', k: '6.0' }]
  });
  var p = getEducationProfile(st);
  var flags = getRedFlags(p);
  var highK = flags.find(function(f) { return f.id === 'high_k'; });
  assert(!!highK, 'High K patient gets hyperkalemia red flag');
})();

// ──────────────────────────────────────────────
// 4. Top Concerns
// ──────────────────────────────────────────────

console.log('\n=== 4. Top Concerns ===');

(function() {
  var st = makeState({});
  var p = getEducationProfile(st);
  var concerns = getTopConcerns(p, st);
  assert(concerns.length === 3, 'CKD patient gets 3 top concerns');
  assert(concerns[0].id === 'ckd_egfr', 'First concern is eGFR');
  assert(concerns[1].id === 'ckd_uacr', 'Second concern is UACR');
  assert(concerns[2].id === 'ckd_bp', 'Third concern is BP');
})();

(function() {
  var st = makeState({
    activeProgram: 'dialysis',
    enabledPrograms: { kidney: true, dialysis: true },
    dialysis: { modality: 'pd' }
  });
  var p = getEducationProfile(st);
  var concerns = getTopConcerns(p, st);
  assert(concerns.length === 3, 'PD patient gets 3 top concerns');
  assert(concerns[0].id === 'pd_exchange', 'PD first concern is exchange');
})();

(function() {
  var st = makeState({
    activeProgram: 'peds',
    enabledPrograms: { kidney: true, peds: true }
  });
  var p = getEducationProfile(st);
  var concerns = getTopConcerns(p, st);
  var growth = concerns.find(function(c) { return c.id === 'peds_growth'; });
  assert(!!growth, 'Pediatric patient gets growth concern');
  var noadult = concerns.find(function(c) { return c.id === 'peds_noadult'; });
  assert(!!noadult, 'Pediatric patient gets no-adult-rules concern');
})();

(function() {
  var st = makeState({
    kidney: { track: 'tx' }
  });
  var p = getEducationProfile(st);
  var concerns = getTopConcerns(p, st);
  var txMeds = concerns.find(function(c) { return c.id === 'tx_meds'; });
  assert(!!txMeds, 'Transplant patient gets medication adherence concern');
})();

// ──────────────────────────────────────────────
// 5. Card Filtering
// ──────────────────────────────────────────────

console.log('\n=== 5. Card Filtering ===');

(function() {
  var cards = [
    { id: 'c1', project: ['kidney'], priority: 'p0', title: 'CKD card' },
    { id: 'c2', project: ['dialysis'], subpath: ['pd'], priority: 'p0', title: 'PD card' },
    { id: 'c3', project: ['dialysis'], subpath: ['hd'], priority: 'p0', title: 'HD card' },
    { id: 'c4', project: ['peds'], audience: 'pediatric', priority: 'p0', title: 'Peds card' },
    { id: 'c5', project: ['kidney'], subpath: ['tx'], priority: 'p0', title: 'Transplant card' }
  ];

  // CKD patient
  var st1 = makeState({});
  var p1 = getEducationProfile(st1);
  var r1 = getEducationCards(p1, cards);
  assert(r1.length === 1, 'CKD patient gets 1 card (CKD only)');
  assert(r1[0].id === 'c1', 'CKD patient gets CKD card');

  // PD patient
  var st2 = makeState({
    enabledPrograms: { kidney: true, dialysis: true },
    dialysis: { modality: 'pd' }
  });
  var p2 = getEducationProfile(st2);
  var r2 = getEducationCards(p2, cards);
  assert(r2.find(function(c) { return c.id === 'c2'; }), 'PD patient gets PD card');
  assert(!r2.find(function(c) { return c.id === 'c3'; }), 'PD patient does NOT get HD card');

  // Transplant patient
  var st3 = makeState({ kidney: { track: 'tx' } });
  var p3 = getEducationProfile(st3);
  var r3 = getEducationCards(p3, cards);
  assert(r3.find(function(c) { return c.id === 'c5'; }), 'Transplant patient gets TX card');

  // Pediatric
  var st4 = makeState({ enabledPrograms: { kidney: true, peds: true } });
  var p4 = getEducationProfile(st4);
  var r4 = getEducationCards(p4, cards);
  assert(r4.find(function(c) { return c.id === 'c4'; }), 'Peds patient gets peds card');

  // Non-peds should NOT get peds card
  var st5 = makeState({});
  var p5 = getEducationProfile(st5);
  var r5 = getEducationCards(p5, cards);
  assert(!r5.find(function(c) { return c.id === 'c4'; }), 'Non-peds patient does NOT get peds card');
})();

// ──────────────────────────────────────────────
// 6. Marker Maturity
// ──────────────────────────────────────────────

console.log('\n=== 6. Marker Maturity ===');

(function() {
  var m1 = getMarkerMaturity('anti-PLA2R');
  assert(m1.maturity === 'standard', 'anti-PLA2R is standard');
  assert(m1.label === '标准', 'anti-PLA2R label is 标准');

  var m2 = getMarkerMaturity('dd-cfDNA');
  assert(m2.maturity === 'adjunct', 'dd-cfDNA is adjunct');

  var m3 = getMarkerMaturity('anti-nephrin');
  assert(m3.maturity === 'emerging', 'anti-nephrin is emerging');

  var m4 = getMarkerMaturity('unknown_marker');
  assert(m4.maturity === 'unknown', 'Unknown marker returns unknown');
})();

// ──────────────────────────────────────────────
// 7. AI Evidence Builder
// ──────────────────────────────────────────────

console.log('\n=== 7. AI Evidence ===');

(function() {
  var st = makeState({
    labs: [{ date: '2026-01-15', cr: '120', egfr: '45', k: '5.2', p: '1.4' }],
    vitals: {
      bp: [{ sys: 140, dia: 90, dateTime: '2026-01-20T08:00' }],
      glucose: [{ value: 7.5, unit: 'mmolL', dateTime: '2026-01-20T08:00' }]
    }
  });
  var evidence = buildAIEvidence(st);
  assert(evidence.length >= 4, 'Evidence has at least 4 items (cr, egfr, K, P)');
  var crItem = evidence.find(function(e) { return e.label === '肌酐'; });
  assert(crItem && crItem.value === 120, 'Creatinine value is 120');
  assert(crItem && crItem.date === '2026-01-15', 'Creatinine date is correct');

  var bpItem = evidence.find(function(e) { return e.label === '最近血压'; });
  assert(!!bpItem, 'BP evidence is present');
})();

(function() {
  var st = makeState({
    enabledPrograms: { kidney: true, dialysis: true },
    dialysis: { modality: 'pd', fluidRestricted: 'true' },
    kidney: { track: 'tx' },
    labs: [{ date: '2026-01-15', k: '5.8' }]
  });
  var p = getEducationProfile(st);
  var rules = buildTriggeredRules(p);
  assert(rules.length >= 3, 'Multiple rules triggered for complex profile');
  assert(rules.some(function(r) { return r.indexOf('血钾偏高') >= 0; }), 'High K rule triggered');
  assert(rules.some(function(r) { return r.indexOf('限水') >= 0; }), 'Fluid restriction rule triggered');
  assert(rules.some(function(r) { return r.indexOf('移植') >= 0; }), 'Transplant rule triggered');
})();

// ──────────────────────────────────────────────
// Summary
// ──────────────────────────────────────────────

console.log('\n' + '='.repeat(50));
console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) {
  console.log('\nFailed tests:');
  tests.filter(function(t) { return t.status === 'FAIL'; }).forEach(function(t) {
    console.log('  - ' + t.msg);
  });
  process.exit(1);
} else {
  console.log('All tests passed!');
  process.exit(0);
}
