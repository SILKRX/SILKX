import { districtCenter } from '@/constants/districts';
import { seededRandom } from '@/lib/id';
import type {
  ActivityLogEntry,
  AmenityId,
  AppNotification,
  ChatMessage,
  ComplexClass,
  ComplexUnit,
  Coordinates,
  DealType,
  DistrictId,
  InfrastructureItem,
  ListingStatus,
  PromotionTier,
  PropertyType,
  RejectionReason,
  Renovation,
  Role,
  SellerKind,
  UnitStatus,
  Viewing,
} from '@/types/domain';

import { hashPassword } from './crypto';
import { galleryFor, pickImage } from './images';
import {
  type ComplexRecord,
  type ConversationRecord,
  MOCK_DB_VERSION,
  type MockDatabase,
  type PropertyRecord,
  type UserRecord,
} from './types';

export const DEMO_PASSWORD = 'Silkx2026!';

export const DEMO_ACCOUNTS: readonly { role: Role; email: string }[] = [
  { role: 'buyer', email: 'buyer@silkx.uz' },
  { role: 'seller', email: 'developer@silkx.uz' },
  { role: 'admin', email: 'admin@silkx.uz' },
];

export const SUPPORT_USER_ID = 'u_support';

const DAY = 86_400_000;
const HOUR = 3_600_000;

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

interface UserSeed {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  company?: string;
  sellerKind?: SellerKind;
  verified?: boolean;
  rating?: number;
  reviewsCount?: number;
  daysAgo: number;
  banned?: boolean;
  loginable?: boolean;
}

const USERS: UserSeed[] = [
  { id: 'u_buyer', name: 'Мадина Юсупова', email: 'buyer@silkx.uz', phone: '+998901234567', role: 'buyer', daysAgo: 210, loginable: true },
  {
    id: 'u_seller',
    name: 'Тимур Рахимов',
    email: 'developer@silkx.uz',
    phone: '+998935551020',
    role: 'seller',
    company: 'Silk Road Development',
    sellerKind: 'developer',
    verified: true,
    rating: 4.8,
    reviewsCount: 214,
    daysAgo: 1650,
    loginable: true,
  },
  { id: 'u_admin', name: 'Администратор SILKX', email: 'admin@silkx.uz', phone: '+998712000000', role: 'admin', daysAgo: 900, loginable: true },
  { id: SUPPORT_USER_ID, name: 'Поддержка SILKX', email: 'support@silkx.uz', phone: '+998712000001', role: 'admin', verified: true, daysAgo: 900 },
  { id: 's_crescent', name: 'Golden Crescent Development', email: 'sales@goldencrescent.uz', phone: '+998977001122', role: 'seller', company: 'Golden Crescent Development', sellerKind: 'developer', verified: true, rating: 4.9, reviewsCount: 167, daysAgo: 1400 },
  { id: 's_navoi', name: 'Navoi Park Development', email: 'info@navoipark.uz', phone: '+998909004455', role: 'seller', company: 'Navoi Park Development', sellerKind: 'developer', verified: true, rating: 4.6, reviewsCount: 132, daysAgo: 1100 },
  { id: 's_oasis', name: 'Oasis Group', email: 'hello@oasisgroup.uz', phone: '+998950707070', role: 'seller', company: 'Oasis Group', sellerKind: 'developer', verified: true, rating: 4.7, reviewsCount: 98, daysAgo: 980 },
  { id: 's_prime', name: 'Prime Estate', email: 'agent@primeestate.uz', phone: '+998911112233', role: 'seller', company: 'Prime Estate', sellerKind: 'agency', verified: true, rating: 4.5, reviewsCount: 341, daysAgo: 1900 },
  { id: 's_owner1', name: 'Азиз Каримов', email: 'aziz.karimov@mail.uz', phone: '+998933334455', role: 'seller', sellerKind: 'owner', verified: false, rating: 4.4, reviewsCount: 12, daysAgo: 400 },
  { id: 's_owner2', name: 'Нигора Алиева', email: 'nigora.alieva@mail.uz', phone: '+998946667788', role: 'seller', sellerKind: 'owner', verified: true, rating: 4.9, reviewsCount: 27, daysAgo: 620 },
  { id: 'u_b2', name: 'Шахзод Тошматов', email: 'shahzod@mail.uz', phone: '+998901112244', role: 'buyer', daysAgo: 90 },
  { id: 'u_b3', name: 'Камила Ахмедова', email: 'kamila.a@mail.uz', phone: '+998977773311', role: 'buyer', daysAgo: 45 },
  { id: 'u_b4', name: 'Бобур Насыров', email: 'bobur.n@mail.uz', phone: '+998935550099', role: 'buyer', daysAgo: 160, banned: true },
  { id: 'u_b5', name: 'Дилноза Хамидова', email: 'dilnoza.h@mail.uz', phone: '+998998887766', role: 'buyer', daysAgo: 12 },
  { id: 'u_b6', name: 'Рустам Мирзаев', email: 'rustam.m@mail.uz', phone: '+998946543210', role: 'buyer', daysAgo: 300 },
  { id: 'u_b7', name: 'Лола Каримова', email: 'lola.k@mail.uz', phone: '+998909876543', role: 'buyer', daysAgo: 7 },
];

