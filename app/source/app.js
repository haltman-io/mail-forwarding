// Importing custom functions
const { app_environment } = require("./config/app_environment");

// Importing libraries
const express = require('express');
const app = express()

// Importing the router
const { router } = require('./routers/router')

/*
// Se você estiver atrás de Nginx/Cloudflare/LB, isso é obrigatório pra req.ip ser real.
// (use 1 se tiver 1 proxy; ajuste conforme sua infra)
*/
app.set("trust proxy", app_environment.TRUST_PROXY);


// Enable JSON Body
app.use(express.json());

app.use(require("cors")());

// Disable "x-powered-by" Header
app.disable('x-powered-by');

app.use('/', router);

app.use((request, response, next) => {
  response.redirect('https://github.com/haltman-io');
});

module.exports = {
    app
};