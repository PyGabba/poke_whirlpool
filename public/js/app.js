let menu = null;
let cart = [];
let pokeBuilder = { size: 'regular', base: [], proteine: [], fruttaVerdura: [], salse: [], topping: [] };

// ── Favourites state ──────────────────────────────────────────────────────────
let _favourites     = [];   // array of favourite items from MongoDB
let _currentCode    = null; // currently entered customer code

document.addEventListener('DOMContentLoaded', async () => {
  await loadMenu();
  setupNav();
  setupSizeSelector();
  setupCart();
  setupCustomerCode();
  setupOrder();
  setupEmailMemory();
});

async function loadMenu() {
  const res = await fetch('/api/menu');
  menu = await res.json();
  renderPokeTradizonali();
  renderBuilderComponents();
  renderMenuList('antipastiList',  menu.antipasti,     'antipasti');
  renderMenuList('contorniList',   menu.contorni,      'contorni');
  renderMenuList('primiList',      menu.primiPiatti,   'primiPiatti');
  renderMenuList('secondiList',    menu.secondiPiatti, 'secondiPiatti');
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
        <button class="fav-btn ${isFavourite(p.id) ? 'fav-active' : ''}"
                onclick="toggleFavourite('${p.id}','${p.name.replace(/'/g,"\\'")}','pokeTradizonali',${p.price})"
                title="Aggiungi ai preferiti">♥</button>
        <button class="add-btn" onclick="addToCart({id:'${p.id}', name:'${p.name}', price:${p.price}, detail:'${p.description.replace(/'/g,"\\'")}', qty:1})">+ Aggiungi</button>
      </div>
    </div>
  `).join('');
}

function renderBuilderComponents() {
  const { base, proteine, fruttaVerdura, salse, topping } = menu.pokeComponents;
  document.getElementById('baseGrid').innerHTML       = base.map(b => `<span class="chip" data-cat="base" data-val="${b}">${b}</span>`).join('');
  document.getElementById('proteineGrid').innerHTML   = proteine.map(p => `<span class="chip${p.extra ? ' extra' : ''}" data-cat="proteine" data-val="${p.name}" data-extra="${p.extra}">${p.name}${p.extra ? ' +€1' : ''}</span>`).join('');
  document.getElementById('fruttaGrid').innerHTML     = fruttaVerdura.map(f => `<span class="chip" data-cat="fruttaVerdura" data-val="${f}">${f}</span>`).join('');
  document.getElementById('salseGrid').innerHTML      = salse.map(s => `<span class="chip" data-cat="salse" data-val="${s}">${s}</span>`).join('');
  document.getElementById('toppingGrid').innerHTML    = topping.map(t => `<span class="chip${t.extra ? ' extra' : ''}" data-cat="topping" data-val="${t.name}" data-extra="${t.extra}">${t.name}${t.extra ? ' +€1' : ''}</span>`).join('');
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
  const limit  = limits[cat];
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
    const el    = document.getElementById(elId);
    const count = pokeBuilder[key].length;
    const limit = limits[key];
    el.textContent = `${count}/${limit}`;
    el.classList.toggle('full', count >= limit);
  });
  document.querySelectorAll('.chip').forEach(chip => {
    const cat       = chip.dataset.cat;
    const limit     = limits[cat];
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
  [...proteine].forEach(item => { const f = menu.pokeComponents.proteine.find(x => x.name === item); if (f && f.extra) price += 1; });
  [...topping].forEach(item  => { const f = menu.pokeComponents.topping.find(x => x.name === item);  if (f && f.extra) price += 1; });
  const parts = [];
  if (base.length)          parts.push(`🍚 ${base.join(', ')}`);
  if (proteine.length)      parts.push(`🐟 ${proteine.join(', ')}`);
  if (fruttaVerdura.length) parts.push(`🥗 ${fruttaVerdura.join(', ')}`);
  if (salse.length)         parts.push(`🫙 ${salse.join(', ')}`);
  if (topping.length)       parts.push(`✨ ${topping.join(', ')}`);
  document.getElementById('builderSummary').innerHTML =
    `<div style="margin-bottom:0.4rem">${parts.map(p => `<div style="margin-bottom:0.15rem;font-size:0.85rem">${p}</div>`).join('')}</div>` +
    `<strong style="color:var(--red)">€ ${price.toFixed(2).replace('.', ',')}</strong>`;
}

document.getElementById('addPokeBtn').addEventListener('click', () => {
  const { base, proteine, fruttaVerdura, salse, topping, size } = pokeBuilder;
  if (!base.length || !proteine.length) { alert('Seleziona almeno una base e una proteina!'); return; }
  const limits = menu.pokeSizes[size];
  let price = limits.price;
  if (proteine.length > limits.proteine) price += (proteine.length - limits.proteine) * 2;
  [...proteine].forEach(item => { const f = menu.pokeComponents.proteine.find(x => x.name === item); if (f && f.extra) price += 1; });
  [...topping].forEach(item  => { const f = menu.pokeComponents.topping.find(x => x.name === item);  if (f && f.extra) price += 1; });
  const parts = [];
  if (base.length)          parts.push(`Base: ${base.join(', ')}`);
  if (proteine.length)      parts.push(`Proteine: ${proteine.join(', ')}`);
  if (fruttaVerdura.length) parts.push(`Verdure: ${fruttaVerdura.join(', ')}`);
  if (salse.length)         parts.push(`Salse: ${salse.join(', ')}`);
  if (topping.length)       parts.push(`Topping: ${topping.join(', ')}`);
  addToCart({ id: 'poke-' + Date.now(), name: `Poke ${size.charAt(0).toUpperCase() + size.slice(1)}`, price, detail: parts.join(' · '), qty: 1 });
  pokeBuilder = { size: pokeBuilder.size, base: [], proteine: [], fruttaVerdura: [], salse: [], topping: [] };
  document.querySelectorAll('.chip.selected').forEach(c => c.classList.remove('selected'));
  updateBuilderQuotas();
});

// ── renderMenuList — now includes ♥ favourite button ─────────────────────────
function renderMenuList(elId, items, category) {
  document.getElementById(elId).innerHTML = items.map(item => `
    <div class="menu-item">
      <span class="menu-item-name">${item.name}</span>
      <span class="menu-item-price">€ ${item.price.toFixed(2).replace('.', ',')}</span>
      <div class="qty-ctrl">
        <button class="fav-btn ${isFavourite(item.id) ? 'fav-active' : ''}"
                onclick="toggleFavourite('${item.id}','${item.name.replace(/'/g,"\\'")}','${category}',${item.price})"
                title="Preferiti">♥</button>
        <button class="qty-btn" onclick="changeQty('${item.id}', -1)">−</button>
        <span class="qty-val" id="qty-${item.id}">0</span>
        <button class="qty-btn" onclick="changeQty('${item.id}', 1, '${item.name.replace(/'/g,"\\'")}', ${item.price})">+</button>
      </div>
    </div>
  `).join('');
}

function changeQty(id, delta, name, price) {
  const el      = document.getElementById('qty-' + id);
  const current = parseInt(el.textContent);
  const newVal  = Math.max(0, current + delta);
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
  document.getElementById('cartCount').textContent    = count;
  document.getElementById('cartTotal').textContent    = `€ ${total.toFixed(2).replace('.', ',')}`;
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

function openCart()  { document.getElementById('cartDrawer').classList.add('open');    document.getElementById('cartOverlay').classList.add('show'); }
function closeCart() { document.getElementById('cartDrawer').classList.remove('open'); document.getElementById('cartOverlay').classList.remove('show'); }

async function submitOrder(paymentMethod) {
  const total = cart.reduce((s, i) => s + i.price * (i.qty || 1), 0);
  const res = await fetch('/api/orders', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerName:  document.getElementById('customerName').value,
      customerEmail: document.getElementById('customerEmail').value.trim() || null,
      items:        cart,
      total:        total.toFixed(2),
      notes:        document.getElementById('orderNotes').value,
      bacchette:    document.getElementById('bacchette').checked,
      paymentMethod: paymentMethod || 'unknown',
    }),
  });
  return { data: await res.json(), total };
}

function showSuccessModal(orderNumber, name, total) {
  document.getElementById('modalText').textContent =
    `Ordine #${orderNumber}${name ? ` per ${name}` : ''} · € ${total.toFixed(2).replace('.', ',')}`;
  document.getElementById('successModal').classList.add('show');
  cart = [];
  document.querySelectorAll('.qty-val').forEach(el => el.textContent = '0');
  updateCartUI();
  document.getElementById('customerName').value  = '';
  document.getElementById('customerEmail').value = '';
  document.getElementById('orderNotes').value    = '';
  document.getElementById('bacchette').checked   = false;
  resetCodeUI();
}

