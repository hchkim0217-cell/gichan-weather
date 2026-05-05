export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const KEY = process.env.KMA_API_KEY;
  const { type, nx, ny, base_date, base_time, regId, tmFc } = req.query;

  let url = '';

  if (type === 'short') {
    // 단기예보 (오늘~모레, 1~3시간 간격)
    url = `https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstInfoService_2.0/getVilageFcst`
      + `?pageNo=1&numOfRows=1000&dataType=JSON`
      + `&base_date=${base_date}&base_time=${base_time}`
      + `&nx=${nx}&ny=${ny}&authKey=${KEY}`;

  } else if (type === 'ultra_short') {
    // 초단기예보 (향후 6시간, 1시간 간격, 더 정확)
    url = `https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstInfoService_2.0/getUltraSrtFcst`
      + `?pageNo=1&numOfRows=300&dataType=JSON`
      + `&base_date=${base_date}&base_time=${base_time}`
      + `&nx=${nx}&ny=${ny}&authKey=${KEY}`;

  } else if (type === 'mid_land') {
    url = `https://apihub.kma.go.kr/api/typ02/openApi/MidFcstInfoService/getMidLandFcst`
      + `?pageNo=1&numOfRows=10&dataType=JSON`
      + `&regId=${regId}&tmFc=${tmFc}&authKey=${KEY}`;

  } else if (type === 'mid_temp') {
    url = `https://apihub.kma.go.kr/api/typ02/openApi/MidFcstInfoService/getMidTa`
      + `?pageNo=1&numOfRows=10&dataType=JSON`
      + `&regId=${regId}&tmFc=${tmFc}&authKey=${KEY}`;
  }

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
