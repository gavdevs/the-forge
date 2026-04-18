import { z } from 'zod';

export const webhookEventSchema = z.object({
  type: z.string(),
  data: z.unknown(),
});

export type WebhookEvent = z.infer<typeof webhookEventSchema>;
