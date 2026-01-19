# Domain example (example.com)

How to add a domain (target: example.com):

| TYPE | NAME   | CONTENT                                                                 | PRIORITY |
|------|--------|-------------------------------------------------------------------------|----------|
| MX   | @      | mail.abin.lat                                                           | 10       |
| TXT  | @      | "v=spf1 ip4:161.97.146.91 ip6:2a02:c207:2298:1997::1 -all"              | N/A      |
| TXT  | _dmarc | "v=DMARC1; p=none; rua=mailto:dmarc@example.com; ruf=mailto:dmarc@example.com; fo=1" | N/A |

---

# Subdomain example (sub.example.com)

How to add a subdomain (target: sub.example.com):

| TYPE | NAME        | CONTENT                                                            | PRIORITY |
|------|-------------|--------------------------------------------------------------------|----------|
| MX   | sub         | mail.abin.lat                                                      | 10       |
| TXT  | sub         | "v=spf1 ip4:161.97.146.91 ip6:2a02:c207:2298:1997::1 -all"         | N/A      |
| TXT  | _dmarc.sub  | "v=DMARC1; p=none"                                                 | N/A |
