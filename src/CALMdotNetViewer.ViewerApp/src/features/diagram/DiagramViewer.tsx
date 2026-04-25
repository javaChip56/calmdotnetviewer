import { useEffect, useRef, useState, type MouseEvent, type MutableRefObject, type Ref } from "react";
import type { ParsedArchitecture } from "../architecture/types";
import type { AppRoutePreviewPane } from "../../router/appRoutes";
import { exportDiagramAsPng, exportDiagramAsSvg } from "./diagramExport";
import { renderBlockArchitecture } from "./renderBlockArchitecture";
import { renderFlowSequenceDiagram } from "./renderFlowSequenceDiagram";
import { renderRelatedNodesDiagram } from "./renderRelatedNodesDiagram";
import { findRenderedMermaidNodeElements, resolveRenderedMermaidNodeId } from "./mermaidNodeDom";
import { PanZoomManager } from "./panZoomManager";

interface DiagramViewerProps {
  parsedArchitecture: ParsedArchitecture;
  selectedElementId: string | null;
  focusElementId: string | null;
  onSelectElement: (id: string) => void;
  onClearFocus: () => void;
  isPreviewMode?: boolean;
  previewPane?: AppRoutePreviewPane;
  buildPreviewHref?: (pane: AppRoutePreviewPane) => string | null;
  workspaceHref?: string | null;
}

interface RenderedDiagram {
  svg: string;
  warnings: string[];
  bindFunctions?: (element: Element) => void;
}

interface FocusedDiagramSet {
  architecture: RenderedDiagram;
  relatedNodes: RenderedDiagram;
  interfaceView: RenderedDiagram;
}

interface FocusedFlowDiagramSet {
  architecture: RenderedDiagram;
  flowSequence: RenderedDiagram;
  interfaces: RenderedDiagram;
}

