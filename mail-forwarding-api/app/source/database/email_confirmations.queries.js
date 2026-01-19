"use strict";

const crypto = require("crypto");
const net = require("net");
const { query, withTx } = require("./db");

// -----------------------------
// Strict validators (mesma linha do subscribe.js)
// -----------------------------
const RE_ALIAS_NAME = /^[a-z0-9](?:[a-z0-9.]{0,62}[a-z0-9])?$/; // 1..64, sem '.' no começo/fim
const RE_DOMAIN =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

function assertAliasName(name) {
  if (typeof name !== "string") throw new Error("invalid_alias_name");
  const v = name.trim().toLowerCase();
  if (!RE_ALIAS_NAME.test(v)) throw new Error("invalid_alias_name");
  return v;
}

function assertDomain(domain) {
  if (typeof domain !== "string") throw new Error("invalid_alias_domain");
  const v = domain.trim().toLowerCase();
  if (!RE_DOMAIN.test(v)) throw new Error("invalid_alias_domain");
  return v;
}

function assertIntent(intent) {
  if (typeof intent !== "string") throw new Error("invalid_intent");
  const v = intent.trim().toLowerCase();
  // deixa flexível pra futuro
  if (!v || v.length > 32) throw new Error("invalid_intent");
  return v;
}

function assertTtlMinutes(ttlMinutes) {
  const n = Number(ttlMinutes);
  if (!Number.isFinite(n) || n <= 0 || n > 24 * 60) throw new Error("invalid_ttlMinutes");
  return Math.floor(n);
}

function assertTokenHash32(tokenHash32) {
  if (!Buffer.isBuffer(tokenHash32) || tokenHash32.length !== 32) {
    throw new Error("invalid_tokenHash32");
  }
  return tokenHash32;
}

// -----------------------------
// Helpers
// -----------------------------
function sha25632(str) {
  return crypto.createHash("sha256").update(String(str), "utf8").digest(); // Buffer(32)
}

/**
 * PACK_IP: converte IPv4/IPv6 string para Buffer(16).
 * - IPv4 vira IPv6-mapped (::ffff:a.b.c.d)
 * - IPv6 vira 16 bytes
 * - inválido => null
 */
function packIp16(ipString) {
  if (typeof ipString !== "string") return null;
  const ip = ipString.trim();
  if (!ip) return null;

  const family = net.isIP(ip);

  if (family === 4) {
    const out = Buffer.alloc(16, 0);
    out[10] = 0xff;
    out[11] = 0xff;

    const parts = ip.split(".");
    if (parts.length !== 4) return null;

    for (let i = 0; i < 4; i++) {
      const n = Number(parts[i]);
      if (!Number.isInteger(n) || n < 0 || n > 255) return null;
      out[12 + i] = n;
    }
    return out;
  }

  if (family === 6) {
    let s = ip.toLowerCase();

    // IPv4 embutido no final: ::ffff:1.2.3.4 ou 2001::1.2.3.4
    const lastColon = s.lastIndexOf(":");
    if (lastColon !== -1 && s.slice(lastColon + 1).includes(".")) {
      const v4 = s.slice(lastColon + 1);
      const packedV4 = packIp16(v4);
      if (!packedV4) return null;

      const v4bytes = packedV4.slice(12, 16);
      s =
        s.slice(0, lastColon) +
        `:${v4bytes.readUInt16BE(0).toString(16)}:${v4bytes.readUInt16BE(2).toString(16)}`;
    }

    if (s.includes("::")) {
      const [head, tail] = s.split("::");
      const headParts = head ? head.split(":").filter(Boolean) : [];
      const tailParts = tail ? tail.split(":").filter(Boolean) : [];
      const missing = 8 - (headParts.length + tailParts.length);
      if (missing < 0) return null;

      const parts = [...headParts, ...Array(missing).fill("0"), ...tailParts];
      return ipv6PartsToBuf(parts);
    }

    const parts = s.split(":");
    if (parts.length !== 8) return null;
    return ipv6PartsToBuf(parts);
  }

  return null;
}

function ipv6PartsToBuf(parts) {
  if (!Array.isArray(parts) || parts.length !== 8) return null;
  const out = Buffer.alloc(16);

  for (let i = 0; i < 8; i++) {
    const p = parts[i];
    if (typeof p !== "string" || p.length < 1 || p.length > 4) return null;
    const n = parseInt(p, 16);
    if (!Number.isFinite(n) || n < 0 || n > 0xffff) return null;
    out.writeUInt16BE(n, i * 2);
  }
  return out;
}

