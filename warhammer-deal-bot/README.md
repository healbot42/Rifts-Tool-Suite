# Warhammer Deal Bot

A conservative, configuration-driven Python 3.12+ monitor that uses eBay's
official Browse API, stores normalized price history in SQLite, and sends Gmail
deal digests using send-only OAuth on Windows (or legacy SMTP). It is an
isolated subproject in the Rifts Tool Suite repository; it shares the same
GitHub remote but does not ship in the Vue site.

## Current source status

| Source                                              | Status           | Reason                                                                     |
| --------------------------------------------------- | ---------------- | -------------------------------------------------------------------------- |
| eBay                                                | Implemented      | Official Browse API and application OAuth                                  |
| Games Workshop                                      | Reference-only   | MSRP lives in YAML; no verified public US product API                      |
| Gamers Guild USA, Herrick, Little Big Wars, Lazarus | Implemented      | Public Shopify product sitemaps and product records                        |
| Flipside                                            | Implemented      | Store-documented agent search and product JSON routes                      |
| Warpfire and Miniature Market                       | Implemented      | Advertised product sitemaps and public product metadata                    |
| Valhalla Hobby                                      | Implemented      | Public catalog search and embedded inventory records                       |
| Troll Trader                                        | Disabled adapter | UK retailer explicitly excluded from searches and alerts                   |
| Reddit r/Miniswap                                   | Disabled adapter | Requires approved Reddit OAuth API access; HTML/JSON search is not scraped |

Each source has its own module and implements the common `SourceAdapter`
interface. A disabled adapter fails clearly if someone turns it on without
implementing a compliant integration. This is intentional: the bot does not
bypass robots rules, CAPTCHAs, Cloudflare, authentication, or rate limits. The
Shopify adapter follows product sitemaps advertised in each store's
`robots.txt`, fetches only matching public product records, uses a descriptive
user agent, and applies a per-request delay. It does not use blocked search,
cart, checkout, or account routes. Before enabling another retailer, re-check
its current terms and robots policy, establish a conservative delivered-price
rule, and add sanitized fixture tests.

The example MSRP values are editable starting references, not guaranteed current
GW prices. Verify them before enabling email alerts.

## Windows setup

Use Python 3.12 or newer. From the repository root:

```powershell
cd warhammer-deal-bot
python -m venv .venv
.venv\Scripts\python.exe -m pip install --require-hashes --only-binary :all: -r requirements.lock
.venv\Scripts\python.exe -m pip install --no-deps -e .
if (!(Test-Path config.yaml)) { Copy-Item config.example.yaml config.yaml }
```

Use the virtual environment's Python for the commands below (or activate it with
`.venv\Scripts\Activate.ps1`). The example selects `email.provider: gmail` and
leaves `email.enabled: false` until you finish testing. Existing configs without
`provider` retain their previous SMTP behavior; add `provider: gmail` to switch
them to OAuth.

The application reads eBay credentials from `EBAY_CLIENT_ID` and
`EBAY_CLIENT_SECRET`. Configure them locally once production access is approved.
The `.env.example` file is documentation only: the bot does **not** load `.env`.
Do not paste credentials into chat or put them in YAML or Git.

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

## Gmail setup: send-only OAuth on Windows

OAuth is the recommended delivery method. The bot requests only
`https://www.googleapis.com/auth/gmail.send`; it cannot read or delete mail with
that permission. Google handles browser sign-in and account verification. An app
password is not required.

### Google account steps

