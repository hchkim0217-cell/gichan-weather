// /api/calendar - 구글 캘린더 구독용 ICS 피드
// 기존 /api/weather 프록시를 재사용해 단기(0~2일) + 중기(3~9일) 예보를 종일 일정으로 발행
// 사용법: /api/calendar?loc=서울/중구  또는  /api/calendar?la=37.564&lo=126.9975&reg=11B10101&name=서울 중구
// 옵션: days=7 (기본 7, 최대 10)

const APP_URL = 'https://gichan-weather-hchkim0217-2582s-projects.vercel.app';
const KST_OFFSET = 9 * 60 * 60 * 1000;

const LOC={
  "서울":[{n:"강남구",la:37.5172,lo:127.0473,midRegId:"11B10101"},{n:"강동구",la:37.5301,lo:127.1238,midRegId:"11B10101"},{n:"강북구",la:37.6396,lo:127.0257,midRegId:"11B10101"},{n:"강서구",la:37.5509,lo:126.8495,midRegId:"11B10101"},{n:"관악구",la:37.4784,lo:126.9516,midRegId:"11B10101"},{n:"광진구",la:37.5385,lo:127.0823,midRegId:"11B10101"},{n:"구로구",la:37.4954,lo:126.8874,midRegId:"11B10101"},{n:"금천구",la:37.4569,lo:126.8957,midRegId:"11B10101"},{n:"노원구",la:37.6542,lo:127.0568,midRegId:"11B10101"},{n:"도봉구",la:37.6688,lo:127.0471,midRegId:"11B10101"},{n:"동대문구",la:37.5744,lo:127.0397,midRegId:"11B10101"},{n:"동작구",la:37.5124,lo:126.9393,midRegId:"11B10101"},{n:"마포구",la:37.5637,lo:126.9084,midRegId:"11B10101"},{n:"서대문구",la:37.5791,lo:126.9368,midRegId:"11B10101"},{n:"서초구",la:37.4837,lo:127.0324,midRegId:"11B10101"},{n:"성동구",la:37.5633,lo:127.0371,midRegId:"11B10101"},{n:"성북구",la:37.5894,lo:127.0167,midRegId:"11B10101"},{n:"송파구",la:37.5145,lo:127.1059,midRegId:"11B10101"},{n:"양천구",la:37.5171,lo:126.8667,midRegId:"11B10101"},{n:"영등포구",la:37.5263,lo:126.8963,midRegId:"11B10101"},{n:"용산구",la:37.5324,lo:126.9902,midRegId:"11B10101"},{n:"은평구",la:37.6027,lo:126.9291,midRegId:"11B10101"},{n:"종로구",la:37.5730,lo:126.9794,midRegId:"11B10101"},{n:"중구",la:37.5640,lo:126.9975,midRegId:"11B10101"},{n:"중랑구",la:37.6063,lo:127.0927,midRegId:"11B10101"}],
  "경기도":[{n:"고양시",la:37.6584,lo:126.8320,midRegId:"11B20601"},{n:"광명시",la:37.4786,lo:126.8647,midRegId:"11B20601"},{n:"광주시",la:37.4295,lo:127.2550,midRegId:"11B20601"},{n:"구리시",la:37.5943,lo:127.1296,midRegId:"11B20601"},{n:"군포시",la:37.3617,lo:126.9352,midRegId:"11B20601"},{n:"김포시",la:37.6154,lo:126.7158,midRegId:"11B20601"},{n:"남양주시",la:37.6360,lo:127.2165,midRegId:"11B20601"},{n:"부천시",la:37.5034,lo:126.7660,midRegId:"11B20601"},{n:"성남시",la:37.4449,lo:127.1388,midRegId:"11B20601"},{n:"수원시",la:37.2636,lo:127.0286,midRegId:"11B20601"},{n:"시흥시",la:37.3800,lo:126.8031,midRegId:"11B20601"},{n:"안산시",la:37.3236,lo:126.8219,midRegId:"11B20601"},{n:"안양시",la:37.3943,lo:126.9568,midRegId:"11B20601"},{n:"오산시",la:37.1498,lo:127.0769,midRegId:"11B20601"},{n:"용인시",la:37.2411,lo:127.1776,midRegId:"11B20601"},{n:"의정부시",la:37.7382,lo:127.0337,midRegId:"11B20601"},{n:"이천시",la:37.2724,lo:127.4344,midRegId:"11B20601"},{n:"파주시",la:37.7605,lo:126.7799,midRegId:"11B20601"},{n:"평택시",la:37.0076,lo:127.0699,midRegId:"11B20601"},{n:"하남시",la:37.5395,lo:127.2147,midRegId:"11B20601"},{n:"화성시",la:37.1994,lo:126.8317,midRegId:"11B20601"}],
  "인천":[{n:"강화군",la:37.7474,lo:126.4880,midRegId:"11B20201"},{n:"계양구",la:37.5374,lo:126.7377,midRegId:"11B20201"},{n:"남동구",la:37.4469,lo:126.7315,midRegId:"11B20201"},{n:"동구",la:37.4737,lo:126.6430,midRegId:"11B20201"},{n:"미추홀구",la:37.4637,lo:126.6503,midRegId:"11B20201"},{n:"부평구",la:37.5074,lo:126.7220,midRegId:"11B20201"},{n:"서구",la:37.5450,lo:126.6760,midRegId:"11B20201"},{n:"연수구",la:37.4099,lo:126.6780,midRegId:"11B20201"},{n:"중구",la:37.4738,lo:126.6216,midRegId:"11B20201"}],
  "부산":[{n:"강서구",la:35.2121,lo:128.9799,midRegId:"11H20201"},{n:"금정구",la:35.2428,lo:129.0920,midRegId:"11H20201"},{n:"기장군",la:35.2445,lo:129.2221,midRegId:"11H20201"},{n:"남구",la:35.1369,lo:129.0842,midRegId:"11H20201"},{n:"동구",la:35.1298,lo:129.0450,midRegId:"11H20201"},{n:"동래구",la:35.1978,lo:129.0862,midRegId:"11H20201"},{n:"부산진구",la:35.1587,lo:129.0536,midRegId:"11H20201"},{n:"북구",la:35.1972,lo:128.9903,midRegId:"11H20201"},{n:"사하구",la:35.0997,lo:128.9741,midRegId:"11H20201"},{n:"서구",la:35.0971,lo:129.0241,midRegId:"11H20201"},{n:"수영구",la:35.1453,lo:129.1133,midRegId:"11H20201"},{n:"연제구",la:35.1763,lo:129.0811,midRegId:"11H20201"},{n:"영도구",la:35.0911,lo:129.0686,midRegId:"11H20201"},{n:"중구",la:35.1033,lo:129.0322,midRegId:"11H20201"},{n:"해운대구",la:35.1631,lo:129.1637,midRegId:"11H20201"}],
  "대구":[{n:"달서구",la:35.8298,lo:128.5328,midRegId:"11H10701"},{n:"달성군",la:35.7746,lo:128.4314,midRegId:"11H10701"},{n:"동구",la:35.8867,lo:128.6353,midRegId:"11H10701"},{n:"남구",la:35.8463,lo:128.5975,midRegId:"11H10701"},{n:"북구",la:35.8850,lo:128.5825,midRegId:"11H10701"},{n:"서구",la:35.8715,lo:128.5592,midRegId:"11H10701"},{n:"수성구",la:35.8584,lo:128.6307,midRegId:"11H10701"},{n:"중구",la:35.8698,lo:128.6065,midRegId:"11H10701"}],
  "광주":[{n:"광산구",la:35.1397,lo:126.7941,midRegId:"11F20501"},{n:"남구",la:35.1333,lo:126.9028,midRegId:"11F20501"},{n:"동구",la:35.1456,lo:126.9228,midRegId:"11F20501"},{n:"북구",la:35.1744,lo:126.9119,midRegId:"11F20501"},{n:"서구",la:35.1518,lo:126.8893,midRegId:"11F20501"}],
  "대전":[{n:"대덕구",la:36.3466,lo:127.4154,midRegId:"11C20401"},{n:"동구",la:36.3122,lo:127.4547,midRegId:"11C20401"},{n:"서구",la:36.3554,lo:127.3832,midRegId:"11C20401"},{n:"유성구",la:36.3624,lo:127.3562,midRegId:"11C20401"},{n:"중구",la:36.3254,lo:127.4215,midRegId:"11C20401"}],
  "울산":[{n:"남구",la:35.5384,lo:129.3294,midRegId:"11H20101"},{n:"동구",la:35.5050,lo:129.4163,midRegId:"11H20101"},{n:"북구",la:35.5826,lo:129.3613,midRegId:"11H20101"},{n:"울주군",la:35.5221,lo:129.0415,midRegId:"11H20101"},{n:"중구",la:35.5687,lo:129.3319,midRegId:"11H20101"}],
  "세종":[{n:"세종시",la:36.4801,lo:127.2890,midRegId:"11C20404"}],
  "강원도":[{n:"강릉시",la:37.7519,lo:128.8761,midRegId:"11D20501"},{n:"동해시",la:37.5245,lo:129.1140,midRegId:"11D20501"},{n:"속초시",la:38.2070,lo:128.5918,midRegId:"11D20401"},{n:"원주시",la:37.3422,lo:127.9203,midRegId:"11D10301"},{n:"춘천시",la:37.8813,lo:127.7298,midRegId:"11D10101"},{n:"태백시",la:37.1651,lo:128.9853,midRegId:"11D20601"}],
  "충청북도":[{n:"제천시",la:37.1326,lo:128.1909,midRegId:"11C10301"},{n:"청주시",la:36.6424,lo:127.4890,midRegId:"11C10101"},{n:"충주시",la:36.9910,lo:127.9259,midRegId:"11C10201"}],
  "충청남도":[{n:"공주시",la:36.4465,lo:127.1191,midRegId:"11C20101"},{n:"당진시",la:36.8899,lo:126.6456,midRegId:"11C20101"},{n:"논산시",la:36.1871,lo:127.0991,midRegId:"11C20101"},{n:"보령시",la:36.3333,lo:126.6128,midRegId:"11C20101"},{n:"서산시",la:36.7849,lo:126.4503,midRegId:"11C20101"},{n:"아산시",la:36.7898,lo:127.0017,midRegId:"11C20101"},{n:"천안시",la:36.8151,lo:127.1139,midRegId:"11C20101"}],
  "전라북도":[{n:"군산시",la:35.9676,lo:126.7368,midRegId:"11F10201"},{n:"김제시",la:35.8033,lo:126.8809,midRegId:"11F10201"},{n:"남원시",la:35.4164,lo:127.3908,midRegId:"11F10201"},{n:"익산시",la:35.9483,lo:126.9579,midRegId:"11F10201"},{n:"전주시",la:35.8242,lo:127.1480,midRegId:"11F10201"},{n:"정읍시",la:35.5699,lo:126.8559,midRegId:"11F10201"}],
  "전라남도":[{n:"광양시",la:34.9407,lo:127.6956,midRegId:"11F20401"},{n:"나주시",la:35.0160,lo:126.7109,midRegId:"11F20401"},{n:"목포시",la:34.8118,lo:126.3922,midRegId:"11F20401"},{n:"순천시",la:34.9506,lo:127.4875,midRegId:"11F20401"},{n:"여수시",la:34.7604,lo:127.6622,midRegId:"11F20401"}],
  "경상북도":[{n:"경주시",la:35.8562,lo:129.2247,midRegId:"11H10201"},{n:"구미시",la:36.1196,lo:128.3446,midRegId:"11H10201"},{n:"김천시",la:36.1398,lo:128.1137,midRegId:"11H10201"},{n:"안동시",la:36.5684,lo:128.7294,midRegId:"11H10201"},{n:"영주시",la:36.8057,lo:128.6239,midRegId:"11H10201"},{n:"포항시",la:36.0190,lo:129.3435,midRegId:"11H10201"}],
  "경상남도":[{n:"거제시",la:34.8804,lo:128.6211,midRegId:"11H20301"},{n:"김해시",la:35.2285,lo:128.8892,midRegId:"11H20301"},{n:"밀양시",la:35.5036,lo:128.7463,midRegId:"11H20301"},{n:"사천시",la:34.9401,lo:128.0639,midRegId:"11H20301"},{n:"양산시",la:35.3350,lo:129.0373,midRegId:"11H20301"},{n:"진주시",la:35.1800,lo:128.1076,midRegId:"11H20301"},{n:"창원시",la:35.2281,lo:128.6811,midRegId:"11H20301"},{n:"통영시",la:34.8544,lo:128.4332,midRegId:"11H20301"}],
  "제주":[{n:"서귀포시",la:33.2541,lo:126.5600,midRegId:"11G00201"},{n:"제주시",la:33.4996,lo:126.5312,midRegId:"11G00101"}]
};
// ── KST 시각 헬퍼 (서버는 UTC로 동작하므로 +9h 보정 후 UTC 필드를 읽는다) ──
function kstNow() { return new Date(Date.now() + KST_OFFSET); }
function ymd(d) {
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
}
function dateStr(off) {
  const d = kstNow();
  d.setUTCDate(d.getUTCDate() + off);
  return ymd(d);
}
function weekdayKo(ymdStr) {
  const d = new Date(Date.UTC(+ymdStr.substring(0, 4), +ymdStr.substring(4, 6) - 1, +ymdStr.substring(6, 8)));
  return ['일', '월', '화', '수', '목', '금', '토'][d.getUTCDay()];
}

