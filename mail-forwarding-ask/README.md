# mail-forwarding-ask

Enables a Proxy with pre-authorized domains (to avoid resource exhaustion or denial of service) to allow other people to make mail-forwarding-ui available at other tenants with Caddy + TLS on demand + whitelist.

* `forward.haltman.io` points to my server (A/AAAA);
* Third parties creates `CNAME mail-alias.example.com -> forward.haltman.io`;
* Caddy only issues TLS and only serves the UI if the domain is listed in whitelist.  

## Setup

### Static files structure (e.g: html, css, js)

```console
sudo mkdir -p /var/www/mail-forwarding
sudo rsync -av ./dist/ /var/www/mail-forwarding/
# or just copy html/css/js to /var/www/mail-forwarding
```

Verify if the `index.html` exists
```console
ls -la /var/www/mail-forwarding
```


### Install Caddy (Debian/Ubuntu)

Reference: https://caddyserver.com/docs/install

```console
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg
chmod o+r /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

### Create authorized domains list (whitelist)
Simple file (one domain per line):
```console
sudo mkdir -p /etc/mail-forwarding
sudo nano /etc/mail-forwarding/allowed_domains.txt
```

Example:
```
forward.haltman.io
forward.example.com
forward.client1.com
```

### Create local endpoint `/ask` (whitelist)
Caddy needs an HTTP local endpoint that answer:
* **200** -> Authorized, can emit TLS for domain
* **403** -> Deny

#### Clone the `mail-forwarding` repository to create the service (node + express)

```console
sudo mkdir -p /opt/mail-forwarding-ask
git clone https://github.com/haltman-io/mail-forwarding.git

mv ./mail-forwarding/mail-forwarding-ask/app/ /opt/mail-forwarding-ask

cd /opt/mail-forwarding-ask
npm install
```

#### Create systemd unit

```console
sudo nano /etc/systemd/system/mail-forwarding-ask.service
```

```ini
[Unit]
Description=Haltman.io - Mail Forwarding Ask
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/mail-forwarding-ask
Environment=ALLOWLIST_PATH=/etc/mail-forwarding/allowed_domains.txt
ExecStart=/usr/bin/node /opt/mail-forwarding-ask/server.js
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
```

Run:

```console
sudo systemctl daemon-reload
sudo systemctl enable --now mail-forwarding-ask
sudo systemctl status mail-forwarding-ask --no-pager
```

Quick test:
```console
curl -i "http://127.0.0.1:9000/ask?domain=forward.haltman.io"
curl -i "http://127.0.0.1:9000/ask?domain=unauthorized.com"
```

> Needs to return *200* for authorized domains and *403* for unauthorized domains.

### Setup Caddy with TLS on-demand
Edit Caddyfile:
```console
sudo nano /etc/caddy/Caddyfile
```

```caddyfile
{
  email you@example.com

  # Protects on-demand (prevents broadcast bursts)
  on_demand_tls {
    ask http://127.0.0.1:9000/ask
    interval 2m
    burst 5
  }
}

# HTTP -> HTTPS (another other host)
:80 {
  redir https://{host}{uri} permanent
}

# Your main domain
forward.haltman.io {
  root * /var/www/mail-forwarding
  file_server
}

# Any other host approved via /ask will have TLS issued and will be served with the same UI
:443 {
  tls {
    on_demand
  }

  root * /var/www/mail-forwarding
  file_server
}
```

Reload:
```console
sudo caddy fmt --overwrite /etc/caddy/Caddyfile
sudo systemctl reload caddy
sudo systemctl status caddy --no-pager
```

Logs:
```console
journalctl -u caddy -f
```

### How to add domain on whitelist
1. Third party create DNS entry:
* * `forward.example.com CNAME forward.haltman.io`
2. You add the domain on whitelist:
```console
echo "forward.example.com" | sudo tee -a /etc/mail-forwarding/allowed_domains.txt >/dev/null
```
> The endpoint reads the file at each request, so there's no need to restart.