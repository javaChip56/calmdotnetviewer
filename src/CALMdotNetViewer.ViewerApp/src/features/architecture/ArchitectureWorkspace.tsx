import { useEffect, useState, type ChangeEvent } from "react";
import { architectureApiClient } from "../../api/architectureApiClient";
import {
  currentDocumentFocusRoute,
  architectureRoute,
  linkedArchitectureRoute,
  parseAppRoute,
  type AppRoutePreviewPane,
  type AppRouteView
} from "../../router/appRoutes";
import { useViewerStore } from "../../store/viewerStore";
import { DetailsPanel } from "../details/DetailsPanel";
import { DiagramViewer } from "../diagram/DiagramViewer";
import { TreeNavigator } from "../tree/TreeNavigator";
import { resolvePrimaryLinkedArchitecture } from "./linkedArchitectureReferences";
import { parseArchitecture } from "./parseArchitecture";
import type { ArchitectureDocument, ArchitectureSummary } from "./types";
import {
  formatValidationError,
  formatValidationNotice,
  selectInitialArchitectureId
} from "./workspaceState";

function selectInitialElementId(parsed: ReturnType<typeof parseArchitecture>): string | null {
  return parsed.nodes[0]?.id ?? parsed.flows[0]?.id ?? null;
}

function resolveFocusElementId(parsed: ReturnType<typeof parseArchitecture>, focus: string | null): string | null {
  if (!focus) {
    return null;
  }

  return parsed.nodes.some((node) => node.id === focus) ||
    parsed.flows.some((flow) => flow.id === focus) ||
    parsed.relationships.some((relationship) => relationship.id === focus)
    ? focus
    : null;
}

function resolveSelectedElementId(
  parsed: ReturnType<typeof parseArchitecture>,
  selectedElementId: string | null
): string | null {
  if (!selectedElementId) {
    return selectInitialElementId(parsed);
  }

  const exists =
    parsed.nodes.some((node) => node.id === selectedElementId) ||
    parsed.flows.some((flow) => flow.id === selectedElementId) ||
    parsed.edges.some((relationship) => relationship.id === selectedElementId);

  return exists ? selectedElementId : selectInitialElementId(parsed);
}

function resolvePreviewPane(
  parsed: ReturnType<typeof parseArchitecture>,
  focusElementId: string | null,
  previewPane: AppRoutePreviewPane | null
): AppRoutePreviewPane {
  if (previewPane === "flow") {
    return parsed.flows.some((flow) => flow.id === focusElementId) ? "flow" : "architecture";
  }

  if (previewPane === "interface") {
    const canRenderInterface =
      parsed.nodes.some((node) => node.id === focusElementId) ||
      parsed.flows.some((flow) => flow.id === focusElementId) ||
      parsed.relationships.some((relationship) => relationship.id === focusElementId);

    return canRenderInterface ? "interface" : "architecture";
  }

  return "architecture";
}

