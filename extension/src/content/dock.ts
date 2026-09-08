import { indicatorAnchor, affectsPlacement } from './youtube-adapter';
// Both in-page disclosures share one placement observer per document.
const registries = new WeakMap<Document, { add(host: HTMLElement): () => void }>();
export function dock(doc: Document, host: HTMLElement): () => void {
  let registry = registries.get(doc);
  if (!registry) {
    const hosts = new Set<HTMLElement>();
    let pending: ReturnType<typeof setTimeout> | undefined;
    function place() {
      clearTimeout(pending); pending = undefined;
      const target = indicatorAnchor(doc);
      // YouTube can keep a wide, left-offset watch column at high zoom. Reserve
      // flow space inside the viewport without changing any host-page layout.
      const left = target?.getBoundingClientRect().left ?? 0;
      const inset = Math.max(0, 16 - left);
      const available = Math.max(0, (doc.defaultView?.innerWidth ?? 0) - Math.max(16, left) - 16);
      for (const el of hosts) {
        if (el.hidden !== Boolean(doc.fullscreenElement)) el.hidden = Boolean(doc.fullscreenElement);
        if (target && el.parentElement !== target) target.prepend(el);
        else if (!target) el.remove();
        el.style.marginLeft = `${inset}px`;
        el.style.maxWidth = `${available}px`;
      }
    }
    function schedule() { if (!pending) pending = setTimeout(place, 150); }
    const observer = new MutationObserver(records => { if (affectsPlacement(records)) schedule(); });
    registry = { add(el) {
      if (!hosts.size) {
        observer.observe(doc.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
        doc.addEventListener('yt-navigate-finish', place);
        doc.addEventListener('fullscreenchange', place);
        doc.defaultView?.addEventListener('resize', schedule);
      }
      hosts.add(el); place();
      return () => {
        hosts.delete(el); el.remove();
        if (!hosts.size) {
          observer.disconnect(); clearTimeout(pending); pending = undefined;
          doc.removeEventListener('yt-navigate-finish', place); doc.removeEventListener('fullscreenchange', place);
          doc.defaultView?.removeEventListener('resize', schedule);
        }
      };
    } };
    registries.set(doc, registry);
  }
  return registry.add(host);
}