function toGrid(lat, lon) {
  const D = Math.PI / 180, RE = 6371.00877, GRID = 5,
    s1 = 30 * D, s2 = 60 * D, olon = 126 * D, olat = 38 * D, XO = 43, YO = 136, re = RE / GRID;
  const sn = Math.log(Math.cos(s1) / Math.cos(s2)) / Math.log(Math.tan(Math.PI * .25 + s2 * .5) / Math.tan(Math.PI * .25 + s1 * .5));
  const sf = Math.pow(Math.tan(Math.PI * .25 + s1 * .5), sn) * Math.cos(s1) / sn;
  const ro = re * sf / Math.pow(Math.tan(Math.PI * .25 + olat * .5), sn);
  const ra = re * sf / Math.pow(Math.tan(Math.PI * .25 + lat * D * .5), sn);
  let theta = lon * D - olon;
  if (theta > Math.PI) theta -= 2 * Math.PI;
  if (theta < -Math.PI) theta += 2 * Math.PI;
  theta *= sn;
  return { nx: Math.floor(ra * Math.sin(theta) + XO + .5), ny: Math.floor(ro - ra * Math.cos(theta) + YO + .5) };
}

function getShortBase() {
  const now = kstNow(), BT = [2, 5, 8, 11, 14, 17, 20, 23];
  const cur = now.getUTCHours() * 60 + now.getUTCMinutes();
  let bh = 23, found = false;
  const bd = new Date(now);
  for (let i = BT.length - 1; i >= 0; i--) { if (cur >= BT[i] * 60 + 10) { bh = BT[i]; found = true; break; } }
  if (!found) { bd.setUTCDate(bd.getUTCDate() - 1); bh = 23; }
  return { base_date: ymd(bd), base_time: String(bh).padStart(2, '0') + '00' };
}

