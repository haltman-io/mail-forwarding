const { app } = require('./app');

const WS_LOCAL_ADDR = '127.0.0.1';
const WS_LOCAL_PORT = '8080';

app.listen(WS_LOCAL_PORT, WS_LOCAL_ADDR, () => {
    console.log(`[WS] Web Server listening on port ${WS_LOCAL_ADDR} | http://${WS_LOCAL_ADDR}:${WS_LOCAL_PORT}`)
});