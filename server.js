require('dotenv').config();
const express   = require('express');
const session   = require('express-session');
const { v4: uuidv4 } = require('uuid');
const path      = require('path');
const mongoose  = require('mongoose');
const nodemailer = require('nodemailer');
const Customer  = require('./models/Customer');
const axios = require('axios');

const url = `https://poke-whp.onrender.com/`; // Render URL
const interval = 300000; // Interval in milliseconds (300 seconds)

//Reloader Function
function reloadWebsite() {
  axios.get(url)
    .then(response => {
      console.log(`Reloaded at ${new Date().toISOString()}: Status Code ${response.status}`);
    })
    .catch(error => {
      console.error(`Error reloading at ${new Date().toISOString()}:`, error.message);
    });
}

setInterval(reloadWebsite, interval);

const app  = express();
const PORT = process.env.PORT || 3000;

// ── MongoDB connection ────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅  MongoDB connected!'))
  .catch(err => { console.error('❌  MongoDB connection error:', err.message); process.exit(1); });

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({ secret: 'pokewhirlpool-secret', resave: false, saveUninitialized: true }));

// ── Mailer (Brevo HTTPS API — works on Render) ───────────────────────────────
async function sendRejectionEmail({ to, orderNumber, reason, paymentMethod }) {
  if (!to) return;
  if (!process.env.BREVO_API_KEY) {
    console.warn('⚠️  BREVO_API_KEY not set — rejection emails disabled.');
    return;
  }

  const refundNote = paymentMethod === 'paypal'
    ? 'Il rimborso verrà accreditato automaticamente sul tuo PayPal entro 24 ore.'
    : paymentMethod === 'satispay'
    ? 'Il rimborso verrà accreditato automaticamente sul tuo Satispay entro 24 ore.'
    : 'Contattaci per il rimborso.';

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:auto">
      <h2 style="color:#e8253a">❌ Ordine Rifiutato</h2>
      <p>Ci dispiace, il tuo ordine <strong>#${String(orderNumber).padStart(3,'0')}</strong> è stato rifiutato.</p>
      ${reason ? `<p><strong>Motivo:</strong> ${reason}</p>` : ''}
      <div style="background:#fff8f8;border:1px solid #fdd;border-radius:8px;padding:12px;margin-top:16px">
        <strong>💸 Rimborso</strong><br>${refundNote}
      </div>
      <p style="margin-top:20px;color:#888;font-size:0.85rem">Per assistenza rispondi a questa email.</p>
    </div>`;

  await axios.post(
    'https://api.brevo.com/v3/smtp/email',
    {
      sender:      { name: 'Poke Whirlpool', email: process.env.BREVO_FROM },
      to:          [{ email: to }],
      subject:     `Il tuo ordine #${String(orderNumber).padStart(3,'0')} è stato rifiutato`,
      htmlContent: html,
    },
    {
      headers: {
        'api-key':      process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
    }
  );
}

// ── In-memory orders (same as before) ────────────────────────────────────────
const orders = [];

