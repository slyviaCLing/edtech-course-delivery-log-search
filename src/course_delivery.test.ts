import test from "node:test";
import assert from "node:assert/strict";
import { decideDelivery, DeliveryRequest } from "./course_delivery.ts";

test("an incomplete lesson after its deadline is overdue, while a completed one is complete", () => {
  const now = new Date("2026-10-24T12:00:00Z");
  const overdue = DeliveryRequest.parse({ courseId: "checkout-basics", learnerId: "learner-17", deadline: "2026-10-23T12:00:00Z" });
  const complete = DeliveryRequest.parse({ courseId: "checkout-basics", learnerId: "learner-18", deadline: "2026-10-23T12:00:00Z", completedAt: "2026-10-23T11:00:00Z" });
  assert.equal(decideDelivery(overdue, now), "overdue");
  assert.equal(decideDelivery(complete, now), "completed");
});
