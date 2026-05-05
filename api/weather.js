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
    const numRows = type === 'short' ? 1000 : 300;
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

  // 중기육상예보 / 중기기온예보: typ01 raw → 변환
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
    const text = await r.text();

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
