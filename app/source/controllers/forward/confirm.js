// ./source/controllers/forward/confirm.js
"use strict";

const crypto = require("crypto");

const { app_environment } = require("../../config/app_environment.js");
const { EMAIL_CONFIRMATIONS_QUERIES } = require("../../database/email_confirmations.queries.js");
const { DOMAIN_QUERIES } = require("../../database/domain.queries.js");
const { ALIAS_QUERIES } = require("../../database/alias.queries.js");

// Base62 estrito
const RE_BASE62 = /^[0-9A-Za-z]+$/;

function sha256Buffer(str) {
  return crypto.createHash("sha256").update(str, "utf8").digest(); // Buffer(32)
}

function normalizeToken(v) {
  if (typeof v !== "string") return "";
  return v.trim();
}

function tokenLooksValid(token) {
  const minLen = Number(app_environment.EMAIL_CONFIRMATION_TOKEN_MIN_LEN ?? 10);
  const maxLen = Number(app_environment.EMAIL_CONFIRMATION_TOKEN_MAX_LEN ?? 24);
  const min = Number.isFinite(minLen) ? minLen : 10;
  const max = Number.isFinite(maxLen) ? maxLen : 24;

  if (!token) return false;
  if (token.length < min || token.length > max) return false;
  if (!RE_BASE62.test(token)) return false;
  return true;
}

/**
 * GET /forward/confirm?token=...
 */
async function controllerConfirm(request, response) {
  try {
    const token = normalizeToken(request.query?.token || "");
    if (!tokenLooksValid(token)) {
      return response.status(400).json({ ok: false, error: "invalid_token" });
    }

    const tokenHash32 = sha256Buffer(token);

    // 1) Busca pendência pelo token_hash (pending + not expired)
    const pending = await EMAIL_CONFIRMATIONS_QUERIES.getPendingByTokenHash(tokenHash32);
    if (!pending) {
      return response.status(400).json({ ok: false, error: "invalid_or_expired" });
    }

    // 2) Precisa ter payload do alias para executar a ação final
    //    (email = "to"; alias_name + alias_domain determinam o address)
    const toEmail = String(pending.email || "").trim().toLowerCase();
    const intent = String(pending.intent || "subscribe").trim().toLowerCase();
    const aliasName = String(pending.alias_name || "").trim().toLowerCase();
    const aliasDomain = String(pending.alias_domain || "").trim().toLowerCase();

    if (!toEmail || !aliasName || !aliasDomain) {
      return response.status(500).json({
        ok: false,
        error: "confirmation_payload_missing",
      });
    }

    // 3) Confirma no banco (marca confirmed)
    const confirmed = await EMAIL_CONFIRMATIONS_QUERIES.markConfirmedById(pending.id);
    if (!confirmed) {
      // pode ter expirado entre o SELECT e o UPDATE
      return response.status(400).json({ ok: false, error: "invalid_or_expired" });
    }

    // 4) Ação final: subscribe/unsubscribe
    const address = `${aliasName}@${aliasDomain}`;

    if (intent === "unsubscribe") {
      const row = await ALIAS_QUERIES.getByAddress(address);
      if (!row || !row.id) {
        return response.status(404).json({ ok: false, error: "alias_not_found", address });
      }

      // Se o alias mudou de owner (goto) depois do request, não remove.
      const currentGoto = String(row.goto || "").trim().toLowerCase();
      if (currentGoto && currentGoto !== toEmail) {
        return response.status(409).json({
          ok: false,
          error: "alias_owner_changed",
          address,
        });
      }

      const del = await ALIAS_QUERIES.deleteByAddress(address);

      return response.status(200).json({
        ok: true,
        confirmed: true,
        intent,
        removed: Boolean(del.deleted),
        address,
      });
    }

    if (intent !== "subscribe") {
      return response.status(400).json({ ok: false, error: "unsupported_intent", intent });
    }

    // SUBSCRIBE: valida se o domínio ainda está ativo no DB
    const domainRow = await DOMAIN_QUERIES.getActiveByName(aliasDomain);
    if (!domainRow) {
      return response.status(400).json({
        ok: false,
        error: "invalid_domain",
        domain: aliasDomain,
      });
    }

    // idempotente
    const existing = await ALIAS_QUERIES.getByAddress(address);
    if (existing && existing.id) {
      return response.status(200).json({
        ok: true,
        confirmed: true,
        intent,
        created: false,
        reason: "already_exists",
        address,
        goto: toEmail,
      });
    }

    // cria
    const created = await ALIAS_QUERIES.createIfNotExists({
      address,
      goto: toEmail,
      active: true,
      domainId: domainRow.id,
    });

    return response.status(200).json({
      ok: true,
      confirmed: true,
      intent,
      created: Boolean(created.created),
      address,
      goto: toEmail,
    });

  } catch (err) {
    console.error("[confirm] error:", err?.message || err);
    return response.status(500).json({ ok: false, error: "internal_error" });
  }
}

module.exports = { controllerConfirm };
