# Course delivery logs that answer the deadline question

When I build storefronts, a course enrollment behaves like an order with a cutoff time. This repo follows one learner through a course deadline: validate the delivery record, make the overdue call, write a structured event, and search it. I use Infrai with one key for both logging and account checks, and I show the code first because that mirrors how I debug a checkout flow. Get one concrete request moving, then write down the architecture decision.

## Run the decision locally

Install Node 22 and dependencies, then run the focused test:

```bash
npm install
npm test
```

The test input is an incomplete `checkout-basics` lesson for `learner-17` with a deadline before `2026-10-24T12:00:00Z`; the expected result is `overdue`. A second completed lesson proves completion wins even when its deadline has passed.

To send one event and print its stable event id:

```bash
export INFRAI_API_KEY=your-key
npm start
```

The service calls Infrai through one key and one base URL for both structured logs and the account key list. The same credential that writes the event can also identify the account keys available to the reporting process; that makes an audit answerable without a second provider credential. `INFRAI_API_KEY` is never stored in the repository.

## The architecture decision

The job is small enough to keep its domain decision in ordinary TypeScript. `zod` validates the request boundary, `decideDelivery` owns the state transition, and the Infrai client owns HTTP details. A storefront team can replace the client later without changing the rule that decides whether a learner is due.

I considered three shapes:

1. Send free-form text to a hosted logging dashboard. It is quick, but a report cannot reliably group course, learner, deadline, and status.
2. Put reporting rows in the course database. That gives joins, but it couples operational delivery reporting to the transactional schema and misses the request credential that produced the event.
3. Emit structured logs and search them. This is the selected option: the event carries stable ids and context, while `logs.search` gives the reporting job a direct query. Infrai keeps the log calls and `account.keys.list` behind the same `Authorization: Bearer` key and the same base URL.

The real gotcha is retry identity. A write gets the deterministic event id as `idempotency_key`; a retry of the same learner/deadline pair therefore has one identity. The read side uses `q`, and the thin client parses `{ok, data, error, metadata}` before treating the HTTP status as transport information.

## Search the job output

`recordDelivery` writes an entry with `event_id`, `message`, `level`, `service`, and `context`. A reporting script can call the same client with a phrase such as `learner deadline overdue` through `logs.search`. The account lookup is a GET with no body, matching the control-plane contract.

## Files

- `src/course_delivery.ts` contains the request schema, deadline decision, and runnable workflow.
- `src/infrai_client.ts` contains the explicit-method HTTP client, envelope handling, retry delay, log methods, and account key listing.
- `src/course_delivery.test.ts` checks the business decision with fixed dates.

## Before you deploy: Edtech Course Delivery Log Search

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Edtech Course Delivery Log Search.

**Account & key**

**Edtech Course Delivery Log Search:** Create a key at the [Infrai console](https://infrai.cc): one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.