# Free Mail Forwarding Service — Base Stack (Postfix + PostSRSd + MariaDB)

This document explains how to install and deploy a **mail forwarding** stack using:

* **Postfix** (MTA)
* **PostSRSd** (SRS rewriting for forwarded mail)
* **MariaDB** (dynamic domains + alias routing)

> Scope: **base stack only** (no Node.js/API in this README). 

---

## Why PostSRSd (SRS) matters

When you forward mail, SPF/DMARC can break because the forwarded message may fail SPF at the final destination. **SRS** rewrites the envelope sender, preventing many forwarding-related rejections.

---

## Requirements

### Infrastructure

* A Linux server (this guide was tested on **Debian 13 / Trixie**) 
* A **public IPv4** (IPv6 optional)
* Ability to open TCP ports:

  * **25/tcp** inbound (receive mail)
  * **25/tcp** outbound (deliver/forward mail)
* A domain you control (DNS access)

### Packages

* `postfix`
* `postfix-mysql`
* `postsrsd`
* `mariadb-server` 

---

## DNS Configuration (for each mail domain you host)

You must configure DNS for any domain that will **receive mail** via this server.

Replace:

* `example.org` → your domain
* `mail.example.org` → your mail host
* `<YOUR_IPV4>` / `<YOUR_IPV6>` → your server IPs

### 1) MX record (required)

```
example.org.   MX 10 mail.example.org.
```

### 2) A / AAAA for the mail host (required)

```
mail.example.org.  A     <YOUR_IPV4>
mail.example.org.  AAAA  <YOUR_IPV6>    # optional
```

### 3) SPF (strongly recommended)

```
example.org.  TXT "v=spf1 ip4:<YOUR_IPV4> ip6:<YOUR_IPV6> -all"
```

### 4) DMARC (recommended, start permissive)

```
_dmarc.example.org. TXT "v=DMARC1; p=none; rua=mailto:dmarc@example.org; fo=1"
```

### PTR / Reverse DNS (highly recommended for outbound deliverability)

Ask your server provider to set:

* `<YOUR_IPV4> → mail.example.org`

And ensure:

* `mail.example.org → <YOUR_IPV4>` (A record)

> PTR is configured **at your VPS/provider**, not in Cloudflare.

---

## Install (Debian 13)

```bash
sudo apt update
sudo apt install -y mariadb-server postfix postfix-mysql postsrsd
```

During Postfix install, you may be prompted for basic settings. You can accept defaults and adjust later in `/etc/postfix/main.cf`.

---

## MariaDB Setup

### 1) Create database and user

Login:

```bash
sudo mysql
```

Create database + user (replace placeholders):

```sql
CREATE DATABASE maildb;

CREATE USER 'db_username'@'localhost' IDENTIFIED BY 'db_p4ssw0rd';

GRANT SELECT, INSERT ON maildb.* TO 'db_username'@'localhost';
FLUSH PRIVILEGES;
```

> If you want MariaDB to be **local-only**, ensure it binds to localhost (recommended for this stack).

### 2) Create required tables

Use the schemas below (from the project requirements). 

```sql
USE maildb;

CREATE TABLE `domain` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `active` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `alias` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `address` varchar(255) NOT NULL,
  `goto` varchar(255) NOT NULL,
  `active` tinyint(1) DEFAULT 1,
  `domain_id` int(11) NOT NULL,
  `created` timestamp NULL DEFAULT current_timestamp(),
  `modified` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_alias_address` (`address`),
  KEY `address` (`address`),
  KEY `domain_id` (`domain_id`),
  CONSTRAINT `alias_ibfk_1` FOREIGN KEY (`domain_id`) REFERENCES `domain` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 3) Insert your first domain

Replace `example.org` with your real domain:

```sql
INSERT INTO domain (name, active) VALUES ('example.org', 1);
```

---

## Postfix + MySQL Lookups

Postfix will query MariaDB to determine:

* which **domains** it accepts (`domain` table)
* where to forward each **alias** (`alias` table)

### 1) Alias lookup file

Create:

```bash
sudo nano /etc/postfix/mysql-virtual-aliases.cf
```

Content (replace placeholders):

```conf
user = db_username
password = db_p4ssw0rd
hosts = 127.0.0.1
dbname = maildb
query = SELECT goto FROM alias WHERE address='%s' AND active=1
```

Lock down permissions:

```bash
sudo chmod 640 /etc/postfix/mysql-virtual-aliases.cf
sudo chown root:postfix /etc/postfix/mysql-virtual-aliases.cf
```

### 2) Domain lookup file

Create:

```bash
sudo nano /etc/postfix/mysql-virtual-domains.cf
```

Content:

