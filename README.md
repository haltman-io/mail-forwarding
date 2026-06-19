![Haltman.io | Mail Forwarding](./.github/images/readme-banner.png)

# Mail Forwarding

Open-source mail forwarding service created by [extencil@segfault.net](mailto:extencil@segfault.net) and published by [haltman.io](https://haltman.io/) and [thc.org](https://www.thc.org/).

This repository is the public index for the project. The implementation is split across separate repositories for the mail stack, API, UI, DNS checker, DKIM sync, bots, browser extensions, and documentation.

Released under the [Unlicense](https://unlicense.org/).

## Public Service

| Resource | URL |
| --- | --- |
| Production | <https://mail.thc.org/> |
| Documentation | <https://mail.thc.org/docs/> |
| FAQ | <https://mail.thc.org/faq> |
| Abuse | <https://mail.thc.org/abuse> |
| Privacy | <https://mail.thc.org/privacy> |
| Security | <https://mail.thc.org/security> |
| Hall of Fame | <https://mail.thc.org/hall-of-fame> |

## Component Repositories

| Repository | Purpose | Main stack |
| --- | --- | --- |
| [mail-forwarding-core](https://github.com/haltman-io/mail-forwarding-core) | Main mail forwarding stack. | Postfix, Dovecot, PostSRSd, MariaDB, OpenDKIM |
| [mail-forwarding-api](https://github.com/haltman-io/mail-forwarding-api) | Back-end API. | NestJS, Redis |
| [mail-forwarding-ui](https://github.com/haltman-io/mail-forwarding-ui) | Front-end web application. | Next.js, React, Tailwind |
| [mail-forwarding-dns-checker](https://github.com/haltman-io/mail-forwarding-dns-checker) | Microservice for checking and rechecking hostnames against predefined DNS rules. | Express.js |
| [mail-forwarding-dkim-sync](https://github.com/haltman-io/mail-forwarding-dkim-sync) | systemd service for publishing DKIM public keys with OpenDKIM. Runs every 5 minutes. | systemd, OpenDKIM |
| [mail-forwarding-ui-saas](https://github.com/haltman-io/mail-forwarding-ui-saas) | Domain handling layer that allows the UI and API to be accessed through third-party domains. | Domain routing / hosting support |
| [mail-forwarding-counter](https://github.com/haltman-io/mail-forwarding-counter) | Postfix delivery monitor using systemd and journald. New emails increment a numeric counter in MySQL. | Postfix, systemd, journald, MySQL |
| [mail-forwarding-bot](https://github.com/haltman-io/mail-forwarding-bot) | Discord and Telegram connectors for managing forwarding rules from chat apps. | Discord, Telegram |
| [mail-forwarding-addon-mozilla-firefox](https://github.com/haltman-io/mail-forwarding-addon-mozilla-firefox) | Firefox extension for creating aliases on demand. Approved and available on addons.mozilla.org. | Firefox Extension |
| [mail-forwarding-addon-google-chrome](https://github.com/haltman-io/mail-forwarding-addon-google-chrome) | Chrome extension for creating aliases on demand. Approved and available on the Chrome Web Store. | Chrome Extension |
| [mail-forwarding-docs](https://github.com/haltman-io/mail-forwarding-docs) | Documentation website. | Next.js, MDX |

## Clients and Connectors

| Client | Link |
| --- | --- |
| Mozilla Firefox Extension | <https://addons.mozilla.org/en-US/firefox/addon/email-alias-manager/> |
| Google Chrome Extension | <https://chromewebstore.google.com/detail/email-alias-manager-free/ihjojmdobbcanaafcgpmagmmoaoflpjl> |
| Telegram Bot | <https://t.me/thcmail_bot> |
| Discord App | <https://discord.com/oauth2/authorize?client_id=1469840254562468013> |
| Discord Bot, user install | <https://discord.com/oauth2/authorize?client_id=1469840254562468013&integration_type=1&scope=applications.commands> |
| Discord Bot, guild install | <https://discord.com/oauth2/authorize?client_id=1469840254562468013&integration_type=0&scope=applications.commands> |

## Technical Write-up

- <https://forum.0x00sec.org/t/mail-thc-org-free-mail-forwarding-service-50-domains-open-source-auditable-no-logs-no-aliases-limits/318>

## Contacts

| Project | Telegram | Email |
| --- | --- | --- |
| haltman.io | <https://t.me/haltman_group> | [root@haltman.io](mailto:root@haltman.io) |
| thc.org | <https://t.me/thcorg> | [root@proton.thc.org](mailto:root@proton.thc.org) |

For abuse reports, use <https://mail.thc.org/abuse>.

## License

This project is released under the [Unlicense](https://unlicense.org/).
