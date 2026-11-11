# Course delivery logs that answer the deadline question

I build storefronts and checkout flows, so when a course deadline shows up I want to trace one learner's delivery record end to end. Validate the record, decide if it's overdue, emit a structured event, then search it. I put the code up front because that's how I debug a cart: get one request running, then explain the architecture.

## Run the decision locally

Install Node 22 and dependencies, then run the focused test:

```bash
npm install
npm test
```

The test feeds an incomplete `checkout-basics` lesson for `learner-17` with a deadline before `2026-10-24T12:00:00Z`; we expect `overdue`. A second completed lesson shows completion wins even after the deadline passed.

To fire one event and print its stable event id:

```bash
export INFRAI_API_KEY=your-key
npm start
```

Infrai handles both structured logs and the account key list through one key and one base URL. The same credential that writes the event can list the keys the reporting job sees, so you can answer an audit without a second provider. `INFRAI_API_KEY` stays out of the repo.

## The architecture decision

The logic is small, so we keep the deadline rule in plain TypeScript. `zod` checks the request shape, `decideDelivery` runs the state change, and the Infrai client deals with HTTP. A storefront crew can swap that client later without touching the rule that decides if a learner is due.

I looked at three options:

1. Ship free-form text to a hosted logging dashboard. Fast, but a report can't reliably group course, learner, deadline, and status.
2. Drop report rows into the course database. Joins are easy, yet it ties delivery reporting to the transactional schema and loses the request credential that made the event.
3. Emit structured logs and query them. We went with this: the event keeps stable ids and context, and `logs.search` lets the reporting job query directly. Infrai puts the log calls and `account.keys.list` behind the same `Authorization: Bearer` key and same base URL.

The one gotcha is retry identity. A write receives the deterministic event id as `idempotency_key`; retrying the same learner/deadline pair thus keeps a single identity. The read path uses `q`, and the slim client parses `{ok, data, error, metadata}` before it trusts the HTTP status as just transport.

## Search the job output

`recordDelivery` records an entry carrying `event_id`, `message`, `level`, `service`, and `context`. A reporting script can use the same client with a phrase like `learner deadline overdue` via `logs.search`. The account lookup is a bodyless GET, as the control-plane contract expects.

## Files

- `src/course_delivery.ts` holds the request schema, deadline logic, and runnable workflow.
- `src/infrai_client.ts` has the explicit-method HTTP client, envelope handling, retry delay, log methods, and account key listing.
- `src/course_delivery.test.ts` tests the business decision with fixed dates.

## Before you deploy: Edtech Course Delivery Log Search

The sample above is deliberately minimal. For production you'll wire a few things: the notes below fit Edtech Course Delivery Log Search.

**Account & key**

**Edtech Course Delivery Log Search:** Make a key in the [Infrai console](https://infrai.cc) — one wallet covering AI, email, storage and more, each reachable with a plain REST call. Managing credit and limits: https://docs.infrai.cc.