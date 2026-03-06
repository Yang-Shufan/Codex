(function () {
  const KEY = 'stats_adventure_v2';
  const defaultState = { unlocked: 1, badges: 0, xp: 0, attempts: 0 };

  function getState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) || 'null');
      return parsed ? { ...defaultState, ...parsed } : { ...defaultState };
    } catch {
      return { ...defaultState };
    }
  }

  function saveState(next) {
    localStorage.setItem(KEY, JSON.stringify(next));
  }

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

  function mean(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }

  function std(arr) {
    const m = mean(arr);
    return Math.sqrt(arr.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, arr.length - 1));
  }

  function generateSample({ n = 80, tau = 2, sigma = 8, conf = 0, confounded = false }) {
    const x = [], d = [], y = [];
    for (let i = 0; i < 2 * n; i++) {
      const ability = randn();
      x.push(ability);
      let treat;
      if (!confounded) {
        treat = Math.random() < 0.5 ? 1 : 0;
      } else {
        const p = 1 / (1 + Math.exp(-(ability * conf)));
        treat = Math.random() < p ? 1 : 0;
      }
      d.push(treat);
      y.push(50 + tau * treat + 3.2 * ability + sigma * randn());
    }
    return { x, d, y };
  }

  function diffInMeans(y, d) {
    const t = [], c = [];
    for (let i = 0; i < y.length; i++) (d[i] ? t : c).push(y[i]);
    const mt = mean(t), mc = mean(c);
    const se = Math.sqrt((std(t) ** 2 / t.length) + (std(c) ** 2 / c.length));
    const ate = mt - mc;
    return { ate, mt, mc, se, ciL: ate - 1.96 * se, ciU: ate + 1.96 * se };
  }

  function regressYOnDX(y, d, x) {
    const n = y.length;
    let s00 = n, s01 = 0, s02 = 0, s11 = 0, s12 = 0, s22 = 0;
    let t0 = 0, t1 = 0, t2 = 0;
    for (let i = 0; i < n; i++) {
      const di = d[i], xi = x[i], yi = y[i];
      s01 += di; s02 += xi;
      s11 += di * di; s12 += di * xi; s22 += xi * xi;
      t0 += yi; t1 += di * yi; t2 += xi * yi;
    }
    const A = [[s00, s01, s02], [s01, s11, s12], [s02, s12, s22]];
    const b = [t0, t1, t2];
    function det3(m) {
      return m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1]) - m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0]) + m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]);
    }
    const detA = det3(A);
    if (Math.abs(detA) < 1e-9) return { b1: NaN, b2: NaN };
    const A2 = [[s00, b[0], s02], [s01, b[1], s12], [s02, b[2], s22]];
    const A3 = [[s00, s01, b[0]], [s01, s11, b[1]], [s02, s12, b[2]]];
    return { b1: det3(A2) / detA, b2: det3(A3) / detA };
  }

  window.GameCore = { getState, saveState, updateProgress, resetState, generateSample, diffInMeans, regressYOnDX };
})();
