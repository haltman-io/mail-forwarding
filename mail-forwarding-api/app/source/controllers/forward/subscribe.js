const { app_environment } = require('../../config/app_environment.js');

const { DOMAIN_QUERIES } = require('../../database/domain.queries.js');
const { BANS_QUERIES } = require('../../database/bans.queries.js');
const { ALIAS_QUERIES } = require("../../database/alias.queries.js");


const { sendEmailConfirmation } = require("../../security/email_confirmation.service.js");

// ----------------------------
// Strict validation helpers
// ----------------------------

// name => username do alias: SOMENTE [a-z0-9.] (sem "_" "-" "+" etc)
const RE_NAME = /^[a-z0-9](?:[a-z0-9.]{0,62}[a-z0-9])?$/; // 1..64, sem '.' no começo/fim
// domínio => labels a-z0-9 e hífen no meio, com pontos; TLD mínimo 2 letras
const RE_DOMAIN =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
// local-part do email => SOMENTE [a-z0-9._-] (sem "+", sem "%", sem aspas, etc)
const RE_EMAIL_LOCAL = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/; // 1..64, sem '.' no começo/fim
const MAX_EMAIL_LEN = 254;

function normStr(v) {
  if (typeof v !== "string") return "";
  return v.trim().toLowerCase();
}

function isValidName(name) {
  return RE_NAME.test(name);
}

function isValidDomain(domain) {
  return RE_DOMAIN.test(domain);
}

function parseEmailStrict(email) {
  const v = normStr(email);
  if (!v || v.length > MAX_EMAIL_LEN) return null;

  const at = v.indexOf("@");
  if (at <= 0) return null;
  if (v.indexOf("@", at + 1) !== -1) return null;

  const local = v.slice(0, at);
  const domain = v.slice(at + 1);

  if (!RE_EMAIL_LOCAL.test(local)) return null;
  if (!isValidDomain(domain)) return null;

  return { email: v, local, domain };
}

// Para ban de domínio via suffix match (ex.: sub.exbanido.com também cai em exbanido.com)
function domainSuffixes(d) {
  const parts = d.split(".");
  const out = [];
  for (let i = 0; i < parts.length - 1; i++) {
    out.push(parts.slice(i).join("."));
  }
  return out;
}

// IP “real” já deve vir certo via Express + trust proxy no app.js
function getClientIP(request) {
  return request.ip || "";
}

// /forward/subscribe route control
const Subscribe_Action = async (request, response, next) => {
    try {
      // ----------------------------
      // Normalize inputs
      // ----------------------------
      const name = normStr(request.query?.name || "");
      const toRaw = request.query?.to || "";
      const domainInput = normStr(request.query?.domain || "");
      const clientIP = getClientIP(request);

      // ----------------------------
      // Mandatory params
      // ----------------------------
      if (!name) return response.status(400).json({ error: "invalid_params", field: "name" });
      if (!toRaw) return response.status(400).json({ error: "invalid_params", field: "to" });

      // ----------------------------
      // Strict validation
      // ----------------------------
      if (!isValidName(name)) {
        return response.status(400).json({
          error: "invalid_params",
          field: "name",
          hint: "allowed: a-z 0-9 dot; cannot start/end with dot; max 64",
        });
      }

      const toParsed = parseEmailStrict(toRaw);
      if (!toParsed) {
        return response.status(400).json({
          error: "invalid_params",
          field: "to",
          hint: "allowed local: a-z 0-9 dot underscore hyphen; domain: strict DNS; lowercase",
        });
      }

      let chosenDomain = domainInput || normStr(app_environment.DEFAULT_ALIAS_DOMAIN || "");
      if (!chosenDomain) {
        return response.status(500).json({ error: "server_misconfigured", field: "DEFAULT_ALIAS_DOMAIN" });
      }

      if (!isValidDomain(chosenDomain)) {
        // Se o default estiver inválido, isso é erro do servidor; se veio do user, erro 400.
        const status = domainInput ? 400 : 500;
        return response.status(status).json({
          error: domainInput ? "invalid_params" : "server_misconfigured",
          field: "domain",
          hint: "allowed: strict DNS domain (a-z 0-9 hyphen dot), TLD letters >=2",
        });
      }

      // ----------------------------
      // Ban rules
      // ----------------------------
      if (clientIP) {
        const bannedIP = await BANS_QUERIES.isBannedIP(clientIP);
        if (bannedIP) return response.status(403).json({ error: "banned", type: "ip" });
      }

      const bannedEmail = await BANS_QUERIES.isBannedEmail(toParsed.email);
      if (bannedEmail) return response.status(403).json({ error: "banned", type: "email" });

      // domain ban (suffix match)
      for (const suf of domainSuffixes(toParsed.domain)) {
        // suf já é derivado de domain validado via regex
        // e passa como string param (query preparada) => sem SQLi
        // bans.queries.js usa igualdade; aqui fazemos o “endsWith” por múltiplos checks.
        // (ex.: "sub.exbanido.com" => checa "sub.exbanido.com" e "exbanido.com")
        // Se você só quiser ban exato, substitua por um único check no domain original.
        // eslint-disable-next-line no-await-in-loop
        const bannedDom = await BANS_QUERIES.isBannedDomain(suf);
        if (bannedDom) return response.status(403).json({ error: "banned", type: "domain", value: suf });
      }

      // ----------------------------
      // Domain rules (alias domain must exist + active)
      // ----------------------------
      const domainRow = await DOMAIN_QUERIES.getActiveByName(chosenDomain);
      if (!domainRow) {
        return response.status(400).json({
          error: "invalid_domain",
          field: "domain",
          hint: "domain must exist in database and be active",
        });
      }

      // ----------------------------
      // Alias taken (não pode existir na tabela alias)
      // ----------------------------
      const aliasAddress = `${name}@${chosenDomain}`;

      const taken = await ALIAS_QUERIES.existsByAddress(aliasAddress);
      if (taken) {
        return response.status(409).json({
          ok: false,
          error: "alias_taken",
          address: aliasAddress,
        });
      }



      // ----------------------------
      // OK response 
      // ----------------------------

      const result = await sendEmailConfirmation({
        email: toParsed.email,
        requestIpText: request.ip,
        userAgent: String(request.headers["user-agent"] || ""),
        aliasName: name,
        aliasDomain: chosenDomain,
      });

        
      const ttlMinutes = Number(app_environment.EMAIL_CONFIRMATION_TTL_MINUTES ?? 10);
      const ttl = Number.isFinite(ttlMinutes) && ttlMinutes > 0 ? ttlMinutes : 10;

      return response.status(200).json({
        ok: true,
        action: "subscribe",
        alias_candidate: `${name}@${domainRow.name}`,
        to: toParsed.email,
        confirmation: {
          sent: Boolean(result.sent),
          ttl_minutes: ttl,
        },
      });
    } catch (err) {
              console.log(err);

      return response.status(500).json({ error: "internal_error" });
    }
  
};

module.exports = {
    Subscribe_Action
};