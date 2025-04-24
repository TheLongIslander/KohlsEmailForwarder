require('dotenv').config();
const { authenticate } = require('./auth');
const { startAutoForwarder } = require('./autoForward');
const { listenForManualCommand } = require('./manualForward');

(async () => {
    const auth = await authenticate();
    if (auth) {
        listenForManualCommand(auth);
        startAutoForwarder(auth);
    }
})();