interface ComplexSeed {
  id: string;
  name: string;
  developerId: string;
  district: DistrictId;
  address: string;
  coords: Coordinates;
  class: ComplexClass;
  completionMonthsAhead: number;
  pricePerM2: number;
  blocks: string[];
  floors: number;
  layout: number[];
  infrastructure: InfrastructureItem[];
  imageSeed: number;
  description: string;
}

const COMPLEXES: ComplexSeed[] = [
  {
    id: 'c_silk_garden',
    name: 'Silk Garden',
    developerId: 'u_seller',
    district: 'mirzo-ulugbek',
    address: 'ул. Мирзо Улугбека, 56',
    coords: { latitude: 41.3402, longitude: 69.3311 },
    class: 'business',
    completionMonthsAhead: 14,
    pricePerM2: 1380,
    blocks: ['A', 'B'],
    floors: 12,
    layout: [1, 2, 3, 2],
    infrastructure: ['school', 'kindergarten', 'parking', 'security', 'park', 'fitness'],
    imageSeed: 0,
    description:
      'Silk Garden — жилой комплекс бизнес-класса в зелёной части Мирзо-Улугбекского района. Закрытый двор без машин, ландшафтный парк, подземный паркинг и собственная школа. Монолитно-каркасная технология, панорамное остекление и потолки 3,1 м.',
  },
  {
    id: 'c_crescent',
    name: 'Golden Crescent',
    developerId: 's_crescent',
    district: 'mirabad',
    address: 'ул. Шахрисабз, 12',
    coords: { latitude: 41.2978, longitude: 69.2834 },
    class: 'premium',
    completionMonthsAhead: 2,
    pricePerM2: 2240,
    blocks: ['A'],
    floors: 16,
    layout: [2, 3, 4, 3],
    infrastructure: ['security', 'parking', 'fitness', 'shop', 'metro', 'park'],
    imageSeed: 1,
    description:
      'Golden Crescent — премиальная резиденция в историческом центре Ташкента. Лобби с консьерж-сервисом, SPA и фитнес на крыше, виды на парк Амира Темура. Отделка от итальянских дизайнеров, умный дом в каждой квартире.',
  },
  {
    id: 'c_navoi',
    name: 'Navoi Park Residence',
    developerId: 's_navoi',
    district: 'yunusabad',
    address: 'ул. Амира Темура, 108',
    coords: { latitude: 41.3621, longitude: 69.2902 },
    class: 'comfort',
    completionMonthsAhead: 9,
    pricePerM2: 980,
    blocks: ['1', '2', '3'],
    floors: 9,
    layout: [1, 2, 2, 3],
    infrastructure: ['school', 'kindergarten', 'park', 'shop', 'metro'],
    imageSeed: 2,
    description:
      'Navoi Park Residence — комфорт-класс для семей в Юнусабаде: в 7 минутах метро, рядом школы и сады. Рассрочка от застройщика 0% до 36 месяцев, сдача очередями.',
  },
  {
    id: 'c_oasis',
    name: 'Oasis Heights',
    developerId: 's_oasis',
    district: 'yakkasaray',
    address: 'ул. Бобура, 34',
    coords: { latitude: 41.2922, longitude: 69.2551 },
    class: 'premium',
    completionMonthsAhead: 26,
    pricePerM2: 2450,
    blocks: ['A', 'B'],
    floors: 14,
    layout: [2, 3, 3, 4],
    infrastructure: ['security', 'parking', 'fitness', 'park', 'shop'],
    imageSeed: 3,
    description:
      'Oasis Heights — две башни у парка Бабура: тихий центр, приватный сад на стилобате, бассейн и детский клуб. Клубный формат — не более 6 квартир на этаже.',
  },
];

function buildUnits(seed: ComplexSeed, rand: () => number): ComplexUnit[] {
  const units: ComplexUnit[] = [];
  const areaByRooms: Record<number, [number, number]> = {
    1: [40, 48],
    2: [60, 74],
    3: [84, 100],
    4: [115, 138],
  };
  for (const block of seed.blocks) {
    for (let floor = 2; floor <= seed.floors; floor += 1) {
      seed.layout.forEach((rooms, index) => {
        const [minArea, maxArea] = areaByRooms[rooms] ?? [60, 70];
        const area = Math.round((minArea + rand() * (maxArea - minArea)) * 10) / 10;
        const floorFactor = 1 + (floor / seed.floors) * 0.12;
        const price = Math.round((area * seed.pricePerM2 * floorFactor) / 100) * 100;
        const soldChance = 0.55 - (floor / seed.floors) * 0.25;
        const r = rand();
        const status: UnitStatus = r < soldChance ? 'sold' : r < soldChance + 0.1 ? 'reserved' : 'available';
        units.push({
          id: `${seed.id}_${block}_${floor}_${index}`,
          block,
          floor,
          number: `${floor}${String(index + 1).padStart(2, '0')}`,
          rooms,
          area,
          price,
          status,
        });
      });
    }
  }
  return units;
}

