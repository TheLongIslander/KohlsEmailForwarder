const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
require('dotenv').config();

const SCOPES = ['https://www.googleapis.com/auth/gmail.modify'];
const TOKEN_PATH = path.join(__dirname, 'token.json');
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';

async function authenticate() {
    const credentials = JSON.parse(fs.readFileSync('client_secret.json'));
    const { client_secret, client_id } = credentials.installed;

    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, REDIRECT_URI
    );

    if (fs.existsSync(TOKEN_PATH)) {
        oAuth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH)));
        return oAuth2Client;
    } else {
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
}

async function forwardKohlsEmails(auth) {
    const gmail = google.gmail({ version: 'v1', auth });

    const res = await gmail.users.messages.list({
        userId: 'me',
        q: '(from:Kohls@t.kohls.com OR from:kohls@s.kohls.com) is:unread',
        maxResults: 5
    });

    const messages = res.data.messages || [];

    if (messages.length === 0) {
        console.log('No new Kohl\'s emails found.');
        return;
    }

    for (const msg of messages) {
        const full = await gmail.users.messages.get({
            userId: 'me',
            id: msg.id,
            format: 'raw',
        });

        const rawMessage = full.data.raw;

        const decoded = Buffer.from(rawMessage, 'base64').toString('utf-8');
        const updated = decoded.replace(/^To: .*$/m, `To: ${process.env.FORWARD_TO}`);
        const reEncoded = Buffer.from(updated)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: reEncoded,
            },
        });

        await gmail.users.messages.modify({
            userId: 'me',
            id: msg.id,
            requestBody: {
                removeLabelIds: ['UNREAD'],
            },
        });

        console.log('Forwarded and marked as read: ' + msg.id);
    }
}

async function forwardAllSinceDate(auth, dateStr) {
    const gmail = google.gmail({ version: 'v1', auth });
    const query = `(from:Kohls@t.kohls.com OR from:kohls@s.kohls.com) after:${dateStr.replace(/-/g, '/')}`;
    let nextPageToken = null;
    let totalForwarded = 0;

    do {
        const res = await gmail.users.messages.list({
            userId: 'me',
            q: query,
            maxResults: 100,
            pageToken: nextPageToken || undefined,
        });

        const messages = res.data.messages || [];
        nextPageToken = res.data.nextPageToken;

        for (const msg of messages) {
            const full = await gmail.users.messages.get({
                userId: 'me',
                id: msg.id,
                format: 'raw',
            });

            const rawMessage = full.data.raw;
            const decoded = Buffer.from(rawMessage, 'base64').toString('utf-8');
            const updated = decoded.replace(/^To: .*$/m, `To: ${process.env.FORWARD_TO}`);
            const reEncoded = Buffer.from(updated)
                .toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

            await gmail.users.messages.send({
                userId: 'me',
                requestBody: {
                    raw: reEncoded,
                },
            });

            totalForwarded++;
            console.log('Backforwarded: ' + msg.id);
        }
    } while (nextPageToken);

    console.log(`Done. Total messages forwarded since ${dateStr}: ${totalForwarded}`);
}
function listenForManualCommand(auth) {
    const rl = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log('Type "M" + Enter at any time to manually forward all Kohl\'s emails from a date.');

    rl.on('line', (input) => {
        const trimmed = input.trim().toUpperCase();

        if (trimmed === 'M') {
            rl.question('Enter start date (YYYY-MM-DD): ', async (dateInput) => {
                console.log('Running manual forwarder...');
                try {
                    await forwardAllSinceDate(auth, dateInput);
                } catch (err) {
                    console.error('Manual forwarder failed:', err);
                }

                // Re-display the manual mode message after it's done
                console.log('Type "M" + Enter at any time to manually forward all Kohl\'s emails from a date.');
            });
        }
    });
}


async function startAutoForwarder() {
    console.log('AutoForwarder is running. Checking for new emails every 60 seconds.');
    while (true) {
        try {
            const auth = await authenticate();
            if (auth) await forwardKohlsEmails(auth);
        } catch (err) {
            console.error('Error during email forwarding:', err);
        }

        await new Promise(resolve => setTimeout(resolve, 60 * 1000));
    }
}

(async () => {
    const auth = await authenticate();
    if (auth) {
        listenForManualCommand(auth);
        startAutoForwarder();
    }
})();
