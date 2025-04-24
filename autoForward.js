const { google } = require('googleapis');

async function forwardKohlsEmails(auth) {
    const gmail = google.gmail({ version: 'v1', auth });

    const res = await gmail.users.messages.list({
        userId: 'me',
        q: '(from:Kohls@t.kohls.com OR from:kohls@s.kohls.com) is:unread',
        maxResults: 5,
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
            requestBody: { raw: reEncoded },
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

async function startAutoForwarder(auth) {
    console.log('AutoForwarder is running. Checking for new emails every 60 seconds.');
    while (true) {
        try {
            await forwardKohlsEmails(auth);
        } catch (err) {
            console.error('Error during email forwarding:', err);
        }

        await new Promise(resolve => setTimeout(resolve, 60 * 1000));
    }
}

module.exports = { forwardKohlsEmails, startAutoForwarder };
