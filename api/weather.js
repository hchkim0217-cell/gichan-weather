export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const KEY = decodeURIComponent(process.env.KMA_API_KEY); // 기존 열쇠 그대로 사용!
  const { type, nx, ny, region, day_off, base_date, base_time } = req.query;

  const isHumidRegion = /시흥|배곧|인천|안산|김포|강화|양평|가평|청평/.test(region || "");

  try {
    // 1. 과거 실측 및 야간 예보 분석
    if (type === 'past_rain') {
      const dayOffNum = parseInt(day_off || "0");
      
      // 주소를 다시 '공공데이터포털'용으로 수정했습니다!
      let url = "";
      if (dayOffNum === 0) {
        // [오늘 탭] 어제 실측 (기존에 잘 되던 주소 방식)
        const tDate = new Date(); tDate.setDate(tDate.getDate() - 1);
        const yStr = `${tDate.getFullYear()}${String(tDate.getMonth()+1).padStart(2,'0')}${String(tDate.getDate()).padStart(2,'0')}`;
        url = `http://apis.data.go.kr/1360000/AsosDalyInfoService/getWthrDataList?serviceKey=${KEY}&numOfRows=10&pageNo=1&dataType=JSON&dataCd=ASOS&dateCd=DAY&startDt=${yStr}&endDt=${yStr}&stnIds=108`;
      } else {
        // [내일 탭] 예보 데이터로 야간 비 판단
        url = `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?serviceKey=${KEY}&numOfRows=1000&pageNo=1&dataType=JSON&base_date=${base_date}&base_time=${base_time}&nx=${nx || 60}&ny=${ny || 120}`;
      }

      const r = await fetch(url);
      const data = await r.json();
      
      // 내일 탭일 때 야간 비 계산 로직
      if (dayOffNum !== 0) {
        const items = data.response?.body?.items?.item || [];
        const todayStr = base_date;
        const tomorrowStr = String(parseInt(base_date) + 1);
        const focusItems = items.filter(i => (i.fcstDate === todayStr && parseInt(i.fcstTime) >= 1200) || (i.fcstDate === tomorrowStr && parseInt(i.fcstTime) <= 0600));
        const hasNightRain = focusItems.some(i => i.category === 'PCP' && i.fcstValue !== '강수없음');
        const rain = focusItems.filter(i => i.category === 'PCP').reduce((acc, cur) => acc + (cur.fcstValue === '강수없음' ? 0 : parseFloat(cur.fcstValue)), 0);
        return res.status(200).json({ rain, hasNightRain, isHumidArea: isHumidRegion });
      }

      const rain = data.response?.body?.items?.item?.[0]?.sumRn || 0;
      return res.status(200).json({ rain: parseFloat(rain), isHumidArea: isHumidRegion });
    }

    // 2. 단기 예보 (기존 주소 방식)
    if (type === 'short') {
      const url = `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?serviceKey=${KEY}&numOfRows=1000&pageNo=1&dataType=JSON&base_date=${base_date}&base_time=${base_time}&nx=${nx || 60}&ny=${ny || 120}`;
      const r = await fetch(url);
      const data = await r.json();
      return res.status(200).json(data.response?.body?.items?.item || []);
    }
  } catch (e) {
    return res.status(200).json({ rain: 0, isHumidArea: isHumidRegion, error: e.message });
  }
}
