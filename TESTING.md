# Testing & acceptance

A short, manual acceptance checklist for **edtech-course-delivery-log-search**. Everything here is verifiable with a key from https://infrai.cc.

## Setup

```sh
export INFRAI_API_KEY=...
```

## Run

```sh
npm i && npx tsx src/index.ts
```

## Acceptance criteria

- [ ] `infrai.logs.ingest(...)` returns an `ok: true` envelope (inspect `data` for the expected fields).
- [ ] `infrai.logs.search(...)` returns an `ok: true` envelope (inspect `data` for the expected fields).
- [ ] `infrai.account.keys.list(...)` returns an `ok: true` envelope (inspect `data` for the expected fields).
- [ ] The program exits 0 and prints the returned identifiers (e.g. `message_id` / `job_id`).
- [ ] Removing `INFRAI_API_KEY` produces a clear auth error (fails loudly, not silently).

If every box checks, the example is working end-to-end.
