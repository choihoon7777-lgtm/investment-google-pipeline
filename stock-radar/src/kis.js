const BASE_URL = process.env.KIS_BASE_URL || "https://openapi.koreainvestment.com:9443";

let cachedToken = null;
let tokenExpiresAt = 0;

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export async function getAccessToken() {
  if (process.env.KIS_ACCESS_TOKEN) return process.env.KIS_ACCESS_TOKEN;
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) return cachedToken;

  const appkey = required("KIS_APP_KEY");
  const appsecret = required("KIS_APP_SECRET");
  const response = await fetch(`${BASE_URL}/oauth2/tokenP`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      appkey,
      appsecret
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    throw new Error(`KIS token failed: ${response.status} ${JSON.stringify(data)}`);
  }

  cachedToken = data.access_token;
  const expiresIn = Number(data.expires_in || 60 * 60 * 20);
  tokenExpiresAt = Date.now() + expiresIn * 1000;
  return cachedToken;
}

export async function kisGet(path, trId, params = {}) {
  const token = await getAccessToken();
  const appkey = required("KIS_APP_KEY");
  const appsecret = required("KIS_APP_SECRET");
  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${token}`,
      appkey,
      appsecret,
      tr_id: trId,
      custtype: "P"
    },
    cache: "no-store"
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || (data.rt_cd && data.rt_cd !== "0")) {
    throw new Error(`KIS GET failed ${path}: ${response.status} ${JSON.stringify(data)}`);
  }
  return data;
}

export async function volumeRank(sort = "1", market = "J") {
  return kisGet(
    "/uapi/domestic-stock/v1/quotations/volume-rank",
    "FHPST01710000",
    {
      FID_COND_MRKT_DIV_CODE: market,
      FID_COND_SCR_DIV_CODE: "20171",
      FID_INPUT_ISCD: "0000",
      FID_DIV_CLS_CODE: "1",
      FID_BLNG_CLS_CODE: sort,
      FID_TRGT_CLS_CODE: "0",
      FID_TRGT_EXLS_CLS_CODE: "1111111111",
      FID_INPUT_PRICE_1: "1000",
      FID_INPUT_PRICE_2: "1000000",
      FID_VOL_CNT: "100000",
      FID_INPUT_DATE_1: ""
    }
  );
}

export async function fluctuationRank(market = "J") {
  return kisGet(
    "/uapi/domestic-stock/v1/ranking/fluctuation",
    "FHPST01700000",
    {
      fid_cond_mrkt_div_code: market,
      fid_cond_scr_div_code: "20170",
      fid_input_iscd: "0000",
      fid_rank_sort_cls_code: "0000",
      fid_input_cnt_1: "30",
      fid_prc_cls_code: "0",
      fid_input_price_1: "1000",
      fid_input_price_2: "1000000",
      fid_vol_cnt: "100000",
      fid_trgt_cls_code: "0",
      fid_trgt_exls_cls_code: "1111111111",
      fid_div_cls_code: "0",
      fid_rsfl_rate1: "0",
      fid_rsfl_rate2: "15"
    }
  );
}

export async function topInterest(market = "J") {
  return kisGet(
    "/uapi/domestic-stock/v1/ranking/top-interest-stock",
    "FHPST01800000",
    {
      fid_input_iscd_2: "000000",
      fid_cond_mrkt_div_code: market,
      fid_cond_scr_div_code: "20180",
      fid_input_iscd: "0000",
      fid_trgt_cls_code: "0",
      fid_trgt_exls_cls_code: "0",
      fid_input_price_1: "1000",
      fid_input_price_2: "1000000",
      fid_vol_cnt: "100000",
      fid_div_cls_code: "0",
      fid_input_cnt_1: "1"
    }
  );
}

export async function foreignInstitutionTop() {
  return kisGet(
    "/uapi/domestic-stock/v1/quotations/foreign-institution-total",
    "FHPTJ04400000",
    {
      FID_COND_MRKT_DIV_CODE: "V",
      FID_COND_SCR_DIV_CODE: "16449",
      FID_INPUT_ISCD: "0000",
      FID_DIV_CLS_CODE: "1",
      FID_RANK_SORT_CLS_CODE: "0",
      FID_ETC_CLS_CODE: "0"
    }
  );
}

export async function inquirePrice(symbol, market = "J") {
  return kisGet(
    "/uapi/domestic-stock/v1/quotations/inquire-price",
    "FHKST01010100",
    {
      FID_COND_MRKT_DIV_CODE: market,
      FID_INPUT_ISCD: symbol
    }
  );
}

export async function programTrade(symbol, market = "J") {
  return kisGet(
    "/uapi/domestic-stock/v1/quotations/program-trade-by-stock",
    "FHPPG04650101",
    {
      FID_COND_MRKT_DIV_CODE: market,
      FID_INPUT_ISCD: symbol
    }
  );
}
