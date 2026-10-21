(function () {
  const { esc, money } = SC;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const SESSION_KEY = 'sc_admin_sesion';

  let data = SC.readDraft() || SC.published();
  let editingId = null;
  const ui = { q: '', brand: '' };

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.classList.add('is-on');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('is-on'), 2400);
  }

  async function hash(pw) {
    if (window.crypto && crypto.subtle) return SC.sha256('sc::' + pw);
    let h = 0; for (const c of 'sc::' + pw) h = (h * 31 + c.charCodeAt(0)) | 0; // respaldo si el navegador no tiene crypto.subtle
    return 'x' + (h >>> 0).toString(16);
  }

  /* ---------- Acceso ---------- */
  const storedHash = () => data.config.passwordHash || SC.published().config.passwordHash || '';
  const isSetup = () => !storedHash();

  function showLogin() {
    $('#login').hidden = false; $('#app').hidden = true;
    if (isSetup()) {
      $('#loginMsg').textContent = 'Primera vez: crea una contraseña para proteger tu panel. Guárdala bien.';
      $('#pw2Wrap').hidden = false; $('#pw2').required = true;
      $('#loginBtn').textContent = 'Crear contraseña';
      $('#pw').autocomplete = 'new-password';
    }
    $('#pw').focus();
  }

  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const pw = $('#pw').value;
    $('#loginErr').textContent = '';
    if (isSetup()) {
      if (pw.length < 6) return ($('#loginErr').textContent = 'Usa al menos 6 caracteres.');
      if (pw !== $('#pw2').value) return ($('#loginErr').textContent = 'Las contraseñas no coinciden.');
      data.config.passwordHash = await hash(pw);
      persist();
    } else if (await hash(pw) !== storedHash()) {
      $('#loginErr').textContent = 'Contraseña incorrecta.';
      return;
    }
    sessionStorage.setItem(SESSION_KEY, storedHash());
    start();
  });

  $('#logout').addEventListener('click', () => { sessionStorage.removeItem(SESSION_KEY); location.reload(); });

  /* ---------- Persistencia ---------- */
  function isDirty() { return JSON.stringify(data) !== JSON.stringify(SC.published()); }

  function persist() {
    try {
      if (isDirty()) SC.saveDraft(data); else SC.clearDraft();
    } catch (e) {
      alert('El navegador se quedó sin espacio para el borrador (suele pasar con muchas fotos subidas). Descarga productos.js ahora y usa rutas de imagen en lugar de subir fotos.');
    }
    renderStatus();
  }

  function renderStatus() {
    const s = $('#status');
    const dirty = isDirty();
    s.classList.toggle('is-dirty', dirty);
    s.innerHTML = dirty
      ? '<span>Tienes <strong>cambios sin publicar</strong>. Descarga <code>productos.js</code> y súbelo a tu sitio para que tus clientes los vean.</span><button class="btn btn--dark btn--sm" data-download>Descargar</button>'
      : '<span>Todo está publicado. Lo que ves aquí es lo que ven tus clientes.</span>';
  }

  /* ---------- Lista de perfumes ---------- */
  const norm = s => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const icon = d => '<svg viewBox="0 0 24 24">' + d + '</svg>';
  const ICONS = {
    up: icon('<path d="m6 15 6-6 6 6"/>'),
    down: icon('<path d="m6 9 6 6 6-6"/>'),
    copy: icon('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>'),
    edit: icon('<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13 7 4 4"/>')
  };

  function renderList() {
    const q = norm(ui.q);
    const list = data.productos.filter(p =>
      (!ui.brand || p.marca === ui.brand) &&
      (!q || norm(p.nombre + ' ' + p.marca + ' ' + (p.notas || []).join(' ')).includes(q)));
    $('#aCount').textContent = data.productos.length + ' perfumes en total' + (list.length !== data.productos.length ? ' · ' + list.length + ' mostrados' : '');
    $('#plist').innerHTML = list.map(p => {
      const prices = (p.presentaciones || []).map(s => esc(s.nombre) + ' ' + money(s.precio, data.config)).join(' · ');
      return '<div class="prow" data-id="' + esc(p.id) + '">' +
        (p.imagen ? '<img src="' + esc(p.imagen) + '" alt="" loading="lazy">' : '<span class="ph"></span>') +
        '<div><div class="prow__name">' + esc(p.nombre) + '</div>' +
        '<div class="prow__meta">' + esc(p.marca) + ' · ' + esc(p.genero) + ' · ' + prices + '</div>' +
        '<div class="prow__flags">' + (p.destacado ? '<span class="tag">Destacado</span>' : '') + (p.nuevo ? '<span class="tag">Nuevo</span>' : '') + '</div></div>' +
        '<label class="switch"><input type="checkbox" data-avail ' + (p.disponible !== false ? 'checked' : '') + '> <span>' + (p.disponible !== false ? 'Disponible' : 'Agotado') + '</span></label>' +
        '<div class="prow__actions">' +
          '<button class="icon-btn" data-act="up" title="Subir">' + ICONS.up + '</button>' +
          '<button class="icon-btn" data-act="down" title="Bajar">' + ICONS.down + '</button>' +
          '<button class="icon-btn" data-act="dup" title="Duplicar">' + ICONS.copy + '</button>' +
          '<button class="icon-btn" data-act="edit" title="Editar">' + ICONS.edit + '</button>' +
        '</div></div>';
    }).join('') || '<p class="muted" style="padding:24px 0">Sin resultados.</p>';
  }

  function fillBrands() {
    const brands = [...new Set(data.productos.map(p => p.marca).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
    const sel = $('#aBrand'), cur = sel.value;
    sel.innerHTML = '<option value="">Todas las marcas</option>' + brands.map(b => '<option>' + esc(b) + '</option>').join('');
    sel.value = brands.includes(cur) ? cur : '';
    $('#brandList').innerHTML = brands.map(b => '<option value="' + esc(b) + '">').join('');
  }

  function uniqueId(base) {
    let id = SC.slug(base), n = 2;
    const taken = new Set(data.productos.map(p => p.id));
    while (taken.has(id)) id = SC.slug(base) + '-' + n++;
    return id;
  }

  $('#plist').addEventListener('click', e => {
    const row = e.target.closest('.prow'); if (!row) return;
    const id = row.dataset.id;
    const i = data.productos.findIndex(p => p.id === id);
    const btn = e.target.closest('[data-act]');
    if (!btn) { if (!e.target.closest('.switch')) openEditor(id); return; }
    const act = btn.dataset.act;
    if (act === 'edit') return openEditor(id);
    if (act === 'up' && i > 0) [data.productos[i - 1], data.productos[i]] = [data.productos[i], data.productos[i - 1]];
    if (act === 'down' && i < data.productos.length - 1) [data.productos[i + 1], data.productos[i]] = [data.productos[i], data.productos[i + 1]];
    if (act === 'dup') {
      const copy = SC.clone(data.productos[i]);
      copy.nombre += ' (copia)';
      copy.id = uniqueId(copy.marca + ' ' + copy.nombre);
      data.productos.splice(i + 1, 0, copy);
      toast('Perfume duplicado');
    }
    persist(); renderList();
  });

  $('#plist').addEventListener('change', e => {
    if (!e.target.matches('[data-avail]')) return;
    const p = data.productos.find(x => x.id === e.target.closest('.prow').dataset.id);
    p.disponible = e.target.checked;
    e.target.nextElementSibling.textContent = p.disponible ? 'Disponible' : 'Agotado';
    persist();
  });

  $('#aq').addEventListener('input', e => { ui.q = e.target.value; renderList(); });
  $('#aBrand').addEventListener('change', e => { ui.brand = e.target.value; renderList(); });

  /* ---------- Editor ---------- */
  function sizeRow(s = { nombre: '', precio: '' }) {
    const d = document.createElement('div');
    d.className = 'size-row';
    d.innerHTML = '<input placeholder="Presentación (5 ml)" value="' + esc(s.nombre) + '" data-sname required>' +
      '<input type="number" min="0" step="1" placeholder="Precio" value="' + esc(s.precio) + '" data-sprice required>' +
      '<button type="button" class="icon-btn" title="Quitar" data-sdel><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>';
    return d;
  }

  function openEditor(id) {
    editingId = id;
    const p = id ? data.productos.find(x => x.id === id) : {
      nombre: '', marca: '', genero: 'Hombre', notas: [], descripcion: '', imagen: '',
      presentaciones: [{ nombre: '5 ml', precio: '' }, { nombre: '10 ml', precio: '' }],
      disponible: true, destacado: false, nuevo: true
    };
    const f = $('#editForm');
    $('#editTitle').textContent = id ? 'Editar perfume' : 'Nuevo perfume';
    f.nombre.value = p.nombre; f.marca.value = p.marca; f.genero.value = p.genero || 'Hombre';
    f.notas.value = (p.notas || []).join(', '); f.descripcion.value = p.descripcion || '';
    f.imagen.value = p.imagen || '';
    f.disponible.checked = p.disponible !== false; f.destacado.checked = !!p.destacado; f.nuevo.checked = !!p.nuevo;
    const se = $('#sizesEdit'); se.innerHTML = '';
    (p.presentaciones || []).forEach(s => se.appendChild(sizeRow(s)));
    $('#deleteProduct').hidden = !id;
    updatePreview();
    $('#editor').showModal();
    f.nombre.focus();
  }

  function updatePreview() {
    const v = $('#editForm').imagen.value.trim();
    const img = $('#imgPreview');
    if (v) { img.src = v; img.style.visibility = 'visible'; } else { img.removeAttribute('src'); img.style.visibility = 'hidden'; }
  }

  $('#editForm').imagen.addEventListener('input', updatePreview);
  $('#addSize').addEventListener('click', () => $('#sizesEdit').appendChild(sizeRow()));
  $('#sizesEdit').addEventListener('click', e => {
    const b = e.target.closest('[data-sdel]'); if (!b) return;
    if ($$('.size-row').length <= 1) return toast('Debe haber al menos una presentación');
    b.parentElement.remove();
  });

  $('#imgFile').addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    try {
      $('#editForm').imagen.value = await resizeImage(file, 560, 700);
      updatePreview();
      toast('Foto lista');
    } catch (err) { alert('No se pudo leer esa imagen.'); }
    e.target.value = '';
  });

  function resizeImage(file, W, H) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas'); c.width = W; c.height = H;
        const r = Math.max(W / img.width, H / img.height);
        const w = img.width * r, h = img.height * r;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
        ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
        URL.revokeObjectURL(img.src);
        resolve(c.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  $('#editForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target;
    const p = {
      nombre: f.nombre.value.trim(),
      marca: f.marca.value.trim(),
      genero: f.genero.value,
      notas: f.notas.value.split(',').map(s => s.trim()).filter(Boolean),
      presentaciones: $$('.size-row').map(r => ({ nombre: $('[data-sname]', r).value.trim(), precio: Number($('[data-sprice]', r).value) || 0 })).filter(s => s.nombre),
      imagen: f.imagen.value.trim(),
      descripcion: f.descripcion.value.trim(),
      disponible: f.disponible.checked,
      destacado: f.destacado.checked,
      nuevo: f.nuevo.checked
    };
    if (!p.presentaciones.length) return toast('Agrega al menos una presentación');
    if (editingId) {
      const i = data.productos.findIndex(x => x.id === editingId);
      data.productos[i] = Object.assign({ id: editingId }, p);
    } else {
      data.productos.unshift(Object.assign({ id: uniqueId(p.marca + ' ' + p.nombre) }, p));
    }
    persist(); fillBrands(); renderList();
    $('#editor').close();
    toast(editingId ? 'Cambios guardados' : 'Perfume agregado');
  });

  $('#deleteProduct').addEventListener('click', () => {
    const p = data.productos.find(x => x.id === editingId);
    if (!p || !confirm('¿Eliminar “' + p.nombre + '”? Esta acción no se puede deshacer.')) return;
    data.productos = data.productos.filter(x => x.id !== editingId);
    persist(); fillBrands(); renderList();
    $('#editor').close();
    toast('Perfume eliminado');
  });

  $('#newProduct').addEventListener('click', () => openEditor(null));
  $$('[data-close]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));

  /* ---------- Configuración ---------- */
  const CFG_FIELDS = ['tienda', 'eslogan', 'subtitulo', 'aviso', 'envio', 'whatsapp', 'codigoPais', 'correo', 'instagram', 'moneda'];
  function fillConfig() {
    const f = $('#cfgForm');
    CFG_FIELDS.forEach(k => { f[k].value = data.config[k] || ''; });
  }
  $('#cfgForm').addEventListener('submit', e => {
    e.preventDefault();
    CFG_FIELDS.forEach(k => { data.config[k] = e.target[k].value.trim(); });
    data.config.moneda = (data.config.moneda || 'MXN').toUpperCase();
    persist(); renderList(); setLogo();
    toast('Datos de la tienda guardados');
  });
  $('#pwForm').addEventListener('submit', async e => {
    e.preventDefault();
    if ($('#npw').value !== $('#npw2').value) return toast('Las contraseñas no coinciden');
    data.config.passwordHash = await hash($('#npw').value);
    sessionStorage.setItem(SESSION_KEY, data.config.passwordHash);
    persist(); e.target.reset();
    toast('Contraseña actualizada. Publica productos.js para aplicarla en tu sitio.');
  });

  /* ---------- Publicar / respaldos ---------- */
  function fileText() {
    return '/* Datos de la tienda. Edítalos desde admin.html y reemplaza este archivo con el que descargues. */\n' +
      'window.SC_DATA = ' + JSON.stringify(data, null, 1) + ';\n';
  }
  function download(name, text, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function downloadData() {
    download('productos.js', fileText(), 'text/javascript');
    toast('Descargado. Súbelo a la carpeta data/ de tu sitio.');
  }
  $('#download').addEventListener('click', downloadData);
  $('#downloadTop').addEventListener('click', downloadData);
  $('#status').addEventListener('click', e => { if (e.target.closest('[data-download]')) downloadData(); });

  $('#exportJson').addEventListener('click', () => {
    const d = new Date().toISOString().slice(0, 10);
    download('respaldo-tienda-' + d + '.json', JSON.stringify(data, null, 1), 'application/json');
  });
  $('#importJson').addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    try {
      let txt = await file.text();
      const start = txt.indexOf('{'), end = txt.lastIndexOf('}');
      const obj = JSON.parse(txt.slice(start, end + 1));
      if (!obj.config || !Array.isArray(obj.productos)) throw new Error('formato');
      if (!confirm('Esto reemplazará tu borrador actual con ' + obj.productos.length + ' perfumes. ¿Continuar?')) return;
      if (!obj.config.passwordHash) obj.config.passwordHash = data.config.passwordHash;
      data = obj;
      persist(); refreshAll();
      toast('Respaldo importado');
    } catch (err) { alert('Ese archivo no parece un respaldo válido de la tienda.'); }
    e.target.value = '';
  });
  $('#discard').addEventListener('click', () => {
    if (!confirm('¿Descartar todos los cambios sin publicar y volver a la versión publicada?')) return;
    const keepHash = data.config.passwordHash;
    data = SC.published();
    if (!data.config.passwordHash) data.config.passwordHash = keepHash; // conserva la contraseña creada
    persist(); refreshAll();
    toast('Borrador descartado');
  });

  /* ---------- Pestañas ---------- */
  $$('.tab').forEach(t => t.addEventListener('click', () => {
    $$('.tab').forEach(x => x.classList.toggle('is-active', x === t));
    $$('[data-panel]').forEach(p => { p.hidden = p.dataset.panel !== t.dataset.tab; });
  }));

  function setLogo() {
    const [first, ...rest] = (data.config.tienda || 'SC Fragrances').split(' ');
    $('#aLogo').innerHTML = esc(first) + (rest.length ? ' <em>' + esc(rest.join(' ')) + '</em>' : '');
  }

  function refreshAll() { fillBrands(); renderList(); fillConfig(); renderStatus(); setLogo(); }

  function start() {
    $('#login').hidden = true; $('#app').hidden = false;
    refreshAll();
  }

  if (storedHash() && sessionStorage.getItem(SESSION_KEY) === storedHash()) start();
  else showLogin();
})();
