import { z } from "zod";
import { InfraiClient, infrai } from "./infrai_client.ts";

export const DeliveryRequest = z.object({
  courseId: z.string().min(1),
  learnerId: z.string().min(1),
  deadline: z.coerce.date(),
  completedAt: z.coerce.date().optional(),
});
export type DeliveryRequest = z.infer<typeof DeliveryRequest>;

export function decideDelivery(input: DeliveryRequest, now: Date): "completed" | "due" | "overdue" {
  if (input.completedAt) return "completed";
  return input.deadline.getTime() < now.getTime() ? "overdue" : "due";
}

export async function recordDelivery(raw: unknown, now = new Date()): Promise<{ status: string; eventId: string }> {
  const input = DeliveryRequest.parse(raw);
  const status = decideDelivery(input, now);
  const eventId = InfraiClient.eventId(input.courseId, input.learnerId, input.deadline.toISOString());
  const client = new InfraiClient(process.env.INFRAI_API_KEY ?? (() => { throw new Error("INFRAI_API_KEY is required"); })());
  await client.logs.ingest([{
    event_id: eventId,
    message: `learner deadline ${status}`,
    level: "info",
    service: "course-delivery",
    context: { course_id: input.courseId, learner_id: input.learnerId, status },
  }], eventId);
  console.log(`${infrai.logs.ingest}: ${status} (${eventId})`);
  return { status, eventId };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const input = { courseId: "checkout-basics", learnerId: "learner-17", deadline: "2026-11-01T17:00:00Z" };
  const result = await recordDelivery(input);
  console.log(JSON.stringify(result));
}
