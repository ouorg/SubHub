import type { TrafficUsage, UserRecord } from "./storage";

const parseNumber = (value: string | undefined): number | undefined => {
  if (!value) return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

const parseExpire = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const expireSeconds = Number(value);
  if (Number.isFinite(expireSeconds) && expireSeconds > 0) {
    return new Date(expireSeconds * 1000).toISOString();
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date.toISOString();
};

export const parseSubscriptionHeaders = (headers: Headers): Partial<UserRecord> => {
  const userInfo = headers.get("subscription-userinfo");
  const updates: Partial<UserRecord> = {};
  if (userInfo) {
    const parts = userInfo.split(";");
    const map = new Map<string, string>();
    for (const part of parts) {
      const [key, rawValue] = part.split("=");
      if (key && rawValue) {
        map.set(key.trim(), rawValue.trim());
      }
    }
    const upload = parseNumber(map.get("upload"));
    const download = parseNumber(map.get("download"));
    const total = parseNumber(map.get("total"));
    const expire = parseExpire(map.get("expire"));
    const traffic: TrafficUsage = {
      upload: upload ?? 0,
      download: download ?? 0,
      total: total ?? 0,
    };
    updates.traffic = traffic;
    if (expire) {
      updates.expire = expire;
    }
  }

  const expireHeader = headers.get("x-subscription-expires");
  const expire = parseExpire(expireHeader ?? undefined);
  if (expire) {
    updates.expire = expire;
  }
  return updates;
};
