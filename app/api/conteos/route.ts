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

const COLLECTION_NAME = "inventory_counts";

type CountLineInput = {
  itemId: string;
  sku: string;
  nombre: string;
  codigoBarras?: string;
  teorico: number;
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
  const family = typeof body?.family === "string" ? body.family.trim() : "";
  const expectedIds: string[] = Array.isArray(body?.expectedIds)
    ? body.expectedIds.filter(
        (id: unknown): id is string => typeof id === "string"
      )
    : [];
  const lines = Array.isArray(body?.lines) ? (body.lines as CountLineInput[]) : [];

  if (!family) {
    return NextResponse.json(
      { message: "La familia es obligatoria." },
      { status: 400 }
    );
  }

  if (expectedIds.length === 0) {
    return NextResponse.json(
      { message: "No hay articulos para guardar." },
      { status: 400 }
    );
  }

  if (lines.length === 0) {
    return NextResponse.json(
      { message: "No hay lineas completas para guardar." },
      { status: 400 }
    );
  }

  const expectedSet = new Set(expectedIds);
  const lineMap = new Map<string, CountLineInput>();
  for (const line of lines) {
    if (!line?.itemId || !expectedSet.has(line.itemId)) {
      return NextResponse.json(
        { message: "Existen lineas invalidas en el conteo." },
        { status: 400 }
      );
    }
    if (
      Number.isNaN(Number(line.teorico)) ||
      Number.isNaN(Number(line.real)) ||
      Number(line.teorico) < 0 ||
      Number(line.real) < 0
    ) {
      return NextResponse.json(
        { message: "Las cantidades deben ser validas." },
        { status: 400 }
      );
    }
    lineMap.set(line.itemId, {
      ...line,
      teorico: Number(line.teorico),
      real: Number(line.real),
    });
  }

  const missing = expectedIds.filter((id) => !lineMap.has(id));
  if (missing.length > 0) {
    return NextResponse.json(
      { message: "El conteo no esta completo." },
      { status: 400 }
    );
  }

  let totalTeorico = 0;
  let totalReal = 0;
  const storedLines = Array.from(lineMap.values()).map((line) => {
    totalTeorico += line.teorico;
    totalReal += line.real;
    return {
      itemId: line.itemId,
      sku: encryptString(line.sku),
      nombre: encryptString(line.nombre),
      codigoBarras: encryptString(line.codigoBarras ?? ""),
      teorico: encryptNumber(line.teorico),
      real: encryptNumber(line.real),
      diferencia: encryptNumber(line.real - line.teorico),
    };
  });

  const createdAt = new Date();
  const result = await db.collection(COLLECTION_NAME).insertOne({
    username: encryptString(username),
    usernameHash: hashForSearch(username),
    family: encryptString(family),
    familyHash: hashForSearch(family),
    lines: storedLines,
    totals: {
      teorico: encryptNumber(totalTeorico),
      real: encryptNumber(totalReal),
      diferencia: encryptNumber(totalReal - totalTeorico),
      items: storedLines.length,
    },
    createdAt,
  });

  return NextResponse.json({
    ok: true,
    conteo: {
      _id: result.insertedId.toString(),
      family,
      totals: {
        teorico: totalTeorico,
        real: totalReal,
        diferencia: totalReal - totalTeorico,
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
    .limit(80)
    .toArray();

  const serialized = conteos.map((conteo) => ({
    _id: conteo._id.toString(),
    username: decryptString(conteo.username),
    family: decryptString(conteo.family),
    totals: {
      teorico: decryptNumber(conteo.totals?.teorico) ?? 0,
      real: decryptNumber(conteo.totals?.real) ?? 0,
      diferencia: decryptNumber(conteo.totals?.diferencia) ?? 0,
      items: conteo.totals?.items ?? 0,
    },
    createdAt: conteo.createdAt,
  }));

  return NextResponse.json({ conteos: serialized });
}
