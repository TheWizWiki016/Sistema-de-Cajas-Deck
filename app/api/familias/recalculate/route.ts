import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/mongodb";
import {
  decryptString,
  encryptStringArray,
  hashForSearch,
} from "@/lib/crypto";

const FAMILIES_COLLECTION = "families";
const ITEMS_COLLECTION = "store_items";

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

export async function POST() {
  const authResponse = await requireSuperRoot();
  if (authResponse) {
    return authResponse;
  }

  const db = await getDb();
  const families = await db.collection(FAMILIES_COLLECTION).find({}).toArray();
  const familyRules: FamilyRule[] = families
    .map((familia) => ({
      prefix: decryptString(familia.prefix),
      name: decryptString(familia.name),
    }))
    .filter((rule) => rule.prefix && rule.name);

  const items = await db.collection(ITEMS_COLLECTION).find({}).toArray();
  if (items.length === 0) {
    return NextResponse.json({ updatedCount: 0 });
  }

  const operations = items.map((item) => {
    const alfanumerico = decryptString(item.alfanumerico);
    const familias = deriveFamilies(alfanumerico, familyRules);
    return {
      updateOne: {
        filter: { _id: item._id },
        update: { $set: { familias: encryptStringArray(familias) } },
      },
    };
  });

  const result = await db.collection(ITEMS_COLLECTION).bulkWrite(operations, {
    ordered: false,
  });

  return NextResponse.json({ updatedCount: result.modifiedCount });
}
