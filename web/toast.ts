// Toasts for the browser host: short lines in a corner stack that fade out.
// A story beat and a host warning both arrive here. A click dismisses one.

export const TOAST_MS = 6000
const MAX_TOASTS = 4

export function createToaster(root: HTMLElement, ms = TOAST_MS): (text: string) => void {
  return (text) => {
    const item = document.createElement('div')
    item.className = 'toast'
    item.textContent = text
    item.addEventListener('click', () => item.remove())
    root.append(item)
    while (root.childElementCount > MAX_TOASTS) root.firstElementChild?.remove()
    setTimeout(() => item.remove(), ms)
  }
}
