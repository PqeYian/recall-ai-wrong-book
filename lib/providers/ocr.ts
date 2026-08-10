export interface OcrProvider {
  recognize(file: Buffer, filename: string): Promise<string>;
}

const DEMO_TEXTS = [
  "已知二次函数 y = x² - 4x + 3，求抛物线的顶点坐标。",
  "判断方程 x² - 2x + 5 = 0 的实数根情况。",
  "质量为 2kg 的物体受到 10N 水平力和 2N 摩擦力，求加速度。",
  "If I ___ you, I would study harder. 填入正确形式。",
  "配平：Al + O₂ → Al₂O₃",
  "从 5 本不同书中任选 2 本，有多少种选法？"
];

export class DemoOcrProvider implements OcrProvider {
  async recognize(file: Buffer, filename: string) {
    const hash = (filename + file.length).split("").reduce(
      (sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0,
      7
    );
    return DEMO_TEXTS[hash % DEMO_TEXTS.length];
  }
}

export class OcrSpaceProvider implements OcrProvider {
  constructor(private apiKey: string) {}

  async recognize(file: Buffer, filename: string) {
    const form = new FormData();
    form.append(
      "file",
      new Blob([new Uint8Array(file)], { type: this.mimeType(filename) }),
      filename
    );
    form.append("language", "chs");
    form.append("OCREngine", "2");
    form.append("scale", "true");
    form.append("isTable", "true");

    const response = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      headers: {
        apikey: this.apiKey
      },
      body: form
    });
    if (!response.ok) {
      const raw = await response.text().catch(() => "");
      console.error("[ocr-space-http]", response.status, raw.slice(0, 300));
      throw new Error(`OCR 服务返回 ${response.status}`);
    }
    const raw = await response.text();
    let json: {
      ParsedResults?: Array<{ ParsedText?: string }>;
      ErrorMessage?: string[];
    };
    try {
      json = JSON.parse(raw);
    } catch (error) {
      console.error("[ocr-space-invalid-json]", raw.slice(0, 500));
      throw new Error("OCR 服务返回异常，请重试");
    }
    if (json.ErrorMessage?.length) {
      throw new Error(json.ErrorMessage[0]);
    }
    const text = json.ParsedResults?.map((r) => r.ParsedText ?? "").join("\n") ?? "";
    if (!text.trim()) throw new Error("OCR 未识别到文字");
    return text;
  }

  private mimeType(filename: string) {
    const ext = filename.split(".").pop()?.toLowerCase();
    if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
    if (ext === "png") return "image/png";
    if (ext === "webp") return "image/webp";
    return "application/octet-stream";
  }
}

export function getOcrProvider(): OcrProvider {
  const key = process.env.OCR_SPACE_API_KEY;
  if (key) return new OcrSpaceProvider(key);
  return new DemoOcrProvider();
}
