export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    service: "kr-stock-radar",
    hasKisKey: Boolean(process.env.KIS_APP_KEY && process.env.KIS_APP_SECRET),
    hasAlertWebhook: Boolean(process.env.ALERT_WEBHOOK_URL),
    now: new Date().toISOString()
  });
}
