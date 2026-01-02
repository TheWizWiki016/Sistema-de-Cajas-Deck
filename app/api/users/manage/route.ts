import { NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";
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

async function requireAdmin(db: any) {
  const cookieStore = await cookies();
  const username = cookieStore.get("deck_user")?.value;
  if (!username) {
    return { ok: false, response: NextResponse.json({ message: "No autorizado." }, { status: 401 }) };
  }

  const admin = await db.collection("users").findOne(
    { usernameHash: hashForSearch(username) },
    { projection: { role: 1 } }
  );
  const role = admin?.role ? decryptString(admin.role) : "";
  if (role !== "admin") {
    return { ok: false, response: NextResponse.json({ message: "No autorizado." }, { status: 403 }) };
  }

  return { ok: true };
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
  const adminCheck = await requireAdmin(db);
  if (!adminCheck.ok) {
    return adminCheck.response!;
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

  const userDoc: Record<string, any> = {
    username: encryptString(username),
    usernameHash: hashForSearch(username),
    role: encryptString("usuario"),
    roleHash: hashForSearch("usuario"),
    createdAt: new Date(),
  };

  if (password) {
    if (password.length < 6) {
      return NextResponse.json(
        { ok: false, message: "La contrasena debe tener al menos 6 caracteres." },
        { status: 400 }
      );
    }
    const salt = generateSalt();
    const hash = hashPassword(password, salt);
    userDoc.passwordHash = encryptString(hash);
    userDoc.passwordSalt = encryptString(salt);
  }

  await db.collection("users").insertOne(userDoc);

  return NextResponse.json({ ok: true });
}

export async function PUT(request: Request) {
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
  const adminCheck = await requireAdmin(db);
  if (!adminCheck.ok) {
    return adminCheck.response!;
  }

  const user = await db.collection("users").findOne(
    { usernameHash: hashForSearch(username) },
    { projection: { _id: 1 } }
  );
  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Usuario no encontrado." },
      { status: 404 }
    );
  }

  if (password && password.length < 6) {
    return NextResponse.json(
      { ok: false, message: "La contrasena debe tener al menos 6 caracteres." },
      { status: 400 }
    );
  }

  const updateDoc: Record<string, any> = { $set: { updatedAt: new Date() } };

  if (password) {
    const salt = generateSalt();
    const hash = hashPassword(password, salt);
    updateDoc.$set.passwordHash = encryptString(hash);
    updateDoc.$set.passwordSalt = encryptString(salt);
  } else {
    updateDoc.$unset = { passwordHash: "", passwordSalt: "" };
  }

  await db.collection("users").updateOne({ _id: user._id }, updateDoc);

  return NextResponse.json({ ok: true });
}