// ── Menu data ─────────────────────────────────────────────────────────────────
const menu = {
  antipasti: [
    { id: 'a1',  name: 'Involtino primavera',                             price: 2.00 },
    { id: 'a2',  name: 'Involtino di gamberi',                            price: 3.00 },
    { id: 'a3',  name: 'Nuvole di gamberi',                               price: 2.00 },
    { id: 'a4',  name: 'Gamberi in salsa cocktail',                       price: 7.00 },
    { id: 'a5',  name: 'Pane al vapore vuoto',                            price: 2.00 },
    { id: 'a6',  name: 'Pane al vapore con carne',                        price: 3.00 },
    { id: 'a7',  name: 'Ravioli di carne',                                price: 4.00 },
    { id: 'a8',  name: 'Ravioli di pollo',                                price: 4.00 },
    { id: 'a9',  name: 'Ravioli di gamberi',                              price: 4.00 },
    { id: 'a10', name: 'Ravioli di verdure',                              price: 4.00 },
    { id: 'a11', name: 'Xiao Long Bao',                                   price: 4.50 },
    { id: 'a12', name: 'Bunny Bao',                                       price: 2.00 },
    { id: 'a13', name: 'Bao fagioli rossi',                               price: 2.00 },
    { id: 'a14', name: 'Dim Sum gamberi',                                 price: 5.50 },
    { id: 'a15', name: 'Liu Bao (pollo fritto, insalata, maionese)',      price: 5.50 },
    { id: 'a16', name: 'Liu Bao (salmone, avocado, philadelphia, teriyaki)', price: 6.00 },
  ],
  contorni: [
    { id: 'c1', name: 'Funghi e bambù saltati',  price: 4.00 },
    { id: 'c2', name: 'Patate fritte',            price: 3.00 },
    { id: 'c3', name: 'Edamame',                  price: 3.00 },
    { id: 'c4', name: 'Tofu saltato',             price: 4.00 },
    { id: 'c5', name: 'Tofu affumicato',          price: 4.00 },
    { id: 'c6', name: 'Germogli soia saltati',    price: 4.00 },
    { id: 'c7', name: 'Verdure miste saltate',    price: 4.00 },
  ],
  primiPiatti: [
    { id: 'pp1',  name: 'Gnocchi di riso',                              price: 4.00 },
    { id: 'pp2',  name: 'Gnocchi di riso con gamberi',                  price: 5.00 },
    { id: 'pp3',  name: 'Gnocchi di riso con pollo',                    price: 5.00 },
    { id: 'pp4',  name: 'Spaghetti di soia',                            price: 4.00 },
    { id: 'pp5',  name: 'Spaghetti di soia con gamberetti',             price: 5.00 },
    { id: 'pp6',  name: 'Spaghetti di soia con pollo',                  price: 5.00 },
    { id: 'pp7',  name: 'Spaghetti di riso',                            price: 4.00 },
    { id: 'pp8',  name: 'Spaghetti di riso con gamberetti',             price: 5.00 },
    { id: 'pp9',  name: 'Spaghetti di riso con pollo',                  price: 5.00 },
    { id: 'pp10', name: 'Riso bianco',                                  price: 2.00 },
    { id: 'pp11', name: 'Riso con verdure',                             price: 4.00 },
    { id: 'pp12', name: 'Riso alla cantonese',                          price: 4.00 },
    { id: 'pp13', name: 'Riso saltato con salmone grigliato e kataifi', price: 6.00 },
    { id: 'pp14', name: 'Riso saltato con salsa al tè',                 price: 6.00 },
    { id: 'pp15', name: 'Yaki Udon',                                    price: 5.00 },
    { id: 'pp16', name: 'Yaki Udon con gamberetti',                     price: 6.00 },
    { id: 'pp17', name: 'Yaki Udon con pollo',                          price: 6.00 },
    { id: 'pp18', name: 'Zuppa di miso',                                price: 5.00 },
    { id: 'pp19', name: 'Zuppa di mais',                                price: 5.00 },
    { id: 'pp20', name: 'Alghe con polpo',                              price: 7.00 },
    { id: 'pp21', name: 'Alghe con gamberi',                            price: 6.00 },
    { id: 'pp22', name: 'Spaghetti coreani',                            price: 10.00 },
    { id: 'pp23', name: 'Ramen vegetariano',                            price: 11.00 },
    { id: 'pp24', name: 'Ramen pesce',                                  price: 15.00 },
    { id: 'pp25', name: 'Ramen carne',                                  price: 13.00 },
  ],
  secondiPiatti: [
    { id: 'sp1',  name: 'Gamberetti',                  price: 6.00 },
    { id: 'sp2',  name: 'Pollo',                       price: 5.00 },
    { id: 'sp3',  name: 'Gamberoni',                   price: 7.00 },
    { id: 'sp4',  name: 'Polipo con patate',           price: 9.00 },
    { id: 'sp5',  name: 'Tampura di salmone',          price: 9.00 },
    { id: 'sp6',  name: 'Condimento: Salsa chili',     price: 0.00 },
    { id: 'sp7',  name: 'Condimento: Funghi e bambù',  price: 0.00 },
    { id: 'sp8',  name: 'Condimento: Curry',           price: 0.00 },
    { id: 'sp9',  name: 'Condimento: Agrodolce',       price: 0.00 },
    { id: 'sp10', name: 'Condimento: Satè',            price: 0.00 },
    { id: 'sp11', name: 'Condimento: Limone',          price: 0.00 },
    { id: 'sp12', name: 'Condimento: Mandorle',        price: 0.00 },
    { id: 'sp13', name: 'Condimento: Patate',          price: 0.00 },
  ],
  pokeTradizonali: [
    { id: 'pt1', name: 'Pokai',               price: 9.90, description: 'Riso, salmone, avocado, edamame, goma wakame, ginger rose, salsa poke, cipolla croccante' },
    { id: 'pt2', name: 'Poke Classic',        price: 9.90, description: 'Riso, salmone, tonno, cetrioli, mango, pomodorini, carote, salsa ponzu e teriyaki, sesamo' },
    { id: 'pt3', name: 'Spicy Special Salmon',price: 9.90, description: 'Riso, salmone grigliato, cipolla, carote, mango, avocado, salsa soya wasabi e spicy mayo, sesamo wasabi' },
  ],
  pokeSizes: {
    small:   { price:  7.90, base: 1, proteine: 1, fruttaVerdura: 3, salse: 1, topping: 1 },
    regular: { price:  9.90, base: 2, proteine: 2, fruttaVerdura: 4, salse: 2, topping: 1 },
    large:   { price: 13.90, base: 2, proteine: 3, fruttaVerdura: 5, salse: 2, topping: 2 },
  },
  pokeComponents: {
    base: ['Riso Bianco', 'Riso Integrale Venere', 'Insalata Misticanza'],
    proteine: [
      { name: 'Anguilla',              extra: 1 },
      { name: 'Salmone Crudo',         extra: 0 },
      { name: 'Salmone Grill',         extra: 0 },
      { name: 'Salmone Tartare Spicy', extra: 1 },
      { name: 'Feta',                  extra: 0 },
      { name: 'Uova',                  extra: 0 },
      { name: 'Tofu Normale',          extra: 0 },
      { name: 'Tofu Affumicato',       extra: 0 },
      { name: 'Tonno Crudo',           extra: 0 },
      { name: 'Tonno Sottolio',        extra: 0 },
      { name: 'Tonno Tartare Spicy',   extra: 1 },
      { name: 'Surimi',                extra: 0 },
      { name: 'Pollo Normale',         extra: 0 },
      { name: 'Pollo Fritto',          extra: 1 },
      { name: 'Polpo',                 extra: 1 },
      { name: 'Ikura',                 extra: 1 },
      { name: 'Mozzarella',            extra: 0 },
      { name: 'Gambero Vapore',        extra: 0 },
      { name: 'Gambero Fritto',        extra: 1 },
      { name: 'Branzino',              extra: 0 },
      { name: 'Prosciutto Cotto',      extra: 0 },
    ],
    fruttaVerdura: [
      'Ananas','Cipolla','Piselli','Mais','Peperoni','Daikon','Funghi Trifolati',
      'Carote','Edamame','Mango','Fragola','Pesca','Zucchine','Olive','Ceci',
      'Avocado','Pomodorini','Melone','Cetrioli','Jalapeno','Melograno',
      'Germogli di Soia','Goma Wakame','Finocchi Arancia','Cavolo Rosso','Pink Ginger',
    ],
    salse: [
      'Aceto Balsamico','Ponzu','Spicy Mayo',
      'Soia','Sesamo Dressing','Sriracha',
      'Poke','Mango','Avocado Lime','Yogurt',
      "Olio Extra Vergine d'Oliva",'Soya Wasabi','Teriyaki',
    ],
    topping: [
      { name: 'Tobiko',              extra: 1 },
      { name: 'Cipolla Croccante',   extra: 0 },
      { name: 'Ikura',               extra: 1 },
      { name: 'Mandorle',            extra: 0 },
      { name: 'Peperoncino Filo',    extra: 0 },
      { name: 'Pasta Kataifi',       extra: 0 },
      { name: 'Sesamo',              extra: 0 },
      { name: 'Sesamo al Wasabi',    extra: 0 },
      { name: 'Polvere di Alghe Nori', extra: 0 },
      { name: 'Granella Pistacchio', extra: 0 },
      { name: 'Philadelphia',        extra: 1 },
    ],
  },
};

