import { scanMarket } from "../src/scan.js";

async function notify(result) {
  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url || !result.signals?.length) return { sent: false };

  const headers = { "content-type": "application/json" };
  if (process.env.ALERT_WEBHOOK_BEARER) {
    headers.authorization = `Bearer ${process.env.ALERT_WEBHOOK_BEARER}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      type: "KR_STOCK_RADAR_SIGNAL",
      generatedAt: result.generatedAt,
      signals: result.signals.slice(0, 5)
    })
  });
  return { sent: response.ok, status: response.status };
}

export default async function handler(req, res) {
  try {
    if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ ok: false, error: "unauthorized" });
    }
    const result = await scanMarket();
    const notification = await notify(result);
    return res.status(200).json({ ok: true, ...result, notification });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      ok: false,
      error: String(error?.message || error),
      generatedAt: new Date().toISOString()
    });
  }
}
