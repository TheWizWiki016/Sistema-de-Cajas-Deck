import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/mongodb";
import { decryptString, encryptString, hashForSearch } from "@/lib/crypto";
import { DEFAULT_THEME_ID, THEME_PRESETS } from "@/lib/themes";
import { ANIMATION_PRESETS, DEFAULT_ANIMATION_ID } from "@/lib/animations";

const COLLECTION_NAME = "settings";
const SETTINGS_KEY = "global";

type DashboardSettings = {
  columns: number;
  order: string[];
  adminOrder: string[];
};

type GlobalSettings = {
  themeId: string;
  animationStyle: string;
  dashboard: DashboardSettings;
};

const DEFAULT_DASHBOARD: DashboardSettings = {
  columns: 3,
  order: [],
  adminOrder: [],
};

const DEFAULT_SETTINGS: GlobalSettings = {
  themeId: DEFAULT_THEME_ID,
  animationStyle: DEFAULT_ANIMATION_ID,
  dashboard: DEFAULT_DASHBOARD,
};

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

  return { db };
}

function resolveThemeId(value: unknown) {
  if (typeof value !== "string") {
    return DEFAULT_THEME_ID;
  }
  const exists = THEME_PRESETS.some((theme) => theme.id === value);
  return exists ? value : DEFAULT_THEME_ID;
}

function resolveAnimationStyle(value: unknown) {
  if (typeof value !== "string") {
    return DEFAULT_ANIMATION_ID;
  }
  const exists = ANIMATION_PRESETS.some((preset) => preset.id === value);
  return exists ? value : DEFAULT_ANIMATION_ID;
}

function normalizeDashboard(input: unknown): DashboardSettings {
  if (!input || typeof input !== "object") {
    return DEFAULT_DASHBOARD;
  }
  const raw = input as Partial<DashboardSettings>;
  const columns = Number(raw.columns);
  const normalizedColumns =
    Number.isFinite(columns) && columns >= 1 && columns <= 4 ? columns : 3;
  const order = Array.isArray(raw.order)
    ? raw.order.filter((value) => typeof value === "string")
    : [];
  const adminOrder = Array.isArray(raw.adminOrder)
    ? raw.adminOrder.filter((value) => typeof value === "string")
    : [];
  return { columns: normalizedColumns, order, adminOrder };
}

export async function GET() {
  const db = await getDb();
  const doc = await db
    .collection(COLLECTION_NAME)
    .findOne({ key: SETTINGS_KEY });

  if (!doc) {
    return NextResponse.json(DEFAULT_SETTINGS);
  }

  return NextResponse.json({
    themeId: resolveThemeId(decryptString(doc.themeId)),
    animationStyle: resolveAnimationStyle(doc.animationStyle),
    dashboard: normalizeDashboard(doc.dashboard),
  });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { db } = auth;
  const body = await request.json();
  const themeId = resolveThemeId(body?.themeId);
  const animationStyle = resolveAnimationStyle(body?.animationStyle);
  const dashboard = normalizeDashboard(body?.dashboard);

  await db.collection(COLLECTION_NAME).updateOne(
    { key: SETTINGS_KEY },
    {
      $set: {
        key: SETTINGS_KEY,
        themeId: encryptString(themeId),
        animationStyle,
        dashboard,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );

  return NextResponse.json({ ok: true, themeId, animationStyle, dashboard });
}
