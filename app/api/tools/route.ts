import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

function slugify(input: string) {
  const cleaned = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return cleaned || "tool";
}

export async function GET(request: Request) {
  const db = await getDb();
  const url = new URL(request.url);
  const visible = url.searchParams.get("visible") === "1";
  const query = visible ? { visibleToUser: true } : {};

  const tools = await db.collection("tools").find(query).sort({ createdAt: 1 }).toArray();
  const serialized = tools.map((tool) => ({
    ...tool,
    _id: tool._id.toString(),
  }));

  return NextResponse.json({ tools: serialized });
}

export async function POST(request: Request) {
  const body = await request.json();
  const label = typeof body?.label === "string" ? body.label.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";

  if (!label) {
    return NextResponse.json(
      { message: "El nombre de la herramienta es obligatorio." },
      { status: 400 }
    );
  }

  const db = await getDb();
  const baseKey = slugify(label);
  let key = baseKey;
  let counter = 1;

  while (await db.collection("tools").findOne({ key })) {
    key = `${baseKey}-${counter}`;
    counter += 1;
  }

  const tool = {
    key,
    label,
    description,
    visibleToUser: true,
    createdAt: new Date(),
  };

  const result = await db.collection("tools").insertOne(tool);

  return NextResponse.json({
    tool: {
      ...tool,
      _id: result.insertedId.toString(),
    },
  });
}
