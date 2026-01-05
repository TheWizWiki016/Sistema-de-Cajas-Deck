import { NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/mongodb";
import { encryptString, hashForSearch } from "@/lib/crypto";

function hashPassword(password: string, salt: string) {
  return crypto
    .pbkdf2Sync(password, salt, 100000, 32, "sha256")
    .toString("hex");
}

function generateSalt() {
  return crypto.randomBytes(16).toString("hex");
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
  const superRoot = await db.collection("users").findOne(
    { roleHash: hashForSearch("super-root") },
    { projection: { _id: 1 } }
  );

  if (superRoot) {
    return NextResponse.json(
      { ok: false, message: "Ya existe super root." },
      { status: 403 }
    );
  }

  const existing = await db.collection("users").findOne(
    { usernameHash: hashForSearch(username) },
    { projection: { _id: 1 } }
  );
  if (existing) {
    return NextResponse.json(
      { ok: false, message: "El usuario ya existe." },
      { status: 409 }
    );
  }

  const salt = generateSalt();
  const hash = hashPassword(password, salt);
  const userDoc = {
    username: encryptString(username),
    usernameHash: hashForSearch(username),
    role: encryptString("super-root"),
    roleHash: hashForSearch("super-root"),
    passwordHash: encryptString(hash),
    passwordSalt: encryptString(salt),
    createdAt: new Date(),
  };

  await db.collection("users").insertOne(userDoc);

  return NextResponse.json({ ok: true, role: "super-root" });
}
