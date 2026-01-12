import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/mongodb";
import {
  decryptNumber,
  decryptString,
  decryptStringArray,
  hashForSearch,
} from "@/lib/crypto";

const COLLECTION_NAME = "store_items";

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
  const user = await db.collection("users").findOne(
    { usernameHash: hashForSearch(username) },
    { projection: { _id: 1 } }
  );

  if (!user) {
    return NextResponse.json({ message: "Usuario no valido." }, { status: 403 });
  }

  return { db };
}

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { db } = auth;
  const items = await db
    .collection(COLLECTION_NAME)
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  const serialized = items.map((item) => ({
    _id: item._id.toString(),
    nombre: decryptString(item.nombre),
    alfanumerico: decryptString(item.alfanumerico),
    codigoBarras: decryptString(item.codigoBarras),
    upc: decryptString(item.upc),
    cantidadPorCaja: decryptNumber(item.cantidadPorCaja),
    familias: decryptStringArray(item.familias),
  }));

  return NextResponse.json({ articulos: serialized });
}