function setupOrder() {
  // Satispay
  document.getElementById('satispayBtn').addEventListener('click', () => {
    if (!cart.length) { alert('Il carrello è vuoto!'); return; }
    openSatispayModal();
  });
  document.getElementById('closeSatispay').addEventListener('click', closeSatispayModal);
  document.getElementById('satispayConfirm').addEventListener('click', async () => {
    const btn  = document.getElementById('satispayConfirm');
    btn.disabled = true; btn.querySelector('#satispayBtnText').textContent = 'Invio in corso...';
    const name = document.getElementById('customerName').value;
    try {
      const { data, total } = await submitOrder('satispay');
      if (data.success) { closeSatispayModal(); closeCart(); showSuccessModal(data.order.orderNumber, name, total); startRejectionPolling(data.order.id); }
    } catch(e) { alert("Errore nell'invio. Riprova."); }
    btn.querySelector('#satispayBtnText').textContent = '✓ Ho pagato — Invia ordine';
    btn.disabled = false;
  });

  // PayPal
  document.getElementById('checkoutBtn').addEventListener('click', () => {
    if (!cart.length) { alert('Il carrello è vuoto!'); return; }
    openPaypalModal();
  });
  document.getElementById('closePaypal').addEventListener('click', closePaypalModal);
  document.getElementById('paypalConfirm').addEventListener('click', async () => {
    const btn  = document.getElementById('paypalConfirm');
    btn.disabled = true; btn.querySelector('#paypalBtnText').textContent = 'Invio in corso...';
    const name = document.getElementById('customerName').value;
    try {
      const { data, total } = await submitOrder('paypal');
      if (data.success) { closePaypalModal(); closeCart(); showSuccessModal(data.order.orderNumber, name, total); startRejectionPolling(data.order.id); }
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
  const total     = cart.reduce((s, i) => s + i.price * (i.qty || 1), 0);
  const amount    = total.toFixed(2);
  const paypalUrl = `https://www.paypal.com/paypalme/${PAYPAL_ME}/${amount}EUR`;
  if (isMobileDevice()) window.open(paypalUrl, '_blank');
  document.getElementById('paypalAmount').textContent = `€ ${amount.replace('.', ',')}`;
  const container = document.getElementById('qrCanvas').parentElement;
  container.innerHTML = '<div id="qrCanvas"></div>';
  if (typeof QRCode !== 'undefined') {
    new QRCode(document.getElementById('qrCanvas'), { text: paypalUrl, width: 160, height: 160, colorDark: '#003087', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.H });
  } else {
    const el = document.getElementById('qrCanvas');
    el.style.cssText = 'width:160px;height:160px;display:flex;align-items:center;justify-content:center;font-size:11px;text-align:center;color:#003087;word-break:break-all;';
    el.textContent = paypalUrl;
  }
  const btn     = document.getElementById('paypalConfirm');
  const timerEl = document.getElementById('paypalTimer');
  btn.disabled = true; timerEl.style.display = 'flex';
  let remaining = 30; timerEl.textContent = remaining;
  clearInterval(_paypalTimerInterval);
  _paypalTimerInterval = setInterval(() => {
    remaining--; timerEl.textContent = remaining;
    if (remaining <= 0) { clearInterval(_paypalTimerInterval); btn.disabled = false; timerEl.style.display = 'none'; }
  }, 1000);
  document.getElementById('paypalModal').classList.add('show');
}

function closePaypalModal() {
  clearInterval(_paypalTimerInterval);
  document.getElementById('paypalModal').classList.remove('show');
}

// ===== SATISPAY QR =====
const SATISPAY_NAME = 'S6Y-CON--77B75E49-43A0-40D4-9D20-9620A9B11D88';
let _satispayTimerInterval = null;

function openSatispayModal() {
  const total       = cart.reduce((s, i) => s + i.price * (i.qty || 1), 0);
  const amount      = total.toFixed(2);
  const satispayUrl = `https://web.satispay.com/app/match/link/user/${SATISPAY_NAME}?amount=${amount*100}&currency=EUR`;
  if (isMobileDevice()) window.open(satispayUrl, '_blank');
  document.getElementById('satispayAmount').textContent = `€ ${amount.replace('.', ',')}`;
  const container = document.getElementById('satispayQrCanvas').parentElement;
  container.innerHTML = '<div id="satispayQrCanvas"></div>';
  if (typeof QRCode !== 'undefined') {
    new QRCode(document.getElementById('satispayQrCanvas'), { text: satispayUrl, width: 160, height: 160, colorDark: '#ff3d00', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.H });
  } else {
    const el = document.getElementById('satispayQrCanvas');
    el.style.cssText = 'width:160px;height:160px;display:flex;align-items:center;justify-content:center;font-size:11px;text-align:center;word-break:break-all;';
    el.textContent = satispayUrl;
  }
  const btn     = document.getElementById('satispayConfirm');
  const timerEl = document.getElementById('satispayTimer');
  btn.disabled = true; timerEl.style.display = 'flex';
  let remaining = 30; timerEl.textContent = remaining;
  clearInterval(_satispayTimerInterval);
  _satispayTimerInterval = setInterval(() => {
    remaining--; timerEl.textContent = remaining;
    if (remaining <= 0) { clearInterval(_satispayTimerInterval); btn.disabled = false; timerEl.style.display = 'none'; }
  }, 1000);
  document.getElementById('satispayModal').classList.add('show');
}

function closeSatispayModal() {
  clearInterval(_satispayTimerInterval);
  document.getElementById('satispayModal').classList.remove('show');
}

// ===== CUSTOMER CODE & HISTORY =====
let _currentHistory = null;
let _nameDebounce   = null;

function setupCustomerCode() {
  const nameInput = document.getElementById('customerName');

  nameInput.addEventListener('input', () => {
    clearTimeout(_nameDebounce);
    const val = nameInput.value.trim();
    if (!val) { resetCodeUI(); return; }
    if (val.length >= 2) {
      _nameDebounce = setTimeout(() => lookupCode(val), 450);
    } else {
      resetCodeUI();
    }
  });
}

function resetCodeUI() {
  const panel = document.getElementById('historyPanel');
  panel.style.display = 'none';
  panel.innerHTML     = '';
  _currentHistory     = null;
  _currentCode        = null;
  _favourites         = [];
  refreshFavouriteButtons();
}

async function lookupCode(name) {
  const panel = document.getElementById('historyPanel');
  try {
    const res  = await fetch(`/api/customer/${encodeURIComponent(name)}`);
    const data = await res.json();
    _currentCode = name;
    _favourites  = data.favourites || [];
    refreshFavouriteButtons();
    if (data.found && data.history.length > 0) {
      _currentHistory = data.history;
      renderHistoryPanel(data.history, panel);
      panel.style.display = 'block';
    } else {
      _currentHistory = null;
      panel.style.display = 'none';
    }
  } catch (e) {
    console.error('Errore lookupCode:', e);
    resetCodeUI();
  }
}

function renderHistoryPanel(history, panel) {
  const sorted    = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));
  const lastOrder = sorted[0];

  const rows = [lastOrder].map((order, idx) => {
    const date         = new Date(order.date);
    const dateStr      = date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' });
    const timeStr      = date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    const itemsSummary = order.items.map(i => i.name + (i.qty > 1 ? ' ×' + i.qty : '')).join(', ');
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

  const favSection = _favourites.length ? `
    <p class="history-panel-title" style="margin-top:1rem">❤️ I tuoi preferiti</p>
    <div class="fav-list">
      ${_favourites.map(f => `
        <div class="fav-item">
          <span class="fav-item-name">${f.name}</span>
          <span class="fav-item-price">€ ${parseFloat(f.price).toFixed(2).replace('.', ',')}</span>
          <button class="add-btn" onclick="addFavouriteToCart('${f.itemId}','${f.name.replace(/'/g, "\\'")}',${f.price})">+ Aggiungi</button>
          <button class="remove-fav-btn" onclick="toggleFavourite('${f.itemId}','${f.name.replace(/'/g, "\\'")}','${f.category}',${f.price})">✕</button>
        </div>
      `).join('')}
    </div>
  ` : '';

  panel.innerHTML = `
    <p class="history-panel-title">👋 Bentornato! Il tuo ultimo ordine</p>
    ${rows}
    ${favSection}
  `;
}

function reorder(historyIdx) {
  if (!_currentHistory) return;
  const sorted = [..._currentHistory].sort((a, b) => new Date(b.date) - new Date(a.date));
  const order  = sorted[historyIdx];
  if (!order || !order.items) return;
  order.items.forEach(item => {
    const existing = cart.find(c => c.id === item.id && !item.id.startsWith('poke-'));
    if (existing) { existing.qty = (existing.qty || 1) + (item.qty || 1); }
    else          { cart.push({ ...item }); }
    const qtyEl = document.getElementById('qty-' + item.id);
    if (qtyEl) {
      const current = parseInt(qtyEl.textContent) || 0;
      qtyEl.textContent = current + (item.qty || 1);
    }
  });
  if (order.notes)     document.getElementById('orderNotes').value  = order.notes;
  if (order.bacchette) document.getElementById('bacchette').checked = true;
  updateCartUI();
  const btn = event.target;
  btn.textContent = '✓ Aggiunto!';
  btn.style.background = 'var(--green)';
  setTimeout(() => { btn.textContent = '↩ Riordina'; btn.style.background = ''; }, 1500);
}

// ===== FAVOURITES =============================================================

function isFavourite(itemId) {
  return _favourites.some(f => f.itemId === itemId);
}

async function toggleFavourite(itemId, name, category, price) {
  if (!_currentCode) {
    alert('Inserisci il tuo nome per salvare i preferiti!');
    return;
  }
  const alreadyFav = isFavourite(itemId);
  try {
    if (alreadyFav) {
      const res  = await fetch(`/api/customer/${encodeURIComponent(_currentCode)}/favourites/${encodeURIComponent(itemId)}`, { method: 'DELETE' });
      const data = await res.json();
      _favourites = data.favourites || [];
    } else {
      const res  = await fetch(`/api/customer/${encodeURIComponent(_currentCode)}/favourites`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ itemId, name, category, price }),
      });
      const data = await res.json();
      _favourites = data.favourites || [];
    }
    refreshFavouriteButtons();
    const panel = document.getElementById('historyPanel');
    if (panel.style.display !== 'none' && _currentHistory) {
      renderHistoryPanel(_currentHistory, panel);
    }
  } catch (err) {
    console.error('Favourite toggle error:', err);
  }
}

