let menu = null;
let cart = [];
let pokeBuilder = { size: 'regular', base: [], proteine: [], fruttaVerdura: [], salse: [], topping: [] };

document.addEventListener('DOMContentLoaded', async () => {
  await loadMenu();
  setupNav();
  setupSizeSelector();
  setupCart();
  setupCustomerCode();
  setupOrder();
});

async function loadMenu() {
  const res = await fetch('/api/menu');
  menu = await res.json();
  renderPokeTradizonali();
  renderBuilderComponents();
  renderMenuList('antipastiList', menu.antipasti);
  renderMenuList('contorniList', menu.contorni);
  renderMenuList('primiList', menu.primiPiatti);
  renderMenuList('secondiList', menu.secondiPiatti);
}

function setupNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + tab).classList.add('active');
    });
  });
}

function renderPokeTradizonali() {
  const grid = document.getElementById('pokeTradizonaliGrid');
  grid.innerHTML = menu.pokeTradizonali.map(p => `
    <div class="poke-card">
      <h3>${p.name}</h3>
      <p class="desc">${p.description}</p>
      <div class="card-footer">
        <span class="price">€ ${p.price.toFixed(2).replace('.', ',')}</span>
        <button class="add-btn" onclick="addToCart({id:'${p.id}', name:'${p.name}', price:${p.price}, detail:'${p.description.replace(/'/g,"\\'")}', qty:1})">+ Aggiungi</button>
      </div>
    </div>
  `).join('');
}

function renderBuilderComponents() {
  const { base, proteine, fruttaVerdura, salse, topping } = menu.pokeComponents;
  document.getElementById('baseGrid').innerHTML = base.map(b => `<span class="chip" data-cat="base" data-val="${b}">${b}</span>`).join('');
  document.getElementById('proteineGrid').innerHTML = proteine.map(p => `<span class="chip${p.extra ? ' extra' : ''}" data-cat="proteine" data-val="${p.name}" data-extra="${p.extra}">${p.name}${p.extra ? ' +€1' : ''}</span>`).join('');
  document.getElementById('fruttaGrid').innerHTML = fruttaVerdura.map(f => `<span class="chip" data-cat="fruttaVerdura" data-val="${f}">${f}</span>`).join('');
  document.getElementById('salseGrid').innerHTML = salse.map(s => `<span class="chip" data-cat="salse" data-val="${s}">${s}</span>`).join('');
  document.getElementById('toppingGrid').innerHTML = topping.map(t => `<span class="chip${t.extra ? ' extra' : ''}" data-cat="topping" data-val="${t.name}" data-extra="${t.extra}">${t.name}${t.extra ? ' +€1' : ''}</span>`).join('');
  document.querySelectorAll('.chip').forEach(chip => chip.addEventListener('click', () => toggleChip(chip)));
  updateBuilderQuotas();
}

function setupSizeSelector() {
  document.querySelectorAll('.size-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.size-opt').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      pokeBuilder.size = opt.dataset.size;
      const limits = menu.pokeSizes[pokeBuilder.size];
      ['base','proteine','fruttaVerdura','salse','topping'].forEach(key => {
        const limit = limits[key];
        if (limit && pokeBuilder[key].length > limit) {
          pokeBuilder[key] = pokeBuilder[key].slice(0, limit);
          syncChipsUI(key);
        }
      });
      updateBuilderQuotas();
    });
  });
  document.querySelector('.size-opt[data-size="regular"]').classList.add('selected');
}

function toggleChip(chip) {
  const cat = chip.dataset.cat;
  const val = chip.dataset.val;
  const limits = menu.pokeSizes[pokeBuilder.size];
  const limit = limits[cat];
  if (chip.classList.contains('selected')) {
    chip.classList.remove('selected');
    pokeBuilder[cat] = pokeBuilder[cat].filter(v => v !== val);
  } else {
    if (cat !== 'proteine' && pokeBuilder[cat].length >= limit) return;
    chip.classList.add('selected');
    pokeBuilder[cat] = [...pokeBuilder[cat], val];
  }
  updateBuilderQuotas();
}

function syncChipsUI(cat) {
  document.querySelectorAll(`.chip[data-cat="${cat}"]`).forEach(chip => {
    chip.classList.toggle('selected', pokeBuilder[cat].includes(chip.dataset.val));
  });
}

