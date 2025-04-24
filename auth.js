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

    if (fs.existsSync(TOKEN_PATH)) {
        oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));
        return oAuth2Client;
    }

    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });

    console.log('\nAuthorize this app by visiting this URL:\n\n' + authUrl + '\n');

    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve, reject) => {
        readline.question('Paste the code here: ', (code) => {
            readline.close();
            oAuth2Client.getToken(code, (err, token) => {
                if (err) return reject('Error retrieving access token: ' + err);
                oAuth2Client.setCredentials(token);
                fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
                console.log('Token stored to ' + TOKEN_PATH);
                resolve(oAuth2Client);
            });
        });
    });
}

module.exports = { authenticate };
