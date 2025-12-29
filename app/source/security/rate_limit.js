// ./source/security/rate_limit.js
"use strict";

// Importing custom functions
const { app_environment } = require("../config/app_environment.js");
const { RATE_LIMIT_HELPERS } = require("./rate_limit.helpers.js");

// Importing libraries
const { rateLimit: LIB_rateLimit, ipKeyGenerator } = require("express-rate-limit");
const LIB_slowDown = require("express-slow-down");

const globalLimit = Number(app_environment.RL_GLOBAL_PER_MIN ?? 300);

const KEY_BY_IP = (req, res) => ipKeyGenerator(req.ip);

const RATE_LIMIT = {
  HELPERS: RATE_LIMIT_HELPERS,

  GLOBAL_LIMITER: LIB_rateLimit({
    windowMs: 60 * 1000,
    limit: globalLimit || 1,                 // evita 0
    skip: () => globalLimit === 0,           // 0 => desliga totalmente
    standardHeaders: "draft-7",
    legacyHeaders: false,
    // sem keyGenerator custom => usa default seguro + validações internas
  }),

  SUBSCRIBE_SLOW_BY_IP: LIB_slowDown({
    windowMs: 60 * 1000, // 1 min
    delayAfter: Number(app_environment.SD_SUBSCRIBE_DELAY_AFTER ?? 10),
    delayMs: (hits) => {
      const after = Number(app_environment.SD_SUBSCRIBE_DELAY_AFTER ?? 10);
      const step = Number(app_environment.SD_SUBSCRIBE_DELAY_STEP_MS ?? 250);
      return Math.max(0, (hits - after) * step);
    },
    // FIX IPv6 bypass: não use req.ip cru
    keyGenerator: KEY_BY_IP,
  }),

  SUBSCRIBE_LIMIT_BY_IP: LIB_rateLimit({
    windowMs: 10 * 60 * 1000, // 10 min
    limit: globalLimit || 1,                 // evita 0
    skip: () => globalLimit === 0,           // 0 => desliga totalmente
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "rate_limited", where: "subscribe", reason: "too_many_requests_ip" },
    // FIX IPv6 bypass: não use req.ip cru
    keyGenerator: KEY_BY_IP,
  }),

  SUBSCRIBE_LIMIT_BY_TO: LIB_rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    limit: globalLimit || 1,                 // evita 0
    skip: () => globalLimit === 0,           // 0 => desliga totalmente
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "rate_limited", where: "subscribe", reason: "too_many_requests_to" },
    keyGenerator: (req) => {
      const to = RATE_LIMIT_HELPERS.NORMALIZE_GET_TO(req);
      return `to:${to || "missing"}`;
    },
  }),

  SUBSCRIBE_LIMIT_BY_ALIAS: LIB_rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    limit: globalLimit || 1,                 // evita 0
    skip: () => globalLimit === 0,           // 0 => desliga totalmente
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "rate_limited", where: "subscribe", reason: "too_many_requests_alias" },
    keyGenerator: (req) => {
      const name = RATE_LIMIT_HELPERS.NORMALIZE_GET_NAME(req);
      const domain = RATE_LIMIT_HELPERS.NORMALIZE_GET_DOMAIN(req) || "default";
      return `alias:${domain}:${name || "missing"}`;
    },
  }),

  CONFIRM_LIMIT_BY_IP: LIB_rateLimit({
    windowMs: 10 * 60 * 1000, // 10 min
    limit: globalLimit || 1,                 // evita 0
    skip: () => globalLimit === 0,           // 0 => desliga totalmente
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "rate_limited", where: "confirm", reason: "too_many_requests_ip" },
    // FIX IPv6 bypass
    keyGenerator: KEY_BY_IP,
  }),

  CONFIRM_LIMIT_BY_TOKEN: LIB_rateLimit({
    windowMs: 10 * 60 * 1000, // 10 min
    limit: globalLimit || 1,                 // evita 0
    skip: () => globalLimit === 0,           // 0 => desliga totalmente
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "rate_limited", where: "confirm", reason: "too_many_requests_token" },
    keyGenerator: (req) => {
      const token = RATE_LIMIT_HELPERS.NORMALIZE_GET_TOKEN
        ? RATE_LIMIT_HELPERS.NORMALIZE_GET_TOKEN(req)
        : RATE_LIMIT_HELPERS.NORMALIZE_STRING(req.query?.token || req.params?.token || "");
      return `token:${token || "missing"}`;
    },
  }),

  UNSUBSCRIBE_SLOW_BY_IP: LIB_slowDown({
    windowMs: 60 * 1000, // 1 min
    delayAfter: Number(app_environment.SD_UNSUBSCRIBE_DELAY_AFTER ?? 8),
    delayMs: (hits) => {
      const after = Number(app_environment.SD_UNSUBSCRIBE_DELAY_AFTER ?? 8);
      const step = Number(app_environment.SD_UNSUBSCRIBE_DELAY_STEP_MS ?? 300);
      return Math.max(0, (hits - after) * step);
    },
    // FIX IPv6 bypass
    keyGenerator: KEY_BY_IP,
  }),

  UNSUBSCRIBE_LIMIT_BY_IP: LIB_rateLimit({
    windowMs: 10 * 60 * 1000, // 10 min
    limit: globalLimit || 1,                 // evita 0
    skip: () => globalLimit === 0,           // 0 => desliga totalmente
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "rate_limited", where: "unsubscribe", reason: "too_many_requests_ip" },
    // FIX IPv6 bypass
    keyGenerator: KEY_BY_IP,
  }),

  UNSUBSCRIBE_LIMIT_BY_ADDRESS: LIB_rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    limit: globalLimit || 1,                 // evita 0
    skip: () => globalLimit === 0,           // 0 => desliga totalmente
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "rate_limited", where: "unsubscribe", reason: "too_many_requests_address" },
    keyGenerator: (req) => {
      const address = RATE_LIMIT_HELPERS.NORMALIZE_GET_ADDRESS
        ? RATE_LIMIT_HELPERS.NORMALIZE_GET_ADDRESS(req)
        : RATE_LIMIT_HELPERS.NORMALIZE_STRING(req.query?.address || "");

      if (!address) return "unsub_addr:missing";
      return `unsub_addr:${address.slice(0, 254)}`;
    },
  }),

  UNSUBSCRIBE_CONFIRM_LIMIT_BY_IP: LIB_rateLimit({
    windowMs: 10 * 60 * 1000, // 10 min
    limit: globalLimit || 1,                 // evita 0
    skip: () => globalLimit === 0,           // 0 => desliga totalmente
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "rate_limited", where: "unsubscribe_confirm", reason: "too_many_requests_ip" },
    // FIX IPv6 bypass
    keyGenerator: KEY_BY_IP,
  }),

  UNSUBSCRIBE_CONFIRM_LIMIT_BY_TOKEN: LIB_rateLimit({
    windowMs: 10 * 60 * 1000, // 10 min
    limit: globalLimit || 1,                 // evita 0
    skip: () => globalLimit === 0,           // 0 => desliga totalmente
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "rate_limited", where: "unsubscribe_confirm", reason: "too_many_requests_token" },
    keyGenerator: (req) => {
      const token = RATE_LIMIT_HELPERS.NORMALIZE_GET_TOKEN
        ? RATE_LIMIT_HELPERS.NORMALIZE_GET_TOKEN(req)
        : RATE_LIMIT_HELPERS.NORMALIZE_STRING(req.query?.token || req.params?.token || "");

      if (!token) return "unsub_token:missing";
      return `unsub_token:${token.slice(0, 256)}`;
    },
  }),
};

module.exports = { RATE_LIMIT };
