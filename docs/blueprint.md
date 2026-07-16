# Crypto Watchlist Alerts Bot — Bot specification

**Archetype:** custom

**Voice:** professional and concise — write every user-facing message, button label, error, and empty state in this voice.

A private Telegram bot that lets users track cryptocurrency prices with customizable alerts for price thresholds, percent changes, and daily summaries. Features include button-based watchlist management, quiet hours, cooldowns to prevent spam, and an owner-admin view for metrics.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- individual crypto watchers
- non-technical Telegram users

## Success criteria

- Users can add/remove coins via buttons or commands
- Alerts trigger accurately with cooldown enforcement
- Owner dashboard shows user metrics and alert statistics

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Onboarding flow with timezone setup and quiet hours explanation
- **/add** (command, actor: user, command: /add <ticker>) — Add a custom coin ticker to watchlist with validation
- **/remove** (command, actor: user, command: /remove <ticker>) — Remove a coin from watchlist
- **/list** (command, actor: user, command: /list) — Show current watchlist with prices and per-coin actions
- **/price** (command, actor: user, command: /price [ticker]) — Request current price for specific coin or full watchlist
- **/settings** (command, actor: user, command: /settings) — Configure quiet hours, cooldowns, and summary preferences
- **/admin** (command, actor: owner, command: /admin) — Owner-only metrics dashboard (users, active alerts, top tickers)

## Flows

### onboarding
_Trigger:_ /start

1. Explain features
2. Request timezone selection (autoguess, manual, skip)

_Data touched:_ user_profile

### watchlist_management
_Trigger:_ inline_button:add_coin

1. Add coin to watchlist
2. Confirm addition with current price

_Data touched:_ watchlist_entry

### alert_configuration
_Trigger:_ Configure > Threshold/Percent

1. Select coin
2. Set alert parameters
3. Confirm with example message

_Data touched:_ watchlist_entry

### morning_summary
_Trigger:_ scheduled_daily

1. Check user preferences
2. Generate price summary for watchlist
3. Send if outside quiet hours

_Data touched:_ user_profile, coin_price_record

### alert_delivery
_Trigger:_ price_change_detected

1. Check alert rules
2. Apply cooldown logic
3. Send formatted alert if applicable

_Data touched:_ watchlist_entry, coin_price_record

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

- **user_profile** _(retention: persistent)_ — User preferences and metadata
  - fields: telegram_id, display_name, timezone, quiet_hours_start, quiet_hours_end, summary_time, cooldown_length, percent_alert_enabled, threshold_alert_enabled
- **watchlist_entry** _(retention: persistent)_ — Tracked cryptocurrency and alert rules
  - fields: user_id, ticker, friendly_name, threshold_alerts, percent_alerts, enabled, last_alert_ts, reference_price
- **coin_price_record** _(retention: session)_ — Cached market data for price calculations
  - fields: ticker, price_usd, timestamp, source_reliability
- **owner_metrics** _(retention: persistent)_ — Aggregated system statistics
  - fields: total_users, active_users_30d, top_tickers, alert_type_counts

## Integrations

- **Telegram** (required) — Messaging and user interface
- **Price Feeds** (required) — Market data for USD spot prices
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- /admin metrics dashboard
- /admin alerts-log <n> for recent events

## Notifications

- Price alerts with threshold/percent change details
- Daily summary with watchlist prices
- Queued alerts sent at quiet-hours end
- Cooldown status in repeated alerts

## Permissions & privacy

- Private 1:1 chat only
- No access to private watchlists for owner
- User data stored securely with retention policies

## Edge cases

- Unknown/invalid ticker handling with suggestions
- Price feed failures with silent retries
- Quiet-hour alert queuing and summarization
- Cooldown expiration checks for alert suppression

## Required tests

- End-to-end alert triggering with cooldown enforcement
- Morning summary delivery during active hours
- Quiet-hour alert queuing and batch delivery
- Admin metrics accuracy validation

## Assumptions

- Default timezone is Telegram profile autodetect
- Price feed failures don't block user commands
- Percent alerts use 1-hour default window
- Admin view aggregates only non-personal data
