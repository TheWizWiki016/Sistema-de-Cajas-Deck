import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { ok: false, message: "Registro deshabilitado." },
    { status: 403 }
  );
}