1. Create a project named **Warhammer Deal Bot** in
   [Google Cloud Console](https://console.cloud.google.com/), and enable **Gmail
   API**.
2. Open **Google Auth Platform**. Configure the app name, support email, and
   developer contact. For personal Gmail, choose **External** under Audience and
   add your own Gmail address as a test user while testing. Workspace accounts
   may have an Internal option or require administrator approval.
3. Under **Data Access**, add only the Gmail `gmail.send` scope. Do not request
   inbox, modify, delete, or full-mail access.
4. Under **Clients**, create an OAuth client with application type **Desktop
   app**. Download its JSON to a private local folder outside the repository.
   This is an OAuth client configuration, not an API key or service-account key.
5. Before unattended use, change the external app's publishing status from
   **Testing** to **In production** under Audience, then authorize again to
   obtain a fresh grant. Gmail refresh tokens issued in Testing expire after
   seven days. Personal-use apps can qualify for Google's verification
   exception; this is distinct from publishing status, and an unverified-app
   warning may remain. Check that the consent screen names your own project and
   requests only sending email. Publishing does not publish the bot code or
   grant anyone your Gmail access.

Google references:
[Python setup](https://developers.google.com/workspace/gmail/api/quickstart/python),
[scope definitions](https://developers.google.com/workspace/gmail/api/auth/scopes),
[OAuth token expiration](https://developers.google.com/identity/protocols/oauth2#expiration),
and
[personal-use verification exceptions](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification#exceptions-verification-requirements).

### Public app information for Google Branding

Google may require homepage and privacy-policy URLs before enabling **Publish
app**, even when those fields are not marked required on the Branding form. Use
the deployed informational pages:

- Application home page:
  `https://healbot42.github.io/Rifts-Tool-Suite/warhammer-deal-bot/`
- Privacy policy:
  `https://healbot42.github.io/Rifts-Tool-Suite/warhammer-deal-bot/privacy.html`
- Terms of service:
  `https://healbot42.github.io/Rifts-Tool-Suite/warhammer-deal-bot/terms.html`
- Authorized domain: `healbot42.github.io` (no scheme or path).

The source pages live under `public/warhammer-deal-bot/` and Vite copies them to
`dist/warhammer-deal-bot/`. They contain no OAuth credentials or sign-in
handler. Keep their data-handling disclosures aligned with the implementation.
If Google requests domain ownership verification, complete its stated
requirements; adding an authorized domain is not itself proof of ownership or
app verification.

### Connect and test

From `warhammer-deal-bot`, replace the example path with your downloaded file:

```powershell
.venv\Scripts\python.exe -m warhammer_deal_bot gmail-authorize --client-secrets "C:\path\to\client_secret_download.json"
.venv\Scripts\python.exe -m warhammer_deal_bot gmail-status
$env:DEAL_BOT_EMAIL_FROM = "your-address@gmail.com"
$env:DEAL_BOT_EMAIL_TO = "your-address@gmail.com"
.venv\Scripts\python.exe -m warhammer_deal_bot test-email
```

Choose the Gmail account matching `DEAL_BOT_EMAIL_FROM` during sign-in. The
recipient may be the same account or another address you control. The explicit
`test-email` command sends one message even while `email.enabled` is false.
Confirm receipt, inspect an eBay run with alerts disabled, then set
`email.enabled: true` to enable deal notifications.

The authorization command works before `config.yaml` or eBay credentials exist.
It opens your browser, uses PKCE and OAuth state validation, and listens only on
`127.0.0.1` at an automatically selected port for up to three minutes. Scheduled
runs never open a browser. They refresh a saved grant automatically and report
an actionable error if it expires, is revoked, or cannot be refreshed.

Local refresh tokens and client configuration are stored in **Windows Credential
Manager**, under `Warhammer Deal Bot Gmail OAuth`, for the Windows user who
connects the account. GitHub Actions instead reads the same three fields from
encrypted `GMAIL_OAUTH_CLIENT_ID`, `GMAIL_OAUTH_CLIENT_SECRET`, and
`GMAIL_OAUTH_REFRESH_TOKEN` repository secrets. There is no plaintext token-file
fallback. The downloaded client JSON is not copied into the repository. Do not
enable third-party HTTP wire logging around authentication.

`gmail-status` inspects the saved grant without a network request; it does not
prove Google still accepts it. Use `test-email` for live verification. To remove
this bot's locally stored grant:

```powershell
.venv\Scripts\python.exe -m warhammer_deal_bot gmail-forget
```

Also revoke the app in
[Google account connections](https://myaccount.google.com/connections) when
disconnecting it completely. Gmail send failures are not immediately retried
because a timeout may occur after delivery. A later scheduled run can repeat an
unconfirmed alert because alert history is saved only after confirmed delivery;
check Sent before retrying.

### Legacy SMTP option

SMTP remains available for existing setups with `email.provider: smtp`. Set
`SMTP_USERNAME`, `SMTP_APP_PASSWORD`, and `DEAL_BOT_EMAIL_TO` as environment
variables. It uses the fixed endpoint `smtp.gmail.com:465` and TLS 1.2 or newer.
OAuth users do not need these SMTP credentials. OAuth vault support is currently
Windows-only; Linux/macOS installations can use SMTP or require a future secure
OS credential-store implementation.

## Commands

```powershell
python -m warhammer_deal_bot run
python -m warhammer_deal_bot run --source ebay
python -m warhammer_deal_bot run --product "Chaos Space Marines Possessed"
python -m warhammer_deal_bot test-email
python -m warhammer_deal_bot report
```

A source failure is logged and does not abort other sources. Invalid
configuration, database access failures, and missing required credentials are
fatal. Network requests use timeouts, bounded exponential retries, per-product
randomized delays, and conservative limits. Logs include returned and alertable
counts.

Retailer listings use item price only, with shipping recorded as zero by user
choice. eBay continues to use the shipping quote returned for each listing.
Taxes are not included. Review the retailer checkout total before buying,
especially when an alert is close to its threshold.

SQLite records normalized listings, every price observation, alert history,
source run schema, and configured products. Sensitive raw-metadata keys are
redacted and oversized metadata is bounded before storage. The bot rejects
database paths outside the configuration directory and symbolic-link database
targets, then restricts file permissions where the operating system supports
Python permission modes. A listing alerts once; it re-alerts only after the
configured material price drop or an enabled reappearance. Thirty-day median
rules start after five observations. Tax is excluded when the source does not
provide it.

When `DATA_API_URL` and `DATA_API_TOKEN` are set, each run also copies price
observations to the authenticated Cloudflare D1 API in
`cloudflare/rifts-data-api/worker.js` and restores the last 30 days before
evaluating deals. The local SQLite database remains the fallback if D1 is
unavailable. The API also stores purchased quantities; once a product's
`purchased_quantity` reaches `quantity_wanted`, scans for that product stop. The
D1 database can support later Rifts Tool Suite backend features through new
Worker routes. Browser clients must use authenticated Worker endpoints and must
never receive `DATA_API_TOKEN`.

## Configuration

Copy `config.example.yaml` to ignored `config.yaml`. Products, aliases, queries,
quantity targets, minimum model counts, MSRP, hard thresholds, percentage rules,
seller rating, conditions, exclusions, and sources are YAML-only. Add a
miniature by adding another product mapping—no Python edit is needed.

The matcher rejects digital files, 3D prints, recasts, empty boxes,
books/manuals, loose bits, Legions Imperialis/Epic scale, transfers, shoulder
pads, heads, iconography, and paint supplies by default. Product-specific
`required_terms` and `excluded_terms` make ambiguous searches stricter. Review
the first dry run with email disabled before enabling alerts.

For the Maximus and 2023 Legiones Astartes battle groups, two copies of each are
wanted. Both `item_percent_off_threshold: 25` and
`delivered_percent_off_floor: 15` must pass: at least 25% off the reference MSRP
before shipping and at least 15% off including shipping. These are per-box
limits; quantity wanted does not multiply the price threshold. Purchase totals
come from `purchased_quantity` in YAML or the D1 purchases endpoint. Using the
saved $220/$210 reference prices, the respective item limits are $165/$157.50
and shipping-inclusive limits are $187/$178.50. Tax is not included. Other
products retain their existing rules.

When an eBay title states a model count, `minimum_models` rejects listings below
that product's useful minimum. Titles without a detectable count remain eligible
so a complete boxed kit is not rejected merely because its title omits the
quantity.

Email digests group listings with the same normalized title, source, and
delivered price. They show at most `max_deals_per_product` entries for each
product, prefer ordinary discounts, and move discounts at or above
`suspicious_discount_percent` into a **Review carefully** section. Lower-ranked
entries are recorded as alerted but summarized rather than printed in the email.

## Scheduling four runs per day

### Windows Task Scheduler

Create a task named `Warhammer Deal Bot`, choose **Run whether user is logged on
or not**, and add four daily triggers (for example 06:00, 12:00, 18:00, and
00:00). Action:

- Program:
  `E:\Code\Rifts-TW-Calculator\warhammer-deal-bot\.venv\Scripts\python.exe`
- Arguments: `-m warhammer_deal_bot --config config.yaml run`
- Start in: `E:\Code\Rifts-TW-Calculator\warhammer-deal-bot`

Run the task under the **same Windows account** used for `gmail-authorize`, so
it can access that user's Credential Manager. Persist `DEAL_BOT_EMAIL_FROM` and
`DEAL_BOT_EMAIL_TO` as user environment variables; the `$env:` examples above
last only for the current PowerShell session. Keep eBay credentials in user
environment variables or a protected wrapper outside the repository. Test the
scheduled task under that account before leaving it unattended, prevent
overlapping instances, and do not enable automatic retries after ambiguous mail
delivery failures.

### cron

```cron
17 0,6,12,18 * * * cd /path/to/Rifts-TW-Calculator/warhammer-deal-bot && .venv/bin/python -m warhammer_deal_bot --config config.yaml run >> deal-bot.log 2>&1
```

### GitHub Actions

`.github/workflows/warhammer-deal-bot.yml` runs at 00:17, 06:17, 12:17, and
18:17 UTC and can also be started manually. It requires encrypted repository
secrets for `DEAL_BOT_EMAIL_FROM`, `DEAL_BOT_EMAIL_TO`, `GMAIL_OAUTH_CLIENT_ID`,
`GMAIL_OAUTH_CLIENT_SECRET`, and `GMAIL_OAUTH_REFRESH_TOKEN`. Add
`EBAY_CLIENT_ID` and `EBAY_CLIENT_SECRET` after production API approval; the
workflow disables eBay when either is absent.

The workflow serializes runs and restores `data/deals.sqlite3` from a rotating
Actions cache so routine scans retain observations and alert history. GitHub can
evict caches. D1-backed price observations survive a cache miss, while local
alert history still depends on the cache and may repeat a previously sent deal
after eviction. Hosted runners also use changing shared IPs that a retailer may
block. D1 synchronization additionally requires encrypted `DATA_API_TOKEN` and
the fixed `DATA_API_URL` configured in the workflow.

### eBay account-deletion notifications

The production eBay application uses the Cloudflare Worker in
`cloudflare/ebay-account-deletion/worker.js`. Its configured endpoint is
`https://rifts-ebay-notifications.zhawkins42.workers.dev/`. The Worker requires
encrypted `EBAY_VERIFICATION_TOKEN`, `EBAY_CLIENT_ID`, and `EBAY_CLIENT_SECRET`
runtime secrets. The endpoint validates eBay's challenge, verifies POST payloads
with the ECC public key returned by eBay's Notification API, and rejects invalid
signatures with HTTP 412. Keep the endpoint URL's trailing slash synchronized
with eBay's developer settings.

The scanner does not persist eBay usernames, immutable user IDs, or EIAS tokens.
Database migration re-sanitizes historical eBay payloads at startup, so a valid
account-deletion notification has no retained account identifier to remove. Use
eBay's **Send Test Notification** control after every Worker deployment.

## Development

```powershell
python -m pytest ../tests/warhammer-deal-bot
python -m ruff check .
python -m ruff format --check .
```

OAuth tests use a fake credential vault and mocked browser, refresh, and Gmail
responses; they never open sign-in or send mail. Tests use mocked API responses
and sanitized fixture-style dictionaries; they never call live seller pages.
When an HTML adapter is eventually approved, add a minimal sanitized HTML
fixture and parser-layout failure test before enabling it.

`requirements.lock` pins and hashes every runtime and test dependency. Install
it with `--require-hashes --only-binary :all:` as shown above. Dependabot and
the repository security workflow review dependency changes, audit Python
packages, and scan repository content for several high-confidence secret
patterns. These controls reduce risk but do not replace protecting the
workstation, limiting GitHub access, or rotating a credential immediately if it
is exposed.

## Sample email

```text
Subject: Deal found — Chaos Space Marines Possessed — $45 shipped (28% below MSRP)

Chaos Space Marines Possessed
Chaos Space Marines Possessed - New on Sprue
Source: ebay
Condition: New on sprue
Item: $40; shipping: $5
Delivered: $45; MSRP: $62.50
Rolling 30-day median: $52; seller rating: 99.8
Triggered because: 28% below MSRP
https://www.ebay.com/itm/example
```
