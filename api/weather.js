export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const KEY = process.env.KMA_API_KEY;
  const { type, nx, ny, base_date, base_time, regId, tmFc, region, target_date } = req.query;

  // 🌟 [개선] 요청한 날짜(target_date)의 전날 강수량 가져오기
  if (type === 'past_rain') {
    const stnMap = { "서울":"108", "경기도":"119", "인천":"112", "부산":"159", "대구":"143", "광주":"156", "대전":"133", "울산":"152", "세종":"239", "강원도":"105", "충청북도":"131", "충청남도":"232", "전라북도":"146", "전라남도":"165", "경상북도":"143", "경상남도":"152", "제주":"184" };
    const stnId = stnMap[region] || "108"; 
    
    // 사용자가 선택한 날짜의 1일 전 계산
    const tDate = target_date ? new Date(target_date.substring(0,4), target_date.substring(4,6)-1, target_date.substring(6,8)) : new Date();
    tDate.setDate(tDate.getDate() - 1);
    const yStr = `${tDate.getFullYear()}${String(tDate.getMonth()+1).padStart(2,'0')}${String(tDate.getDate()).padStart(2,'0')}`;
    
    // 현재 시간보다 과거인지 확인 (과거면 ASOS 관측값, 미래면 0처리 - 프론트에서 보완)
    const todayStr = new Date().toISOString().slice(0,10).replace(/-/g,'');
    
    const url = `https://apihub.kma.go.kr/api/typ02/openApi/AsosDalyInfoService/getWthrDataList`
      + `?pageNo=1&numOfRows=10&dataType=JSON&dataCd=ASOS&dateCd=DAY`
      + `&startDt=${yStr}&endDt=${yStr}&stnIds=${stnId}&authKey=${KEY}`;
      
    try {
      const r = await fetch(url);
      const data = await r.json();
      const item = data.response?.body?.items?.item?.[0];
      const rainAmount = item?.sumRn ? parseFloat(item.sumRn) : 0;
      return res.status(200).json({ rain: rainAmount, date: yStr });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // ... (이하 단기/중기 예보 코드는 이전과 동일하므로 생략 - 기존 코드 유지)
  // (실제 복붙하실 때는 기존에 제가 드렸던 전체 백엔드 코드를 유지하시되, 
  //  맨 윗부분의 past_rain 로직만 위 내용으로 바꾸시면 됩니다.)
}