function getMidTmFc() {
  const now = kstNow(), h = now.getUTCHours();
  if (h >= 18) return `${ymd(now)}1800`;
  if (h >= 6) return `${ymd(now)}0600`;
  const yd = new Date(now); yd.setUTCDate(yd.getUTCDate() - 1);
  return `${ymd(yd)}1800`;
}

function getPrevMidTmFc() {
  const now = kstNow(), h = now.getUTCHours();
  if (h >= 18) return `${ymd(now)}0600`;
  const yd = new Date(now); yd.setUTCDate(yd.getUTCDate() - 1);
  if (h >= 6) return `${ymd(yd)}1800`;
  return `${ymd(yd)}0600`;
}

const hh = h => `${String(Math.max(0, Math.min(23, h))).padStart(2, '0')}:00`;

// ── 판정 로직 (index.html과 동일 기준) ──────────────────────────────
function getJudge(amProb, pmProb, lateRainStart) {
  if (amProb <= 30 && lateRainStart !== null && lateRainStart >= 15) {
    return { sig: '🟡', short: '관리자협의', label: '🤝 관리자와 협의', sub: '오전 작업 종료 가능 시 관리자와 협의 후 진행' };
  }
  const maxP = Math.max(amProb, pmProb);
  if (maxP <= 30) return { sig: '🟢', short: '정상작업', label: '✅ 정상 작업', sub: '전일 시공 가능' };
  if (maxP <= 40) return { sig: '🟡', short: '오전만작업', label: '⚠️ 오전만 작업', sub: '오후 기상 관찰' };
  return { sig: '🔴', short: '시공취소', label: '🚫 시공 취소', sub: '보양 철저' };
}

