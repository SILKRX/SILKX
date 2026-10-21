/**
 * Доменная модель SILKX. Общая для UI, mock-сервера и будущего реального API.
 * Деньги храним в целых числах (USD без центов / UZS без тийинов).
 */

export type Role = 'buyer' | 'seller' | 'admin';
export type DealType = 'sale' | 'rent';
export type PropertyType = 'apartment' | 'house' | 'townhouse' | 'commercial';
export type Renovation = 'shell' | 'whitebox' | 'euro' | 'designer';
export type Currency = 'USD' | 'UZS';
export type ListingStatus = 'active' | 'pending' | 'rejected' | 'archived';
export type PromotionTier = 'vip' | 'gold' | 'top';

export type DistrictId =
  | 'mirzo-ulugbek'
  | 'yunusabad'
  | 'chilanzar'
  | 'yakkasaray'
  | 'mirabad'
  | 'shaykhantahur'
  | 'almazar'
  | 'sergeli'
  | 'uchtepa'
  | 'bektemir'
  | 'yashnabad'
  | 'yangihayot';

export type AmenityId =
  | 'wifi'
  | 'parking'
  | 'security'
  | 'panoramic'
  | 'elevator'
  | 'conditioner'
  | 'furniture'
  | 'appliances'
  | 'playground'
  | 'gym'
  | 'concierge'
  | 'balcony';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export type SellerKind = 'developer' | 'agency' | 'owner';

export interface SellerSummary {
  id: string;
  name: string;
  kind: SellerKind;
  avatar: string | null;
  verified: boolean;
  rating: number;
  reviewsCount: number;
  registeredAt: string;
  phone: string;
}

export interface Property {
  id: string;
  dealType: DealType;
  type: PropertyType;
  title: string;
  description: string;
  price: number;
  currency: Currency;
  area: number;
  rooms: number;
  floor: number;
  floorsTotal: number;
  district: DistrictId;
  address: string;
  coords: Coordinates;
  images: string[];
  amenities: AmenityId[];
  renovation: Renovation;
  furnished: boolean;
  installment: boolean;
  mortgage: boolean;
  complexId: string | null;
  seller: SellerSummary;
  status: ListingStatus;
  promotion: PromotionTier | null;
  isHot: boolean;
  isPremium: boolean;
  createdAt: string;
  updatedAt: string;
  views: number;
  favoritesCount: number;
  calls: number;
  previousPrice: number | null;
  completionYear: number | null;
  rejectionReason: RejectionReason | null;
}

export type ComplexClass = 'comfort' | 'business' | 'premium';
export type UnitStatus = 'available' | 'reserved' | 'sold';

export interface ComplexUnit {
  id: string;
  block: string;
  floor: number;
  number: string;
  rooms: number;
  area: number;
  price: number;
  status: UnitStatus;
}

export type InfrastructureItem = 'school' | 'parking' | 'security' | 'park' | 'fitness' | 'shop' | 'kindergarten' | 'metro';

export interface Complex {
  id: string;
  name: string;
  developer: SellerSummary;
  district: DistrictId;
  address: string;
  coords: Coordinates;
  class: ComplexClass;
  completion: string;
  priceFrom: number;
  pricePerM2From: number;
  heroImages: string[];
  renders: string[];
  masterPlan: string;
  description: string;
  infrastructure: InfrastructureItem[];
  blocks: string[];
  floors: number;
  units: ComplexUnit[];
  installment: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  avatar: string | null;
  createdAt: string;
  company: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  /** Unix ms, когда истекает access token */
  expiresAt: number;
}

export interface AuthSession {
  user: User;
  tokens: AuthTokens;
}

export type ViewingStatus = 'scheduled' | 'cancelled' | 'completed';

export interface Viewing {
  id: string;
  propertyId: string;
  buyerId: string;
  sellerId: string;
  start: string;
  durationMin: number;
  status: ViewingStatus;
  note: string;
  createdAt: string;
}

export interface ViewingSlot {
  id: string;
  sellerId: string;
  start: string;
  durationMin: number;
  booked: boolean;
}

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface MessageAttachment {
  id: string;
  kind: 'image' | 'file';
  uri: string;
  name: string;
  size: number | null;
  mimeType: string | null;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  attachments: MessageAttachment[];
  createdAt: string;
  status: MessageStatus;
}

export interface ChatParticipant {
  id: string;
  name: string;
  avatar: string | null;
  role: Role;
  online: boolean;
  lastSeenAt: string | null;
  verified: boolean;
}

export interface Conversation {
  id: string;
  propertyId: string | null;
  participantIds: string[];
  counterpart: ChatParticipant;
  lastMessage: ChatMessage | null;
  unreadCount: number;
  updatedAt: string;
  isSupport: boolean;
}

export type NotificationKind =
  | 'price_drop'
  | 'new_match'
  | 'viewing_reminder'
  | 'viewing_request'
  | 'message'
  | 'moderation_approved'
  | 'moderation_rejected'
  | 'payment_success'
  | 'system';

export interface AppNotification {
  id: string;
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  propertyId: string | null;
  conversationId: string | null;
}

export type RejectionReason = 'bad_photos' | 'wrong_price' | 'duplicate' | 'incomplete' | 'prohibited';

export interface SellerStats {
  views: number;
  favorites: number;
  calls: number;
  messages: number;
  conversion: number;
  activeListings: number;
  pendingListings: number;
  daily: { date: string; views: number; calls: number }[];
}

export interface AdminUser extends User {
  banned: boolean;
  listingsCount: number;
  lastActiveAt: string;
}

export interface ActivityLogEntry {
  id: string;
  userId: string;
  action: string;
  createdAt: string;
  meta: string | null;
}

export interface PromotionTariff {
  id: PromotionTier;
  price: number;
  currency: 'UZS';
  days: number;
}

export type PaymentMethod = 'apple_pay' | 'google_pay' | 'click' | 'payme' | 'uzcard';

export interface PaymentReceipt {
  id: string;
  listingId: string;
  tariff: PromotionTier;
  amount: number;
  currency: 'UZS';
  method: PaymentMethod;
  paidAt: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  nextCursor: number | null;
}

export interface PriceBucket {
  from: number;
  to: number;
  count: number;
}
