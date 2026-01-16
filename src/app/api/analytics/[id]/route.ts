import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

type AnalyticsRecord = {
  views: number;
  completionSum: number;
  completionCount: number;
  watchTimeline: number[]; // watch counts per second
};

type AnalyticsDB = Record<string, AnalyticsRecord>;

const filePath = path.join(process.cwd(), "analytics.json");

async function readDB(): Promise<AnalyticsDB> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeDB(db: AnalyticsDB) {
  await fs.writeFile(filePath, JSON.stringify(db, null, 2), "utf-8");
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const db = await readDB();

  const record = db[id];

  if (!record) {
    return NextResponse.json({ views: 0, completionAvg: 0, watchTimeline: [] });
  }

  const completionAvg =
    record.completionCount === 0
      ? 0
      : record.completionSum / record.completionCount;

  return NextResponse.json({
    views: record.views,
    completionAvg,
    watchTimeline: record.watchTimeline ?? [],
  });
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = await req.json();

  const db = await readDB();

  if (!db[id]) {
    db[id] = { views: 0, completionSum: 0, completionCount: 0, watchTimeline: [] };
  }

  // 1) Track views
  if (body.event === "view") {
    db[id].views += 1;
  }

  // 2) Track completion %
  if (body.event === "completion") {
    const percent = Number(body.percent);
    if (!isNaN(percent)) {
      db[id].completionSum += percent;
      db[id].completionCount += 1;
    }
  }

  // 3) Track watch heatmap progress
  if (body.event === "progress") {
    const second = Number(body.second);

    if (!isNaN(second) && second >= 0) {
      const sec = Math.floor(second);

      if (!db[id].watchTimeline[sec]) db[id].watchTimeline[sec] = 0;
      db[id].watchTimeline[sec] += 1;
    }
  }

  await writeDB(db);

  const completionAvg =
    db[id].completionCount === 0
      ? 0
      : db[id].completionSum / db[id].completionCount;

  return NextResponse.json({
    views: db[id].views,
    completionAvg,
    watchTimeline: db[id].watchTimeline ?? [],
  });
}
