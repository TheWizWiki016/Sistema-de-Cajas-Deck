import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/mongodb";
import {
  decryptNumber,
  decryptString,
  encryptNumber,
  encryptString,
  hashForSearch,
} from "@/lib/crypto";

const COLLECTION_NAME = "selective_counts";

type SelectiveLineInput = {
  itemId: string;
  sku: string;
  nombre: string;
  codigoBarras?: string;
  real: number;
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
  const body = await request.json();
  const lines = Array.isArray(body?.lines)
    ? (body.lines as SelectiveLineInput[])
    : [];

  if (lines.length === 0) {
    return NextResponse.json(
      { message: "No hay productos para guardar." },
      { status: 400 }
    );
  }

  const sanitizedLines = lines.map((line) => ({
    itemId: typeof line?.itemId === "string" ? line.itemId.trim() : "",
    sku: typeof line?.sku === "string" ? line.sku.trim() : "",
    nombre: typeof line?.nombre === "string" ? line.nombre.trim() : "",
    codigoBarras:
      typeof line?.codigoBarras === "string" ? line.codigoBarras.trim() : "",
    real: Number(line?.real),
  }));

  for (const line of sanitizedLines) {
    if (!line.itemId || !line.sku || !line.nombre) {
      return NextResponse.json(
        { message: "Existen lineas invalidas en el conteo." },
        { status: 400 }
      );
    }
    if (Number.isNaN(line.real) || line.real < 0) {
      return NextResponse.json(
        { message: "Las cantidades deben ser validas." },
        { status: 400 }
      );
    }
  }

  let totalReal = 0;
  const storedLines = sanitizedLines.map((line) => {
    totalReal += line.real;
    return {
      itemId: line.itemId,
      sku: encryptString(line.sku),
      nombre: encryptString(line.nombre),
      codigoBarras: encryptString(line.codigoBarras ?? ""),
      real: encryptNumber(line.real),
    };
  });

  const createdAt = new Date();
  const result = await db.collection(COLLECTION_NAME).insertOne({
    username: encryptString(username),
    usernameHash: hashForSearch(username),
    lines: storedLines,
    totals: {
      real: encryptNumber(totalReal),
      items: storedLines.length,
    },
    createdAt,
  });

  return NextResponse.json({
    ok: true,
    conteo: {
      _id: result.insertedId.toString(),
      totals: {
        real: totalReal,
        items: storedLines.length,
      },
      createdAt,
    },
  });
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { db, username, role } = auth;
  const url = new URL(request.url);
  const wantsAll = url.searchParams.get("all") === "1";

  if (wantsAll && role !== "super-root") {
    return NextResponse.json({ message: "No autorizado." }, { status: 403 });
  }

  const query =
    wantsAll && role === "super-root"
      ? {}
      : { usernameHash: hashForSearch(username) };

  const conteos = await db
    .collection(COLLECTION_NAME)
    .find(query)
    .sort({ createdAt: -1 })
    .limit(60)
    .toArray();

  const serialized = conteos.map((conteo) => ({
    _id: conteo._id.toString(),
    username: decryptString(conteo.username),
    totals: {
      real: decryptNumber(conteo.totals?.real) ?? 0,
      items: conteo.totals?.items ?? 0,
    },
    lines: Array.isArray(conteo.lines)
      ? conteo.lines.map((line: any) => ({
          itemId: line.itemId,
          sku: decryptString(line.sku),
          nombre: decryptString(line.nombre),
          codigoBarras: decryptString(line.codigoBarras),
          real: decryptNumber(line.real) ?? 0,
        }))
      : [],
    createdAt: conteo.createdAt,
  }));

  return NextResponse.json({ conteos: serialized });
}
