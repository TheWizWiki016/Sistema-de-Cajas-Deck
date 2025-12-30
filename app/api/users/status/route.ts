import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function GET() {
  const db = await getDb();
  const admin = await db.collection("users").findOne(
    { role: "admin" },
    { projection: { _id: 1 } }
  );

  return NextResponse.json({
    hasAdmin: Boolean(admin),
  });
}
