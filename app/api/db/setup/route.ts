import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { encryptString, hashForSearch } from "@/lib/crypto";

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

export async function POST() {
  const db = await getDb();

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

  const itemsExisting = await db
    .listCollections({ name: "store_items" })
    .toArray();
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
        description: encryptString(tool.description ?? ""),
        visibleToUser: tool.visibleToUser,
        createdAt: new Date(),
      }))
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Colecciones, indices y herramientas base listas.",
  });
}
