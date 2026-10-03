function num(v) {
  if (v === undefined || v === null || v === "") return 0;
  return Number(String(v).replaceAll(",", "")) || 0;
}

function first(row, keys) {
  for (const k of keys) if (row?.[k] !== undefined && row?.[k] !== "") return row[k];
  return undefined;
}

export function symbolOf(row) {
  return String(first(row, [
    "mksc_shrn_iscd", "stck_shrn_iscd", "stck_iscd", "pdno", "code"
  ]) || "").trim();
}

export function nameOf(row) {
  return String(first(row, ["hts_kor_isnm", "prdt_name", "name"]) || "").trim();
}

export function normalize(row, source, rank) {
  const price = num(first(row, ["stck_prpr", "prpr", "price"]));
  const volume = num(first(row, ["acml_vol", "acml_volum", "volume"]));
  const tradingValue = num(first(row, ["acml_tr_pbmn", "acml_tr_amt", "tr_pbmn"]));
  const changePct = num(first(row, ["prdy_ctrt", "prdy_vrss_rate", "change_rate"]));
  const volumeIncreasePct = num(first(row, ["vol_inrt", "prdy_smns_hour_acml_vol_rate", "volume_increase_rate"]));

  return {
    symbol: symbolOf(row),
    name: nameOf(row),
    source,
    rank,
    price,
    volume,
    tradingValue: tradingValue || price * volume,
    changePct,
    volumeIncreasePct,
    raw: row
  };
}

function mergeOne(map, item) {
  if (!item.symbol) return;
  const prev = map.get(item.symbol) || {
    symbol: item.symbol, name: item.name, price: 0, volume: 0, tradingValue: 0,
    changePct: 0, volumeIncreasePct: 0, sources: [], ranks: {}
  };
  prev.name ||= item.name;
  prev.price = Math.max(prev.price, item.price);
  prev.volume = Math.max(prev.volume, item.volume);
  prev.tradingValue = Math.max(prev.tradingValue, item.tradingValue);
  prev.changePct = item.changePct || prev.changePct;
  prev.volumeIncreasePct = Math.max(prev.volumeIncreasePct, item.volumeIncreasePct);
  prev.sources.push(item.source);
  prev.ranks[item.source] = item.rank;
  map.set(item.symbol, prev);
}

export function mergeCandidates(groups) {
  const map = new Map();
  for (const [source, rows] of Object.entries(groups)) {
    (rows || []).forEach((row, i) => mergeOne(map, normalize(row, source, i + 1)));
  }
  return [...map.values()];
}

export function scoreCandidate(c, extras = {}) {
  let score = 0;
  const reasons = [];
  const tradingValueEok = c.tradingValue / 100_000_000;

  if (tradingValueEok >= 1000) { score += 25; reasons.push("거래대금 1000억+"); }
  else if (tradingValueEok >= 500) { score += 18; reasons.push("거래대금 500억+"); }
  else if (tradingValueEok >= 300) { score += 10; reasons.push("거래대금 300억+"); }

  if (c.volumeIncreasePct >= 200) { score += 20; reasons.push("거래량 급증"); }
  else if (c.volumeIncreasePct >= 100) { score += 12; reasons.push("거래량 증가"); }

  if (c.changePct >= 2 && c.changePct <= 7) { score += 18; reasons.push("과열 전 +2~7%"); }
  else if (c.changePct > 0 && c.changePct < 2) { score += 8; reasons.push("초기 상승"); }
  else if (c.changePct >= 15) { score -= 25; reasons.push("과열 감점"); }
  else if (c.changePct >= 10) { score -= 10; reasons.push("추격위험 감점"); }

  const ir = c.ranks.interest;
  if (ir && ir <= 10) { score += 12; reasons.push("관심등록 상위10"); }
  else if (ir && ir <= 20) { score += 7; reasons.push("관심등록 상위20"); }

  const vr = Math.min(c.ranks.volumeIncrease || 999, c.ranks.tradingValue || 999);
  if (vr <= 10) { score += 10; reasons.push("거래량/대금 상위10"); }
  else if (vr <= 30) { score += 5; reasons.push("거래량/대금 상위30"); }

  if (extras.foreignInstitutionPositive) { score += 12; reasons.push("외인·기관 순매수 상위"); }
  if (extras.vwap && c.price && c.price >= extras.vwap) { score += 12; reasons.push("VWAP 위"); }
  if (extras.programNetBuy > 0) { score += 8; reasons.push("프로그램 순매수"); }

  return {
    ...c,
    score,
    reasons,
    vwap: extras.vwap || 0,
    programNetBuy: extras.programNetBuy || 0,
    foreignInstitutionPositive: !!extras.foreignInstitutionPositive
  };
}

export function estimateTradePlan(c) {
  const p = c.price || 0;
  if (!p) return {};
  const stopPct = c.score >= 85 ? 0.018 : 0.022;
  const target1Pct = c.score >= 85 ? 0.04 : 0.03;
  const target2Pct = c.score >= 85 ? 0.065 : 0.05;
  return {
    entryMin: Math.round(p * 0.995),
    entryMax: Math.round(p * 1.005),
    target1: Math.round(p * (1 + target1Pct)),
    target2: Math.round(p * (1 + target2Pct)),
    stop: Math.round(p * (1 - stopPct)),
    target1Pct: target1Pct * 100,
    target2Pct: target2Pct * 100,
    stopPct: -stopPct * 100
  };
}
