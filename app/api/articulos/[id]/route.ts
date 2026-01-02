import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { getDb } from "@/lib/mongodb";
import {
  decryptNumber,
  decryptString,
  decryptStringArray,
  encryptNumber,
  encryptString,
  encryptStringArray,
  hashForSearch,
} from "@/lib/crypto";

const COLLECTION_NAME = "store_items";

function deriveFamilies(alfanumerico: string) {
  const normalized = alfanumerico.trim().toUpperCase();
  if (normalized.startsWith("TA")) {
    return ["tabaco"];
  }
  return [];
}

function isDuplicateError(error: unknown) {
  return typeof error === "object" && error !== null && (error as any).code === 11000;
}

type Context = {
  params: Promise<{ id: string }>;
};

async function requireAdmin() {
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

  if (role !== "admin") {
    return NextResponse.json({ message: "No autorizado." }, { status: 403 });
  }

  return null;
}

export async function PUT(request: NextRequest, { params }: Context) {
  const adminResponse = await requireAdmin();
  if (adminResponse) {
    return adminResponse;
  }

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ message: "Id invalido." }, { status: 400 });
  }

  const body = await request.json();
  const nombre = typeof body?.nombre === "string" ? body.nombre.trim() : "";
  const alfanumerico =
    typeof body?.alfanumerico === "string" ? body.alfanumerico.trim() : "";
  const codigoBarrasRaw =
    typeof body?.codigoBarras === "string"
      ? body.codigoBarras.trim()
      : typeof body?.codigo_barras === "string"
      ? body.codigo_barras.trim()
      : "";
  const rawPrice = body?.precio;
  let precio: number | null = null;

  if (!alfanumerico) {
    return NextResponse.json(
      { message: "El codigo alfanumerico es obligatorio." },
      { status: 400 }
    );
  }

  if (rawPrice !== undefined && rawPrice !== null && rawPrice !== "") {
    const parsed = Number(rawPrice);
    if (Number.isNaN(parsed)) {
      return NextResponse.json(
        { message: "El precio es obligatorio." },
        { status: 400 }
      );
    }
    precio = parsed;
  }

  const familias = deriveFamilies(alfanumerico);
  const update: Record<string, any> = {
    nombre: encryptString(nombre),
    nombreHash: nombre ? hashForSearch(nombre) : undefined,
    familias: encryptStringArray(familias),
    alfanumerico: encryptString(alfanumerico),
    alfanumericoHash: hashForSearch(alfanumerico),
    precio: precio === null ? null : encryptNumber(precio),
    updatedAt: new Date(),
  };
  if (!nombre) {
    delete update.nombreHash;
  }

  const updateDoc: Record<string, any> = { $set: update };
  if (codigoBarrasRaw) {
    updateDoc.$set.codigoBarras = encryptString(codigoBarrasRaw);
    updateDoc.$set.codigoBarrasHash = hashForSearch(codigoBarrasRaw);
  } else {
    updateDoc.$unset = { codigoBarras: "", codigoBarrasHash: "" };
  }

  try {
    const db = await getDb();
    const result = await db.collection(COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(id) },
      updateDoc,
      { returnDocument: "after" }
    );

    if (!result?.value) {
      return NextResponse.json(
        { message: "Articulo no encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      articulo: {
        _id: result.value._id.toString(),
        nombre: decryptString(result.value.nombre),
        familias: decryptStringArray(result.value.familias),
        alfanumerico: decryptString(result.value.alfanumerico),
        codigoBarras: decryptString(result.value.codigoBarras),
        precio: decryptNumber(result.value.precio),
      },
    });
  } catch (error) {
    if (isDuplicateError(error)) {
      const key = (error as any).keyPattern
        ? Object.keys((error as any).keyPattern)[0]
        : "codigo";
      const field =
        key === "codigoBarrasHash" || key === "codigoBarras"
          ? "codigo de barras"
          : "alfanumerico";
      return NextResponse.json(
        { message: `El ${field} ya existe.` },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { message: "No se pudo actualizar el articulo." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  const adminResponse = await requireAdmin();
  if (adminResponse) {
    return adminResponse;
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
      { message: "Articulo no encontrado." },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}
