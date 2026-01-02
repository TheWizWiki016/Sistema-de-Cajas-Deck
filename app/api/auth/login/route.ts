import { NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/mongodb";
import { decryptString, hashForSearch } from "@/lib/crypto";

function hashPassword(password: string, salt: string) {
  return crypto
    .pbkdf2Sync(password, salt, 100000, 32, "sha256")
    .toString("hex");
}

export async function POST(request: Request) {
  const body = await request.json();
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!username) {
    return NextResponse.json(
      { ok: false, message: "Usuario requerido." },
      { status: 400 }
    );
  }

  const db = await getDb();
  const user = await db.collection("users").findOne(
    { usernameHash: hashForSearch(username) },
    { projection: { passwordHash: 1, passwordSalt: 1 } }
  );

  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Usuario no encontrado." },
      { status: 404 }
    );
  }

  const storedHash = decryptString(user.passwordHash ?? "");
  const storedSalt = decryptString(user.passwordSalt ?? "");

  if (!storedHash || !storedSalt) {
    return NextResponse.json({
      ok: true,
      requiresPassword: true,
    });
  }

  if (!password) {
    return NextResponse.json(
      { ok: false, message: "Contrasena requerida." },
      { status: 400 }
    );
  }

  const computed = hashPassword(password, storedSalt);
  if (computed !== storedHash) {
    return NextResponse.json(
      { ok: false, message: "Credenciales invalidas." },
      { status: 401 }
    );
  }

  return NextResponse.json({ ok: true, requiresPassword: false });
}
