"use strict";

const crypto = require("crypto");
const nodemailer = require("nodemailer");

const { app_environment } = require("../config/app_environment.js");
const { EMAIL_CONFIRMATIONS_QUERIES } = require("../database/email_confirmations.queries.js");

// -----------------------------
// Token + hash
// -----------------------------

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function generateBase62Token(len = 12) {
  if (!Number.isFinite(len) || len < 8 || len > 64) {
    throw new Error("invalid_token_length");
  }

  const out = [];
  while (out.length < len) {
    const buf = crypto.randomBytes(32);
    for (let i = 0; i < buf.length && out.length < len; i++) {
      const x = buf[i];
      // 62 * 4 = 248. Aceita 0..247 e rejeita 248..255 (evita bias)
      if (x < 248) out.push(BASE62[x % 62]);
    }
  }
  return out.join("");
}

function sha256Buffer(str) {
  return crypto.createHash("sha256").update(String(str), "utf8").digest(); // Buffer(32)
}

function normalizeEmailStrict(email) {
  if (typeof email !== "string") return "";
  return email.trim().toLowerCase();
}

function assertIntent(intent) {
  if (typeof intent !== "string") throw new Error("invalid_intent");
  const v = intent.trim().toLowerCase();
  // deixa flexível pra futuro
  if (!v || v.length > 32) throw new Error("invalid_intent");
  return v;
}

// -----------------------------
// URL + SMTP
// -----------------------------

function buildConfirmURL(token) {
  const base = String(app_environment.APP_PUBLIC_URL || "").trim().replace(/\/+$/, "");
  const endpoint = String(app_environment.EMAIL_CONFIRM_CONFIRM_ENDPOINT || "/forward/confirm")
    .trim()
    .replace(/^\/?/, "/");

  if (!base) throw new Error("missing_APP_PUBLIC_URL");

  return `${base}${endpoint}?token=${encodeURIComponent(token)}`;
}

function makeTransport() {
  const host = app_environment.SMTP_HOST;
  const port = Number(app_environment.SMTP_PORT ?? 587);
  const secure = String(app_environment.SMTP_SECURE ?? "false").toLowerCase() === "true";

  if (!host) throw new Error("missing_SMTP_HOST");

  const requireAuth = String(app_environment.SMTP_AUTH_ENABLED ?? "true").toLowerCase() === "true";

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: requireAuth
      ? { user: String(app_environment.SMTP_USER || ""), pass: String(app_environment.SMTP_PASS || "") }
      : undefined,
    name: app_environment.SMTP_HELO_NAME || undefined,
    tls: {
      rejectUnauthorized:
        String(app_environment.SMTP_TLS_REJECT_UNAUTHORIZED ?? "true").toLowerCase() === "true",
    },
  });

  return transporter;
}

// -----------------------------
// Main
// -----------------------------

/**
 * Pré-condição: já passou rate limit + bans + validações.
 * Esta função só:
 * - gera token
 * - grava pendência no DB (com alias_name/domain)
 * - envia email
 */
async function sendEmailConfirmation({ email, requestIpText, userAgent, aliasName, aliasDomain, intent }) {
  const to = normalizeEmailStrict(email);
  if (!to) throw new Error("invalid_email");

  const ttlMin = Number(app_environment.EMAIL_CONFIRMATION_TTL_MINUTES ?? 10);
  const ttlMinutes = Number.isFinite(ttlMin) && ttlMin > 0 ? ttlMin : 10;
    const ttlMinutesInt = ttlMinutes;

  const cooldownSec = Number(app_environment.EMAIL_CONFIRMATION_RESEND_COOLDOWN_SECONDS ?? 60);
  const cooldownSeconds = Number.isFinite(cooldownSec) && cooldownSec >= 0 ? cooldownSec : 60;

  const tokenLen = Number(app_environment.EMAIL_CONFIRMATION_TOKEN_LEN ?? 12);
  const tokenLength = Number.isFinite(tokenLen) ? tokenLen : 12;

  // 1) pendência ativa?
  const pending = await EMAIL_CONFIRMATIONS_QUERIES.getActivePendingByEmail(to);

  if (pending) {
    const lastSentAt = pending.last_sent_at ? new Date(pending.last_sent_at) : null;
    if (lastSentAt) {
      const elapsed = (Date.now() - lastSentAt.getTime()) / 1000;
      if (elapsed < cooldownSeconds) {
        return { ok: true, sent: false, reason: "cooldown", ttl_minutes: ttlMinutes };
      }
    }
  }

  // 2) token + hash
  const token = generateBase62Token(tokenLength);
  const tokenHash32 = sha256Buffer(token);

  // 3) expires_at
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  // 4) grava DB (create ou rotate)
  const requestIpStringOrNull =
    requestIpText && typeof requestIpText === "string" ? requestIpText : null;

      const intentNormalized = intent ? assertIntent(intent) : "subscribe";


  if (pending) {
    await EMAIL_CONFIRMATIONS_QUERIES.rotateTokenForPending({
      email: to,
      tokenHash32,
      ttlMinutes: ttlMinutesInt,
      requestIpStringOrNull,
      userAgentOrNull: userAgent || "",
    });
  } else {
    // ⚠️ aliasName e aliasDomain precisam vir como parâmetro dessa função.
    // Se ainda não estiverem no signature do sendEmailConfirmation, vai dar erro.
    await EMAIL_CONFIRMATIONS_QUERIES.createPending({
      email: to,
      tokenHash32,
      ttlMinutes: ttlMinutesInt,
      requestIpStringOrNull,
      userAgentOrNull: userAgent || "",

      intent: intentNormalized,
      aliasName,     // <-- tem que existir
      aliasDomain,   // <-- tem que existir
    });
  }

  // 5) envia email
  const confirmURL = buildConfirmURL(token);

  const from = String(app_environment.SMTP_FROM || "").trim();
  if (!from) throw new Error("missing_SMTP_FROM");

    const subj = (function () {
      const key = `EMAIL_CONFIRMATION_SUBJECT_${String(intentNormalized).toUpperCase()}`;
      const v = String(app_environment[key] || "").trim();
      if (v) return v;
      return String(app_environment.EMAIL_CONFIRMATION_SUBJECT || "").trim() || "Confirm your email";
    })();


  const actionLabel =
    intentNormalized === "unsubscribe" ? "remove this alias" : "create this alias";

  const text =
    `Confirm your email address to ${actionLabel}.\n\n` +
    `Link (valid for ${ttlMinutes} minutes):\n` +
    `${confirmURL}\n\n` +
    `If you did not request this, you can ignore this message.\n`;


  const html =
    `<p>Confirm your email address.</p>` +
    `<p><strong>Action:</strong> ${intentNormalized === "unsubscribe" ? "Remove alias" : "Create alias"}</p>` +
    `<p><strong>Valid for ${ttlMinutes} minutes</strong></p>` +
    `<p><a href="${confirmURL}">${confirmURL}</a></p>` +
    `<p>If you did not request this, you can ignore this message.</p>`;

  const transporter = makeTransport();
  await transporter.sendMail({ from, to, subject: subj, text, html });

  return { ok: true, sent: true, to, ttl_minutes: ttlMinutes };
}

module.exports = { sendEmailConfirmation, generateBase62Token, sha256Buffer };