function refreshFavouriteButtons() {
  document.querySelectorAll('.fav-btn').forEach(btn => {
    const onclick = btn.getAttribute('onclick') || '';
    const match   = onclick.match(/toggleFavourite\('([^']+)'/);
    if (!match) return;
    btn.classList.toggle('fav-active', isFavourite(match[1]));
  });
}

function addFavouriteToCart(itemId, name, price) {
  addToCart({ id: itemId, name, price, detail: '', qty: 1 });
  const el = document.getElementById('qty-' + itemId);
  if (el) {
    const current = parseInt(el.textContent) || 0;
    el.textContent = current + 1;
  }
}

// ===== DEADLINE COUNTDOWN (11:00) =============================================
(function() {
  const DEADLINE_HOUR = 11;
  const DEADLINE_MIN  = 0;

  function getDeadline() {
    const now = new Date();
    const d   = new Date(now);
    d.setHours(DEADLINE_HOUR, DEADLINE_MIN, 0, 0);
    if (now >= d) d.setDate(d.getDate() + 1);
    return d;
  }

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

    const totalMs = deadline - winStart;
    const leftMs  = deadline - now;

    if ((leftMs / 3600000) > 6) {
      countdown.textContent  = 'CHIUSO';
      progress.style.width   = '0%';
      bar.className          = 'deadline-bar closed';
      icon.textContent       = '🔒';
      return;
    }

    const h = Math.floor(leftMs / 3600000);
    const m = Math.floor((leftMs % 3600000) / 60000);
    const s = Math.floor((leftMs % 60000) / 1000);
    countdown.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;

    const pct = Math.max(0, Math.min(100, (leftMs / totalMs) * 100));
    progress.style.width = pct + '%';

    const minsLeft = leftMs / 60000;
    bar.classList.remove('warn', 'urgent', 'closed');
    if (minsLeft <= 10) {
      bar.classList.add('urgent'); icon.textContent = '🚨';
    } else if (minsLeft <= 30) {
      bar.classList.add('warn');   icon.textContent = '⚠️';
    } else {
      icon.textContent = '⏰';
    }
  }

  tick();
  setInterval(tick, 1000);
})();