function updateBuilderQuotas() {
  const limits = menu.pokeSizes[pokeBuilder.size];
  [['base','baseQuota'],['proteine','proteineQuota'],['fruttaVerdura','fruttaQuota'],['salse','salseQuota'],['topping','toppingQuota']].forEach(([key, elId]) => {
    const el = document.getElementById(elId);
    const count = pokeBuilder[key].length;
    const limit = limits[key];
    el.textContent = `${count}/${limit}`;
    el.classList.toggle('full', count >= limit);
  });
  document.querySelectorAll('.chip').forEach(chip => {
    const cat = chip.dataset.cat;
    const limit = limits[cat];
    const isSelected = chip.classList.contains('selected');
    chip.classList.toggle('disabled', !isSelected && cat !== 'proteine' && pokeBuilder[cat].length >= limit);
  });
  renderBuilderSummary();
}

function renderBuilderSummary() {
  const { base, proteine, fruttaVerdura, salse, topping, size } = pokeBuilder;
  const limits = menu.pokeSizes[size];
  let price = limits.price;
  if (proteine.length > limits.proteine) price += (proteine.length - limits.proteine) * 2;
  [...proteine].forEach(item => {
    const found = menu.pokeComponents.proteine.find(x => x.name === item);
    if (found && found.extra) price += 1;
  });
  [...topping].forEach(item => {
    const found = menu.pokeComponents.topping.find(x => x.name === item);
    if (found && found.extra) price += 1;
  });
  const parts = [];
  if (base.length) parts.push(`🍚 ${base.join(', ')}`);
  if (proteine.length) parts.push(`🐟 ${proteine.join(', ')}`);
  if (fruttaVerdura.length) parts.push(`🥗 ${fruttaVerdura.join(', ')}`);
  if (salse.length) parts.push(`🫙 ${salse.join(', ')}`);
  if (topping.length) parts.push(`✨ ${topping.join(', ')}`);
  document.getElementById('builderSummary').innerHTML = `<div style="margin-bottom:0.4rem">${parts.map(p => `<div style="margin-bottom:0.15rem;font-size:0.85rem">${p}</div>`).join('')}</div><strong style="color:var(--red)">€ ${price.toFixed(2).replace('.', ',')}</strong>`;
}

document.getElementById('addPokeBtn').addEventListener('click', () => {
  const { base, proteine, fruttaVerdura, salse, topping, size } = pokeBuilder;
  if (!base.length || !proteine.length) { alert('Seleziona almeno una base e una proteina!'); return; }
  const limits = menu.pokeSizes[size];
  let price = limits.price;
  if (proteine.length > limits.proteine) price += (proteine.length - limits.proteine) * 2;
  [...proteine].forEach(item => { const f = menu.pokeComponents.proteine.find(x => x.name === item); if (f && f.extra) price += 1; });
  [...topping].forEach(item => { const f = menu.pokeComponents.topping.find(x => x.name === item); if (f && f.extra) price += 1; });
  const parts = [];
  if (base.length) parts.push(`Base: ${base.join(', ')}`);
  if (proteine.length) parts.push(`Proteine: ${proteine.join(', ')}`);
  if (fruttaVerdura.length) parts.push(`Verdure: ${fruttaVerdura.join(', ')}`);
  if (salse.length) parts.push(`Salse: ${salse.join(', ')}`);
  if (topping.length) parts.push(`Topping: ${topping.join(', ')}`);
  addToCart({ id: 'poke-' + Date.now(), name: `Poke ${size.charAt(0).toUpperCase() + size.slice(1)}`, price, detail: parts.join(' · '), qty: 1 });
  pokeBuilder = { size: pokeBuilder.size, base: [], proteine: [], fruttaVerdura: [], salse: [], topping: [] };
  document.querySelectorAll('.chip.selected').forEach(c => c.classList.remove('selected'));
  updateBuilderQuotas();
});

function renderMenuList(elId, items) {
  document.getElementById(elId).innerHTML = items.map(item => `
    <div class="menu-item">
      <span class="menu-item-name">${item.name}</span>
      <span class="menu-item-price">€ ${item.price.toFixed(2).replace('.', ',')}</span>
      <div class="qty-ctrl">
        <button class="qty-btn" onclick="changeQty('${item.id}', -1)">−</button>
        <span class="qty-val" id="qty-${item.id}">0</span>
        <button class="qty-btn" onclick="changeQty('${item.id}', 1, '${item.name.replace(/'/g,"\\'")}', ${item.price})">+</button>
      </div>
    </div>
  `).join('');
}

