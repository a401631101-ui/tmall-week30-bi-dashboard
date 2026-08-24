export function navigateCockpit(page: string) {
  window.dispatchEvent(new CustomEvent("cockpit:navigate", { detail: page }));
}
