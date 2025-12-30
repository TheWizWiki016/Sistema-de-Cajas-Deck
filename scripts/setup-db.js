const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");

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
];

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

  await db.collection("users").createIndex({ username: 1 }, { unique: true });
  await db.collection("tools").createIndex({ key: 1 }, { unique: true });
  await db.collection("cash_cuts").createIndex({ createdAt: -1 });

  const toolsCount = await db.collection("tools").countDocuments();
  if (toolsCount === 0) {
    await db.collection("tools").insertMany(
      DEFAULT_TOOLS.map((tool) => ({
        ...tool,
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
