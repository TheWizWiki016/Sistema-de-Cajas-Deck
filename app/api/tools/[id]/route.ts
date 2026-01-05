import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { getDb } from "@/lib/mongodb";
import { decryptString, encryptString, hashForSearch } from "@/lib/crypto";

type Context = {
  params: Promise<{ id: string }>;
};

async function requireSuperRoot() {
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

  const db = await getDb();
  const user = await db.collection("users").findOne(
    { usernameHash: hashForSearch(username) },
    { projection: { role: 1 } }
  );
  const role = user?.role ? decryptString(user.role) : "";
  if (role !== "super-root") {
    return {
      ok: false,
      response: NextResponse.json({ message: "No autorizado." }, { status: 403 }),
    };
  }

  return { ok: true };
}

export async function PUT(request: NextRequest, { params }: Context) {
  const auth = await requireSuperRoot();
  if (!auth.ok) {
    return auth.response!;
  }

  const { id } = await params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ message: "Id invalido." }, { status: 400 });
  }

  const body = await request.json();
  const label = typeof body?.label === "string" ? body.label.trim() : "";
  const description =
    typeof body?.description === "string" ? body.description.trim() : "";
  const visibleToUser = Boolean(body?.visibleToUser);

  if (!label) {
    return NextResponse.json({ message: "El nombre es obligatorio." }, { status: 400 });
  }

  const db = await getDb();
  const update = {
    label: encryptString(label),
    description: encryptString(description),
    visibleToUser,
    updatedAt: new Date(),
  };

  const result = await db.collection("tools").findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: update },
    { returnDocument: "after" }
  );

  if (!result?.value) {
    return NextResponse.json({ message: "Herramienta no encontrada." }, { status: 404 });
  }

  return NextResponse.json({
    tool: {
      _id: result.value._id.toString(),
      key: decryptString(result.value.key),
      label: decryptString(result.value.label),
      description: decryptString(result.value.description ?? ""),
      visibleToUser: result.value.visibleToUser,
    },
  });
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  const auth = await requireSuperRoot();
  if (!auth.ok) {
    return auth.response!;
  }

  const { id } = await params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ message: "Id invalido." }, { status: 400 });
  }

  const db = await getDb();
  const result = await db.collection("tools").deleteOne({ _id: new ObjectId(id) });

  if (result.deletedCount === 0) {
    return NextResponse.json({ message: "Herramienta no encontrada." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
