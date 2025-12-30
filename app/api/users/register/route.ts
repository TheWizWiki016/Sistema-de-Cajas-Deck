import { NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/mongodb";

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 100000, 32, "sha256")
    .toString("hex");
  return { salt, hash };
}

export async function POST(request: Request) {
  const body = await request.json();
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!username || !password) {
    return NextResponse.json(
      { ok: false, message: "Usuario y contrasena son requeridos." },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { ok: false, message: "La contrasena debe tener al menos 6 caracteres." },
      { status: 400 }
    );
  }

  const db = await getDb();
  const admin = await db.collection("users").findOne(
    { role: "admin" },
    { projection: { _id: 1 } }
  );
  const role = admin ? "usuario" : "admin";
  const { salt, hash } = hashPassword(password);

  try {
    await db.collection("users").insertOne({
      username,
      role,
      passwordHash: hash,
      passwordSalt: salt,
      createdAt: new Date(),
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      return NextResponse.json(
        { ok: false, message: "El usuario ya existe." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { ok: false, message: "No se pudo registrar." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    role,
    message: role === "admin" ? "Admin creado." : "Usuario creado.",
  });
}
