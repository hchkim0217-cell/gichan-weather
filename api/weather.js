export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const KEY = process.env.KMA_API_KEY;
  const { type, nx, ny, region, base_date, base_time } = req.query;

  // 1. 전국 특수 지형 감지
  const isSpecial = /시흥|배곧|인천|안산|김포|강화|양평|가평|청평|포항|울산|부산|여수|목포|군산|강릉|속초|제주|산|강|포|항|천|호|도/.test(region || "");

  // ✅ 수정①: 내일 날짜 계산 (월말 오류 방지 — Date 객체 사용)
  function getTomorrow(dateStr) {
    const y = parseInt(dateStr.slice(0, 4));
    const m = parseInt(dateStr.slice(4, 6)) - 1; // 0-indexed
    const d = parseInt(dateStr.slice(6, 8));
    const tomorrow = new Date(y, m, d + 1);
    return (
      String(tomorrow.getFullYear()) +
      String(tomorrow.getMonth() + 1).padStart(2, '0') +
      String(tomorrow.getDate()).padStart(2, '0')
    );
  }

  // ✅ 수정②: 8초 타임아웃 (AbortController)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    // 2. 기상청 API 허브 단기예보 (typ02)
    const fcstUrl = `https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstInfoService_2.0/getVilageFcst?dataType=JSON&authKey=${KEY}&base_date=${base_date}&base_time=${base_time}&nx=${nx || 60}&ny=${ny || 121}&numOfRows=1000`;

    const r = await fetch(fcstUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!r.ok) {
      return res.status(200).json({ error: "기상청 승인 대기 중", rain: 0, isSpecial });
    }

    const data = await r.json();

    // 기상청 에러 응답 감지 (3가지 형식 모두 처리)
    const resultCode =
      data?.response?.header?.resultCode ||
      data?.result?.status ||
      null;

    if (resultCode && resultCode !== '00' && resultCode !== 0) {
      const resultMsg =
        data?.response?.header?.resultMsg ||
        data?.result?.message ||
        '알 수 없는 오류';
      console.error('[KMA 에러]', JSON.stringify(data));
      return res.status(200).json({
        error: `기상청 오류: ${resultMsg}`,
        raw: JSON.stringify(data).slice(0, 180),
        rain: 0,
        isSpecial
      });
    }

    const items = data.response?.body?.items?.item || [];

    // 3. 강수량 판정: 오늘 12시 이후 ~ 내일 05시 이전
    const tomorrowStr = getTomorrow(base_date);

    const rainItems = items
      .filter(i =>
        // ✅ 수정③: 0500 → 500 (8진수 버그 수정)
        (i.fcstDate === base_date    && parseInt(i.fcstTime) >= 1200) ||
        (i.fcstDate === tomorrowStr  && parseInt(i.fcstTime) <= 500)
      )
      .filter(i => i.category === 'PCP');

    const totalRain = rainItems.reduce((acc, cur) => {
      // "1mm 미만" → 0.5mm 처리 (프로젝트 규칙)
      if (cur.fcstValue === '강수없음') return acc;
      if (cur.fcstValue.includes('미만')) return acc + 0.5;
      const v = parseFloat(cur.fcstValue.replace(/[^0-9.]/g, ''));
      return acc + (isNaN(v) ? 0 : v);
    }, 0);

    return res.status(200).json({
      rain: parseFloat(totalRain.toFixed(1)),
      isSpecial,
      items
    });

  } catch (e) {
    clearTimeout(timeoutId);

    // 타임아웃 vs 기타 에러 구분
    if (e.name === 'AbortError') {
      console.error('[타임아웃] 기상청 응답 8초 초과');
      return res.status(200).json({ error: "기상청 응답 지연 (타임아웃)", rain: 0, isSpecial });
    }

    console.error('[통신 오류]', e);
    return res.status(200).json({ error: "통신 준비 중", rain: 0, isSpecial });
  }
}
