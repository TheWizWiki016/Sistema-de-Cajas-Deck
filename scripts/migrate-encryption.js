const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { MongoClient } = require("mongodb");

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
const RAW_KEY = process.env.DATA_ENCRYPTION_KEY;

if (!uri || !dbName) {
  console.error("Missing MONGODB_URI or MONGODB_DB in env.");
  process.exit(1);
}

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

function decryptString(value) {
  if (!value) {
    return "";
  }
  if (typeof value !== "string" || !value.startsWith("v1:")) {
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
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
  } catch (error) {
    return value;
  }
}

function encryptNumber(value) {
  return encryptString(value.toString());
}

function decryptNumber(value) {
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

function encryptBoolean(value) {
  return encryptString(value ? "true" : "false");
}

function decryptBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const plain = decryptString(value);
    return plain === "true";
  }
  return false;
}

function decryptStringArray(values) {
  if (!Array.isArray(values)) {
    if (typeof values === "string") {
      return [decryptString(values)];
    }
    return [];
  }
  return values.map((value) =>
    decryptString(typeof value === "string" ? value : String(value))
  );
}

function encryptStringArray(values) {
  return values.map((value) => encryptString(value));
}

async function migrateUsers(db) {
  const cursor = db.collection("users").find({});
  let updated = 0;

  for await (const user of cursor) {
    const usernamePlain = decryptString(user.username);
    const rolePlain = decryptString(user.role);
    const passwordHashPlain = decryptString(user.passwordHash || "");
    const passwordSaltPlain = decryptString(user.passwordSalt || "");

    const update = {
      username: encryptString(usernamePlain),
      usernameHash: usernamePlain ? hashForSearch(usernamePlain) : undefined,
      role: encryptString(rolePlain),
      roleHash: rolePlain ? hashForSearch(rolePlain) : undefined,
      passwordHash: passwordHashPlain ? encryptString(passwordHashPlain) : "",
      passwordSalt: passwordSaltPlain ? encryptString(passwordSaltPlain) : "",
    };

    await db.collection("users").updateOne(
      { _id: user._id },
      { $set: update }
    );
    updated += 1;
  }

  return updated;
}

async function migrateTools(db) {
  const cursor = db.collection("tools").find({});
  let updated = 0;

  for await (const tool of cursor) {
    const keyPlain = decryptString(tool.key);
    const labelPlain = decryptString(tool.label);
    const descriptionPlain = decryptString(tool.description || "");

    const update = {
      key: encryptString(keyPlain),
      keyHash: keyPlain ? hashForSearch(keyPlain) : undefined,
      label: encryptString(labelPlain),
      description: encryptString(descriptionPlain),
    };

    await db.collection("tools").updateOne(
      { _id: tool._id },
      { $set: update }
    );
    updated += 1;
  }

  return updated;
}

async function migrateStoreItems(db) {
  const cursor = db.collection("store_items").find({});
  let updated = 0;

  for await (const item of cursor) {
    const nombrePlain = decryptString(item.nombre || "");
    const alfanumericoPlain = decryptString(item.alfanumerico || "");
    const codigoBarrasSource =
      item.codigoBarras !== undefined ? item.codigoBarras : item.codigo_barras;
    const codigoBarrasPlain = decryptString(codigoBarrasSource || "");
    const familiasPlain = decryptStringArray(item.familias);
    const precioPlain = decryptNumber(item.precio);

    const update = {
      nombre: encryptString(nombrePlain),
      familias: encryptStringArray(familiasPlain),
      alfanumerico: encryptString(alfanumericoPlain),
      alfanumericoHash: alfanumericoPlain
        ? hashForSearch(alfanumericoPlain)
        : undefined,
      precio: precioPlain === null ? null : encryptNumber(precioPlain),
      updatedAt: new Date(),
    };

    if (nombrePlain) {
      update.nombreHash = hashForSearch(nombrePlain);
    }

    if (codigoBarrasPlain) {
      update.codigoBarras = encryptString(codigoBarrasPlain);
      update.codigoBarrasHash = hashForSearch(codigoBarrasPlain);
    }

    const updateDoc = { $set: update };
    const unset = {};
    if (!nombrePlain && item.nombreHash) {
      unset.nombreHash = "";
    }
    if (!codigoBarrasPlain) {
      unset.codigoBarras = "";
      unset.codigoBarrasHash = "";
    }
    if (item.codigo_barras !== undefined) {
      unset.codigo_barras = "";
    }
    if (Object.keys(unset).length > 0) {
      updateDoc.$unset = unset;
    }

    await db.collection("store_items").updateOne(
      { _id: item._id },
      updateDoc
    );
    updated += 1;
  }

  return updated;
}

async function migrateCashCuts(db) {
  const cursor = db.collection("cash_cuts").find({});
  let updated = 0;

  for await (const corte of cursor) {
    const usernamePlain = decryptString(corte.username);
    const corteTeorico = decryptNumber(corte.corteTeorico) ?? 0;
    const corteReal = decryptNumber(corte.corteReal) ?? 0;
    const diferencia = decryptNumber(corte.diferencia) ?? 0;
    const depositado = decryptNumber(corte.depositado) ?? 0;
    const pico = decryptNumber(corte.pico) ?? 0;
    const fondoValidado = decryptBoolean(corte.fondoValidado);
    const fondoCantidad = decryptNumber(corte.fondoCantidad);

    const pendientes = Array.isArray(corte.pendientes)
      ? corte.pendientes.map((task) => ({
          text: encryptString(decryptString(task?.text)),
          done: encryptBoolean(decryptBoolean(task?.done)),
        }))
      : [];

    const update = {
      username: encryptString(usernamePlain),
      usernameHash: usernamePlain ? hashForSearch(usernamePlain) : undefined,
      corteTeorico: encryptNumber(corteTeorico),
      corteReal: encryptNumber(corteReal),
      diferencia: encryptNumber(diferencia),
      depositado: encryptNumber(depositado),
      pico: encryptNumber(pico),
      pendientes,
      fondoValidado: encryptBoolean(fondoValidado),
    };

    const updateDoc = { $set: update };
    if (fondoCantidad !== null && fondoCantidad !== undefined) {
      updateDoc.$set.fondoCantidad = encryptNumber(fondoCantidad);
    } else {
      updateDoc.$unset = { fondoCantidad: "" };
    }

    await db.collection("cash_cuts").updateOne(
      { _id: corte._id },
      updateDoc
    );
    updated += 1;
  }

  return updated;
}

async function run() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  const users = await migrateUsers(db);
  const tools = await migrateTools(db);
  const storeItems = await migrateStoreItems(db);
  const cashCuts = await migrateCashCuts(db);

  await client.close();

  console.log("Migration complete.");
  console.log(`users: ${users}`);
  console.log(`tools: ${tools}`);
  console.log(`store_items: ${storeItems}`);
  console.log(`cash_cuts: ${cashCuts}`);
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
