import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/mongodb";
import { decryptString, encryptString, hashForSearch } from "@/lib/crypto";

const COLLECTION_NAME = "families";

async function requireAuth() {
  const cookieStore = await cookies();
  const username = cookieStore.get("deck_user")?.value;

  if (!username) {
    return NextResponse.json(
      { message: "Usuario no autenticado." },
      { status: 401 }
    );
  }

  const db = await getDb();
  return { db, username };
}

async function requireSuperRoot() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { db, username } = auth;
  const user = await db.collection("users").findOne(
    { usernameHash: hashForSearch(username) },
    { projection: { role: 1 } }
  );
  const role = user?.role ? decryptString(user.role) : "";

  if (role !== "super-root") {
    return NextResponse.json({ message: "No autorizado." }, { status: 403 });
  }

  return null;
}

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { db } = auth;
  const familias = await db
    .collection(COLLECTION_NAME)
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  const serialized = familias.map((familia) => ({
    _id: familia._id.toString(),
    prefix: decryptString(familia.prefix),
    name: decryptString(familia.name),
    createdAt: familia.createdAt,
  }));

  return NextResponse.json({ familias: serialized });
}

export async function POST(request: Request) {
  const authResponse = await requireSuperRoot();
  if (authResponse) {
    return authResponse;
  }

  const body = await request.json();
  const prefixRaw = typeof body?.prefix === "string" ? body.prefix.trim() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const prefix = prefixRaw.toUpperCase();

  if (!prefix) {
    return NextResponse.json(
      { message: "El prefijo es obligatorio." },
      { status: 400 }
    );
  }

  if (!name) {
    return NextResponse.json(
      { message: "El nombre de la familia es obligatorio." },
      { status: 400 }
    );
  }

  const db = await getDb();
  const prefixHash = hashForSearch(prefix);
  const existing = await db
    .collection(COLLECTION_NAME)
    .findOne({ prefixHash });
  if (existing) {
    return NextResponse.json(
      { message: "Ese prefijo ya esta registrado." },
      { status: 409 }
    );
  }

  const createdAt = new Date();
  const result = await db.collection(COLLECTION_NAME).insertOne({
    prefix: encryptString(prefix),
    prefixHash,
    name: encryptString(name),
    createdAt,
  });

  return NextResponse.json({
    familia: {
      _id: result.insertedId.toString(),
      prefix,
      name,
      createdAt,
    },
  });
}
