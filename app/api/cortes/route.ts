import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/mongodb";
import {
  decryptBoolean,
  decryptNumber,
  decryptString,
  encryptBoolean,
  encryptNumber,
  encryptString,
  hashForSearch,
} from "@/lib/crypto";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const username = cookieStore.get("deck_user")?.value;

  if (!username) {
    return NextResponse.json(
      { message: "Usuario no autenticado." },
      { status: 401 }
    );
  }

  const body = await request.json();
  const corteTeorico = Number(body?.corteTeorico);
  const corteReal = Number(body?.corteReal);
  const diferencia = Number(body?.diferencia);
  const depositado = Number(body?.depositado);
  const pico = Number(body?.pico);
  const fondoValidado = Boolean(body?.fondoValidado);
  const fondoCantidad =
    body?.fondoCantidad !== undefined ? Number(body.fondoCantidad) : undefined;

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

  const pendientes = Array.isArray(body?.pendientes)
    ? body.pendientes.map((task: any) => ({
        text: encryptString(
          typeof task?.text === "string" ? task.text.trim() : ""
        ),
        done: encryptBoolean(Boolean(task?.done)),
      }))
    : [];

  const db = await getDb();
  const diferenciaFinal = Number.isNaN(diferencia)
    ? corteReal - corteTeorico
    : diferencia;
  const picoFinal = Number.isNaN(pico) ? corteReal - depositado : pico;

  await db.collection("cash_cuts").insertOne({
    username: encryptString(username),
    usernameHash: hashForSearch(username),
    corteTeorico: encryptNumber(corteTeorico),
    corteReal: encryptNumber(corteReal),
    diferencia: encryptNumber(diferenciaFinal),
    depositado: encryptNumber(depositado),
    pico: encryptNumber(picoFinal),
    pendientes,
    fondoValidado: encryptBoolean(fondoValidado),
    fondoCantidad:
      fondoValidado && fondoCantidad !== undefined
        ? encryptNumber(fondoCantidad)
        : undefined,
    createdAt: new Date(),
  });

  return NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const username = cookieStore.get("deck_user")?.value;

  if (!username) {
    return NextResponse.json(
      { message: "Usuario no autenticado." },
      { status: 401 }
    );
  }

  const db = await getDb();
  const url = new URL(request.url);
  const wantsAll = url.searchParams.get("all") === "1";
  const user = await db.collection("users").findOne(
    { usernameHash: hashForSearch(username) },
    { projection: { role: 1 } }
  );
  const role = user?.role ? decryptString(user.role) : "";

  if (wantsAll && role !== "admin") {
    return NextResponse.json({ message: "No autorizado." }, { status: 403 });
  }

  const query =
    wantsAll && role === "admin"
      ? {}
      : { usernameHash: hashForSearch(username) };

  const cortes = await db
    .collection("cash_cuts")
    .find(query)
    .sort({ createdAt: -1 })
    .limit(60)
    .toArray();

  const serialized = cortes.map((corte) => ({
    _id: corte._id.toString(),
    username: decryptString(corte.username),
    corteTeorico: decryptNumber(corte.corteTeorico) ?? 0,
    corteReal: decryptNumber(corte.corteReal) ?? 0,
    diferencia: decryptNumber(corte.diferencia) ?? 0,
    depositado: decryptNumber(corte.depositado) ?? 0,
    pico: decryptNumber(corte.pico) ?? 0,
    fondoValidado: decryptBoolean(corte.fondoValidado),
    fondoCantidad: decryptNumber(corte.fondoCantidad),
    pendientes: Array.isArray(corte.pendientes)
      ? corte.pendientes.map((task: any) => ({
          text: decryptString(task?.text),
          done: decryptBoolean(task?.done),
        }))
      : [],
    createdAt: corte.createdAt,
  }));

  return NextResponse.json({ cortes: serialized });
}
