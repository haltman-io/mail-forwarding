# DNS Configuration Reference

This document describes the **minimum DNS records required** for the
`mail-forwarding` project to operate correctly with Postfix.

All examples use placeholder domains and hosts and are safe to publish.
They are intended to document **expected DNS behavior**, not to expose
any real infrastructure.

---

## Scope

This DNS configuration supports:

- Mail delivery to the forwarding service
- SPF validation for inbound mail
- DMARC policy declaration
- Optional DKIM signing (when OpenDKIM is enabled)

Only records **directly required or recommended** by the MTA are covered.

---

## Minimum Required DNS Records

The following records are required for a domain to function with the
mail forwarding service.

### MX Record

Defines which host receives mail for the domain.

```dns
example.com.    MX  10 mail.example-mta.net.
```

**Notes:**

* The MX target must resolve to the Postfix host
* Priority value (`10`) is arbitrary but conventional
* The MX hostname must have a valid A or AAAA record

---

### SPF Record

Defines which hosts are authorized to send mail for the domain.

```dns
example.com.    TXT "v=spf1 mx -all"
```

**Notes:**

* `mx` authorizes the MX host to send mail
* `-all` enforces a strict fail policy
* Required for SPF alignment during forwarding

---

### DMARC Record

Defines the domain’s DMARC policy.

```dns
_dmarc.example.com.    TXT "v=DMARC1; p=none"
```

**Notes:**

* `p=none` enables monitoring without enforcement
* Recommended as a baseline for new domains
* Stricter policies (`quarantine`, `reject`) may be used later

---

## Optional: DKIM (OpenDKIM)

If OpenDKIM is enabled, DKIM records **should be published** to improve
deliverability and DMARC alignment.

This is optional but strongly recommended for production use.

---

### DKIM TXT Record (Example)

```dns
selector1._domainkey.example.com. TXT (
  "v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A..."
)
```

**Notes:**

* `selector1` must match the selector configured in OpenDKIM
* The public key (`p=`) is generated per deployment
* Line breaks are allowed depending on DNS provider
* Only the public key is published in DNS

---

## Record Summary

| Record Type | Purpose                          | Required |
| ----------- | -------------------------------- | -------- |
| MX          | Mail delivery                    | Yes      |
| SPF         | Sender authorization             | Yes      |
| DMARC       | Policy declaration               | Yes      |
| DKIM        | Message signing & authentication | Optional |

---

## Common Misconfigurations

* MX pointing to a host without Postfix
* SPF missing `mx` for forwarding setups
* DMARC enforced before DKIM is deployed
* DKIM selector mismatch between DNS and OpenDKIM

---

## Summary

* DNS configuration is a critical part of mail forwarding
* MX, SPF, and DMARC are mandatory
* DKIM is optional but recommended
* All examples are placeholders and safe for documentation

This DNS setup is intentionally minimal and aligned with the Postfix
configuration used by the project.