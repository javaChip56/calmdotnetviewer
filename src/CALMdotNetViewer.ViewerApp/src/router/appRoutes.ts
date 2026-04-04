export type AppRoute =
  | {
      kind: "architecture";
      architectureId: string;
      focus: string | null;
    }
  | {
      kind: "linked";
      parentArchitectureId: string;
      architectureId: string;
      focus: string | null;
    };

function withFocus(path: string, focus?: string | null): string {
  if (!focus) {
    return path;
  }

  return `${path}?focus=${encodeURIComponent(focus)}`;
}

export function architectureRoute(id: string, focus?: string | null): string {
  return withFocus(`/architectures/${id}`, focus);
}

export function linkedArchitectureRoute(id: string, linkedId: string, focus?: string | null): string {
  return withFocus(`/architectures/${id}/linked/${linkedId}`, focus);
}

export function currentDocumentFocusRoute(
  architectureId: string,
  focus: string | null,
  parentArchitectureId?: string | null
): string {
  return parentArchitectureId
    ? linkedArchitectureRoute(parentArchitectureId, architectureId, focus)
    : architectureRoute(architectureId, focus);
}

export function parseAppRoute(
  pathname: string,
  search = ""
): AppRoute | null {
  const segments = pathname.split("/").filter(Boolean);
  const focus = new URLSearchParams(search).get("focus");

  if (segments.length === 2 && segments[0] === "architectures") {
    return {
      kind: "architecture",
      architectureId: decodeURIComponent(segments[1]),
      focus
    };
  }

  if (segments.length === 4 && segments[0] === "architectures" && segments[2] === "linked") {
    return {
      kind: "linked",
      parentArchitectureId: decodeURIComponent(segments[1]),
      architectureId: decodeURIComponent(segments[3]),
      focus
    };
  }

  return null;
}
