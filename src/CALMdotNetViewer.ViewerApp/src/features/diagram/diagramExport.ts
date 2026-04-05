function sanitizeFileName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "diagram";
}

function resolveSvgDimensions(svgElement: SVGSVGElement): { width: number; height: number } {
  const viewBox = svgElement.viewBox.baseVal;
  if (viewBox && viewBox.width > 0 && viewBox.height > 0) {
    return {
      width: viewBox.width,
      height: viewBox.height
    };
  }

  const width = svgElement.width.baseVal.value;
  const height = svgElement.height.baseVal.value;
  if (width > 0 && height > 0) {
    return { width, height };
  }

  const bounds = svgElement.getBoundingClientRect();
  return {
    width: Math.max(bounds.width, 1200),
    height: Math.max(bounds.height, 800)
  };
}

function copyComputedStyles(sourceElement: Element, targetElement: Element): void {
  const computedStyle = window.getComputedStyle(sourceElement);
  const inlineStyle = Array.from(computedStyle)
    .map((propertyName) => `${propertyName}:${computedStyle.getPropertyValue(propertyName)};`)
    .join("");

  targetElement.setAttribute("style", inlineStyle);
}

function inlineSvgStyles(sourceRoot: SVGSVGElement, targetRoot: SVGSVGElement): void {
  copyComputedStyles(sourceRoot, targetRoot);

  const sourceElements = sourceRoot.querySelectorAll("*");
  const targetElements = targetRoot.querySelectorAll("*");

  sourceElements.forEach((sourceElement, index) => {
    const targetElement = targetElements[index];
    if (!targetElement) {
      return;
    }

    copyComputedStyles(sourceElement, targetElement);
  });
}

function cloneSvgForExport(svgElement: SVGSVGElement): { markup: string; width: number; height: number } {
  const clone = svgElement.cloneNode(true) as SVGSVGElement;
  const { width, height } = resolveSvgDimensions(svgElement);

  inlineSvgStyles(svgElement, clone);

  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  clone.setAttribute("viewBox", `0 0 ${width} ${height}`);
  clone.setAttribute("preserveAspectRatio", "xMidYMid meet");
  clone.setAttribute("color-scheme", "light");
  clone.style.background = "#ffffff";

  return {
    markup: new XMLSerializer().serializeToString(clone),
    width,
    height
  };
}

function downloadBlob(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
}

function getSvgElement(container: HTMLDivElement | null): SVGSVGElement {
  const svgElement = container?.querySelector("svg");
  if (!(svgElement instanceof SVGSVGElement)) {
    throw new Error("No rendered diagram is available to export yet.");
  }

  return svgElement;
}

export function exportDiagramAsSvg(container: HTMLDivElement | null, title: string): void {
  const svgElement = getSvgElement(container);
  const { markup } = cloneSvgForExport(svgElement);
  downloadBlob(new Blob([markup], { type: "image/svg+xml;charset=utf-8" }), `${sanitizeFileName(title)}.svg`);
}

function toSvgDataUrl(markup: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
}

export async function exportDiagramAsPng(container: HTMLDivElement | null, title: string): Promise<void> {
  const svgElement = getSvgElement(container);
  const { markup, width, height } = cloneSvgForExport(svgElement);
  await document.fonts.ready;
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width * scale);
  canvas.height = Math.ceil(height * scale);

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to prepare PNG export.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.scale(scale, scale);
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const nextImage = new Image();
    nextImage.decoding = "sync";
    nextImage.onload = () => resolve(nextImage);
    nextImage.onerror = () => reject(new Error("Failed to render the diagram for PNG export."));
    nextImage.src = toSvgDataUrl(markup);
  });

  context.drawImage(image, 0, 0, width, height);

  const pngBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new Error("Failed to generate PNG export."));
    }, "image/png");
  });

  downloadBlob(pngBlob, `${sanitizeFileName(title)}.png`);
}
