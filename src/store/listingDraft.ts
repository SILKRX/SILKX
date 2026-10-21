import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { STORAGE_KEYS, zustandStorage } from '@/lib/storage';
import type { AmenityId, Coordinates, DealType, DistrictId, PropertyType, Renovation } from '@/types/domain';

export interface ListingDraft {
  dealType: DealType;
  type: PropertyType;
  price: number | null;
  area: number | null;
  rooms: number | null;
  floor: number | null;
  floorsTotal: number | null;
  address: string;
  district: DistrictId | null;
  coords: Coordinates | null;
  renovation: Renovation;
  furnished: boolean;
  amenities: AmenityId[];
  installment: boolean;
  description: string;
  photos: string[];
}

export const EMPTY_DRAFT: ListingDraft = {
  dealType: 'sale',
  type: 'apartment',
  price: null,
  area: null,
  rooms: null,
  floor: null,
  floorsTotal: null,
  address: '',
  district: null,
  coords: null,
  renovation: 'euro',
  furnished: false,
  amenities: [],
  installment: false,
  description: '',
  photos: [],
};

export const WIZARD_STEPS = ['basics', 'location', 'details', 'media', 'review'] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];

interface ListingDraftState {
  draft: ListingDraft;
  stepIndex: number;
  update: (patch: Partial<ListingDraft>) => void;
  setStepIndex: (index: number) => void;
  reset: () => void;
}

/** Черновик сохраняется между запусками — продавец не потеряет прогресс. */
export const useListingDraftStore = create<ListingDraftState>()(
  persist(
    (set) => ({
      draft: EMPTY_DRAFT,
      stepIndex: 0,
      update: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
      setStepIndex: (stepIndex) => set({ stepIndex: Math.max(0, Math.min(stepIndex, WIZARD_STEPS.length - 1)) }),
      reset: () => set({ draft: EMPTY_DRAFT, stepIndex: 0 }),
    }),
    { name: STORAGE_KEYS.listingDraft, storage: zustandStorage, version: 1 },
  ),
);

export function isDraftDirty(draft: ListingDraft): boolean {
  return (
    draft.price !== null ||
    draft.area !== null ||
    draft.address.length > 0 ||
    draft.description.length > 0 ||
    draft.photos.length > 0
  );
}
