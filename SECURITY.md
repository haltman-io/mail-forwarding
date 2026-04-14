# SECURITY 

We takes security seriously. It gets tested, broken, read, and rebuilt. Daily. No theater.

Found a bug with real impact? Send it to **[security@haltman.io](mailto:security@haltman.io)**. 

If it reproduces, it gets triaged. 
If it does not, it dies there.

## SCOPE

Anything that hits **Haltman.IO systems, services, apps, infra, or code we actually run**.

## OUT OF SCOPE

Unless it has a real exploit path and practical impact:

* feature requests
* UI/UX complaints
* typos, wording, or content noise
* missing headers, cookie flags, or checklist findings with no security consequence
* spam, phishing, or abuse not rooted in a product flaw
* DoS or rate-limit claims without a concrete path
* theory, scanner noise, or “best practice” reports with no teeth
* social engineering
* physical attacks
* reports with no proof, no steps, or no way to reproduce

## REPORTING

Mail: **[security@haltman.io](mailto:security@haltman.io)**

Use a subject line that says what broke.

Example:

```text
Subject: Email Confirmation Bypass via Custom Email Flow
```

## WHAT TO INCLUDE

Keep it tight. Keep it reproducible.

* title
* affected component
* summary
* steps to reproduce
* expected behavior
* actual behavior
* impact
* proof of concept
* payloads, requests, responses, logs, or screenshots that matter
* environment details, if they change the outcome

## GOOD REPORT EXAMPLE

```text
Subject: Email Confirmation Bypass via Custom Email Flow

Affected component:
Email confirmation flow

Summary:
The confirmation flow can be bypassed by changing a destination-related parameter during token validation.

Steps to reproduce:
1. Request alias creation with a valid destination email
2. Intercept the confirmation request
3. Modify the destination-related parameter
4. Replay the request

Expected behavior:
The token should only validate for the original destination email.

Actual behavior:
The token is accepted after the destination parameter is changed.

Impact:
An attacker can confirm an alias flow for an email address that was never originally verified.

Proof of concept:
curl 'https://target.tld/api/confirm?token=123456&to=attacker@example.com'
```

## REPORT QUALITY

Vague reports waste triage time.

No repro steps, no proof, no signal.
That is where analysis stops.

## RULES

Test like you know what you are touching.

Do not:

* access data that is not yours
* modify, delete, or destroy anything
* hit availability for sport
* go past what is needed to prove the bug
* keep poking after the issue is validated

## DISCLOSURE

Do not publish before we validate and patch the issue.

## FINAL

Send technical.
Send clear.
Send reproducible.

If it reproduces, we analyze it.
If it does not, triage ends there.

## HALL OF FAME

If
* the bug is real,
* the report is clean, and
* the disclosure was handled right,

Then
* your name goes into our **Hall of Fame** page.
* permanently.

We take responsible disclosure seriously.

Good signal gets remembered. Noise gets dropped.

## QUESTIONS

Email, Telegram, Signal, Discord, Smoke signal. Select one:
1. Send your question to **[security@haltman.io](mailto:security@haltman.io)**.
2. Join at one of our public channels, check the list at https://haltman.io/join

Before writing, check that communication best practices examples. 


❌❌❌❌❌ Avoid empty messages:
```
hello can I talk to you?
```

We hate that and we have more important things to do.

---

✅✅✅✅✅ Keep it simple and async:
```
Hello, I'm an offensive security analyst and I want to self-host your software
 at my business environment for productivy on security assessments.
Do you have any scope limitations?  Rate limiting, prohibited tests, staging hosts
 are fine if the system goes down. 
Assessment will begin next Monday at the same time as this email.
```

We will answer to you in minutes.
