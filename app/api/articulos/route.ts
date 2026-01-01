import { NextRequest, NextResponse } from "next/server";
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

type NormalizedItem = {
  nombre: string;
  familias: string[];
  alfanumerico: string;
  codigoBarras?: string;
  precio: number | null;
  createdAt: Date;
  updatedAt: Date;
};

function normalizeItem(input: any, allowMissingPrice: boolean) {
  const nombre =
    typeof input?.nombre === "string" ? input.nombre.trim() : "";
  const alfanumerico =
    typeof input?.alfanumerico === "string" ? input.alfanumerico.trim() : "";
  const codigoBarrasRaw =
    typeof input?.codigoBarras === "string"
      ? input.codigoBarras.trim()
      : typeof input?.codigo_barras === "string"
      ? input.codigo_barras.trim()
      : "";
  const rawPrice = input?.precio;
  let precio: number | null = null;

  if (!alfanumerico) {
    return { ok: false, message: "El codigo alfanumerico es obligatorio." };
  }

  if (rawPrice === undefined || rawPrice === null || rawPrice === "") {
    if (!allowMissingPrice) {
      return { ok: false, message: "El precio es obligatorio." };
    }
  } else {
    const parsed = Number(rawPrice);
    if (Number.isNaN(parsed)) {
      return { ok: false, message: "El precio es obligatorio." };
    }
    precio = parsed;
  }

  const now = new Date();
  const familias = deriveFamilies(alfanumerico);

  return {
    ok: true,
    item: {
      nombre,
      familias,
      alfanumerico,
      codigoBarras: codigoBarrasRaw || undefined,
      precio,
      createdAt: now,
      updatedAt: now,
    } as NormalizedItem,
  };
}

function isDuplicateError(error: unknown) {
  return typeof error === "object" && error !== null && (error as any).code === 11000;
}

export async function GET() {
  const cookieStore = await cookies();
  const username = cookieStore.get("deck_user")?.value;

  if (!username) {
    return NextResponse.json(
      { message: "Usuario no autenticado." },
      { status: 401 }
    );
  }

  const db = await getDb();
  const articulos = await db
    .collection(COLLECTION_NAME)
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  const serialized = articulos.map((articulo) => ({
    ...articulo,
    _id: articulo._id.toString(),
  }));

  return NextResponse.json({ articulos: serialized });
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const username = cookieStore.get("deck_user")?.value;

  if (!username) {
    return NextResponse.json(
      { message: "Usuario no autenticado." },
      { status: 401 }
    );
  }

  const body = await request.json();
  const itemsPayload = Array.isArray(body) ? body : body?.items;
  const isBulk = Array.isArray(itemsPayload);

  try {
    const db = await getDb();
    if (isBulk) {
      const payload = itemsPayload as any[];
      const normalized: NormalizedItem[] = [];

      for (let i = 0; i < payload.length; i += 1) {
        const result = normalizeItem(payload[i], true);
        if (!result.ok) {
          return NextResponse.json(
            { message: `Item ${i + 1}: ${result.message}` },
            { status: 400 }
          );
        }
        normalized.push(result.item);
      }

      const insertResult = await db
        .collection(COLLECTION_NAME)
        .insertMany(normalized, { ordered: true });

      return NextResponse.json({
        insertedCount: insertResult.insertedCount,
      });
    }

    const normalized = normalizeItem(body, false);
    if (!normalized.ok) {
      return NextResponse.json({ message: normalized.message }, { status: 400 });
    }

    const result = await db
      .collection(COLLECTION_NAME)
      .insertOne(normalized.item);

    return NextResponse.json({
      articulo: {
        ...normalized.item,
        _id: result.insertedId.toString(),
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
      { message: "No se pudo guardar el articulo." },
      { status: 500 }
    );
  }
}
