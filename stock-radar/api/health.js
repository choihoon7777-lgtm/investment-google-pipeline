export default function handler(req,res){
  res.status(200).json({
    ok:true,service:"kr-stock-radar-kiwoom",
    hasKiwoomKey:Boolean(process.env.KIWOOM_APP_KEY&&process.env.KIWOOM_APP_SECRET),
    mode:process.env.KIWOOM_MODE||"real",
    hasAlertWebhook:Boolean(process.env.ALERT_WEBHOOK_URL),
    note:"Kiwoom requires an allowed source IP; run on a fixed-egress host.",
    now:new Date().toISOString()
  });
}
