export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const KEY = process.env.KMA_API_KEY; 
  const { type, nx, ny, region, day_off, base_date, base_time } = req.query;

  // 1. 전국구 지형 자동 분석 로직 (수변, 산간, 섬 등)
  const isSpecialTerrain = /시흥|배곧|인천|안산|김포|강화|양평|가평|청평|포항|울산|부산|여수|목포|군산|강릉|속초|제주|산|강|포|항|천|호|도/.test(region || "");

  try {
    let url = "";
    const dayOffNum = parseInt(day_off || "0");

    if (type === 'past_rain') {
      if (dayOffNum === 0) {
        // [오늘 탭] 어제 00시 ~ 오늘 새벽 05시 실측 (ASOS)
        const tDate = new Date(); tDate.setDate(tDate.getDate() - 1);
        const yStr = `${tDate.getFullYear()}${String(tDate.getMonth()+1).padStart(2,'0')}${String(tDate.getDate()).padStart(2,'0')}`;
        url = `http://apis.data.go.kr/1360000/AsosDalyInfoService/getWthrDataList?serviceKey=${KEY}&numOfRows=10&pageNo=1&dataType=JSON&dataCd=ASOS&dateCd=DAY&startDt=${yStr}&endDt=${yStr}&stnIds=108`;
      } else {
        // [내일 탭] 오늘 12시 ~ 내일 새벽 05시 예보 (VilageFcst)
        url = `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?serviceKey=${KEY}&numOfRows=1000&pageNo=1&dataType=JSON&base_date=${base_date}&base_time=${base_time}&nx=${nx || 60}&ny=${ny || 121}`;
      }
    } else if (type === 'short') {
      url = `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?serviceKey=${KEY}&numOfRows=1000&pageNo=1&dataType=JSON&base_date=${base_date}&base_time=${base_time}&nx=${nx || 60}&ny=${ny || 121}`;
    }

    const r = await fetch(url);
    const data = await r.json();
    const items = data.response?.body?.items?.item || [];

    let resultRain = 0;
    if (type === 'past_rain') {
      if (dayOffNum === 0) {
        resultRain = parseFloat(items[0]?.sumRn || 0);
      } else {
        // 내일 새벽 05시까지의 예보 합산
        const todayStr = base_date;
        const tomorrowStr = String(parseInt(base_date) + 1);
        const targetItems = items.filter(i => 
          (i.fcstDate === todayStr && parseInt(i.fcstTime) >= 1200) || 
          (i.fcstDate === tomorrowStr && parseInt(i.fcstTime) <= 0500)
        );
        resultRain = targetItems.filter(i => i.category === 'PCP').reduce((acc, cur) => {
            const val = cur.fcstValue === '강수없음' ? 0 : parseFloat(cur.fcstValue.replace(/[^0-9.]/g, ""));
            return acc + (isNaN(val) ? 0 : val);
        }, 0);
      }
    }

    return res.status(200).json({ 
      rain: parseFloat(resultRain.toFixed(1)), 
      isSpecial: isSpecialTerrain,
      items: items 
    });

  } catch (e) {
    return res.status(200).json({ rain: 0, isSpecial: isSpecialTerrain, error: "통신 확인 중" });
  }
}
