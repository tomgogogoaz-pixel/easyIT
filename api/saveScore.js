const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

module.exports = async (req, res) => {
    // CORS 설정
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { name, score } = req.body;
        if (!name) return res.status(400).json({ error: '이름을 입력해주세요.' });

        const credentialsStr = process.env.GOOGLE_CREDENTIALS;
        if (!credentialsStr) {
            return res.status(500).json({ error: '서버에 GOOGLE_CREDENTIALS 환경 변수가 설정되지 않았습니다.' });
        }

        let credentials;
        try {
            credentials = JSON.parse(credentialsStr);
        } catch (e) {
            return res.status(500).json({ error: '환경 변수 파싱 에러. JSON 형식이 올바른지 확인해주세요.' });
        }

        // Vercel 환경변수에서 줄바꿈 문자가 이스케이프 된 경우를 대비한 안전한 처리
        const privateKey = credentials.private_key.replace(/\\n/g, '\n');

        const serviceAccountAuth = new JWT({
            email: credentials.client_email,
            key: privateKey,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'], // 쓰기 권한
        });

        // "easyIT" 스프레드시트 고유 ID (절대 변경하지 마세요)
        const doc = new GoogleSpreadsheet('1N4C766otSSAFLBarWtJqjCav7feGEl0A2z7rG9Px9lM', serviceAccountAuth);

        // 시트 기본 정보 로드
        await doc.loadInfo(); 
        
        // 시트 이름 불일치를 대비하여 여러 이름으로 검색 시도
        let sheet = doc.sheetsByTitle['quiz_records'];
        if (!sheet) sheet = doc.sheetsByTitle['퀴즈기록'];
        if (!sheet) sheet = doc.sheetsByTitle['Sheet2']; 
        
        if (!sheet) {
            return res.status(500).json({ error: '기록을 저장할 탭(quiz_records)을 찾을 수 없습니다.' });
        }

        // 헤더에 의존하지 않고 배열 형식으로 데이터 밀어넣기 (Append)
        await sheet.addRow([name, score, new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })]);

        res.status(200).json({ success: true, message: '점수가 성공적으로 저장되었습니다!' });
    } catch (error) {
        console.error('점수 저장 에러:', error);
        res.status(500).json({ 
            error: '점수를 저장하는 데 실패했습니다. 시트 권한 및 구성을 확인하세요.', 
            details: error.message 
        });
    }
};
