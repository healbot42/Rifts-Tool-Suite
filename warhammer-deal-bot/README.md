# Warhammer Deal Bot

A conservative, configuration-driven Python 3.12+ monitor that uses eBay's
official Browse API, stores normalized price history in SQLite, and sends
Gmail-compatible deal digests. It is an isolated subproject in the Rifts Tool
Suite repository; it shares the same GitHub remote but does not ship in the Vue
site.

## Current source status

| Source                                                                                             | Status            | Reason                                                                               |
| -------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------ |
| eBay                                                                                               | Implemented       | Official Browse API and application OAuth                                            |
| Games Workshop                                                                                     | Reference-only    | MSRP lives in YAML; no verified public US product API                                |
| Warpfire, Gamers Guild AZ, Herrick, Miniature Market, Valhalla, Flipside, Lazarus, Little Big Wars | Disabled adapters | No verified public API or explicit approved automation interface was established     |
| Troll Trader                                                                                       | Disabled adapter  | No verified API; international shipping prevents reliable delivered-price comparison |
| Reddit r/Miniswap                                                                                  | Disabled adapter  | Requires approved Reddit OAuth API access; HTML/JSON search is not scraped           |

Each source has its own module and implements the common `SourceAdapter`
interface. A disabled adapter fails clearly if someone turns it on without
implementing a compliant integration. This is intentional: the bot does not
bypass robots rules, CAPTCHAs, Cloudflare, authentication, or rate limits.
Before enabling a retailer, re-check its current terms and robots policy, obtain
permission where needed, implement its adapter, and add sanitized fixture tests.

The example MSRP values are editable starting references, not guaranteed current
GW prices. Verify them before enabling email alerts.

## Windows setup

```powershell
cd warhammer-deal-bot
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --require-hashes --only-binary :all: -r requirements.lock
python -m pip install --no-deps -e .
Copy-Item config.example.yaml config.yaml
Copy-Item .env.example .env
```

The application reads credentials only from the fixed environment-variable names
below; YAML cannot redirect it to another secret or SMTP server. `.env` is a
template and is not loaded automatically. In PowerShell, set them for the
current process:

```powershell
$env:EBAY_CLIENT_ID = "your-production-app-id"
$env:EBAY_CLIENT_SECRET = "your-production-cert-id"
$env:SMTP_USERNAME = "you@gmail.com"
$env:SMTP_APP_PASSWORD = "your-16-character-app-password"
$env:DEAL_BOT_EMAIL_TO = "you@gmail.com"
```

On Linux/macOS, create the venv with `python3.12 -m venv .venv`, activate it
with `source .venv/bin/activate`, and export the same variables.

## eBay setup

1. Create an eBay Developer Program account and production application keys.
2. Copy the App ID to `EBAY_CLIENT_ID` and Cert ID to `EBAY_CLIENT_SECRET`.
3. Keep both out of YAML and Git. The adapter requests an application token with
   the OAuth client-credentials grant, then calls
   `buy/browse/v1/item_summary/search`.
4. Run `python -m warhammer_deal_bot run --source ebay`.

