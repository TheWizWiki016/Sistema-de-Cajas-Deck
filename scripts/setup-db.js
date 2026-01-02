const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");
const crypto = require("crypto");

const DEFAULT_TOOLS = [
  {
    key: "imprimir-precios",
    label: "Imprimir precios",
    description: "Genera etiquetas de precios.",
    visibleToUser: true,
  },
  {
    key: "conteos",
    label: "Conteos",
    description: "Conteo de inventario rapido.",
    visibleToUser: true,
  },
  {
    key: "cortes",
    label: "Cortes",
    description: "Cortes de caja y reportes.",
    visibleToUser: true,
  },
  {
    key: "articulos",
    label: "Articulos",
    description: "Gestion de articulos de la tienda.",
    visibleToUser: true,
  },
];

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

function normalizeSearchValue(value) {
  return value.trim().toLowerCase();
}

function hashForSearch(value) {
  return crypto
    .createHmac("sha256", HASH_KEY)
    .update(normalizeSearchValue(value))
    .digest("hex");
}

function encryptString(value) {
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

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    if (!line || line.startsWith("#")) {
      continue;
    }
    const [rawKey, ...rest] = line.split("=");
    if (!rawKey || rest.length === 0) {
      continue;
    }
    const key = rawKey.trim();
    const value = rest.join("=").trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.join(process.cwd(), ".env.local"));
loadEnvFile(path.join(process.cwd(), ".env"));

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

if (!uri || !dbName) {
  console.error("Missing MONGODB_URI or MONGODB_DB in env.");
  process.exit(1);
}

async function run() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  const usersExisting = await db.listCollections({ name: "users" }).toArray();
  if (usersExisting.length === 0) {
    await db.createCollection("users");
  }

  const toolsExisting = await db.listCollections({ name: "tools" }).toArray();
  if (toolsExisting.length === 0) {
    await db.createCollection("tools");
  }

  const cutsExisting = await db.listCollections({ name: "cash_cuts" }).toArray();
  if (cutsExisting.length === 0) {
    await db.createCollection("cash_cuts");
  }

  const itemsExisting = await db.listCollections({ name: "store_items" }).toArray();
  if (itemsExisting.length === 0) {
    await db.createCollection("store_items");
  }

  await db.collection("users").createIndex({ usernameHash: 1 }, { unique: true });
  await db.collection("users").createIndex({ roleHash: 1 });
  await db.collection("tools").createIndex({ keyHash: 1 }, { unique: true });
  await db.collection("cash_cuts").createIndex({ createdAt: -1 });
  await db.collection("cash_cuts").createIndex({ usernameHash: 1 });
  await db.collection("store_items").createIndex({ createdAt: -1 });
  await db.collection("store_items").createIndex(
    { alfanumericoHash: 1 },
    { unique: true }
  );
  await db.collection("store_items").createIndex(
    { codigoBarrasHash: 1 },
    { unique: true, sparse: true }
  );

  const toolsCount = await db.collection("tools").countDocuments();
  if (toolsCount === 0) {
    await db.collection("tools").insertMany(
      DEFAULT_TOOLS.map((tool) => ({
        key: encryptString(tool.key),
        keyHash: hashForSearch(tool.key),
        label: encryptString(tool.label),
        description: encryptString(tool.description || ""),
        visibleToUser: tool.visibleToUser,
        createdAt: new Date(),
      }))
    );
  }

  await client.close();
  console.log("Setup complete: collections, indexes, and default tools ready.");
}

run().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
