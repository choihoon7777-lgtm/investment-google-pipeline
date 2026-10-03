import {
  volumeRank, fluctuationRank, topInterest,
  foreignInstitutionTop, inquirePrice, programTrade
} from "./kis.js";
import { mergeCandidates, scoreCandidate, estimateTradePlan, symbolOf } from "./scorer.js";

function rows(payload) {
  if (!payload) return [];
  if (Array.isArray(payload.output)) return payload.output;
  if (Array.isArray(payload.output1)) return payload.output1;
  return [];
}

function isKoreanMarketWindow(now = new Date()) {
  const kst = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const day = kst.getDay();
  const hhmm = kst.getHours() * 100 + kst.getMinutes();
  return day >= 1 && day <= 5 && hhmm >= 840 && hhmm <= 1535;
}

function parseVwap(pricePayload) {
  const r = pricePayload?.output || {};
  const vol = Number(r.acml_vol || 0);
  const value = Number(r.acml_tr_pbmn || 0);
  return vol > 0 && value > 0 ? value / vol : 0;
}

function parseProgramNetBuy(payload) {
  const list = rows(payload);
  if (!list.length) return 0;
  const r = list[0];
  for (const k of ["whol_smtn_ntby_qty", "ntby_qty", "prgm_ntby_qty", "total_net_buy_qty"]) {
    const v = Number(String(r?.[k] ?? "").replaceAll(",", ""));
    if (Number.isFinite(v) && v !== 0) return v;
  }
  return 0;
}

export async function scanMarket() {
  if (!isKoreanMarketWindow()) {
    return { status: "outside_market_window", generatedAt: new Date().toISOString(), signals: [] };
  }

  const market = process.env.RADAR_MARKET || "J";
  const [volumeIncrease, tradingValue, fluctuation, interest, fi] = await Promise.all([
    volumeRank("1", market),
    volumeRank("3", market),
    fluctuationRank(market),
    topInterest("J"),
    foreignInstitutionTop()
  ]);

  const candidates = mergeCandidates({
    volumeIncrease: rows(volumeIncrease),
    tradingValue: rows(tradingValue),
    fluctuation: rows(fluctuation),
    interest: rows(interest)
  });

  const fiSymbols = new Set(rows(fi).map(symbolOf).filter(Boolean));
  const topN = Number(process.env.RADAR_TOP_N || 12);
  const enrichN = Number(process.env.RADAR_ENRICH_N || 8);

  const prelim = candidates
    .map(c => scoreCandidate(c, { foreignInstitutionPositive: fiSymbols.has(c.symbol) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);

  const enriched = [];
  for (const c of prelim.slice(0, enrichN)) {
    try {
      const [price, program] = await Promise.all([
        inquirePrice(c.symbol, market),
        programTrade(c.symbol, market)
      ]);
      const pr = price.output || {};
      const latest = {
        ...c,
        price: Number(pr.stck_prpr || c.price || 0),
        changePct: Number(pr.prdy_ctrt || c.changePct || 0),
        volume: Number(pr.acml_vol || c.volume || 0),
        tradingValue: Number(pr.acml_tr_pbmn || c.tradingValue || 0)
      };
      enriched.push(scoreCandidate(latest, {
        foreignInstitutionPositive: fiSymbols.has(c.symbol),
        vwap: parseVwap(price),
        programNetBuy: parseProgramNetBuy(program)
      }));
    } catch (e) {
      enriched.push({ ...c, enrichmentError: String(e?.message || e) });
    }
  }

  enriched.push(...prelim.slice(enrichN));

  const threshold = Number(process.env.RADAR_ALERT_SCORE || 70);
  const signals = enriched
    .sort((a, b) => b.score - a.score)
    .filter(x => x.score >= threshold)
    .map(x => ({ ...x, tradePlan: estimateTradePlan(x) }));

  return {
    status: "ok",
    generatedAt: new Date().toISOString(),
    market,
    threshold,
    signals,
    watchlist: enriched.slice(0, topN)
  };
}