```conf
user = db_username
password = db_p4ssw0rd
hosts = 127.0.0.1
dbname = maildb
query = SELECT 1 FROM domain WHERE name='%s' AND active=1
```

Permissions:

```bash
sudo chmod 640 /etc/postfix/mysql-virtual-domains.cf
sudo chown root:postfix /etc/postfix/mysql-virtual-domains.cf
```

---

## PostSRSd Setup

### 1) Configure PostSRSd

Edit:

```bash
sudo nano /etc/default/postsrsd
```

Minimal working config (replace `example.org` with your real domain): 

```conf
SRS_DOMAIN=example.org
SRS_SECRET=/etc/postsrsd.secret
SRS_EXCLUDE_DOMAINS=
SRS_SEPARATOR=+
```

Generate secret:

```bash
sudo openssl rand -hex 32 | sudo tee /etc/postsrsd.secret >/dev/null
sudo chmod 600 /etc/postsrsd.secret
```

Enable and start:

```bash
sudo systemctl enable postsrsd
sudo systemctl restart postsrsd
sudo systemctl status postsrsd --no-pager
```

Verify ports (typically 10001 forward / 10002 reverse): 

```bash
ss -lntp | grep postsrsd
```

---

## Postfix Configuration (Forwarding + SRS + SQL)

Edit:

```bash
sudo nano /etc/postfix/main.cf
```

Add/ensure these lines exist (replace `mail.example.org` + `example.org` with your values):

```conf
# Identity (can differ from OS hostname)
myhostname = mail.example.org
mydomain = example.org
myorigin = $mydomain

inet_interfaces = all
inet_protocols = ipv4

# Do NOT treat this as local mailbox delivery
mydestination =

# Dynamic accepted domains + alias maps (MariaDB)
virtual_alias_domains = mysql:/etc/postfix/mysql-virtual-domains.cf
virtual_alias_maps = mysql:/etc/postfix/mysql-virtual-aliases.cf

# Anti-open-relay (required)
smtpd_relay_restrictions = permit_mynetworks, reject_unauth_destination
smtpd_recipient_restrictions = reject_unauth_destination

# SRS integration (PostSRSd)
sender_canonical_maps = tcp:localhost:10001
sender_canonical_classes = envelope_sender

recipient_canonical_maps = tcp:localhost:10002
recipient_canonical_classes = envelope_recipient
```

Reload Postfix:

```bash
sudo postfix reload
sudo systemctl status postfix --no-pager
```

---

## Add Domains and Aliases (Operational Workflow)

### Add a new domain

```sql
INSERT INTO domain (name, active) VALUES ('new-domain.tld', 1);
```

### Disable a domain

```sql
UPDATE domain SET active=0 WHERE name='new-domain.tld';
```

### Add an alias (forward rule)

1. Find domain id:

```sql
SELECT id, name FROM domain WHERE name='example.org';
```

2. Insert alias (replace placeholders):

```sql
INSERT INTO alias (address, goto, active, domain_id)
VALUES ('alias@example.org', 'destination@somewhere.tld', 1, <DOMAIN_ID>);
```

> Postfix picks changes **immediately** (no restart needed).

---

## Validate Locally (Recommended)

### Test SQL lookups from Postfix

```bash
postmap -q example.org mysql:/etc/postfix/mysql-virtual-domains.cf
postmap -q alias@example.org mysql:/etc/postfix/mysql-virtual-aliases.cf
```

Expected output:

* `domain` lookup returns `1`
* `alias` lookup returns the `goto` destination

### Watch Postfix logs

```bash
journalctl -u postfix -f
```

---

## Security Notes (Baseline)

* Ensure MariaDB binds to localhost (recommended).
* Keep `/etc/postfix/mysql-*.cf` readable only by root and postfix group.
* Keep `reject_unauth_destination` enabled (never run a relay without it).

---

## Optional: Periodic Cleanup (Project DB)

If your project uses the `email_confirmations` table, the requirements include a cleanup script + cron guidance (e.g., every 10 minutes) to delete expired confirmations. 
This is **optional** for the base mail stack and applies to your application layer.

---

## Troubleshooting

### Postfix refuses to start with relay restriction errors

Ensure you have at least:

```conf
smtpd_relay_restrictions = permit_mynetworks, reject_unauth_destination
```

### Postfix accepts mail but delivery fails externally

Common causes:

* missing PTR / reverse DNS
* outbound port 25 blocked by provider
* no SPF / poor IP reputation

---

## Disclaimer

Operate this stack responsibly. Ensure you control the domains you host and comply with provider and legal constraints.

## License

This project is licensed under the Unlicense, see the [LICENSE](LICENSE) file for details.