import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { getDb } from "@/lib/mongodb";
import { decryptString, encryptString, hashForSearch } from "@/lib/crypto";

const COLLECTION_NAME = "families";

function isDuplicateError(error: unknown) {
  return typeof error === "object" && error !== null && (error as any).code === 11000;
}

type Context = {
  params: Promise<{ id: string }>;
};

async function requireSuperRoot() {
  const cookieStore = await cookies();
  const username = cookieStore.get("deck_user")?.value;

  if (!username) {
    return NextResponse.json(
      { message: "Usuario no autenticado." },
      { status: 401 }
    );
  }

  const db = await getDb();
  const user = await db.collection("users").findOne(
    { usernameHash: hashForSearch(username) },
    { projection: { role: 1 } }
  );
  const role = user?.role ? decryptString(user.role) : "";

  if (role !== "super-root") {
    return NextResponse.json({ message: "No autorizado." }, { status: 403 });
  }

  return null;
}

export async function PUT(request: NextRequest, { params }: Context) {
  const authResponse = await requireSuperRoot();
  if (authResponse) {
    return authResponse;
  }

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ message: "Id invalido." }, { status: 400 });
  }

  const body = await request.json();
  const prefixRaw = typeof body?.prefix === "string" ? body.prefix.trim() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const prefix = prefixRaw.toUpperCase();

  if (!prefix) {
    return NextResponse.json(
      { message: "El prefijo es obligatorio." },
      { status: 400 }
    );
  }

  if (!name) {
    return NextResponse.json(
      { message: "El nombre de la familia es obligatorio." },
      { status: 400 }
    );
  }

  try {
    const db = await getDb();
    const prefixHash = hashForSearch(prefix);
    const result = await db.collection(COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          prefix: encryptString(prefix),
          prefixHash,
          name: encryptString(name),
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );

    if (!result?.value) {
      return NextResponse.json(
        { message: "Familia no encontrada." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      familia: {
        _id: result.value._id.toString(),
        prefix: decryptString(result.value.prefix),
        name: decryptString(result.value.name),
        createdAt: result.value.createdAt,
      },
    });
  } catch (error) {
    if (isDuplicateError(error)) {
      return NextResponse.json(
        { message: "Ese prefijo ya esta registrado." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { message: "No se pudo actualizar la familia." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  const authResponse = await requireSuperRoot();
  if (authResponse) {
    return authResponse;
  }

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ message: "Id invalido." }, { status: 400 });
  }

  const db = await getDb();
  const result = await db
    .collection(COLLECTION_NAME)
    .deleteOne({ _id: new ObjectId(id) });

  if (result.deletedCount === 0) {
    return NextResponse.json(
      { message: "Familia no encontrada." },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}
