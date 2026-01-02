import crypto from "crypto";

const RAW_KEY = process.env.DATA_ENCRYPTION_KEY;

function loadKey() {
  if (!RAW_KEY) {
    throw new Error("DATA_ENCRYPTION_KEY is not set.");
  }

  const isHex = /^[0-9a-fA-F]+$/.test(RAW_KEY) && RAW_KEY.length === 64;
  const key = Buffer.from(RAW_KEY, isHex ? "hex" : "base64");

  if (key.length !== 32) {
    throw new Error("DATA_ENCRYPTION_KEY must be 32 bytes (base64 or hex).");
  }

  return key;
}

const KEY = loadKey();
const IV_KEY = crypto.createHmac("sha256", KEY).update("iv").digest();
const HASH_KEY = crypto.createHmac("sha256", KEY).update("hash").digest();

function normalizeSearchValue(value: string) {
  return value.trim().toLowerCase();
}

export function hashForSearch(value: string) {
  return crypto
    .createHmac("sha256", HASH_KEY)
    .update(normalizeSearchValue(value))
    .digest("hex");
}

export function encryptString(value: string) {
  if (!value) {
    return "";
  }

  const iv = crypto
    .createHmac("sha256", IV_KEY)
    .update(value)
    .digest()
    .subarray(0, 12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `v1:${iv.toString("base64")}:${ciphertext.toString(
    "base64"
  )}:${tag.toString("base64")}`;
}

export function decryptString(value?: string | null) {
  if (!value) {
    return "";
  }

  if (!value.startsWith("v1:")) {
    return value;
  }

  try {
    const parts = value.split(":");
    if (parts.length !== 4) {
      return value;
    }
    const [, ivB64, ctB64, tagB64] = parts;
    const iv = Buffer.from(ivB64, "base64");
    const ciphertext = Buffer.from(ctB64, "base64");
    const tag = Buffer.from(tagB64, "base64");
    const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
    return plaintext;
  } catch (error) {
    return value;
  }
}

export function encryptNumber(value: number) {
  return encryptString(value.toString());
}

export function decryptNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const plain = decryptString(value);
    const parsed = Number(plain);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

export function encryptBoolean(value: boolean) {
  return encryptString(value ? "true" : "false");
}

export function decryptBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const plain = decryptString(value);
    return plain === "true";
  }
  return false;
}

export function encryptStringArray(values: string[]) {
  return values.map((value) => encryptString(value));
}

export function decryptStringArray(values: unknown) {
  if (!Array.isArray(values)) {
    return [];
  }
  return values.map((value) =>
    decryptString(typeof value === "string" ? value : String(value))
  );
}
