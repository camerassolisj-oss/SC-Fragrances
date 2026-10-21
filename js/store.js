(function () {
  const { esc, money, waLink } = SC;
  const loaded = SC.loadForStore();
  const cfg = loaded.data.config || {};
  const all = (loaded.data.productos || []);
  const byId = Object.fromEntries(all.map(p => [p.id, p]));
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const fmt = n => money(n, cfg);

  /* ---------- Estado persistente (por navegador) ---------- */
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  let cart = store.get('sc_carrito', []).filter(i => byId[i.id]);
  let favs = store.get('sc_favoritos', []).filter(id => byId[id]);
  const state = { q: '', g: '', brand: '', note: '', sort: 'destacados' };

  /* ---------- Helpers ---------- */
  const minPrice = p => Math.min(...(p.presentaciones || []).map(s => Number(s.precio) || 0));
  const isFav = id => favs.includes(id);
  const norm = s => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('is-on');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('is-on'), 2200);
  }

  function heartSvg() {
    return '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-9.2-9A5 5 0 0 1 12 6.3 5 5 0 0 1 21.2 11C19 15.6 12 20 12 20Z"/></svg>';
  }

  /* ---------- Textos de configuración ---------- */
  function applyConfig() {
    const name = cfg.tienda || 'SC Fragrances';
    const [first, ...rest] = name.split(' ');
    const logoHtml = esc(first) + (rest.length ? ' <em>' + esc(rest.join(' ')) + '</em>' : '');
    $('#logo').innerHTML = logoHtml;
    $('#footBrand').innerHTML = logoHtml;
    document.title = name + ' — Decants de perfumes originales';
    if (cfg.eslogan) {
      const parts = cfg.eslogan.split(',');
      $('#heroTitle').innerHTML = parts.length >= 3
        ? '<span class="nw">' + esc(parts[0]) + ',</span> <em class="nw">' + esc(parts.slice(1, -1).join(',').trim()) + ',</em> <span class="nw">' + esc(parts[parts.length - 1].trim()) + '</span>'
        : esc(cfg.eslogan);
    }
    $('#heroSub').textContent = cfg.subtitulo || '';
    $('#footTag').textContent = cfg.eslogan || '';
    $('#year').textContent = new Date().getFullYear();
    $('#faqShipping').textContent = cfg.envio || '';
    $('#cartShip').textContent = cfg.envio || '';

    const items = (cfg.aviso || '').split('·').map(s => s.trim()).filter(Boolean);
    const line = items.map(s => '<span>' + esc(s) + '</span>').join('<i>✦</i>');
    $('#announce').innerHTML = (line + '<i>✦</i>').repeat(6);

    const hi = 'Hola, vi tu catálogo de ' + name + ' y tengo una pregunta.';
    ['#heroWa', '#waFloat', '#contactWa', '#emptyWa'].forEach(s => { $(s).href = waLink(cfg, hi); $(s).target = '_blank'; $(s).rel = 'noopener'; });
    const n = String(cfg.whatsapp || '').replace(/\D/g, '');
    $('#contactWaNum').textContent = n.length === 10 ? n.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3') : n;
    const ig = String(cfg.instagram || '').replace(/^@/, '');
    $('#contactIg').href = 'https://instagram.com/' + encodeURIComponent(ig);
    $('#contactIgUser').textContent = '@' + ig;
    $('#contactIg').hidden = !ig;
    $('#contactMail').textContent = cfg.correo || '';
    $('#statCount').textContent = all.length;
    if (loaded.preview) $('#previewBar').hidden = false;
  }

  /* ---------- Hero ---------- */
  function renderHero() {
    const picks = all.filter(p => p.destacado && p.imagen).slice(0, 3);
    while (picks.length < 3 && all[picks.length]) picks.push(all[picks.length]);
    $('#heroArt').innerHTML = picks.map((p, i) =>
      '<figure class="hero__img hero__img--' + i + '"><img src="' + esc(p.imagen) + '" alt="" loading="eager"></figure>').join('') +
      '<span class="hero__mono">SC</span>';
  }

  /* ---------- Tarjetas ---------- */
  function card(p) {
    const sizes = p.presentaciones || [];
    const sold = p.disponible === false;
    const badges = (p.nuevo ? '<span class="tag">Nuevo</span>' : '') + (sold ? '<span class="tag tag--muted">Agotado</span>' : '');
    return '<article class="card' + (sold ? ' is-sold' : '') + '" data-id="' + esc(p.id) + '">' +
      '<div class="card__media">' +
        '<button class="card__open" data-open="' + esc(p.id) + '" aria-label="Ver ' + esc(p.nombre) + '">' +
          (p.imagen ? '<img src="' + esc(p.imagen) + '" alt="' + esc(p.marca + ' ' + p.nombre) + '" loading="lazy">' : '<span class="card__ph">' + esc((p.marca || '?')[0]) + '</span>') +
        '</button>' +
        '<div class="card__tags">' + badges + '</div>' +
        '<button class="fav' + (isFav(p.id) ? ' is-on' : '') + '" data-fav="' + esc(p.id) + '" aria-label="Agregar a favoritos" aria-pressed="' + isFav(p.id) + '">' + heartSvg() + '</button>' +
      '</div>' +
      '<div class="card__body">' +
        '<p class="card__brand">' + esc(p.marca) + ' · ' + esc(p.genero || '') + '</p>' +
        '<h3 class="card__name"><button data-open="' + esc(p.id) + '">' + esc(p.nombre) + '</button></h3>' +
        '<p class="card__notes">' + esc((p.notas || []).slice(0, 3).join(' · ')) + '</p>' +
        '<div class="sizes" role="radiogroup" aria-label="Presentación">' +
          sizes.map((s, i) => '<button class="size' + (i === 0 ? ' is-active' : '') + '" data-size="' + i + '" role="radio" aria-checked="' + (i === 0) + '">' +
            '<span>' + esc(s.nombre) + '</span><strong>' + fmt(s.precio) + '</strong></button>').join('') +
        '</div>' +
        '<button class="btn btn--dark btn--block btn--sm" data-add="' + esc(p.id) + '"' + (sold ? ' disabled' : '') + '>' + (sold ? 'Agotado' : 'Agregar al carrito') + '</button>' +
      '</div>' +
    '</article>';
  }

  function filtered() {
    const q = norm(state.q);
    let list = all.filter(p =>
      (!state.g || p.genero === state.g || (state.g !== 'Unisex' && p.genero === 'Unisex')) &&
      (!state.brand || p.marca === state.brand) &&
      (!state.note || (p.notas || []).includes(state.note)) &&
      (!q || norm([p.nombre, p.marca, p.descripcion, (p.notas || []).join(' ')].join(' ')).includes(q)));
    const s = state.sort;
    if (s === 'precio-asc') list.sort((a, b) => minPrice(a) - minPrice(b));
    else if (s === 'precio-desc') list.sort((a, b) => minPrice(b) - minPrice(a));
    else if (s === 'az') list.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    else if (s === 'nuevos') list.sort((a, b) => (b.nuevo ? 1 : 0) - (a.nuevo ? 1 : 0));
    else list.sort((a, b) => (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0));
    // Agotados siempre al final
    return list.sort((a, b) => (a.disponible === false) - (b.disponible === false));
  }

  function renderGrid() {
    const list = filtered();
    $('#grid').innerHTML = list.map(card).join('');
    $('#empty').hidden = list.length > 0;
    $('#resultCount').textContent = list.length + (list.length === 1 ? ' fragancia' : ' fragancias');
  }

  function renderFeatured() {
    const list = all.filter(p => p.destacado && p.disponible !== false);
    $('#destacados-wrap').hidden = !list.length;
    $('#featured').innerHTML = list.map(card).join('');
  }

  function fillFilters() {
    const brands = [...new Set(all.map(p => p.marca).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
    $('#brand').insertAdjacentHTML('beforeend', brands.map(b => '<option>' + esc(b) + '</option>').join(''));
    const counts = {};
    all.forEach(p => (p.notas || []).forEach(n => counts[n] = (counts[n] || 0) + 1));
    const notes = Object.keys(counts).sort((a, b) => a.localeCompare(b, 'es'));
    $('#note').insertAdjacentHTML('beforeend', notes.map(n => '<option value="' + esc(n) + '">' + esc(n) + ' (' + counts[n] + ')</option>').join(''));
  }

  /* ---------- Carrito ---------- */
  function addToCart(id, sizeIdx, qty = 1) {
    const p = byId[id];
    if (!p || p.disponible === false) return;
    const s = p.presentaciones[sizeIdx] || p.presentaciones[0];
    const key = id + '|' + s.nombre;
    const found = cart.find(i => i.key === key);
    if (found) found.qty += qty; else cart.push({ key, id, size: s.nombre, qty });
    saveCart();
    toast('Agregado: ' + p.nombre + ' · ' + s.nombre);
    bump('#cartCount');
  }

  function linePrice(i) {
    const p = byId[i.id];
    const s = p && p.presentaciones.find(x => x.nombre === i.size);
    return s ? Number(s.precio) || 0 : 0;
  }

  function saveCart() {
    cart = cart.filter(i => i.qty > 0 && byId[i.id] && byId[i.id].presentaciones.some(s => s.nombre === i.size));
    store.set('sc_carrito', cart);
    renderCart();
  }

  function renderCart() {
    const count = cart.reduce((a, i) => a + i.qty, 0);
    const b = $('#cartCount');
    b.textContent = count; b.hidden = !count;
    const total = cart.reduce((a, i) => a + linePrice(i) * i.qty, 0);
    $('#cartTotal').textContent = fmt(total);
    $('#cartFoot').hidden = !cart.length;
    $('#cartItems').innerHTML = cart.length ? cart.map(i => {
      const p = byId[i.id];
      return '<div class="line">' +
        '<img src="' + esc(p.imagen) + '" alt="">' +
        '<div class="line__info"><p class="line__brand">' + esc(p.marca) + '</p><p class="line__name">' + esc(p.nombre) + '</p>' +
        '<p class="muted small">' + esc(i.size) + ' · ' + fmt(linePrice(i)) + '</p>' +
        '<div class="qty"><button data-qty="-1" data-key="' + esc(i.key) + '" aria-label="Quitar uno">−</button><span>' + i.qty + '</span><button data-qty="1" data-key="' + esc(i.key) + '" aria-label="Agregar uno">+</button></div></div>' +
        '<div class="line__end"><strong>' + fmt(linePrice(i) * i.qty) + '</strong><button class="link-btn" data-remove="' + esc(i.key) + '">Quitar</button></div>' +
      '</div>';
    }).join('') : '<div class="drawer__empty"><p class="empty__title">Tu carrito está vacío</p><p class="muted">Explora el catálogo y encuentra tu próxima fragancia.</p><button class="btn btn--dark btn--sm" data-close-drawer data-goto="#catalogo">Ver catálogo</button></div>';
  }

  function checkout() {
    if (!cart.length) return;
    const name = '', city = '', note = '';
    const total = cart.reduce((a, i) => a + linePrice(i) * i.qty, 0);
    const lines = cart.map(i => {
      const p = byId[i.id];
      return '• ' + i.qty + ' × ' + p.marca + ' ' + p.nombre + ' (' + i.size + ') — ' + fmt(linePrice(i) * i.qty);
    });
    const msg = ['¡Hola! Quiero hacer este pedido en ' + (cfg.tienda || 'la tienda') + ':', '', ...lines, '',
      'Subtotal: ' + fmt(total),
      name ? 'Nombre: ' + name : '', city ? 'Ciudad: ' + city : '', note ? 'Notas: ' + note : '',
      '', '¿Me confirmas disponibilidad y costo de envío? Gracias.'].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');
    window.open(waLink(cfg, msg), '_blank', 'noopener');
  }

  /* ---------- Favoritos ---------- */
  function toggleFav(id) {
    favs = isFav(id) ? favs.filter(f => f !== id) : [...favs, id];
    store.set('sc_favoritos', favs);
    $$('[data-fav="' + CSS.escape(id) + '"]').forEach(b => { b.classList.toggle('is-on', isFav(id)); b.setAttribute('aria-pressed', isFav(id)); });
    toast(isFav(id) ? 'Guardado en favoritos' : 'Quitado de favoritos');
    if (isFav(id)) bump('#favCount');
    renderFavs();
  }

  function renderFavs() {
    const b = $('#favCount');
    b.textContent = favs.length; b.hidden = !favs.length;
    $('#favItems').innerHTML = favs.length ? favs.map(id => {
      const p = byId[id];
      return '<div class="line">' +
        '<img src="' + esc(p.imagen) + '" alt="">' +
        '<div class="line__info"><p class="line__brand">' + esc(p.marca) + '</p><p class="line__name"><button class="link-btn link-btn--plain" data-open="' + esc(id) + '">' + esc(p.nombre) + '</button></p>' +
        '<p class="muted small">Desde ' + fmt(minPrice(p)) + '</p></div>' +
        '<div class="line__end">' + (p.disponible === false ? '<span class="muted small">Agotado</span>' : '<button class="btn btn--dark btn--xs" data-add="' + esc(id) + '" data-size-idx="0">Agregar</button>') +
        '<button class="link-btn" data-fav="' + esc(id) + '">Quitar</button></div>' +
      '</div>';
    }).join('') : '<div class="drawer__empty"><p class="empty__title">Aún no tienes favoritos</p><p class="muted">Toca el corazón en cualquier perfume para guardarlo aquí.</p></div>';
  }

  function bump(sel) {
    const el = $(sel);
    el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
  }

  /* ---------- Detalle ---------- */
  function openProduct(id) {
    const p = byId[id];
    if (!p) return;
    const sold = p.disponible === false;
    const sizes = p.presentaciones || [];
    $('#pmBody').innerHTML =
      '<div class="pm__media">' + (p.imagen ? '<img src="' + esc(p.imagen) + '" alt="' + esc(p.marca + ' ' + p.nombre) + '">' : '') + '</div>' +
      '<div class="pm__info">' +
        '<p class="eyebrow">' + esc(p.marca) + ' · ' + esc(p.genero || '') + '</p>' +
        '<h2 class="pm__name" id="pmName">' + esc(p.nombre) + '</h2>' +
        (p.descripcion ? '<p class="pm__desc">' + esc(p.descripcion) + '</p>' : '') +
        '<p class="label">Notas olfativas</p>' +
        '<ul class="notes">' + (p.notas || []).map(n => '<li><button data-note="' + esc(n) + '">' + esc(n) + '</button></li>').join('') + '</ul>' +
        '<p class="label">Presentación</p>' +
        '<div class="sizes sizes--lg" role="radiogroup">' + sizes.map((s, i) =>
          '<button class="size' + (i === 0 ? ' is-active' : '') + '" data-size="' + i + '" role="radio" aria-checked="' + (i === 0) + '"><span>' + esc(s.nombre) + '</span><strong>' + fmt(s.precio) + '</strong></button>').join('') + '</div>' +
        '<div class="pm__buy">' +
          '<div class="qty qty--lg"><button data-pmqty="-1" aria-label="Menos">−</button><span id="pmQty">1</span><button data-pmqty="1" aria-label="Más">+</button></div>' +
          '<button class="btn btn--dark" data-add="' + esc(p.id) + '" data-from-modal' + (sold ? ' disabled' : '') + '>' + (sold ? 'Agotado' : 'Agregar al carrito') + '</button>' +
          '<button class="fav fav--inline' + (isFav(p.id) ? ' is-on' : '') + '" data-fav="' + esc(p.id) + '" aria-label="Favorito" aria-pressed="' + isFav(p.id) + '">' + heartSvg() + '</button>' +
        '</div>' +
        '<a class="link-btn" target="_blank" rel="noopener" href="' + esc(waLink(cfg, 'Hola, me interesa el decant de ' + p.marca + ' ' + p.nombre + '. ¿Está disponible?')) + '">Preguntar por WhatsApp →</a>' +
      '</div>';
    const m = $('#productModal');
    if (!m.open) m.showModal();
  }

  /* ---------- Paneles ---------- */
  function openDrawer(id) {
    $$('.drawer').forEach(d => { d.classList.remove('is-open'); d.setAttribute('aria-hidden', 'true'); });
    const d = $(id);
    d.classList.add('is-open'); d.setAttribute('aria-hidden', 'false');
    $('#scrim').hidden = false;
    document.body.classList.add('no-scroll');
  }
  function closeDrawers() {
    $$('.drawer').forEach(d => { d.classList.remove('is-open'); d.setAttribute('aria-hidden', 'true'); });
    $('#scrim').hidden = true;
    document.body.classList.remove('no-scroll');
  }

  /* ---------- Eventos ---------- */
  document.addEventListener('click', e => {
    const t = e.target.closest('button, a');
    if (!t) return;
    if (t.dataset.fav) { e.preventDefault(); toggleFav(t.dataset.fav); return; }
    if (t.dataset.open) { openProduct(t.dataset.open); return; }
    if (t.dataset.size !== undefined) {
      const group = t.parentElement;
      $$('.size', group).forEach(b => { b.classList.toggle('is-active', b === t); b.setAttribute('aria-checked', b === t); });
      return;
    }
    if (t.dataset.add) {
      const scope = t.closest('.card, .pm, .line');
      const active = scope && $('.size.is-active', scope);
      const idx = active ? Number(active.dataset.size) : Number(t.dataset.sizeIdx || 0);
      const qty = t.hasAttribute('data-from-modal') ? Number($('#pmQty').textContent) : 1;
      addToCart(t.dataset.add, idx, qty);
      return;
    }
    if (t.dataset.pmqty) {
      const el = $('#pmQty');
      el.textContent = Math.max(1, Number(el.textContent) + Number(t.dataset.pmqty));
      return;
    }
    if (t.dataset.qty) {
      const i = cart.find(x => x.key === t.dataset.key);
      if (i) { i.qty += Number(t.dataset.qty); saveCart(); }
      return;
    }
    if (t.dataset.remove) { cart = cart.filter(x => x.key !== t.dataset.remove); saveCart(); return; }
    if (t.dataset.note) {
      $('#productModal').close();
      state.note = t.dataset.note; $('#note').value = state.note;
      renderGrid();
      $('#catalogo').scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (t.hasAttribute('data-close')) { t.closest('dialog').close(); return; }
    if (t.hasAttribute('data-close-drawer')) {
      closeDrawers();
      if (t.dataset.goto) $(t.dataset.goto).scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (t.dataset.scroll) {
      const s = $('#featured');
      s.scrollBy({ left: Number(t.dataset.scroll) * s.clientWidth * 0.8, behavior: 'smooth' });
    }
  });

  $('#openCart').addEventListener('click', () => openDrawer('#cartDrawer'));
  $('#openFavs').addEventListener('click', () => openDrawer('#favDrawer'));
  $('#scrim').addEventListener('click', closeDrawers);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawers(); });
  $('#openSearch').addEventListener('click', () => {
    $('#catalogo').scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => $('#q').focus({ preventScroll: true }), 450);
  });
  $('#productModal').addEventListener('click', e => { if (e.target.id === 'productModal') e.target.close(); });

  $('#checkout').addEventListener('click', checkout);
  $('#clearCart').addEventListener('click', () => { if (confirm('¿Vaciar el carrito?')) { cart = []; saveCart(); } });

  let qTimer;
  $('#q').addEventListener('input', e => { clearTimeout(qTimer); qTimer = setTimeout(() => { state.q = e.target.value; renderGrid(); }, 120); });
  $('#genderChips').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    $$('.chip', e.currentTarget).forEach(c => c.classList.toggle('is-active', c === b));
    state.g = b.dataset.g; renderGrid();
  });
  ['brand', 'note', 'sort'].forEach(k => $('#' + k).addEventListener('change', e => { state[k] = e.target.value; renderGrid(); }));

  $('#mailForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const subject = f.get('tipo') + ' — ' + (cfg.tienda || 'Tienda');
    const body = f.get('mensaje') + '\n\n— ' + f.get('nombre');
    location.href = 'mailto:' + (cfg.correo || '') + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    toast('Abriendo tu app de correo…');
  });

  /* ---------- API para la compra directa (checkout.js) ---------- */
  window.SCStore = {
    cfg, byId, fmt, toast, linePrice, closeDrawers,
    getCart: () => cart.slice(),
    clearCart() { cart = []; saveCart(); },
    whatsappOrder: checkout
  };

  /* ---------- Inicio ---------- */
  applyConfig();
  renderHero();
  fillFilters();
  renderFeatured();
  renderGrid();
  renderCart();
  renderFavs();
})();