function changeQty(id, delta, name, price) {
  const el = document.getElementById('qty-' + id);
  const current = parseInt(el.textContent);
  const newVal = Math.max(0, current + delta);
  el.textContent = newVal;
  if (delta > 0 && newVal === 1) {
    addToCart({ id, name, price, detail: '', qty: 1 });
  } else if (delta > 0) {
    const item = cart.find(c => c.id === id);
    if (item) { item.qty = newVal; updateCartUI(); }
  } else {
    if (newVal === 0) cart = cart.filter(c => c.id !== id);
    else { const item = cart.find(c => c.id === id); if (item) item.qty = newVal; }
    updateCartUI();
  }
}

function addToCart(item) {
  const existing = cart.find(c => c.id === item.id && !item.id.startsWith('poke-'));
  if (existing) { existing.qty = (existing.qty || 1) + 1; }
  else cart.push({ ...item, qty: item.qty || 1 });
  updateCartUI();
  const btn = document.getElementById('cartBtn');
  btn.style.transform = 'scale(1.15)';
  setTimeout(() => { btn.style.transform = ''; }, 200);
}

function removeFromCart(id) {
  cart = cart.filter(c => c.id !== id);
  const el = document.getElementById('qty-' + id);
  if (el) el.textContent = '0';
  updateCartUI();
}

function updateCartUI() {
  const count = cart.reduce((s, i) => s + (i.qty || 1), 0);
  const total = cart.reduce((s, i) => s + i.price * (i.qty || 1), 0);
  document.getElementById('cartCount').textContent = count;
  document.getElementById('cartTotal').textContent = `€ ${total.toFixed(2).replace('.', ',')}`;
  document.getElementById('cartTotalFinal').textContent = `€ ${total.toFixed(2).replace('.', ',')}`;
  const itemsEl = document.getElementById('cartItems');
  if (!cart.length) { itemsEl.innerHTML = '<p class="cart-empty">Il carrello è vuoto 🛒</p>'; return; }
  itemsEl.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-header">
        <span class="cart-item-name">${item.name}${item.qty > 1 ? ` ×${item.qty}` : ''}</span>
        <span class="cart-item-price">€ ${(item.price * (item.qty || 1)).toFixed(2).replace('.', ',')}</span>
      </div>
      ${item.detail ? `<p class="cart-item-detail">${item.detail}</p>` : ''}
      <div class="cart-item-actions"><button class="remove-btn" onclick="removeFromCart('${item.id}')">✕ Rimuovi</button></div>
    </div>
  `).join('');
}

function setupCart() {
  document.getElementById('cartBtn').addEventListener('click', openCart);
  document.getElementById('closeCart').addEventListener('click', closeCart);
  document.getElementById('cartOverlay').addEventListener('click', closeCart);
}

function openCart() {
  document.getElementById('cartDrawer').classList.add('open');
  document.getElementById('cartOverlay').classList.add('show');
}

function closeCart() {
  document.getElementById('cartDrawer').classList.remove('open');
  document.getElementById('cartOverlay').classList.remove('show');
}

async function submitOrder() {
  const total = cart.reduce((s, i) => s + i.price * (i.qty || 1), 0);
  const res = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerName: document.getElementById('customerName').value,
      customerCode: document.getElementById('customerCode').value.trim().toUpperCase() || null,
      items: cart, total: total.toFixed(2),
      notes: document.getElementById('orderNotes').value,
    })
  });
  return { data: await res.json(), total };
}

function showSuccessModal(orderNumber, name, total) {
  document.getElementById('modalText').textContent =
    `Ordine #${orderNumber}${name ? ` per ${name}` : ''}· € ${total.toFixed(2).replace('.', ',')}`;
  document.getElementById('successModal').classList.add('show');
  cart = [];
  document.querySelectorAll('.qty-val').forEach(el => el.textContent = '0');
  updateCartUI();
  document.getElementById('customerName').value = '';
  document.getElementById('orderNotes').value = '';
  document.getElementById('customerCode').value = '';
  resetCodeUI();
}

