"use strict";

const { getPool, query, withTx } = require("./db");
const { DOMAIN_QUERIES } = require("./domain.queries");
const { ALIAS_QUERIES } = require("./alias.queries");
const { BANS_QUERIES } = require("./bans.queries");
const { EMAIL_CONFIRMATIONS_QUERIES } = require("./email_confirmations.queries");

module.exports = {
  DB: { getPool, query, withTx },
  DOMAIN_QUERIES,
  ALIAS_QUERIES,
  BANS_QUERIES,
  EMAIL_CONFIRMATIONS_QUERIES,
};