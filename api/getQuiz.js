const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

// Vercel 환경변수 복사/붙여넣기 시 발생하는 JSON 깨짐 현상을 완벽하게 복구하는 함수
function parseSecureCredentials(envStr) {
    let email, privateKey;
    
    // 1. 이메일 추출 (정규식 기반으로 따옴표가 깨져도 추출 가능)
    const emailMatch = envStr.match(/client_email["'\s:]+([^"'\s,]+)/);
    email = emailMatch ? emailMatch[1] : null;

    // 2. Private Key 추출 및 완벽한 PEM 형식으로 복구 (줄바꿈 기호나 띄어쓰기가 망가져도 복구 가능)
    const keyMatch = envStr.match(/-----BEGIN PRIVATE KEY-----(.*?)-----END PRIVATE KEY-----/s);
    if (keyMatch) {
        // 내부의 모든 공백 문자, 이스케이프된 \n 기호를 전부 제거하여 순수 Base64 문자열만 추출
        let keyBody = keyMatch[1].replace(/\\n/g, '').replace(/\s+/g, '');
        // PEM 표준 규격인 64자 단위로 줄바꿈을 다시 삽입
        let formattedKeyBody = keyBody.match(/.{1,64}/g).join('\n');
        privateKey = `-----BEGIN PRIVATE KEY-----\n${formattedKeyBody}\n-----END PRIVATE KEY-----\n`;
    }

    // 정규식으로 추출 실패 시 기본 JSON 파싱 시도
    if (!email || !privateKey) {
        try {
            const parsed = JSON.parse(envStr);
            email = email || parsed.client_email;
            privateKey = privateKey || parsed.private_key.replace(/\\n/g, '\n');
        } catch (e) {
            throw new Error('환경 변수에서 이메일과 프라이빗 키를 추출할 수 없습니다.');
        }
    }
    
    return { client_email: email, private_key: privateKey };
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const credentialsStr = process.env.GOOGLE_CREDENTIALS;
        if (!credentialsStr) {
            return res.status(500).json({ error: '서버에 GOOGLE_CREDENTIALS 환경 변수가 없습니다.' });
        }

        const credentials = parseSecureCredentials(credentialsStr);

        const serviceAccountAuth = new JWT({
            email: credentials.client_email,
            key: credentials.private_key,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const doc = new GoogleSpreadsheet('1N4C766otSSAFLBarWtJqjCav7feGEl0A2z7rG9Px9lM', serviceAccountAuth);
        await doc.loadInfo(); 
        
        const sheet = doc.sheetsByIndex[0]; 
        const rows = await sheet.getRows();
        
        const data = rows.map(row => {
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
        console.error('스프레드시트 에러:', error);
        res.status(500).json({ error: '데이터를 불러오지 못했습니다.', details: error.message });
    }
};
