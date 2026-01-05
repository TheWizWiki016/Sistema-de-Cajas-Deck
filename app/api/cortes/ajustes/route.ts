import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { getDb } from "@/lib/mongodb";
import {
  decryptString,
  encryptBoolean,
  encryptNumber,
  encryptString,
  hashForSearch,
} from "@/lib/crypto";

async function requireAdmin() {
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
  const isAdmin = role === "admin" || role === "super-root";

  if (!isAdmin) {
    return NextResponse.json({ message: "No autorizado." }, { status: 403 });
  }

  return { db, username };
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const body = await request.json();
  const originalId =
    typeof body?.originalId === "string" ? body.originalId.trim() : "";
  if (!ObjectId.isValid(originalId)) {
    return NextResponse.json({ message: "Id invalido." }, { status: 400 });
  }

  const caja = typeof body?.caja === "string" ? body.caja.trim() : "";
  const corteTeorico = Number(body?.corteTeorico);
  const corteReal = Number(body?.corteReal);
  const diferencia = Number(body?.diferencia);
  const depositado = Number(body?.depositado);
  const pico = Number(body?.pico);
  const fondoValidado = Boolean(body?.fondoValidado);
  const fondoCantidad =
    body?.fondoCantidad !== undefined ? Number(body.fondoCantidad) : undefined;
  const note = typeof body?.note === "string" ? body.note.trim() : "";

  if (!caja) {
    return NextResponse.json(
      { message: "La caja es requerida." },
      { status: 400 }
    );
  }

  if (Number.isNaN(corteTeorico) || Number.isNaN(corteReal)) {
    return NextResponse.json(
      { message: "Corte teorico y corte real son requeridos." },
      { status: 400 }
    );
  }

  if (Number.isNaN(depositado)) {
    return NextResponse.json(
      { message: "Monto depositado es requerido." },
      { status: 400 }
    );
  }

  if (
    fondoValidado &&
    (fondoCantidad === undefined || Number.isNaN(fondoCantidad))
  ) {
    return NextResponse.json(
      { message: "Cantidad de fondo requerida." },
      { status: 400 }
    );
  }

  const { db, username } = auth;
  const original = await db.collection("cash_cuts").findOne({
    _id: new ObjectId(originalId),
  });

  if (!original || original.isAdjustment) {
    return NextResponse.json(
      { message: "Corte original no encontrado." },
      { status: 404 }
    );
  }

  const diferenciaFinal = Number.isNaN(diferencia)
    ? corteReal - corteTeorico
    : diferencia;
  const picoFinal = Number.isNaN(pico) ? corteReal - depositado : pico;

  await db.collection("cash_cuts").insertOne({
    username: original.username,
    usernameHash: original.usernameHash,
    caja: encryptString(caja),
    corteTeorico: encryptNumber(corteTeorico),
    corteReal: encryptNumber(corteReal),
    diferencia: encryptNumber(diferenciaFinal),
    depositado: encryptNumber(depositado),
    pico: encryptNumber(picoFinal),
    pendientes: Array.isArray(original.pendientes) ? original.pendientes : [],
    fondoValidado: encryptBoolean(fondoValidado),
    fondoCantidad:
      fondoValidado && fondoCantidad !== undefined
        ? encryptNumber(fondoCantidad)
        : undefined,
    isAdjustment: true,
    originalId: original._id,
    adjustedBy: encryptString(username),
    adjustedByHash: hashForSearch(username),
    adjustmentNote: note ? encryptString(note) : undefined,
    createdAt: new Date(),
  });

  return NextResponse.json({ ok: true });
}
