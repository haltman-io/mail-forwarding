"use strict";

const { query } = require("./db");

const DOMAIN_QUERIES = {
  // Retorna domínio somente se existir e estiver ativo
  async getActiveByName(name) {
    const rows = await query(
      "SELECT id, name, active FROM domain WHERE name = ? AND active = 1 LIMIT 1",
      [name]
    );
    return rows[0] || null;
  },

  async existsActive(name) {
    const rows = await query(
      "SELECT 1 AS ok FROM domain WHERE name = ? AND active = 1 LIMIT 1",
      [name]
    );
    return rows.length === 1;
  },
};

module.exports = { DOMAIN_QUERIES };
