import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FileTextIcon } from "@phosphor-icons/react";
import { describe, expect, it } from "vitest";
import { DecorativeIcons, IconDefaultsProvider } from "./icon-defaults";

const render = (node: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(node);
/** Phosphor's duotone weight adds a second, 20%-opacity layer; the other weights do not. */
const isDuotone = (html: string) => html.includes('opacity="0.2"');

describe("icon defaults", () => {
  it("draws every icon two-tone at 24px inside the app provider", () => {
    const html = render(createElement(IconDefaultsProvider, null, createElement(FileTextIcon)));
    expect(isDuotone(html)).toBe(true);
    expect(html).toContain('width="24"');
  });
  it("still lets one icon ask for another weight", () => {
    const html = render(createElement(IconDefaultsProvider, null, createElement(FileTextIcon, { weight: "regular" })));
    expect(isDuotone(html)).toBe(false);
  });
  it("hides icons from screen readers by default, like the previous icon set did", () => {
    const html = render(createElement(IconDefaultsProvider, null, createElement(FileTextIcon)));
    expect(html).toContain('aria-hidden="true"');
  });
  it("lets a meaningful icon opt back in with its own label", () => {
    const html = render(createElement(IconDefaultsProvider, null, createElement(FileTextIcon, { "aria-hidden": false, role: "img", "aria-label": "Tệp" })));
    expect(html).toContain('aria-hidden="false"');
    expect(html).toContain('aria-label="Tệp"');
  });
  it("keeps decorative areas two-tone", () => {
    const html = render(createElement(IconDefaultsProvider, null, createElement(DecorativeIcons, null, createElement(FileTextIcon))));
    expect(isDuotone(html)).toBe(true);
  });
});
