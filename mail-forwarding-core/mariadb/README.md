# MariaDB Configuration (Postfix Backend)

This document describes the **MariaDB setup required by Postfix** for the
`mail-forwarding` project.

Only the **minimum database components** required by the MTA are documented
here. The database is used strictly as a **lookup backend**, not as a message
store.

---

## Scope

This database schema supports:

- Virtual domain validation
- Address alias resolution
- Mail forwarding decisions

It does **not** store mailboxes, messages, or user credentials.

---

## Required Tables

Postfix directly queries **only two tables**:

- `domain`
- `alias`

All other tables are considered auxiliary and outside the MTA core.

---

## Database Creation

Access MariaDB:

```bash
sudo mysql
```

Create the database:

```sql
CREATE DATABASE maildb;
```

---

## Database User

Create a dedicated user with **minimal privileges**:

```sql
CREATE USER 'db_username'@'localhost' IDENTIFIED BY 'db_p4ssw0rd';
GRANT SELECT, INSERT ON maildb.* TO 'db_username'@'localhost';
FLUSH PRIVILEGES;
```

> The Postfix lookup backend requires only read access.
> `INSERT` is granted for administrative tooling, not for Postfix itself.

---

## Schema Definition

Select the database:

```sql
USE maildb;
```

### `domain` Table

Defines which domains are handled by the forwarding service.

```sql
CREATE TABLE `domain` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `active` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Notes:**

* Each row represents a managed domain
* `active` controls whether the domain is accepted by Postfix
* Primary keys are intentionally **not auto-generated**
* Identifier assignment is handled externally for deterministic behavior

---

### `alias` Table

Defines address-level forwarding rules.

```sql
CREATE TABLE `alias` (
  `id` int(11) NOT NULL,
  `address` varchar(255) NOT NULL,
  `goto` varchar(255) NOT NULL,
  `active` tinyint(1) DEFAULT 1,
  `domain_id` int(11) NOT NULL,
  `created` timestamp NULL DEFAULT current_timestamp(),
  `modified` timestamp NULL DEFAULT current_timestamp()
    ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_alias_address` (`address`),
  KEY `address` (`address`),
  KEY `domain_id` (`domain_id`),
  CONSTRAINT `alias_ibfk_1`
    FOREIGN KEY (`domain_id`) REFERENCES `domain` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Notes:**

* `address` must be a full email address (local-part + domain)
* `goto` may contain one or more destination addresses
* `domain_id` enforces referential integrity with `domain`
* Timestamps are managed automatically by MariaDB
* No auto-incremented fields are used

---

## Postfix Integration

Postfix queries these tables via MySQL maps, typically using:

* `virtual_alias_domains`
* `virtual_alias_maps`
* Sender validation queries (anti-spoofing)

Postfix **never modifies** database contents.

---

## Example Data (Optional)

```sql
INSERT INTO domain (id, name, active)
VALUES (1, 'example.org', 1);

INSERT INTO alias (id, address, goto, domain_id, active)
VALUES (
  1,
  'info@example.org',
  'user@external-provider.net',
  1,
  1
);
```

---

## Security Considerations

* No credentials are stored in the schema
* Postfix uses read-only access
* All write operations are performed externally
* Foreign keys prevent orphaned aliases
* The schema is minimal by design

---

## Schema Dump

To export the schema without data:

```bash
mysqldump --no-data maildb > maildb.schema.sql
```

This dump contains table definitions only and is safe to publish.

---

## Summary

* MariaDB is used strictly as a lookup backend
* Only `domain` and `alias` are queried by Postfix
* No auto-generated identifiers are used
* The schema is intentionally minimal and deterministic

This design prioritizes clarity, auditability, and operational safety.
