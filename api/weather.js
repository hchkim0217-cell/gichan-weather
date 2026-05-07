export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const KEY = process.env.KMA_API_KEY; 
  const { type, nx, ny, region, base_date, base_time } = req.query;

  // 1. 전국 특수 지형 감지 (현철 님 지시사항)
  const isSpecial = /시흥|배곧|인천|안산|김포|강화|양평|가평|청평|포항|울산|부산|여수|목포|군산|강릉|속초|제주|산|강|포|항|천|호|도/.test(region || "");

  try {
    // 2. 기상청 API 허브 전용 주소 체계 적용
    // [단기예보] 주소 (typ02)
    const fcstUrl = `https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstInfoService_2.0/getVilageFcst?dataType=JSON&authKey=${KEY}&base_date=${base_date}&base_time=${base_time}&nx=${nx || 60}&ny=${ny || 121}&numOfRows=1000`;
    
    const r = await fetch(fcstUrl);
    
    // 기상청이 아직 권한 승인을 안 해줘서 에러를 뱉을 때를 대비
    if (!r.ok) {
      return res.status(200).json({ error: "기상청 승인 대기 중", rain: 0, isSpecial });
    }

    const data = await r.json();
    const items = data.response?.body?.items?.item || [];

    // 3. [0.3mm & 새벽 5시] 판정 로직
    const tomorrowStr = String(Number(base_date) + 1);
    const rainItems = items.filter(i => 
      (i.fcstDate === base_date && parseInt(i.fcstTime) >= 1200) || 
      (i.fcstDate === tomorrowStr && parseInt(i.fcstTime) <= 0500)
    ).filter(i => i.category === 'PCP');

    const totalRain = rainItems.reduce((acc, cur) => {
      const v = cur.fcstValue === '강수없음' ? 0 : parseFloat(cur.fcstValue.replace(/[^0-9.]/g, ""));
      return acc + (isNaN(v) ? 0 : v);
    }, 0);

    return res.status(200).json({ 
      rain: parseFloat(totalRain.toFixed(1)), 
      isSpecial, 
      items 
    });

  } catch (e) {
    // 500 에러로 죽지 않게 방어막 설치
    return res.status(200).json({ error: "통신 준비 중", rain: 0, isSpecial });
  }
}
