import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

type Params = {
  params: { id: string };
};

export async function PUT(request: Request, { params }: Params) {
  const { id } = params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ message: "Id invalido." }, { status: 400 });
  }

  const body = await request.json();
  const label = typeof body?.label === "string" ? body.label.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const visibleToUser = Boolean(body?.visibleToUser);

  if (!label) {
    return NextResponse.json({ message: "El nombre es obligatorio." }, { status: 400 });
  }

  const db = await getDb();
  const update = {
    label,
    description,
    visibleToUser,
    updatedAt: new Date(),
  };

  const result = await db.collection("tools").findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: update },
    { returnDocument: "after" }
  );

  if (!result?.value) {
    return NextResponse.json({ message: "Herramienta no encontrada." }, { status: 404 });
  }

  return NextResponse.json({
    tool: {
      ...result.value,
      _id: result.value._id.toString(),
    },
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ message: "Id invalido." }, { status: 400 });
  }

  const db = await getDb();
  const result = await db.collection("tools").deleteOne({ _id: new ObjectId(id) });

  if (result.deletedCount === 0) {
    return NextResponse.json({ message: "Herramienta no encontrada." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
