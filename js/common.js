/* Utilidades compartidas entre la tienda (index.html) y el panel (admin.html). */
(function () {
  const DRAFT_KEY = 'sc_borrador_v1';

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function published() {
    return clone(window.SC_DATA || { config: {}, productos: [] });
  }

  function readDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function saveDraft(data) {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); // puede lanzar si se llena el almacenamiento
  }

  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
  }

  // La tienda muestra el borrador solo con ?preview=1 (vista previa desde el panel).
  function loadForStore() {
    const isPreview = new URLSearchParams(location.search).has('preview');
    if (isPreview) {
      const d = readDraft();
      if (d) return { data: d, preview: true };
    }
    return { data: published(), preview: false };
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function money(n, cfg) {
    const v = Number(n) || 0;
    try {
      return new Intl.NumberFormat('es-MX', {
        style: 'currency', currency: (cfg && cfg.moneda) || 'MXN',
        maximumFractionDigits: v % 1 ? 2 : 0
      }).format(v);
    } catch (e) {
      return ((cfg && cfg.simbolo) || '$') + v;
    }
  }

  function slug(s) {
    return String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'perfume';
  }

  function waNumber(cfg) {
    const n = String(cfg.whatsapp || '').replace(/\D/g, '');
    const cc = String(cfg.codigoPais || '').replace(/\D/g, '');
    return n.length > 10 ? n : cc + n;
  }

  function waLink(cfg, text) {
    return 'https://wa.me/' + waNumber(cfg) + (text ? '?text=' + encodeURIComponent(text) : '');
  }

  async function sha256(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  window.SC = { DRAFT_KEY, clone, published, readDraft, saveDraft, clearDraft, loadForStore, esc, money, slug, waNumber, waLink, sha256 };
})();