function getAmPmProb(hourly) {
  const am = hourly.filter(s => s.h >= 0 && s.h <= 11);
  const pm = hourly.filter(s => s.h >= 12 && s.h <= 23);
  return {
    amProb: am.length ? Math.max(...am.map(s => s.p)) : 0,
    pmProb: pm.length ? Math.max(...pm.map(s => s.p)) : 0
  };
}

// 강수 시간대: PTY>0 또는 강수량>0 기준 (POP 기반 금지 — 2시간 오차 발생)
function findRain(hourly) {
  const sl = hourly.filter(s => s.pty > 0 || s.rain > 0);
  if (!sl.length) return null;
  const sH = sl[0].h, eH = sl[sl.length - 1].h;
  const am = sl.map(s => ({ h: s.h, mm: +s.rain.toFixed(1) }));
  return { sH, eH, am, total: +(am.reduce((a, b) => a + b.mm, 0)).toFixed(1) };
}

// ── 예보 수집 ────────────────────────────────────────────────────────
async function fetchShortDays(origin, la, lo) {
  const { nx, ny } = toGrid(la, lo);
  const sb = getShortBase();
  const url = `https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstInfoService_2.0/getVilageFcst`
    + `?pageNo=1&numOfRows=1200&dataType=JSON&base_date=${sb.base_date}&base_time=${sb.base_time}`
    + `&nx=${nx}&ny=${ny}&authKey=${process.env.KMA_API_KEY}`;

  const r = await fetch(url);
  const data = await r.json();
  if (data?.response?.header?.resultCode !== '00') {
    throw new Error(`단기예보 실패 — ${data?.response?.header?.resultMsg || JSON.stringify(data).substring(0, 180)}`);
  }

  const grp = {};
  for (const it of data.response.body.items.item) {
    const k = `${it.fcstDate}_${it.fcstTime}`;
    if (!grp[k]) grp[k] = { date: it.fcstDate, time: it.fcstTime };
    grp[k][it.category] = it.fcstValue;
  }

  const byDate = {};
  const slots = Object.values(grp).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  let lastPop = 0;
  for (const d of slots) {
    const h = parseInt(d.time.substring(0, 2));
    const t = parseFloat(d.TMP ?? 20);
    const rh = parseInt(d.REH ?? 70);
    if (d.POP !== undefined) lastPop = parseInt(d.POP);
    const pty = parseInt(d.PTY ?? 0);
    let rain = 0;
    if (d.PCP && d.PCP !== '강수없음' && d.PCP !== '0') {
      // "1mm 미만"은 0.5mm로 처리 (parseFloat 시 1.0 오파싱 방지)
      if (d.PCP.includes('미만')) rain = 0.5;
      else { const v = parseFloat(d.PCP); if (!isNaN(v)) rain = v; }
    }
    const p = pty > 0 ? Math.max(lastPop, 70) : lastPop;
    if (!byDate[d.date]) byDate[d.date] = [];
    byDate[d.date].push({ h, t, rh, p, rain, pty });
  }
  return byDate;
}

