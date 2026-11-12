import type { Hotel } from '@/types/domain';

/**
 * Демо-отели раздела «Гостям Ташкента». Названия, цены и адреса — примеры
 * (в приложении это помечено плашкой «Демо-версия»). Телефон ресепшена подставляет API.
 */

const photo = (id: string, width = 1200): string => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=72`;

const P = {
  exterior: ['photo-1566073771259-6a8506099945', 'photo-1542314831-068cd1dbfeeb', 'photo-1551882547-ff40c63fe5fa', 'photo-1520250497591-112f2f40a3f4', 'photo-1584132967334-10e028bd69f7', 'photo-1571896349842-33c89424de2d'],
  rooms: ['photo-1582719478250-c89cae4dc85b', 'photo-1611892440504-42a792e24d32', 'photo-1590490360182-c33d57733427', 'photo-1631049307264-da0ec9d70304', 'photo-1578683010236-d716f9a3f461', 'photo-1596394516093-501ba68a0ba6', 'photo-1618773928121-c32242e63f39'],
  lobby: ['photo-1564501049412-61c2a3083791', 'photo-1445019980597-93fa8acb246c', 'photo-1455587734955-081b22074882', 'photo-1549294413-26f195200c16'],
  extra: ['photo-1517840901100-8179e982acb7', 'photo-1563911302283-d2bc129e7570', 'photo-1540541338287-41700207dee6'],
};

const pick = (list: string[], i: number): string => list[i % list.length] ?? list[0]!;
const gallery = (i: number): string[] => [pick(P.exterior, i), pick(P.rooms, i), pick(P.lobby, i), pick(P.rooms, i + 3), pick(P.extra, i)].map((id) => photo(id));

type Seed = Omit<Hotel, 'phone' | 'images' | 'priceFrom'>;

const SEEDS: Seed[] = [
  {
    id: 'h_silk_garden',
    name: 'Silk Garden Hotel',
    stars: 5,
    rating: 4.8,
    reviewsCount: 412,
    district: 'yunusabad',
    address: 'ул. Амира Темура, 107',
    coords: { latitude: 41.3385, longitude: 69.2853 },
    amenities: ['wifi', 'breakfast', 'pool', 'spa', 'gym', 'restaurant', 'parking', 'airport'],
    rooms: [
      { id: 'std', type: 'standard', price: 140, maxGuests: 2, area: 28 },
      { id: 'dlx', type: 'deluxe', price: 190, maxGuests: 3, area: 36 },
      { id: 'ste', type: 'suite', price: 320, maxGuests: 4, area: 62 },
    ],
    checkInTime: '14:00',
    checkOutTime: '12:00',
  },
  {
    id: 'h_lazurit',
    name: 'Lazurit Boutique Hotel',
    stars: 4,
    rating: 4.7,
    reviewsCount: 238,
    district: 'mirabad',
    address: 'ул. Шахрисабз, 24',
    coords: { latitude: 41.2995, longitude: 69.2795 },
    amenities: ['wifi', 'breakfast', 'restaurant', 'parking', 'airport'],
    rooms: [
      { id: 'std', type: 'standard', price: 85, maxGuests: 2, area: 22 },
      { id: 'dlx', type: 'deluxe', price: 115, maxGuests: 3, area: 30 },
    ],
    checkInTime: '14:00',
    checkOutTime: '12:00',
  },
  {
    id: 'h_skyline',
    name: 'Skyline Suites',
    stars: 5,
    rating: 4.6,
    reviewsCount: 305,
    district: 'shaykhantahur',
    address: 'пр. Навои, 2',
    coords: { latitude: 41.3175, longitude: 69.2522 },
    amenities: ['wifi', 'breakfast', 'pool', 'gym', 'spa', 'restaurant', 'parking'],
    rooms: [
      { id: 'dlx', type: 'deluxe', price: 165, maxGuests: 2, area: 34 },
      { id: 'ste', type: 'suite', price: 280, maxGuests: 4, area: 70 },
    ],
    checkInTime: '15:00',
    checkOutTime: '12:00',
  },
  {
    id: 'h_anor',
    name: 'Anor Inn',
    stars: 3,
    rating: 4.5,
    reviewsCount: 187,
    district: 'chilanzar',
    address: 'ул. Бунёдкор, 15',
    coords: { latitude: 41.2852, longitude: 69.2109 },
    amenities: ['wifi', 'breakfast', 'parking'],
    rooms: [
      { id: 'std', type: 'standard', price: 45, maxGuests: 2, area: 18 },
      { id: 'dlx', type: 'deluxe', price: 65, maxGuests: 3, area: 24 },
    ],
    checkInTime: '13:00',
    checkOutTime: '11:00',
  },
  {
    id: 'h_saffron',
    name: 'Saffron Residence',
    stars: 4,
    rating: 4.6,
    reviewsCount: 156,
    district: 'mirzo-ulugbek',
    address: 'ул. Мирзо Улугбека, 72',
    coords: { latitude: 41.3291, longitude: 69.3349 },
    amenities: ['wifi', 'breakfast', 'gym', 'restaurant', 'parking'],
    rooms: [
      { id: 'std', type: 'standard', price: 70, maxGuests: 2, area: 24 },
      { id: 'ste', type: 'suite', price: 150, maxGuests: 4, area: 55 },
    ],
    checkInTime: '14:00',
    checkOutTime: '12:00',
  },
  {
    id: 'h_orient_pearl',
    name: 'Orient Pearl Hotel',
    stars: 4,
    rating: 4.4,
    reviewsCount: 129,
    district: 'yakkasaray',
    address: 'ул. Бабура, 40',
    coords: { latitude: 41.2915, longitude: 69.2598 },
    amenities: ['wifi', 'breakfast', 'pool', 'restaurant', 'airport'],
    rooms: [
      { id: 'std', type: 'standard', price: 75, maxGuests: 2, area: 23 },
      { id: 'dlx', type: 'deluxe', price: 105, maxGuests: 3, area: 31 },
      { id: 'ste', type: 'suite', price: 190, maxGuests: 4, area: 58 },
    ],
    checkInTime: '14:00',
    checkOutTime: '12:00',
  },
];

export function seedHotels(receptionPhone: string): Hotel[] {
  return SEEDS.map((seed, i) => ({
    ...seed,
    phone: receptionPhone,
    images: gallery(i),
    priceFrom: Math.min(...seed.rooms.map((r) => r.price)),
  }));
}
