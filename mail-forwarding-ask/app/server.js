// /opt/forward-ask/server.js
const express = require("express");
const fs = require("fs");

const app = express();

//const ALLOWLIST_PATH = process.env.ALLOWLIST_PATH || "/etc/mail-forwarding/allowed_domains.txt";
const ALLOWLIST_PATH = process.env.ALLOWLIST_PATH || "allowed_domains.txt";

// validação básica (bloqueia lixo óbvio)
function normalizeHost(h) {
  if (!h) return "";
  h = String(h).trim().toLowerCase();
  if (h.endsWith(".")) h = h.slice(0, -1);
  return h;
}

function isValidHostname(h) {
  // sem wildcard, sem espaços, sem esquemas
  if (!h || h.length > 253) return false;
  if (h.includes("*")) return false;
  if (h.includes("://")) return false;
  if (h.includes(" ") || h.includes("\t") || h.includes("/")) return false;
  // precisa ter pelo menos um ponto
  if (!h.includes(".")) return false;

  // labels 1..63, [a-z0-9-], sem começar/terminar com -
  const labels = h.split(".");
  return labels.every(l => {
    if (!l || l.length > 63) return false;
    if (l.startsWith("-") || l.endsWith("-")) return false;
    return /^[a-z0-9-]+$/.test(l);
  });
}

function loadAllowlist() {
  try {
    const raw = fs.readFileSync(ALLOWLIST_PATH, "utf8");
    return new Set(
      raw
        .split("\n")
        .map(l => normalizeHost(l))
        .filter(l => l && !l.startsWith("#"))
    );
  } catch {
    return new Set();
  }
}

app.get("/ask", (req, res) => {
  const domain = normalizeHost(req.query.domain);
  if (!isValidHostname(domain)) return res.sendStatus(403);

  const allowed = loadAllowlist();
  if (!allowed.has(domain)) return res.sendStatus(403);

  return res.sendStatus(200);
});

app.listen(9000, "127.0.0.1", () => {
  console.log("forward-ask listening on 127.0.0.1:9000");
});
