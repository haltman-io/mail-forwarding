# Free Mail Forwarding API (Node.js)

⚠️ **Important prerequisite**

This Node.js project **depends on the base-postfix-forwarder** to run properly.

Before installing or running this API, **you MUST read and deploy the base-postfix-forwarder first**, since this service **writes directly into the same database used by the base-postfix-forwarder** (Postfix + MariaDB stack).

👉 **Read first:**
📄 [`FWD-Basestack.md`](./FWD-Basestack.md)

---

## Overview

This project is a **Mail Forwarding Service API** built with Node.js and Express.

It exposes HTTP endpoints that allow users to:

* Create email aliases (`subscribe`)
* Confirm alias creation via email
* Request alias removal (`unsubscribe`)
* Confirm alias removal via email

All operations are:

* **Rate-limited**
* **Protected against abuse**
* **Confirmed via email tokens**
* **Persisted directly into the base-postfix-forwarder MariaDB database**

This API **does not receive emails**.
It only **manages forwarding rules (aliases)** that the base-postfix-forwarder mail server will later use.

---

## Tech Stack

* Node.js
* Express
* MariaDB
* Nodemailer

### Libraries Used

* `express`
* `cors`
* `dotenv`
* `express-rate-limit`
* `express-slow-down`
* `mariadb`
* `nodemailer`

---

## Architecture

