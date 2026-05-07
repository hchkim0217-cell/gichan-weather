export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const KEY = process.env.KMA_API_KEY;
  const { nx, ny, region, base_date, base_time, day_off } = req.query;

  // day_off: 0=오늘밤, 1=내일밤
  const dayOff = parseInt(day_off || '0');

  // 1. 특수 지형 감지
  const isSpecial = /시흥|배곧|인천|안산|김포|강화|양평|가평|청평|포항|울산|부산|여수|목포|군산|강릉|속초|제주|산|강|포|항|천|호|도/.test(region || "");

  // ✅ 날짜 계산 헬퍼 (월말 오류 방지)
  function getDateStr(baseDate, offsetDays) {
    const y = parseInt(baseDate.slice(0, 4));
    const m = parseInt(baseDate.slice(4, 6)) - 1;
    const d = parseInt(baseDate.slice(6, 8));
    const dt = new Date(y, m, d + offsetDays);
    return (
      String(dt.getFullYear()) +
      String(dt.getMonth() + 1).padStart(2, '0') +
      String(dt.getDate()).padStart(2, '0')
    );
  }

  // ✅ 8초 타임아웃
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const fcstUrl = `https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstInfoService_2.0/getVilageFcst?dataType=JSON&authKey=${KEY}&base_date=${base_date}&base_time=${base_time}&nx=${nx || 60}&ny=${ny || 121}&numOfRows=1000`;

    const r = await fetch(fcstUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!r.ok) {
      return res.status(200).json({ error: "기상청 승인 대기 중", rain: 0, reh: 70, tmp: 15, isSpecial });
    }

    const data = await r.json();

    // KMA 에러 응답 감지 (3가지 형식 모두 처리)
    const resultCode = data?.response?.header?.resultCode || data?.result?.status || null;
    if (resultCode && resultCode !== '00' && resultCode !== 0) {
      const resultMsg = data?.response?.header?.resultMsg || data?.result?.message || '알 수 없는 오류';
      console.error('[KMA 에러]', JSON.stringify(data));
      return res.status(200).json({
        error: `기상청 오류: ${resultMsg}`,
        raw: JSON.stringify(data).slice(0, 180),
        rain: 0, reh: 70, tmp: 15, isSpecial
      });
    }

    const items = data.response?.body?.items?.item || [];

    // ✅ day_off 기반 날짜 계산
    // dayOff=0(오늘): 오늘 12시 이후 ~ 내일 05시
    // dayOff=1(내일): 내일 12시 이후 ~ 모레 05시
    const targetDate = getDateStr(base_date, dayOff);
    const nextDate   = getDateStr(base_date, dayOff + 1);

    // 강수량 집계
    const rainItems = items
      .filter(i =>
        (i.fcstDate === targetDate && parseInt(i.fcstTime) >= 1200) ||
        (i.fcstDate === nextDate   && parseInt(i.fcstTime) <= 500)  // ✅ 0500→500 수정
      )
      .filter(i => i.category === 'PCP');

    const totalRain = rainItems.reduce((acc, cur) => {
      if (cur.fcstValue === '강수없음') return acc;
      if (cur.fcstValue.includes('미만')) return acc + 0.5; // "1mm 미만" → 0.5mm
      const v = parseFloat(cur.fcstValue.replace(/[^0-9.]/g, ''));
      return acc + (isNaN(v) ? 0 : v);
    }, 0);

    // 습도: 시공 당일 아침 06시 기준
    const rehItem =
      items.find(i => i.category === 'REH' && i.fcstDate === nextDate && parseInt(i.fcstTime) >= 600) ||
      items.find(i => i.category === 'REH' && i.fcstDate === nextDate) ||
      items.find(i => i.category === 'REH');
    const reh = parseInt(rehItem?.fcstValue || 70);

    // 기온: 시공 당일 아침 06시 기준
    const tmpItem =
      items.find(i => i.category === 'TMP' && i.fcstDate === nextDate && parseInt(i.fcstTime) >= 600) ||
      items.find(i => i.category === 'TMP' && i.fcstDate === nextDate) ||
      items.find(i => i.category === 'TMP');
    const tmp = parseFloat(tmpItem?.fcstValue || 15);

    return res.status(200).json({
      rain: parseFloat(totalRain.toFixed(1)),
      reh,
      tmp,
      isSpecial,
      items
    });

  } catch (e) {
    clearTimeout(timeoutId);
    if (e.name === 'AbortError') {
      console.error('[타임아웃] 기상청 응답 8초 초과');
      return res.status(200).json({ error: "기상청 응답 지연 (타임아웃)", rain: 0, reh: 70, tmp: 15, isSpecial });
    }
    console.error('[통신 오류]', e);
    return res.status(200).json({ error: "통신 준비 중", rain: 0, reh: 70, tmp: 15, isSpecial });
  }
}
