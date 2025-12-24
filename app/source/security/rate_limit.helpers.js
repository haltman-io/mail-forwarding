const RATE_LIMIT_HELPERS = {
  NORMALIZE_STRING: (v) => {
    if (typeof v !== "string") return "";
    return v.trim().toLowerCase();
  },

  NORMALIZE_EMAIL: (v) => {
    // só normaliza pra chave, sem validar formato
    return RATE_LIMIT_HELPERS.NORMALIZE_STRING(v);
  },

  NORMALIZE_GET_TO: (req) => {
    return RATE_LIMIT_HELPERS.NORMALIZE_EMAIL(req.query?.to);
  },

  NORMALIZE_GET_DOMAIN: (req) => {
    return RATE_LIMIT_HELPERS.NORMALIZE_STRING(req.query?.domain || "");
  },

  NORMALIZE_GET_NAME: (req) => {
    return RATE_LIMIT_HELPERS.NORMALIZE_STRING(req.query?.name || "");
  },

  // (novo) normalize "address" (unsubscribe)
  NORMALIZE_GET_ADDRESS: (req) => {
    return RATE_LIMIT_HELPERS.NORMALIZE_EMAIL(req.query?.address);
  },

  // (novo) normalize token (confirm)
  NORMALIZE_GET_TOKEN: (req) => {
    // token não é email, mas normalização básica ajuda a estabilidade da key
    return RATE_LIMIT_HELPERS.NORMALIZE_STRING(req.query?.token || req.params?.token || "");
  },
};

module.exports = { RATE_LIMIT_HELPERS };