// 중기육상예보 구역코드(광역) 매핑 — 기온은 도시코드, 육상은 광역코드로 체계가 다르다
// 11B(서울·인천·경기)만 11B00000 단일 구역이고, 나머지는 앞 4자리 + 0000
function toLandRegId(cityRegId) {
  const p4 = String(cityRegId).substring(0, 4);
  if (p4.startsWith('11B')) return '11B00000';
  return p4 + '0000';
}

// 중기예보 typ02 JSON 직접 호출 (getMidLandFcst / getMidTa 는 활용신청 승인됨)
async function fetchMid(origin, regId) {
  const KEY = process.env.KMA_API_KEY;
  const landReg = toLandRegId(regId);

  const call = async (svc, reg, tm) => {
    const url = `https://apihub.kma.go.kr/api/typ02/openApi/MidFcstInfoService/${svc}`
      + `?pageNo=1&numOfRows=10&dataType=JSON&regId=${reg}&tmFc=${tm}&authKey=${KEY}`;
    try {
      const r = await fetch(url);
      const txt = await r.text();
      try { return JSON.parse(txt); } catch { return { __raw: txt.substring(0, 200) }; }
    } catch (e) { return { __err: e.message }; }
  };

  const kmaErr = d => {
    if (d?.__err) return `요청 실패: ${d.__err}`;
    if (d?.__raw) return `JSON 아님: ${d.__raw}`;
    if (d?.OpenAPI_ServiceResponse) {
      const h = d.OpenAPI_ServiceResponse.cmmMsgHeader || {};
      return `${h.errMsg || h.returnAuthMsg || 'KMA 에러'}${h.returnReasonCode ? '(' + h.returnReasonCode + ')' : ''}`;
    }
    if (d?.result?.status && d.result.status !== 200) return `KMA ${d.result.status}: ${d.result.message || ''}`;
    const rc = d?.response?.header?.resultCode;
    if (rc && rc !== '00') return `KMA(${rc}): ${d.response.header.resultMsg || ''}`;
    return null;
  };
  const pick = d => d?.response?.body?.items?.item?.[0];
  const empty = o => !o || Object.keys(o).length <= 1;

  const tmFc = getMidTmFc();
  let [land, temp] = await Promise.all([
    call('getMidLandFcst', landReg, tmFc),
    call('getMidTa', regId, tmFc)
  ]);
  const lErr = kmaErr(land), tErr = kmaErr(temp);
  let li = pick(land), ti = pick(temp);

  // 발표 직후 미생성 케이스 → 이전 발표시각 재시도
  if ((empty(li) || empty(ti)) && !lErr && !tErr) {
    const prev = getPrevMidTmFc();
    const [land2, temp2] = await Promise.all([
      call('getMidLandFcst', landReg, prev),
      call('getMidTa', regId, prev)
    ]);
    if (empty(li)) li = pick(land2);
    if (empty(ti)) ti = pick(temp2);
  }
  return { li: li || {}, ti: ti || {}, err: lErr || tErr || null, landReg };
}