interface PropertySeed {
  deal: DealType;
  type: PropertyType;
  district: DistrictId;
  rooms: number;
  area: number;
  floor: number;
  floors: number;
  price: number;
  renovation: Renovation;
  seller: string;
  address: string;
  amenities: AmenityId[];
  daysAgo: number;
  complex?: string;
  hot?: boolean;
  premium?: boolean;
  installment?: boolean;
  mortgage?: boolean;
  furnished?: boolean;
  prev?: number;
  promo?: PromotionTier;
  status?: ListingStatus;
  rejection?: RejectionReason;
  completionYear?: number;
}

const A = {
  base: ['elevator', 'security', 'parking'] as AmenityId[],
  premium: ['elevator', 'security', 'parking', 'panoramic', 'concierge', 'gym', 'conditioner'] as AmenityId[],
  rent: ['wifi', 'conditioner', 'furniture', 'appliances', 'elevator'] as AmenityId[],
  family: ['elevator', 'security', 'playground', 'parking', 'balcony'] as AmenityId[],
};

const PROPERTIES: PropertySeed[] = [
  // ——— Продажа: новостройки
  { deal: 'sale', type: 'apartment', district: 'mirzo-ulugbek', rooms: 2, area: 68, floor: 9, floors: 12, price: 98000, renovation: 'euro', seller: 'u_seller', complex: 'c_silk_garden', address: 'ул. Мирзо Улугбека, 56', amenities: [...A.family, 'panoramic'], daysAgo: 3, hot: true, installment: true, mortgage: true, promo: 'vip', completionYear: 2027 },
  { deal: 'sale', type: 'apartment', district: 'mirzo-ulugbek', rooms: 1, area: 45, floor: 4, floors: 12, price: 64000, renovation: 'whitebox', seller: 'u_seller', complex: 'c_silk_garden', address: 'ул. Мирзо Улугбека, 56', amenities: A.family, daysAgo: 9, installment: true, mortgage: true, completionYear: 2027 },
  { deal: 'sale', type: 'apartment', district: 'mirzo-ulugbek', rooms: 3, area: 94, floor: 11, floors: 12, price: 139000, renovation: 'designer', seller: 'u_seller', complex: 'c_silk_garden', address: 'ул. Мирзо Улугбека, 56', amenities: [...A.premium, 'balcony'], daysAgo: 15, premium: true, installment: true, completionYear: 2027 },
  { deal: 'sale', type: 'apartment', district: 'mirabad', rooms: 3, area: 112, floor: 14, floors: 16, price: 268000, renovation: 'designer', seller: 's_crescent', complex: 'c_crescent', address: 'ул. Шахрисабз, 12', amenities: A.premium, daysAgo: 2, hot: true, premium: true, promo: 'gold', completionYear: 2026 },
  { deal: 'sale', type: 'apartment', district: 'mirabad', rooms: 2, area: 78, floor: 7, floors: 16, price: 176000, renovation: 'euro', seller: 's_crescent', complex: 'c_crescent', address: 'ул. Шахрисабз, 12', amenities: A.premium, daysAgo: 20, premium: true, mortgage: true, completionYear: 2026 },
  { deal: 'sale', type: 'apartment', district: 'mirabad', rooms: 4, area: 156, floor: 16, floors: 16, price: 395000, renovation: 'designer', seller: 's_crescent', complex: 'c_crescent', address: 'ул. Шахрисабз, 12', amenities: [...A.premium, 'balcony'], daysAgo: 31, premium: true, completionYear: 2026 },
  { deal: 'sale', type: 'apartment', district: 'yunusabad', rooms: 1, area: 39, floor: 3, floors: 9, price: 41000, renovation: 'shell', seller: 's_navoi', complex: 'c_navoi', address: 'ул. Амира Темура, 108', amenities: A.family, daysAgo: 1, hot: true, installment: true, mortgage: true, completionYear: 2027 },
  { deal: 'sale', type: 'apartment', district: 'yunusabad', rooms: 2, area: 61, floor: 6, floors: 9, price: 59500, prev: 63000, renovation: 'whitebox', seller: 's_navoi', complex: 'c_navoi', address: 'ул. Амира Темура, 108', amenities: A.family, daysAgo: 12, hot: true, installment: true, mortgage: true, completionYear: 2027 },
  { deal: 'sale', type: 'apartment', district: 'yunusabad', rooms: 3, area: 82, floor: 8, floors: 9, price: 78000, renovation: 'euro', seller: 's_navoi', complex: 'c_navoi', address: 'ул. Амира Темура, 108', amenities: [...A.family, 'conditioner'], daysAgo: 25, installment: true, mortgage: true, completionYear: 2027 },
  { deal: 'sale', type: 'apartment', district: 'yakkasaray', rooms: 2, area: 74, floor: 10, floors: 14, price: 189000, renovation: 'designer', seller: 's_oasis', complex: 'c_oasis', address: 'ул. Бобура, 34', amenities: A.premium, daysAgo: 6, premium: true, installment: true, completionYear: 2028 },
  { deal: 'sale', type: 'apartment', district: 'yakkasaray', rooms: 3, area: 104, floor: 12, floors: 14, price: 262000, renovation: 'designer', seller: 's_oasis', complex: 'c_oasis', address: 'ул. Бобура, 34', amenities: [...A.premium, 'balcony'], daysAgo: 4, hot: true, premium: true, completionYear: 2028 },
  // ——— Продажа: вторичка, дома, коммерция
  { deal: 'sale', type: 'apartment', district: 'chilanzar', rooms: 0, area: 28, floor: 5, floors: 9, price: 32000, prev: 34500, renovation: 'euro', seller: 's_owner1', address: 'ул. Бунёдкор, 21', amenities: ['elevator', 'conditioner', 'furniture'], daysAgo: 5, hot: true, mortgage: true },
  { deal: 'sale', type: 'apartment', district: 'chilanzar', rooms: 2, area: 56, floor: 3, floors: 9, price: 48000, renovation: 'euro', seller: 's_owner1', address: 'Чиланзар-9, д. 14', amenities: ['elevator', 'balcony', 'conditioner'], daysAgo: 18, mortgage: true },
  { deal: 'sale', type: 'apartment', district: 'yakkasaray', rooms: 3, area: 76, floor: 4, floors: 5, price: 96000, renovation: 'euro', seller: 's_prime', address: 'ул. Шота Руставели, 41', amenities: ['balcony', 'conditioner', 'parking'], daysAgo: 22, mortgage: true },
  { deal: 'sale', type: 'house', district: 'mirzo-ulugbek', rooms: 5, area: 260, floor: 2, floors: 2, price: 420000, renovation: 'designer', seller: 's_prime', address: 'ул. Буюк Ипак Йули, 19', amenities: ['parking', 'security', 'conditioner', 'panoramic', 'wifi'], daysAgo: 11, premium: true },
  { deal: 'sale', type: 'townhouse', district: 'yashnabad', rooms: 4, area: 180, floor: 3, floors: 3, price: 235000, renovation: 'euro', seller: 's_prime', address: 'ул. Махтумкули, 77', amenities: ['parking', 'security', 'playground', 'conditioner'], daysAgo: 27, installment: true },
  { deal: 'sale', type: 'house', district: 'sergeli', rooms: 4, area: 210, floor: 2, floors: 2, price: 185000, renovation: 'euro', seller: 's_owner2', address: 'Сергели-5, ул. Янги Сергели, 9', amenities: ['parking', 'conditioner', 'balcony'], daysAgo: 40, mortgage: true },
  { deal: 'sale', type: 'commercial', district: 'mirabad', rooms: 3, area: 140, floor: 1, floors: 12, price: 310000, renovation: 'euro', seller: 's_prime', address: 'ул. Афросиаб, 4', amenities: ['parking', 'security', 'conditioner', 'wifi'], daysAgo: 14 },
  { deal: 'sale', type: 'apartment', district: 'uchtepa', rooms: 2, area: 64, floor: 7, floors: 9, price: 54000, renovation: 'euro', seller: 's_prime', address: 'ул. Лутфий, 15', amenities: ['elevator', 'balcony', 'playground'], daysAgo: 33, mortgage: true },
  { deal: 'sale', type: 'apartment', district: 'almazar', rooms: 1, area: 42, floor: 2, floors: 9, price: 38500, renovation: 'whitebox', seller: 's_owner1', address: 'ул. Шифокорлар, 7', amenities: ['elevator', 'parking'], daysAgo: 8, installment: true },
  { deal: 'sale', type: 'apartment', district: 'shaykhantahur', rooms: 3, area: 88, floor: 6, floors: 9, price: 118000, renovation: 'designer', seller: 's_prime', address: 'ул. Навои, 30', amenities: ['elevator', 'conditioner', 'panoramic', 'security'], daysAgo: 16, premium: true, mortgage: true },
  { deal: 'sale', type: 'apartment', district: 'bektemir', rooms: 2, area: 70, floor: 5, floors: 9, price: 49000, renovation: 'shell', seller: 's_owner1', address: 'ул. Хусайн Байкаро, 52', amenities: ['elevator', 'playground'], daysAgo: 29, installment: true },
  { deal: 'sale', type: 'apartment', district: 'yangihayot', rooms: 2, area: 60, floor: 4, floors: 9, price: 46000, renovation: 'whitebox', seller: 's_navoi', address: 'ул. Янгихаёт, 3', amenities: A.family, daysAgo: 10, installment: true, mortgage: true },
  // ——— Аренда
  { deal: 'rent', type: 'apartment', district: 'yunusabad', rooms: 2, area: 64, floor: 6, floors: 9, price: 650, renovation: 'euro', seller: 's_prime', address: 'Юнусабад-4, д. 11', amenities: A.rent, daysAgo: 2, hot: true, furnished: true },
  { deal: 'rent', type: 'apartment', district: 'mirzo-ulugbek', rooms: 0, area: 30, floor: 3, floors: 9, price: 380, renovation: 'euro', seller: 's_owner2', address: 'ул. Университетская, 2', amenities: ['wifi', 'conditioner', 'furniture', 'appliances'], daysAgo: 1, hot: true, furnished: true },
  { deal: 'rent', type: 'apartment', district: 'shaykhantahur', rooms: 4, area: 140, floor: 5, floors: 7, price: 1500, renovation: 'designer', seller: 's_prime', address: 'ул. Навои, 18', amenities: [...A.rent, 'parking', 'panoramic', 'security'], daysAgo: 6, premium: true, furnished: true },
  { deal: 'rent', type: 'apartment', district: 'chilanzar', rooms: 3, area: 82, floor: 4, floors: 9, price: 700, renovation: 'euro', seller: 's_owner1', address: 'ул. Бунёдкор, 47', amenities: [...A.rent, 'playground'], daysAgo: 9, furnished: true },
  { deal: 'rent', type: 'apartment', district: 'mirabad', rooms: 1, area: 44, floor: 8, floors: 12, price: 520, renovation: 'euro', seller: 's_prime', address: 'ул. Афросиаб, 22', amenities: A.rent, daysAgo: 4, furnished: true },
  { deal: 'rent', type: 'apartment', district: 'mirabad', rooms: 2, area: 72, floor: 11, floors: 16, price: 1100, renovation: 'designer', seller: 's_crescent', complex: 'c_crescent', address: 'ул. Шахрисабз, 12', amenities: [...A.rent, 'concierge', 'gym', 'panoramic'], daysAgo: 3, hot: true, premium: true, furnished: true },
  { deal: 'rent', type: 'house', district: 'yakkasaray', rooms: 5, area: 300, floor: 2, floors: 2, price: 2800, renovation: 'designer', seller: 's_prime', address: 'ул. Бобура, 71', amenities: [...A.rent, 'parking', 'security', 'panoramic'], daysAgo: 13, premium: true, furnished: true },
  { deal: 'rent', type: 'apartment', district: 'sergeli', rooms: 2, area: 58, floor: 2, floors: 9, price: 420, renovation: 'euro', seller: 's_owner2', address: 'Сергели-8, д. 23', amenities: ['wifi', 'conditioner', 'furniture'], daysAgo: 7, furnished: true },
  { deal: 'rent', type: 'commercial', district: 'yunusabad', rooms: 2, area: 80, floor: 1, floors: 9, price: 1200, renovation: 'euro', seller: 's_prime', address: 'ул. Осиё, 25', amenities: ['wifi', 'conditioner', 'parking'], daysAgo: 21 },
  { deal: 'rent', type: 'apartment', district: 'almazar', rooms: 1, area: 40, floor: 6, floors: 9, price: 350, renovation: 'euro', seller: 's_owner1', address: 'ул. Шифокорлар, 19', amenities: ['wifi', 'furniture', 'appliances'], daysAgo: 5, furnished: true },
  { deal: 'rent', type: 'apartment', district: 'mirzo-ulugbek', rooms: 3, area: 95, floor: 7, floors: 12, price: 950, renovation: 'euro', seller: 's_prime', address: 'ул. Буюк Ипак Йули, 77', amenities: [...A.rent, 'parking', 'playground'], daysAgo: 17, furnished: true },
  // ——— На модерации / отклонённые
  { deal: 'sale', type: 'apartment', district: 'mirzo-ulugbek', rooms: 2, area: 66, floor: 6, floors: 12, price: 92000, renovation: 'euro', seller: 'u_seller', complex: 'c_silk_garden', address: 'ул. Мирзо Улугбека, 56', amenities: A.family, daysAgo: 0, installment: true, status: 'pending', completionYear: 2027 },
  { deal: 'sale', type: 'apartment', district: 'chilanzar', rooms: 1, area: 38, floor: 2, floors: 5, price: 29000, renovation: 'whitebox', seller: 's_owner1', address: 'Чиланзар-12, д. 5', amenities: ['balcony'], daysAgo: 0, status: 'pending' },
  { deal: 'rent', type: 'apartment', district: 'yunusabad', rooms: 3, area: 90, floor: 5, floors: 9, price: 1000, renovation: 'designer', seller: 's_prime', address: 'Юнусабад-11, д. 3', amenities: A.rent, daysAgo: 1, status: 'pending', furnished: true },
  { deal: 'sale', type: 'apartment', district: 'mirzo-ulugbek', rooms: 1, area: 41, floor: 3, floors: 12, price: 55000, renovation: 'whitebox', seller: 'u_seller', complex: 'c_silk_garden', address: 'ул. Мирзо Улугбека, 56', amenities: A.family, daysAgo: 3, status: 'rejected', rejection: 'bad_photos', completionYear: 2027 },
];

