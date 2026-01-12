import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/mongodb";
import {
  decryptString,
  decryptStringArray,
  encryptString,
  encryptStringArray,
  hashForSearch,
} from "@/lib/crypto";

const COLLECTION_NAME = "change_requests";

type ChangeRequestInput = {
  itemId: string;
  alfanumerico: string;
  nombre?: string;
  upc?: string;
  issues: string[];
  notes?: string;
};

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
    { projection: { role: 1 } }
  );
  const role = user?.role ? decryptString(user.role) : "";

  return { db, username, role };
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { db, username } = auth;
  const body = (await request.json()) as ChangeRequestInput;
  const itemId = typeof body?.itemId === "string" ? body.itemId.trim() : "";
  const alfanumerico =
    typeof body?.alfanumerico === "string" ? body.alfanumerico.trim() : "";
  const nombre = typeof body?.nombre === "string" ? body.nombre.trim() : "";
  const upc = typeof body?.upc === "string" ? body.upc.trim() : "";
  const issues = Array.isArray(body?.issues)
    ? body.issues.filter((issue) => typeof issue === "string")
    : [];
  const notes = typeof body?.notes === "string" ? body.notes.trim() : "";

  if (!itemId || !alfanumerico || issues.length === 0) {
    return NextResponse.json(
      { message: "Faltan datos para enviar el reporte." },
      { status: 400 }
    );
  }

  await db.collection(COLLECTION_NAME).insertOne({
    itemId,
    alfanumerico: encryptString(alfanumerico),
    nombre: encryptString(nombre),
    upc: encryptString(upc),
    issues: encryptStringArray(issues),
    notes: encryptString(notes),
    status: "pending",
    username: encryptString(username),
    usernameHash: hashForSearch(username),
    createdAt: new Date(),
  });

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { db, role } = auth;
  if (role !== "admin" && role !== "super-root") {
    return NextResponse.json({ message: "No autorizado." }, { status: 403 });
  }

  const items = await db
    .collection(COLLECTION_NAME)
    .find({})
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();

  const serialized = items.map((item) => ({
    _id: item._id.toString(),
    itemId: item.itemId,
    alfanumerico: decryptString(item.alfanumerico),
    nombre: decryptString(item.nombre),
    upc: decryptString(item.upc),
    issues: decryptStringArray(item.issues),
    notes: decryptString(item.notes),
    status: item.status ?? "pending",
    username: decryptString(item.username),
    createdAt: item.createdAt,
  }));

  return NextResponse.json({ requests: serialized });
}