function setupOrder() {
  // Satispay button
  document.getElementById('satispayBtn').addEventListener('click', () => {
    if (!cart.length) { alert('Il carrello è vuoto!'); return; }
    openSatispayModal();
  });

  // Close Satispay modal
  document.getElementById('closeSatispay').addEventListener('click', closeSatispayModal);

  // Satispay confirm payment & submit order
  document.getElementById('satispayConfirm').addEventListener('click', async () => {
    const btn = document.getElementById('satispayConfirm');
    btn.disabled = true; btn.querySelector('#satispayBtnText').textContent = 'Invio in corso...';
    const name = document.getElementById('customerName').value;
    try {
      const { data, total } = await submitOrder();
      if (data.success) {
        closeSatispayModal();
        closeCart();
        showSuccessModal(data.order.orderNumber, name, total);
      }
    } catch(e) { alert("Errore nell'invio. Riprova."); }
    btn.querySelector('#satispayBtnText').textContent = '✓ Ho pagato — Invia ordine';
    btn.disabled = false;
  });

  // PayPal Checkout button
  document.getElementById('checkoutBtn').addEventListener('click', () => {
    if (!cart.length) { alert('Il carrello è vuoto!'); return; }
    openPaypalModal();
  });

  // Close PayPal modal
  document.getElementById('closePaypal').addEventListener('click', closePaypalModal);

  // PayPal confirm payment & submit order
  document.getElementById('paypalConfirm').addEventListener('click', async () => {
    const btn = document.getElementById('paypalConfirm');
    btn.disabled = true; btn.querySelector('#paypalBtnText').textContent = 'Invio in corso...';
    const name = document.getElementById('customerName').value;
    try {
      const { data, total } = await submitOrder();
      if (data.success) {
        closePaypalModal();
        closeCart();
        showSuccessModal(data.order.orderNumber, name, total);
      }
    } catch(e) { alert("Errore nell'invio. Riprova."); }
    btn.querySelector('#paypalBtnText').textContent = '✓ Ho pagato — Invia ordine';
    btn.disabled = false;
  });

  document.getElementById('modalClose').addEventListener('click', () => {
    document.getElementById('successModal').classList.remove('show');
  });
}

function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// ===== PAYPAL QR =====
const PAYPAL_ME = 'gabrielefelici98';

let _paypalTimerInterval = null;

function openPaypalModal() {
  const total = cart.reduce((s, i) => s + i.price * (i.qty || 1), 0);
  const amount = total.toFixed(2);
  const paypalUrl = `https://www.paypal.com/paypalme/${PAYPAL_ME}/${amount}EUR`;

  if (isMobileDevice()) {
    window.open(paypalUrl, '_blank');
  }

  document.getElementById('paypalAmount').textContent = `€ ${amount.replace('.', ',')}`;

  const container = document.getElementById('qrCanvas').parentElement;
  container.innerHTML = '<div id="qrCanvas"></div>';

  if (typeof QRCode !== 'undefined') {
    new QRCode(document.getElementById('qrCanvas'), {
      text: paypalUrl,
      width: 160,
      height: 160,
      colorDark: '#003087',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    });
  } else {
    const el = document.getElementById('qrCanvas');
    el.style.cssText =
      'width:160px;height:160px;display:flex;align-items:center;justify-content:center;font-size:11px;text-align:center;color:#003087;word-break:break-all;';
    el.textContent = paypalUrl;
  }

  // Reset and start countdown
  const btn = document.getElementById('paypalConfirm');
  const timerEl = document.getElementById('paypalTimer');
  btn.disabled = true;
  timerEl.style.display = 'flex';
  let remaining = 30;
  timerEl.textContent = remaining;

  clearInterval(_paypalTimerInterval);
  _paypalTimerInterval = setInterval(() => {
    remaining--;
    timerEl.textContent = remaining;
    if (remaining <= 0) {
      clearInterval(_paypalTimerInterval);
      btn.disabled = false;
      timerEl.style.display = 'none';
    }
  }, 1000);

  document.getElementById('paypalModal').classList.add('show');
}

function closePaypalModal() {
  clearInterval(_paypalTimerInterval);
  document.getElementById('paypalModal').classList.remove('show');
}

// ===== SATISPAY QR =====
const SATISPAY_NAME = 'gabrielefelici98';

