import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/mongodb";

export async function POST(request: Request) {
  const username = cookies().get("deck_user")?.value;
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

  if (fondoValidado && (fondoCantidad === undefined || Number.isNaN(fondoCantidad))) {
    return NextResponse.json(
      { message: "Cantidad de fondo requerida." },
      { status: 400 }
    );
  }

  const pendientes = Array.isArray(body?.pendientes)
    ? body.pendientes.map((task: any) => ({
        text: typeof task?.text === "string" ? task.text.trim() : "",
        done: Boolean(task?.done),
      }))
    : [];

  const db = await getDb();
  await db.collection("cash_cuts").insertOne({
    username,
    corteTeorico,
    corteReal,
    diferencia: Number.isNaN(diferencia) ? corteReal - corteTeorico : diferencia,
    depositado,
    pico: Number.isNaN(pico) ? corteReal - depositado : pico,
    pendientes,
    fondoValidado,
    fondoCantidad: fondoValidado ? fondoCantidad : undefined,
    createdAt: new Date(),
  });

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const username = cookies().get("deck_user")?.value;
  if (!username) {
    return NextResponse.json(
      { message: "Usuario no autenticado." },
      { status: 401 }
    );
  }

  const db = await getDb();
  const cortes = await db
    .collection("cash_cuts")
    .find({ username })
    .sort({ createdAt: -1 })
    .limit(30)
    .toArray();

  const serialized = cortes.map((corte) => ({
    ...corte,
    _id: corte._id.toString(),
  }));

  return NextResponse.json({ cortes: serialized });
}
