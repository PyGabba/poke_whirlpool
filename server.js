const express = require('express');
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({ secret: 'pokegarden-secret', resave: false, saveUninitialized: true }));

// ── Persistence ──────────────────────────────────────────────────────────────
const DATA_FILE = path.join(__dirname, 'data.json');

function loadCustomerHistory() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load data.json, starting fresh:', e.message);
  }
  return {};
}

function saveCustomerHistory() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(customerHistory, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save data.json:', e.message);
  }
}

const orders = [];
const customerHistory = loadCustomerHistory();
// ─────────────────────────────────────────────────────────────────────────────

const menu = {
  antipasti: [
    { id: 'a1', name: 'Involtino primavera', price: 2.00 },
    { id: 'a2', name: 'Involtino di gamberi', price: 3.00 },
    { id: 'a3', name: 'Nuvole di gamberi', price: 2.00 },
    { id: 'a4', name: 'Uova dei 100 giorni', price: 3.00 },
    { id: 'a5', name: 'Pane al vapore vuoto', price: 2.00 },
    { id: 'a6', name: 'Pane al vapore con carne', price: 3.00 },
    { id: 'a7', name: 'Ravioli di carne', price: 4.00 },
    { id: 'a8', name: 'Ravioli di pollo', price: 4.00 },
    { id: 'a9', name: 'Ravioli di gamberi', price: 4.00 },
    { id: 'a10', name: 'Ravioli di verdure', price: 4.00 },
    { id: 'a11', name: 'Xiao Long Bao', price: 4.50 },
    { id: 'a12', name: 'Bunny Bao', price: 2.00 },
    { id: 'a13', name: 'Bao fagioli rossi', price: 2.00 },
    { id: 'a14', name: 'Pig bao', price: 2.50 },
  ],
  contorni: [
    { id: 'c1', name: 'Funghi bambù saltati', price: 4.00 },
    { id: 'c2', name: 'Patate fritte', price: 3.00 },
    { id: 'c3', name: 'Edamame', price: 3.00 },
    { id: 'c4', name: 'Tofu saltato', price: 4.00 },
    { id: 'c5', name: 'Tofu affumicato', price: 4.00 },
  ],
  primiPiatti: [
    { id: 'pp1', name: 'Gnocchi di riso', price: 4.00 },
    { id: 'pp2', name: 'Gnocchi di riso con gamberi o pollo', price: 5.00 },
    { id: 'pp3', name: 'Spaghetti di soia', price: 4.00 },
    { id: 'pp4', name: 'Spaghetti di soia con gamberetti o pollo', price: 5.00 },
    { id: 'pp5', name: 'Spaghetti di riso', price: 4.00 },
    { id: 'pp6', name: 'Spaghetti di riso con gamberetti o pollo', price: 5.00 },
    { id: 'pp7', name: 'Riso bianco', price: 2.00 },
    { id: 'pp8', name: 'Riso con verdure', price: 4.00 },
    { id: 'pp9', name: 'Riso alla cantonese', price: 4.00 },
    { id: 'pp10', name: 'Yaki Udon', price: 5.00 },
    { id: 'pp11', name: 'Yaki Udon con gamberetti o pollo', price: 6.00 },
  ],
  secondiPiatti: [
    { id: 'sp1', name: 'Gamberetti', price: 6.00 },
    { id: 'sp2', name: 'Pollo', price: 5.00 },
    { id: 'sp3', name: 'Gamberoni', price: 7.00 },
    { id: 'sp4', name: 'Polipo con patate', price: 9.00 },
    { id: 'sp5', name: 'Tempura di salmone', price: 9.00 },
  ],
  pokeTradizonali: [
    { id: 'pt1', name: 'Pokai', price: 9.90, description: 'Riso, salmone, avocado, edamame, goma wakame, ginger rose, salsa poke, cipolla croccante' },
    { id: 'pt2', name: 'Poke Classic', price: 9.90, description: 'Riso, salmone, tonno, cetrioli, mango, pomodorini, carote, salsa ponzu e trayaki, sesamo' },
    { id: 'pt3', name: 'Spicy Special Salmon', price: 9.90, description: 'Riso, salmone grigliato, cipolla, carote, mango, avocado, salsa soya wasabi e spicy mayo, sesamo wasabi' },
  ],
  pokeSizes: {
    small: { price: 7.90, base: 1, proteine: 1, fruttaVerdura: 3, salse: 1, topping: 1 },
    regular: { price: 9.90, base: 2, proteine: 2, fruttaVerdura: 4, salse: 2, topping: 1 },
    large: { price: 13.90, base: 2, proteine: 3, fruttaVerdura: 5, salse: 2, topping: 2 },
  },
  pokeComponents: {
    base: ['Riso Bianco', 'Riso Integrale Venere', 'Insalata Misticanza'],
    proteine: [
      { name: 'Salmone crudo', extra: 0 }, { name: 'Salmone grill', extra: 0 },
      { name: 'Tonno crudo', extra: 0 }, { name: 'Tonno sottolio', extra: 0 },
      { name: 'Pollo', extra: 0 }, { name: 'Gambero vapore', extra: 0 },
      { name: 'Gambero fritto', extra: 0 }, { name: 'Polpo', extra: 1 },
      { name: 'Branzino', extra: 0 }, { name: 'Anguilla', extra: 1 },
      { name: 'Tofu normale', extra: 0 }, { name: 'Tofu affumicato', extra: 0 },
      { name: 'Surimi', extra: 0 },
    ],
    fruttaVerdura: ['Ananas','Carote','Avocado','Cetrioli','Cipolla','Edamame','Germogli di soia','Goma wakame','Mais','Mango','Pink ginger','Finocchi arancia','Peperoni','Cavolo rosso','Daikon','Olive','Pomodorini','Zucchine'],
    salse: ['Aceto balsamico','Soia','Mango','Olio EVO','Ponzu','Sesamo dressing','Poke','Soya wasabi','Spicy mayo','Sriracha','Yogurt','Teriyaki'],
    topping: [
      { name: 'Tobiko', extra: 1 }, { name: 'Mandorle', extra: 0 },
      { name: 'Sesamo', extra: 0 }, { name: 'Pistacchio', extra: 0 },
      { name: 'Cipolla croccante', extra: 0 }, { name: 'Peperoncino a filo', extra: 0 },
      { name: 'Sesamo al wasabi', extra: 0 }, { name: 'Ikura', extra: 1 },
      { name: 'Philadelphia', extra: 1 },
    ],
  }
};

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/kitchen', (req, res) => res.sendFile(path.join(__dirname, 'public', 'kitchen.html')));
app.get('/api/menu', (req, res) => res.json(menu));

