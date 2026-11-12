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
  zh: { shell: '毛坯交付，可按您的喜好设计', whitebox: '简装交付', euro: '全新精装修', designer: '设计师精装修' },
  ko: { shell: '골조 상태로 원하는 대로 꾸밀 수 있으며', whitebox: '기본 마감이 되어 있으며', euro: '새로 리모델링되었으며', designer: '디자이너 인테리어가 되어 있으며' },
  tr: { shell: 'kaba inşaat halinde — tasarımınız için boş bir tuval', whitebox: 'yarı bitmiş halde', euro: 'yeni tadilatlı', designer: 'tasarım dekorasyonlu' },
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
  if (language === 'zh') {
    const head = draft.type === 'apartment' ? (rooms === 0 ? `${area} m² 明亮开间` : `${area} m² 宽敞${rooms}室公寓`) : `${area} m² 房产`;
    return [
      `位于${districtName}的${head}，${reno}。`,
      draft.floor && draft.floorsTotal ? `${draft.floorsTotal} 层楼的第 ${draft.floor} 层，全天采光充足。` : '全天自然采光充足。',
      draft.furnished ? '家具齐全，可拎包入住。' : '户型设计合理，可设步入式衣帽间。',
      draft.installment ? '可直接向卖家分期付款。' : '可快速成交。',
      '步行即可到达学校、商店和公共交通。',
    ].join('');
  }
  if (language === 'ko') {
    const head = draft.type === 'apartment' ? (rooms === 0 ? `${area} m² 밝은 원룸` : `${area} m² 넓은 방 ${rooms}개 아파트`) : `${area} m² 매물`;
    return [
      `${districtName}에 위치한 ${head}로, ${reno} 즉시 생활하기 좋습니다.`,
      draft.floor && draft.floorsTotal ? `${draft.floorsTotal}층 건물의 ${draft.floor}층으로 하루 종일 햇빛이 잘 듭니다.` : '하루 종일 자연광이 풍부합니다.',
      draft.furnished ? '가구가 완비되어 바로 입주할 수 있습니다.' : '구조가 효율적이며 드레스룸 공간도 있습니다.',
      draft.installment ? '판매자에게 직접 할부 구매가 가능합니다.' : '빠른 거래가 가능합니다.',
      '학교, 상점, 대중교통이 도보 거리에 있습니다.',
    ].join(' ');
  }
  if (language === 'tr') {
    const head = draft.type === 'apartment' ? (rooms === 0 ? `${area} m² aydınlık stüdyo daire` : `${area} m² ferah ${rooms} odalı daire`) : `${area} m² mülk`;
    return [
      `${districtName} semtinde ${head}, ${reno}.`,
      draft.floor && draft.floorsTotal ? `${draft.floorsTotal} katlı binanın ${draft.floor}. katında, gün boyu bol ışık alıyor.` : 'Gün boyu bol doğal ışık.',
      draft.furnished ? 'Tamamen eşyalı — hemen taşınabilirsiniz.' : 'Kullanışlı plan, giyinme odası için yer var.',
      draft.installment ? 'Satıcıdan doğrudan taksit imkânı mevcut.' : 'Hızlı satışa hazır.',
      'Okullar, mağazalar ve toplu taşıma yürüme mesafesinde.',
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
