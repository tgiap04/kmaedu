import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

/**
 * Runs before every test file. Most tests run in node (pure logic); a component or hook test opts into the DOM with
 * `// @vitest-environment jsdom`, and only then gets cleanup and the browser APIs antd reads but jsdom lacks.
 */
if (typeof window !== "undefined") {
  afterEach(() => cleanup());

  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;

  // jsdom does not implement the pseudo-element argument antd's modal passes; the element's own style is enough here.
  const computed = window.getComputedStyle.bind(window);
  window.getComputedStyle = (element: Element) => computed(element);

  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
