const SUPERSCRIPTS: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "n": "ⁿ",
  "a": "ᵃ",
  "b": "ᵇ",
  "c": "ᶜ",
  "i": "ⁱ",
  "m": "ᵐ",
  "p": "ᵖ",
  "x": "ˣ",
  "y": "ʸ"
};

const SUBSCRIPTS: Record<string, string> = {
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉",
  "a": "ₐ",
  "e": "ₑ",
  "h": "ₕ",
  "k": "ₖ",
  "l": "ₗ",
  "m": "ₘ",
  "n": "ₙ",
  "p": "ₚ",
  "s": "ₛ",
  "t": "ₜ"
};

/**
 * Converts common programming-style math into human-readable math notation.
 * Used as a display-layer fallback on top of the AI math-notation prompt.
 */
export function toMathNotation(input: string) {
  let text = input;

  text = text
    .replace(/([A-Za-z0-9)\]}])\s*\^\s*\{?(\d+)\}?/g, (_, base: string, exp: string) => {
      return base + exp.split("").map((digit) => SUPERSCRIPTS[digit] ?? digit).join("");
    })
    .replace(/([A-Za-z0-9)\]}])\s*\*\*\s*(\d+)/g, (_, base: string, exp: string) => {
      return base + exp.split("").map((digit) => SUPERSCRIPTS[digit] ?? digit).join("");
    })
    .replace(/([A-Za-z0-9)\]}])\s*_\s*\{?([A-Za-z0-9]+)\}?/g, (_, base: string, sub: string) => {
      return base + sub.split("").map((char) => SUBSCRIPTS[char] ?? char).join("");
    });

  text = text
    .replace(/sqrt\(([^()]*)\)/gi, "√($1)")
    .replace(/\bcbrt\(([^()]*)\)/gi, "∛($1)")
    .replace(/\bsqrt\s*\{([^}]*)\}/gi, "√($1)")
    .replace(/\bcbrt\s*\{([^}]*)\}/gi, "∛($1)");

  text = text
    .replace(/\\left\s*\(/g, "(")
    .replace(/\\right\s*\)/g, ")")
    .replace(/\\left\s*\[/g, "[")
    .replace(/\\right\s*\]/g, "]")
    .replace(/\\\(/g, "")
    .replace(/\\\)/g, "")
    .replace(/\\\[/g, "")
    .replace(/\\\]/g, "")
    .replace(/\$\$/g, "")
    .replace(/\$/g, "")
    .replace(/\\times/g, "×")
    .replace(/\\cdot/g, "·")
    .replace(/\\div/g, "÷")
    .replace(/\\pm/g, "±")
    .replace(/\\leq/g, "≤")
    .replace(/\\geq/g, "≥")
    .replace(/\\neq/g, "≠")
    .replace(/\\sqrt\s*\{([^}]*)\}/g, "√($1)")
    .replace(/\\frac\s*\{([^}]*)\}\s*\{([^}]*)\}/g, "($1)/($2)")
    .replace(/\\alpha/g, "α")
    .replace(/\\beta/g, "β")
    .replace(/\\gamma/g, "γ")
    .replace(/\\theta/g, "θ")
    .replace(/\\pi/g, "π")
    .replace(/\\Delta/g, "Δ")
    .replace(/\\infty/g, "∞");

  text = text
    .replace(/\b1\/2\b/g, "½")
    .replace(/\b1\/3\b/g, "⅓")
    .replace(/\b2\/3\b/g, "⅔")
    .replace(/\b1\/4\b/g, "¼")
    .replace(/\b3\/4\b/g, "¾")
    .replace(/\b1\/5\b/g, "⅕")
    .replace(/\b2\/5\b/g, "⅖")
    .replace(/\b3\/5\b/g, "⅗")
    .replace(/\b4\/5\b/g, "⅘")
    .replace(/\b1\/6\b/g, "⅙")
    .replace(/\b5\/6\b/g, "⅚")
    .replace(/\b1\/8\b/g, "⅛")
    .replace(/\b3\/8\b/g, "⅜")
    .replace(/\b5\/8\b/g, "⅝")
    .replace(/\b7\/8\b/g, "⅞");

  text = text
    .replace(/>\s*=/g, "≥")
    .replace(/<\s*=/g, "≤")
    .replace(/!\s*=/g, "≠")
    .replace(/\s\*\s/g, " × ")
    .replace(/(\d)\s*\*\s*(\d)/g, "$1 × $2")
    .replace(/\*\*/g, "")
    .replace(/=>/g, "→")
    .replace(/->/g, "→")
    .replace(/==/g, "=");

  return text;
}