export function ArchitectureWorkspace() {
  const {
    architecture,
    parsedArchitecture,
    selectedElementId,
    isLoading,
    error,
    setArchitecture,
    setSelectedElementId,
    setLoading,
    setError
  } = useViewerStore();
  const [architectures, setArchitectures] = useState<ArchitectureSummary[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [focusElementId, setFocusElementId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<AppRouteView>("workspace");
  const [previewPane, setPreviewPane] = useState<AppRoutePreviewPane>("architecture");
  const [navigationParent, setNavigationParent] = useState<{
    id: string;
    title: string;
    focusElementId: string | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadArchitectureIntoWorkspace(
      availableArchitectures: ArchitectureSummary[],
      options?: {
        targetRoute?: ReturnType<typeof parseAppRoute>;
        historyMode?: "push" | "replace" | "none";
      }
    ) {
      const targetRoute = options?.targetRoute ?? parseAppRoute(window.location.pathname, window.location.search);

      try {
        setLoading(true);
        setError(null);
        if (cancelled) {
          return;
        }

        setArchitectures(availableArchitectures);
        const initialArchitectureId = targetRoute?.architectureId ?? selectInitialArchitectureId(availableArchitectures);
        if (!initialArchitectureId) {
          setNavigationParent(null);
          setNotice("No architectures are currently available. Upload a CALM JSON file to get started.");
          return;
        }

        const loadedArchitecture = targetRoute?.kind === "linked"
          ? await architectureApiClient.getLinkedArchitecture(targetRoute.parentArchitectureId, targetRoute.architectureId)
          : await architectureApiClient.getArchitecture(initialArchitectureId);
        if (cancelled) {
          return;
        }

        const parsed = parseArchitecture(loadedArchitecture.content);
        const resolvedFocus = resolveFocusElementId(parsed, targetRoute?.focus ?? null);
        const preferredSelection = resolvedFocus ?? selectInitialElementId(parsed);
        const resolvedPreviewPane = resolvePreviewPane(parsed, resolvedFocus, targetRoute?.previewPane ?? null);
        setArchitecture(loadedArchitecture, parsed, preferredSelection);
        setFocusElementId(resolvedFocus);
        setViewMode(targetRoute?.view ?? "workspace");
        setPreviewPane(resolvedPreviewPane);
        setNavigationParent(targetRoute?.kind === "linked"
          ? {
              id: targetRoute.parentArchitectureId,
              title: availableArchitectures.find((summary) => summary.id === targetRoute.parentArchitectureId)?.title
                ?? targetRoute.parentArchitectureId,
              focusElementId: null
            }
          : null);
        setNotice(null);

        const route = targetRoute?.kind === "linked"
          ? linkedArchitectureRoute(
              targetRoute.parentArchitectureId,
              loadedArchitecture.id,
              resolvedFocus,
              targetRoute.view,
              resolvedPreviewPane
            )
          : architectureRoute(loadedArchitecture.id, resolvedFocus, targetRoute?.view ?? "workspace", resolvedPreviewPane);

        if (options?.historyMode === "push") {
          window.history.pushState(null, "", route);
        } else if (options?.historyMode !== "none") {
          window.history.replaceState(null, "", route);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : String(loadError));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    async function initializeWorkspace() {
      try {
        const availableArchitectures = await architectureApiClient.getArchitectures();
        if (cancelled) {
          return;
        }

        await loadArchitectureIntoWorkspace(availableArchitectures);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : String(loadError));
          setLoading(false);
        }
      }
    }

    function handlePopState() {
      void (async () => {
        try {
          const availableArchitectures = await architectureApiClient.getArchitectures();
          if (cancelled) {
            return;
          }

          await loadArchitectureIntoWorkspace(availableArchitectures, {
            targetRoute: parseAppRoute(window.location.pathname, window.location.search),
            historyMode: "none"
          });
        } catch (loadError) {
          if (!cancelled) {
            setError(loadError instanceof Error ? loadError.message : String(loadError));
            setLoading(false);
          }
        }
      })();
    }

    window.addEventListener("popstate", handlePopState);
    void initializeWorkspace();

    return () => {
      cancelled = true;
      window.removeEventListener("popstate", handlePopState);
    };
  }, [setArchitecture, setError, setLoading]);

  function updateSelectionRoute(nextSelectedElementId: string | null) {
    if (!architecture || !parsedArchitecture) {
      return;
    }

    const nextPreviewPane = resolvePreviewPane(parsedArchitecture, nextSelectedElementId, previewPane);
    setPreviewPane(nextPreviewPane);
    const route = navigationParent
      ? linkedArchitectureRoute(navigationParent.id, architecture.id, nextSelectedElementId, viewMode, nextPreviewPane)
      : architectureRoute(architecture.id, nextSelectedElementId, viewMode, nextPreviewPane);

    window.history.replaceState(null, "", route);
  }

  function handleSelectElement(id: string) {
    setSelectedElementId(id);
    setFocusElementId(id);
    updateSelectionRoute(id);
  }

  function handleClearFocus() {
    setFocusElementId(null);
    updateSelectionRoute(null);
  }

  async function handleArchitectureChange(event: ChangeEvent<HTMLSelectElement>) {
    const architectureId = event.target.value;
    if (!architectureId) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const loadedArchitecture = await architectureApiClient.getArchitecture(architectureId);
      const parsed = parseArchitecture(loadedArchitecture.content);
      const selectedId = selectInitialElementId(parsed);
      setArchitecture(loadedArchitecture, parsed, selectedId);
      setFocusElementId(null);
      setViewMode("workspace");
      setPreviewPane("architecture");
      setNavigationParent(null);
      setNotice(null);
      window.history.pushState(null, "", architectureRoute(loadedArchitecture.id));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const content = await file.text();
      const validation = await architectureApiClient.validateArchitecture(content, file.name);
      const validationError = formatValidationError(validation);
      if (validationError) {
        setError(validationError);
        setNotice(null);
        return;
      }

      const createdArchitecture = await architectureApiClient.createArchitecture(
        file.name,
        content,
        file.type || "application/json"
      );
      const availableArchitectures = await architectureApiClient.getArchitectures();

      setArchitectures(availableArchitectures);
      const parsed = parseArchitecture(createdArchitecture.content);
      const selectedId = selectInitialElementId(parsed);
      setArchitecture(createdArchitecture, parsed, selectedId);
      setFocusElementId(null);
      setViewMode("workspace");
      setPreviewPane("architecture");
      setNavigationParent(null);
      setNotice(formatValidationNotice(validation) ?? `Loaded ${file.name} successfully.`);
      window.history.pushState(null, "", architectureRoute(createdArchitecture.id));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : String(uploadError));
      setNotice(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefreshArchitectures() {
    try {
      setLoading(true);
      setError(null);

      const refreshedArchitectures = await architectureApiClient.refreshArchitectures();
      setArchitectures(refreshedArchitectures);

      if (refreshedArchitectures.length === 0) {
        setArchitecture(null, null, null);
        setFocusElementId(null);
        setViewMode("workspace");
        setPreviewPane("architecture");
        setNavigationParent(null);
        setNotice("No architectures were found in the configured source folder after refresh.");
        window.history.replaceState(null, "", "/");
        return;
      }

      const hasCurrentArchitecture = architecture
        ? refreshedArchitectures.some((summary) => summary.id === architecture.id)
        : false;

      if (!architecture || !hasCurrentArchitecture) {
        const fallbackArchitectureId = selectInitialArchitectureId(refreshedArchitectures);
        if (!fallbackArchitectureId) {
          setNotice("No architectures were found in the configured source folder after refresh.");
          return;
        }

        const fallbackArchitecture = await architectureApiClient.getArchitecture(fallbackArchitectureId);
        const parsed = parseArchitecture(fallbackArchitecture.content);
        const selectedId = selectInitialElementId(parsed);
        setArchitecture(fallbackArchitecture, parsed, selectedId);
        setFocusElementId(null);
        setPreviewPane("architecture");
        setNavigationParent(null);
        setNotice(hasCurrentArchitecture
          ? "Architecture list refreshed."
          : "The previously selected architecture is no longer available. Loaded the first available document.");
        window.history.replaceState(null, "", architectureRoute(fallbackArchitecture.id, null, viewMode));
        return;
      }

      let reloadedArchitecture: ArchitectureDocument;
      let nextNavigationParent = navigationParent;

      if (navigationParent) {
        try {
          reloadedArchitecture = await architectureApiClient.getLinkedArchitecture(navigationParent.id, architecture.id);
        } catch {
          reloadedArchitecture = await architectureApiClient.getArchitecture(architecture.id);
          nextNavigationParent = null;
        }
      } else {
        reloadedArchitecture = await architectureApiClient.getArchitecture(architecture.id);
      }

      const parsed = parseArchitecture(reloadedArchitecture.content);
      const nextSelectedElementId = resolveSelectedElementId(parsed, selectedElementId);
      const nextFocusElementId = resolveFocusElementId(parsed, focusElementId);
      const nextPreviewPane = resolvePreviewPane(parsed, nextFocusElementId, previewPane);

      setArchitecture(reloadedArchitecture, parsed, nextSelectedElementId);
      setNavigationParent(nextNavigationParent);
      setFocusElementId(nextFocusElementId);
      setPreviewPane(nextPreviewPane);
      setNotice(`Refreshed ${refreshedArchitectures.length} architecture document${refreshedArchitectures.length === 1 ? "" : "s"} from disk.`);

      const route = nextNavigationParent
        ? linkedArchitectureRoute(nextNavigationParent.id, reloadedArchitecture.id, nextFocusElementId, viewMode, nextPreviewPane)
        : architectureRoute(reloadedArchitecture.id, nextFocusElementId, viewMode, nextPreviewPane);
      window.history.replaceState(null, "", route);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : String(refreshError));
      setNotice(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenLinkedArchitecture(linkedId: string) {
    if (!architecture) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const linkedArchitecture = await architectureApiClient.getLinkedArchitecture(architecture.id, linkedId);
      const parsed = parseArchitecture(linkedArchitecture.content);
      const selectedId = selectInitialElementId(parsed);

      setArchitecture(linkedArchitecture, parsed, selectedId);
      setFocusElementId(null);
      setPreviewPane("architecture");
      setNavigationParent({
        id: architecture.id,
        title: architecture.title,
        focusElementId
      });
      setNotice(`Opened linked architecture ${linkedArchitecture.title}.`);
      window.history.pushState(null, "", linkedArchitectureRoute(architecture.id, linkedArchitecture.id, null, viewMode));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }

  async function handleReturnToParent() {
    if (!navigationParent) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const parentArchitecture = await architectureApiClient.getArchitecture(navigationParent.id);
      const parsed = parseArchitecture(parentArchitecture.content);
      const selectedId = navigationParent.focusElementId ?? selectInitialElementId(parsed);

      setArchitecture(parentArchitecture, parsed, selectedId);
      setFocusElementId(navigationParent.focusElementId);
      setPreviewPane(resolvePreviewPane(parsed, navigationParent.focusElementId, previewPane));
      setNavigationParent(null);
      setNotice(`Returned to ${parentArchitecture.title}.`);
      window.history.pushState(
        null,
        "",
        architectureRoute(
          parentArchitecture.id,
          navigationParent.focusElementId,
          viewMode,
          resolvePreviewPane(parsed, navigationParent.focusElementId, previewPane)
        )
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }

  const linkedNodeIds = new Set(
    architecture && parsedArchitecture
      ? parsedArchitecture.nodes
          .filter((node) =>
            Boolean(resolvePrimaryLinkedArchitecture(parsedArchitecture.nodeLookup[node.id], architecture.linkedArchitectures)?.resolvedId)
          )
          .map((node) => node.id)
      : []
  );

  const isPreviewMode = viewMode === "preview";
  const effectivePreviewPane = parsedArchitecture
    ? resolvePreviewPane(parsedArchitecture, focusElementId, previewPane)
    : "architecture";
  const workspaceRoute = architecture
    ? currentDocumentFocusRoute(architecture.id, focusElementId, navigationParent?.id, "workspace")
    : null;

  useEffect(() => {
    if (isPreviewMode) {
      document.title = effectivePreviewPane === "flow"
        ? "Flow"
        : effectivePreviewPane === "interface"
          ? "Interface"
          : "Architecture";
      return;
    }

    document.title = architecture?.title ?? "CALMdotNetViewer";
  }, [architecture?.title, effectivePreviewPane, isPreviewMode]);

  return (
    <>
      {!isPreviewMode ? (
        <>
          <header className="workspace-header">
            <div>
              <h1>{architecture?.title ?? "CALMdotNetViewer"}</h1>
              <p className="subtitle">Open a stored architecture or upload a CALM JSON file to inspect it in the viewer.</p>
            </div>
            <div className="workspace-controls">
              <label className="field-group">
                <span>Open architecture</span>
                <select
                  disabled={architectures.length === 0 || isLoading}
                  value={architecture?.id ?? ""}
                  onChange={handleArchitectureChange}
                >
                  {architectures.length === 0 ? (
                    <option value="">No stored architectures</option>
                  ) : (
                    architectures.map((summary) => (
                      <option key={summary.id} value={summary.id}>
                        {summary.title}
                      </option>
                    ))
                  )}
                </select>
              </label>
              <button
                className="secondary-button workspace-action-button"
                disabled={isLoading}
                onClick={handleRefreshArchitectures}
                type="button"
              >
                Refresh
              </button>
              <label className="upload-button">
                <input accept=".json,application/json" onChange={handleFileUpload} type="file" />
                Upload JSON
              </label>
            </div>
          </header>

          <section className="workspace-meta">
            {architecture ? <span>{architecture.id}</span> : null}
            {parsedArchitecture ? <span>{parsedArchitecture.nodes.length} nodes</span> : null}
            {parsedArchitecture ? <span>{parsedArchitecture.flows.length} flows</span> : null}
            {parsedArchitecture ? <span>{parsedArchitecture.edges.length} relationships</span> : null}
            <span>{architectures.length} loaded documents</span>
          </section>
        </>
      ) : null}

      {isLoading && !architecture ? (
        <p className="status-banner">Loading architecture...</p>
      ) : null}

      {error ? (
        <p className="status-banner is-error">{error}</p>
      ) : null}

      {notice ? (
        <p className="status-banner is-info">{notice}</p>
      ) : null}

      {architecture && parsedArchitecture ? (
        <main className={isPreviewMode ? "workspace-preview" : "workspace-grid"}>
          {!isPreviewMode ? (
            <TreeNavigator
              parsedArchitecture={parsedArchitecture}
              selectedElementId={selectedElementId}
              linkedNodeIds={linkedNodeIds}
              onSelectElement={handleSelectElement}
            />
          ) : null}
          <DiagramViewer
            parsedArchitecture={parsedArchitecture}
            selectedElementId={selectedElementId}
            focusElementId={focusElementId}
            onSelectElement={handleSelectElement}
            onClearFocus={handleClearFocus}
            isPreviewMode={isPreviewMode}
            previewPane={effectivePreviewPane}
            buildPreviewHref={(pane) => architecture
              ? currentDocumentFocusRoute(architecture.id, focusElementId, navigationParent?.id, "preview", pane)
              : null}
            workspaceHref={workspaceRoute}
          />
          {!isPreviewMode ? (
            <DetailsPanel
              architecture={architecture}
              parsedArchitecture={parsedArchitecture}
              selectedElementId={selectedElementId}
              navigationParent={navigationParent}
              onOpenLinkedArchitecture={handleOpenLinkedArchitecture}
              onReturnToParent={handleReturnToParent}
            />
          ) : null}
        </main>
      ) : (
        <section className="panel">
          <div className="panel-header">
            <h2>No architecture loaded</h2>
            <span className="panel-meta">Upload to begin</span>
          </div>
          <p>Select an existing document from the list or upload a CALM JSON file to load it into the viewer.</p>
        </section>
      )}
    </>
  );
}
