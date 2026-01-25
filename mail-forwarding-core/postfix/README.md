# Postfix Configuration Reference

This directory contains **reference Postfix configuration files** used by the
`mail-forwarding` project.

These files are intentionally provided as **realistic, production-inspired examples**.
They are meant to document **architecture, behavior, and security decisions** — not to
serve as a copy-paste, one-command deployment.

If you understand Postfix, these files should be sufficient to reproduce the same
behavior in your own environment after adapting them to your infrastructure.

---

## Scope and Intent

The configurations in this directory describe a Postfix setup with the following goals:

- Act strictly as a **mail forwarding / aliasing service**
- **No local mailbox delivery**
- Domains and aliases managed via **MySQL**
- Strong **anti-spoofing** and **anti-open-relay** posture
- Explicit handling of **SRS (Sender Rewriting Scheme)**
- Designed to integrate with **DKIM** and external policy services

This is **not** a beginner guide to Postfix.
Basic familiarity with Postfix concepts is assumed.

---

## Files Overview

### `main.cf`

Primary Postfix configuration.

Key characteristics:

- No `mydestination` → no local delivery
- Virtual domains and aliases backed by MySQL
- Explicit relay and recipient restrictions
- HELO/EHLO hygiene
- Integration points for:
  - SRS (TCP maps)
  - DKIM (milter)

TLS settings are intentionally commented out.

---

### `master.cf`

Service definitions used by Postfix.

- Largely defaults
- No unsafe overrides
- No custom listeners exposed

Provided for completeness and transparency.

---

### `mysql-virtual-domains.cf`

Defines how Postfix queries MySQL to determine which domains are accepted.

This file controls:

- Which domains are considered **local/virtual**
- Whether a domain is active

---

### `mysql-virtual-aliases.cf`

Defines how Postfix resolves email aliases via MySQL.

This file controls:

- Address → destination mappings
- Forwarding behavior

---

### `mysql-block-local-senders.cf`

Implements **dynamic sender spoofing protection**.

Instead of returning data, this query intentionally returns a **static REJECT**
when the sender domain matches an active local domain.

This prevents external clients from forging `MAIL FROM` addresses belonging
to hosted domains.

This behavior is deliberate.

---

### `block_srs_inbound.regexp`

Rejects inbound messages with SRS-formatted senders.

This ensures:

- SRS is only used internally for forwarding
- External SRS traffic is not accepted blindly

---

## Implicit Dependencies (Important)

These configurations assume the presence of additional components.
They are **not** included or deployed automatically.

You **must** account for them if you reuse these files.

### 1. SRS daemon (postsrsd or equivalent)

The following lines in `main.cf`:

```ini
sender_canonical_maps = tcp:localhost:10001
recipient_canonical_maps = tcp:localhost:10002
```

Assume:

* An SRS daemon listening on:

  * `localhost:10001` (forward rewriting)
  * `localhost:10002` (reverse rewriting)

If no daemon is running, Postfix will fail to process addresses correctly.

---

### 2. DKIM milter

The following line in `main.cf`:

```ini
smtpd_milters = inet:127.0.0.1:8891
```

Assumes:

* OpenDKIM (or compatible milter)
* Listening locally on port `8891`

DKIM keys, selector management, and DNS records are **out of scope** for this directory.

---

### 3. MySQL / MariaDB schema

The MySQL queries assume:

* A database schema containing at least:

  * `domain`
  * `alias`
* Fields such as:

  * `name`
  * `address`
  * `goto`
  * `active`

Schema creation and migrations are handled elsewhere in the project.

---

## Security Considerations

* No credentials are embedded in these files.
* All database credentials are placeholders.
* No real IP addresses are exposed.
* TLS is intentionally disabled in this reference configuration.

TLS **must** be enabled in real deployments after certificates are provisioned.

---

## FAQ

### ❓ Are these files safe to publish publicly?

Yes.

They contain **no secrets**, **no credentials**, and **no environment-specific identifiers**.
They document behavior and architecture only.

---

### ❓ Can I deploy Postfix by copying these files as-is?

No.

These files are **reference configurations**, not an installer.
You must adapt:

* Domains
* Database credentials
* TLS certificates
* Auxiliary services (SRS, DKIM)

---

### ❓ Why is TLS commented out?

Because certificate provisioning is environment-specific.

Leaving TLS enabled without valid certificates causes startup failures and confusion.
The example prioritizes clarity over false completeness.

---

### ❓ Why does `mysql-block-local-senders.cf` return a static `REJECT`?

This is intentional.

The query is used purely as a **boolean existence check**.
If the sender domain exists and is active locally, Postfix rejects the sender to prevent spoofing.

---

### ❓ Why reject inbound SRS addresses?

Because SRS is an **internal forwarding mechanism**.

Accepting external SRS blindly increases abuse surface and breaks trust assumptions.

---

### ❓ Is this an open relay?

No.

Explicit relay and recipient restrictions are enforced.
Postfix will only relay mail for authorized virtual domains.

---

### ❓ Where are SPF, DKIM, and DMARC configured?

Outside of this directory.

This folder documents **Postfix behavior only**.
DNS configuration and policy enforcement are handled elsewhere in the project.

---

## Final Notes

This directory exists to:

* Make design decisions explicit
* Document security posture
* Enable reproducibility by experienced operators

If you are looking for a “one-click mail server”, this is not it.

If you are looking for a **transparent, abuse-aware mail forwarding architecture**,
you are in the right place.