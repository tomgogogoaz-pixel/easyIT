const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { name, score } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        const credentialsStr = process.env.GOOGLE_CREDENTIALS;
        
        if (!credentialsStr) {
            console.error("GOOGLE_CREDENTIALS environment variable is not set.");
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const credentials = JSON.parse(credentialsStr);

        const serviceAccountAuth = new JWT({
            email: credentials.client_email,
            key: credentials.private_key,
            scopes: [
                'https://www.googleapis.com/auth/spreadsheets',
            ],
        });

        // The ID of the spreadsheet
        const doc = new GoogleSpreadsheet('1N4C766otSSAFLBarWtJqjCav7feGEl0A2z7rG9Px9lM', serviceAccountAuth);

        await doc.loadInfo(); 
        
        // Find the sheet by title
        const sheet = doc.sheetsByTitle['quiz_records'];
        
        if (!sheet) {
            return res.status(500).json({ error: 'Sheet "quiz_records" not found. Please create it.' });
        }

        // Add row
        // Using array format allows adding data even if headers aren't strictly defined
        await sheet.addRow([name, score, new Date().toLocaleString('ko-KR')]);

        res.status(200).json({ success: true, message: 'Score saved successfully!' });
    } catch (error) {
        console.error('Error saving score:', error);
        res.status(500).json({ error: 'Failed to save score.' });
    }
};