// -----------------------------
// Queries
// -----------------------------
const EMAIL_CONFIRMATIONS_QUERIES = {
  HELPERS: { sha25632, packIp16 },

  async getActivePendingByEmail(email) {
    const rows = await query(
      `SELECT id, email, status, created_at, expires_at,
              send_count, last_sent_at, attempts_confirm,
              intent, alias_name, alias_domain
       FROM email_confirmations
       WHERE email = ? AND status = 'pending'
         AND expires_at > NOW(6)
       ORDER BY id DESC
       LIMIT 1`,
      [email]
    );
    return rows[0] || null;
  },

  async createPending({
    email,
    tokenHash32,
    ttlMinutes,
    requestIpStringOrNull,
    userAgentOrNull,

    // para o sistema saber o que criar depois
    intent,
    aliasName,
    aliasDomain,
  }) {
    assertTokenHash32(tokenHash32);
    const ttl = assertTtlMinutes(ttlMinutes);
    const it = assertIntent(intent);
    const an = assertAliasName(aliasName);
    const ad = assertDomain(aliasDomain);

    return withTx(async (conn) => {
      const packedIp =
        requestIpStringOrNull && typeof requestIpStringOrNull === "string"
          ? packIp16(requestIpStringOrNull)
          : null;

      // Higiene: marca expirados
      await conn.query(
        `UPDATE email_confirmations
         SET status = 'expired'
         WHERE email = ?
           AND status = 'pending'
           AND expires_at <= NOW(6)`,
        [email]
      );

      // IMPORTANTE:
      // - active_pending é GENERATED => NÃO inserir.
      // - expires_at calculado pelo BANCO => sem treta de timezone.
      const sql = `INSERT INTO email_confirmations (
          email, token_hash, status, created_at, expires_at,
          request_ip, user_agent, send_count, last_sent_at,
          attempts_confirm,
          intent, alias_name, alias_domain
        ) VALUES (
          ?, ?, 'pending', NOW(6), DATE_ADD(NOW(6), INTERVAL ? MINUTE),
          ?, ?, 1, NOW(6),
          0,
          ?, ?, ?
        )`;

      const result = await conn.query(sql, [
        email,
        tokenHash32,
        ttl,
        packedIp,
        userAgentOrNull || null,
        it,
        an,
        ad,
      ]);

      const rows = await conn.query(
        `SELECT id, email, status, created_at, expires_at,
                send_count, last_sent_at, attempts_confirm,
                intent, alias_name, alias_domain
         FROM email_confirmations
         WHERE id = ?
         LIMIT 1`,
        [result.insertId]
      );

      return rows[0] || null;
    });
  },

  async rotateTokenForPending({
    email,
    tokenHash32,
    ttlMinutes,
    requestIpStringOrNull,
    userAgentOrNull,
  }) {
    assertTokenHash32(tokenHash32);
    const ttl = assertTtlMinutes(ttlMinutes);

    const packedIp =
      requestIpStringOrNull && typeof requestIpStringOrNull === "string"
        ? packIp16(requestIpStringOrNull)
        : null;

    const sql = `UPDATE email_confirmations
      SET token_hash = ?,
          expires_at = DATE_ADD(NOW(6), INTERVAL ? MINUTE),
          request_ip = ?,
          user_agent = ?,
          send_count = send_count + 1,
          last_sent_at = NOW(6)
      WHERE email = ?
        AND status = 'pending'
        AND expires_at > NOW(6)
      ORDER BY id DESC
      LIMIT 1`;

    const result = await query(sql, [
      tokenHash32,
      ttl,
      packedIp,
      userAgentOrNull || null,
      email,
    ]);

    return Boolean(result && result.affectedRows === 1);
  },

  async getPendingByTokenHash(tokenHash32) {
    assertTokenHash32(tokenHash32);

    const rows = await query(
      `SELECT id, email, status, created_at, expires_at,
              send_count, last_sent_at, attempts_confirm,
              intent, alias_name, alias_domain
       FROM email_confirmations
       WHERE token_hash = ?
         AND status = 'pending'
         AND expires_at > NOW(6)
       ORDER BY id DESC
       LIMIT 1`,
      [tokenHash32]
    );
    return rows[0] || null;
  },

  async markConfirmedById(id) {
    const result = await query(
      `UPDATE email_confirmations
       SET status = 'confirmed',
           confirmed_at = NOW(6)
       WHERE id = ?
         AND status = 'pending'
         AND expires_at > NOW(6)`,
      [id]
    );
    return Boolean(result && result.affectedRows === 1);
  },

  async markExpiredById(id) {
    const result = await query(
      `UPDATE email_confirmations
       SET status = 'expired'
       WHERE id = ?
         AND status = 'pending'`,
      [id]
    );
    return Boolean(result && result.affectedRows >= 0);
  },

  async bumpAttemptsConfirmById(id) {
    const result = await query(
      `UPDATE email_confirmations
       SET attempts_confirm = attempts_confirm + 1
       WHERE id = ?`,
      [id]
    );
    return Boolean(result && result.affectedRows >= 0);
  },
};

module.exports = { EMAIL_CONFIRMATIONS_QUERIES };
