const REAL_BASE = "https://api.kiwoom.com";
const DEMO_BASE = "https://mockapi.kiwoom.com";

let tokenCache = { token: null, expiresAt: 0 };
let lastRequestAt = 0;

function env(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
}

function baseUrl() {
  if (process.env.KIWOOM_BASE_URL) return process.env.KIWOOM_BASE_URL.replace(/\/$/, "");
  return (process.env.KIWOOM_MODE || "real") === "demo" ? DEMO_BASE : REAL_BASE;
}

export function wsBaseUrl() {
  if (process.env.KIWOOM_WS_URL) return process.env.KIWOOM_WS_URL.replace(/\/$/, "");
  return (process.env.KIWOOM_MODE || "real") === "demo"
    ? "wss://mockapi.kiwoom.com:10000"
    : "wss://api.kiwoom.com:10000";
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function rateLimit() {
  const minGap = Number(process.env.KIWOOM_MIN_REQUEST_GAP_MS || 220);
  const wait = Math.max(0, minGap - (Date.now() - lastRequestAt));
  if (wait) await sleep(wait);
  lastRequestAt = Date.now();
}

export async function getAccessToken(force = false) {
  if (!force && tokenCache.token && Date.now() < tokenCache.expiresAt - 10 * 60_000) {
    return tokenCache.token;
  }
  if (process.env.KIWOOM_ACCESS_TOKEN && !force) return process.env.KIWOOM_ACCESS_TOKEN;

  const response = await fetch(`${baseUrl()}/oauth2/token`, {
    method: "POST",
    headers: { "content-type": "application/json;charset=UTF-8" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      appkey: env("KIWOOM_APP_KEY"),
      secretkey: env("KIWOOM_APP_SECRET")
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.return_code !== 0 || !data.token) {
    throw new Error(`Kiwoom token failed: ${response.status} ${JSON.stringify(data)}`);
  }

  let expiresAt = Date.now() + 23 * 60 * 60_000;
  if (data.expires_dt && /^\d{14}$/.test(String(data.expires_dt))) {
    const s = String(data.expires_dt);
    const iso = `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}T${s.slice(8,10)}:${s.slice(10,12)}:${s.slice(12,14)}+09:00`;
    const parsed = Date.parse(iso);
    if (Number.isFinite(parsed)) expiresAt = parsed;
  }
  tokenCache = { token: data.token, expiresAt };
  return data.token;
}

export async function kiwoomPost(apiId, path, body, retry = true) {
  await rateLimit();
  const token = await getAccessToken();
  const response = await fetch(`${baseUrl()}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json;charset=UTF-8",
      "api-id": apiId,
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body || {}),
    cache: "no-store"
  });
  const data = await response.json().catch(() => ({}));
  const code = Number(data.return_code ?? 0);

  if (retry && (response.status === 401 || code === 8005 || /8005/.test(String(data.return_msg || "")))) {
    await getAccessToken(true);
    return kiwoomPost(apiId, path, body, false);
  }
  if (!response.ok || code !== 0) {
    throw new Error(`Kiwoom API ${apiId} failed: ${response.status} ${JSON.stringify(data)}`);
  }
  return data;
}

export const volumeSurge = () => kiwoomPost("ka10023", "/api/dostk/rkinfo", {
  mrkt_tp: "000",
  sort_tp: "2",
  tm_tp: "1",
  trde_qty_tp: "5",
  stk_cnd: "20",
  pric_tp: "8",
  stex_tp: "3",
  tm: "1"
});

export const tradingValueTop = () => kiwoomPost("ka10032", "/api/dostk/rkinfo", {
  mrkt_tp: "000",
  mang_stk_incls: "0",
  stex_tp: "3"
});

export const realtimeStockRank = () => kiwoomPost("ka00198", "/api/dostk/stkinfo", {
  qry_tp: "5"
});

export const expectedExecutionTop = () => kiwoomPost("ka10029", "/api/dostk/rkinfo", {
  mrkt_tp: "000",
  sort_tp: "1",
  trde_qty_cnd: "5",
  stk_cnd: "4",
  crd_cnd: "0",
  pric_cnd: "8",
  stex_tp: "3"
});

export const foreignInstitutionTop = () => kiwoomPost("ka90009", "/api/dostk/rkinfo", {
  mrkt_tp: "000",
  amt_qty_tp: "1",
  qry_dt_tp: "0",
  stex_tp: "3"
});

export const programNetBuyTop = (marketCode) => kiwoomPost("ka90003", "/api/dostk/stkinfo", {
  trde_upper_tp: "2",
  amt_qty_tp: "1",
  mrkt_tp: marketCode,
  stex_tp: "3"
});
