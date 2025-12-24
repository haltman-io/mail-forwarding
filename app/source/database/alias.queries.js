// ./source/database/alias.queries.js
"use strict";

const { query, withTx } = require("./db");

const ALIAS_QUERIES = {
  /**
   * Retorna alias por address (email completo: name@domain)
   */
  async getByAddress(address) {
    const rows = await query(
      `SELECT id, address, goto, active, domain_id, created, modified
       FROM alias
       WHERE address = ?
       LIMIT 1`,
      [address]
    );
    return rows[0] || null;
  },

  /**
   * True se já existir (independente de active)
   */
  async existsByAddress(address) {
    const rows = await query(
      `SELECT 1 AS ok
       FROM alias
       WHERE address = ?
       LIMIT 1`,
      [address]
    );
    return rows.length === 1;
  },

  /**
   * Cria alias (ação final)
   * - address: "name@domain"
   * - goto: email de destino (to)
   * - domainId: FK da tabela domain
   */
  async createAlias({ address, goto, domainId, active = 1 }) {
    if (!address || typeof address !== "string") throw new Error("invalid_address");
    if (!goto || typeof goto !== "string") throw new Error("invalid_goto");
    if (!Number.isInteger(domainId) || domainId <= 0) throw new Error("invalid_domain_id");

    const act = active ? 1 : 0;

    const result = await query(
      `INSERT INTO alias (address, goto, active, domain_id, created, modified)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())`,
      [address, goto, act, domainId]
    );

    return {
      ok: Boolean(result && result.affectedRows === 1),
      insertId: result?.insertId ?? null,
    };
  },

  /**
   * Cria alias de forma "safe" contra corrida (melhor esforço).
   * Ideal se você NÃO tem UNIQUE(address).
   *
   * Usa transação + SELECT ... FOR UPDATE (com índice em address) pra reduzir race.
   */
  async createIfNotExists({ address, goto, domainId, active = 1 }) {
    return withTx(async (conn) => {
      // lock por address (melhor esforço)
      const rows = await conn.query(
        `SELECT id, address, goto, active, domain_id
         FROM alias
         WHERE address = ?
         FOR UPDATE`,
        [address]
      );

      if (rows.length === 1) {
        return { ok: false, created: false, alreadyExists: true, row: rows[0] };
      }

      const act = active ? 1 : 0;

      const result = await conn.query(
        `INSERT INTO alias (address, goto, active, domain_id, created, modified)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())`,
        [address, goto, act, domainId]
      );

      return { ok: true, created: true, insertId: result?.insertId ?? null };
    });
  },

    /**
   * Remove alias por address (email completo: name@domain)
   * Retorna { ok, deleted, affectedRows }
   */
  async deleteByAddress(address) {
    return withTx(async (conn) => {
      const result = await conn.query(
        `DELETE FROM alias
         WHERE address = ?
         LIMIT 1`,
        [address]
      );
      const affected = Number(result?.affectedRows ?? 0);
      return { ok: true, deleted: affected === 1, affectedRows: affected };
    });
  },

};

module.exports = { ALIAS_QUERIES };
