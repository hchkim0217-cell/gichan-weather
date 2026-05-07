export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const KEY = process.env.KMA_API_KEY;
  const { type, nx, ny, region, day_off, base_date, base_time } = req.query;

  // 지역별 지형 가중치 여부
  const isHumidRegion = /시흥|배곧|인천|안산|김포|강화|양평|가평|청평/.test(region || "");

  try {
    // 1. 과거 실측 및 야간 예보 분석 로직
    if (type === 'past_rain') {
      const dayOffNum = parseInt(day_off || "0");
      if (dayOffNum === 0) {
        // 오늘 탭: 어제 실측
        const stnMap = { "서울":"108", "경기도":"119", "인천":"112", "부산":"159", "대구":"143", "광주":"156", "대전":"133", "울산":"152", "세종":"239", "강원도":"105", "충청북도":"131", "충청남도":"232", "전라북도":"146", "전라남도":"165", "경상북도":"143", "경상남도":"152", "제주":"184" };
        const stnId = stnMap[region] || "108";
        const tDate = new Date(); tDate.setDate(tDate.getDate() - 1);
        const yStr = `${tDate.getFullYear()}${String(tDate.getMonth()+1).padStart(2,'0')}${String(tDate.getDate()).padStart(2,'0')}`;
        
        const url = `https://apihub.kma.go.kr/api/typ02/openApi/AsosDalyInfoService/getWthrDataList?pageNo=1&numOfRows=10&dataType=JSON&dataCd=ASOS&dateCd=DAY&startDt=${yStr}&endDt=${yStr}&stnIds=${stnId}&authKey=${KEY}`;
        const r = await fetch(url);
        const data = await r.json();
        const item = data.response?.body?.items?.item?.[0];
        return res.status(200).json({ rain: item?.sumRn ? parseFloat(item.sumRn) : 0, isHumidArea: isHumidRegion });
      } else {
        // 내일 탭: 오늘 오후 ~ 내일 새벽 예보
        const url = `https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstInfoService_2.0/getVilageFcst?pageNo=1&numOfRows=1000&dataType=JSON&base_date=${base_date}&base_time=${base_time}&nx=${nx || 60}&ny=${ny || 120}&authKey=${KEY}`;
        const r = await fetch(url);
        const data = await r.json();
        const items = data.response?.body?.items?.item || [];
        const todayStr = base_date;
        const tomorrowStr = String(parseInt(base_date) + 1);

        const focusItems = items.filter(i => 
          (i.fcstDate === todayStr && parseInt(i.fcstTime) >= 1200) || 
          (i.fcstDate === tomorrowStr && parseInt(i.fcstTime) <= 0600)
        );

        const hasNightRain = focusItems.some(i => i.category === 'PCP' && i.fcstValue !== '강수없음');
        const totalRain = focusItems
          .filter(i => i.category === 'PCP')
          .reduce((acc, cur) => acc + (cur.fcstValue === '강수없음' ? 0 : parseFloat(cur.fcstValue.replace(/[^0-9.]/g, ""))), 0);
        return res.status(200).json({ rain: parseFloat(totalRain.toFixed(1)), hasNightRain, isHumidArea: isHumidRegion });
      }
    }

    // 2. 일반 단기 예보 (결로용)
    if (type === 'short') {
      const url = `https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstInfoService_2.0/getVilageFcst?pageNo=1&numOfRows=1000&dataType=JSON&base_date=${base_date}&base_time=${base_time}&nx=${nx || 60}&ny=${ny || 120}&authKey=${KEY}`;
      const r = await fetch(url);
      const data = await r.json();
      return res.status(200).json(data.response?.body?.items?.item || []);
    }
  } catch (e) {
    // ⚠️ 에러 발생 시 멈추지 말고 빈 데이터라도 보내주기
    return res.status(200).json({ rain: 0, isHumidArea: isHumidRegion, error: e.message });
  }
}
