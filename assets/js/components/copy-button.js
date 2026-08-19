/**
 * <copy-button for="element-id"> — copies another element's text to the
 * clipboard and reports the outcome to assistive technology.
 *
 * A second custom element, this one showing progressive enhancement: it renders
 * a real <button> in light DOM so it still looks and behaves correctly if the
 * module fails to load, and it degrades to a manual-copy hint when the
 * Clipboard API is unavailable (it requires a secure context).
 */
class CopyButton extends HTMLElement {
  #button;
  #live;
  #timer;

  connectedCallback() {
    const label = this.getAttribute('label') || 'Copy';

    this.#button = document.createElement('button');
    this.#button.type = 'button';
    this.#button.className = 'btn ghost copy-button';
    this.#button.textContent = label;

    // A polite live region so screen readers announce the result of a copy,
    // which is otherwise a completely silent action.
    this.#live = document.createElement('span');
    this.#live.className = 'sr-only';
    this.#live.setAttribute('role', 'status');
    this.#live.setAttribute('aria-live', 'polite');

    this.replaceChildren(this.#button, this.#live);
    this.#button.addEventListener('click', () => this.#copy());
  }

  disconnectedCallback() {
    clearTimeout(this.#timer);
  }

  get #sourceText() {
    const id = this.getAttribute('for');
    const source = id ? document.getElementById(id) : null;
    return (source?.textContent || '').trim();
  }

  async #copy() {
    const text = this.#sourceText;
    if (!text) return;

    const original = this.getAttribute('label') || 'Copy';

    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        this.#copyViaSelection(text);
      }
      this.#feedback('Copied', `Copied ${text.length} characters to the clipboard.`, original);
    } catch (error) {
      console.warn('[copy-button]', error);
      this.#feedback('Press Ctrl+C', 'Copy failed. Select the text and press Control or Command C.', original);
    }
  }

  /** Fallback for insecure contexts, where navigator.clipboard is undefined. */
  #copyViaSelection(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0;';
    document.body.append(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    textarea.remove();
    if (!ok) throw new Error('execCommand("copy") was rejected');
  }

  #feedback(buttonText, announcement, original) {
    this.#button.textContent = buttonText;
    this.#live.textContent = announcement;
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => {
      this.#button.textContent = original;
      this.#live.textContent = '';
    }, 2400);
  }
}

if (!customElements.get('copy-button')) {
  customElements.define('copy-button', CopyButton);
}