const DESCRIPTION_PARTS = {
  intro: {
    apartment: [
      'Светлая квартира с продуманной планировкой и большой кухней-гостиной.',
      'Уютная квартира в доме с закрытой территорией и современным лобби.',
      'Просторная квартира с панорамными окнами и видом на город.',
    ],
    house: ['Двухэтажный дом с ухоженным участком и террасой для отдыха.'],
    townhouse: ['Таунхаус в малоэтажном квартале: свой вход, терраса и парковка.'],
    commercial: ['Помещение свободного назначения с отдельным входом и витринными окнами.'],
  },
  details: [
    'Окна выходят во двор — тихо даже днём.',
    'Высокие потолки, качественные стеклопакеты и тёплые полы.',
    'Все комнаты изолированы, есть место для гардеробной.',
    'Санузел раздельный, кухня оборудована встроенной техникой.',
  ],
  infra: [
    'Рядом школы, детские сады, супермаркет и остановки транспорта.',
    'В пешей доступности метро, парк и торговый центр.',
    'Развитая инфраструктура: кафе, фитнес, аптеки и клиники рядом.',
  ],
  rent: [
    'Квартира полностью меблирована — можно заезжать сразу.',
    'Коммунальные услуги оплачиваются по счётчикам. Залог — одна месячная плата.',
  ],
  sale: ['Документы готовы к сделке, возможна ипотека.', 'Быстрый выход на сделку, один собственник.'],
} as const;

