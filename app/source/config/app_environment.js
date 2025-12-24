// config/app_environment.js
// npm i dotenv

const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

/**
 * Resolve o ambiente de forma previsível:
 * - 1) APP_ENV (preferencial)
 * - 2) NODE_ENV (fallback)
 * - default: dev
 */
function resolveEnvName() {
  const a = String(process.env.APP_ENV || "").trim().toLowerCase();
  if (a) return a;

  const n = String(process.env.NODE_ENV || "").trim().toLowerCase();
  if (n === "production") return "prod";
  if (n === "staging" || n === "homolog" || n === "hml") return "hml";
  if (n === "development") return "dev";

  return "dev";
}

/**
 * Carrega o .env correto:
 * .env.dev, .env.hml, .env.prod
 *
 * Regra:
 * - se existir o arquivo do ambiente, usa ele
 * - senão tenta ".env"
 * - senão segue só com variáveis já existentes no process.env
 */
function loadDotenv() {
  const envName = resolveEnvName();
  const rootDir = process.cwd();

  const candidateFiles = [
    path.join(rootDir, `.env.${envName}`),
    path.join(rootDir, `.env`),
  ];

  let loadedFile = null;

  for (const filePath of candidateFiles) {
    if (fs.existsSync(filePath)) {
      const result = dotenv.config({ path: filePath });
      if (result.error) {
        throw result.error;
      }
      loadedFile = filePath;
      break;
    }
  }

  return { envName, loadedFile };
}

/**
 * Faz um snapshot dos envs relevantes e expõe via objeto.
 * (evita "cada módulo lê de um jeito" e te dá um ponto único de consulta)
 */
