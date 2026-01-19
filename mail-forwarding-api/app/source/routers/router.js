// Importing libraries
const express = require('express');

// Importing Rate Limit stack
const { RATE_LIMIT } = require('../security/rate_limit.js')

// Initializing Router instance
const router = express.Router();

// Importing controllers
const { Subscribe_Action } = require('../controllers/forward/subscribe.js');
const { Unsubscribe_Action } = require("../controllers/forward/unsubscribe.js");

const { controllerConfirm } = require('../controllers/forward/confirm.js')

// ----------------------------
// Routes
// ----------------------------

router.get('/', (request, response, next) => { response.redirect('https://github.com/haltman-io'); });

/**
 * GET /forward/subscribe?name=...&domain=...&to=...
 *
 * Regras:
 * - obrigatórios: name, to
 * - domain opcional; se não vier usa DEFAULT_ALIAS_DOMAIN (env)
 * - validação EXTREMAMENTE restrita (regex)
 * - bans: email, domain(suffix), ip
 * - domínio do alias: precisa existir e estar ativo na tabela domain
 * - aqui NÃO cria nada e NÃO envia email (apenas valida e responde OK)
 */
router.get(
    // Route (e.g: localhost/forward/subscribe?name=foobar&domain=segfault.net&to=hackbart@tuta.io)
    '/forward/subscribe',

    // Apply Rate Limit Stack
    RATE_LIMIT.GLOBAL_LIMITER, 
    RATE_LIMIT.SUBSCRIBE_SLOW_BY_IP,
    RATE_LIMIT.SUBSCRIBE_LIMIT_BY_IP,
    RATE_LIMIT.SUBSCRIBE_LIMIT_BY_TO,
    RATE_LIMIT.SUBSCRIBE_LIMIT_BY_ALIAS,

    // Set the route controller
    Subscribe_Action
);

router.get(
  "/forward/unsubscribe",
  RATE_LIMIT.GLOBAL_LIMITER,
  RATE_LIMIT.UNSUBSCRIBE_SLOW_BY_IP,
  RATE_LIMIT.UNSUBSCRIBE_LIMIT_BY_IP,
  RATE_LIMIT.UNSUBSCRIBE_LIMIT_BY_ADDRESS,
  Unsubscribe_Action
);


router.get("/forward/confirm", controllerConfirm);

module.exports = {
    router
};