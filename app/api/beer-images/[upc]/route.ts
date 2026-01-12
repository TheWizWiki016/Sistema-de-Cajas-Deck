import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

function contentTypeForExtension(ext: string) {
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ upc: string }> }
) {
  const { upc } = await context.params;
  const safeUpc = typeof upc === "string" ? upc.trim() : "";

  if (!safeUpc) {
    return new NextResponse("UPC invalido.", { status: 400 });
  }

  const baseDir = path.join(process.cwd(), "images");

  for (const ext of IMAGE_EXTENSIONS) {
    const filePath = path.join(baseDir, `${safeUpc}.${ext}`);
    try {
      await fs.stat(filePath);
      const data = await fs.readFile(filePath);
      return new NextResponse(data, {
        status: 200,
        headers: {
          "Content-Type": contentTypeForExtension(ext),
          "Cache-Control": "public, max-age=86400",
        },
      });
    } catch (error) {
      // Ignore missing files, try next extension.
    }
  }

  return new NextResponse("Imagen no encontrada.", { status: 404 });
}