// ── Static pages ──────────────────────────────────────────────────────────────
app.get('/',        (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/kitchen', (req, res) => res.sendFile(path.join(__dirname, 'public', 'kitchen.html')));

// ── Menu ──────────────────────────────────────────────────────────────────────
app.get('/api/menu', (req, res) => res.json(menu));

// ── Orders ────────────────────────────────────────────────────────────────────
app.post('/api/orders', async (req, res) => {
  const { customerName, tableNumber, items, total, notes, bacchette, customerEmail, paymentMethod } = req.body;
  const customer = customerName ? customerName.trim() : null;

  const order = {
    id:            uuidv4(),
    orderNumber:   orders.length + 1,
    customerName:  customer || 'Cliente',
    customerEmail: customerEmail || null,
    paymentMethod: paymentMethod || 'unknown',
    tableNumber:   tableNumber || '-',
    items, total, notes, bacchette: !!bacchette,
    status:        'pending',
    createdAt:     new Date().toISOString(),
  };
  orders.push(order);

  // Persist order history to MongoDB
  if (customer) {
    try {
      const historyEntry = {
        orderNumber: order.orderNumber,
        customer:    order.customerName,
        date:        order.createdAt,
        items:       order.items,
        total:       parseFloat(order.total),
        notes:       order.notes || '',
        bacchette:   !!bacchette,
      };
      let doc = await Customer.findOne({ 'orderHistory.customer': customer });
      if (doc) {
        doc.orderHistory.push(historyEntry);
        await doc.save();
      } else {
        await Customer.create({ orderHistory: [historyEntry], favourites: [] });
      }
    } catch (err) {
      console.error('Failed to save order history:', err.message);
    }
  }

  res.json({ success: true, order });
});

app.get('/api/orders', (req, res) => {
  if (req.query.last === '1') {
    return res.json(orders.length ? [orders[orders.length - 1]] : []);
  }
  res.json(orders);
});

app.patch('/api/orders/:id/status', (req, res) => {
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  order.status = req.body.status;
  res.json({ success: true, order });
});

app.patch('/api/orders/:id/reject', async (req, res) => {
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  order.status = 'rejected';
  order.rejectionReason = req.body.reason || '';
  try {
    await sendRejectionEmail({
      to:            order.customerEmail,
      orderNumber:   order.orderNumber,
      reason:        order.rejectionReason,
      paymentMethod: order.paymentMethod,
    });
    console.log(`📧  Rejection email sent to ${order.customerEmail}`);
  } catch (e) {
    console.error('Email send error:', e.message);
  }
  res.json({ success: true, order });
});

app.get('/api/orders/:id/status-check', (req, res) => {
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found' });
  res.json({
    status:          order.status,
    orderNumber:     order.orderNumber,
    rejectionReason: order.rejectionReason || '',
    paymentMethod:   order.paymentMethod   || '',
  });
});

// ── Customer: get history + favourites ────────────────────────────────────────
app.get('/api/customer/:name', async (req, res) => {
  const customer = req.params.name.trim();
  try {
    const doc = await Customer.findOne({ 'orderHistory.customer': customer });
    if (!doc) {
      return res.json({ customer, found: false, history: [], favourites: [] });
    }
    res.json({
      customer,
      found:      doc.orderHistory.length > 0,
      history:    doc.orderHistory,
      favourites: doc.favourites,
    });
  } catch (err) {
    console.error('Customer lookup error:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// ── Favourites: add ───────────────────────────────────────────────────────────
app.post('/api/customer/:name/favourites', async (req, res) => {
  const customer = req.params.name.trim();
  const { itemId, name: itemName, category = '', price = 0 } = req.body;
  if (!itemId || !itemName) {
    return res.status(400).json({ error: 'itemId and name are required' });
  }
  try {
    let doc = await Customer.findOne({ 'orderHistory.customer': customer });
    if (!doc) {
      doc = await Customer.create({ orderHistory: [], favourites: [] });
    }
    // Remove existing entry with same itemId (dedup), then add
    doc.favourites = doc.favourites.filter(f => f.itemId !== itemId);
    doc.favourites.push({ itemId, name: itemName, category, price });
    await doc.save();
    res.json({ success: true, favourites: doc.favourites });
  } catch (err) {
    console.error('Add favourite error:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// ── Favourites: remove ────────────────────────────────────────────────────────
app.delete('/api/customer/:name/favourites/:itemId', async (req, res) => {
  const customer = req.params.name.trim();
  const itemId   = req.params.itemId;
  try {
    const doc = await Customer.findOneAndUpdate(
      { 'orderHistory.customer': customer },
      { $pull: { favourites: { itemId } } },
      { new: true }
    );
    if (!doc) return res.status(404).json({ error: 'Customer not found' });
    res.json({ success: true, favourites: doc.favourites });
  } catch (err) {
    console.error('Remove favourite error:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// ── Favourites: list ──────────────────────────────────────────────────────────
app.get('/api/customer/:name/favourites', async (req, res) => {
  const customer = req.params.name.trim();
  try {
    const doc = await Customer.findOne({ 'orderHistory.customer': customer });
    if (!doc) return res.json({ customer, favourites: [] });
    res.json({ customer, favourites: doc.favourites });
  } catch (err) {
    console.error('Get favourites error:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});
// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`🍣  Poke Whirlpool running at http://localhost:${PORT}`));