function buildAppEnvironmentMeta({ envName, loadedFile }) {
  const get = (key, fallback = "") => {
    const v = process.env[key];
    if (v === undefined || v === null) return fallback;
    return String(v);
  };

  const getInt = (key, fallback) => {
    const raw = get(key, "");
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  };

  function getBool(key, def = false) {
  const raw = process.env[key];
  if (typeof raw !== "string") return def;

  switch (raw.trim().toLowerCase()) {
    case "1":
    case "true":
    case "yes":
    case "on":
      return true;

    case "0":
    case "false":
    case "no":
    case "off":
      return false;

    default:
      return def;
  }
}


  const app_environment = {
    // meta
    ENV_NAME: envName,
    ENV_FILE: loadedFile || null,

    // app
    APP_ENV: get("APP_ENV", envName),
    APP_PORT: getInt("APP_PORT", 3000),
    TRUST_PROXY: getInt("TRUST_PROXY", 1),

    // mail info
    APP_PUBLIC_URL: get("APP_PUBLIC_URL", ""),
    EMAIL_CONFIRM_CONFIRM_ENDPOINT: get("EMAIL_CONFIRM_CONFIRM_ENDPOINT", "/forward/confirm"),
    EMAIL_CONFIRMATION_TTL_MINUTES: getInt("EMAIL_CONFIRMATION_TTL_MINUTES", 10),
    EMAIL_CONFIRMATION_RESEND_COOLDOWN_SECONDS: getInt("EMAIL_CONFIRMATION_RESEND_COOLDOWN_SECONDS", 60),
    EMAIL_CONFIRMATION_TOKEN_LEN: getInt("EMAIL_CONFIRMATION_TOKEN_LEN", 12),
    EMAIL_CONFIRM_STORE_IP_PACKED: getBool("EMAIL_CONFIRM_STORE_IP_PACKED", true),

    SMTP_HOST: get("SMTP_HOST", ""),
    SMTP_PORT: getInt("SMTP_PORT", 587),
    SMTP_SECURE: getBool("SMTP_SECURE", false),
    SMTP_AUTH_ENABLED: getBool("SMTP_AUTH_ENABLED", true),
    SMTP_USER: get("SMTP_USER", ""),
    SMTP_PASS: get("SMTP_PASS", ""),
    SMTP_FROM: get("SMTP_FROM", ""),
    SMTP_HELO_NAME: get("SMTP_HELO_NAME", ""),
    SMTP_TLS_REJECT_UNAUTHORIZED: getBool("SMTP_TLS_REJECT_UNAUTHORIZED", true),

    EMAIL_CONFIRMATION_SUBJECT: get("EMAIL_CONFIRMATION_SUBJECT", "Confirm your email"),
    
    EMAIL_CONFIRMATION_TOKEN_MIN_LEN: getInt("EMAIL_CONFIRMATION_TOKEN_MIN_LEN", 10),
    EMAIL_CONFIRMATION_TOKEN_MAX_LEN: getInt("EMAIL_CONFIRMATION_TOKEN_MAX_LEN", 24),

    // mariadb
    MARIADB_HOST: get("MARIADB_HOST", "127.0.0.1"),
    MARIADB_PORT: getInt("MARIADB_PORT", 3306),
    MARIADB_USER: get("MARIADB_USER", ""),
    MARIADB_PASSWORD: get("MARIADB_PASSWORD", ""),
    MARIADB_DATABASE: get("MARIADB_DATABASE", ""),

    // redis (opcional)
    REDIS_URL: get("REDIS_URL", ""),
    REDIS_RATE_LIMIT_PREFIX: get("REDIS_RATE_LIMIT_PREFIX", "rl:"),
    REDIS_CONNECT_TIMEOUT_MS: getInt("REDIS_CONNECT_TIMEOUT_MS", 5000),

    // rate limit / slow down
    RL_GLOBAL_PER_MIN: getInt("RL_GLOBAL_PER_MIN", 300),

    SD_SUBSCRIBE_DELAY_AFTER: getInt("SD_SUBSCRIBE_DELAY_AFTER", 10),
    SD_SUBSCRIBE_DELAY_STEP_MS: getInt("SD_SUBSCRIBE_DELAY_STEP_MS", 250),
    RL_SUBSCRIBE_PER_10MIN_PER_IP: getInt("RL_SUBSCRIBE_PER_10MIN_PER_IP", 60),
    RL_SUBSCRIBE_PER_HOUR_PER_TO: getInt("RL_SUBSCRIBE_PER_HOUR_PER_TO", 6),
    RL_SUBSCRIBE_PER_HOUR_PER_ALIAS: getInt("RL_SUBSCRIBE_PER_HOUR_PER_ALIAS", 20),

    RL_CONFIRM_PER_10MIN_PER_IP: getInt("RL_CONFIRM_PER_10MIN_PER_IP", 120),
    RL_CONFIRM_PER_10MIN_PER_TOKEN: getInt("RL_CONFIRM_PER_10MIN_PER_TOKEN", 10),

    SD_UNSUBSCRIBE_DELAY_AFTER: getInt("SD_UNSUBSCRIBE_DELAY_AFTER", 8),
    SD_UNSUBSCRIBE_DELAY_STEP_MS: getInt("SD_UNSUBSCRIBE_DELAY_STEP_MS", 300),
    RL_UNSUBSCRIBE_PER_10MIN_PER_IP: getInt("RL_UNSUBSCRIBE_PER_10MIN_PER_IP", 40),
    RL_UNSUBSCRIBE_PER_HOUR_PER_ADDRESS: getInt("RL_UNSUBSCRIBE_PER_HOUR_PER_ADDRESS", 6),

    RL_UNSUBSCRIBE_CONFIRM_PER_10MIN_PER_IP: getInt("RL_UNSUBSCRIBE_CONFIRM_PER_10MIN_PER_IP", 120),
    RL_UNSUBSCRIBE_CONFIRM_PER_10MIN_PER_TOKEN: getInt("RL_UNSUBSCRIBE_CONFIRM_PER_10MIN_PER_TOKEN", 10),

    DEFAULT_ALIAS_DOMAIN: get("DEFAULT_ALIAS_DOMAIN", ""),
    EMAIL_CONFIRMATION_TTL_MINUTES: getInt("EMAIL_CONFIRMATION_TTL_MINUTES", 10),

  };

  return { app_environment };
}

// Load once at import time (idempotente e previsível)
const meta = loadDotenv();
const { app_environment } = buildAppEnvironmentMeta(meta);

module.exports = { app_environment };