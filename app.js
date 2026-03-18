(function () {
  const KEY = 'list_experiment_academy_v4';
  const defaultState = { unlocked: 1, badges: 0, xp: 0, attempts: 0, stars: 0 };

  function getState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) || 'null');
      return parsed ? { ...defaultState, ...parsed } : { ...defaultState };
    } catch {
      return { ...defaultState };
    }
  }
  function saveState(next) { localStorage.setItem(KEY, JSON.stringify(next)); }
  function updateProgress({ xp = 0, stars = 0, badge = false, unlock = null } = {}) {
    const s = getState();
    s.xp += xp;
    s.stars += stars;
    s.attempts += 1;
    if (badge) s.badges += 1;
    if (unlock !== null) s.unlocked = Math.max(s.unlocked, unlock);
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

  function simulateListExperiment({
    n = 500,
    J = 4,
    controlProb = [0.2, 0.32, 0.45, 0.55],
    baseSensitive = -0.7,
    betaX = 0.85,
    directLieProb = 0.35,
    designEffect = 0,
    treatmentBias = 0,
    ceilingLie = 0,
    floorLie = 0
  } = {}) {
    const rows = [];
    for (let i = 0; i < n; i++) {
      const x = randn();
      const pSensitive = sigmoid(baseSensitive + betaX * x);
      const zTrue = Math.random() < pSensitive ? 1 : 0;

      let y0 = 0;
      for (let j = 0; j < J; j++) {
        const p0 = Math.max(0.02, Math.min(0.98, controlProb[j] + (designEffect * zTrue * 0.05)));
        y0 += Math.random() < p0 ? 1 : 0;
      }

      const pT = sigmoid(treatmentBias * x);
      const T = Math.random() < pT ? 1 : 0;
      let yList = y0 + (T ? zTrue : 0);

      if (T && zTrue === 1 && y0 === J && Math.random() < ceilingLie) yList = J;
      if (T && zTrue === 1 && y0 === 0 && Math.random() < floorLie) yList = 0;

      const yDirect = (zTrue === 1 && Math.random() < directLieProb) ? 0 : zTrue;
      rows.push({ x, zTrue, y0, T, yList, yDirect });
    }
    return rows;
  }

  function diffInMeans(rows) {
    const t = rows.filter(r => r.T === 1).map(r => r.yList);
    const c = rows.filter(r => r.T === 0).map(r => r.yList);
    const mt = mean(t), mc = mean(c);
    const varArr = arr => {
      const m = mean(arr);
      return arr.reduce((s, v) => s + (v - m) ** 2, 0) / Math.max(1, arr.length - 1);
    };
    const se = Math.sqrt(varArr(t) / t.length + varArr(c) / c.length);
    return { est: mt - mc, ciL: mt - mc - 1.96 * se, ciU: mt - mc + 1.96 * se };
  }

  function truthMean(rows) { return mean(rows.map(r => r.zTrue)); }
  function directMean(rows) { return mean(rows.map(r => r.yDirect)); }

  function distByGroup(rows, key, maxVal) {
    const binsT = Array(maxVal + 1).fill(0);
    const binsC = Array(maxVal + 1).fill(0);
    const tRows = rows.filter(r => r.T === 1), cRows = rows.filter(r => r.T === 0);
    tRows.forEach(r => binsT[r[key]]++);
    cRows.forEach(r => binsC[r[key]]++);
    return { t: binsT.map(v => v / tRows.length), c: binsC.map(v => v / cRows.length) };
  }

  function olsTreatmentCoeff(rows) {
    const n = rows.length;
    let s00 = n, s01 = 0, s02 = 0, s11 = 0, s12 = 0, s22 = 0;
    let t0 = 0, t1 = 0, t2 = 0;
    rows.forEach(r => {
      const d = r.T, x = r.x, y = r.yList;
      s01 += d; s02 += x; s11 += d * d; s12 += d * x; s22 += x * x;
      t0 += y; t1 += d * y; t2 += x * y;
    });
    const A = [[s00, s01, s02], [s01, s11, s12], [s02, s12, s22]];
    const b = [t0, t1, t2];
    const det3 = m => m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1]) - m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0]) + m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]);
    const detA = det3(A);
    if (Math.abs(detA) < 1e-9) return NaN;
    const A2 = [[s00, b[0], s02], [s01, b[1], s12], [s02, b[2], s22]];
    return det3(A2) / detA;
  }

  window.ListCore = { getState, saveState, updateProgress, resetState, simulateListExperiment, diffInMeans, truthMean, directMean, distByGroup, olsTreatmentCoeff };
})();
