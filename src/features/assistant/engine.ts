import type { TFunction } from 'i18next';

import { floorLabel, perM2Label, priceDropPercent, priceLabel, propertyTitle, renovationLabel, roomsLabel } from '@/features/property/format';
import { buildTour, sceneLabels } from '@/features/tour/scenes';
import { formatArea, formatUSD } from '@/lib/format';
import { calculateLoan, DOWN_PAYMENT_SHARE, MORTGAGE_DEFAULT_RATE, MORTGAGE_TERMS_YEARS } from '@/lib/mortgage';
import type { Complex, DistrictId, Property } from '@/types/domain';

/**
 * SILKX AI — ассистент покупателя.
 *
 * Отвечает по данным объявления (цена, адрес, площадь, ремонт, удобства, ипотека, продавец, 3D-тур)
 * на русском, узбекском и английском. Работает офлайн и мгновенно, ничего не выдумывает:
 * всё, что он говорит, взято из карточки объекта.
 *
 * Чтобы подключить LLM, достаточно заменить `answer()` вызовом своего сервера
 * (ключ API нельзя хранить в приложении) и передавать туда `property` как контекст.
 */

export type AssistantAction = 'tour' | 'book' | 'call' | 'chat' | 'search' | 'sell' | 'support' | 'mortgage';

export interface AssistantReply {
  text: string;
  actions: AssistantAction[];
}

export interface AssistantContext {
  t: TFunction;
  property: Property | null;
  complex: Complex | null;
  /** Район, откуда пришёл гость (например, из отеля) — для подбора жилья рядом */
  district?: DistrictId | null;
}

type Intent =
  | 'all'
  | 'price'
  | 'location'
  | 'size'
  | 'renovation'
  | 'amenities'
  | 'mortgage'
  | 'seller'
  | 'tour'
  | 'viewing'
  | 'year'
  | 'greeting'
  | 'thanks'
  | 'search'
  | 'sell'
  | 'support';

/**
 * Ключевые слова на ru / uz / en / zh / ko / tr. Порядок важен: в нём же собирается ответ.
 * Осторожно с пересечениями: 卖家 (продавец) ≠ 卖 (продать), 방문 (визит) ≠ 방 (комната), satıcı ≠ satmak.
 */
const INTENTS: [Intent, RegExp][] = [
  ['greeting', /^(привет|здравств|добр(ый|ое)|hello|hi\b|hey|salom|assalom|你好|您好|안녕|merhaba|selam)/],
  ['thanks', /(спасиб|благодар|thank|rahmat|tashakkur|谢谢|感谢|고마|감사|teşekkür|sağ ?ol)/],
  ['all', /(всё|все о|полн|подробн|расскажи|опиши|информац|about|everything|full|describe|tell me|details|batafsil|hammasi|haqida|ma.lumot|全部|所有|详细|介绍|전부|모두|자세히|her şey|hepsi|detay|anlat)/],
  ['price', /(цен|стоит|стоим|сколько|дорог|дешев|price|cost|how much|expensive|cheap|narx|qancha|necha pul|qimmat|arzon|\$|多少钱|价格|价钱|贵|便宜|얼마|가격|비싸|fiyat|ne kadar|pahalı|ucuz)/],
  ['location', /(где|адрес|район|располож|находит|локац|карт|рядом|location|where|address|district|nearby|map|qayer|manzil|tuman|joylash|xarita|哪里|位置|地址|地图|附近|어디|위치|주소|지도|근처|nerede|konum|adres|semt|harita|yakın)/],
  ['size', /(площад|метр|м2|м²|комнат|этаж|планир|размер|size|sqm|square|rooms?\b|floor|layout|big|maydon|xona|qavat|kvadrat|katta|面积|平米|平方|几室|房间|楼层|户型|면적|평수|방 개수|방이 몇|층|구조|alan|metrekare|oda|kat\b|kaçıncı)/],
  ['renovation', /(ремонт|отделк|мебел|состоян|renovat|furnish|finish|condition|ta.mir|tamir|mebel|holat|装修|家具|인테리어|가구|리모델링|tadilat|eşya|dekorasyon)/],
  ['amenities', /(удобств|парков|охран|лифт|инфраструкт|кондиц|amenit|parking|security|elevator|wifi|facilit|qulaylik|avtoturargoh|lift|qo.riqlash|配套|设施|停车|电梯|安保|편의|주차|엘리베이터|경비|olanak|otopark|asansör|güvenlik)/],
  ['mortgage', /(ипотек|рассроч|кредит|платеж|платёж|ежемесяч|взнос|mortgage|installment|loan|monthly|down payment|ipoteka|bo.lib|kredit|oylik|to.lov|按揭|贷款|分期|月供|首付|대출|할부|납입|계약금|peşinat|aylık|taksit|kredi)/],
  ['seller', /(продав|владел|хозя|застрой|агент|контакт|позвон|телефон|seller|owner|agent|developer|contact|call|phone|sotuvchi|egasi|telefon|qo.ng.iroq|aloqa|卖家|业主|开发商|中介|电话|판매자|집주인|개발사|연락|전화|satıcı|ev sahibi|müteahhit)/],
  ['tour', /(3d|3д|тур|виртуал|внутри|осмотреть комнат|360|tour|virtual|inside|walk ?through|sayohat|ichini|ichki|全景|漫游|투어|둘러|sanal|tur\b|turu)/],
  ['viewing', /(просмотр|вживую|записат|визит|встреч|приехать|viewing|visit|book|appointment|ko.rish|uchrash|tashrif|kelish|预约|参观|实地|방문|예약|randevu|ziyaret|görmeye)/],
  ['year', /(сдач|сдают|когда готов|срок|completion|ready|built|handover|topshir|qachon|交房|竣工|入住|什么时候|준공|입주|언제|teslim|ne zaman)/],
  ['search', /(найти|поиск|ищу|подбер|подобр|покаж|find|search|looking for|show me|qidir|top|ko.rsat|找|搜索|推荐|찾|검색|추천|bul\b|bulur)/],
  ['sell', /(продать|разместить|объявлен|сдать в аренду|sell|post (a|an|my)|list my|e.lon|sotmoq|sotish|joylash|卖我|出售|发布房源|出租我|팔아|팔고|매물 등록|satarım|satmak|ilan ver|kiraya ver)/],
  ['support', /(поддерж|помощ|оператор|телеграм|support|help|operator|telegram|yordam|qo.llab|客服|帮助|人工|고객센터|도움|상담|destek|yardım)/],
];

