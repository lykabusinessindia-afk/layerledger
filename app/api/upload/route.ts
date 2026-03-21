import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const ALLOWED_EXTENSIONS = ["stl", "obj", "3mf"];
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const VALIDATION_MESSAGE = "Only STL, OBJ, 3MF files up to 50MB are supported";

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
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return NextResponse.json({ error: VALIDATION_MESSAGE }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: VALIDATION_MESSAGE }, { status: 400 });
    }

    const orderId =
      typeof orderIdInput === "string" && orderIdInput.trim().length > 0
        ? orderIdInput.trim()
        : crypto.randomUUID();

    const fileName = sanitizeFileName(file.name);
    const bytes = await file.arrayBuffer();
    const fileBuffer = Buffer.from(bytes);
    const storagePath = `${orderId}/${Date.now()}-${fileName}`;

    const userIdInput = formData.get("userId");
    const userId = typeof userIdInput === "string" && userIdInput.trim() ? userIdInput.trim() : null;

    const supabaseAdmin = getSupabaseAdmin();

    const { error: uploadError } = await supabaseAdmin.storage
      .from("stl-files")
      .upload(storagePath, fileBuffer, {
        contentType: "model/stl",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error", uploadError);
      return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("stl-files")
      .getPublicUrl(storagePath);

    const fileUrl = publicUrlData.publicUrl;

    try {
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

    return NextResponse.json({ fileUrl, orderId, storagePath });
  } catch (error) {
    console.error("Upload API error", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
