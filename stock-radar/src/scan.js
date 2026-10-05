import {
  volumeSurge, tradingValueTop, realtimeStockRank,
  expectedExecutionTop, foreignInstitutionTop, programNetBuyTop
} from "./kiwoom.js";
import { mergeCandidates, scoreCandidate, estimateTradePlan } from "./scorer.js";

const list=(payload,key)=>Array.isArray(payload?.[key])?payload[key]:[];
function kstHHMM(){
  const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Seoul",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date()).split(":");
  return Number(parts[0])*100+Number(parts[1]);
}
function marketDay(){
  const wd=new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Seoul",weekday:"short"}).format(new Date());
  return !["Sat","Sun"].includes(wd);
}
function fiSet(rows){
  const s=new Set();
  for(const r of rows){
    for(const k of ["for_netprps_stk_cd","orgn_netprps_stk_cd"]){
      const v=String(r?.[k]||"").replace(/^A/,"").trim();if(v)s.add(v);
    }
  }
  return s;
}
function symbolSet(rows){
  return new Set(rows.map(r=>String(r?.stk_cd||"").replace(/^A/,"").trim()).filter(Boolean));
}
export async function scanMarket({allowOutside=false}={}){
  const hhmm=kstHHMM();
  if(!allowOutside && (!marketDay()||hhmm<840||hhmm>1535)){
    return {status:"outside_market_window",generatedAt:new Date().toISOString(),signals:[]};
  }

  // 키움 국내 조회 TR은 계좌/토큰당 초당 5회 제한이므로 kiwoom.js에서 순차 rate-limit.
  const surge=await volumeSurge();
  const value=await tradingValueTop();
  const rank=await realtimeStockRank();
  const preopen=hhmm<905?await expectedExecutionTop():null;
  const fi=await foreignInstitutionTop();
  const pgK=await programNetBuyTop("P00101");
  const pgQ=await programNetBuyTop("P10102");

  const groups={
    volumeSurge:list(surge,"trde_qty_sdnin"),
    tradingValue:list(value,"trde_prica_upper"),
    realtimeRank:list(rank,"item_inq_rank"),
    preopen:list(preopen,"exp_cntr_flu_rt_upper")
  };
  const candidates=mergeCandidates(groups);
  const fiSymbols=fiSet(list(fi,"frgnr_orgn_trde_upper"));
  const programSymbols=new Set([
    ...symbolSet(list(pgK,"prm_netprps_upper_50")),
    ...symbolSet(list(pgQ,"prm_netprps_upper_50"))
  ]);

  const scored=candidates.map(c=>scoreCandidate(c,{
    foreignInstitutionPositive:fiSymbols.has(c.symbol),
    programPositive:programSymbols.has(c.symbol)
  })).sort((a,b)=>b.score-a.score);

  const threshold=Number(process.env.RADAR_ALERT_SCORE||70);
  const topN=Number(process.env.RADAR_TOP_N||40);
  return {
    status:"ok",
    provider:"Kiwoom REST API",
    generatedAt:new Date().toISOString(),
    threshold,
    signals:scored.filter(x=>x.score>=threshold).slice(0,10).map(x=>({...x,tradePlan:estimateTradePlan(x)})),
    watchlist:scored.slice(0,topN)
  };
}
