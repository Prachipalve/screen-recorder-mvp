import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

export async function GET(
  req: Request,
  context: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await context.params;

    const filePath = path.join(process.cwd(), "uploads", filename);
    const file = await fs.readFile(filePath);

    return new NextResponse(file, {
      headers: {
        "Content-Type": "video/webm",
        "Content-Disposition": "inline",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
