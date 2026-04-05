import { useEffect, useState, type ChangeEvent } from "react";
import { architectureApiClient } from "../../api/architectureApiClient";
import {
  architectureRoute,
  linkedArchitectureRoute,
  parseAppRoute
} from "../../router/appRoutes";
import { useViewerStore } from "../../store/viewerStore";
import { DetailsPanel } from "../details/DetailsPanel";
import { DiagramViewer } from "../diagram/DiagramViewer";
import { TreeNavigator } from "../tree/TreeNavigator";
import { resolvePrimaryLinkedArchitecture } from "./linkedArchitectureReferences";
import { parseArchitecture } from "./parseArchitecture";
import type { ArchitectureSummary } from "./types";
import {
  formatValidationError,
  formatValidationNotice,
  selectInitialArchitectureId
} from "./workspaceState";

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
        const resolvedFocus = targetRoute?.focus && parsed.nodes.some((node) => node.id === targetRoute.focus)
          ? targetRoute.focus
          : null;
        const preferredSelection = resolvedFocus ?? parsed.nodes[0]?.id ?? null;
        setArchitecture(loadedArchitecture, parsed, preferredSelection);
        setFocusElementId(resolvedFocus);
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
          ? linkedArchitectureRoute(targetRoute.parentArchitectureId, loadedArchitecture.id, resolvedFocus)
          : architectureRoute(loadedArchitecture.id, resolvedFocus);

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
    if (!architecture) {
      return;
    }

    const route = navigationParent
      ? linkedArchitectureRoute(navigationParent.id, architecture.id, nextSelectedElementId)
      : architectureRoute(architecture.id, nextSelectedElementId);

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
      const selectedId = parsed.nodes[0]?.id ?? null;
      setArchitecture(loadedArchitecture, parsed, selectedId);
      setFocusElementId(null);
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
      const selectedId = parsed.nodes[0]?.id ?? null;
      setArchitecture(createdArchitecture, parsed, selectedId);
      setFocusElementId(null);
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

  async function handleOpenLinkedArchitecture(linkedId: string) {
    if (!architecture) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const linkedArchitecture = await architectureApiClient.getLinkedArchitecture(architecture.id, linkedId);
      const parsed = parseArchitecture(linkedArchitecture.content);
      const selectedId = parsed.nodes[0]?.id ?? null;

      setArchitecture(linkedArchitecture, parsed, selectedId);
      setFocusElementId(null);
      setNavigationParent({
        id: architecture.id,
        title: architecture.title,
        focusElementId
      });
      setNotice(`Opened linked architecture ${linkedArchitecture.title}.`);
      window.history.pushState(null, "", linkedArchitectureRoute(architecture.id, linkedArchitecture.id));
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
      const selectedId = navigationParent.focusElementId ?? parsed.nodes[0]?.id ?? null;

      setArchitecture(parentArchitecture, parsed, selectedId);
      setFocusElementId(navigationParent.focusElementId);
      setNavigationParent(null);
      setNotice(`Returned to ${parentArchitecture.title}.`);
      window.history.pushState(null, "", architectureRoute(parentArchitecture.id, navigationParent.focusElementId));
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

  return (
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
              disabled={architectures.length === 0}
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
          <label className="upload-button">
            <input accept=".json,application/json" onChange={handleFileUpload} type="file" />
            Upload JSON
          </label>
        </div>
      </header>

      <section className="workspace-meta">
        {architecture ? <span>{architecture.id}</span> : null}
        {parsedArchitecture ? <span>{parsedArchitecture.nodes.length} nodes</span> : null}
        {parsedArchitecture ? <span>{parsedArchitecture.edges.length} relationships</span> : null}
        <span>{architectures.length} loaded documents</span>
      </section>

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
        <main className="workspace-grid">
          <TreeNavigator
            parsedArchitecture={parsedArchitecture}
            selectedElementId={selectedElementId}
            linkedNodeIds={linkedNodeIds}
            onSelectElement={handleSelectElement}
          />
          <DiagramViewer
            parsedArchitecture={parsedArchitecture}
            selectedElementId={selectedElementId}
            focusElementId={focusElementId}
            onSelectElement={handleSelectElement}
            onClearFocus={handleClearFocus}
          />
          <DetailsPanel
            architecture={architecture}
            parsedArchitecture={parsedArchitecture}
            selectedElementId={selectedElementId}
            navigationParent={navigationParent}
            onOpenLinkedArchitecture={handleOpenLinkedArchitecture}
            onReturnToParent={handleReturnToParent}
          />
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
