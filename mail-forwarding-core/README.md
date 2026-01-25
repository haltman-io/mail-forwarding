# mail-forwarding-core

> **A simple, complete, abuse-aware, open-source mail forwarding stack**

mail-forwarding-core (or simply **core**) is the reference implementation used by **Haltman.io** to provide a free, public, production-grade mail forwarding service.

It is designed to be:

* Fully open-source
* Stateless (no mailbox storage)
* Abuse-aware by design
* Deterministic and auditable
* Scalable by composition, not complexity

There is **no open-core**, **no artificial limitation**, and **no telemetry**.

A public instance is available at:

👉 [https://forward.haltman.io/](https://forward.haltman.io/)

This document describes **how to install, configure, and validate the full stack** from scratch.

---

## Architecture Overview

mail-forwarding-core is composed of five main building blocks:

| Component | Role                               |
| --------- | ---------------------------------- |
| Postfix   | SMTP engine and policy enforcement |
| PostSRSd  | Sender Rewriting Scheme (SRS)      |
| MariaDB   | Domain and alias lookup backend    |
| OpenDKIM  | Optional DKIM signing              |
| DNS       | Authentication and routing         |

### High-level flow

```
Inbound Mail
   ↓
Postfix (smtpd)
   ↓  (domain + alias lookup)
MariaDB
   ↓
PostSRSd (SRS rewrite)
   ↓
Postfix (smtp)
   ↓
External Destination
```

No messages are stored. No queues are inspected. No content is logged.

---

## Installation Order (Important)

The order below is **mandatory**:

1. MariaDB (schema + user)
2. DNS records (MX / SPF / DMARC)
3. PostSRSd
4. Postfix
5. OpenDKIM (optional, last)

Installing components out of order will cause misleading failures.

---

## 1. MariaDB (Lookup Backend)

MariaDB is used **only** as a lookup backend. Postfix never writes to it.

### Install

```bash
sudo apt install mariadb-server
```

### Create database and user

```sql
CREATE DATABASE maildb;

CREATE USER 'maildb'@'localhost' IDENTIFIED BY 'strong-password';
GRANT SELECT, INSERT ON maildb.* TO 'maildb'@'localhost';
FLUSH PRIVILEGES;
```

### Required tables

#### `domain`

```sql
CREATE TABLE domain (
  id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  active TINYINT(1) DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY (name)
);
```

#### `alias`

```sql
CREATE TABLE alias (
  id INT NOT NULL,
  address VARCHAR(255) NOT NULL,
  goto VARCHAR(255) NOT NULL,
  active TINYINT(1) DEFAULT 1,
  domain_id INT NOT NULL,
  created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY (address),
  FOREIGN KEY (domain_id) REFERENCES domain(id)
);
```

MariaDB setup is now complete.

---

## 2. DNS Configuration

Each forwarded domain **must** define DNS records correctly.

### Required records

#### MX

```dns
example.org. MX 10 mail.example.net.
```

#### SPF

```dns
example.org. TXT "v=spf1 mx -all"
```

#### DMARC

```dns
_dmarc.example.org. TXT "v=DMARC1; p=none"
```

### Optional (recommended): DKIM

If OpenDKIM is enabled later, a DKIM record will be required.

---

## 3. PostSRSd (Mandatory)

Mail forwarding **requires SRS** to preserve SPF alignment.

### Install

```bash
sudo apt install postsrsd
```

### Configuration

Edit `/etc/default/postsrsd`:

```ini
SRS_DOMAIN=example.org
SRS_SECRET=/etc/postsrsd.secret
SRS_FORWARD_PORT=10001
SRS_REVERSE_PORT=10002
SRS_LISTEN_ADDR=127.0.0.1
RUN_AS=postsrsd
```

### Generate secret

```bash
openssl rand -hex 32 | sudo tee /etc/postsrsd.secret
sudo chmod 600 /etc/postsrsd.secret
```

### Start service

```bash
sudo systemctl enable postsrsd
sudo systemctl restart postsrsd
```

Validate:

```bash
ss -ltnp | grep 1000
```

---

## 4. Postfix (Core Engine)

Postfix acts strictly as a forwarding MTA.

### Install

```bash
sudo apt install postfix postfix-mysql
```

Choose **Internet Site**, but delivery will be disabled.

### Key principles

* No local delivery
* No open relay
* MySQL-backed domains and aliases
* Sender spoofing protection
* Mandatory SRS integration

### main.cf (conceptual highlights)

```ini
mydestination =

virtual_alias_domains = mysql:/etc/postfix/mysql-virtual-domains.cf
virtual_alias_maps = mysql:/etc/postfix/mysql-virtual-aliases.cf

sender_canonical_maps = tcp:localhost:10001
recipient_canonical_maps = tcp:localhost:10002

smtpd_sender_restrictions =
  reject_unknown_sender_domain,
  check_sender_access mysql:/etc/postfix/mysql-block-local-senders.cf
```

Inbound SRS addresses are explicitly rejected using:

```
block_srs_inbound.regexp
```

### Restart

```bash
sudo systemctl restart postfix
```

---

## 5. OpenDKIM (Optional, Recommended)

OpenDKIM signs outbound mail to improve deliverability.

### Install

```bash
sudo apt install opendkim opendkim-tools
```

### Socket

OpenDKIM listens on:

```
inet:127.0.0.1:8891
```

Postfix connects via milter.

### Tables

* `KeyTable`
* `SigningTable`
* `TrustedHosts`

Private keys are **deployment-specific** and must never be committed.

If OpenDKIM is not installed, simply remove milter directives from Postfix.

---

## Validation Checklist

* [ ] MX resolves to Postfix host
* [ ] SPF passes on forwarded mail
* [ ] SRS rewrite visible in headers
* [ ] No local delivery occurs
* [ ] External spoofing is rejected
* [ ] DKIM (if enabled) signs correctly

---

## FAQ

### Is this an open relay?

No. Relay and recipient restrictions are explicit.

### Are mails logged?

No message content is logged. Only minimal MTA operational logs exist.

### Is PostSRSd optional?

No. Forwarding without SRS breaks SPF.

### Why reject inbound SRS addresses?

To prevent external SRS forgery and abuse.

### Can I use multiple domains?

Yes. Domains and aliases are unlimited.

### Is OpenDKIM mandatory?

No, but strongly recommended for production.

### Does this store mailboxes?

No. This is forwarding only.

---

## Security & Disclosure

If you find a vulnerability or misconfiguration:

📧 [security@haltman.io](mailto:security@haltman.io)

We respond as fast as possible.

---

## Community & Support

Join the Haltman.io Telegram group for:

* Questions
* Networking
* Design discussions
* Operational feedback

👉 [https://t.me/haltman_group](https://t.me/haltman_group)

---

## References

* [https://haltman.io/](https://haltman.io/)
* [https://haltman.io/about](https://haltman.io/about)
* [https://forward.haltman.io](https://forward.haltman.io)

---

## Final Notes

mail-forwarding-core is intentionally **boring**.

No magic. No abstractions. No vendor lock-in.

If you understand SMTP, you can understand — and trust — this stack.
