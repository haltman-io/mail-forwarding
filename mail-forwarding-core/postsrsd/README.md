## PostSRSd Configuration (SRS)

This project **requires PostSRSd** to be installed and running.

PostSRSd is responsible for implementing SRS (Sender Rewriting Scheme), which is
mandatory for any mail forwarding service that relays messages to external
destinations while preserving SPF alignment.

---

### Configuration File Location

PostSRSd is configured via:

```
/etc/default/postsrsd
````

The following example reflects the **expected configuration model**.

---

### Example Configuration (Reference Only)

```ini
SRS_DOMAIN=example.org
SRS_SEPARATOR==
SRS_SECRET=/etc/postsrsd.secret
SRS_HASHLENGTH=4
SRS_HASHMIN=4
SRS_FORWARD_PORT=10001
SRS_REVERSE_PORT=10002
RUN_AS=postsrsd
SRS_LISTEN_ADDR=127.0.0.1
CHROOT=/var/lib/postsrsd
```

**Notes:**

- `SRS_HASHLENGTH`  
  Length of the hash used in rewritten SRS addresses. Shorter hashes produce shorter addresses but reduce collision resistance. A value of `4` is commonly used as a balance between address length and safety.

- `SRS_HASHMIN`  
  Minimum hash length accepted when reversing SRS addresses. This should generally match `SRS_HASHLENGTH` to ensure consistency and prevent invalid or malformed reversals.

- `SRS_FORWARD_PORT`  
  TCP port on which PostSRSd listens for **forward rewriting** requests. This port must match the one referenced by Postfix in `sender_canonical_maps`.

- `SRS_REVERSE_PORT`  
  TCP port on which PostSRSd listens for **reverse rewriting** requests. This port must match the one referenced by Postfix in `recipient_canonical_maps`.

- `RUN_AS`  
  System user under which the PostSRSd daemon runs. Running as an unprivileged user (e.g. `postsrsd`) is recommended to reduce impact in case of compromise.

- `SRS_LISTEN_ADDR`  
  Network address PostSRSd binds to. Limiting this to `127.0.0.1` ensures the service is only accessible locally by Postfix and not exposed externally.

- `CHROOT`  
  Directory used as a chroot jail for PostSRSd. This provides an additional isolation layer by restricting the daemon’s filesystem view to the specified path.


---

### Generating the SRS Secret

Each deployment **must generate its own secret**.

Example:

```bash
sudo openssl rand -hex 32 | sudo tee /etc/postsrsd.secret >/dev/null
sudo chmod 600 /etc/postsrsd.secret
```

The secret file:

* Must be readable only by root
* Must never be shared between unrelated deployments
* Must never be version-controlled

---

### Service Management

PostSRSd must be enabled and running before Postfix processes mail.

Typical setup:

```bash
sudo systemctl enable postsrsd
sudo systemctl restart postsrsd
sudo systemctl status postsrsd --no-pager
```

---

### Expected Listening Ports

This project assumes PostSRSd exposes the following TCP services locally:

| Purpose         | Address           |
| --------------- | ----------------- |
| SRS forward map | `localhost:10001` |
| SRS reverse map | `localhost:10002` |

These ports are referenced in `main.cf`:

```ini
sender_canonical_maps = tcp:localhost:10001
recipient_canonical_maps = tcp:localhost:10002
```

Postfix will fail to rewrite or reverse addresses if PostSRSd is unavailable.

---

### Inbound SRS Handling

Inbound messages containing SRS-formatted sender addresses are explicitly
rejected unless they were generated internally.

This behavior is enforced via:

```
../postfix/block_srs_inbound.regexp
```

This prevents abuse and avoids accepting externally forged SRS addresses.

---

### Failure Symptoms

Common indicators of a broken or missing PostSRSd setup include:

* SPF failures on forwarded mail
* SRS addresses that cannot be reversed
* TCP map timeouts on ports `10001` or `10002` in Postfix logs

Always verify PostSRSd availability before troubleshooting Postfix itself.

---

### Summary

* PostSRSd is **mandatory**
* The SRS secret is **deployment-specific and private**
* Postfix depends on PostSRSd for correct forwarding behavior
* This configuration is intentionally minimal and explicit
