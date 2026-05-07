export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const KEY = process.env.KMA_API_KEY; 
  const { type, nx, ny, region, base_date, base_time, day_off } = req.query;

  // 1. 전국 지형 자동 분석 (현철 님 지시: 전국 키워드 확장)
  const isSpecialTerrain = /시흥|배곧|인천|안산|김포|강화|양평|가평|청평|포항|울산|부산|여수|목포|군산|강릉|속초|제주|산|강|포|항|천|호|도/.test(region || "");

  try {
    // 기존 앱이 성공했던 그 주소(단기예보)만 사용합니다.
    const url = `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?serviceKey=${KEY}&numOfRows=1000&pageNo=1&dataType=JSON&base_date=${base_date}&base_time=${base_time}&nx=${nx}&ny=${ny}`;
    
    const r = await fetch(url);
    const data = await r.json();
    const items = data.response?.body?.items?.item || [];

    // 2. 새벽 5시 마지노선 강수량 계산 (0.3mm 기준)
    const todayStr = base_date;
    const tomorrowStr = String(parseInt(base_date) + 1);
    
    // 분석 범위: 오늘 오후 12시 ~ 내일 새벽 05시 (현철 님 지시 반영)
    const targetItems = items.filter(i => 
      (i.fcstDate === todayStr && parseInt(i.fcstTime) >= 1200) || 
      (i.fcstDate === tomorrowStr && parseInt(i.fcstTime) <= 0500)
    );

    const resultRain = targetItems.filter(i => i.category === 'PCP').reduce((acc, cur) => {
        const val = cur.fcstValue === '강수없음' ? 0 : parseFloat(cur.fcstValue.replace(/[^0-9.]/g, ""));
        return acc + (isNaN(val) ? 0 : val);
    }, 0);

    return res.status(200).json({ 
      rain: parseFloat(resultRain.toFixed(1)), 
      isSpecial: isSpecialTerrain,
      items: items // 기존 화면 렌더링용 데이터 유지
    });

  } catch (e) {
    return res.status(200).json({ rain: 0, isSpecial: isSpecialTerrain, error: "통신 확인" });
  }
}
