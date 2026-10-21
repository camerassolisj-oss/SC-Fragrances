/* Compra directa en la página: datos del cliente, entrega, pago con tarjeta (PayPal)
   o depósito/transferencia, y aviso del pedido por correo (FormSubmit). */
(function () {
  const S = window.SCStore;
  if (!S) return;
  const { esc, waLink } = SC;
  const cfg = S.cfg;
  const fmt = S.fmt;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  const webOrders = cfg.pedidosWeb !== false;
  const entregas = (cfg.entregas && cfg.entregas.length) ? cfg.entregas : [{ nombre: 'Envío a domicilio', precio: 0, domicilio: true }];
  const hasCard = !!String(cfg.paypalClientId || '').trim();
  const hasDeposit = !!(String(cfg.clabe || '').trim() || String(cfg.tarjetaDeposito || '').trim() || String(cfg.cuenta || '').trim());
  const currency = (cfg.moneda || 'MXN').toUpperCase();

  let st = { entrega: 0, pago: hasCard ? 'tarjeta' : 'deposito', folio: '', form: {} };

  /* ---------- Carrito: botones ---------- */
  const buyBtn = $('#buyHere');
  if (!webOrders || (!hasCard && !hasDeposit)) {
    buyBtn.hidden = true;
    $('#checkout').classList.replace('btn--ghost', 'btn--dark');
  } else {
    $('#cartPay').textContent = 'Paga aquí con ' + [hasCard && 'tarjeta de débito o crédito', hasDeposit && 'depósito o transferencia'].filter(Boolean).join(' o ') + '.';
  }
  buyBtn.addEventListener('click', open);
  const modal = $('#checkoutModal');
  modal.addEventListener('click', e => { if (e.target === modal) modal.close(); });

  /* ---------- Cálculos ---------- */
  function totals() {
    const items = S.getCart();
    const sub = items.reduce((a, i) => a + S.linePrice(i) * i.qty, 0);
    const e = entregas[st.entrega] || entregas[0];
    let env = Number(e.precio) || 0;
    const gratis = Number(cfg.envioGratisDesde) || 0;
    if (gratis && sub >= gratis) env = 0;
    return { items, sub, env, total: sub + env, e };
  }

  function newFolio() {
    const d = new Date();
    const ymd = String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    const r = Math.random().toString(36).slice(2, 6).toUpperCase();
    return 'SC-' + ymd + '-' + r;
  }

  function itemLines(items) {
    return items.map(i => {
      const p = S.byId[i.id];
      return i.qty + ' × ' + p.marca + ' ' + p.nombre + ' (' + i.size + ') — ' + fmt(S.linePrice(i) * i.qty);
    });
  }

  /* ---------- Formulario ---------- */
  function open() {
    if (!S.getCart().length) return;
    st.folio = newFolio();
    S.closeDrawers();
    renderForm();
    modal.showModal();
  }

  function radio(name, value, checked, title, sub) {
    return '<label class="opt"><input type="radio" name="' + name + '" value="' + esc(value) + '"' + (checked ? ' checked' : '') + '>' +
      '<span class="opt__body"><span class="opt__title">' + title + '</span>' + (sub ? '<span class="opt__sub">' + sub + '</span>' : '') + '</span></label>';
  }

  function renderForm() {
    const f = st.form;
    const t = totals();
    $('#coBody').innerHTML =
      '<form class="co__grid" id="coForm" novalidate>' +
        '<div class="co__main">' +
          '<p class="eyebrow">Pedido ' + esc(st.folio) + '</p>' +
          '<h2 class="co__title">Finalizar <em>compra</em></h2>' +

          '<fieldset class="co__sec"><legend><span>01</span> Tus datos</legend>' +
            '<div class="co__fields">' +
              field('nombre', 'Nombre completo', 'text', f.nombre, 'autocomplete="name" required') +
              field('telefono', 'WhatsApp / teléfono', 'tel', f.telefono, 'autocomplete="tel" inputmode="tel" required') +
              field('correo', 'Correo electrónico', 'email', f.correo, 'autocomplete="email" required', 'co__full') +
            '</div></fieldset>' +

          '<fieldset class="co__sec"><legend><span>02</span> Entrega</legend>' +
            '<div class="opts">' + entregas.map((e, i) => radio('entrega', i, i === st.entrega, esc(e.nombre),
              (Number(e.precio) ? fmt(e.precio) : 'Sin costo') + (e.domicilio && Number(cfg.envioGratisDesde) ? ' · gratis desde ' + fmt(cfg.envioGratisDesde) : ''))).join('') + '</div>' +
            '<div class="co__fields" id="addrWrap"' + (t.e.domicilio ? '' : ' hidden') + '>' +
              field('direccion', 'Calle, número y colonia', 'text', f.direccion, 'autocomplete="street-address"', 'co__full') +
              field('ciudad', 'Ciudad y estado', 'text', f.ciudad, 'autocomplete="address-level2"') +
              field('cp', 'Código postal', 'text', f.cp, 'autocomplete="postal-code" inputmode="numeric" maxlength="5"') +
            '</div>' +
            '<label class="field co__full"><span>Notas (opcional)</span><textarea name="notas" rows="2" placeholder="Referencias, horario de entrega, si es regalo…">' + esc(f.notas || '') + '</textarea></label>' +
          '</fieldset>' +

          '<fieldset class="co__sec"><legend><span>03</span> Pago</legend>' +
            '<div class="opts">' +
              (hasCard ? radio('pago', 'tarjeta', st.pago === 'tarjeta', 'Tarjeta de débito o crédito', 'Pago seguro procesado por PayPal. No necesitas cuenta.') : '') +
              (hasDeposit ? radio('pago', 'deposito', st.pago === 'deposito', 'Depósito o transferencia', 'Al confirmar verás los datos para pagar. Envíanos tu comprobante.') : '') +
            '</div>' +
          '</fieldset>' +
        '</div>' +

        '<aside class="co__side">' +
          '<p class="label">Resumen</p>' +
          '<ul class="co__items">' + t.items.map(i => {
            const p = S.byId[i.id];
            return '<li><img src="' + esc(p.imagen) + '" alt=""><span><strong>' + esc(p.nombre) + '</strong><small>' + esc(p.marca) + ' · ' + esc(i.size) + ' · ×' + i.qty + '</small></span><b>' + fmt(S.linePrice(i) * i.qty) + '</b></li>';
          }).join('') + '</ul>' +
          '<div class="co__totals" id="coTotals"></div>' +
          '<p class="co__err" id="coErr" role="alert"></p>' +
          '<div id="coPay"></div>' +
          '<button type="button" class="link-btn co__wa" id="coWa">Prefiero pedir por WhatsApp</button>' +
        '</aside>' +
      '</form>';

    renderTotals();
    renderPay();
    const form = $('#coForm');
    form.addEventListener('change', e => {
      if (e.target.name === 'entrega') {
        st.entrega = Number(e.target.value);
        $('#addrWrap').hidden = !totals().e.domicilio;
        renderTotals();
      }
      if (e.target.name === 'pago') { st.pago = e.target.value; renderPay(); }
    });
    form.addEventListener('input', () => { $('#coErr').textContent = ''; });
    form.addEventListener('submit', e => { e.preventDefault(); confirmDeposit(); });
    $('#coWa').addEventListener('click', () => { modal.close(); S.whatsappOrder(); });
  }

  function field(name, label, type, val, attrs, cls) {
    return '<label class="field' + (cls ? ' ' + cls : '') + '"><span>' + label + '</span><input name="' + name + '" type="' + type + '" value="' + esc(val || '') + '" ' + (attrs || '') + '></label>';
  }

  function renderTotals() {
    const t = totals();
    $('#coTotals').innerHTML =
      '<div><span>Subtotal</span><span>' + fmt(t.sub) + '</span></div>' +
      '<div><span>' + esc(t.e.nombre) + '</span><span>' + (t.env ? fmt(t.env) : 'Sin costo') + '</span></div>' +
      '<div class="co__total"><span>Total</span><strong>' + fmt(t.total) + '</strong></div>';
  }

  function renderPay() {
    const box = $('#coPay');
    if (st.pago === 'tarjeta') {
      box.innerHTML = '<div id="paypalBtns" class="pp"><p class="muted small">Cargando pago con tarjeta…</p></div>';
      mountPayPal();
    } else {
      box.innerHTML = '<button type="submit" class="btn btn--dark btn--block">Confirmar pedido</button>';
    }
  }

  function readForm() {
    const fd = new FormData($('#coForm'));
    const f = {};
    for (const [k, v] of fd.entries()) f[k] = String(v).trim();
    st.form = Object.assign(st.form, f);
    return f;
  }

  function validate() {
    const f = readForm();
    const t = totals();
    const err = m => { $('#coErr').textContent = m; return null; };
    if (!t.items.length) return err('Tu carrito está vacío.');
    if (!f.nombre) return err('Escribe tu nombre.');
    if (String(f.telefono).replace(/\D/g, '').length < 10) return err('Escribe un teléfono de 10 dígitos.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.correo)) return err('Revisa tu correo electrónico.');
    if (t.e.domicilio && (!f.direccion || !f.ciudad || !/^\d{5}$/.test(f.cp || ''))) return err('Completa tu dirección y código postal (5 dígitos).');
    return f;
  }

  /* ---------- Depósito / transferencia ---------- */
  async function confirmDeposit() {
    const f = validate();
    if (!f) return;
    const btn = $('#coPay .btn');
    btn.disabled = true; btn.textContent = 'Enviando pedido…';
    await finish('deposito', null);
  }

  /* ---------- Tarjeta (PayPal) ---------- */
  let ppLoading = null;
  function loadPayPal() {
    if (window.paypal) return Promise.resolve(window.paypal);
    if (ppLoading) return ppLoading;
    ppLoading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://www.paypal.com/sdk/js?client-id=' + encodeURIComponent(cfg.paypalClientId.trim()) +
        '&currency=' + currency + '&intent=capture&components=buttons&locale=es_MX';
      s.onload = () => resolve(window.paypal);
      s.onerror = () => { ppLoading = null; reject(new Error('paypal')); };
      document.head.appendChild(s);
    });
    return ppLoading;
  }

  function mountPayPal() {
    loadPayPal().then(paypal => {
      const el = $('#paypalBtns');
      if (!el) return;
      el.innerHTML = '';
      paypal.Buttons({
        style: { layout: 'vertical', shape: 'pill', color: 'black', label: 'pay', height: 48 },
        onClick: (data, actions) => (validate() ? actions.resolve() : actions.reject()),
        createOrder: (data, actions) => {
          const t = totals();
          const money = v => ({ currency_code: currency, value: Number(v).toFixed(2) });
          return actions.order.create({
            purchase_units: [{
              reference_id: st.folio,
              custom_id: st.folio,
              invoice_id: st.folio,
              description: ('Pedido ' + st.folio + ' · ' + (cfg.tienda || 'Tienda')).slice(0, 127),
              amount: Object.assign(money(t.total), { breakdown: { item_total: money(t.sub), shipping: money(t.env) } })
            }],
            application_context: { shipping_preference: 'NO_SHIPPING', brand_name: (cfg.tienda || 'Tienda').slice(0, 127) }
          });
        },
        onApprove: async (data, actions) => {
          $('#coErr').textContent = '';
          $('#coPay').innerHTML = '<p class="muted">Confirmando tu pago…</p>';
          try {
            const det = await actions.order.capture();
            const cap = det && det.purchase_units && det.purchase_units[0].payments && det.purchase_units[0].payments.captures && det.purchase_units[0].payments.captures[0];
            if (cap && cap.status === 'DECLINED') throw new Error('declined');
            await finish('tarjeta', { id: (cap && cap.id) || det.id, estado: (cap && cap.status) || det.status });
          } catch (e) {
            renderPay();
            $('#coErr').textContent = 'Tu banco rechazó el pago o hubo un problema. No se hizo ningún cargo; intenta con otra tarjeta o elige depósito.';
          }
        },
        onCancel: () => { $('#coErr').textContent = 'Cancelaste el pago. Puedes intentarlo de nuevo cuando quieras.'; },
        onError: () => { $('#coErr').textContent = 'No se pudo abrir el pago con tarjeta. Intenta de nuevo o elige depósito.'; }
      }).render('#paypalBtns');
    }).catch(() => {
      const el = $('#paypalBtns');
      if (el) el.innerHTML = '<p class="co__err">No se pudo cargar el pago con tarjeta. Revisa tu conexión o elige depósito.</p>';
    });
  }

  /* ---------- Aviso del pedido y pantalla final ---------- */
  function orderText(o) {
    return [
      'Pedido ' + o.folio + ' — ' + (cfg.tienda || ''),
      '',
      ...o.lineas.map(l => '• ' + l),
      '',
      'Subtotal: ' + fmt(o.sub),
      o.entrega + ': ' + (o.env ? fmt(o.env) : 'sin costo'),
      'Total: ' + fmt(o.total),
      '',
      'Pago: ' + o.estado,
      o.paypal ? 'ID de pago: ' + o.paypal : '',
      '',
      'Nombre: ' + o.nombre,
      'Teléfono: ' + o.telefono,
      'Correo: ' + o.correo,
      o.direccion ? 'Dirección: ' + o.direccion : '',
      o.notas ? 'Notas: ' + o.notas : ''
    ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');
  }

  async function notify(o) {
    if (!cfg.correo) return false;
    const payload = {
      _subject: (o.pagado ? '✅ PAGADO · ' : '🕓 Pendiente de pago · ') + 'Pedido ' + o.folio + ' · ' + fmt(o.total),
      _template: 'table',
      _captcha: 'false',
      _replyto: o.correo,
      Folio: o.folio,
      Estado: o.estado,
      'ID de pago': o.paypal || '—',
      Total: fmt(o.total),
      Subtotal: fmt(o.sub),
      Entrega: o.entrega + ' (' + (o.env ? fmt(o.env) : 'sin costo') + ')',
      Productos: o.lineas.join('\n'),
      Cliente: o.nombre,
      Teléfono: o.telefono,
      WhatsApp: waLink({ whatsapp: o.telefono, codigoPais: cfg.codigoPais }),
      email: o.correo,
      Dirección: o.direccion || '—',
      Notas: o.notas || '—',
      Fecha: new Date().toLocaleString('es-MX'),
      _autoresponse: 'Hola ' + o.nombre + ', recibimos tu pedido ' + o.folio + ' por ' + fmt(o.total) + ' en ' + (cfg.tienda || 'nuestra tienda') + '. ' +
        (o.pagado ? 'Tu pago fue aprobado. ' : 'Recuerda enviarnos tu comprobante de pago. ') + 'Te contactaremos por WhatsApp para coordinar la entrega. ¡Gracias!'
    };
    try {
      const r = await fetch('https://formsubmit.co/ajax/' + encodeURIComponent(cfg.correo), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      });
      const j = await r.json();
      return r.ok && (j.success === true || j.success === 'true');
    } catch (e) { return false; }
  }

  async function finish(method, pay) {
    const f = st.form;
    const t = totals();
    const pagado = method === 'tarjeta';
    const o = {
      folio: st.folio, pagado,
      estado: pagado ? 'PAGADO con tarjeta' : 'Pendiente · depósito o transferencia',
      paypal: pay ? pay.id : '',
      lineas: itemLines(t.items), sub: t.sub, env: t.env, total: t.total, entrega: t.e.nombre,
      nombre: f.nombre, telefono: f.telefono, correo: f.correo,
      direccion: t.e.domicilio ? [f.direccion, f.ciudad, 'CP ' + f.cp].filter(Boolean).join(', ') : '',
      notas: f.notas
    };
    const sent = await notify(o);
    S.clearCart();
    st.form = {};
    renderDone(o, sent);
  }

  function copyRow(label, value) {
    if (!value) return '';
    return '<div class="bank__row"><span>' + label + '</span><strong>' + esc(value) + '</strong>' +
      '<button type="button" class="link-btn" data-copy="' + esc(value) + '">Copiar</button></div>';
  }

  function renderDone(o, sent) {
    const first = String(o.nombre).split(' ')[0];
    const proof = waLink(cfg, 'Hola, envío el comprobante de mi pedido ' + o.folio + ' por ' + fmt(o.total) + '.');
    const full = waLink(cfg, '¡Hola! Hice este pedido en la página:\n\n' + orderText(o));
    $('#coBody').innerHTML =
      '<div class="done">' +
        '<p class="eyebrow">Pedido ' + esc(o.folio) + '</p>' +
        '<h2 class="co__title">¡Gracias, <em>' + esc(first) + '!</em></h2>' +
        (o.pagado
          ? '<p class="done__lead">Tu pago de <strong>' + fmt(o.total) + '</strong> fue aprobado. Te escribiremos por WhatsApp para coordinar la entrega.</p>'
          : '<p class="done__lead">Tu pedido quedó registrado. Para completarlo, deposita o transfiere <strong>' + fmt(o.total) + '</strong>:</p>' +
            '<div class="bank">' +
              copyRow('Banco', cfg.banco) + copyRow('Titular', cfg.titular) + copyRow('CLABE', cfg.clabe) +
              copyRow('Cuenta', cfg.cuenta) + copyRow('Tarjeta (depósito en OXXO o ventanilla)', cfg.tarjetaDeposito) +
              copyRow('Concepto', o.folio) + copyRow('Monto', fmt(o.total)) +
            '</div>' +
            (cfg.instruccionesPago ? '<p class="muted">' + esc(cfg.instruccionesPago) + '</p>' : '') +
            '<a class="btn btn--dark btn--block" target="_blank" rel="noopener" href="' + esc(proof) + '">Enviar comprobante por WhatsApp</a>') +
        (sent
          ? '<p class="muted small">Enviamos la confirmación a ' + esc(o.correo) + '.</p>'
          : '<p class="co__err">No pudimos enviar el aviso automático. Mándanos tu pedido por WhatsApp para confirmarlo:</p>' +
            '<a class="btn btn--ghost btn--block" target="_blank" rel="noopener" href="' + esc(full) + '">Enviar pedido por WhatsApp</a>') +
        '<button type="button" class="link-btn" data-close>Seguir comprando</button>' +
      '</div>';
  }

  $('#coBody').addEventListener('click', e => {
    const b = e.target.closest('[data-copy]');
    if (!b) return;
    const v = b.dataset.copy;
    (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(
      () => S.toast('Copiado: ' + v),
      () => S.toast(v)
    );
  });
})();
