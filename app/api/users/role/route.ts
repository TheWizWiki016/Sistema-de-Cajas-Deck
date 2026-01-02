import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { decryptString, hashForSearch } from "@/lib/crypto";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const username = url.searchParams.get("username")?.trim();

  if (!username) {
    return NextResponse.json({ role: null }, { status: 400 });
  }

  const db = await getDb();
  const user = await db.collection("users").findOne(
    { usernameHash: hashForSearch(username) },
    { projection: { role: 1 } }
  );

  return NextResponse.json({
    role: user?.role ? decryptString(user.role) : null,
  });
}
