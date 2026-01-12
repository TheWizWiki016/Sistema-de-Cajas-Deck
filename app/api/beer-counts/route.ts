import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/mongodb";
import { encryptNumber, encryptString, hashForSearch } from "@/lib/crypto";

const COLLECTION_NAME = "beer_counts";

type CountLineInput = {
  itemId: string;
  nombre: string;
  alfanumerico: string;
  upc?: string;
  cantidadPorCaja?: number | null;
  fisicoUnidades: number;
  fisicoCajas: number;
  teoricoUnidades: number;
  teoricoCajas: number;
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
    { projection: { _id: 1 } }
  );

  if (!user) {
    return NextResponse.json({ message: "Usuario no valido." }, { status: 403 });
  }

  return { db, username };
}

function isValidNumber(value: unknown) {
  return (
    typeof value === "number" &&
    !Number.isNaN(value) &&
    Number.isFinite(value) &&
    value >= 0
  );
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { db, username } = auth;
  const body = await request.json();
  const ticketFolio =
    typeof body?.ticketFolio === "string" ? body.ticketFolio.trim() : "";
  const lines = Array.isArray(body?.lines) ? (body.lines as CountLineInput[]) : [];

  if (!ticketFolio) {
    return NextResponse.json(
      { message: "El folio del ticket teorico es obligatorio." },
      { status: 400 }
    );
  }

  if (lines.length === 0) {
    return NextResponse.json(
      { message: "No hay lineas para guardar." },
      { status: 400 }
    );
  }

  const lineMap = new Map<string, CountLineInput>();
  for (const line of lines) {
    if (!line?.itemId || typeof line.itemId !== "string") {
      return NextResponse.json(
        { message: "Existen lineas invalidas en el conteo." },
        { status: 400 }
      );
    }

    const cantidadPorCaja =
      line.cantidadPorCaja === null || line.cantidadPorCaja === undefined
        ? null
        : Number(line.cantidadPorCaja);

    if (
      !isValidNumber(line.fisicoUnidades) ||
      !isValidNumber(line.fisicoCajas) ||
      !isValidNumber(line.teoricoUnidades) ||
      !isValidNumber(line.teoricoCajas) ||
      (cantidadPorCaja !== null && !isValidNumber(cantidadPorCaja))
    ) {
      return NextResponse.json(
        { message: "Las cantidades deben ser validas." },
        { status: 400 }
      );
    }

    lineMap.set(line.itemId, {
      ...line,
      cantidadPorCaja,
    });
  }

  const totals = Array.from(lineMap.values()).reduce(
    (acc, line) => {
      acc.fisicoUnidades += line.fisicoUnidades;
      acc.fisicoCajas += line.fisicoCajas;
      acc.teoricoUnidades += line.teoricoUnidades;
      acc.teoricoCajas += line.teoricoCajas;
      return acc;
    },
    {
      fisicoUnidades: 0,
      fisicoCajas: 0,
      teoricoUnidades: 0,
      teoricoCajas: 0,
    }
  );

  const storedLines = Array.from(lineMap.values()).map((line) => {
    const cantidadPorCaja =
      line.cantidadPorCaja === null || line.cantidadPorCaja === undefined
        ? null
        : line.cantidadPorCaja;
    return {
    itemId: line.itemId,
    nombre: encryptString(line.nombre ?? ""),
    alfanumerico: encryptString(line.alfanumerico ?? ""),
    upc: encryptString(line.upc ?? ""),
    cantidadPorCaja:
      cantidadPorCaja === null ? null : encryptNumber(cantidadPorCaja),
    fisicoUnidades: encryptNumber(line.fisicoUnidades),
    fisicoCajas: encryptNumber(line.fisicoCajas),
    teoricoUnidades: encryptNumber(line.teoricoUnidades),
    teoricoCajas: encryptNumber(line.teoricoCajas),
    diferenciaUnidades: encryptNumber(line.fisicoUnidades - line.teoricoUnidades),
    diferenciaCajas: encryptNumber(line.fisicoCajas - line.teoricoCajas),
    };
  });

  const createdAt = new Date();
  await db.collection(COLLECTION_NAME).insertOne({
    username: encryptString(username),
    usernameHash: hashForSearch(username),
    ticketFolio: encryptString(ticketFolio),
    ticketFolioHash: hashForSearch(ticketFolio),
    lines: storedLines,
    totals: {
      fisicoUnidades: encryptNumber(totals.fisicoUnidades),
      fisicoCajas: encryptNumber(totals.fisicoCajas),
      teoricoUnidades: encryptNumber(totals.teoricoUnidades),
      teoricoCajas: encryptNumber(totals.teoricoCajas),
      diferenciaUnidades: encryptNumber(
        totals.fisicoUnidades - totals.teoricoUnidades
      ),
      diferenciaCajas: encryptNumber(totals.fisicoCajas - totals.teoricoCajas),
      items: storedLines.length,
    },
    createdAt,
  });

  return NextResponse.json({ ok: true });
}
