# Souvion Promo

Souvion Promo is an educational Discord campaign simulator. It models multi-server campaign creation, batching, idempotency, checkpoints, restart recovery, analytics, and GitHub-backed persistence.

**Safety boundary:** the project never sends promotional Discord DMs. The delivery layer terminates at `src/simulator/dmSimulator.js`, which only creates simulated delivery records. It contains no bulk-DM API call, rate-limit bypass, proxy rotation, CAPTCHA bypass, token rotation, or enforcement-evasion code.

## Requirements

- Node.js 20+
- A Discord application/bot
- A private GitHub repository used as the JSON persistence store
- Railway for optional deployment

## 1. Discord Developer Portal

1. Create an application and bot.
2. Copy the bot token into Railway/local `.env` only; never commit it.
3. Enable the **Server Members Intent** if you want the bot to synchronize member lists for simulation. The simulator excludes bot accounts.
4. Invite the bot with the `bot` and `applications.commands` scopes.
5. Give it only the Discord permissions needed to operate the bot in your test servers. No DM permission is used by the simulator.

## 2. Private GitHub repository

Create a private repository and make sure the bot's GitHub token can read/write repository contents. The application creates/maintains:

- `data/servers.json`
- `data/members.json`
- `data/campaigns.json`
- `data/checkpoints.json`
- `data/delivery_logs.json`
- `data/blacklist.json`
- `data/settings.json`

GitHub writes use the file SHA. If a concurrent write causes a conflict, the newest file is refetched and the mutation is reapplied instead of blindly overwriting newer data.

## 3. GitHub token

Create a fine-grained token with access to the private repository's contents. Store it in `GITHUB_TOKEN` as a secret. Do not put it in source code.

## 4. Environment variables

Copy `.env.example` to `.env` and set:

```text
DISCORD_TOKEN=
CLIENT_ID=
GITHUB_TOKEN=
GITHUB_OWNER=
GITHUB_REPO=
GITHUB_BRANCH=main
BOT_OWNER_ID=
PORT=3000
DASHBOARD_TOKEN=
```

`BOT_OWNER_ID` is the Discord user ID that receives global administration permissions.

## 5. Local installation

```bash
npm install
npm run seed
npm run deploy
npm start
```

For development:

```bash
npm run dev
```

Tests:

```bash
npm test
```

## 6. Slash commands

Commands are grouped as:

- `/promo create`
- `/promo preview`
- `/promo start`
- `/promo pause`
- `/promo resume`
- `/promo cancel`
- `/promo recover`
- `/promo status`
- `/promo history`
- `/server list`
- `/server stats`
- `/admin settings`
- `/admin blacklist add|remove|list`

`/promo create` accepts a comma-separated list of target guild IDs and a batch size. Before a simulation starts, `/promo preview` shows the projected user count and batch count and requires a confirmation button.

## 7. Batch and checkpoint semantics

Batches are **1-based**.

- `total_batches = ceil(total_users / batch_size)`
- `current_batch = last_completed_batch + 1` while active
- `last_completed_batch` changes only after the checkpoint write succeeds
- completed campaigns have `current_batch = null` and `last_completed_batch = total_batches`
- an empty campaign completes immediately with `total_batches = 0`

For 103 users at batch size 25: 25, 25, 25, 25, 3.

The safe order is:

```text
process batch
  -> persist delivery records
  -> persist checkpoint
  -> mark batch complete
  -> move to next batch
```

The code keeps `last_completed_batch` at the last persisted checkpoint if the process stops during a batch. Existing terminal delivery records remain authoritative on recovery.

## 8. Restart and recovery

At startup the bot loads campaigns in `running`, `recovering`, or `cancelling` states, validates the newest checkpoint, marks interrupted running work as recoverable, reconstructs terminal delivery IDs from `delivery_logs.json`, and resumes from the next unfinished batch.

If checkpoint data is invalid, the campaign is marked `failed` and the last valid checkpoint is preserved rather than blindly continuing.

A delivery uses:

```text
idempotency_key = campaign_id:user_id
```

Terminal states are `simulated`, `skipped`, `failed`, and `duplicate`. Recovery will not create a second successful `simulated` record for the same campaign/user pair.

## 9. Railway deployment

1. Push the project to your private GitHub repository.
2. Create a Railway service from the repository.
3. Add the environment variables above as Railway Variables.
4. Ensure the service uses Node 20+.
5. Railway runs `npm start`.
6. Set a public Railway domain if you want the optional dashboard/health endpoint reachable.

Health check:

```text
GET /health
```

returns:

```json
{"status":"ok","service":"souvion-promo"}
```

The dashboard is intentionally read-only and does not expose secrets. If `DASHBOARD_TOKEN` is set, dashboard routes require `Authorization: Bearer <token>`; `/health` remains public for Railway health checks.

## 10. Graceful shutdown

`SIGINT` and `SIGTERM` stop new queue work, wait briefly for the current safe operation, release campaign locks, close the HTTP server, destroy the Discord client, and exit. An interrupted batch is not falsely marked completed.

## 11. Troubleshooting

### GitHub 409/conflict
The repository layer refetches the latest SHA and reapplies the pending mutation. Check that the token has write access and that another process is not continuously changing the same JSON file.

### Missing member data
Enable Server Members Intent and make sure the bot can see the target guild. The simulator can also use previously persisted member records.

### Slash commands not visible
Run `npm run deploy` again and wait for Discord command propagation. Confirm `CLIENT_ID` is the application ID.

### Recovery fails
Use `/promo status <campaign_id>` and `/promo recover`. If the checkpoint fails validation, the campaign remains failed so an administrator can inspect the preserved state rather than risking duplicate simulation records.

## Architecture

`commands` -> `services` -> `database repositories` -> `GitHub JSON`

`queueService` -> `dmSimulator` -> `delivery_logs.json`

No service below the simulator contains a Discord DM send operation.