function detect(question: string): Intent[] {
  const q = question.toLocaleLowerCase().replace(/[’‘`ʻʼ]/g, "'");
  return INTENTS.filter(([, re]) => re.test(q)).map(([intent]) => intent);
}

// ---------- Ответы по объекту ----------

function summary(p: Property, t: TFunction): string {
  return t('assistant.summary', {
    title: propertyTitle(p, t),
    deal: t(`dealType.${p.dealType}`).toLocaleLowerCase(),
    district: t(`districts.${p.district}`),
    address: p.address,
    price: priceLabel(p, t),
  });
}

function price(p: Property, t: TFunction): string {
  const perM2 = perM2Label(p, t);
  let text = p.dealType === 'rent' ? t('assistant.priceRent', { price: formatUSD(p.price) }) : t('assistant.priceSale', { price: formatUSD(p.price), perM2: perM2 ?? '' });
  const drop = priceDropPercent(p);
  if (drop && p.previousPrice) text += ` ${t('assistant.priceDrop', { percent: drop, old: formatUSD(p.previousPrice) })}`;
  return text;
}

function location(p: Property, t: TFunction, complex: Complex | null): string {
  let text = t('assistant.location', { district: t(`districts.${p.district}`), address: p.address });
  if (complex) text += ` ${t('assistant.inComplex', { name: complex.name, cls: t(`complex.class.${complex.class}`) })}`;
  return text;
}

function size(p: Property, t: TFunction): string {
  return t('assistant.size', {
    area: formatArea(p.area),
    rooms: roomsLabel(p.rooms, t),
    floor: floorLabel(p, t),
  });
}

function renovation(p: Property, t: TFunction): string {
  return `${t('assistant.renovation', { renovation: renovationLabel(p.renovation, t) })} ${p.furnished ? t('assistant.furnishedYes') : t('assistant.furnishedNo')}`;
}

function amenities(p: Property, t: TFunction, complex: Complex | null): string {
  if (p.amenities.length === 0 && !complex) return t('assistant.amenitiesNone');
  const parts: string[] = [];
  if (p.amenities.length > 0) parts.push(t('assistant.amenities', { list: p.amenities.map((a) => t(`amenities.${a}`).toLocaleLowerCase()).join(', ') }));
  if (complex && complex.infrastructure.length > 0) {
    parts.push(t('assistant.infrastructure', { list: complex.infrastructure.map((i) => t(`infrastructure.${i}`).toLocaleLowerCase()).join(', ') }));
  }
  return parts.join(' ');
}

function mortgage(p: Property, t: TFunction): string {
  if (p.dealType === 'rent') return t('assistant.mortgageRent');
  const parts: string[] = [];
  if (p.mortgage) {
    const loan = calculateLoan({
      price: p.price,
      downPaymentShare: DOWN_PAYMENT_SHARE.default,
      termMonths: MORTGAGE_TERMS_YEARS.default * 12,
      annualRate: MORTGAGE_DEFAULT_RATE,
    });
    parts.push(
      t('assistant.mortgage', {
        share: Math.round(DOWN_PAYMENT_SHARE.default * 100),
        down: formatUSD(loan.downPayment),
        years: MORTGAGE_TERMS_YEARS.default,
        rate: MORTGAGE_DEFAULT_RATE,
        monthly: formatUSD(loan.monthly),
      }),
    );
  }
  if (p.installment) parts.push(t('assistant.installment'));
  if (parts.length === 0) return t('assistant.mortgageNo');
  return parts.join(' ');
}

function seller(p: Property, t: TFunction): string {
  const s = p.seller;
  let text = t('assistant.seller', {
    name: s.name,
    kind: t(`property.sellerKind.${s.kind}`),
    rating: s.rating.toFixed(1),
    reviews: s.reviewsCount,
  });
  if (s.verified) text += ` ${t('assistant.sellerVerified')}`;
  return text;
}

function tour(p: Property, t: TFunction): string {
  const scenes = buildTour(p);
  const rooms = sceneLabels(scenes, (s) => t(`tour.rooms.${s.room}`).toLocaleLowerCase());
  return t('assistant.tour', { n: scenes.length, rooms: rooms.join(', ') });
}

function year(p: Property, t: TFunction, complex: Complex | null): string {
  if (p.completionYear) return t('assistant.yearPlanned', { year: p.completionYear });
  if (complex) return t('assistant.yearComplex', { completion: complex.completion });
  return t('assistant.yearReady');
}

function full(p: Property, t: TFunction, complex: Complex | null): string {
  return [summary(p, t), price(p, t), size(p, t), renovation(p, t), amenities(p, t, complex), mortgage(p, t), seller(p, t), tour(p, t)].join('\n\n');
}

/** Первое сообщение ассистента при открытии чата. */
export function greeting({ t, property, district }: AssistantContext): AssistantReply {
  if (!property && district) return { text: t('assistant.greetingNearby', { district: t(`districts.${district}`) }), actions: ['search'] };
  if (!property) return { text: t('assistant.greetingGeneral'), actions: ['search'] };
  return { text: `${t('assistant.greeting')}\n\n${summary(property, t)}\n\n${t('assistant.greetingAsk')}`, actions: ['tour'] };
}

export function answer(question: string, ctx: AssistantContext): AssistantReply {
  const { t, property: p, complex } = ctx;
  const intents = detect(question);

  if (!p) return answerGeneral(intents, t);

  const has = (i: Intent) => intents.includes(i);
  const parts: string[] = [];
  const actions = new Set<AssistantAction>();

  if (has('all')) {
    parts.push(full(p, t, complex));
    actions.add('tour').add('book');
  } else {
    if (has('price')) parts.push(price(p, t));
    if (has('location')) parts.push(location(p, t, complex));
    if (has('size')) parts.push(size(p, t));
    if (has('renovation')) parts.push(renovation(p, t));
    if (has('amenities')) parts.push(amenities(p, t, complex));
    if (has('mortgage')) {
      parts.push(mortgage(p, t));
      if (p.dealType === 'sale') actions.add('mortgage');
    }
    if (has('year')) parts.push(year(p, t, complex));
    if (has('seller')) {
      parts.push(seller(p, t));
      actions.add('call').add('chat');
    }
    if (has('tour')) {
      parts.push(tour(p, t));
      actions.add('tour');
    }
    if (has('viewing')) {
      parts.push(t('assistant.viewing'));
      actions.add('book');
    }
  }

  if (parts.length === 0) {
    if (has('thanks')) return { text: t('assistant.thanks'), actions: [] };
    if (has('greeting')) return { text: `${t('assistant.hello')} ${t('assistant.greetingAsk')}`, actions: [] };
    if (has('support')) return { text: t('assistant.support'), actions: ['support'] };
    return { text: t('assistant.fallback'), actions: [] };
  }
  return { text: parts.join('\n\n'), actions: [...actions] };
}

function answerGeneral(intents: Intent[], t: TFunction): AssistantReply {
  const has = (i: Intent) => intents.includes(i);
  if (has('sell')) return { text: t('assistant.general.sell'), actions: ['sell'] };
  if (has('mortgage')) return { text: t('assistant.general.mortgage'), actions: ['search'] };
  if (has('tour')) return { text: t('assistant.general.tour'), actions: ['search'] };
  if (has('support') || has('seller')) return { text: t('assistant.support'), actions: ['support'] };
  if (has('search') || has('price') || has('location') || has('size') || has('all')) return { text: t('assistant.general.search'), actions: ['search'] };
  if (has('thanks')) return { text: t('assistant.thanks'), actions: [] };
  if (has('greeting')) return { text: t('assistant.greetingGeneral'), actions: ['search'] };
  return { text: t('assistant.general.fallback'), actions: ['search', 'support'] };
}

/** Вопросы-подсказки под полем ввода */
export function quickQuestions(t: TFunction, hasProperty: boolean): string[] {
  if (!hasProperty) return [t('assistant.qg.search'), t('assistant.qg.mortgage'), t('assistant.qg.sell'), t('assistant.qg.support')];
  return [t('assistant.q.all'), t('assistant.q.price'), t('assistant.q.location'), t('assistant.q.size'), t('assistant.q.mortgage'), t('assistant.q.tour'), t('assistant.q.seller')];
}

/** Текст для озвучки: без символов, которые синтезатор читает странно. */
export function toSpeech(text: string, t: TFunction): string {
  return text
    .replace(/ /g, ' ')
    .replace(/(\d)\s+(?=\d{3}\b)/g, '$1')
    .replace(/\s?(м²|m²)/g, ` ${t('assistant.sqmSpoken')}`)
    .replace(/[★·•]/g, ', ')
    .replace(/\n+/g, '. ');
}
