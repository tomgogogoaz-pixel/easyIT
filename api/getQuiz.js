const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

module.exports = async (req, res) => {
    // CORS 설정
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
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
            scopes: ['https://www.googleapis.com/auth/spreadsheets'], // 읽기, 쓰기 모두 가능한 스코프로 통일
        });

        // "easyIT" 스프레드시트 고유 ID (절대 변경하지 마세요)
        const doc = new GoogleSpreadsheet('1N4C766otSSAFLBarWtJqjCav7feGEl0A2z7rG9Px9lM', serviceAccountAuth);

        // 시트 기본 정보 로드 (이 시점에서 권한 오류가 발생하면 서비스 계정 공유가 안 된 것입니다)
        await doc.loadInfo(); 
        
        // 첫 번째 시트 (문제 데이터가 있는 곳)
        const sheet = doc.sheetsByIndex[0]; 
        const rows = await sheet.getRows();
        
        const data = rows.map(row => {
            // 헤더 이름이 조금 달라도 데이터를 가져올 수 있도록 유연하게 매핑
            const rowData = row.toObject();
            return {
                ImageURL: rowData['ImageURL'] || rowData['이미지주소'] || row._rawData[0] || '',
                Option1: rowData['Option1'] || rowData['보기1'] || row._rawData[1] || '',
                Option2: rowData['Option2'] || rowData['보기2'] || row._rawData[2] || '',
                Option3: rowData['Option3'] || rowData['보기3'] || row._rawData[3] || '',
                Option4: rowData['Option4'] || rowData['보기4'] || row._rawData[4] || '',
                Answer: rowData['Answer'] || rowData['정답'] || row._rawData[5] || ''
            };
        });

        res.status(200).json(data);
    } catch (error) {
        console.error('스프레드시트 가져오기 에러:', error);
        res.status(500).json({ 
            error: '시트 데이터를 불러오지 못했습니다. 서비스 계정이 편집자로 초대되어 있는지 확인하세요.', 
            details: error.message 
        });
    }
};