Official references:
[Browse API](https://developer.ebay.com/api-docs/buy/api-browse.html) and
[OAuth credentials](https://developer.ebay.com/api-docs/static/oauth-credentials.html).

## Gmail setup

SMTP with a Gmail app password is the maintainable unattended option implemented
here. The endpoint is fixed to `smtp.gmail.com:465`, uses an explicit TLS
1.2-or-newer context, and cannot be changed in YAML. Enable 2-Step Verification
on the Google account, create an app password, populate the three SMTP
environment variables, set `email.enabled: true`, then run:

```powershell
python -m warhammer_deal_bot test-email
```

OAuth Gmail API support can be added later, but unattended token refresh and
Google Cloud consent configuration are substantially heavier than a personal app
password. No credential is stored in SQLite, raw source metadata, YAML, logs, or
source code.

## Commands

```powershell
python -m warhammer_deal_bot run
python -m warhammer_deal_bot run --source ebay
python -m warhammer_deal_bot run --product "Gal Vorbak"
python -m warhammer_deal_bot test-email
python -m warhammer_deal_bot report
```

A source failure is logged and does not abort other sources. Invalid
configuration, database access failures, and missing required credentials are
fatal. Network requests use timeouts, bounded exponential retries, per-product
randomized delays, and conservative limits. Logs include returned and alertable
counts.

SQLite records normalized listings, every price observation, alert history,
source run schema, and configured products. Sensitive raw-metadata keys are
redacted and oversized metadata is bounded before storage. The bot rejects
database paths outside the configuration directory and symbolic-link database
targets, then restricts file permissions where the operating system supports
Python permission modes. A listing alerts once; it re-alerts only after the
configured material price drop or an enabled reappearance. Thirty-day median
rules start after five observations. Tax is excluded when the source does not
provide it.

## Configuration

Copy `config.example.yaml` to ignored `config.yaml`. Products, aliases, queries,
quantity targets, MSRP, hard thresholds, percentage rules, seller rating,
conditions, exclusions, and sources are YAML-only. Add a miniature by adding
another product mapping—no Python edit is needed.

The matcher rejects digital files, 3D prints, recasts, empty boxes,
books/manuals, loose bits, Legions Imperialis/Epic scale, transfers, shoulder
pads, heads, iconography, and paint supplies by default. Product-specific
`required_terms` and `excluded_terms` make ambiguous searches stricter. Review
the first dry run with email disabled before enabling alerts.

## Scheduling four runs per day

### Windows Task Scheduler

Create a task named `Warhammer Deal Bot`, choose **Run whether user is logged on
or not**, and add four daily triggers (for example 06:00, 12:00, 18:00, and
00:00). Action:

- Program:
  `E:\Code\Rifts-TW-Calculator\warhammer-deal-bot\.venv\Scripts\python.exe`
- Arguments: `-m warhammer_deal_bot --config config.yaml run`
- Start in: `E:\Code\Rifts-TW-Calculator\warhammer-deal-bot`

Store credentials as user environment variables or use a locked-down wrapper
outside the repository. Enable retry-on-failure and prevent overlapping
instances.

### cron

```cron
17 0,6,12,18 * * * cd /path/to/Rifts-TW-Calculator/warhammer-deal-bot && .venv/bin/python -m warhammer_deal_bot --config config.yaml run >> deal-bot.log 2>&1
```

### GitHub Actions (optional)

A scheduled workflow can install the package and inject repository secrets, but
hosted runners have changing shared IPs that sellers may block. More
importantly, their local SQLite filesystem is ephemeral. Artifact upload is a
snapshot, not safe transactional persistence, and overlapping jobs can lose
history. Run the bot on the Windows machine or another persistent host. If
Actions is used, place a durable database in an external service or carefully
download/upload a single artifact with concurrency disabled.

## Development

```powershell
python -m pytest ../tests/warhammer-deal-bot
python -m ruff check .
python -m ruff format --check .
```

Tests use mocked API responses and sanitized fixture-style dictionaries; they
never call live seller pages. When an HTML adapter is eventually approved, add a
minimal sanitized HTML fixture and parser-layout failure test before enabling
it.

`requirements.lock` pins and hashes every runtime and test dependency. Install
it with `--require-hashes --only-binary :all:` as shown above. Dependabot and
the repository security workflow review dependency changes, audit Python
packages, and scan repository content for several high-confidence secret
patterns. These controls reduce risk but do not replace protecting the
workstation, limiting GitHub access, or rotating a credential immediately if it
is exposed.

## Sample email

```text
Subject: Deal found — Gal Vorbak — $68 shipped (35.2% below MSRP)

Gal Vorbak
Gal Vorbak Dark Brethren - New on Sprue
Source: ebay
Condition: New on sprue
Item: $60; shipping: $8
Delivered: $68; MSRP: $105
Rolling 30-day median: $84; seller rating: 99.8
Triggered because: 35.2% below MSRP
https://www.ebay.com/itm/example
```
