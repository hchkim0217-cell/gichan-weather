export default async function handler(req, res) {
  const { nx, ny, base_date, base_time } = req.query;
  const API_KEY = process.env.KMA_API_KEY;

  const url = `https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstInfoService_2.0/getVilageFcst` +
    `?pageNo=1&numOfRows=1000&dataType=JSON` +
    `&base_date=${base_date}&base_time=${base_time}` +
    `&nx=${nx}&ny=${ny}&authKey=${API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
