// ./source/controllers/forward/unsubscribe.js
"use strict";

const { BANS_QUERIES } = require("../../database/bans.queries.js");
const { ALIAS_QUERIES } = require("../../database/alias.queries.js");
const { sendEmailConfirmation } = require("../../security/email_confirmation.service.js");

// ----------------------------
// Strict validation helpers
// ----------------------------

// alias name => username do alias: SOMENTE [a-z0-9.] (sem "_" "-" "+" etc)
const RE_NAME = /^[a-z0-9](?:[a-z0-9.]{0,62}[a-z0-9])?$/; // 1..64, sem '.' no começo/fim
// domínio => labels a-z0-9 e hífen no meio, com pontos; TLD mínimo 2 letras
const RE_DOMAIN =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
// email simples (só pra parse do alias)
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,63}$/;

function normStr(v) {
  if (typeof v !== "string") return "";
  return v.trim();
}
function isValidName(v) {
  return RE_NAME.test(v);
}
function isValidDomain(v) {
  return RE_DOMAIN.test(v);
}
function parseEmailStrict(emailRaw) {
  const email = normStr(emailRaw).toLowerCase();
  if (!email || email.length > 254) return null;
  if (!RE_EMAIL.test(email)) return null;
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  return { email, local, domain };
}

function getClientIP(request) {
  return request.ip || "";
}

// /forward/unsubscribe route control
const Unsubscribe_Action = async (request, response, next) => {
  try {
    // ----------------------------
    // Normalize inputs
    // ----------------------------
    const aliasRaw = request.query?.alias || "";
    const aliasParsed = parseEmailStrict(aliasRaw);
    const clientIP = getClientIP(request);

    // ----------------------------
    // Mandatory params
    // ----------------------------
    if (!aliasParsed) {
      return response.status(400).json({ error: "invalid_params", field: "alias" });
    }

    // ----------------------------
    // Strict validation: alias parts
    // ----------------------------
    const aliasName = aliasParsed.local;
    const aliasDomain = aliasParsed.domain;

    if (!isValidName(aliasName)) {
      return response.status(400).json({ error: "invalid_params", field: "alias_name" });
    }
    if (!isValidDomain(aliasDomain)) {
      return response.status(400).json({ error: "invalid_params", field: "alias_domain" });
    }

    // ----------------------------
    // Ban rules
    // ----------------------------
    if (clientIP) {
      const bannedIP = await BANS_QUERIES.isBannedIP(clientIP);
      if (bannedIP) return response.status(403).json({ error: "banned", type: "ip" });
    }

    // ----------------------------
    // Alias must exist
    // ----------------------------
    const address = `${aliasName}@${aliasDomain}`;
    const aliasRow = await ALIAS_QUERIES.getByAddress(address);

    if (!aliasRow || !aliasRow.id) {
      return response.status(404).json({ error: "alias_not_found", alias: address });
    }

    if (aliasRow.active === 0 || aliasRow.active === false) {
      return response.status(400).json({ error: "alias_inactive", alias: address });
    }

    const gotoEmail = String(aliasRow.goto || "").trim().toLowerCase();
    const gotoParsed = parseEmailStrict(gotoEmail);

    if (!gotoParsed) {
      return response.status(500).json({ error: "invalid_goto_on_alias", alias: address });
    }

    // (opcional mas coerente com o subscribe) — evita spam/abuso em destinatários banidos
    const bannedEmail = await BANS_QUERIES.isBannedEmail(gotoParsed.email);
    if (bannedEmail) return response.status(403).json({ error: "banned", type: "email" });

    // domain ban (suffix match do domínio do destino real)
    const domainParts = gotoParsed.domain.split(".");
    for (let i = 0; i < domainParts.length - 1; i++) {
      const suf = domainParts.slice(i).join(".");
      // eslint-disable-next-line no-await-in-loop
      const bannedDom = await BANS_QUERIES.isBannedDomain(suf);
      if (bannedDom) return response.status(403).json({ error: "banned", type: "domain", value: suf });
    }

    // ----------------------------
    // Send confirmation email
    // ----------------------------
    const result = await sendEmailConfirmation({
      email: gotoParsed.email, // envia pro owner real do alias
      requestIpText: request.ip,
      userAgent: String(request.headers["user-agent"] || ""),
      aliasName,
      aliasDomain,
      intent: "unsubscribe",
    });

    return response.status(200).json({
      ok: true,
      action: "unsubscribe",
      alias: address,
      sent: Boolean(result.sent),
      reason: result.reason || undefined,
      ttl_minutes: result.ttl_minutes,
    });
  } catch (err) {
    console.error("[unsubscribe] error:", err?.message || err);
    return response.status(500).json({ error: "internal_error" });
  }
};

module.exports = { Unsubscribe_Action };
