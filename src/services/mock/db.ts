import AsyncStorage from '@react-native-async-storage/async-storage';

import { monitoring } from '@/lib/monitoring';
import { STORAGE_KEYS } from '@/lib/storage';
import type { Complex, Property, SellerSummary, User } from '@/types/domain';

import { createSeed } from './seed';
import { type ComplexRecord, MOCK_DB_VERSION, type MockDatabase, type PropertyRecord, type UserRecord } from './types';

const SAVE_DEBOUNCE_MS = 500;

/**
 * Хранилище mock-сервера. Данные живут в памяти и сохраняются в AsyncStorage,
 * поэтому созданные объявления, чаты и записи переживают перезапуск приложения.
 */
class MockDb {
  private data: MockDatabase | null = null;
  private loading: Promise<MockDatabase> | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  ready(): Promise<MockDatabase> {
    if (this.data) return Promise.resolve(this.data);
    this.loading ??= this.load();
    return this.loading;
  }

  private async load(): Promise<MockDatabase> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.mockDb);
      if (raw) {
        const parsed = JSON.parse(raw) as MockDatabase;
        if (parsed.version === MOCK_DB_VERSION && Array.isArray(parsed.properties)) {
          this.data = parsed;
          return parsed;
        }
      }
    } catch (error) {
      monitoring.captureException(error, { scope: 'mockDb.load' });
    }
    this.data = createSeed();
    this.markDirty();
    return this.data;
  }

  get state(): MockDatabase {
    if (!this.data) throw new Error('Mock DB is not ready');
    return this.data;
  }

  markDirty(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      if (!this.data) return;
      AsyncStorage.setItem(STORAGE_KEYS.mockDb, JSON.stringify(this.data)).catch((error: unknown) =>
        monitoring.captureException(error, { scope: 'mockDb.save' }),
      );
    }, SAVE_DEBOUNCE_MS);
  }

  async reset(): Promise<void> {
    this.data = createSeed();
    this.loading = Promise.resolve(this.data);
    await AsyncStorage.setItem(STORAGE_KEYS.mockDb, JSON.stringify(this.data));
  }
}

export const mockDb = new MockDb();

export function toPublicUser(record: UserRecord): User {
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    phone: record.phone,
    role: record.role,
    avatar: record.avatar,
    createdAt: record.createdAt,
    company: record.company,
  };
}

export function toSellerSummary(record: UserRecord | undefined): SellerSummary {
  if (!record) {
    return {
      id: 'unknown',
      name: 'SILKX',
      kind: 'agency',
      avatar: null,
      verified: false,
      rating: 0,
      reviewsCount: 0,
      registeredAt: new Date().toISOString(),
      phone: '',
    };
  }
  return {
    id: record.id,
    name: record.company ?? record.name,
    kind: record.sellerKind ?? 'owner',
    avatar: record.avatar,
    verified: record.verified,
    rating: record.rating,
    reviewsCount: record.reviewsCount,
    registeredAt: record.createdAt,
    phone: record.phone,
  };
}

export function hydrateProperty(db: MockDatabase, record: PropertyRecord): Property {
  const { sellerId, ...rest } = record;
  return { ...rest, seller: toSellerSummary(db.users.find((u) => u.id === sellerId)) };
}

export function hydrateComplex(db: MockDatabase, record: ComplexRecord): Complex {
  const { developerId, ...rest } = record;
  return { ...rest, developer: toSellerSummary(db.users.find((u) => u.id === developerId)) };
}
