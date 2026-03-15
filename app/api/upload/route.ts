import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const ALLOWED_EXTENSIONS = new Set(["stl", "obj", "3mf"]);

const sanitizeFileName = (name: string) => {
  const safe = name.replace(/[^a-zA-Z0-9._-]/g, "_");
  return safe || "model.stl";
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const orderIdInput = formData.get("orderId");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      return NextResponse.json(
        { error: "Only STL, OBJ, and 3MF files are supported" },
        { status: 400 }
      );
    }

    const orderId =
      typeof orderIdInput === "string" && orderIdInput.trim().length > 0
        ? orderIdInput.trim()
        : crypto.randomUUID();

    const fileName = sanitizeFileName(file.name);
    const uploadDir = path.join(process.cwd(), "public", "uploads", orderId);
    const targetPath = path.join(uploadDir, fileName);

    await mkdir(uploadDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    await writeFile(targetPath, Buffer.from(bytes));

    const baseUrl = new URL(request.url).origin;
    const fileUrl = `${baseUrl}/uploads/${orderId}/${encodeURIComponent(fileName)}`;

    const userIdInput = formData.get("userId");
    const userId = typeof userIdInput === "string" && userIdInput.trim() ? userIdInput.trim() : null;

    try {
      const supabaseAdmin = getSupabaseAdmin();
      await supabaseAdmin.from("uploaded_models").insert({
        user_id: userId,
        order_id: orderId,
        file_name: fileName,
        file_url: fileUrl,
        file_type: extension,
      });
    } catch {
      // Upload should still succeed even if DB persistence is not configured yet.
    }

    return NextResponse.json({ fileUrl, orderId });
  } catch (error) {
    console.error("Upload API error", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
