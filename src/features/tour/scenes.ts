import type { Hotel, HotelRoomType, Property } from '@/types/domain';

/**
 * 3D-тур по объекту: набор 360° панорам (equirectangular, 2:1), между которыми можно «ходить».
 *
 * Пока у объявлений нет собственных панорам, тур собирается из демо-комнат Poly Haven
 * (лицензия CC0) по типу объекта, числу комнат и ремонту. Когда продавцы начнут загружать
 * свои 360° фото, достаточно вернуть их здесь — экран и просмотрщик менять не нужно.
 */

export type RoomKind = 'living' | 'kitchen' | 'bedroom' | 'bathroom' | 'balcony' | 'hall' | 'office' | 'room' | 'lobby';

export interface TourScene {
  id: string;
  room: RoomKind;
  /** Для отелей: категория номера — подпись берётся из неё */
  roomType?: HotelRoomType;
  /** Номер комнаты одного типа (Спальня 2) — 0, если она одна */
  index: number;
  /** Лёгкая версия (~1920×960, ~200 КБ) — показывается сразу */
  preview: string;
  /** Полное качество (8K, 2–6 МБ) — догружается на мощных устройствах; null — только preview */
  hd: string | null;
  /** Куда смотреть при входе в комнату, градусы */
  startYaw: number;
}

interface Pano {
  slug: string;
  hd: boolean;
  startYaw?: number;
}

const PREVIEW = (slug: string) => `https://cdn.polyhaven.com/asset_img/primary/${slug}.png?format=jpg&width=2048`;
const HD = (slug: string) => `https://dl.polyhaven.org/file/ph-assets/HDRIs/extra/Tonemapped%20JPG/${slug}.jpg`;

/** Комнаты с ремонтом и мебелью */
const FURNISHED: Record<RoomKind, Pano[]> = {
  living: [{ slug: 'lythwood_lounge', hd: true }, { slug: 'wooden_lounge', hd: true }, { slug: 'anniversary_lounge', hd: true }],
  kitchen: [{ slug: 'kiara_interior', hd: true }],
  bedroom: [{ slug: 'hotel_room', hd: true }, { slug: 'lythwood_room', hd: true }],
  bathroom: [{ slug: 'en_suite', hd: true }],
  balcony: [{ slug: 'cayley_interior', hd: true }],
  hall: [{ slug: 'st_fagans_interior', hd: true }],
  office: [{ slug: 'small_empty_room_1', hd: false }],
  room: [{ slug: 'hotel_room', hd: true }],
  lobby: [{ slug: 'st_fagans_interior', hd: true }],
};

/** Черновая отделка / white box — пустые помещения */
const BARE: Record<RoomKind, Pano[]> = {
  living: [{ slug: 'lebombo', hd: true }, { slug: 'small_empty_room_1', hd: false }],
  kitchen: [{ slug: 'small_empty_house', hd: true }],
  bedroom: [{ slug: 'small_empty_room_3', hd: false }, { slug: 'unfinished_office', hd: false }],
  bathroom: [{ slug: 'bathroom', hd: true }],
  balcony: [{ slug: 'cayley_interior', hd: true }],
  hall: [{ slug: 'small_empty_house', hd: true }],
  office: [{ slug: 'unfinished_office', hd: false }, { slug: 'small_empty_room_1', hd: false }],
  room: [{ slug: 'small_empty_room_3', hd: false }],
  lobby: [{ slug: 'small_empty_house', hd: true }],
};

const MAX_BEDROOMS = 3;

function roomPlan(property: Pick<Property, 'type' | 'rooms'>): RoomKind[] {
  if (property.type === 'commercial') return ['hall', 'office', 'office', 'bathroom'];

  const plan: RoomKind[] = ['living', 'kitchen'];
  // студия и 1-комн.: гостиная = спальня; дальше по спальне на каждую комнату сверх гостиной
  const bedrooms = property.rooms <= 1 ? 0 : Math.min(property.rooms - 1, MAX_BEDROOMS);
  for (let i = 0; i < bedrooms; i += 1) plan.push('bedroom');
  plan.push('bathroom');
  if (property.type === 'house' || property.type === 'townhouse') plan.unshift('hall');
  plan.push('balcony');
  return plan;
}

/** Стабильный «случайный» сдвиг по id, чтобы у соседних объектов туры немного отличались. */
function seedFrom(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

export function buildTour(property: Pick<Property, 'id' | 'type' | 'rooms' | 'renovation'>): TourScene[] {
  const library = property.renovation === 'shell' || property.renovation === 'whitebox' ? BARE : FURNISHED;
  const seed = seedFrom(property.id);
  const seen: Partial<Record<RoomKind, number>> = {};

  return roomPlan(property).map((room, order) => {
    const n = seen[room] ?? 0;
    seen[room] = n + 1;
    const options = library[room];
    const pano = options[(seed + n) % options.length] ?? options[0]!;
    return {
      id: `${property.id}_${order}`,
      room,
      index: n,
      preview: PREVIEW(pano.slug),
      hd: pano.hd ? HD(pano.slug) : null,
      startYaw: pano.startYaw ?? (seed + order * 47) % 360,
    };
  });
}

/** Помечаем номера только у повторяющихся комнат: «Спальня 1», «Спальня 2», но просто «Кухня». */
export function sceneLabels(scenes: TourScene[], roomName: (scene: TourScene) => string): string[] {
  const totals: Record<string, number> = {};
  const keyOf = (s: TourScene) => s.roomType ?? s.room;
  for (const s of scenes) totals[keyOf(s)] = (totals[keyOf(s)] ?? 0) + 1;
  return scenes.map((s) => ((totals[keyOf(s)] ?? 0) > 1 ? `${roomName(s)} ${s.index + 1}` : roomName(s)));
}

/** Панорамы номеров по категории: стандарт — уютный номер, люкс — гостиная сьюта. */
const HOTEL_ROOMS: Record<HotelRoomType, Pano[]> = {
  standard: [{ slug: 'hotel_room', hd: true }],
  deluxe: [{ slug: 'lythwood_room', hd: true }],
  suite: [{ slug: 'lythwood_lounge', hd: true }, { slug: 'anniversary_lounge', hd: true }],
};

/** 3D-тур по отелю: лобби → номера каждой категории → ванная → вид из окна. */
export function buildHotelTour(hotel: Pick<Hotel, 'id' | 'rooms'>): TourScene[] {
  const seed = seedFrom(hotel.id);
  const scene = (order: number, room: RoomKind, pano: Pano, roomType?: HotelRoomType): TourScene => ({
    id: `${hotel.id}_${order}`,
    room,
    roomType,
    index: 0,
    preview: PREVIEW(pano.slug),
    hd: pano.hd ? HD(pano.slug) : null,
    startYaw: pano.startYaw ?? (seed + order * 47) % 360,
  });
  const scenes: TourScene[] = [];
  for (const r of hotel.rooms) {
    const options = HOTEL_ROOMS[r.type];
    scenes.push(scene(scenes.length, 'room', options[seed % options.length] ?? options[0]!, r.type));
  }
  scenes.push(scene(scenes.length, 'bathroom', { slug: 'en_suite', hd: true }));
  scenes.push(scene(scenes.length, 'balcony', { slug: 'cayley_interior', hd: true }));
  scenes.push(scene(scenes.length, 'lobby', FURNISHED.lobby[0]!));
  return scenes;
}
