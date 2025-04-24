const { google } = require('googleapis');

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
                requestBody: { raw: reEncoded },
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
        output: process.stdout,
    });

    console.log('Type "M" + Enter at any time to manually forward all Kohl\'s emails from a date.');

    rl.on('line', (input) => {
        if (input.trim().toUpperCase() === 'M') {
            rl.question('Enter start date (YYYY-MM-DD): ', async (dateInput) => {
                console.log('Running manual forwarder...');
                try {
                    await forwardAllSinceDate(auth, dateInput);
                } catch (err) {
                    console.error('Manual forwarder failed:', err);
                }

                console.log('Type "M" + Enter at any time to manually forward all Kohl\'s emails from a date.');
            });
        }
    });
}

module.exports = { listenForManualCommand };
