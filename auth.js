const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/gmail.modify'];
const TOKEN_PATH = path.join(__dirname, 'token.json');
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';

async function authenticate() {
    const credentials = JSON.parse(fs.readFileSync('client_secret.json'));
    const { client_secret, client_id } = credentials.installed;

    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, REDIRECT_URI);

    // Validate existing token
    if (fs.existsSync(TOKEN_PATH)) {
        const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
        oAuth2Client.setCredentials(token);

        try {
            await oAuth2Client.getAccessToken(); // trigger refresh
            return oAuth2Client;
        } catch (err) {
            if (err.response?.data?.error === 'invalid_grant') {
                console.warn('[AUTH] Stored refresh token was revoked. Reauthenticating...');
                fs.unlinkSync(TOKEN_PATH);
                return await authenticate(); // retry
            }
            throw err;
        }
    }

    // 🛡️ Ensure refresh token is always granted
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent', // 👈 guarantees refresh_token is included
        scope: SCOPES,
    });

    console.log('\n[AUTH] Authorize this app by visiting this URL:\n\n' + authUrl + '\n');

    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve, reject) => {
        readline.question('Paste the code here: ', (code) => {
            readline.close();
            oAuth2Client.getToken(code, (err, token) => {
                if (err) return reject('Error retrieving access token: ' + err);

                if (!token.refresh_token) {
                    console.warn('[AUTH] WARNING: No refresh token received. Auth was likely reused. Aborting.');
                    return reject('No refresh token received — you must use prompt: "consent" or remove stored grants.');
                }

                oAuth2Client.setCredentials(token);
                fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2));
                console.log('[AUTH] Token stored to ' + TOKEN_PATH);
                resolve(oAuth2Client);
            });
        });
    });
}

module.exports = { authenticate };