app.post('/api/orders', (req, res) => {
  const { customerName, tableNumber, items, total, notes, customerCode } = req.body;
  const code = customerCode ? customerCode.trim().toUpperCase() : null;
  const order = {
    id: uuidv4(),
    orderNumber: orders.length + 1,
    customerName: customerName || 'Cliente',
    customerCode: code || null,
    tableNumber: tableNumber || '-',
    items, total, notes,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  orders.push(order);

  // Save to customer history
  if (code) {
    if (!customerHistory[code]) customerHistory[code] = [];
    customerHistory[code].push({
      date: order.createdAt,
      orderNumber: order.orderNumber,
      items: order.items,
      total: order.total,
    });
    saveCustomerHistory();
  }
  res.json({ success: true, order });
});

app.get('/api/orders', (req, res) => {
  if (req.query.last === '1') {
    const last = orders.length ? [orders[orders.length - 1]] : [];
    return res.json(last);
  }
  res.json(orders);
});

app.get('/api/customer/:code', (req, res) => {
  const code = req.params.code.trim().toUpperCase();
  const history = customerHistory[code] || null;
  res.json({ code, found: !!history, history: history || [] });
});

app.patch('/api/orders/:id/status', (req, res) => {
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  order.status = req.body.status;
  res.json({ success: true, order });
});

app.listen(PORT, () => console.log(`Poke Garden running at http://localhost:${PORT}`));
