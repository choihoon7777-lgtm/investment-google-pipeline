import { scanMarket } from "../src/scan.js";
import { KiwoomRealtimeRadar } from "../src/realtime.js";

async function sendWebhook(payload){
  const url=process.env.ALERT_WEBHOOK_URL;if(!url)return;
  const headers={"content-type":"application/json"};
  if(process.env.ALERT_WEBHOOK_BEARER)headers.authorization=`Bearer ${process.env.ALERT_WEBHOOK_BEARER}`;
  await fetch(url,{method:"POST",headers,body:JSON.stringify(payload)}).catch(console.error);
}

let latestNames=new Map();
const radar=new KiwoomRealtimeRadar({
  onSignal:async s=>{
    const payload={
      type:"KIWOOM_INTRADAY_SIGNAL",
      at:new Date().toISOString(),
      symbol:s.symbol,name:latestNames.get(s.symbol)||"",
      score:s.score,reasons:s.reasons,
      price:s.price,changePct:s.changePct,
      sameTimeVolumePct:s.sameTimeVolumePct,
      executionStrength:s.executionStrength,
      avgPrice:s.avgPrice,
      programNetBuyAmount:s.programNetBuyAmount
    };
    console.log("[SIGNAL]",JSON.stringify(payload));
    await sendWebhook(payload);
  }
});

async function refreshWatchlist(){
  const result=await scanMarket({allowOutside:false});
  if(result.status!=="ok")return result;
  latestNames=new Map(result.watchlist.map(x=>[x.symbol,x.name]));
  const symbols=result.watchlist.map(x=>x.symbol).filter(Boolean).slice(0,200);
  if(!radar.ws) await radar.connect(symbols);
  else radar.register(symbols);
  for(const s of result.signals) console.log("[SCAN]",s.symbol,s.name,s.score,s.reasons.join(", "));
  return result;
}

await refreshWatchlist();
setInterval(()=>refreshWatchlist().catch(console.error),Number(process.env.RADAR_WATCHLIST_REFRESH_MS||30000));
process.on("SIGINT",()=>{radar.close();process.exit(0);});