let _satispayTimerInterval = null;

function openSatispayModal() {
  const total = cart.reduce((s, i) => s + i.price * (i.qty || 1), 0);
  const amount = total.toFixed(2);

const satispayUrl = `https://satispay.me/${SATISPAY_NAME}`;

  if (isMobileDevice()) {
    window.open(satispayUrl, '_blank');
  }

  document.getElementById('satispayAmount').textContent =
    `€ ${amount.replace('.', ',')}`;

  const container = document.getElementById('satispayQrCanvas').parentElement;
  container.innerHTML = '<div id="satispayQrCanvas"></div>';

  if (typeof QRCode !== 'undefined') {

    new QRCode(document.getElementById('satispayQrCanvas'), {
      text: satispayUrl,
      width: 160,
      height: 160,
      colorDark: '#ff3d00',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    });

  } else {

    const el = document.getElementById('satispayQrCanvas');
    el.style.cssText =
      'width:160px;height:160px;display:flex;align-items:center;justify-content:center;font-size:11px;text-align:center;word-break:break-all;';
    el.textContent = satispayUrl;

  }

  const btn = document.getElementById('satispayConfirm');
  const timerEl = document.getElementById('satispayTimer');

  btn.disabled = true;
  timerEl.style.display = 'flex';

  let remaining = 30;
  timerEl.textContent = remaining;

  clearInterval(_satispayTimerInterval);

  _satispayTimerInterval = setInterval(() => {
    remaining--;
    timerEl.textContent = remaining;

    if (remaining <= 0) {
      clearInterval(_satispayTimerInterval);
      btn.disabled = false;
      timerEl.style.display = 'none';
    }
  }, 1000);

  document.getElementById('satispayModal').classList.add('show');
}

function closeSatispayModal() {
  clearInterval(_satispayTimerInterval);
  document.getElementById('satispayModal').classList.remove('show');
}

// ===== CUSTOMER CODE & HISTORY =====
let _codeDebounce = null;
let _currentHistory = null;

function setupCustomerCode() {
  const input = document.getElementById('customerCode');
  input.addEventListener('input', () => {
    clearTimeout(_codeDebounce);
    const val = input.value.trim().toUpperCase();
    if (!val) {
      resetCodeUI();
      return;
    }
    if (val.length >= 4) {
      _codeDebounce = setTimeout(() => lookupCode(val), 450);
    } else {
      resetCodeUI();
    }
  });
  input.addEventListener('blur', () => {
    const val = input.value.trim().toUpperCase();
    if (val) input.value = val;
  });
}

function resetCodeUI() {
  const input = document.getElementById('customerCode');
  const status = document.getElementById('codeStatus');
  const panel = document.getElementById('historyPanel');
  input.classList.remove('code-found', 'code-new');
  status.textContent = '';
  panel.style.display = 'none';
  panel.innerHTML = '';
  _currentHistory = null;
}

async function lookupCode(code) {
  const input = document.getElementById('customerCode');
  const status = document.getElementById('codeStatus');
  const panel = document.getElementById('historyPanel');

  try {
    const res = await fetch(`/api/customer/${encodeURIComponent(code)}`);
    const data = await res.json();

    if (data.found && data.history.length > 0) {
      _currentHistory = data.history;
      input.classList.add('code-found');
      input.classList.remove('code-new');
      status.textContent = '✓';
      status.style.color = 'var(--green)';
      renderHistoryPanel(data.history, panel);
      panel.style.display = 'block';
    } else {
      _currentHistory = null;
      input.classList.add('code-new');
      input.classList.remove('code-found');
      status.textContent = '★';
      status.style.color = 'var(--orange)';
      panel.style.display = 'block';
      panel.innerHTML = `
        <p class="history-panel-title">Codice cliente</p>
        <p class="history-new-msg">✨ Benvenuto! Questo è il tuo primo ordine con il codice <strong>${code}</strong>. I tuoi ordini futuri verranno ricordati.</p>
      `;
    }
  } catch (e) {
    resetCodeUI();
  }
}

