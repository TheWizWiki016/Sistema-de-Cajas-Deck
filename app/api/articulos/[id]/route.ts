import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { getDb } from "@/lib/mongodb";

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

export async function PUT(request: NextRequest, { params }: Context) {
  const cookieStore = await cookies();
  const username = cookieStore.get("deck_user")?.value;

  if (!username) {
    return NextResponse.json(
      { message: "Usuario no autenticado." },
      { status: 401 }
    );
  }

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ message: "Id invalido." }, { status: 400 });
  }

  const body = await request.json();
  const nombre =
    typeof body?.nombre === "string" ? body.nombre.trim() : "";
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

  const update = {
    nombre,
    familias,
    alfanumerico,
    precio,
    updatedAt: new Date(),
  };
  const updateDoc: Record<string, any> = { $set: update };
  if (codigoBarrasRaw) {
    updateDoc.$set.codigoBarras = codigoBarrasRaw;
  } else {
    updateDoc.$unset = { codigoBarras: "" };
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
        ...result.value,
        _id: result.value._id.toString(),
      },
    });
  } catch (error) {
    if (isDuplicateError(error)) {
      const key = (error as any).keyPattern
        ? Object.keys((error as any).keyPattern)[0]
        : "codigo";
      const field = key === "codigoBarras" ? "codigo de barras" : "alfanumerico";
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
  const cookieStore = await cookies();
  const username = cookieStore.get("deck_user")?.value;

  if (!username) {
    return NextResponse.json(
      { message: "Usuario no autenticado." },
      { status: 401 }
    );
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
  const familias = deriveFamilies(alfanumerico);
