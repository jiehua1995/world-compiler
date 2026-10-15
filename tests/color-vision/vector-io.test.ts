// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  prepareSvg,
  rasterDimensions,
} from "../../src/features/color-vision/vector-io";
describe("static SVG input", () => {
  it("preserves local gradients and styles while deriving dimensions from viewBox", () => {
    const result = prepareSvg(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><defs><linearGradient id="g"><stop stop-color="red"/></linearGradient></defs><style>.a{fill:url(#g)}</style><rect class="a" width="640" height="480"/></svg>',
    );
    expect(result.width).toBe(640);
    expect(result.height).toBe(480);
    expect(result.svg).toContain("url(#g)");
  });
  it("removes executable, embedded-document and external resource content", () => {
    const result = prepareSvg(
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" onload="alert(1)"><script>alert(1)</script><foreignObject><div>bad</div></foreignObject><image href="https://example.com/tracker.png"/><use href="#shape"/><rect id="shape" style="fill:url(https://example.com/color.svg)"/><style>@import "https://example.com/x.css";</style></svg>',
    );
    expect(result.svg).not.toMatch(
      /script|foreignObject|onload|https:\/\/example/,
    );
    expect(result.svg).toContain('href="#shape"');
  });
  it("rejects entities, malformed documents and wrong root namespaces", () => {
    for (const value of [
      '<!DOCTYPE svg [<!ENTITY x "boom">]><svg/>',
      "<svg>",
      "<html/>",
      '<svg xmlns="https://example.com/" width="10" height="10"/>',
    ])
      expect(() => prepareSvg(value)).toThrow();
  });
  it("converts physical units and caps large raster output", () => {
    const result = prepareSvg(
      '<svg xmlns="http://www.w3.org/2000/svg" width="6in" height="3in"/>',
    );
    expect(result.width).toBe(576);
    expect(result.height).toBe(288);
    expect(rasterDimensions(20000, 10000)).toEqual({
      width: 4096,
      height: 2048,
    });
    const square = rasterDimensions(10000, 10000);
    expect(square.width * square.height).toBeLessThanOrEqual(16000000);
    expect(() => rasterDimensions(0, 10)).toThrow();
  });
});
