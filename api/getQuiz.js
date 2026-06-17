const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

module.exports = async (req, res) => {
    // Enable CORS for testing if needed
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        // Parse the credentials from the Environment Variable
        const credentialsStr = process.env.GOOGLE_CREDENTIALS;
        
        if (!credentialsStr) {
            console.error("GOOGLE_CREDENTIALS environment variable is not set.");
            return res.status(500).json({ error: 'Server configuration error: GOOGLE_CREDENTIALS not set' });
        }

        const credentials = JSON.parse(credentialsStr);

        const serviceAccountAuth = new JWT({
            email: credentials.client_email,
            key: credentials.private_key,
            scopes: [
                'https://www.googleapis.com/auth/spreadsheets.readonly',
            ],
        });

        // The ID of the spreadsheet (from the user's URL)
        const doc = new GoogleSpreadsheet('1N4C766otSSAFLBarWtJqjCav7feGEl0A2z7rG9Px9lM', serviceAccountAuth);

        await doc.loadInfo(); 
        const sheet = doc.sheetsByIndex[0]; // Get the first sheet
        
        const rows = await sheet.getRows();
        
        // Map the rows to our expected JSON format
        const data = rows.map(row => {
            return {
                ImageURL: row.get('ImageURL'),
                Option1: row.get('Option1'),
                Option2: row.get('Option2'),
                Option3: row.get('Option3'),
                Option4: row.get('Option4'),
                Answer: row.get('Answer')
            };
        });

        res.status(200).json(data);
    } catch (error) {
        console.error('Error fetching spreadsheet:', error);
        res.status(500).json({ error: 'Failed to fetch quiz data from spreadsheet.' });
    }
};
