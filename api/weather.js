export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const KEY = process.env.KMA_API_KEY; 
  const { nx, ny, region, base_date, base_time, day_off } = req.query;

  // 전국 특수 지형 분석 (현철 님 지시사항)
  const isSpecial = /시흥|배곧|인천|안산|김포|강화|양평|가평|청평|포항|울산|부산|여수|목포|군산|강릉|속초|제주|산|강|포|항|천|호|도/.test(region || "");

  try {
    // 1. [오늘 탭] 어제~새벽 5시 실제 강수량 (ASOS 시간자료 사용)
    const t = new Date(); t.setDate(t.getDate() - 1);
    const yStr = `${t.getFullYear()}${String(t.getMonth()+1).padStart(2,'0')}${String(t.getDate()).padStart(2,'0')}`;
    
    // API 허브 실측 주소 (typ01)
    const asosUrl = `https://apihub.kma.go.kr/api/typ01/url/kma_sfct_tm.php?tm=${yStr}2300&stn=108&authKey=${KEY}`;
    
    // 2. [단기예보] (typ02)
    const fcstUrl = `https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstInfoService_2.0/getVilageFcst?dataType=JSON&authKey=${KEY}&base_date=${base_date}&base_time=${base_time}&nx=${nx || 60}&ny=${ny || 121}&numOfRows=1000`;

    const [rAsos, rFcst] = await Promise.all([fetch(asosUrl), fetch(fcstUrl)]);
    const [dAsos, dFcst] = await Promise.all([rAsos.text(), rFcst.json()]); // ASOS는 텍스트 형태일 때가 많음

    // 강수량 추출 (새벽 5시 마지노선 로직)
    const items = dFcst.response?.body?.items?.item || [];
    const rainAmt = items.filter(i => i.category === 'PCP' && parseInt(i.fcstTime) <= 500).reduce((acc, cur) => {
      const v = cur.fcstValue === '강수없음' ? 0 : parseFloat(cur.fcstValue.replace(/[^0-9.]/g, ""));
      return acc + (isNaN(v) ? 0 : v);
    }, 0);

    return res.status(200).json({ rain: rainAmt, isSpecial, items });

  } catch (e) {
    return res.status(200).json({ error: "시스템 점검 중", rain: 0 });
  }
}
