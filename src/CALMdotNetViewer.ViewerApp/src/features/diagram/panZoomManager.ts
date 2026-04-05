import svgPanZoom from "svg-pan-zoom";

export interface PanZoomOptions {
  minZoom?: number;
  maxZoom?: number;
  zoomScaleSensitivity?: number;
  mouseWheelZoomEnabled?: boolean;
  panEnabled?: boolean;
  controlIconsEnabled?: boolean;
}

export class PanZoomManager {
  private instance: SvgPanZoom.Instance | null = null;

  initialize(svgElement: SVGSVGElement, options: PanZoomOptions = {}): void {
    this.destroy();

    const defaultOptions: SvgPanZoom.Options = {
      minZoom: 0.1,
      maxZoom: 10,
      zoomScaleSensitivity: 0.25,
      mouseWheelZoomEnabled: true,
      panEnabled: true,
      controlIconsEnabled: false,
      fit: false,
      center: false,
      contain: false,
      refreshRate: "auto"
    };

    this.instance = svgPanZoom(svgElement, {
      ...defaultOptions,
      ...options
    });

    svgElement.style.removeProperty("max-width");
    svgElement.style.removeProperty("max-height");
    svgElement.style.width = "100%";
    svgElement.style.height = "100%";

    this.instance.resize();
    this.instance.updateBBox();
  }

  zoomIn(): void {
    this.instance?.zoomIn();
  }

  zoomOut(): void {
    this.instance?.zoomOut();
  }

  reset(): void {
    if (!this.instance) {
      return;
    }

    this.instance.resetZoom();
    this.instance.resetPan();
  }

  fit(): void {
    if (!this.instance) {
      return;
    }

    this.instance.resize();
    this.instance.updateBBox();
    this.instance.fit();
    this.instance.center();
  }

  destroy(): void {
    this.instance?.destroy();
    this.instance = null;
  }
}
