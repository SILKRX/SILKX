import { z } from 'zod';

import { EMAIL_PATTERN } from '@/features/forms';

export const FEEDBACK_TOPICS = ['question', 'bug', 'idea', 'complaint'] as const;
export type FeedbackTopic = (typeof FEEDBACK_TOPICS)[number];

const MESSAGE_MIN = 10;
const MESSAGE_MAX = 2000;

export const feedbackSchema = z.object({
  topic: z.enum(FEEDBACK_TOPICS, 'validation.topic'),
  message: z.string().trim().min(MESSAGE_MIN, 'validation.message').max(MESSAGE_MAX, 'validation.message'),
  /** Необязательный email для ответа: пустая строка допустима */
  email: z
    .string()
    .trim()
    .refine((value) => value.length === 0 || EMAIL_PATTERN.test(value), 'validation.email'),
});

export type FeedbackValues = z.infer<typeof feedbackSchema>;
