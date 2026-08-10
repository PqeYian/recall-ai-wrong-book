import { NextRequest, NextResponse } from "next/server";
import { DemoAiProvider, getAiProvider } from "@/lib/providers/ai";
import { getOcrProvider } from "@/lib/providers/ocr";
import { incrementOcrUsage } from "@/lib/repository";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  let files: File[] = [];
  let text = "";
  if (contentType.includes("application/json")) {
    const json = (await request.json()) as { text?: string };
    text = json.text ?? "";
  } else {
    const formData = await request.formData();
    files = formData
      .getAll("images")
      .filter((item): item is File => item instanceof File);
    text = String(formData.get("text") ?? "").trim();
  }

  if (files.length > 9) {
    return NextResponse.json(
      { error: "最多支持上传 9 张图片" },
      { status: 400 }
    );
  }
  for (const file of files) {
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { error: "支持 jpg/png/webp 图片，单张不超过 10MB，最多 9 张" },
        { status: 400 }
      );
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "单张图片不能超过 10MB" },
        { status: 400 }
      );
    }
  }
  if (!files.length && !text) {
    return NextResponse.json(
      { error: "请上传图片或粘贴题目文本" },
      { status: 400 }
    );
  }

  try {
    const ocrProvider = getOcrProvider();
    const aiProvider = getAiProvider();
    let ocrText = text;
    if (files.length) {
      const parts: string[] = [];
      for (const file of files) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const result = await ocrProvider.recognize(buffer, file.name);
        parts.push(result);
        await incrementOcrUsage();
      }
      ocrText = parts.join("\n");
    }
    let candidates = await aiProvider.splitAndStructure(ocrText);
    if (!candidates.length && ocrText.trim()) {
      candidates = await new DemoAiProvider().splitAndStructure(ocrText);
    }
    if (!candidates.length) {
      return NextResponse.json(
        { error: "未识别到有效题目，请检查图片清晰度或文本内容" },
        { status: 422 }
      );
    }
    return NextResponse.json({ candidates, ocrText });
  } catch (error) {
    console.error("[recognize-error]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "识别失败，请检查网络后重试",
        fallback: true
      },
      { status: 500 }
    );
  }
}
