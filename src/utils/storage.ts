import type { Env } from "../types";

export interface TrafficUsage {
  upload: number;
  download: number;
  total: number;
}

export interface UserRecord {
  sub: string;
  expire: string;
  note?: string;
  traffic: TrafficUsage;
}

export interface Storage {
  getUser(uuid: string): Promise<UserRecord | null>;
  putUser(uuid: string, record: UserRecord): Promise<void>;
  deleteUser(uuid: string): Promise<void>;
  listUsers(): Promise<Array<{ uuid: string; record: UserRecord }>>;
}

class KVStorage implements Storage {
  constructor(private readonly namespace: KVNamespace) {}

  async getUser(uuid: string): Promise<UserRecord | null> {
    const value = await this.namespace.get<UserRecord>(uuid, "json");
    return value ?? null;
  }

  async putUser(uuid: string, record: UserRecord): Promise<void> {
    await this.namespace.put(uuid, JSON.stringify(record));
  }

  async deleteUser(uuid: string): Promise<void> {
    await this.namespace.delete(uuid);
  }

  async listUsers(): Promise<Array<{ uuid: string; record: UserRecord }>> {
    const results = await this.namespace.list();
    const entries = await Promise.all(
      results.keys.map(async (key) => {
        const record = await this.getUser(key.name);
        return record ? { uuid: key.name, record } : null;
      })
    );
    return entries.filter((entry): entry is { uuid: string; record: UserRecord } => entry !== null);
  }
}

export const createStorage = (env: Env): Storage => new KVStorage(env.USERS_KV);

export const emptyTrafficUsage = (): TrafficUsage => ({
  upload: 0,
  download: 0,
  total: 0,
});

export const normalizeUserRecord = (input: Partial<UserRecord> & { sub?: string; expire?: string }): UserRecord => {
  if (!input.sub) {
    throw new Error("Subscription URL is required");
  }
  if (!input.expire) {
    throw new Error("Expiration is required");
  }
  const traffic = input.traffic ?? emptyTrafficUsage();
  return {
    sub: input.sub,
    expire: new Date(input.expire).toISOString(),
    note: input.note,
    traffic: {
      upload: Number(traffic.upload ?? 0),
      download: Number(traffic.download ?? 0),
      total: Number(traffic.total ?? 0),
    },
  };
};
