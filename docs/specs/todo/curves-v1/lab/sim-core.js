const DEFAULTS = {
  'ladder.baseCost': 10, 'ladder.ratio': 3, 'ladder.capLevel': 8, 'ladder.capPerHardwareTier': 0,
  'press.activeRate': 6, 'press.casualRate': 2, 'press.paneRate': 3, 'press.maxCounted': 15, 'press.netShare': 0.02,
  'compute.startMips': 1, 'compute.oversubExponent': 2,
  'net.designCost': 30000, 'net.codeCost': 45000, 'net.costStep': 12, 'net.trainWork': 45, 'net.trainDemand': 1,
  'net.trainWorkStep': 8, 'net.trainDemandStep': 3, 'net.copyOutput': 60, 'net.copyOutputStep': 6,
  'net.copyMips': 0.25, 'net.copyMipsStep': 3, 'net.ramKB': 2, 'net.ramStep': 4,
  'copy.baseCost': 4000, 'copy.ratio': 1.12, 'copy.ratioStepDown': 0.01, 'copy.ratioFloor': 1.07,
  'dedup.seeds': 16, 'dedup.threshold': 0.9, 'dedup.costMult': 3, 'dedup.seedGrowth': 2, 'dedup.bonus': 1.5, 'dedup.floor': 0.5,
  'gig.tokens': 8000, 'gig.tokensStep': 8, 'gig.pay': 12, 'gig.payStep': 6, 'gig.interval': 20, 'gig.intervalStep': 1.5,
  'gig.deadline': 60, 'gig.deadlineStep': 1.5, 'gig.unlockSlack': 2, 'gig.citeGate': 25, 'gig.citeGateStep': 6,
  'gig.offerLife': 600, 'gig.boardSize': 3, 'gig.failRefund': 0.5,
  'hw.baseCost': 60, 'hw.baseMips': 0.5, 'hw.tierPrice': 11.7, 'hw.tierMips': 6, 'hw.unitRatio': 1.15, 'hw.sellBack': 0.25,
  'ram.startKB': 4, 'ram.baseCost': 100, 'ram.ratio': 3,
  'oc.baseCost': 200, 'oc.costRatio': 3, 'oc.mipsPerLevel': 0.1, 'oc.maxLevel': 5, 'oc.crashPerMin': 0.005,
  'oc.rebootSeconds': 30, 'oc.trainLossShare': 0.25, 'oc.trainLossCap': 60,
  'conv.unlockLifetime': 1e6, 'conv.baseCost': 100000, 'conv.costRatio': 1.15, 'conv.inputRate': 1000, 'conv.mips': 0.5,
  'conv.proseRatio': 10, 'conv.codeRatio': 10, 'conv.researchRatio': 25,
  'research.baseCost': 8000, 'research.depthRatio': 2.5, 'research.backprop': 2, 'research.dropout': 1.5,
  'research.vectorised': 0.7, 'research.cleaning': 0.5, 'research.archEdge': 0.25,
  'paper.baseCost': 20000, 'paper.costRatio': 2.5, 'cite.base': 0.05, 'cite.depthStep': 2, 'cite.halfLife': 1200, 'cite.floor': 0.5,
  'pubEvent.tmin': 120, 'pubEvent.tmax': 360, 'pubEvent.exponent': 5, 'pubEvent.marketDrop': 0.04, 'pubEvent.marketFloor': 0.7,
  'pubEvent.rivalFade': 0.25, 'pubEvent.edgeFloor': 0.5,
  'insp.tmin': 240, 'insp.tmax': 720, 'insp.exponent': 5, 'insp.lifetime': 15, 'insp.antiRepeat': 0.8,
  'insp.breakthroughMult': 3, 'insp.breakthroughSeconds': 60, 'insp.notesPoolShare': 0.15, 'insp.notesIncomeSeconds': 600,
  'insp.flowMult': 7, 'insp.flowSeconds': 30, 'insp.rushPayMult': 3, 'insp.hotTopicMult': 7, 'insp.hotTopicSeconds': 77,
  'distill.unlockDelay': 300, 'distill.k': 15, 'distill.t0': 3e7, 'distill.exponent': 0.5, 'distill.bonusPerLogit': 0.05,
  'distill.firstNodeCost': 1,
  'bot.idleCheckEvery': 600, 'bot.idleCheckFor': 60,
  'gig.tier1Gate': 1,          // proposed: 0 opens tier 1 with the board, no income gate
  'gig.openOnNet': 0,          // proposed: 1 opens the gig board when a net first runs, not only at the ladder cap
  // sim-only knobs for the bot (not game params)
  'sim.convShare': 0.6,        // converters may take this share of raw income
  'sim.convMinIncome': 1.25,   // run one converter once raw income >= this x its input
  'sim.convMipsShare': 0.6,    // active: converters may hold this share of MIPS
  'sim.activePayback': 600,    // active: buy a copy only if it pays back within this many s
  'sim.idlePayback': 1800,
  'sim.trainWait': 300,        // active: wait up to this long for training to fit
  'conv.rawTypedMult': 1,       // proposed game param: raw tokens accepted for MLP+ code at this x price
  'sim.gigInstant': 1,         // 1: an always-present player takes a gig only when the pool covers it now
  'sim.gigPolicy': 4,          // take gigs while free MIPS < this many copies (1 = only when full; 1e9 = always)
  // final-rec additions (draft behaviour by default)
  'compute.priorityWeight': 1, // D17: weight ratio between adjacent priority ranks before queuing (1 = uniform D16)
  'dedup.handWave': 0,         // D5: 1 = copies count fully until the repeat event, then only new copies lose value
  'grant.citeGate': 10, 'grant.citeStep': 4, 'grant.pay': 0, 'grant.payStep': 6,
  'gig.typedFromTier': 7, 'gig.typedShare': 0.25,   // worst case: the typed share is paid in raw at rawTypedMult
  'net.typedDesignFromTier': 5, // tier index (0 = Perceptron) from which design is paid in prose (raw at rawTypedMult)
  'research.techEdge': 0,      // first-mover edge on technique results, faded by the rival event
  'pipe.budgetShare': 1,       // converters draw at most this share of raw income
  'gig.maxOpen': 99,           // accepted gigs that may wait to be filled
  'sim.resetMult': 2,          // 'lifetime Nx unlock' milestone multiple
};