function renderHistoryPanel(history, panel) {
  const sorted = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));
  const lastOrder = sorted[0]; // only the most recent
  const rows = [lastOrder].map((order, idx) => {
    const date = new Date(order.date);
    const dateStr = date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' });
    const timeStr = date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    const itemsSummary = order.items
      .map(i => `${i.name}${i.qty > 1 ? ` ×${i.qty}` : ''}`)
      .join(', ');
    const safeItems = JSON.stringify(order.items).replace(/'/g, "\\'").replace(/"/g, '&quot;');
    return `
      <div class="history-order">
        <div class="history-order-header">
          <span class="history-order-meta">Ordine #${order.orderNumber} · ${dateStr} ${timeStr}</span>
          <span class="history-order-total">€ ${parseFloat(order.total).toFixed(2).replace('.', ',')}</span>
        </div>
        <p class="history-order-items">${itemsSummary}</p>
        <button class="history-reorder-btn" onclick="reorder(${idx})">↩ Riordina</button>
      </div>
    `;
  }).join('');

  panel.innerHTML = `
    <p class="history-panel-title">👋 Bentornato! Il tuo ultimo ordine</p>
    ${rows}
  `;
}

function reorder(historyIdx) {
  if (!_currentHistory) return;
  const sorted = [..._currentHistory].sort((a, b) => new Date(b.date) - new Date(a.date));
  const order = sorted[historyIdx];
  if (!order || !order.items) return;

  order.items.forEach(item => {
    const existing = cart.find(c => c.id === item.id && !item.id.startsWith('poke-'));
    if (existing) {
      existing.qty = (existing.qty || 1) + (item.qty || 1);
    } else {
      cart.push({ ...item });
    }
    // Sync qty display for menu items
    const qtyEl = document.getElementById('qty-' + item.id);
    if (qtyEl) {
      const current = parseInt(qtyEl.textContent) || 0;
      qtyEl.textContent = current + (item.qty || 1);
    }
  });

  updateCartUI();

  // Flash feedback
  const btn = event.target;
  btn.textContent = '✓ Aggiunto!';
  btn.style.background = 'var(--green)';
  setTimeout(() => {
    btn.textContent = '↩ Riordina';
    btn.style.background = '';
  }, 1500);
}

// ===== DEADLINE COUNTDOWN (11:00 AM) =====
(function() {
  const DEADLINE_HOUR = 11;
  const DEADLINE_MIN  = 0;

  function getDeadline() {
    const now = new Date();
    const d = new Date(now);
    d.setHours(DEADLINE_HOUR, DEADLINE_MIN, 0, 0);
    // If already past 11:00 today, aim for tomorrow
    if (now >= d) d.setDate(d.getDate() + 1);
    return d;
  }

  // Window opens at 08:00 — full progress bar span
  function getWindowStart() {
    const d = getDeadline();
    const s = new Date(d);
    s.setHours(8, 0, 0, 0);
    if (s > d) s.setDate(s.getDate() - 1);
    return s;
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  function tick() {
    const now      = new Date();
    const deadline = getDeadline();
    const winStart = getWindowStart();
    const bar      = document.getElementById('deadlineBar');
    const countdown= document.getElementById('deadlineCountdown');
    const progress = document.getElementById('deadlineProgress');
    const icon     = document.getElementById('deadlineIcon');

    const totalMs  = deadline - winStart;
    const leftMs   = deadline - now;

    if ((leftMs/3600000) > 6) {
      // Deadline passed
      countdown.textContent = 'CHIUSO';
      progress.style.width  = '0%';
      bar.className = 'deadline-bar closed';
      icon.textContent = '🔒';
      return;
    }

    const h = Math.floor(leftMs / 3600000);
    const m = Math.floor((leftMs % 3600000) / 60000);
    const s = Math.floor((leftMs % 60000) / 1000);
    countdown.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;

    // Progress bar = how much time is LEFT (shrinks toward deadline)
    const pct = Math.max(0, Math.min(100, (leftMs / totalMs) * 100));
    progress.style.width = pct + '%';

    // Colour states
    const minsLeft = leftMs / 60000;
    bar.classList.remove('warn', 'urgent', 'closed');
    if (minsLeft <= 10) {
      bar.classList.add('urgent');
      icon.textContent = '🚨';
    } else if (minsLeft <= 30) {
      bar.classList.add('warn');
      icon.textContent = '⚠️';
    } else {
      icon.textContent = '⏰';
    }
  }

  tick();
  setInterval(tick, 1000);
})();
