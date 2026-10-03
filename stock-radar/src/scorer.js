function num(v) {
  if (v === undefined || v === null || v === "") return 0;
  const n = Number(String(v).replaceAll(",", "").replace(/^\+/, ""));
  return Number.isFinite(n) ? n : 0;
}
function absNum(v) { return Math.abs(num(v)); }
function first(row, keys) {
  for (const k of keys) if (row?.[k] !== undefined && row?.[k] !== "") return row[k];
  return undefined;
}
export function symbolOf(row) {
  return String(first(row, ["stk_cd","mksc_shrn_iscd","stck_shrn_iscd","code"]) || "").replace(/^A/,"").trim();
}
export function nameOf(row) {
  return String(first(row, ["stk_nm","hts_kor_isnm","name"]) || "").trim();
}
export function normalize(row, source, rank) {
  const price = absNum(first(row, ["cur_prc","exp_cntr_pric","past_curr_prc","stck_prpr","price"]));
  const volume = absNum(first(row, ["now_trde_qty","acc_trde_qty","exp_cntr_qty","acml_vol","volume"]));
  const changePct = num(first(row, ["flu_rt","base_comp_chgr","prdy_ctrt","change_rate"]));
  const volumeIncreasePct = num(first(row, ["sdnin_rt","vol_inrt","volume_increase_rate"]));
  return {
    symbol: symbolOf(row),
    name: nameOf(row),
    source, rank, price, volume,
    tradingValue: price * volume,
    changePct,
    volumeIncreasePct,
    attentionMove: num(first(row, ["rank_chg"])),
    raw: row
  };
}
function mergeOne(map, item) {
  if (!item.symbol) return;
  const prev = map.get(item.symbol) || {
    symbol:item.symbol,name:item.name,price:0,volume:0,tradingValue:0,
    changePct:0,volumeIncreasePct:0,attentionMove:0,sources:[],ranks:{}
  };
  prev.name ||= item.name;
  if (item.price) prev.price = item.price;
  prev.volume = Math.max(prev.volume,item.volume);
  prev.tradingValue = Math.max(prev.tradingValue,item.tradingValue);
  if (item.changePct) prev.changePct = item.changePct;
  prev.volumeIncreasePct = Math.max(prev.volumeIncreasePct,item.volumeIncreasePct);
  prev.attentionMove = item.attentionMove || prev.attentionMove;
  prev.sources.push(item.source);
  prev.ranks[item.source]=item.rank;
  map.set(item.symbol,prev);
}
export function mergeCandidates(groups) {
  const map=new Map();
  for (const [source,rows] of Object.entries(groups)) (rows||[]).forEach((row,i)=>mergeOne(map,normalize(row,source,i+1)));
  return [...map.values()];
}
export function scoreCandidate(c, extras={}) {
  let score=0; const reasons=[];
  const eok=c.tradingValue/100_000_000;
  if(eok>=1000){score+=25;reasons.push("추정 거래대금 1000억+");}
  else if(eok>=500){score+=18;reasons.push("추정 거래대금 500억+");}
  else if(eok>=300){score+=10;reasons.push("추정 거래대금 300억+");}
  if(c.volumeIncreasePct>=300){score+=22;reasons.push("거래량 급증 300%+");}
  else if(c.volumeIncreasePct>=200){score+=18;reasons.push("거래량 급증 200%+");}
  else if(c.volumeIncreasePct>=100){score+=10;reasons.push("거래량 증가");}
  if(c.changePct>=2&&c.changePct<=7){score+=18;reasons.push("과열 전 +2~7%");}
  else if(c.changePct>0&&c.changePct<2){score+=8;reasons.push("초기 상승");}
  else if(c.changePct>=15){score-=25;reasons.push("과열 감점");}
  else if(c.changePct>=10){score-=10;reasons.push("추격위험 감점");}
  const rr=c.ranks.realtimeRank;
  if(rr&&rr<=10){score+=14;reasons.push("실시간 조회순위 상위10");}
  else if(rr&&rr<=20){score+=8;reasons.push("실시간 조회순위 상위20");}
  if(c.attentionMove>0){score+=Math.min(8,c.attentionMove);reasons.push("관심순위 상승");}
  const vr=Math.min(c.ranks.volumeSurge||999,c.ranks.tradingValue||999);
  if(vr<=10){score+=12;reasons.push("거래량/대금 상위10");}
  else if(vr<=30){score+=6;reasons.push("거래량/대금 상위30");}
  if(extras.foreignInstitutionPositive){score+=12;reasons.push("외인·기관 순매수 상위");}
  if(extras.programPositive){score+=10;reasons.push("프로그램 순매수 상위");}
  return {...c,score,reasons,...extras};
}
export function estimateTradePlan(c){
  const p=c.price||0;if(!p)return{};
  const stopPct=c.score>=85?0.018:0.022;
  const t1=c.score>=85?0.04:0.03, t2=c.score>=85?0.065:0.05;
  return {
    entryMin:Math.round(p*.995),entryMax:Math.round(p*1.005),
    target1:Math.round(p*(1+t1)),target2:Math.round(p*(1+t2)),
    stop:Math.round(p*(1-stopPct)),
    target1Pct:t1*100,target2Pct:t2*100,stopPct:-stopPct*100
  };
}
