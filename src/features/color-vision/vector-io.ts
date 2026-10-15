import { ColorVisionError } from "./errors";

export const MAX_SVG_BYTES = 5_000_000;
const svgNamespace = "http://www.w3.org/2000/svg";
export function rasterDimensions(
  width: number,
  height: number,
): { width: number; height: number } {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  )
    throw new ColorVisionError(
      "invalid-dimensions",
      "Invalid vector dimensions.",
    );
  const scale = Math.min(
    1,
    4096 / Math.max(width, height),
    Math.sqrt(16_000_000 / (width * height)),
  );
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
  };
}
const absoluteLength = (value: string | null): number | null => {
  if (!value) return null;
  const match = value
    .trim()
    .match(/^([+]?(?:\d+(?:\.\d*)?|\.\d+))(px|pt|pc|in|cm|mm)?$/iu);
  if (!match) return null;
  const units: Record<string, number> = {
    px: 1,
    pt: 96 / 72,
    pc: 16,
    in: 96,
    cm: 96 / 2.54,
    mm: 96 / 25.4,
  };
  return Number(match[1]) * units[match[2]?.toLowerCase() ?? "px"];
};
const staticCss = (value: string): string => {
  if (/[@\\]/u.test(value)) return "";
  return value.replace(
    /url\s*\(\s*(['"]?)(.*?)\1\s*\)/giu,
    (whole, _quote: string, url: string) =>
      url.trim().startsWith("#") ? whole : "none",
  );
};
export function prepareSvg(text: string): {
  svg: string;
  width: number;
  height: number;
} {
  if (text.length > MAX_SVG_BYTES)
    throw new ColorVisionError("too-large", "SVG exceeds 5 MB.");
  if (/<!\s*(?:DOCTYPE|ENTITY)/iu.test(text))
    throw new ColorVisionError(
      "decode-failed",
      "SVG entity declarations are unsupported.",
    );
  const parsed = new DOMParser().parseFromString(text, "image/svg+xml");
  const svg = parsed.documentElement;
  if (
    parsed.querySelector("parsererror") ||
    svg.localName !== "svg" ||
    svg.namespaceURI !== svgNamespace
  )
    throw new ColorVisionError("decode-failed", "Invalid SVG document.");
  const elements = [svg, ...svg.querySelectorAll("*")];
  if (elements.length > 50000)
    throw new ColorVisionError("too-large", "SVG has too many elements.");
  for (const element of elements) {
    if (
      element.namespaceURI !== svgNamespace ||
      [
        "script",
        "foreignObject",
        "animate",
        "animateMotion",
        "animateTransform",
        "set",
        "discard",
      ].includes(element.localName)
    ) {
      element.remove();
      continue;
    }
    for (const attribute of [...element.attributes]) {
      const name = attribute.localName.toLowerCase();
      if (name.startsWith("on") || name === "base" || name === "src")
        element.removeAttributeNode(attribute);
      else if (name === "href") {
        const value = attribute.value.trim();
        if (
          !value.startsWith("#") &&
          !/^data:image\/(?:png|jpeg|webp|gif);base64,[a-z\d+/=\s]+$/iu.test(
            value,
          )
        )
          element.removeAttributeNode(attribute);
      } else if (name === "style") attribute.value = staticCss(attribute.value);
      else if (/url\s*\(/iu.test(attribute.value))
        attribute.value = staticCss(attribute.value);
    }
    if (element.localName === "style")
      element.textContent = staticCss(element.textContent ?? "");
  }
  const viewBox = svg
    .getAttribute("viewBox")
    ?.trim()
    .split(/[\s,]+/u)
    .map(Number);
  const hasViewBox =
    viewBox?.length === 4 &&
    viewBox.every(Number.isFinite) &&
    viewBox[2] > 0 &&
    viewBox[3] > 0;
  let width = absoluteLength(svg.getAttribute("width")),
    height = absoluteLength(svg.getAttribute("height"));
  if (hasViewBox) {
    width ??= height ? (height * viewBox![2]) / viewBox![3] : viewBox![2];
    height ??= (width * viewBox![3]) / viewBox![2];
  }
  if (!width || !height)
    throw new ColorVisionError(
      "invalid-dimensions",
      "SVG requires dimensions or a viewBox.",
    );
  const dimensions = rasterDimensions(width, height);
  if (!hasViewBox) svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", String(dimensions.width));
  svg.setAttribute("height", String(dimensions.height));
  return { svg: new XMLSerializer().serializeToString(svg), ...dimensions };
}