// ===== EMAIL MEMORY ===========================================================

function setupEmailMemory() {
  const emailInput = document.getElementById('customerEmail');
  if (!emailInput) return;

  // Restore saved email
  const saved = localStorage.getItem('poke_customer_email');
  if (saved) emailInput.value = saved;

  // Save on every change
  emailInput.addEventListener('input', () => {
    const val = emailInput.value.trim();
    if (val) localStorage.setItem('poke_customer_email', val);
    else     localStorage.removeItem('poke_customer_email');
  });
}

// ===== REJECTION POLLING ======================================================

let _pendingOrderId   = null;
let _rejectionPoller  = null;
const POLL_INTERVAL   = 10000; // 10 seconds

function startRejectionPolling(orderId) {
  _pendingOrderId = orderId;
  stopRejectionPolling();
  _rejectionPoller = setInterval(checkForRejection, POLL_INTERVAL);
}

function stopRejectionPolling() {
  if (_rejectionPoller) { clearInterval(_rejectionPoller); _rejectionPoller = null; }
}

async function checkForRejection() {
  if (!_pendingOrderId) return;
  try {
    const res  = await fetch(`/api/orders/${_pendingOrderId}/status-check`);
    if (!res.ok) return;
    const data = await res.json();
    if (data.status === 'rejected') {
      stopRejectionPolling();
      showRejectionModal(data);
    } else if (data.status === 'done' || data.status === 'ready') {
      stopRejectionPolling();
    }
  } catch (e) { /* ignore network errors */ }
}