function pick<T>(list: readonly T[], index: number): T {
  return list[Math.abs(index) % list.length] as T;
}

function buildDescription(seed: PropertySeed, index: number, complexName: string | null): string {
  const introList = DESCRIPTION_PARTS.intro[seed.type];
  const parts: string[] = [pick(introList, index)];
  if (complexName) parts.push(`Жилой комплекс «${complexName}» — сдача по графику, застройщик проверен SILKX.`);
  parts.push(pick(DESCRIPTION_PARTS.details, index), pick(DESCRIPTION_PARTS.infra, index + 1));
  parts.push(seed.deal === 'rent' ? pick(DESCRIPTION_PARTS.rent, index) : pick(DESCRIPTION_PARTS.sale, index));
  return parts.join(' ');
}

function buildTitle(seed: PropertySeed): string {
  const types: Record<PropertyType, string> = {
    apartment: 'квартира',
    house: 'Дом',
    townhouse: 'Таунхаус',
    commercial: 'Коммерческое помещение',
  };
  if (seed.type === 'apartment') {
    return seed.rooms === 0 ? `Студия, ${seed.area} м²` : `${seed.rooms}-комн. ${types.apartment}, ${seed.area} м²`;
  }
  return `${types[seed.type]}, ${seed.area} м²`;
}

