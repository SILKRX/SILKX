import { z } from 'zod';

import type { ListingDraft, WizardStep } from '@/store/listingDraft';

const AREA_MIN = 10;
const AREA_MAX = 2000;
const ROOMS_MAX = 10;
const FLOORS_MAX = 80;
const ADDRESS_MIN = 3;
const DESCRIPTION_MIN = 40;
export const PHOTOS_MIN = 3;

const basicsSchema = z
  .object({
    price: z.number('validation.price').positive('validation.price'),
    area: z.number('validation.area').min(AREA_MIN, 'validation.area').max(AREA_MAX, 'validation.area'),
    rooms: z.number('validation.rooms').int('validation.rooms').min(0, 'validation.rooms').max(ROOMS_MAX, 'validation.rooms'),
    floor: z.number('validation.floor').int('validation.floor').min(1, 'validation.floor'),
    floorsTotal: z.number('validation.floorsTotal').int('validation.floorsTotal').min(1, 'validation.floorsTotal').max(FLOORS_MAX, 'validation.floorsTotal'),
  })
  .refine((v) => v.floor <= v.floorsTotal, { path: ['floor'], message: 'validation.floor' });

const locationSchema = z.object({
  address: z.string().trim().min(ADDRESS_MIN, 'validation.address'),
  district: z.string('validation.address'),
  coords: z.object({ latitude: z.number(), longitude: z.number() }, 'validation.address'),
});

const detailsSchema = z.object({
  description: z.string().trim().min(DESCRIPTION_MIN, 'validation.description'),
});

const mediaSchema = z.object({
  photos: z.array(z.string()).min(PHOTOS_MIN, 'validation.photos'),
});

export type StepErrors = Partial<Record<keyof ListingDraft, string>>;

function collect(result: { success: true } | { success: false; error: z.ZodError }): StepErrors {
  if (result.success) return {};
  const errors: StepErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !(key in errors)) errors[key as keyof ListingDraft] = issue.message;
  }
  return errors;
}

/** Проверка одного шага мастера. Пустой объект — шаг заполнен корректно. */
export function validateStep(step: WizardStep, draft: ListingDraft): StepErrors {
  switch (step) {
    case 'basics':
      return collect(basicsSchema.safeParse({ ...draft, floor: draft.type === 'house' ? 1 : draft.floor }));
    case 'location':
      return collect(locationSchema.safeParse(draft));
    case 'details':
      return collect(detailsSchema.safeParse(draft));
    case 'media':
      return collect(mediaSchema.safeParse(draft));
    case 'review':
      return {
        ...validateStep('basics', draft),
        ...validateStep('location', draft),
        ...validateStep('details', draft),
        ...validateStep('media', draft),
      };
  }
}
