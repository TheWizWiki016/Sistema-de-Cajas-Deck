import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { hashForSearch } from "@/lib/crypto";

export async function GET() {
  const db = await getDb();
  const admin = await db.collection("users").findOne(
    { roleHash: hashForSearch("admin") },
    { projection: { _id: 1 } }
  );

  return NextResponse.json({
    hasAdmin: Boolean(admin),
  });
}
