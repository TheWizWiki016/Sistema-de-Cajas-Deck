import { NextRequest, NextResponse } from "next/server";
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

type NormalizedItem = {
  nombre: string;
  familias: string[];
  alfanumerico: string;
  codigoBarras?: string;
  precio: string | null;
  nombreHash?: string;
  alfanumericoHash: string;
  codigoBarrasHash?: string;
  createdAt: Date;
  updatedAt: Date;
};

type NormalizeResult =
  | { ok: true; item: NormalizedItem }
  | { ok: false; message: string };

function normalizeItem(input: any, allowMissingPrice: boolean): NormalizeResult {
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

  const item: NormalizedItem = {
    nombre: encryptString(nombre),
    familias: encryptStringArray(familias),
    alfanumerico: encryptString(alfanumerico),
    precio: precio === null ? null : encryptNumber(precio),
    alfanumericoHash: hashForSearch(alfanumerico),
    createdAt: now,
    updatedAt: now,
  };

  if (codigoBarrasRaw) {
    item.codigoBarras = encryptString(codigoBarrasRaw);
    item.codigoBarrasHash = hashForSearch(codigoBarrasRaw);
  }

  if (nombre) {
    item.nombreHash = hashForSearch(nombre);
  }

  return {
    ok: true,
    item,
  };
}

function isDuplicateError(error: unknown) {
  return typeof error === "object" && error !== null && (error as any).code === 11000;
}

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

export async function GET() {
  const adminResponse = await requireAdmin();
  if (adminResponse) {
    return adminResponse;
  }

  const db = await getDb();
  const articulos = await db
    .collection(COLLECTION_NAME)
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  const serialized = articulos.map((articulo) => ({
    _id: articulo._id.toString(),
    nombre: decryptString(articulo.nombre),
    familias: decryptStringArray(articulo.familias),
    alfanumerico: decryptString(articulo.alfanumerico),
    codigoBarras: decryptString(articulo.codigoBarras),
    precio: decryptNumber(articulo.precio),
    createdAt: articulo.createdAt,
  }));

  return NextResponse.json({ articulos: serialized });
}

export async function POST(request: NextRequest) {
  const adminResponse = await requireAdmin();
  if (adminResponse) {
    return adminResponse;
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
        nombre: decryptString(normalized.item.nombre),
        familias: decryptStringArray(normalized.item.familias),
        alfanumerico: decryptString(normalized.item.alfanumerico),
        codigoBarras: normalized.item.codigoBarras
          ? decryptString(normalized.item.codigoBarras)
          : "",
        precio: decryptNumber(normalized.item.precio),
        _id: result.insertedId.toString(),
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
      { message: "No se pudo guardar el articulo." },
      { status: 500 }
    );
  }
}
