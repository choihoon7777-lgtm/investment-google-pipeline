import WebSocket from "ws";
import { getAccessToken, wsBaseUrl } from "./kiwoom.js";

const abs=n=>Math.abs(Number(String(n??"0").replaceAll(",",""))||0);
const num=n=>Number(String(n??"0").replaceAll(",","").replace(/^\+/,""))||0;

export class KiwoomRealtimeRadar {
  constructor({onEvent,onSignal}={}){
    this.ws=null;this.onEvent=onEvent||(()=>{});this.onSignal=onSignal||(()=>{});
    this.state=new Map();this.lastAlert=new Map();this.symbols=[];
  }
  async connect(symbols){
    this.symbols=[...new Set(symbols)].slice(0,200);
    const token=await getAccessToken();
    this.ws=new WebSocket(`${wsBaseUrl()}/api/dostk/websocket`);
    await new Promise((resolve,reject)=>{
      this.ws.once("open",resolve);this.ws.once("error",reject);
    });
    this.ws.send(JSON.stringify({trnm:"LOGIN",token}));
    this.ws.on("message",raw=>this.#message(raw));
  }
  register(symbols=this.symbols){
    this.symbols=[...new Set(symbols)].slice(0,200);
    if(!this.ws||this.ws.readyState!==WebSocket.OPEN)return;
    this.ws.send(JSON.stringify({
      trnm:"REG",grp_no:"1",refresh:"1",
      data:[{item:this.symbols,type:["0B","0w"]}]
    }));
  }
  #message(raw){
    let msg;try{msg=JSON.parse(raw.toString())}catch{return;}
    if(String(msg?.trnm||"").toUpperCase()==="PING"){
      this.ws?.send(JSON.stringify(msg));return;
    }
    if(String(msg?.trnm||"").toUpperCase()==="LOGIN"){
      if(Number(msg.return_code||0)!==0) throw new Error(msg.return_msg||"Kiwoom websocket login failed");
      this.register();return;
    }
    if(String(msg?.trnm||"").toUpperCase()!=="REAL"||!Array.isArray(msg.data))return;
    for(const d of msg.data){
      const symbol=String(d.item||"").replace(/^A/,"");
      const v=d.values||{};
      const s=this.state.get(symbol)||{symbol};
      if(String(d.type)==="0B"){
        s.price=abs(v["10"]);s.changePct=num(v["12"]);s.volume=abs(v["13"]);
        s.tradingValue=abs(v["14"]);s.volumeVsPrevPct=num(v["30"]);
        s.executionStrength=num(v["228"]);s.sameTimeVolumePct=num(v["851"]);
        s.instantTradingValue=abs(v["1313"]);s.avgPrice=abs(v["620"]);
        s.high=abs(v["17"]);s.low=abs(v["18"]);
      }
      if(String(d.type)==="0w"){
        s.programNetBuyQty=num(v["210"]);s.programNetBuyAmount=num(v["212"]);
      }
      s.updatedAt=Date.now();this.state.set(symbol,s);this.onEvent(s);
      const score=this.#score(s);
      if(score.score>=Number(process.env.RADAR_REALTIME_ALERT_SCORE||65))this.#emit({...s,...score});
    }
  }
  #score(s){
    let score=0;const reasons=[];
    if(s.changePct>=2&&s.changePct<=7){score+=20;reasons.push("주가 +2~7%");}
    else if(s.changePct>=15){score-=30;reasons.push("과열");}
    if(s.sameTimeVolumePct>=300){score+=25;reasons.push("동시간 거래량 300%+");}
    else if(s.sameTimeVolumePct>=200){score+=18;reasons.push("동시간 거래량 200%+");}
    if(s.executionStrength>=130){score+=15;reasons.push("체결강도 130+");}
    else if(s.executionStrength>=115){score+=10;reasons.push("체결강도 115+");}
    if(s.avgPrice&&s.price>=s.avgPrice){score+=12;reasons.push("당일 평균가 위");}
    if(s.programNetBuyAmount>0){score+=12;reasons.push("프로그램 순매수");}
    if(s.high&&s.price>=s.high*0.985){score+=8;reasons.push("당일 고가 근처");}
    return{score,reasons};
  }
  #emit(signal){
    const last=this.lastAlert.get(signal.symbol)||0;
    const cooldown=Number(process.env.RADAR_ALERT_COOLDOWN_MS||600000);
    if(Date.now()-last<cooldown)return;
    this.lastAlert.set(signal.symbol,Date.now());this.onSignal(signal);
  }
  close(){this.ws?.close();}
}
