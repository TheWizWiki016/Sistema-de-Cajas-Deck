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
const FAMILIES_COLLECTION = "families";

type FamilyRule = {
  prefix: string;
  name: string;
};

function deriveFamilies(alfanumerico: string, rules: FamilyRule[]) {
  const normalized = alfanumerico.trim().toUpperCase();
  const activeRules =
    rules.length === 0 ? [{ prefix: "TA", name: "tabaco" }] : rules;
  const matches = activeRules.filter(
    (rule) => rule.prefix && normalized.startsWith(rule.prefix.toUpperCase())
  );
  const unique = new Map<string, string>();
  matches.forEach((rule) => {
    unique.set(rule.name.toLowerCase(), rule.name);
  });
  return Array.from(unique.values());
}

function normalizeFamilies(input: unknown) {
  if (!Array.isArray(input)) {
    return [];
  }
  const cleaned = input
    .filter((value) => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
  const unique = new Map<string, string>();
  cleaned.forEach((value) => unique.set(value.toLowerCase(), value));
  return Array.from(unique.values());
}

type NormalizedItem = {
  nombre: string;
  familias: string[];
  alfanumerico: string;
  codigoBarras?: string;
  upc?: string;
  cantidadPorCaja?: string | null;
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

function normalizeItem(
  input: any,
  allowMissingPrice: boolean,
  familyRules: FamilyRule[]
): NormalizeResult {
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
  const upcRaw = typeof input?.upc === "string" ? input.upc.trim() : "";
  const cantidadPorCajaRaw =
    input?.cantidadPorCaja ?? input?.cantidad_por_caja ?? null;
  const rawPrice = input?.precio;
  let precio: number | null = null;
  let cantidadPorCaja: number | null = null;

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
  if (
    cantidadPorCajaRaw !== null &&
    cantidadPorCajaRaw !== undefined &&
    cantidadPorCajaRaw !== ""
  ) {
    const parsed = Number(cantidadPorCajaRaw);
    if (Number.isNaN(parsed)) {
      return { ok: false, message: "Cantidad por caja invalida." };
    }
    cantidadPorCaja = parsed;
  }

  const now = new Date();
  const explicitFamilies = normalizeFamilies(input?.familias);
  const familias =
    explicitFamilies.length > 0
      ? explicitFamilies
      : deriveFamilies(alfanumerico, familyRules);

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
  if (upcRaw) {
    item.upc = encryptString(upcRaw);
  }
  if (cantidadPorCaja !== null) {
    item.cantidadPorCaja = encryptNumber(cantidadPorCaja);
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

export async function GET() {
  const authResponse = await requireSuperRoot();
  if (authResponse) {
    return authResponse;
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
    upc: decryptString(articulo.upc),
    cantidadPorCaja: decryptNumber(articulo.cantidadPorCaja),
    precio: decryptNumber(articulo.precio),
    createdAt: articulo.createdAt,
  }));

  return NextResponse.json({ articulos: serialized });
}

export async function POST(request: NextRequest) {
  const authResponse = await requireSuperRoot();
  if (authResponse) {
    return authResponse;
  }

  const body = await request.json();
  const itemsPayload = Array.isArray(body) ? body : body?.items;
  const isBulk = Array.isArray(itemsPayload);

  try {
    const db = await getDb();
    const families = await db.collection(FAMILIES_COLLECTION).find({}).toArray();
    const familyRules: FamilyRule[] = families
      .map((familia) => ({
        prefix: decryptString(familia.prefix),
        name: decryptString(familia.name),
      }))
      .filter((rule) => rule.prefix && rule.name);
    if (isBulk) {
      const payload = itemsPayload as any[];
      const normalized: NormalizedItem[] = [];

      for (let i = 0; i < payload.length; i += 1) {
        const result = normalizeItem(payload[i], true, familyRules);
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

    const normalized = normalizeItem(body, false, familyRules);
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
        upc: normalized.item.upc ? decryptString(normalized.item.upc) : "",
        cantidadPorCaja: decryptNumber(normalized.item.cantidadPorCaja),
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
