import { NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/mongodb";
import { decryptString, encryptString, hashForSearch } from "@/lib/crypto";

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

  if (storedHash && storedSalt) {
    return NextResponse.json(
      { ok: false, message: "El usuario ya tiene contrasena." },
      { status: 409 }
    );
  }

  const salt = generateSalt();
  const hash = hashPassword(password, salt);

  await db.collection("users").updateOne(
    { _id: user._id },
    {
      $set: {
        passwordHash: encryptString(hash),
        passwordSalt: encryptString(salt),
        updatedAt: new Date(),
      },
    }
  );

  return NextResponse.json({ ok: true });
}
