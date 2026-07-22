interface ToastOptions {
  duration?: number
  className?: string
}

let container: HTMLElement | null = null

const ensureContainer = () => {
  if (container) return container
  container = document.createElement('div')
  container.className = 'wy-toast-container'
  container.style.cssText = `
    position: fixed;
    left: 50%;
    bottom: 80px;
    transform: translateX(-50%);
    z-index: 9999;
    pointer-events: none;
    display: flex;
    flex-flow: column nowrap;
    align-items: center;
    gap: 8px;
  `
  document.body.appendChild(container)
  return container
}

export const toast = (message: string, options: ToastOptions = {}) => {
  const duration = options.duration ?? 2000
  const el = document.createElement('div')
  el.className = `wy-toast ${options.className ?? ''}`
  el.textContent = message
  el.style.cssText = `
    padding: 10px 18px;
    border-radius: 20px;
    background-color: var(--color-toast-background, rgba(0, 0, 0, 0.75));
    color: var(--color-toast-font, #fff);
    font-size: 14px;
    line-height: 1.4;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    opacity: 0;
    transform: translateY(10px) scale(0.95);
    transition: opacity 0.2s ease, transform 0.2s ease;
    max-width: 80vw;
    word-break: break-word;
    text-align: center;
  `

  const wrapper = ensureContainer()
  wrapper.appendChild(el)

  // Force reflow to trigger transition
  void el.offsetWidth
  el.style.opacity = '1'
  el.style.transform = 'translateY(0) scale(1)'

  const remove = () => {
    el.style.opacity = '0'
    el.style.transform = 'translateY(10px) scale(0.95)'
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el)
      if (container && !container.childNodes.length) {
        document.body.removeChild(container)
        container = null
      }
    }, 200)
  }

  setTimeout(remove, duration)
}

export const toastSuccess = (key: string, fallback?: string) => {
  const message = window.i18n?.t ? (window.i18n.t(key as any) as string) : (fallback ?? key)
  toast(message)
}

export const toastError = (message: string) => {
  toast(message, { className: 'wy-toast--error' })
}
