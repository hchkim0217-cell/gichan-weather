export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const KEY = process.env.KMA_API_KEY;
  const { type, nx, ny, base_date, base_time, regId, tmFc, region } = req.query;

  // 🌟 [신규 추가] 과거 강수량(어제 내린 비) 가져오기
  if (type === 'past_rain') {
    const stnMap = {
      "서울":"108", "경기도":"119", "인천":"112", "부산":"159", "대구":"143",
      "광주":"156", "대전":"133", "울산":"152", "세종":"239", "강원도":"105",
      "충청북도":"131", "충청남도":"232", "전라북도":"146", "전라남도":"165",
      "경상북도":"143", "경상남도":"152", "제주":"184"
    };
    const stnId = stnMap[region] || "108"; 
    
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yStr = `${y.getFullYear()}${String(y.getMonth()+1).padStart(2,'0')}${String(y.getDate()).padStart(2,'0')}`;
    
    const url = `https://apihub.kma.go.kr/api/typ02/openApi/AsosDalyInfoService/getWthrDataList`
      + `?pageNo=1&numOfRows=10&dataType=JSON&dataCd=ASOS&dateCd=DAY`
      + `&startDt=${yStr}&endDt=${yStr}&stnIds=${stnId}&authKey=${KEY}`;
      
    try {
      const r = await fetch(url);
      const data = await r.json();
      const item = data.response?.body?.items?.item?.[0];
      const rainAmount = item?.sumRn ? parseFloat(item.sumRn) : 0;
      return res.status(200).json({ rain: rainAmount });
    } catch (e) {
      return res.status(500).json({ error: e.message, type });
    }
  }

  // 기존 단기/초단기 예보
  if (type === 'short' || type === 'ultra_short') {
    const path = type === 'short' ? 'VilageFcstInfoService_2.0/getVilageFcst' : 'VilageFcstInfoService_2.0/getUltraSrtFcst';
    const numRows = type === 'short' ? 1000 : 300;
    const url = `https://apihub.kma.go.kr/api/typ02/openApi/${path}?pageNo=1&numOfRows=${numRows}&dataType=JSON&base_date=${base_date}&base_time=${base_time}&nx=${nx}&ny=${ny}&authKey=${KEY}`;
    try {
      const r = await fetch(url);
      const data = await r.json();
      return res.status(200).json(data);
    } catch (e) {
      return res.status(500).json({ error: e.message, type });
    }
  }

  // 기존 중기 예보
  if (type === 'mid_land' || type === 'mid_temp') return await handleMidTyp01(res, KEY, type, regId, tmFc);
  return res.status(400).json({ error: `Unknown type: ${type}` });
}

async function handleMidTyp01(res, KEY, type, regId, tmFc) {
  const phpFile = type === 'mid_land' ? 'fct_afs_wl.php' : 'fct_afs_wc.php';
  const tmfc10 = (tmFc || '').substring(0, 10);
  const url = `https://apihub.kma.go.kr/api/typ01/url/${phpFile}?reg=${regId}&tmfc1=${tmfc10}&tmfc2=${tmfc10}&disp=0&help=0&authKey=${KEY}`;
  try {
    const r = await fetch(url);
    const text = await r.text();
    const trimmed = text.trim();
    if (trimmed.startsWith('{')) { try { return res.status(200).json(JSON.parse(trimmed)); } catch { } }
    const baseDate = (tmFc || '').substring(0, 8);
    const item = type === 'mid_land' ? parseMidLand(text, regId, baseDate) : parseMidTemp(text, regId, baseDate);
    return res.status(200).json({ response: { header: { resultCode: '00', resultMsg: 'NORMAL_SERVICE' }, body: { items: { item: [item] }, totalCount: 1, numOfRows: 1, pageNo: 1 } } });
  } catch (e) { return res.status(500).json({ error: e.message, type }); }
}

function dayDiff(baseYmd, efYmd) {
  const b = new Date(+baseYmd.substring(0, 4), +baseYmd.substring(4, 6) - 1, +baseYmd.substring(6, 8));
  const e = new Date(+efYmd.substring(0, 4), +efYmd.substring(4, 6) - 1, +efYmd.substring(6, 8));
  return Math.round((e - b) / 86400000);
}

function parseMidLand(text, regId, baseDate) {
  const result = { regId };
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith('7777') || line.includes('START7777') || line.includes('END7777')) continue;
    const m = line.match(/^(\S+)\s+(\d{12})\s+(\d{12})\s+(A0[12])\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+"([^"]*)"\s+(\S+)/);
    if (!m || m[1] !== regId || m[4] !== 'A02') continue;
    const dayOff = dayDiff(baseDate, m[2].substring(0, 8));
    if (dayOff < 3 || dayOff > 10) continue;
    const period = parseInt(m[2].substring(8, 10)) < 12 ? 'Am' : 'Pm';
    result[`wf${dayOff}${period}`] = m[10];
    const rn = parseInt(m[11]);
    result[`rnSt${dayOff}${period}`] = (isNaN(rn) || rn < 0) ? 0 : rn;
  }
  return result;
}

function parseMidTemp(text, regId, baseDate) {
  const result = { regId };
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith('7777') || line.includes('START7777') || line.includes('END7777')) continue;
    const cols = line.split(/\s+/);
    if (cols.length < 8 || cols[0] !== regId || cols[3] !== 'A01') continue;
    const dayOff = dayDiff(baseDate, cols[2].substring(0, 8));
    if (dayOff < 3 || dayOff > 10) continue;
    const min = parseFloat(cols[6]), max = parseFloat(cols[7]);
    if (!isNaN(min) && min > -900) result[`taMin${dayOff}`] = min;
    if (!isNaN(max) && max > -900) result[`taMax${dayOff}`] = max;
  }
  return result;
}
