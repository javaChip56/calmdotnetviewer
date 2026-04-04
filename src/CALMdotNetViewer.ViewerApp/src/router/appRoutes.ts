export function architectureRoute(id: string, focus?: string): string {
  if (!focus) {
    return `/architectures/${id}`;
  }

  return `/architectures/${id}?focus=${encodeURIComponent(focus)}`;
}

export function linkedArchitectureRoute(id: string, linkedId: string): string {
  return `/architectures/${id}/linked/${linkedId}`;
}
