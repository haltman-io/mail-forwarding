![Haltman.io | mail-forwarding](./.github/images/readme-banner.png)

<div align="center">

<!-- Runtime / Status -->
<a href="https://forward.haltman.io/">![Production](https://img.shields.io/badge/forward.haltman.io-Production-46c41c?style=plastic&labelColor=181717&link=https%3A%2F%2Fforward.haltman.io%2F&link=https%3A%2F%2Fforward.haltman.io%2F)</a>
<a href="https://docs.haltman.io/">![Docs](https://img.shields.io/badge/docs.haltman.io-Knowledge--Base-white?style=plastic&labelColor=181717&link=https%3A%2F%2Fdocs.haltman.io%2Fknowledge-base%2Fmail-forwarding-selfhost%2Fget-started)</a>
<br>

<!-- Community -->
<a href="https://t.me/haltman_group">![Telegram](https://img.shields.io/badge/Join%20us-Telegram-blue?style=plastic&labelColor=181717&logo=telegram&logoColor=white&link=https%3A%2F%2Ft.me%2Fhaltman_group)</a>


</div>

---

This repository contains a monorepo for a minimal, reproducible email forwarding service with a focus on simplicity, security, and operational clarity.

The public instance is available at:  
https://forward.haltman.io/

---

## Stack

- **Mail Forwarding Core**  
  Postfix · PostSRSd · MariaDB

- **Mail Forwarding API**  
  Node.js · Express.js

- **Mail Forwarding UI**  
  Next.js · shadcn · TailwindCSS · Radix

- **Mail Forwarding Ask**  (*NEW: multi-tenant support*)  
  Caddy · Node.js · Express.js


---

## Documentation

All guides, architecture details and self-hosting instructions are maintained in the official documentation.

- User guide:  
  https://docs.haltman.io/knowledge-base/mail-forwarding/create-alias-ui

- Self-hosting:  
  https://docs.haltman.io/knowledge-base/mail-forwarding-selfhost/get-started

---

## Community-supported domains

- `alias-for-lammers.howosec.com` by [@Yyax13](https://github.com/Yyax13)
- `mvttrb.com` by [@mvttrb](https://github.com/mvttrb)
- `pwnbuffer.org` by [@pwnbuffer](https://github.com/pwnbuffer)

---

## Security

If you have found a bug or security issue, please report it privately:

- security@haltman.io

We do not offer monetary rewards, but contributors will be credited in the release notes.

---

## Thanks

- @hackerschoice
- @Lou-Cipher

---

## License

UNLICENSE
