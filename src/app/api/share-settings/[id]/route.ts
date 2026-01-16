import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

type SettingsRecord = {
  allowDownload: boolean;
};

type SettingsDB = Record<string, SettingsRecord>;

const filePath = path.join(process.cwd(), "share-settings.json");

async function readDB(): Promise<SettingsDB> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeDB(db: SettingsDB) {
  await fs.writeFile(filePath, JSON.stringify(db, null, 2), "utf-8");
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const db = await readDB();

  return NextResponse.json(db[id] ?? { allowDownload: true });
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = await req.json();

  const db = await readDB();

  db[id] = {
    allowDownload: Boolean(body.allowDownload),
  };

  await writeDB(db);

  return NextResponse.json(db[id]);
}