function showRejectionModal(order) {
  const reasonText = order.rejectionReason
    ? `Motivo: <em>${order.rejectionReason}</em>`
    : '';
  document.getElementById('rejectedModalText').innerHTML =
    `Il tuo ordine <strong>#${String(order.orderNumber).padStart(3,'0')}</strong> è stato rifiutato.${reasonText ? '<br>' + reasonText : ''}`;

  const payMethod = order.paymentMethod || '';
  let refundHTML = '';
  if (payMethod === 'paypal') {
    refundHTML = `<div class="refund-box refund-paypal">
      <strong>💳 Rimborso PayPal</strong><br>
      Il rimborso verrà elaborato sul tuo account PayPal entro 3–5 giorni lavorativi.
      Per assistenza scrivi a <a href="mailto:support@pokewhirlpool.it">support@pokewhirlpool.it</a>
    </div>`;
  } else if (payMethod === 'satispay') {
    refundHTML = `<div class="refund-box refund-satispay">
      <strong>💸 Rimborso Satispay</strong><br>
      Il rimborso verrà accreditato automaticamente sul tuo Satispay entro 24 ore.
      Per assistenza scrivi a <a href="mailto:support@pokewhirlpool.it">support@pokewhirlpool.it</a>
    </div>`;
  }
  document.getElementById('rejectedRefundInfo').innerHTML = refundHTML;
  document.getElementById('rejectedModal').classList.add('show');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('rejectedModalClose').addEventListener('click', () => {
    document.getElementById('rejectedModal').classList.remove('show');
  });
});
