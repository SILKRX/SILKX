import type { Language } from '@/i18n/types';
import { uid } from '@/lib/id';
import type { FlagValues } from '@/store/flags';
import type { ListingDraft } from '@/store/listingDraft';

import { verifyAccessToken } from '../mock/crypto';
import { authClient } from './authClient';
import { request } from './client';

export const supportApi = {
  sendFeedback: (input: { topic: string; message: string; email: string | null }) =>
    request<void>(
      (db) => {
        const token = authClient.getTokens()?.accessToken;
        const payload = token ? verifyAccessToken(token) : null;
        db.feedback.push({
          id: uid('fb'),
          userId: payload?.sub ?? null,
          topic: input.topic,
          message: input.message.trim(),
          email: input.email?.trim() || null,
          createdAt: new Date().toISOString(),
        });
      },
      { mutates: true, latency: [600, 1000] },
    ),
};

const RENOVATION_TEXT: Record<Language, Record<ListingDraft['renovation'], string>> = {
  ru: { shell: 'в состоянии «коробка» — простор для вашего дизайна', whitebox: 'с предчистовой отделкой', euro: 'со свежим евроремонтом', designer: 'с дизайнерским ремонтом' },
  uz: { shell: '«qora suvoq» holatida — dizayningiz uchun keng imkoniyat', whitebox: 'oq suvoq bilan', euro: 'yangi yevroremont bilan', designer: 'dizaynerlik taʼmiri bilan' },
  en: { shell: 'in shell condition — a blank canvas for your design', whitebox: 'with white-box finishing', euro: 'freshly renovated', designer: 'with a designer renovation' },
};

/** «AI»-генерация описания. В продакшене — вызов LLM через бэкенд; здесь — шаблонный генератор. */
function composeDescription(draft: ListingDraft, language: Language, districtName: string): string {
  const area = draft.area ?? 0;
  const rooms = draft.rooms ?? 1;
  const reno = RENOVATION_TEXT[language][draft.renovation];
  if (language === 'en') {
    const head = draft.type === 'apartment' ? (rooms === 0 ? `A bright ${area} m² studio` : `A spacious ${rooms}-room apartment of ${area} m²`) : `A ${area} m² property`;
    return [
      `${head} in ${districtName}, ${reno}.`,
      draft.floor && draft.floorsTotal ? `Floor ${draft.floor} of ${draft.floorsTotal} with plenty of daylight.` : 'Plenty of daylight throughout the day.',
      draft.furnished ? 'Fully furnished — move in right away.' : 'Thoughtful layout with room for a walk-in closet.',
      draft.installment ? 'Installments are available directly from the seller.' : 'Ready for a quick transaction.',
      'Schools, shops and public transport are within walking distance.',
    ].join(' ');
  }
  if (language === 'uz') {
    const head = draft.type === 'apartment' ? (rooms === 0 ? `${area} m² li yorugʻ studiya` : `${area} m² li keng ${rooms} xonali kvartira`) : `${area} m² li obyekt`;
    return [
      `${districtName} tumanidagi ${head}, ${reno}.`,
      draft.floor && draft.floorsTotal ? `${draft.floorsTotal} qavatli binoning ${draft.floor}-qavati, kun boʻyi yorugʻ.` : 'Kun boʻyi tabiiy yorugʻlik.',
      draft.furnished ? 'Toʻliq mebellangan — darhol koʻchib kirish mumkin.' : 'Puxta rejalashtirilgan, kiyinish xonasi uchun joy bor.',
      draft.installment ? 'Sotuvchidan boʻlib toʻlash imkoniyati mavjud.' : 'Tez bitimga tayyor.',
      'Yaqin atrofda maktablar, doʻkonlar va jamoat transporti.',
    ].join(' ');
  }
  const head = draft.type === 'apartment' ? (rooms === 0 ? `Светлая студия ${area} м²` : `Просторная ${rooms}-комнатная квартира ${area} м²`) : `Объект площадью ${area} м²`;
  return [
    `${head} в ${districtName} районе, ${reno}.`,
    draft.floor && draft.floorsTotal ? `${draft.floor} этаж из ${draft.floorsTotal}, много света в течение всего дня.` : 'Много естественного света в течение дня.',
    draft.furnished ? 'Полностью меблирована — можно заезжать сразу.' : 'Продуманная планировка, есть место для гардеробной.',
    draft.installment ? 'Возможна рассрочка напрямую от продавца.' : 'Готовы к быстрой сделке.',
    'В шаговой доступности школы, магазины и общественный транспорт.',
  ].join(' ');
}

export const aiApi = {
  generateDescription: (draft: ListingDraft, language: Language, districtName: string) =>
    request<string>(() => composeDescription(draft, language, districtName), { latency: [1400, 2300] }),
};

export const configApi = {
  /** Remote config: сервер может удалённо выключить фичу (например, калькулятор). */
  flags: () => request<Partial<FlagValues>>(() => ({}), { latency: [120, 280], stable: true }),
};
