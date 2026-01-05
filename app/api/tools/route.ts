import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/mongodb";
import { decryptString, encryptString, hashForSearch } from "@/lib/crypto";

type AuthResult =
  | { ok: true; username: string }
  | { ok: false; response: NextResponse };

function slugify(input: string) {
  const cleaned = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return cleaned || "tool";
}

async function requireAuth(): Promise<AuthResult> {
  const cookieStore = await cookies();
  const username = cookieStore.get("deck_user")?.value;
  if (!username) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Usuario no autenticado." },
        { status: 401 }
      ),
    };
  }
  return { ok: true, username };
}

async function requireSuperRoot(): Promise<AuthResult> {
  const auth = await requireAuth();
  if (!auth.ok) {
    return auth;
  }

  const db = await getDb();
  const user = await db.collection("users").findOne(
    { usernameHash: hashForSearch(auth.username) },
    { projection: { role: 1 } }
  );
  const role = user?.role ? decryptString(user.role) : "";

  if (role !== "super-root") {
    return {
      ok: false,
      response: NextResponse.json({ message: "No autorizado." }, { status: 403 }),
    };
  }

  return { ok: true, username: auth.username };
}

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) {
    return auth.response;
  }

  const db = await getDb();
  const url = new URL(request.url);
  const visible = url.searchParams.get("visible") === "1";
  const query = visible ? { visibleToUser: true } : {};

  const tools = await db
    .collection("tools")
    .find(query)
    .sort({ createdAt: 1 })
    .toArray();
  const serialized = tools.map((tool) => ({
    _id: tool._id.toString(),
    key: decryptString(tool.key),
    label: decryptString(tool.label),
    description: decryptString(tool.description ?? ""),
    visibleToUser: tool.visibleToUser,
  }));

  return NextResponse.json({ tools: serialized });
}

export async function POST(request: Request) {
  const auth = await requireSuperRoot();
  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json();
  const label = typeof body?.label === "string" ? body.label.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";

  if (!label) {
    return NextResponse.json(
      { message: "El nombre de la herramienta es obligatorio." },
      { status: 400 }
    );
  }

  const db = await getDb();
  const baseKey = slugify(label);
  let key = baseKey;
  let counter = 1;
  let keyHash = hashForSearch(key);

  while (await db.collection("tools").findOne({ keyHash })) {
    key = `${baseKey}-${counter}`;
    keyHash = hashForSearch(key);
    counter += 1;
  }

  const tool = {
    key: encryptString(key),
    keyHash,
    label: encryptString(label),
    description: encryptString(description),
    visibleToUser: true,
    createdAt: new Date(),
  };

  const result = await db.collection("tools").insertOne(tool);

  return NextResponse.json({
    tool: {
      key,
      label,
      description,
      visibleToUser: tool.visibleToUser,
      createdAt: tool.createdAt,
      _id: result.insertedId.toString(),
    },
  });
}