function midToHourly(li, ti, d) {
  const amPop = parseInt(li[`rnSt${d}Am`] ?? li[`rnSt${d}`] ?? NaN);
  const pmPop = parseInt(li[`rnSt${d}Pm`] ?? li[`rnSt${d}`] ?? NaN);
  const minT = parseFloat(ti[`taMin${d}`] ?? NaN);
  const maxT = parseFloat(ti[`taMax${d}`] ?? NaN);
  if (isNaN(amPop) && isNaN(pmPop) && isNaN(minT) && isNaN(maxT)) return null;

  // 강수확률이 통째로 없으면 0%로 위장하면 안 된다 — 시공가능으로 오판하게 된다
  const popMissing = isNaN(amPop) && isNaN(pmPop);
  const tempMissing = isNaN(minT) && isNaN(maxT);
  const ap = isNaN(amPop) ? 0 : amPop, pp = isNaN(pmPop) ? 0 : pmPop;
  const mn = isNaN(minT) ? 10 : minT, mx = isNaN(maxT) ? 20 : maxT;
  const hourly = [];
  for (let h = 0; h <= 23; h++) {
    let t;
    if (h <= 5) t = mn;
    else if (h <= 14) t = mn + (mx - mn) * ((h - 5) / 9);
    else t = mx - (mx - mn) * ((h - 14) / 9);
    const pop = h < 12 ? ap : pp;
    hourly.push({ h, t, rh: 70, p: pop, rain: pop >= 50 ? 1 : 0, pty: pop >= 50 ? 1 : 0 });
  }
  return { hourly, minT: mn, maxT: mx, amPop: ap, pmPop: pp, popMissing, tempMissing, wf: li[`wf${d}Am`] || li[`wf${d}`] || '' };
}

