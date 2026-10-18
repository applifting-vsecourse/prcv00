import "@testing-library/jest-dom/vitest"

import { vi } from "vitest"

// jsdom has no ResizeObserver; Radix primitives (e.g. RadioGroup) measure
// themselves with it. Layout is irrelevant in these tests, so a no-op will do.
globalThis.ResizeObserver ??= class {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
