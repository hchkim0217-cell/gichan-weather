// /api/weather - 기상청 단기·초단기·중기예보 통합 프록시
// 단기/초단기: typ02 JSON 그대로 전달
// 중기예보: typ01 raw 텍스트 파싱 → typ02 JSON 호환 형식으로 변환

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const KEY = process.env.KMA_API_KEY;
  const { type, nx, ny, base_date, base_time, regId, tmFc } = req.query;

  // 단기예보 / 초단기예보: typ02 JSON 그대로
  if (type === 'short' || type === 'ultra_short') {
    const path = type === 'short'
      ? 'VilageFcstInfoService_2.0/getVilageFcst'
      : 'VilageFcstInfoService_2.0/getUltraSrtFcst';
    // 단기예보는 3일차까지 커버해야 하므로 여유 있게 받는다 (1000이면 마지막 날이 잘릴 수 있음)
    const numRows = type === 'short' ? 1300 : 300;
    const url = `https://apihub.kma.go.kr/api/typ02/openApi/${path}`
      + `?pageNo=1&numOfRows=${numRows}&dataType=JSON`
      + `&base_date=${base_date}&base_time=${base_time}`
      + `&nx=${nx}&ny=${ny}&authKey=${KEY}`;
    try {
      const r = await fetch(url);
      const data = await r.json();
      return res.status(200).json(data);
    } catch (e) {
      return res.status(500).json({ error: e.message, type });
    }
  }

  // 중기육상예보 / 중기기온예보: typ02 JSON 그대로 (권장)
  // 육상은 광역 구역코드(11B00000 등), 기온은 도시코드(11B10101 등)로 regId 체계가 다르다
  if (type === 'mid_land2' || type === 'mid_temp2') {
    const svc = type === 'mid_land2' ? 'getMidLandFcst' : 'getMidTa';
    const url = `https://apihub.kma.go.kr/api/typ02/openApi/MidFcstInfoService/${svc}`
      + `?pageNo=1&numOfRows=10&dataType=JSON&regId=${regId}&tmFc=${tmFc}&authKey=${KEY}`;
    try {
      const r = await fetch(url);
      const text = await r.text();
      try {
        return res.status(200).json(JSON.parse(text));
      } catch {
        return res.status(200).json({ error: 'JSON 아님', raw: text.substring(0, 180), type });
      }
    } catch (e) {
      return res.status(500).json({ error: e.message, type });
    }
  }

  // 중기예보 typ01 raw → 변환 (구버전 호환용. 파싱이 불안정해 mid_land2/mid_temp2 사용 권장)
  if (type === 'mid_land' || type === 'mid_temp') {
    return await handleMidTyp01(res, KEY, type, regId, tmFc);
  }

  return res.status(400).json({ error: `Unknown type: ${type}` });
}

async function handleMidTyp01(res, KEY, type, regId, tmFc) {
  const phpFile = type === 'mid_land' ? 'fct_afs_wl.php' : 'fct_afs_wc.php';
  const tmfc10 = (tmFc || '').substring(0, 10);

  const url = `https://apihub.kma.go.kr/api/typ01/url/${phpFile}`
    + `?reg=${regId}&tmfc1=${tmfc10}&tmfc2=${tmfc10}&disp=0&help=0&authKey=${KEY}`;

  try {
    const r = await fetch(url);
    // typ01 텍스트는 EUC-KR로 내려온다. r.text()로 읽으면 하늘상태(wf) 한글이 깨진다.
    const buf = await r.arrayBuffer();
    let text;
    try {
      text = new TextDecoder('euc-kr').decode(buf);
      // 디코더가 euc-kr을 모르면 치환문자가 섞인다 → UTF-8로 되돌린다
      if (text.indexOf('\uFFFD') >= 0) text = new TextDecoder('utf-8').decode(buf);
    } catch {
      text = new TextDecoder('utf-8').decode(buf);
    }

    const trimmed = text.trim();
    if (trimmed.startsWith('{')) {
      try {
        const errJson = JSON.parse(trimmed);
        return res.status(200).json(errJson);
      } catch { /* 무시 */ }
    }

    const baseDate = (tmFc || '').substring(0, 8);
    const item = type === 'mid_land'
      ? parseMidLand(text, regId, baseDate)
      : parseMidTemp(text, regId, baseDate);

    return res.status(200).json({
      response: {
        header: { resultCode: '00', resultMsg: 'NORMAL_SERVICE' },
        body: { items: { item: [item] }, totalCount: 1, numOfRows: 1, pageNo: 1 }
      }
    });
  } catch (e) {
    return res.status(500).json({ error: e.message, type });
  }
}

function dayDiff(baseYmd, efYmd) {
  const b = new Date(+baseYmd.substring(0, 4), +baseYmd.substring(4, 6) - 1, +baseYmd.substring(6, 8));
  const e = new Date(+efYmd.substring(0, 4), +efYmd.substring(4, 6) - 1, +efYmd.substring(6, 8));
  return Math.round((e - b) / 86400000);
}

function parseMidLand(text, regId, baseDate) {
  const result = { regId };
  const lines = text.split('\n');

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith('7777') || line.includes('START7777') || line.includes('END7777')) continue;

    const m = line.match(/^(\S+)\s+(\d{12})\s+(\d{12})\s+(A0[12])\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+"([^"]*)"\s+(\S+)/);
    if (!m) continue;

    const [, lineRegId, , tm_ef, mod, , , , , , wf, rn_st] = m;
    if (lineRegId !== regId) continue;
    if (mod !== 'A02') continue;

    const efDate = tm_ef.substring(0, 8);
    const efHour = parseInt(tm_ef.substring(8, 10));
    const dayOff = dayDiff(baseDate, efDate);
    if (dayOff < 3 || dayOff > 10) continue;

    const period = efHour < 12 ? 'Am' : 'Pm';
    result[`wf${dayOff}${period}`] = wf;
    const rn = parseInt(rn_st);
    result[`rnSt${dayOff}${period}`] = (isNaN(rn) || rn < 0) ? 0 : rn;
  }

  return result;
}

function parseMidTemp(text, regId, baseDate) {
  const result = { regId };
  const lines = text.split('\n');

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith('7777') || line.includes('START7777') || line.includes('END7777')) continue;

    const cols = line.split(/\s+/);
    if (cols.length < 8) continue;
    if (cols[0] !== regId) continue;
    if (cols[3] !== 'A01') continue;

    const tm_ef = cols[2];
    const efDate = tm_ef.substring(0, 8);
    const dayOff = dayDiff(baseDate, efDate);
    if (dayOff < 3 || dayOff > 10) continue;

    const min = parseFloat(cols[6]);
    const max = parseFloat(cols[7]);
    if (!isNaN(min) && min > -900) result[`taMin${dayOff}`] = min;
    if (!isNaN(max) && max > -900) result[`taMax${dayOff}`] = max;
  }

  return result;
}