function DiagramSection({
  title,
  diagram,
  containerRef,
  onClick,
  onZoomIn,
  onZoomOut,
  onReset,
  onFit,
  onExportSvg,
  onExportPng,
  openInNewTabHref
}: {
  title: string;
  diagram: RenderedDiagram;
  containerRef?: Ref<HTMLDivElement>;
  onClick?: (event: MouseEvent<HTMLDivElement>) => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onReset?: () => void;
  onFit?: () => void;
  onExportSvg?: () => void;
  onExportPng?: () => Promise<void> | void;
  openInNewTabHref?: string | null;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  return (
    <div className="diagram-section">
      <div className="diagram-section-header">
        <h3>{title}</h3>
        <div className="diagram-controls" aria-label={`${title} controls`}>
          {openInNewTabHref ? (
            <a className="diagram-control-btn diagram-open-link" href={openInNewTabHref} rel="noreferrer" target="_blank">
              Open in new tab
            </a>
          ) : null}
          <button className="diagram-control-btn" onClick={onZoomOut} type="button">
            -
          </button>
          <button className="diagram-control-btn" onClick={onZoomIn} type="button">
            +
          </button>
          <button className="diagram-control-btn" onClick={onReset} type="button">
            Reset
          </button>
          <button className="diagram-control-btn" onClick={onFit} type="button">
            Fit
          </button>
          <div className="diagram-menu" ref={menuRef}>
            <button
              aria-expanded={isMenuOpen}
              aria-haspopup="menu"
              className="diagram-control-btn diagram-menu-trigger"
              onClick={() => setIsMenuOpen((currentValue) => !currentValue)}
              type="button"
            >
              ...
            </button>
            {isMenuOpen ? (
              <div className="diagram-menu-popover" role="menu">
                <button
                  className="diagram-menu-item"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onExportSvg?.();
                  }}
                  role="menuitem"
                  type="button"
                >
                  Export to SVG
                </button>
                <button
                  className="diagram-menu-item"
                  onClick={() => {
                    setIsMenuOpen(false);
                    void onExportPng?.();
                  }}
                  role="menuitem"
                  type="button"
                >
                  Export to PNG
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div
        ref={containerRef}
        className="diagram-canvas"
        onClick={onClick}
        dangerouslySetInnerHTML={{ __html: diagram.svg }}
      />
      {diagram.warnings.length > 0 ? (
        <div className="diagram-warnings">
          <h4>Diagram warnings</h4>
          <ul>
            {diagram.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function buildExportTitle(contextTitle: string, sectionTitle: string): string {
  return `${contextTitle} ${sectionTitle}`;
}

function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

export function DiagramViewer({
  parsedArchitecture,
  selectedElementId,
  focusElementId,
  onSelectElement,
  onClearFocus,
  isPreviewMode = false,
  previewPane = "architecture",
  buildPreviewHref,
  workspaceHref
}: DiagramViewerProps) {
  const selectedNode = parsedArchitecture.nodes.find((node) => node.id === focusElementId) ?? null;
  const selectedRelationship = parsedArchitecture.relationships.find((relationship) => relationship.id === focusElementId) ?? null;
  const selectedFlow = parsedArchitecture.flows.find((flow) => flow.id === focusElementId) ?? null;
  const [mainDiagram, setMainDiagram] = useState<RenderedDiagram | null>(null);
  const [focusedDiagrams, setFocusedDiagrams] = useState<FocusedDiagramSet | null>(null);
  const [focusedRelationshipDiagrams, setFocusedRelationshipDiagrams] = useState<FocusedDiagramSet | null>(null);
  const [focusedFlowDiagrams, setFocusedFlowDiagrams] = useState<FocusedFlowDiagramSet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mainCanvasRef = useRef<HTMLDivElement | null>(null);
  const focusedArchitectureRef = useRef<HTMLDivElement | null>(null);
  const relatedNodesRef = useRef<HTMLDivElement | null>(null);
  const interfaceViewRef = useRef<HTMLDivElement | null>(null);
  const flowArchitectureRef = useRef<HTMLDivElement | null>(null);
  const flowSequenceRef = useRef<HTMLDivElement | null>(null);
  const flowInterfacesRef = useRef<HTMLDivElement | null>(null);
  const mainPanZoomRef = useRef<PanZoomManager | null>(null);
  const focusedArchitecturePanZoomRef = useRef<PanZoomManager | null>(null);
  const relatedNodesPanZoomRef = useRef<PanZoomManager | null>(null);
  const interfaceViewPanZoomRef = useRef<PanZoomManager | null>(null);
  const flowArchitecturePanZoomRef = useRef<PanZoomManager | null>(null);
  const flowSequencePanZoomRef = useRef<PanZoomManager | null>(null);
  const flowInterfacesPanZoomRef = useRef<PanZoomManager | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function renderDiagrams() {
      try {
        const selectedNodeId = parsedArchitecture.nodes.some((node) => node.id === selectedElementId)
          ? selectedElementId
          : null;
        const nextMainDiagram = await renderBlockArchitecture(parsedArchitecture, selectedNodeId, null);
        const nextFocusedDiagrams = selectedNode
          ? await Promise.all([
              renderBlockArchitecture(parsedArchitecture, selectedNode.id, selectedNode.id),
              renderRelatedNodesDiagram(parsedArchitecture, { nodeId: selectedNode.id }),
              renderBlockArchitecture(parsedArchitecture, selectedNode.id, selectedNode.id, undefined, {
                "render-interfaces": true,
                "include-containers": "none",
                "include-children": "none",
                "edges": "connected"
              })
            ]).then(([architecture, relatedNodes, interfaceView]) => ({
              architecture,
              relatedNodes,
              interfaceView
            }))
          : null;
        const nextFocusedRelationshipDiagrams = selectedRelationship
          ? await Promise.all([
              renderBlockArchitecture(parsedArchitecture, null, null, undefined, {
                "focus-relationships": selectedRelationship.id
              }),
              renderRelatedNodesDiagram(parsedArchitecture, { relationshipId: selectedRelationship.id }),
              renderBlockArchitecture(parsedArchitecture, null, null, undefined, {
                "focus-relationships": selectedRelationship.id,
                "render-interfaces": true,
                "edges": "connected",
                "include-containers": "none"
              })
            ]).then(([architecture, relatedNodes, interfaceView]) => ({
              architecture,
              relatedNodes,
              interfaceView
            }))
          : null;
        const nextFocusedFlowDiagrams = selectedFlow
          ? await Promise.all([
              renderBlockArchitecture(parsedArchitecture, null, null, undefined, {
                "focus-flows": selectedFlow.id
              }),
              renderFlowSequenceDiagram(parsedArchitecture, selectedFlow.id),
              renderBlockArchitecture(parsedArchitecture, null, null, undefined, {
                "focus-flows": selectedFlow.id,
                "render-interfaces": true,
                "edges": "connected",
                "include-containers": "none"
              })
            ]).then(([architecture, flowSequence, interfaces]) => ({
              architecture,
              flowSequence,
              interfaces
            }))
          : null;

        if (cancelled) {
          return;
        }

        setMainDiagram(nextMainDiagram);
        setFocusedDiagrams(nextFocusedDiagrams);
        setFocusedRelationshipDiagrams(nextFocusedRelationshipDiagrams);
        setFocusedFlowDiagrams(nextFocusedFlowDiagrams);
        setError(null);
      } catch (renderError) {
        if (!cancelled) {
          setError(renderError instanceof Error ? renderError.message : String(renderError));
          setMainDiagram(null);
          setFocusedDiagrams(null);
          setFocusedRelationshipDiagrams(null);
          setFocusedFlowDiagrams(null);
        }
      }
    }

    void renderDiagrams();

    return () => {
      cancelled = true;
    };
  }, [focusElementId, parsedArchitecture, selectedElementId, selectedFlow, selectedNode, selectedRelationship]);

  useEffect(() => {
    const bindings: Array<[RenderedDiagram | null, HTMLDivElement | null]> = [
      [mainDiagram, mainCanvasRef.current],
      [focusedDiagrams?.architecture ?? null, focusedArchitectureRef.current],
      [focusedDiagrams?.relatedNodes ?? null, relatedNodesRef.current],
      [focusedDiagrams?.interfaceView ?? null, interfaceViewRef.current],
      [focusedRelationshipDiagrams?.architecture ?? null, focusedArchitectureRef.current],
      [focusedRelationshipDiagrams?.relatedNodes ?? null, relatedNodesRef.current],
      [focusedRelationshipDiagrams?.interfaceView ?? null, interfaceViewRef.current],
      [focusedFlowDiagrams?.architecture ?? null, flowArchitectureRef.current],
      [focusedFlowDiagrams?.flowSequence ?? null, flowSequenceRef.current],
      [focusedFlowDiagrams?.interfaces ?? null, flowInterfacesRef.current]
    ];

    for (const [diagram, element] of bindings) {
      if (diagram?.bindFunctions && element) {
        diagram.bindFunctions(element);
      }
    }
  }, [focusedDiagrams, focusedFlowDiagrams, focusedRelationshipDiagrams, mainDiagram]);

  useEffect(() => {
    const sections: Array<[HTMLDivElement | null, React.MutableRefObject<PanZoomManager | null>]> = [
      [mainCanvasRef.current, mainPanZoomRef],
      [focusedArchitectureRef.current, focusedArchitecturePanZoomRef],
      [relatedNodesRef.current, relatedNodesPanZoomRef],
      [interfaceViewRef.current, interfaceViewPanZoomRef],
      [flowArchitectureRef.current, flowArchitecturePanZoomRef],
      [flowSequenceRef.current, flowSequencePanZoomRef],
      [flowInterfacesRef.current, flowInterfacesPanZoomRef]
    ];

    for (const [container, managerRef] of sections) {
      managerRef.current?.destroy();
      managerRef.current = null;

      const svgElement = container?.querySelector("svg");
      if (!container || !(svgElement instanceof SVGSVGElement)) {
        continue;
      }

      const manager = new PanZoomManager();
      manager.initialize(svgElement);
      managerRef.current = manager;
    }

    return () => {
      for (const [, managerRef] of sections) {
        managerRef.current?.destroy();
        managerRef.current = null;
      }
    };
  }, [focusedDiagrams, focusedFlowDiagrams, focusedRelationshipDiagrams, mainDiagram]);

  useEffect(() => {
    const containers = [
      mainCanvasRef.current,
      focusedArchitectureRef.current,
      relatedNodesRef.current,
      interfaceViewRef.current,
      flowArchitectureRef.current,
      flowSequenceRef.current,
      flowInterfacesRef.current
    ];

    for (const container of containers) {
      if (!container) {
        continue;
      }

      for (const node of parsedArchitecture.nodes) {
        const renderedElements = findRenderedMermaidNodeElements(container, node.id);
        for (const element of renderedElements) {
          element.setAttribute("data-calm-node-id", node.id);
          element.classList.add("calm-node-click-target");
        }
      }
    }
  }, [focusedDiagrams, focusedFlowDiagrams, focusedRelationshipDiagrams, mainDiagram, parsedArchitecture.nodes]);

  function handleDiagramClick(event: MouseEvent<HTMLDivElement>, container: HTMLDivElement | null) {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const taggedNodeElement = target.closest("[data-calm-node-id]");
    const taggedNodeId = taggedNodeElement?.getAttribute("data-calm-node-id");
    if (taggedNodeId) {
      event.preventDefault();
      onSelectElement(taggedNodeId);
      return;
    }

    const nodeId = resolveRenderedMermaidNodeId(
      target,
      parsedArchitecture.nodes.map((node) => node.id),
      container
    );

    if (!nodeId) {
      return;
    }

    event.preventDefault();
    onSelectElement(nodeId);
  }

  async function fitThenExport(
    panZoomRef: MutableRefObject<PanZoomManager | null>,
    exportAction: () => void | Promise<void>
  ): Promise<void> {
    panZoomRef.current?.fit();
    await waitForNextPaint();
    await exportAction();
  }

  const showArchitecturePreview = !isPreviewMode || previewPane === "architecture";
  const showFlowPreview = !isPreviewMode || previewPane === "flow";
  const showInterfacePreview = !isPreviewMode || previewPane === "interface";

  return (
    <section className={`panel panel-diagram-viewer${isPreviewMode ? " panel-diagram-viewer-preview" : ""}`}>
      <div className="panel-header">
        <h2>{selectedNode ? selectedNode.label : selectedRelationship ? selectedRelationship.label : selectedFlow ? selectedFlow.label : "Architecture Overview"}</h2>
        <div className="diagram-header-actions">
          <span className="panel-meta">
            {selectedNode ? "Node preview" : selectedRelationship ? "Relationship preview" : selectedFlow ? "Flow preview" : "Full architecture"}
          </span>
          {isPreviewMode && workspaceHref ? (
            <a className="secondary-button" href={workspaceHref}>
              Open workspace view
            </a>
          ) : null}
          {focusElementId ? (
            <button className="secondary-button" onClick={onClearFocus} type="button">
              Show full architecture
            </button>
          ) : null}
        </div>
      </div>

      {error ? <p className="status-banner is-error">{error}</p> : null}

      {!focusElementId && mainDiagram && showArchitecturePreview ? (
        <DiagramSection
          title="Architecture Overview"
          diagram={mainDiagram}
          containerRef={mainCanvasRef}
          onClick={(event) => handleDiagramClick(event, mainCanvasRef.current)}
          onZoomIn={() => mainPanZoomRef.current?.zoomIn()}
          onZoomOut={() => mainPanZoomRef.current?.zoomOut()}
          onReset={() => mainPanZoomRef.current?.reset()}
          onFit={() => mainPanZoomRef.current?.fit()}
          onExportSvg={() => fitThenExport(
            mainPanZoomRef,
            () => exportDiagramAsSvg(mainCanvasRef.current, buildExportTitle("architecture-overview", "overview"))
          )}
          onExportPng={() => fitThenExport(
            mainPanZoomRef,
            () => exportDiagramAsPng(mainCanvasRef.current, buildExportTitle("architecture-overview", "overview"))
          )}
          openInNewTabHref={!isPreviewMode ? buildPreviewHref?.("architecture") : null}
        />
      ) : null}

      {selectedNode && focusedDiagrams ? (
        <div className="diagram-focus-stack">
          {showArchitecturePreview ? (
            <DiagramSection
              title="Architecture"
              diagram={focusedDiagrams.architecture}
              containerRef={focusedArchitectureRef}
              onClick={(event) => handleDiagramClick(event, focusedArchitectureRef.current)}
              onZoomIn={() => focusedArchitecturePanZoomRef.current?.zoomIn()}
              onZoomOut={() => focusedArchitecturePanZoomRef.current?.zoomOut()}
              onReset={() => focusedArchitecturePanZoomRef.current?.reset()}
              onFit={() => focusedArchitecturePanZoomRef.current?.fit()}
              onExportSvg={() => fitThenExport(
                focusedArchitecturePanZoomRef,
                () => exportDiagramAsSvg(focusedArchitectureRef.current, buildExportTitle(selectedNode.label, "architecture"))
              )}
              onExportPng={() => fitThenExport(
                focusedArchitecturePanZoomRef,
                () => exportDiagramAsPng(focusedArchitectureRef.current, buildExportTitle(selectedNode.label, "architecture"))
              )}
              openInNewTabHref={!isPreviewMode ? buildPreviewHref?.("architecture") : null}
            />
          ) : null}
          {!isPreviewMode ? (
            <DiagramSection
              title="Related Nodes"
              diagram={focusedDiagrams.relatedNodes}
              containerRef={relatedNodesRef}
              onClick={(event) => handleDiagramClick(event, relatedNodesRef.current)}
              onZoomIn={() => relatedNodesPanZoomRef.current?.zoomIn()}
              onZoomOut={() => relatedNodesPanZoomRef.current?.zoomOut()}
              onReset={() => relatedNodesPanZoomRef.current?.reset()}
              onFit={() => relatedNodesPanZoomRef.current?.fit()}
              onExportSvg={() => fitThenExport(
                relatedNodesPanZoomRef,
                () => exportDiagramAsSvg(relatedNodesRef.current, buildExportTitle(selectedNode.label, "related-nodes"))
              )}
              onExportPng={() => fitThenExport(
                relatedNodesPanZoomRef,
                () => exportDiagramAsPng(relatedNodesRef.current, buildExportTitle(selectedNode.label, "related-nodes"))
              )}
            />
          ) : null}
          {showInterfacePreview ? (
            <DiagramSection
              title="Interface View"
              diagram={focusedDiagrams.interfaceView}
              containerRef={interfaceViewRef}
              onClick={(event) => handleDiagramClick(event, interfaceViewRef.current)}
              onZoomIn={() => interfaceViewPanZoomRef.current?.zoomIn()}
              onZoomOut={() => interfaceViewPanZoomRef.current?.zoomOut()}
              onReset={() => interfaceViewPanZoomRef.current?.reset()}
              onFit={() => interfaceViewPanZoomRef.current?.fit()}
              onExportSvg={() => fitThenExport(
                interfaceViewPanZoomRef,
                () => exportDiagramAsSvg(interfaceViewRef.current, buildExportTitle(selectedNode.label, "interface-view"))
              )}
              onExportPng={() => fitThenExport(
                interfaceViewPanZoomRef,
                () => exportDiagramAsPng(interfaceViewRef.current, buildExportTitle(selectedNode.label, "interface-view"))
              )}
              openInNewTabHref={!isPreviewMode ? buildPreviewHref?.("interface") : null}
            />
          ) : null}
        </div>
      ) : null}

      {selectedRelationship && focusedRelationshipDiagrams ? (
        <div className="diagram-focus-stack">
          {showArchitecturePreview ? (
            <DiagramSection
              title="Architecture"
              diagram={focusedRelationshipDiagrams.architecture}
              containerRef={focusedArchitectureRef}
              onClick={(event) => handleDiagramClick(event, focusedArchitectureRef.current)}
              onZoomIn={() => focusedArchitecturePanZoomRef.current?.zoomIn()}
              onZoomOut={() => focusedArchitecturePanZoomRef.current?.zoomOut()}
              onReset={() => focusedArchitecturePanZoomRef.current?.reset()}
              onFit={() => focusedArchitecturePanZoomRef.current?.fit()}
              onExportSvg={() => fitThenExport(
                focusedArchitecturePanZoomRef,
                () => exportDiagramAsSvg(focusedArchitectureRef.current, buildExportTitle(selectedRelationship.label, "architecture"))
              )}
              onExportPng={() => fitThenExport(
                focusedArchitecturePanZoomRef,
                () => exportDiagramAsPng(focusedArchitectureRef.current, buildExportTitle(selectedRelationship.label, "architecture"))
              )}
              openInNewTabHref={!isPreviewMode ? buildPreviewHref?.("architecture") : null}
            />
          ) : null}
          {!isPreviewMode ? (
            <DiagramSection
              title="Related Nodes"
              diagram={focusedRelationshipDiagrams.relatedNodes}
              containerRef={relatedNodesRef}
              onClick={(event) => handleDiagramClick(event, relatedNodesRef.current)}
              onZoomIn={() => relatedNodesPanZoomRef.current?.zoomIn()}
              onZoomOut={() => relatedNodesPanZoomRef.current?.zoomOut()}
              onReset={() => relatedNodesPanZoomRef.current?.reset()}
              onFit={() => relatedNodesPanZoomRef.current?.fit()}
              onExportSvg={() => fitThenExport(
                relatedNodesPanZoomRef,
                () => exportDiagramAsSvg(relatedNodesRef.current, buildExportTitle(selectedRelationship.label, "related-nodes"))
              )}
              onExportPng={() => fitThenExport(
                relatedNodesPanZoomRef,
                () => exportDiagramAsPng(relatedNodesRef.current, buildExportTitle(selectedRelationship.label, "related-nodes"))
              )}
            />
          ) : null}
          {showInterfacePreview ? (
            <DiagramSection
              title="Interface View"
              diagram={focusedRelationshipDiagrams.interfaceView}
              containerRef={interfaceViewRef}
              onClick={(event) => handleDiagramClick(event, interfaceViewRef.current)}
              onZoomIn={() => interfaceViewPanZoomRef.current?.zoomIn()}
              onZoomOut={() => interfaceViewPanZoomRef.current?.zoomOut()}
              onReset={() => interfaceViewPanZoomRef.current?.reset()}
              onFit={() => interfaceViewPanZoomRef.current?.fit()}
              onExportSvg={() => fitThenExport(
                interfaceViewPanZoomRef,
                () => exportDiagramAsSvg(interfaceViewRef.current, buildExportTitle(selectedRelationship.label, "interface-view"))
              )}
              onExportPng={() => fitThenExport(
                interfaceViewPanZoomRef,
                () => exportDiagramAsPng(interfaceViewRef.current, buildExportTitle(selectedRelationship.label, "interface-view"))
              )}
              openInNewTabHref={!isPreviewMode ? buildPreviewHref?.("interface") : null}
            />
          ) : null}
        </div>
      ) : null}

      {selectedFlow && focusedFlowDiagrams ? (
        <div className="diagram-focus-stack">
          {showArchitecturePreview ? (
            <DiagramSection
              title="Architecture"
              diagram={focusedFlowDiagrams.architecture}
              containerRef={flowArchitectureRef}
              onClick={(event) => handleDiagramClick(event, flowArchitectureRef.current)}
              onZoomIn={() => flowArchitecturePanZoomRef.current?.zoomIn()}
              onZoomOut={() => flowArchitecturePanZoomRef.current?.zoomOut()}
              onReset={() => flowArchitecturePanZoomRef.current?.reset()}
              onFit={() => flowArchitecturePanZoomRef.current?.fit()}
              onExportSvg={() => fitThenExport(
                flowArchitecturePanZoomRef,
                () => exportDiagramAsSvg(flowArchitectureRef.current, buildExportTitle(selectedFlow.label, "architecture"))
              )}
              onExportPng={() => fitThenExport(
                flowArchitecturePanZoomRef,
                () => exportDiagramAsPng(flowArchitectureRef.current, buildExportTitle(selectedFlow.label, "architecture"))
              )}
              openInNewTabHref={!isPreviewMode ? buildPreviewHref?.("architecture") : null}
            />
          ) : null}
          {showFlowPreview ? (
            <DiagramSection
              title="Flow Sequence"
              diagram={focusedFlowDiagrams.flowSequence}
              containerRef={flowSequenceRef}
              onZoomIn={() => flowSequencePanZoomRef.current?.zoomIn()}
              onZoomOut={() => flowSequencePanZoomRef.current?.zoomOut()}
              onReset={() => flowSequencePanZoomRef.current?.reset()}
              onFit={() => flowSequencePanZoomRef.current?.fit()}
              onExportSvg={() => fitThenExport(
                flowSequencePanZoomRef,
                () => exportDiagramAsSvg(flowSequenceRef.current, buildExportTitle(selectedFlow.label, "flow-sequence"))
              )}
              onExportPng={() => fitThenExport(
                flowSequencePanZoomRef,
                () => exportDiagramAsPng(flowSequenceRef.current, buildExportTitle(selectedFlow.label, "flow-sequence"))
              )}
              openInNewTabHref={!isPreviewMode ? buildPreviewHref?.("flow") : null}
            />
          ) : null}
          {showInterfacePreview ? (
            <DiagramSection
              title="Interfaces"
              diagram={focusedFlowDiagrams.interfaces}
              containerRef={flowInterfacesRef}
              onClick={(event) => handleDiagramClick(event, flowInterfacesRef.current)}
              onZoomIn={() => flowInterfacesPanZoomRef.current?.zoomIn()}
              onZoomOut={() => flowInterfacesPanZoomRef.current?.zoomOut()}
              onReset={() => flowInterfacesPanZoomRef.current?.reset()}
              onFit={() => flowInterfacesPanZoomRef.current?.fit()}
              onExportSvg={() => fitThenExport(
                flowInterfacesPanZoomRef,
                () => exportDiagramAsSvg(flowInterfacesRef.current, buildExportTitle(selectedFlow.label, "interfaces"))
              )}
              onExportPng={() => fitThenExport(
                flowInterfacesPanZoomRef,
                () => exportDiagramAsPng(flowInterfacesRef.current, buildExportTitle(selectedFlow.label, "interfaces"))
              )}
              openInNewTabHref={!isPreviewMode ? buildPreviewHref?.("interface") : null}
            />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