// ── ICS 조립 ─────────────────────────────────────────────────────────
function esc(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

// RFC5545 라인 폴딩 (UTF-8 바이트 75 기준)
function fold(line) {
  if (Buffer.byteLength(line, 'utf8') <= 75) return line;
  const out = [];
  let chunk = '', bytes = 0;
  for (const ch of line) {
    const b = Buffer.byteLength(ch, 'utf8');
    if (bytes + b > 75) { out.push(chunk); chunk = ' ' + ch; bytes = 1 + b; }
    else { chunk += ch; bytes += b; }
  }
  out.push(chunk);
  return out.join('\r\n');
}

function nextDay(ymdStr) {
  const d = new Date(Date.UTC(+ymdStr.substring(0, 4), +ymdStr.substring(4, 6) - 1, +ymdStr.substring(6, 8)));
  d.setUTCDate(d.getUTCDate() + 1);
  return ymd(d);
}

function buildEvent(o) {
  const lines = [];
  lines.push('BEGIN:VEVENT');
  lines.push(`UID:${o.uid}`);
  lines.push(`DTSTAMP:${o.stamp}`);
  lines.push(`DTSTART;VALUE=DATE:${o.date}`);
  lines.push(`DTEND;VALUE=DATE:${nextDay(o.date)}`);
  lines.push(fold(`SUMMARY:${esc(o.summary)}`));
  lines.push(fold(`DESCRIPTION:${esc(o.description)}`));
  if (o.location) lines.push(fold(`LOCATION:${esc(o.location)}`));
  lines.push('TRANSP:TRANSPARENT');
  lines.push('END:VEVENT');
  return lines.join('\r\n');
}

// ── 핸들러 ───────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const q = req.query || {};
  let la = parseFloat(q.la), lo = parseFloat(q.lo), reg = q.reg, name = q.name;

  if (q.loc) {
    const [sido, sgg] = decodeURIComponent(q.loc).split('/').map(s => (s || '').trim());
    const list = LOC[sido];
    const hit = list && (sgg ? list.find(x => x.n === sgg) : list[0]);
    if (!hit) {
      res.status(400).send(`알 수 없는 지역: ${q.loc}\n예시: ?loc=서울/중구`);
      return;
    }
    la = hit.la; lo = hit.lo; reg = hit.midRegId; name = name || `${sido} ${hit.n}`;
  }
  if (isNaN(la) || isNaN(lo) || !reg) { la = 37.5640; lo = 126.9975; reg = '11B10101'; name = name || '서울 중구'; }
  name = name || '현장';

  // 진단 모드: 중기예보 typ02 원본 JSON을 그대로 확인한다 (authKey는 출력하지 않음)
  if (q.debug === 'mid') {
    const KEY = process.env.KMA_API_KEY;
    const tmFc = getMidTmFc();
    const landReg = toLandRegId(reg);
    const pull = async (svc, r2) => {
      const u = `https://apihub.kma.go.kr/api/typ02/openApi/MidFcstInfoService/${svc}`
        + `?pageNo=1&numOfRows=10&dataType=JSON&regId=${r2}&tmFc=${tmFc}&authKey=${KEY}`;
      try { return await (await fetch(u)).text(); } catch (e) { return `FETCH ERROR: ${e.message}`; }
    };
    const [wl, wc] = await Promise.all([pull('getMidLandFcst', landReg), pull('getMidTa', reg)]);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(
      `### tmFc=${tmFc}\n### 육상 regId=${landReg} (광역) / 기온 regId=${reg} (도시)\n\n`
      + `===== getMidLandFcst =====\n${wl.substring(0, 3000)}\n\n===== getMidTa =====\n${wc.substring(0, 2000)}\n`
    );
  }

  // 진단 모드 2: 기존 typ01 텍스트 원본 확인 (파싱 실패 원인 대조용)
  if (q.debug === 'mid01') {
    const KEY = process.env.KMA_API_KEY;
    const tmfc10 = getMidTmFc().substring(0, 10);
    const pull = async (php, r2) => {
      const u = `https://apihub.kma.go.kr/api/typ01/url/${php}`
        + `?reg=${r2}&tmfc1=${tmfc10}&tmfc2=${tmfc10}&disp=0&help=1&authKey=${KEY}`;
      try { return await (await fetch(u)).text(); } catch (e) { return `FETCH ERROR: ${e.message}`; }
    };
    const [wl, wc] = await Promise.all([pull('fct_afs_wl.php', reg), pull('fct_afs_wc.php', reg)]);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(
      `### reg=${reg} tmfc=${tmfc10}\n\n===== fct_afs_wl.php (육상) =====\n${wl.substring(0, 4000)}\n\n===== fct_afs_wc.php (기온) =====\n${wc.substring(0, 2500)}\n`
    );
  }

  const days = Math.min(10, Math.max(1, parseInt(q.days || '7')));
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const origin = `${proto}://${req.headers.host}`;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const events = [];
  let warn = '';

  try {
    const shortByDate = await fetchShortDays(origin, la, lo);
    let mid = null;
    if (days > 3) {
      try { mid = await fetchMid(origin, reg); } catch (e) { warn = `중기예보 조회 실패 — ${e.message}`; }
      if (mid && mid.err) warn = `중기예보 — ${mid.err}`;
    }

    for (let off = 0; off < days; off++) {
      const dstr = dateStr(off);
      let hourly = null, minT = null, maxT = null, wf = '', src = '', popMissing = false, partial = false;

      // 오늘은 이미 지난 시간대가 빠져 슬롯이 적으므로 개수 조건을 두지 않는다
      const minSlots = off === 0 ? 1 : 12;
      if (shortByDate[dstr] && shortByDate[dstr].length >= minSlots) {
        hourly = shortByDate[dstr];
        minT = Math.min(...hourly.map(s => s.t));
        maxT = Math.max(...hourly.map(s => s.t));
        src = '단기예보';
        partial = off === 0 && hourly.length < 12;
      } else if (mid && off >= 3) {
        const m = midToHourly(mid.li, mid.ti, off);
        if (m) {
          hourly = m.hourly; minT = m.minT; maxT = m.maxT; wf = m.wf;
          src = '중기예보'; popMissing = m.popMissing;
        }
      }
      if (!hourly) continue;

      const { amProb, pmProb } = getAmPmProb(hourly);
      // 중기예보는 오전/오후 구분만 있어 시간대 정보가 없다 — 강수 시간대 판정에서 제외
      const rainInfo = src === '단기예보' ? findRain(hourly) : null;
      const lateRainStart = rainInfo && rainInfo.sH >= 15 ? rainInfo.sH : null;
      const jud = getJudge(amProb, pmProb, lateRainStart);
      const maxProb = Math.max(amProb, pmProb);

      const summary = popMissing
        ? `⚪ 판정보류 · ${Math.round(minT)}~${Math.round(maxT)}℃ · 강수확률 없음`
        : `${jud.sig} ${jud.short} · ${Math.round(minT)}~${Math.round(maxT)}℃ · 강수 ${maxProb}%`;

      const desc = [];
      if (popMissing) {
        desc.push('[시공판정] ⚪ 판정 보류 — 기상청이 이 날짜의 강수확률을 아직 제공하지 않음');
      } else {
        desc.push(`[시공판정] ${jud.label} — ${jud.sub}`);
      }
      desc.push(`[기온] 최저 ${minT.toFixed(1)}℃ / 최고 ${maxT.toFixed(1)}℃`);
      if (popMissing) {
        desc.push('[강수확률] 데이터 없음 — 0%가 아니라 미제공이다. 날짜가 가까워지면 채워진다.');
      } else {
        desc.push(`[강수확률] 오전 ${amProb}% / 오후 ${pmProb}%`);
      }
      if (rainInfo) {
        desc.push(`[강수시간] ${hh(rainInfo.sH)} ~ ${hh(rainInfo.eH)}${rainInfo.total > 0 ? ` · 합계 ${rainInfo.total}mm` : ''}`);
        const rows = rainInfo.am.filter(a => a.mm > 0).map(a => `  ${hh(a.h)}  ${a.mm}mm`);
        if (rows.length) desc.push(rows.join('\n'));
      } else if (src === '중기예보') {
        desc.push('[강수시간] 중기예보는 시간대 구분 없음 — 오전/오후 확률로 판단');
      } else {
        desc.push('[강수시간] 강수 예보 없음');
      }
      if (wf) desc.push(`[하늘상태] ${wf}`);
      desc.push(`[예보구분] ${src}${src === '중기예보' ? ' (오차 큼 · 참고용)' : ''}${partial ? ' · 잔여 시간대 기준' : ''}`);
      desc.push('');
      desc.push(`현장 상세 확인 ${APP_URL}`);

      events.push(buildEvent({
        uid: `${dstr}-${reg}-${Math.round(la * 1000)}${Math.round(lo * 1000)}@gichan-weather`,
        stamp, date: dstr, summary, description: desc.join('\n'), location: name
      }));
    }
  } catch (e) {
    // 예보 전체 실패 시에도 캘린더 구독이 깨지지 않도록 안내 일정 1건 발행
    const dstr = dateStr(0);
    events.push(buildEvent({
      uid: `err-${dstr}-${reg}@gichan-weather`, stamp, date: dstr,
      summary: '⚠️ 날씨 예보 조회 실패',
      description: `${e.message}\n\n${APP_URL}`, location: name
    }));
  }

  const cal = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//기찬시설관리(주)//현장 시공날씨//KR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    fold(`X-WR-CALNAME:기찬 시공날씨 (${name})`),
    'X-WR-TIMEZONE:Asia/Seoul',
    fold(`X-WR-CALDESC:기상청 예보 기반 시공 판정${warn ? ' · ' + warn : ''}`),
    'REFRESH-INTERVAL;VALUE=DURATION:PT3H',
    'X-PUBLISHED-TTL:PT3H',
    ...events,
    'END:VCALENDAR',
    ''
  ].join('\r\n');

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'inline; filename="gichan-weather.ics"');
  res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).send(cal);
}
