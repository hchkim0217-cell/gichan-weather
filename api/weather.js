export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const KEY = process.env.KMA_API_KEY;
  const { type, nx, ny, region, day_off, base_date, base_time } = req.query;

  // [지형 분석]
  const isHumidRegion = /시흥|배곧|인천|안산|김포|강화|양평|가평|청평/.test(region || "");

  try {
    if (type === 'past_rain') {
      const dayOffNum = parseInt(day_off);
      
      // 1. [오늘] 탭: 어제의 실측 데이터 (ASOS)
      if (dayOffNum === 0) {
        const stnMap = { "서울":"108", "경기도":"119", "인천":"112", "부산":"159", "대구":"143", "광주":"156", "대전":"133", "울산":"152", "세종":"239", "강원도":"105", "충청북도":"131", "충청남도":"232", "전라북도":"146", "전라남도":"165", "경상북도":"143", "경상남도":"152", "제주":"184" };
        const stnId = stnMap[region] || "108";
        const tDate = new Date(); tDate.setDate(tDate.getDate() - 1);
        const yStr = `${tDate.getFullYear()}${String(tDate.getMonth()+1).padStart(2,'0')}${String(tDate.getDate()).padStart(2,'0')}`;
        
        const url = `https://apihub.kma.go.kr/api/typ02/openApi/AsosDalyInfoService/getWthrDataList?pageNo=1&numOfRows=10&dataType=JSON&dataCd=ASOS&dateCd=DAY&startDt=${yStr}&endDt=${yStr}&stnIds=${stnId}&authKey=${KEY}`;
        const r = await fetch(url);
        const data = await r.json();
        const item = data.response?.body?.items?.item?.[0];
        return res.status(200).json({ rain: item?.sumRn ? parseFloat(item.sumRn) : 0, isHumidArea: isHumidRegion });
      } 
      
      // 2. [내일] 탭: 오늘 오후 ~ 내일 새벽 예보 정밀 분석
      else {
        const todayStr = new Date().toISOString().slice(0,10).replace(/-/g,'');
        const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0,10).replace(/-/g,'');
        const url = `https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstInfoService_2.0/getVilageFcst?pageNo=1&numOfRows=1000&dataType=JSON&base_date=${base_date}&base_time=${base_time}&nx=${nx}&ny=${ny}&authKey=${KEY}`;
        
        const r = await fetch(url);
        const data = await r.json();
        const items = data.response?.body?.items?.item || [];
        
        const focusItems = items.filter(i => 
          (i.fcstDate === todayStr && parseInt(i.fcstTime) >= 1200) || 
          (i.fcstDate === tomorrowStr && parseInt(i.fcstTime) <= 0600)
        );

        const nightRain = focusItems.some(i => i.category === 'PCP' && i.fcstValue !== '강수없음');
        const totalRain = focusItems
          .filter(i => i.category === 'PCP')
          .reduce((acc, cur) => acc + (cur.fcstValue === '강수없음' ? 0 : parseFloat(cur.fcstValue.replace('mm',''))), 0);

        return res.status(200).json({ 
          rain: parseFloat(totalRain.toFixed(1)), 
          hasNightRain: nightRain,
          isHumidArea: isHumidRegion 
        });
      }
    }

    if (type === 'short') {
      const url = `https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstInfoService_2.0/getVilageFcst?pageNo=1&numOfRows=1000&dataType=JSON&base_date=${base_date}&base_time=${base_time}&nx=${nx}&ny=${ny}&authKey=${KEY}`;
      const r = await fetch(url);
      const data = await r.json();
      return res.status(200).json(data.response?.body?.items?.item || []);
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
