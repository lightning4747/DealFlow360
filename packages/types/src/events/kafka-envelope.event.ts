import { z } from 'zod';

export const KafkaEventHeaderSchema = z.object({
  eventId: z.string().uuid(),
  eventType: z.string(),
  producer: z.string(),
  timestamp: z.string().datetime(),
  correlationId: z.string(),
});
export type KafkaEventHeader = z.infer<typeof KafkaEventHeaderSchema>;

export const KafkaEventEnvelopeSchema = <T extends z.ZodTypeAny>(payloadSchema: T) =>
  z.object({
    header: KafkaEventHeaderSchema,
    payload: payloadSchema,
  });