```
Client
  │
  │ HTTP Requests
  ▼
Node.js API (this project)
  │
  │ SQL INSERT / UPDATE / DELETE
  ▼
MariaDB (base-postfix-forwarder)
  │
  ▼
Postfix (Mail Forwarding)
```

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/haltman-io/mail-forwarding.git
cd ./mail-forwarding/app
```

---

### 2. Install dependencies

```bash
npm install
```

---

### 3. Create the `.env` file

This project **does not ship with a `.env` file**.

You must create one manually.

```bash
cp .env.example .env
```

If `.env.example` is not present, create a new `.env` file from scratch.

---

## Environment Configuration (`.env`)

Below is a **guided explanation** of the required environment variables.

---

### Application

```env
APP_ENV=dev
APP_PORT=3000
TRUST_PROXY=1
```

* `APP_ENV`: `dev`, `hml`, or `prod`
* `APP_PORT`: Express listening port
* `TRUST_PROXY`: number of reverse proxies in front of the app
  (important for rate limiting by IP)

---

### Public URL & Confirmation

```env
APP_PUBLIC_URL=http://127.0.0.1:8080
EMAIL_CONFIRM_CONFIRM_ENDPOINT=/forward/confirm
```

Used to generate confirmation links sent by email.

---

### Email Confirmation Tokens

```env
EMAIL_CONFIRMATION_TTL_MINUTES=10
EMAIL_CONFIRMATION_RESEND_COOLDOWN_SECONDS=60
EMAIL_CONFIRMATION_TOKEN_LEN=12
EMAIL_CONFIRMATION_TOKEN_MIN_LEN=10
EMAIL_CONFIRMATION_TOKEN_MAX_LEN=24
```

Controls token lifetime, size, validation, and resend behavior.

---

### SMTP Configuration (Required)

```env
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_AUTH_ENABLED=true
SMTP_USER=
SMTP_PASS=
SMTP_FROM="John Doe <john.doe@ccc.de>"
SMTP_TLS_REJECT_UNAUTHORIZED=true
```

⚠️ Without a working SMTP configuration, **no confirmation emails will be sent**.

---

### MariaDB (base-postfix-forwarder Database)

```env
MARIADB_HOST=
MARIADB_PORT=
MARIADB_USER=
MARIADB_PASSWORD=
MARIADB_DATABASE=
```

These credentials **must point to the SAME database used by the base-postfix-forwarder**.

---

### Redis (Optional, Recommended for Production)

```env
REDIS_URL=
REDIS_RATE_LIMIT_PREFIX=rl:
REDIS_CONNECT_TIMEOUT_MS=5000
```

* If `REDIS_URL` is empty, rate-limit uses in-memory storage (not shared).
* For multi-instance setups, Redis is **strongly recommended**.

---

### Rate Limiting & Abuse Protection

The API applies **different limits per route, IP, alias, token, and destination**.

Examples:

```env
RL_GLOBAL_PER_MIN=300
RL_SUBSCRIBE_PER_10MIN_PER_IP=60
RL_CONFIRM_PER_10MIN_PER_IP=120
```

These values are directly consumed by the middleware.

---

### Default Alias Domain

```env
DEFAULT_ALIAS_DOMAIN=thc.org
```

Used when the user does not specify `?domain=`.

---

## Running the Application

```bash
node ./source/server.js
```

Or with process managers:

```bash
pm2 start ./source/server.js --name mail-forwarding-api --no-daemon
```

---

## API Endpoints

### 1. `POST /forward/subscribe`

Request creation of a new email alias.

#### Input (JSON)

```json
{
  "name": "github",
  "to": "user@gmail.com",
  "domain": "example.org"
}
```

* `domain` is optional
* If omitted, `DEFAULT_ALIAS_DOMAIN` is used

---

#### Possible Responses

| Status | Code             | Meaning                       |
| ------ | ---------------- | ----------------------------- |
| 200    | `ok`             | Confirmation email sent       |
| 400    | `invalid_input`  | Missing or invalid parameters |
| 409    | `alias_taken`    | Alias already exists          |
| 429    | `rate_limited`   | Too many requests             |
| 403    | `banned`         | IP or destination blocked     |
| 500    | `internal_error` | Unexpected server error       |

---

### 2. `GET /forward/confirm?token=...`

Confirms alias creation.

#### Possible Responses

| Status | Code              | Meaning                    |
| ------ | ----------------- | -------------------------- |
| 200    | `confirmed`       | Alias created successfully |
| 400    | `invalid_token`   | Token malformed            |
| 404    | `token_not_found` | Token does not exist       |
| 410    | `token_expired`   | Token expired              |
| 429    | `rate_limited`    | Too many attempts          |
| 500    | `internal_error`  | Server failure             |

---

### 3. `POST /forward/unsubscribe`

Requests alias removal.

#### Input (JSON)

```json
{
  "address": "github@example.org"
}
```

---

#### Possible Responses

| Status | Code             | Meaning                 |
| ------ | ---------------- | ----------------------- |
| 200    | `ok`             | Confirmation email sent |
| 404    | `not_found`      | Alias does not exist    |
| 429    | `rate_limited`   | Too many requests       |
| 403    | `banned`         | Blocked                 |
| 500    | `internal_error` | Server error            |

---

### 4. `GET /forward/unsubscribe/confirm?token=...`

Confirms alias removal.

#### Possible Responses

| Status | Code              | Meaning        |
| ------ | ----------------- | -------------- |
| 200    | `removed`         | Alias deleted  |
| 400    | `invalid_token`   | Token invalid  |
| 404    | `token_not_found` | Token unknown  |
| 410    | `token_expired`   | Token expired  |
| 429    | `rate_limited`    | Abuse detected |
| 500    | `internal_error`  | Server failure |

---

## Security & Abuse Prevention

This API implements:

* IP-based rate limiting
* Alias-based throttling
* Destination email throttling
* Token attempt limits
* Cooldowns between confirmation emails
* Optional Redis-backed distributed rate limiting
* Ban checks before processing requests

---

## Important Notes

* This project **does not work standalone**
* **base-postfix-forwarder must be running first**
* The database schema is owned by base-postfix-forwarder
* This API **writes directly to production mail tables**
* Always test in a staging environment

---

## License

This project is licensed under the Unlicense, see the [LICENSE](LICENSE) file for details.

---

## Final Reminder

👉 **Do NOT deploy this API without reading:**
📄 [`FWD-Basestack.md`](./FWD-Basestack.md)

This service is **stateless**, **destructive**, and **directly affects mail routing**.

Use responsibly.