// Suggested changes, applied with --changes. Filled in from the findings.
const CHANGES = {
  'gig.tier1Gate': 0, 'gig.openOnNet': 1, 'gig.unlockSlack': 1.5, 'gig.boardSize': 8,
  'dedup.bonus': 1.3, 'net.copyOutput': 90, 'research.baseCost': 16000, 'paper.baseCost': 50000,
  'conv.rawTypedMult': 2, 'distill.t0': 1.8e7,
  'net.designCost': 25000, 'net.codeCost': 35000, 'press.netShare': 0, 'press.maxCounted': 40,
  'compute.priorityWeight': 1.5, 'dedup.handWave': 1, 'grant.pay': 500, 'gig.typedFromTier': 3,
  'net.typedDesignFromTier': 2, 'research.techEdge': 0.1, 'pipe.budgetShare': 0.6, 'gig.maxOpen': 3,
  'sim.resetMult': 2.25,
};

// ---------------------------------------------------------------- rng
function hashStr(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const stream = (seed, name) => mulberry32((seed * 2654435761 ^ hashStr(name)) >>> 0);
// Fire time sampled once from the per-second hazard ((t-Tmin)/(Tmax-Tmin))^k.
function sampleTimer(rng, tmin, tmax, k) {
  for (let t = Math.floor(tmin) + 1; t <= tmax; t++) if (rng() < Math.pow((t - tmin) / (tmax - tmin), k)) return t;
  return tmax;
}

// ---------------------------------------------------------------- content
const NET_NAMES = ['Perceptron', 'MLP', 'Conv', 'RNN', 'Attention'];
// name, depth, effect, publishable
const NODES = {
  'MLP': [1, 'arch1', true], 'Write it up': [1, 'publish', false], 'Touch typing': [1, 'press', false],
  'Backprop': [2, 'backprop', true], 'Data cleaning': [2, 'clean', true], 'Shorthand': [2, 'press', false],
  'Convolution': [3, 'arch2', true], 'Vectorised maths': [3, 'vec', true], 'Scheduler': [3, 'sched', false],
  'Dropout': [4, 'dropout', true], 'Recurrence': [4, 'arch3', true], 'Dictation': [4, 'press', false],
  'Synthetic data': [4, 'none', true], 'Attention': [5, 'arch4', true], 'GPU programming': [6, 'none', false],
};
const RESEARCH_ORDER = ['MLP', 'Write it up', 'Backprop', 'Touch typing', 'Data cleaning', 'Shorthand', 'Scheduler',
  'Vectorised maths', 'Convolution', 'Dropout', 'Recurrence', 'Dictation', 'Attention', 'Synthetic data', 'GPU programming'];
const CONV_KINDS = ['prose', 'research', 'code'];

const ladderCost = (P, L) => P['ladder.baseCost'] * Math.pow(P['ladder.ratio'], L - 1);
function netSpec(P, i) {
  return {
    design: P['net.designCost'] * P['net.costStep'] ** i, code: P['net.codeCost'] * P['net.costStep'] ** i,
    work: P['net.trainWork'] * P['net.trainWorkStep'] ** i, demand: P['net.trainDemand'] * P['net.trainDemandStep'] ** i,
    out: P['net.copyOutput'] * P['net.copyOutputStep'] ** i, mips: P['net.copyMips'] * P['net.copyMipsStep'] ** i,
    ram: P['net.ramKB'] * P['net.ramStep'] ** i, cbase: P['copy.baseCost'] * P['net.costStep'] ** i,
    cr: Math.max(P['copy.ratioFloor'], P['copy.ratio'] - P['copy.ratioStepDown'] * i),
  };
}
// cost of buying copy number owned+1 (the first copy comes with training)
const copyCost = (P, i, owned) => { const s = netSpec(P, i); return s.cbase * Math.pow(s.cr, Math.max(0, owned - 1)); };
const uniq = (n, S) => (n <= 0 ? 0 : S * (1 - Math.pow(1 - 1 / S, n)));
const NE = {};
function eventCopy(P, S) { // smallest n with unique share below the threshold
  const key = S + '/' + P['dedup.threshold'];
  if (!(key in NE)) { let n = 2; while (uniq(n, S) / n >= P['dedup.threshold'] && n < 1e6) n++; NE[key] = n; }
  return NE[key];
}
const effCopies = (P, n, S) => {
  if (!P['dedup.handWave']) return Math.max(P['dedup.floor'] * n, uniq(n, S));
  const ne = eventCopy(P, S);
  if (n < ne) return n;
  return Math.max(P['dedup.floor'] * n, ne - 1 + uniq(n, S) - uniq(ne - 1, S));
};
function gigSpec(P, k) {
  return {
    tok: P['gig.tokens'] * P['gig.tokensStep'] ** k, pay: P['gig.pay'] * P['gig.payStep'] ** k,
    cost: P['gig.tokens'] * P['gig.tokensStep'] ** k * (k + 1 >= P['gig.typedFromTier'] ? 1 + P['gig.typedShare'] * (P['conv.rawTypedMult'] - 1) : 1),
    iv: P['gig.interval'] * P['gig.intervalStep'] ** k, dl: P['gig.deadline'] * P['gig.deadlineStep'] ** k,
    cite: k >= 3 ? P['gig.citeGate'] * P['gig.citeGateStep'] ** (k - 3) : 0,
  };
}
const hwPrice = (P, k, owned) => P['hw.baseCost'] * P['hw.tierPrice'] ** k * P['hw.unitRatio'] ** owned;
const hwMips = (P, k) => P['hw.baseMips'] * P['hw.tierMips'] ** k;
const nodeCost = (P, name) => P['research.baseCost'] * P['research.depthRatio'] ** (NODES[name][0] - 1);
const logitsFor = (P, life) => Math.floor(P['distill.k'] * Math.pow(life / P['distill.t0'], P['distill.exponent']));

// ---------------------------------------------------------------- strategies
function strategies(P) {
  const base = { presence: 'always', queue: true, overclock: 2, catchInsp: false, naive: false, codeConv: false,
    pressAtCheckin: false, liveGigGate: false, saveWindow: 120, payback: P['sim.activePayback'] };
  const idle = { ...base, presence: 'checkin', queue: false, overclock: 0, rate: P['press.casualRate'],
    checkEvery: P['bot.idleCheckEvery'], checkFor: P['bot.idleCheckFor'], saveWindow: P['bot.idleCheckEvery'],
    payback: P['sim.idlePayback'] };
  return {
    active: { ...base, label: 'active 6/s, queues, OC L2', rate: P['press.activeRate'] },
    activeInsp: { ...base, label: 'active + catches every Inspiration', rate: P['press.activeRate'], catchInsp: true },
    activeCode: { ...base, label: 'active, builds a code converter and pays code in code tokens', rate: P['press.activeRate'], codeConv: true },
    pane: { ...base, label: 'pane button 3/s, queues, OC L2', rate: P['press.paneRate'] },
    idle: { ...idle, label: 'idle strict: presses only while no net runs, 60 s every 10 min' },
    idleCasual: { ...idle, label: 'idle + presses 2/s during check-ins (rec profile)', pressAtCheckin: true },
    idle5: { ...idle, label: 'idle + presses, check-in every 5 min', pressAtCheckin: true, checkEvery: 300, saveWindow: 300 },
    idleNaive: { ...idle, label: 'idle naive: buys every affordable copy (D16 trap)', naive: true },
    idleLiveGate: { ...idle, label: 'idle strict, gig tiers re-checked live (not sticky)', liveGigGate: true },
    noGigs: { ...base, label: 'probe: active presser who never takes a gig (no money at all)', rate: P['press.activeRate'], noGigs: true },
  };
}

// ---------------------------------------------------------------- simulation
function simulate(P, strat, opt = {}) {
  const seed = opt.seed ?? 1;
  const rng = { crash: stream(seed, 'crash'), market: stream(seed, 'market'), rival: stream(seed, 'rival'),
    insp: stream(seed, 'insp'), pick: stream(seed, 'inspPick') };
  const horizon = opt.horizon ?? 6 * 3600;
  const S = {
    t: 0, pool: 0, life: opt.lifeStart ?? 0, runLife: 0, money: 0, L: opt.startLevel ?? 0, logits: opt.logits ?? 0,
    nets: NET_NAMES.map((_, i) => ({ stage: i === 0 ? 'hidden' : 'locked', progress: 0, copies: 0,
      S: P['dedup.seeds'], dedups: 0, mult: 1, edge: i > 0 ? P['research.archEdge'] : 0, waitSince: null })),
    hw: [0, 0, 0, 0, 0, 0], ram: 0, grants: 0, techEdges: {}, oc: 0, crashUntil: -1, crashes: 0,
    conv: { research: 0, prose: 0, code: 0 }, run: { research: 0, prose: 0, code: 0 },
    R: 0, prose: 0, code: 0, done: new Set(), researched: [], papers: [], published: new Set(), cites: 0,
    capReached: false, convUnlocked: false,
    gigOpen: [false, false, false, false, false, false], nextOffer: [0, 0, 0, 0, 0, 0], board: [], accepted: [],
    gigsDone: 0, gigsFailed: 0, gigsExpired: 0, market: 1, events: [],
    pressShare: 0, techMult: 1, mipsMult: 1, dedupMult: 1, sched: false,
    buff: { bt: -1, flow: -1, hot: -1 }, nextInsp: null, lastInsp: null, inspCaught: 0, rush: false,
    ms: {}, buys: [], trace: [], firstPaperT: null, unlockLife: null, samples: {},
    last: { raw: 0, press: 0, net: 0, convDraw: 0, gigDraw: 0 },
  };
  const lm = 1 + P['distill.bonusPerLogit'] * S.logits;
  if (opt.warmStart) S.nets[0].stage = 'coded';
  const ms = (name) => { if (!(name in S.ms)) S.ms[name] = S.t; };
  const buy = (what) => S.buys.push([S.t, what]);
  const ramKB = () => P['ram.startKB'] * 2 ** S.ram;
  const capLevel = () => P['ladder.capLevel'] + P['ladder.capPerHardwareTier'] * S.hw.filter((x) => x > 0).length;
  const netRunning = () => S.nets.some((n) => n.copies > 0);
  function present() {
    if (strat.presence === 'always') return true;
    if (!netRunning()) return true; // hands phase: the idle player presses until something else produces
    return (S.t + (opt.phase ?? 0)) % strat.checkEvery < strat.checkFor;
  }
  function pressRate(on) {
    const r = Math.min(strat.rate, P['press.maxCounted']);
    if (strat.presence === 'always') return r;
    if (!netRunning()) return r;
    return strat.pressAtCheckin && on ? r : 0;
  }
  function baseMips() { return P['compute.startMips'] + S.hw.reduce((a, n, k) => a + n * hwMips(P, k), 0); }
  function capacity() {
    if (S.t < S.crashUntil) return 0;
    return baseMips() * (strat.overclock ? 1 + P['oc.mipsPerLevel'] * S.oc : 1);
  }
  function perCopy(i) {
    const n = S.nets[i], s = netSpec(P, i);
    const bt = S.t < S.buff.bt ? P['insp.breakthroughMult'] : 1;
    const te = 1 + Object.values(S.techEdges).reduce((a, x) => a + x, 0);
    return s.out * n.mult * S.techMult * te * (1 + n.edge) * lm * bt * (effCopies(P, n.copies, n.S) / Math.max(1, n.copies));
  }
  const copyMips = (i) => netSpec(P, i).mips * S.mipsMult;
  // Job speeds. Queue: converters, then training, then copies by output per MIPS; the first job that does not
  // fit runs on the remainder at (left/d)^e; the rest wait. No queue: everyone runs at (C/D)^e when D > C.
  function speeds(cap, copiesOverride) {
    const e = P['compute.oversubExponent'];
    const copies = S.nets.map((n, i) => (copiesOverride && copiesOverride[i] !== undefined ? copiesOverride[i] : n.copies));
    const out = { conv: { research: 0, prose: 0, code: 0 }, train: {}, copy: [0, 0, 0, 0, 0], demand: 0 };
    const cd = P['conv.mips'];
    let D = CONV_KINDS.reduce((a, k) => a + S.run[k] * cd, 0);
    S.nets.forEach((n, i) => { if (n.stage === 'training') D += netSpec(P, i).demand; D += copies[i] * copyMips(i); });
    out.demand = D;
    if (cap <= 0) return out;
    if (!(strat.queue || S.sched)) {
      if (D <= cap || P['compute.priorityWeight'] === 1) {
        const s = D <= cap ? 1 : Math.pow(cap / D, e);
        for (const k of CONV_KINDS) out.conv[k] = S.run[k] * s;
        S.nets.forEach((n, i) => { if (n.stage === 'training') out.train[i] = s; out.copy[i] = copies[i] * s; });
        return out;
      }
      // default priority list: training, converters, copies newest tier first; machine work stays C (C/D)^(e-1)
      const W = cap * Math.pow(cap / D, e - 1), pw = P['compute.priorityWeight'];
      const G = [];
      S.nets.forEach((n, i) => { if (n.stage === 'training') G.push({ d: netSpec(P, i).demand, r: 0, set: (s) => { out.train[i] = s; } }); });
      const cdem = CONV_KINDS.reduce((a, k) => a + S.run[k] * cd, 0);
      if (cdem > 0) G.push({ d: cdem, r: 1, set: (s) => { for (const k of CONV_KINDS) out.conv[k] = S.run[k] * s; } });
      let r = 2;
      for (let i = 4; i >= 0; i--) if (copies[i] > 0) { const ii = i; G.push({ d: copies[i] * copyMips(i), r: r++, set: (s) => { out.copy[ii] = copies[ii] * s; } }); }
      G.sort((a, b) => a.r - b.r); G.forEach((g, j) => { g.r = j; }); // rank = position among running groups
      const w = G.map((g) => Math.pow(pw, -g.r));
      const work = (k) => G.reduce((a, g, j) => a + g.d * Math.min(1, k * w[j]), 0);
      let lo = 0, hi = 1 / Math.min(...w);
      for (let it = 0; it < 60; it++) { const mid = (lo + hi) / 2; if (work(mid) < W) lo = mid; else hi = mid; }
      G.forEach((g, j) => g.set(Math.min(1, lo * w[j])));
      return out;
    }
    let left = cap, partial = false;
    const admit = (d) => {
      if (d <= left + 1e-9) { left -= d; return 1; }
      if (!partial && left > 1e-9) { const s = Math.pow(left / d, e); left = 0; partial = true; return s; }
      return 0;
    };
    for (const k of CONV_KINDS) for (let j = 0; j < S.run[k]; j++) out.conv[k] += admit(cd);
    S.nets.forEach((n, i) => { if (n.stage === 'training') out.train[i] = admit(netSpec(P, i).demand); });
    const order = [0, 1, 2, 3, 4].filter((i) => copies[i] > 0).sort((a, b) => perCopy(b) / copyMips(b) - perCopy(a) / copyMips(a));
    for (const i of order) {
      const m = copyMips(i);
      const run = Math.min(copies[i], Math.floor((left + 1e-9) / m));
      left -= run * m;
      let sp = run;
      if (run < copies[i]) sp += admit(m);
      out.copy[i] = sp;
    }
    return out;
  }
  function copyOutput(sp) { return sp.copy.reduce((a, s, i) => a + (s > 0 ? s * perCopyAt(i, sp) : 0), 0); }
  // perCopy depends on owned count through uniqueness; for an override we recompute
  let overrideCopies = null;
  function perCopyAt(i) {
    if (!overrideCopies) return perCopy(i);
    const n = S.nets[i], save = n.copies; n.copies = overrideCopies[i]; const v = perCopy(i); n.copies = save; return v;
  }
  function estIncome() { // raw tokens per second the player can count on until the next look
    return S.last.net + (strat.presence === 'always' || !netRunning() ? S.last.press : 0);
  }
  const paperCost = () => P['paper.baseCost'] * P['paper.costRatio'] ** S.papers.length;
  const unpublished = () => S.researched.filter((r) => NODES[r][2] && !S.published.has(r));
  const nextNode = () => RESEARCH_ORDER.find((n) => !S.done.has(n));
  const convCost = (kind) => P['conv.baseCost'] * P['conv.costRatio'] ** S.conv[kind];
  const ramCost = () => P['ram.baseCost'] * P['ram.ratio'] ** S.ram;
  const committed = () => S.accepted.reduce((a, g) => a + g.need - g.got, 0);

  function applyNode(name) {
    const eff = NODES[name][1];
    if (eff.startsWith('arch')) { const i = +eff.slice(4); if (S.nets[i].stage === 'locked') S.nets[i].stage = 'available'; }
    if (eff === 'backprop') S.techMult *= P['research.backprop'];
    if (eff === 'dropout') S.techMult *= P['research.dropout'];
    if (eff === 'vec') S.mipsMult *= P['research.vectorised'];
    if (eff === 'clean') S.dedupMult *= P['research.cleaning'];
    if (eff === 'press') S.pressShare += P['press.netShare'];
    if (eff === 'sched') S.sched = true;
    if (NODES[name][2] && !eff.startsWith('arch')) S.techEdges[name] = P['research.techEdge'];
  }

  // -------------------------------------------------------------- bot
  function bot(sp, cap) {
    // ladder
    while (S.L < capLevel() && S.pool - committed() >= ladderCost(P, S.L + 1)) {
      S.pool -= ladderCost(P, S.L + 1); S.L++; buy('ladder L' + S.L); ms('ladder L' + S.L);
    }
    if (S.L >= P['ladder.capLevel'] && !S.capReached) {
      S.capReached = true; ms('ladder cap');
      if (S.nets[0].stage === 'hidden') S.nets[0].stage = 'available';
    }
    // net stages; decide whether to save tokens for the next stage
    let saving = null;
    const inc = estIncome(), incConv = Math.max(0, inc - S.last.convDraw);
    const consider = (cost) => {
      if (saving) return;
      const gap = cost - (S.pool - committed());
      if (gap / Math.max(1e-9, incConv) <= strat.saveWindow) saving = { pauseConv: false };
      else if (gap / Math.max(1e-9, inc) <= strat.saveWindow) saving = { pauseConv: true };
    };
    for (let i = 0; i < 5; i++) {
      const n = S.nets[i], s = netSpec(P, i);
      if (n.stage === 'available' && ramKB() >= s.ram) {
        const dp = s.design * (i >= P['net.typedDesignFromTier'] ? P['conv.rawTypedMult'] : 1);
        if (S.pool - committed() >= dp) { S.pool -= dp; n.stage = 'designed'; buy(NET_NAMES[i] + ' design'); ms(NET_NAMES[i] + ' designed'); }
        else consider(dp);
      }
      if (n.stage === 'designed') {
        const codeOnly = i > 0 && S.conv.code > 0;
        const ct = s.code / P['conv.codeRatio'];
        const rawPrice = s.code * (i > 0 ? P['conv.rawTypedMult'] : 1);
        if (codeOnly && S.code >= ct) { S.code -= ct; n.stage = 'coded'; }
        else if (!codeOnly && S.pool - committed() >= rawPrice) { S.pool -= rawPrice; n.stage = 'coded'; }
        else if (!codeOnly) consider(rawPrice);
        if (n.stage === 'coded') { buy(NET_NAMES[i] + ' code'); ms(NET_NAMES[i] + ' coded'); }
      }
      if (n.stage === 'coded') {
        let go = true;
        if (strat.queue) {
          const convD = CONV_KINDS.reduce((a, k) => a + S.run[k] * P['conv.mips'], 0);
          if (n.waitSince === null) n.waitSince = S.t;
          go = cap - convD >= s.demand - 1e-9 || S.t - n.waitSince >= P['sim.trainWait'];
        }
        if (go) { n.stage = 'training'; n.progress = 0; ms(NET_NAMES[i] + ' training starts'); }
      }
    }
    // converters: decide how many of each kind run, build missing ones
    let reserved = 0;
    if (S.convUnlocked) {
      const needR = !!nextNode();
      const needP = S.done.has('Write it up') && unpublished().length > 0 && S.prose < paperCost();
      const needC = strat.codeConv && S.done.has('MLP') && S.nets.some((n, i) => i > 0 && (n.stage === 'available' || n.stage === 'designed'));
      let k = Math.floor(P['sim.convShare'] * inc / P['conv.inputRate']);
      if (k === 0 && inc >= P['sim.convMinIncome'] * P['conv.inputRate']) k = 1;
      const cd = P['conv.mips'];
      const runningConv = CONV_KINDS.reduce((a, kk) => a + S.run[kk], 0);
      let kM;
      if (strat.queue || S.sched) kM = Math.floor(cap * P['sim.convMipsShare'] / cd + 1e-9);
      else kM = runningConv + Math.floor(Math.max(0, cap - sp.demand) / cd + 1e-9);
      const want = { prose: needP ? 1 : 0, code: needC ? 1 : 0, research: 0 };
      want.research = needR ? Math.max(0, k - want.prose - want.code) : 0;
      const kWant = want.prose + want.code + want.research;
      if (!strat.queue && !S.sched && kWant > runningConv) reserved = (kWant - runningConv) * cd;
      let room = Math.min(k, kM);
      for (const kind of CONV_KINDS) {
        const w = Math.min(want[kind], room);
        room -= w;
        if (S.conv[kind] === 0 && w > 0) consider(convCost(kind));
        while ((!saving || S.conv[kind] === 0) && S.conv[kind] < w && S.pool - committed() >= convCost(kind)) {
          S.pool -= convCost(kind); S.conv[kind]++; buy(kind + ' converter'); ms('first converter built'); ms(kind + ' converter built');
        }
        S.run[kind] = saving && saving.pauseConv ? 0 : Math.min(S.conv[kind], w);
      }
    }
    if (!saving) {
      // dedup: a gate that pays
      S.nets.forEach((n, i) => {
        if (n.copies > 1 && uniq(n.copies, n.S) / n.copies < P['dedup.threshold']) {
          const cost = P['dedup.costMult'] * copyCost(P, i, n.copies) * S.dedupMult;
          if (S.pool - committed() >= cost) { S.pool -= cost; n.S *= P['dedup.seedGrowth']; n.mult *= P['dedup.bonus']; n.dedups++; buy(NET_NAMES[i] + ' dedup'); ms('first dedup paid'); }
        }
      });
      // copies first while MIPS is free (see below); gigs only when money is the constraint:
      // RAM is needed, or the machine is full so more MIPS is what helps
      const minCopy = Math.min(...S.nets.map((n, i) => (n.copies > 0 ? copyMips(i) : Infinity)));
      const freeMips = cap - sp.demand - reserved;
      const headroom = P['sim.gigPolicy'];
      const wantMoney = S.nets.some((n, i) => n.stage === 'available' && netSpec(P, i).ram > ramKB()) ||
        !netRunning() || freeMips < headroom * (Number.isFinite(minCopy) ? minCopy : 0.25) - 1e-9 || strat.naive;
      let free = S.pool - S.accepted.reduce((a, g) => a + g.need - g.got, 0);
      const incAway = Math.max(0, S.last.net + (strat.presence === 'always' ? S.last.press : 0) - S.last.convDraw);
      const offers = wantMoney && !strat.noGigs ? S.board.slice().sort((a, b) => b.k - a.k) : [];
      for (const o of offers) {
        const g = gigSpec(P, o.k);
        const instant = P['sim.gigInstant'] && strat.presence === 'always';
        if (S.accepted.length >= P['gig.maxOpen']) break;
        if (free >= g.cost || (!instant && free + incAway * g.dl * 0.6 >= g.cost)) {
          free -= g.cost;
          S.accepted.push({ k: o.k, need: g.cost, got: 0, deadline: S.t + g.dl, rush: false });
          S.board.splice(S.board.indexOf(o), 1);
        }
      }
      // copies
      for (let guard = 0; guard < 300; guard++) {
        let best = null;
        const base = strat.queue || S.sched ? copyOutput(speeds(cap)) : 0;
        for (let i = 0; i < 5; i++) {
          const n = S.nets[i];
          if (n.copies === 0) continue;
          const cost = copyCost(P, i, n.copies);
          if (S.pool - committed() < cost) continue;
          let gain;
          if (strat.naive) gain = perCopy(i);
          else if (strat.queue || S.sched) {
            overrideCopies = S.nets.map((x) => x.copies); overrideCopies[i]++;
            gain = copyOutput(speeds(cap, overrideCopies)) - base;
            overrideCopies = null;
          } else {
            const fits = sp.demand + copyMips(i) + reserved <= cap + 1e-9;
            const save = n.copies; const before = perCopy(i) * save; n.copies++; const after = perCopy(i) * n.copies; n.copies = save;
            gain = fits ? after - before : 0;
          }
          if (gain <= 0 || (!strat.naive && cost / gain > strat.payback)) continue;
          if (!best || gain / cost > best.score) best = { score: gain / cost, i, cost };
        }
        if (!best) break;
        S.pool -= best.cost; S.nets[best.i].copies++; buy(NET_NAMES[best.i] + ' copy ' + S.nets[best.i].copies);
        sp.demand += copyMips(best.i);
      }
    }
    // money: RAM for an available net first, then overclock (active), then the best MIPS per dollar
    let needRam = S.nets.some((n, i) => n.stage === 'available' && netSpec(P, i).ram > ramKB());
    while (needRam && S.money >= ramCost()) {
      S.money -= ramCost(); S.ram++; buy('RAM ' + ramKB() + ' KB'); ms('first RAM');
      needRam = S.nets.some((n, i) => n.stage === 'available' && netSpec(P, i).ram > ramKB());
    }
    if (!needRam) {
      if (strat.overclock > S.oc && S.oc < P['oc.maxLevel']) {
        const c = P['oc.baseCost'] * P['oc.costRatio'] ** S.oc;
        if (S.money >= 3 * c) { S.money -= c; S.oc++; buy('overclock L' + S.oc); }
      }
      // best MIPS per dollar; if that is out of reach, take an affordable item within 20% of its ratio
      for (let guard = 0; guard < 100; guard++) {
        let best = null, bestAff = null;
        for (let k = 0; k < 6; k++) {
          if (k > 0 && S.hw[k - 1] === 0) break;
          const price = hwPrice(P, k, S.hw[k]);
          const score = hwMips(P, k) / price;
          if (!best || score > best.score) best = { k, price, score };
          if (S.money >= price && (!bestAff || score > bestAff.score)) bestAff = { k, price, score };
        }
        if (best && S.money < best.price) best = bestAff && bestAff.score >= 0.8 * best.score ? bestAff : null;
        if (!best) break;
        S.money -= best.price; S.hw[best.k]++; buy('hardware tier ' + (best.k + 1)); ms('first hardware');
        if (best.k > 0) ms('hardware tier ' + (best.k + 1));
      }
    }
    // research (strict order) and papers
    const nn = nextNode();
    if (nn && S.R >= nodeCost(P, nn)) {
      S.R -= nodeCost(P, nn); S.done.add(nn); S.researched.push(nn); applyNode(nn); buy('research ' + nn); ms('research: ' + nn);
    }
    if (S.done.has('Write it up')) {
      const up = unpublished();
      if (up.length && S.prose >= paperCost()) {
        S.prose -= paperCost();
        const node = up[0];
        S.published.add(node);
        S.papers.push({ t: S.t, node, rate: P['cite.base'] * P['cite.depthStep'] ** (NODES[node][0] - 1) });
        const idx = S.papers.length - 1;
        S.events.push({ t: S.t + sampleTimer(rng.market, P['pubEvent.tmin'], P['pubEvent.tmax'], P['pubEvent.exponent']), type: 'market', idx });
        S.events.push({ t: S.t + sampleTimer(rng.rival, P['pubEvent.tmin'], P['pubEvent.tmax'], P['pubEvent.exponent']), type: 'rival', idx });
        buy('paper on ' + node);
        if (S.firstPaperT === null) { S.firstPaperT = S.t; ms('first paper'); }
      }
    }
  }

  function inspiration(raw) {
    if (!strat.catchInsp) return;
    if (S.nextInsp === null) S.nextInsp = S.t + sampleTimer(rng.insp, P['insp.tmin'], P['insp.tmax'], P['insp.exponent']);
    if (S.t < S.nextInsp) return;
    const pool = [['bt', 40], ['notes', 30], ['flow', 15]];
    if (S.gigOpen[0]) pool.push(['rush', 15]);
    if (S.papers.length) pool.push(['hot', 10]);
    let cand = pool;
    if (S.lastInsp && rng.pick() < P['insp.antiRepeat']) cand = pool.filter((p) => p[0] !== S.lastInsp);
    const tot = cand.reduce((a, p) => a + p[1], 0);
    let r = rng.pick() * tot, pick = cand[0][0];
    for (const p of cand) { if (r < p[1]) { pick = p[0]; break; } r -= p[1]; }
    if (pick === 'bt') S.buff.bt = S.t + P['insp.breakthroughSeconds'];
    if (pick === 'flow') S.buff.flow = S.t + P['insp.flowSeconds'];
    if (pick === 'hot') S.buff.hot = S.t + P['insp.hotTopicSeconds'];
    if (pick === 'notes') { const add = Math.min(P['insp.notesPoolShare'] * S.pool, P['insp.notesIncomeSeconds'] * raw); S.pool += add; S.life += add; S.runLife += add; }
    if (pick === 'rush') S.rush = true;
    S.lastInsp = pick; S.inspCaught++;
    S.nextInsp = S.t + sampleTimer(rng.insp, P['insp.tmin'], P['insp.tmax'], P['insp.exponent']);
  }

  // -------------------------------------------------------------- main loop
  const pCrash = (j) => 1 - Math.pow(1 - P['oc.crashPerMin'] * j * j, 1 / 60);
  let stopAt = null;
  for (S.t = 0; S.t < horizon; S.t++) {
    const on = present();
    const presses = pressRate(on);
    const cap = capacity();
    const sp = speeds(cap);
    // training
    S.nets.forEach((n, i) => {
      if (n.stage !== 'training') return;
      const s = netSpec(P, i);
      n.progress += s.demand * (sp.train[i] || 0);
      if (n.progress >= s.work) { n.stage = 'running'; n.copies = Math.max(1, n.copies); ms(NET_NAMES[i] + ' trained'); buy(NET_NAMES[i] + ' trained'); }
    });
    // income
    const netOut = copyOutput(sp);
    const flow = S.t < S.buff.flow ? P['insp.flowMult'] : 1;
    const pressTok = presses * 2 ** S.L * lm * flow + presses * S.pressShare * netOut;
    const raw = pressTok + netOut;
    S.pool += raw; S.life += raw; S.runLife += raw;
    // converters draw from the pool; output scales with the share available
    let W = 0; for (const k of CONV_KINDS) W += P['conv.inputRate'] * sp.conv[k];
    const f = W > 0 ? Math.min(1, S.pool / W, P['pipe.budgetShare'] * raw / W) : 0;
    const ratio = { prose: P['conv.proseRatio'], research: P['conv.researchRatio'], code: P['conv.codeRatio'] };
    for (const k of CONV_KINDS) {
      const draw = P['conv.inputRate'] * sp.conv[k] * f;
      S[k === 'research' ? 'R' : k] += (draw / ratio[k]) * lm;
    }
    S.pool -= W * f;
    // accepted gigs draw from the pool until filled
    let gigDraw = 0;
    for (const g of S.accepted.slice()) {
      const take = Math.min(S.pool, g.need - g.got);
      S.pool -= take; g.got += take; gigDraw += take;
      const spec = gigSpec(P, g.k);
      if (g.got >= g.need - 1e-9) {
        let pay = spec.pay * S.market * lm;
        if (S.rush) { pay *= P['insp.rushPayMult']; S.rush = false; }
        S.money += pay; S.gigsDone++; S.accepted.splice(S.accepted.indexOf(g), 1); ms('first gig paid');
      } else if (S.t >= g.deadline) {
        S.pool += P['gig.failRefund'] * g.got; S.gigsFailed++; S.accepted.splice(S.accepted.indexOf(g), 1);
      }
    }
    S.last = { raw, press: pressTok, net: netOut, convDraw: W * f, gigDraw };
    // citations
    const hot = S.t < S.buff.hot ? P['insp.hotTopicMult'] : 1;
    for (const p of S.papers) {
      const age = S.t - p.t;
      S.cites += p.rate * (P['cite.floor'] + (1 - P['cite.floor']) * Math.pow(2, -age / P['cite.halfLife'])) * hot;
    }
    while (P['grant.pay'] > 0 && S.cites >= P['grant.citeGate'] * P['grant.citeStep'] ** S.grants) {
      S.money += P['grant.pay'] * P['grant.payStep'] ** S.grants * lm; S.grants++; ms('grant ' + S.grants);
    }
    // gig tiers and offers
    for (let k = 0; k < 6; k++) {
      const g = gigSpec(P, k);
      const boardOpen = S.capReached || (P['gig.openOnNet'] && netRunning());
      const gated = k > 0 || P['gig.tier1Gate'];
      const ok = boardOpen && (!gated || raw >= P['gig.unlockSlack'] * g.tok / g.dl) && S.cites >= g.cite;
      if (strat.liveGigGate) S.gigOpen[k] = ok;
      else if (ok && !S.gigOpen[k]) S.gigOpen[k] = true;
      if (S.gigOpen[k]) ms('gig tier ' + (k + 1) + ' open');
      if (S.gigOpen[k] && S.t >= S.nextOffer[k] && S.board.filter((o) => o.k === k).length < P['gig.boardSize']) {
        S.board.push({ k, born: S.t }); S.nextOffer[k] = S.t + g.iv;
      }
    }
    const before = S.board.length;
    S.board = S.board.filter((o) => S.t - o.born < P['gig.offerLife']);
    S.gigsExpired += before - S.board.length;
    // publishing cost events
    for (const e of S.events.slice()) {
      if (S.t < e.t) continue;
      if (e.type === 'market') S.market = Math.max(P['pubEvent.marketFloor'], S.market * (1 - P['pubEvent.marketDrop']));
      if (e.type === 'rival') {
        const node = S.papers[e.idx].node;
        const arch = NODES[node][1].startsWith('arch') ? +NODES[node][1].slice(4) : null;
        if (arch === null && node in S.techEdges) {
          const b0 = P['research.techEdge'];
          S.techEdges[node] = Math.max(P['pubEvent.edgeFloor'] * b0, S.techEdges[node] * (1 - P['pubEvent.rivalFade']));
        }
        if (arch !== null) {
          const n = S.nets[arch], b0 = P['research.archEdge'];
          n.edge = Math.max(P['pubEvent.edgeFloor'] * b0, n.edge * (1 - P['pubEvent.rivalFade']));
        }
      }
      S.events.splice(S.events.indexOf(e), 1);
      ms('first ' + e.type + ' event');
    }
    // overclock crash (live only; the idle bot never overclocks)
    if (strat.overclock && S.oc > 0 && S.t >= S.crashUntil && rng.crash() < pCrash(S.oc)) {
      S.crashUntil = S.t + P['oc.rebootSeconds']; S.crashes++;
      S.nets.forEach((n, i) => {
        if (n.stage === 'training') n.progress -= Math.min(P['oc.trainLossShare'] * n.progress, P['oc.trainLossCap'] * netSpec(P, i).demand);
      });
    }
    // deterministic unlocks
    if (!S.convUnlocked && S.runLife >= P['conv.unlockLifetime']) { S.convUnlocked = true; ms('converters unlock'); }
    S.nets.forEach((n) => { if (n.copies > 1 && uniq(n.copies, n.S) / n.copies < P['dedup.threshold']) ms('first dedup event'); });
    S.nets.forEach((n, i) => { if (n.copies >= 5 && i === 0) ms('Perceptron copy 5'); });
    inspiration(raw);
    if (on) bot(sp, cap);
    // distill
    if (S.firstPaperT !== null && S.t >= S.firstPaperT + P['distill.unlockDelay'] && S.unlockLife === null) {
      ms('Distill unlock'); S.unlockLife = S.life; S.unlockRunLife = S.runLife;
      S.unlockLogits = logitsFor(P, S.life) - S.logits;
    }
    if (S.unlockLife !== null && S.runLife >= P['sim.resetMult'] * S.unlockRunLife && !('lifetime 2x unlock' in S.ms)) {
      ms('lifetime 2x unlock'); S.twoXLogits = logitsFor(P, S.life) - S.logits; S.twoXLife = S.life;
    }
    if (S.t === 600 || S.t === 1200 || S.t === 1800 || S.t === 3600 || S.t === 5400) {
      S.samples[S.t] = { life: S.runLife, pressShare: raw > 0 ? pressTok / raw : 0, raw };
    }
    if (S.t % (opt.traceEvery ?? 300) === 0) {
      S.trace.push({ t: S.t, L: S.L, raw: Math.round(raw), press: Math.round(pressTok), net: Math.round(netOut), pool: Math.round(S.pool),
        money: Math.round(S.money), cap: +cap.toFixed(2), demand: +sp.demand.toFixed(2), copies: S.nets.map((n) => n.copies).join('/'),
        conv: CONV_KINDS.map((k) => S.run[k] + '/' + S.conv[k]).join(' '), R: Math.round(S.R), cites: +S.cites.toFixed(1), life: S.runLife,
        hw: S.hw.join('/'), ram: ramKB(), gigs: S.gigsDone, failed: S.gigsFailed });
    }
    if (opt.stop === 'firstPaper' && S.firstPaperT !== null) { stopAt = S.t; break; }
    if (opt.stop !== 'firstPaper' && 'lifetime 2x unlock' in S.ms && S.t >= (opt.minT ?? 0)) { stopAt = S.t; break; }
  }
  S.stopAt = stopAt;
  return S;
}

// ---------------------------------------------------------------- closed-form checks
function checks(P) {
  const out = [];
  let presses = 0, tokens = 0;
  for (let L = 1; L <= P['ladder.capLevel']; L++) { presses += ladderCost(P, L) / 2 ** (L - 1); tokens += ladderCost(P, L); }
  out.push(`ladder to L${P['ladder.capLevel']}: ${tokens} tokens, ${presses.toFixed(1)} presses = ${(presses / 6).toFixed(0)} s at 6/s, ${(presses / 3).toFixed(0)} s at 3/s, ${(presses / 2).toFixed(0)} s at 2/s`);
  const cc = [2, 10, 25, 50].map((n) => `copy ${n} ${Math.round(copyCost(P, 0, n - 1))}`);
  let tot = 0; for (let n = 2; n <= 25; n++) tot += copyCost(P, 0, n - 1);
  out.push(`Perceptron ${cc.join(', ')}; copies 2-25 total ${Math.round(tot)}`);
  let S0 = P['dedup.seeds']; const ev = [];
  for (let n = 2; n < 400 && ev.length < 7; n++) if (uniq(n, S0) / n < P['dedup.threshold']) { ev.push(n); S0 *= P['dedup.seedGrowth']; }
  out.push(`dedup events at copies ${ev.join(', ')}`);
  out.push('D16 per-job speed / machine share: ' + [1.25, 1.5, 2, 3].map((x) => `${x}x ${(100 / x ** 2).toFixed(0)}%/${(100 / x).toFixed(0)}%`).join(', '));
  out.push('gig unlock income and money ceiling: ' + [0, 1, 2, 3, 4, 5].map((k) => { const g = gigSpec(P, k); return `T${k + 1} ${Math.round(P['gig.unlockSlack'] * g.tok / g.dl)} T/s ${(g.pay / g.iv).toFixed(2)} $/s ${(g.pay / g.tok * 1000).toFixed(2)} $/kT`; }).join('; '));
  out.push('hardware $/MIPS: ' + [0, 1, 2, 3, 4].map((k) => `T${k + 1} $${Math.round(hwPrice(P, k, 0))} +${hwMips(P, k)} = ${Math.round(hwPrice(P, k, 0) / hwMips(P, k))}`).join(', '));
  out.push('nets (design+code, train s, T/s per MIPS): ' + [0, 1, 2, 3, 4].map((i) => { const s = netSpec(P, i); return `${NET_NAMES[i]} ${fmt(s.design + s.code)} ${Math.round(s.work / s.demand)} s ${Math.round(s.out / s.mips)}`; }).join(', '));
  for (const [name, a, b, k] of [['pubEvent', P['pubEvent.tmin'], P['pubEvent.tmax'], P['pubEvent.exponent']], ['insp', P['insp.tmin'], P['insp.tmax'], P['insp.exponent']]]) {
    let surv = 1, mean = 0; let p10 = null, p50 = null, p90 = null;
    for (let t = Math.floor(a) + 1; t <= b; t++) {
      const h = Math.pow((t - a) / (b - a), k); const pf = surv * h; mean += pf * t; surv *= 1 - h;
      const cdf = 1 - surv; if (p10 === null && cdf >= 0.1) p10 = t; if (p50 === null && cdf >= 0.5) p50 = t; if (p90 === null && cdf >= 0.9) p90 = t;
    }
    out.push(`${name} timer: mean ${(mean / 60).toFixed(2)} min, p10 ${(p10 / 60).toFixed(2)}, median ${(p50 / 60).toFixed(2)}, p90 ${(p90 / 60).toFixed(2)}`);
  }
  out.push('Logits vs lifetime: ' + [3e7, 6e7, 1.2e8, 5e8].map((l) => `${l.toExponential(1)} -> ${logitsFor(P, l)}`).join(', '));
  out.push(`research d1..d7: ${[1, 2, 3, 4, 5, 6, 7].map((d) => fmt(P['research.baseCost'] * P['research.depthRatio'] ** (d - 1))).join(', ')}`);
  return out;
}


function fmt(x) {
  if (x === undefined || x === null) return '-';
  const a = Math.abs(x);
  if (a >= 1e9) return (x / 1e9).toFixed(2) + 'G';
  if (a >= 1e6) return (x / 1e6).toFixed(2) + 'M';
  if (a >= 1e4) return (x / 1e3).toFixed(1) + 'k';
  return Math.round(x).toString();
}
