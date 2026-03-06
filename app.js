(function () {
  const KEY = 'list_experiment_academy_v3';
  const defaultState = { unlocked: 1, badges: 0, xp: 0, attempts: 0 };

  function getState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) || 'null');
      return parsed ? { ...defaultState, ...parsed } : { ...defaultState };
    } catch {
      return { ...defaultState };
    }
  }
  function saveState(next) { localStorage.setItem(KEY, JSON.stringify(next)); }
  function updateProgress(deltaXp = 0, gainBadge = false, unlockTo = null) {
    const s = getState();
    s.xp += deltaXp;
    s.attempts += 1;
    if (gainBadge) s.badges += 1;
    if (unlockTo !== null) s.unlocked = Math.max(s.unlocked, unlockTo);
    saveState(s);
    return s;
  }
  function resetState() { saveState({ ...defaultState }); }

  function randn() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function sigmoid(z) { return 1 / (1 + Math.exp(-z)); }
  function mean(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }

  function drawBernoulli(p) { return Math.random() < p ? 1 : 0; }

  function simulateListExperiment({
    n = 400,
    J = 4,
    controlProb = [0.2, 0.35, 0.4, 0.5],
    baseSensitive = -0.6,
    betaX = 0.9,
    directLieProb = 0.35,
    designEffect = 0,
    treatmentBias = 0
  } = {}) {
    const rows = [];
    for (let i = 0; i < n; i++) {
      const x = randn();
      const pSensitive = sigmoid(baseSensitive + betaX * x);
      const zTrue = drawBernoulli(pSensitive);
      let y0 = 0;
      for (let j = 0; j < J; j++) {
        const p0 = Math.min(0.98, Math.max(0.02, controlProb[j] + designEffect * zTrue * 0.04));
        y0 += drawBernoulli(p0);
      }
      const pt = sigmoid(treatmentBias * x);
      const T = drawBernoulli(pt);
      const yList = y0 + (T ? zTrue : 0);
      const yDirect = (zTrue === 1 && Math.random() < directLieProb) ? 0 : zTrue;
      rows.push({ x, zTrue, y0, T, yList, yDirect });
    }
    return rows;
  }

  function listDiffInMeans(rows) {
    const t = rows.filter(r => r.T === 1).map(r => r.yList);
    const c = rows.filter(r => r.T === 0).map(r => r.yList);
    return mean(t) - mean(c);
  }

  function directMean(rows) { return mean(rows.map(r => r.yDirect)); }
  function truthMean(rows) { return mean(rows.map(r => r.zTrue)); }

  function distByGroup(rows, key, maxVal) {
    const binsT = Array(maxVal + 1).fill(0);
    const binsC = Array(maxVal + 1).fill(0);
    const tRows = rows.filter(r => r.T === 1);
    const cRows = rows.filter(r => r.T === 0);
    tRows.forEach(r => binsT[r[key]]++);
    cRows.forEach(r => binsC[r[key]]++);
    return {
      t: binsT.map(v => v / tRows.length),
      c: binsC.map(v => v / cRows.length)
    };
  }

  function olsTreatmentCoeff(rows) {
    const n = rows.length;
    let s00 = n, s01 = 0, s02 = 0, s11 = 0, s12 = 0, s22 = 0;
    let t0 = 0, t1 = 0, t2 = 0;
    rows.forEach(r => {
      const d = r.T, x = r.x, y = r.yList;
      s01 += d; s02 += x;
      s11 += d * d; s12 += d * x; s22 += x * x;
      t0 += y; t1 += d * y; t2 += x * y;
    });
    const A = [[s00, s01, s02], [s01, s11, s12], [s02, s12, s22]];
    const b = [t0, t1, t2];
    const det3 = (m) => m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1]) - m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0]) + m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]);
    const detA = det3(A);
    if (Math.abs(detA) < 1e-9) return NaN;
    const A2 = [[s00, b[0], s02], [s01, b[1], s12], [s02, b[2], s22]];
    return det3(A2) / detA;
  }

  window.ListCore = {
    getState, saveState, updateProgress, resetState,
    simulateListExperiment, listDiffInMeans, directMean, truthMean,
    distByGroup, olsTreatmentCoeff
  };
})();