function jitter(center: Coordinates, rand: () => number, spread = 0.011): Coordinates {
  return {
    latitude: Math.round((center.latitude + (rand() - 0.5) * spread * 2) * 1e6) / 1e6,
    longitude: Math.round((center.longitude + (rand() - 0.5) * spread * 2) * 1e6) / 1e6,
  };
}

function propertyId(index: number): string {
  return `p${index + 1}`;
}

export function createSeed(nowMs: number = Date.now()): MockDatabase {
  const rand = seededRandom(20261017);
  const demoHash = hashPassword(DEMO_PASSWORD);

  const users: UserRecord[] = USERS.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    avatar: null,
    createdAt: iso(nowMs - u.daysAgo * DAY),
    company: u.company ?? null,
    passwordHash: u.loginable ? demoHash : hashPassword(`locked-${u.id}-${Math.round(rand() * 1e9)}`),
    banned: u.banned ?? false,
    lastActiveAt: iso(nowMs - Math.round(rand() * 72) * HOUR),
    sellerKind: u.sellerKind ?? null,
    verified: u.verified ?? false,
    rating: u.rating ?? 0,
    reviewsCount: u.reviewsCount ?? 0,
  }));

  const complexes: ComplexRecord[] = COMPLEXES.map((c) => {
    const units = buildUnits(c, rand);
    const minPrice = units.reduce((min, u) => Math.min(min, u.price), Number.POSITIVE_INFINITY);
    const completion = new Date(nowMs);
    completion.setMonth(completion.getMonth() + c.completionMonthsAhead, 1);
    return {
      id: c.id,
      name: c.name,
      developerId: c.developerId,
      district: c.district,
      address: c.address,
      coords: c.coords,
      class: c.class,
      completion: completion.toISOString(),
      priceFrom: Number.isFinite(minPrice) ? minPrice : 0,
      pricePerM2From: c.pricePerM2,
      heroImages: [pickImage('buildings', c.imageSeed * 2), pickImage('buildings', c.imageSeed * 2 + 1), pickImage('living', c.imageSeed + 7)],
      renders: [pickImage('buildings', c.imageSeed + 4), pickImage('living', c.imageSeed + 11), pickImage('kitchens', c.imageSeed + 1), pickImage('bedrooms', c.imageSeed + 2)],
      masterPlan: pickImage('buildings', 8),
      description: c.description,
      infrastructure: c.infrastructure,
      blocks: c.blocks,
      floors: c.floors,
      units,
      installment: c.class !== 'premium' || c.id === 'c_oasis',
    };
  });

  const complexName = (id: string | undefined): string | null => complexes.find((c) => c.id === id)?.name ?? null;
  const complexCoords = (id: string | undefined): Coordinates | null => complexes.find((c) => c.id === id)?.coords ?? null;

  const properties: PropertyRecord[] = PROPERTIES.map((s, index) => {
    const created = nowMs - s.daysAgo * DAY - Math.round(rand() * 20) * HOUR;
    const kind = s.type === 'commercial' ? 'commercial' : s.type === 'apartment' ? 'apartment' : 'house';
    const coords = complexCoords(s.complex) ?? jitter(districtCenter(s.district), rand);
    return {
      id: propertyId(index),
      dealType: s.deal,
      type: s.type,
      title: buildTitle(s),
      description: buildDescription(s, index, complexName(s.complex)),
      price: s.price,
      currency: 'USD',
      area: s.area,
      rooms: s.rooms,
      floor: s.floor,
      floorsTotal: s.floors,
      district: s.district,
      address: s.address,
      coords: s.complex ? jitter(coords, rand, 0.0012) : coords,
      images: galleryFor(kind, index * 3 + 1),
      amenities: s.amenities,
      renovation: s.renovation,
      furnished: s.furnished ?? false,
      installment: s.installment ?? false,
      mortgage: s.mortgage ?? false,
      complexId: s.complex ?? null,
      sellerId: s.seller,
      status: s.status ?? 'active',
      promotion: s.promo ?? null,
      isHot: s.hot ?? false,
      isPremium: s.premium ?? false,
      createdAt: iso(created),
      updatedAt: iso(created),
      views: 140 + Math.round(rand() * 3200),
      favoritesCount: 4 + Math.round(rand() * 180),
      calls: 2 + Math.round(rand() * 60),
      previousPrice: s.prev ?? null,
      completionYear: s.completionYear ?? null,
      rejectionReason: s.rejection ?? null,
    };
  });

  const msg = (
    id: string,
    conversationId: string,
    senderId: string,
    text: string,
    minutesAgo: number,
    status: ChatMessage['status'] = 'read',
    attachments: ChatMessage['attachments'] = [],
  ): ChatMessage => ({ id, conversationId, senderId, text, attachments, createdAt: iso(nowMs - minutesAgo * 60_000), status });

  const messages: ChatMessage[] = [
    msg('m1', 'conv_1', 'u_buyer', 'Здравствуйте! Квартира ещё актуальна?', 2900),
    msg('m2', 'conv_1', 'u_seller', 'Добрый день, Мадина! Да, актуальна. Можем показать в любой день с 10:00 до 19:00.', 2880),
    msg('m3', 'conv_1', 'u_buyer', 'Отлично. А рассрочка на какой срок?', 1500),
    msg('m4', 'conv_1', 'u_seller', 'Рассрочка до 24 месяцев, первый взнос от 30%. Отправляю расчёт.', 32, 'delivered', [
      { id: 'att1', kind: 'file', uri: 'mock://files/installment.pdf', name: 'Расчёт_рассрочки.pdf', size: 248_000, mimeType: 'application/pdf' },
    ]),
    msg('m5', 'conv_2', SUPPORT_USER_ID, 'Здравствуйте! Это поддержка SILKX. Подскажем по любому объекту, проверке документов или сделке.', 9000),
    msg('m6', 'conv_3', 's_crescent', 'Мадина, по вашему запросу: в Golden Crescent осталось 3 квартиры с видом на парк. Пришлю планировки?', 260, 'delivered'),
    msg('m7', 'conv_4', 'u_b2', 'Добрый вечер! Можно посмотреть 3-комнатную в субботу утром?', 70, 'delivered'),
  ];

  const conversations: ConversationRecord[] = [
    { id: 'conv_1', propertyId: 'p1', participantIds: ['u_buyer', 'u_seller'], updatedAt: iso(nowMs - 32 * 60_000), isSupport: false, unread: { u_buyer: 1, u_seller: 0 } },
    { id: 'conv_2', propertyId: null, participantIds: ['u_buyer', SUPPORT_USER_ID], updatedAt: iso(nowMs - 9000 * 60_000), isSupport: true, unread: { u_buyer: 0 } },
    { id: 'conv_3', propertyId: 'p4', participantIds: ['u_buyer', 's_crescent'], updatedAt: iso(nowMs - 260 * 60_000), isSupport: false, unread: { u_buyer: 1 } },
    { id: 'conv_4', propertyId: 'p3', participantIds: ['u_b2', 'u_seller'], updatedAt: iso(nowMs - 70 * 60_000), isSupport: false, unread: { u_seller: 1 } },
  ];

  const note = (
    id: string,
    userId: string,
    kind: AppNotification['kind'],
    title: string,
    body: string,
    minutesAgo: number,
    read: boolean,
    extra: Partial<Pick<AppNotification, 'propertyId' | 'conversationId'>> = {},
  ): AppNotification => ({
    id,
    userId,
    kind,
    title,
    body,
    createdAt: iso(nowMs - minutesAgo * 60_000),
    read,
    propertyId: extra.propertyId ?? null,
    conversationId: extra.conversationId ?? null,
  });

  const notifications: AppNotification[] = [
    note('n1', 'u_buyer', 'message', 'Новое сообщение', 'Silk Road Development: Рассрочка до 24 месяцев, первый взнос от 30%…', 32, false, { conversationId: 'conv_1' }),
    note('n2', 'u_buyer', 'price_drop', 'Цена снижена на 6%', '2-комн. квартира в Navoi Park Residence теперь $59 500', 180, false, { propertyId: 'p8' }),
    note('n3', 'u_buyer', 'new_match', 'Новые объекты по вашим фильтрам', '3 новые квартиры в Мирзо-Улугбекском районе', 1440, false),
    note('n4', 'u_buyer', 'viewing_reminder', 'Напоминание о показе', 'Завтра в 15:00 — Silk Garden, 2-комн. квартира', 1260, true, { propertyId: 'p1' }),
    note('n5', 'u_buyer', 'system', 'Добро пожаловать в SILKX', 'Сохраняйте объекты в избранное — сообщим, когда цена снизится.', 10080, true),
    note('n6', 'u_seller', 'viewing_request', 'Новая заявка на просмотр', 'Мадина Юсупова записалась на завтра, 15:00', 120, false, { propertyId: 'p1' }),
    note('n7', 'u_seller', 'message', 'Новое сообщение', 'Шахзод Тошматов: Можно посмотреть 3-комнатную в субботу утром?', 70, false, { conversationId: 'conv_4' }),
    note('n8', 'u_seller', 'moderation_approved', 'Объявление прошло модерацию', '3-комн. квартира, 94 м² опубликована в каталоге', 1500, true, { propertyId: 'p3' }),
    note('n9', 'u_seller', 'moderation_rejected', 'Объявление отклонено', 'Причина: плохие фото. Загрузите качественные снимки и отправьте снова.', 2900, true, { propertyId: 'p38' }),
    note('n10', 'u_admin', 'system', 'Объявления ждут модерации', '3 новых объявления в очереди проверки', 45, false),
  ];

  const tomorrow = new Date(nowMs + DAY);
  tomorrow.setHours(15, 0, 0, 0);
  const pastViewing = new Date(nowMs - 5 * DAY);
  pastViewing.setHours(11, 0, 0, 0);

  const viewings: Viewing[] = [
    { id: 'v1', propertyId: 'p1', buyerId: 'u_buyer', sellerId: 'u_seller', start: tomorrow.toISOString(), durationMin: 60, status: 'scheduled', note: 'Интересует паркинг', createdAt: iso(nowMs - 2 * HOUR) },
    { id: 'v2', propertyId: 'p12', buyerId: 'u_buyer', sellerId: 's_owner1', start: pastViewing.toISOString(), durationMin: 60, status: 'completed', note: '', createdAt: iso(nowMs - 7 * DAY) },
  ];

  const LOG_ACTIONS = ['Вход в аккаунт', 'Просмотр объявления', 'Добавил объект в избранное', 'Отправил сообщение', 'Обновил профиль', 'Запись на показ'];
  const logs: ActivityLogEntry[] = [];
  users.forEach((u, ui) => {
    for (let i = 0; i < 5; i += 1) {
      logs.push({
        id: `log_${u.id}_${i}`,
        userId: u.id,
        action: pick(LOG_ACTIONS, ui + i),
        createdAt: iso(nowMs - (i * 9 + ui) * HOUR),
        meta: i % 2 === 0 ? `ip 213.230.${(ui * 7 + i) % 255}.${(ui * 13 + i * 3) % 255}` : null,
      });
    }
  });

  return {
    version: MOCK_DB_VERSION,
    seededAt: iso(nowMs),
    users,
    sessions: [],
    properties,
    complexes,
    favorites: { u_buyer: ['p4', 'p8', 'p25'] },
    viewings,
    schedules: {},
    conversations,
    messages,
    notifications,
    logs,
    receipts: [],
    feedback: [],
  };
}
