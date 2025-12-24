"use strict";

const { query } = require("./db");

/**
 * Ban ativo:
 * - revoked_at IS NULL
 * - expires_at IS NULL OR expires_at > NOW(6)
 */
const ACTIVE_WHERE =
  "revoked_at IS NULL AND (expires_at IS NULL OR expires_at > NOW(6))";

const BANS_QUERIES = {
  async isBannedEmail(email) {
    const rows = await query(
      `SELECT id FROM api_bans
       WHERE ban_type = 'email' AND ban_value = ? AND ${ACTIVE_WHERE}
       LIMIT 1`,
      [email]
    );
    return rows.length > 0;
  },

  async isBannedDomain(domain) {
    const rows = await query(
      `SELECT id FROM api_bans
       WHERE ban_type = 'domain' AND ban_value = ? AND ${ACTIVE_WHERE}
       LIMIT 1`,
      [domain]
    );
    return rows.length > 0;
  },

  async isBannedIP(ipString) {
    const rows = await query(
      `SELECT id FROM api_bans
       WHERE ban_type = 'ip' AND ban_value = ? AND ${ACTIVE_WHERE}
       LIMIT 1`,
      [ipString]
    );
    return rows.length > 0;
  },

  /**
   * Check combinado (o controller pode chamar isso antes de operar)
   */
  async check({ email, domain, ip }) {
    // evita múltiplos roundtrips quando possível
    // (ainda assim tudo parametrizado)
    const checks = [];

    if (email) checks.push(["email", email]);
    if (domain) checks.push(["domain", domain]);
    if (ip) checks.push(["ip", ip]);

    if (checks.length === 0) return { banned: false, type: null };

    // monta IN seguro: apenas tipos fixos (email/domain/ip) e valores parametrizados
    // A parte dinâmica aqui é somente a quantidade de "(?,?)" — não carrega user input no SQL.
    const tuples = checks.map(() => "(?, ?)").join(", ");
    const params = checks.flat();

    const rows = await query(
      `SELECT ban_type, ban_value
       FROM api_bans
       WHERE ${ACTIVE_WHERE}
         AND (ban_type, ban_value) IN (${tuples})
       LIMIT 1`,
      params
    );

    if (rows.length === 0) return { banned: false, type: null };
    return { banned: true, type: rows[0].ban_type };
  },
};

module.exports = { BANS_QUERIES };