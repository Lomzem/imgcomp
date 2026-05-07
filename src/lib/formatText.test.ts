import { describe, expect, it } from "vitest"

import { formatSize } from "./formatText"

describe("formatSize", () => {
  it("returns zero bytes for zero", () => {
    expect(formatSize(0)).toBe("0 Bytes")
  })

  it("returns zero bytes for negative values", () => {
    expect(formatSize(-1)).toBe("0 Bytes")
  })

  it("returns zero bytes for non-finite values", () => {
    expect(formatSize(Number.NaN)).toBe("0 Bytes")
    expect(formatSize(Number.POSITIVE_INFINITY)).toBe("0 Bytes")
  })

  it("formats bytes without changing the unit", () => {
    expect(formatSize(512)).toBe("512 Bytes")
  })

  it("formats larger units", () => {
    expect(formatSize(1024)).toBe("1 KB")
    expect(formatSize(1024 * 1024)).toBe("1 MB")
  })

  it("uses three significant figures by default", () => {
    expect(formatSize(1537)).toBe("1.5 KB")
  })

  it("supports a custom number of significant figures", () => {
    expect(formatSize(1537, 4)).toBe("1.501 KB")
  })

  it("clamps significant figures to at least one", () => {
    expect(formatSize(1536, 0)).toBe("2 KB")
  })
})
