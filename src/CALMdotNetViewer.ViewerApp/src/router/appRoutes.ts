export type AppRouteView = "workspace" | "preview";
export type AppRoutePreviewPane = "architecture" | "flow" | "interface";

export type AppRoute =
  | {
      kind: "architecture";
      architectureId: string;
      focus: string | null;
      view: AppRouteView;
      previewPane: AppRoutePreviewPane | null;
    }
  | {
      kind: "linked";
      parentArchitectureId: string;
      architectureId: string;
      focus: string | null;
      view: AppRouteView;
      previewPane: AppRoutePreviewPane | null;
    };

function withQuery(
  path: string,
  focus?: string | null,
  view: AppRouteView = "workspace",
  previewPane?: AppRoutePreviewPane | null
): string {
  const query = new URLSearchParams();
  if (focus) {
    query.set("focus", focus);
  }

  if (view === "preview") {
    query.set("view", view);
    if (previewPane) {
      query.set("pane", previewPane);
    }
  }

  const search = query.toString();
  if (!search) {
    return path;
  }

  return `${path}?${search}`;
}

export function architectureRoute(
  id: string,
  focus?: string | null,
  view: AppRouteView = "workspace",
  previewPane?: AppRoutePreviewPane | null
): string {
  return withQuery(`/architectures/${id}`, focus, view, previewPane);
}

export function linkedArchitectureRoute(
  id: string,
  linkedId: string,
  focus?: string | null,
  view: AppRouteView = "workspace",
  previewPane?: AppRoutePreviewPane | null
): string {
  return withQuery(`/architectures/${id}/linked/${linkedId}`, focus, view, previewPane);
}

export function currentDocumentFocusRoute(
  architectureId: string,
  focus: string | null,
  parentArchitectureId?: string | null,
  view: AppRouteView = "workspace",
  previewPane?: AppRoutePreviewPane | null
): string {
  return parentArchitectureId
    ? linkedArchitectureRoute(parentArchitectureId, architectureId, focus, view, previewPane)
    : architectureRoute(architectureId, focus, view, previewPane);
}

export function parseAppRoute(
  pathname: string,
  search = ""
): AppRoute | null {
  const segments = pathname.split("/").filter(Boolean);
  const query = new URLSearchParams(search);
  const focus = query.get("focus");
  const view = query.get("view") === "preview" ? "preview" : "workspace";
  const previewPaneValue = query.get("pane");
  const previewPane = previewPaneValue === "architecture" || previewPaneValue === "flow" || previewPaneValue === "interface"
    ? previewPaneValue
    : null;

  if (segments.length === 2 && segments[0] === "architectures") {
    return {
      kind: "architecture",
      architectureId: decodeURIComponent(segments[1]),
      focus,
      view,
      previewPane
    };
  }

  if (segments.length === 4 && segments[0] === "architectures" && segments[2] === "linked") {
    return {
      kind: "linked",
      parentArchitectureId: decodeURIComponent(segments[1]),
      architectureId: decodeURIComponent(segments[3]),
      focus,
      view,
      previewPane
    };
  }

  return null;
}
