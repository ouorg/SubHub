const encoder = new TextEncoder();
const decoder = new TextDecoder();

const base64UrlEncode = (data: Uint8Array | ArrayBuffer): string => {
  const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
};

const base64UrlDecode = (data: string): Uint8Array => {
  const padding = data.length % 4 === 0 ? "" : "=".repeat(4 - (data.length % 4));
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/") + padding;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

export interface JWTPayload {
  role: "user" | "admin";
  uuid?: string;
  iat: number;
  exp: number;
}

export interface JWTPayloadInput {
  role: "user" | "admin";
  uuid?: string;
  expiresInSeconds?: number;
}

const importKey = async (secret: string): Promise<CryptoKey> => {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
};

export const signJWT = async (payload: JWTPayloadInput, secret: string): Promise<string> => {
  const header = { alg: "HS256", typ: "JWT" };
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresIn = payload.expiresInSeconds ?? 60 * 60 * 24; // default 24h
  const fullPayload: JWTPayload = {
    role: payload.role,
    uuid: payload.uuid,
    iat: issuedAt,
    exp: issuedAt + expiresIn,
  };

  const encodedHeader = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const encodedPayload = base64UrlEncode(encoder.encode(JSON.stringify(fullPayload)));
  const data = `${encodedHeader}.${encodedPayload}`;
  const key = await importKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const encodedSignature = base64UrlEncode(signature);
  return `${data}.${encodedSignature}`;
};

export const verifyJWT = async (token: string, secret: string): Promise<JWTPayload> => {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid token");
  }
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const key = await importKey(secret);
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = base64UrlDecode(encodedSignature);
  const signatureBuffer = signature.buffer.slice(
    signature.byteOffset,
    signature.byteOffset + signature.byteLength
  ) as ArrayBuffer;
  const isValid = await crypto.subtle.verify("HMAC", key, signatureBuffer, encoder.encode(data));
  if (!isValid) {
    throw new Error("Signature verification failed");
  }
  const payloadJson = decoder.decode(base64UrlDecode(encodedPayload));
  const payload = JSON.parse(payloadJson) as JWTPayload;
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    throw new Error("Token expired");
  }
  return payload;
};

export const extractTokenFromCookie = (request: Request, cookieName: string): string | null => {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return null;
  }
  const cookies = cookieHeader.split(/;\s*/u);
  for (const cookie of cookies) {
    const [name, ...rest] = cookie.split("=");
    if (name === cookieName) {
      return rest.join("=");
    }
  }
  return null;
};

export const buildAuthCookie = (token: string): string => {
  return `subhub_token=${token}; HttpOnly; Path=/; SameSite=Lax; Secure; Max-Age=86400`;
};

export const buildLogoutCookie = (): string => {
  return "subhub_token=; HttpOnly; Path=/; SameSite=Lax; Secure; Max-Age=0";
};
