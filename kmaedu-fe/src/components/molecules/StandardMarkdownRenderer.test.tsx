// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import katex from "katex";
import { KATEX_CLASSES, StandardMarkdownRenderer } from "./StandardMarkdownRenderer";

describe("markdown renderer sanitizing", () => {
  it("drops author classes that could cover the page (UI redress in shared content)", () => {
    const html = '<div class="fixed inset-0 z-50 bg-white">Đăng nhập lại</div><span class="absolute top-0">x</span>';
    const { container } = render(<StandardMarkdownRenderer content={html} />);
    const div = Array.from(container.querySelectorAll("div")).find((d) => d.textContent === "Đăng nhập lại");
    expect(div).toBeTruthy();
    expect(div!.className).toBe("");
    expect(container.querySelector(".fixed, .inset-0, .z-50, .absolute")).toBeNull();
  });

  it("keeps the class names KaTeX needs to render math", () => {
    const { container } = render(<StandardMarkdownRenderer content={"Công thức $x^2 + 1$"} />);
    expect(container.querySelector(".katex")).toBeTruthy();
    expect(container.querySelector(".mord")).toBeTruthy();
  });

  it("does not let a KaTeX-looking prefix smuggle other classes", () => {
    const { container } = render(<StandardMarkdownRenderer content={'<span class="katex fixed inset-0">y</span>'} />);
    const span = Array.from(container.querySelectorAll("span")).find((s) => s.textContent === "y");
    expect(span!.classList.contains("katex")).toBe(true);
    expect(span!.classList.contains("fixed")).toBe(false);
    expect(span!.classList.contains("inset-0")).toBe(false);
  });

  it("allows every class KaTeX emits for common math", () => {
    const formulas = [
      "x^2 + y_i", "\\frac{a}{b}", "\\sqrt[3]{x}", "\\sum_{i=1}^n i", "\\int_0^1 f(x)\\,dx", "\\lim_{x \\to 0}",
      "\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}", "\\left( \\frac{1}{2} \\right)", "\\overline{AB}", "\\hat{x}",
      "\\xrightarrow{f}", "\\cancel{x}", "\\text{và} \\mathbb{R}", "\\boxed{1}", "a \\pmod{n}", "\\binom{n}{k}",
    ];
    const missing = new Set<string>();
    for (const f of formulas) {
      for (const display of [false, true]) {
        const html = katex.renderToString(f, { displayMode: display, throwOnError: false, output: "htmlAndMathml" });
        for (const m of html.matchAll(/class="([^"]*)"/g)) {
          for (const c of m[1].split(/\s+/).filter(Boolean)) {
            if (!KATEX_CLASSES.some((re) => re.test(c))) missing.add(c);
          }
        }
      }
    }
    expect([...missing]).toEqual([]);
  });
});
