import type {
  ActivityLogEntry,
  AppNotification,
  ChatMessage,
  Complex,
  PaymentReceipt,
  Property,
  SellerKind,
  User,
  Viewing,
} from '@/types/domain';

export interface UserRecord extends User {
  passwordHash: string;
  banned: boolean;
  lastActiveAt: string;
  sellerKind: SellerKind | null;
  verified: boolean;
  rating: number;
  reviewsCount: number;
}

export type PropertyRecord = Omit<Property, 'seller'> & { sellerId: string };
export type ComplexRecord = Omit<Complex, 'developer'> & { developerId: string };

export interface SessionRecord {
  refreshToken: string;
  userId: string;
  expiresAt: number;
}

export interface ConversationRecord {
  id: string;
  propertyId: string | null;
  participantIds: string[];
  updatedAt: string;
  isSupport: boolean;
  /** userId → число непрочитанных */
  unread: Record<string, number>;
}

export interface FeedbackRecord {
  id: string;
  userId: string | null;
  topic: string;
  message: string;
  email: string | null;
  createdAt: string;
}

export interface MockDatabase {
  version: number;
  seededAt: string;
  users: UserRecord[];
  sessions: SessionRecord[];
  properties: PropertyRecord[];
  complexes: ComplexRecord[];
  favorites: Record<string, string[]>;
  viewings: Viewing[];
  /** sellerId → 'YYYY-MM-DD' → часы, доступные для показа */
  schedules: Record<string, Record<string, number[]>>;
  conversations: ConversationRecord[];
  messages: ChatMessage[];
  notifications: AppNotification[];
  logs: ActivityLogEntry[];
  receipts: PaymentReceipt[];
  feedback: FeedbackRecord[];
}

export const MOCK_DB_VERSION = 3;
