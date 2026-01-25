# OpenDKIM Configuration (Optional)

This directory documents the **OpenDKIM configuration used by the mail-forwarding project**.

OpenDKIM is **optional but strongly recommended**.  
When enabled, it signs outbound messages for hosted domains, improving
deliverability and trust with receiving MTAs.

The configuration provided here is a **reference implementation**, intended
to document design decisions and expected behavior.

---

## Scope

This OpenDKIM setup is designed to:

- Sign outgoing mail for locally hosted domains
- Integrate with Postfix via milter
- Operate entirely on localhost
- Support multiple domains and selectors via tables
- Avoid exposing unnecessary attack surface

Key generation and DNS publication are **deployment-specific** and not automated.

---

## Files Overview

### `opendkim.conf`

Main OpenDKIM daemon configuration.

Notable characteristics:

- Runs as an unprivileged user
- Logs to syslog with success and failure visibility
- Uses relaxed/simple canonicalization
- Signs only selected headers
- Listens locally via an INET socket

Relevant excerpts:

```ini
Syslog                  yes
SyslogSuccess           yes
LogWhy                  yes

Canonicalization        relaxed/simple
SubDomains              no
OversignHeaders         From

UserID                  opendkim
UMask                   007

Socket                  inet:8891@127.0.0.1
PidFile                 /run/opendkim/opendkim.pid

KeyTable                /etc/opendkim/KeyTable
SigningTable            refile:/etc/opendkim/SigningTable
ExternalIgnoreList      /etc/opendkim/TrustedHosts
InternalHosts           /etc/opendkim/TrustedHosts
```

---

### `KeyTable`

Maps DKIM selectors and domains to private key files.

Example structure:

```
selector1._domainkey.example.org example.org:selector1:/etc/opendkim/keys/example.org/selector1.private
```

**Notes:**

* Private key files must never be committed
* File paths are deployment-specific
* One selector per domain is typical, but multiple are supported

---

### `SigningTable`

Defines which domains or addresses should be DKIM-signed and which selector
should be used.

Example structure:

```
*@example.org selector1._domainkey.example.org
```

This allows:

* Per-domain signing rules
* Flexible expansion to multiple domains

---

### `TrustedHosts`

Defines hosts and networks trusted by OpenDKIM.

This file is used for both:

* `InternalHosts`
* `ExternalIgnoreList`

Typical entries include:

```
127.0.0.1
localhost
```

Only mail originating from trusted sources will be signed.

---

## Postfix Integration

Postfix integrates with OpenDKIM via a milter.

The Postfix configuration assumes:

```ini
smtpd_milters = inet:127.0.0.1:8891
non_smtpd_milters = inet:127.0.0.1:8891
```

If OpenDKIM is disabled, these directives must be removed or commented out.

---

## Optional Nature of OpenDKIM

OpenDKIM is **not strictly required** for forwarding to function.

However, without DKIM:

* Some receiving MTAs may apply stricter spam filtering
* DMARC alignment may be incomplete, depending on the forwarding path

For production usage, enabling DKIM is highly recommended.

---

## DNS Requirements (Out of Scope)

For DKIM to function correctly, each selector must have a corresponding DNS
record published under:

```
selector._domainkey.example.org
```

DNS record creation, rotation policies, and key management are intentionally
out of scope for this directory.

---

## Security Considerations

* Private keys must be readable only by the `opendkim` user
* The daemon binds only to localhost
* No external network exposure is required
* Logging is enabled for traceability and troubleshooting

---

## Failure Modes

Common issues include:

* Missing or unreadable private key files
* Mismatched selectors between `KeyTable` and `SigningTable`
* Postfix milter connection failures on port `8891`
* DKIM signatures missing due to untrusted source IPs

Always verify OpenDKIM status before debugging Postfix.

---

## Summary

* OpenDKIM is **optional but recommended**
* Configuration is table-driven and scalable
* Private keys and DNS records are deployment-specific
* This directory documents behavior, not automation

If DKIM is enabled, ensure Postfix, OpenDKIM, and DNS are consistent.