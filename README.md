# Poke Garden – Ordering System

A full-stack web application for table-side ordering at Poke Garden. Customers browse the menu, build custom poke bowls, and pay via PayPal or Satispay. Kitchen staff manage order status in real time through a dedicated dashboard.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js + Express |
| Database | MongoDB (Mongoose) |
| Frontend | Vanilla HTML / CSS / JS |
| Email | Brevo SMTP API |
| Payments | PayPal Me · Satispay deep link |

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- A MongoDB Atlas cluster (or local MongoDB instance)

### Installation

```bash
git clone https://github.com/PyGabba/poke_whirlpool.git
cd poke_whirlpool
npm install
```

### Environment

Create a `.env` file in the project root:

```env
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?appName=<app>
BREVO_API_KEY=your_brevo_api_key        # optional – enables rejection emails
BREVO_FROM=noreply@yourdomain.com       # optional – sender address
PORT=3000                               # optional – defaults to 3000
```

### Run

```bash
npm start
```

Server starts at **http://localhost:3000**.

---

## Application Pages

| Route | Description |
|-------|-------------|
| `/` | Customer ordering page |
| `/kitchen` | Kitchen dashboard (staff only) |

---

## Features

### Customer Page (`/`)

- **Poke Builder** — Configure size (Small / Regular / Large), base, proteins, fruit & vegetables, sauces, and toppings. Slot quotas enforced per size; extra proteins charged at +€2.00 each, selected extras (Tobiko, Ikura, Philadelphia, etc.) at +€1.00.
- **Traditional Poke** — Fixed recipes (Pokai, Poke Classic, Spicy Special Salmon) at €9.90.
- **Full Menu** — Antipasti, Contorni, Primi Piatti, Secondi Piatti with quantity controls.
- **Customer History** — Returning customers are recognised by name; last order and saved favourites are surfaced for quick re-ordering.
- **Cart Drawer** — Add, remove, and adjust quantities before checkout. Displays running total.
- **Payment Flow** — PayPal Me and Satispay QR codes generated dynamically from the cart total. A 30-second confirmation timer prevents accidental submission.
- **Order Tracking** — After submission, the client polls every 10 seconds for status changes. Rejection triggers an in-app modal with refund instructions and a confirmation email to the customer.

### Kitchen Dashboard (`/kitchen`)

- **Live Order Table** — All active orders displayed in a single sortable table with name, size, ingredients, allergen notes, chopstick preference, per-item price, and order total.
- **Status Management** — Move individual orders through *Ricevuto → In Preparazione → Pronto* with one click.
- **Bulk Actions** — Prepare all pending orders or archive all completed orders in a single action. Reject all pending orders with an optional reason.
- **Auto-Refresh** — Table reloads every 15 seconds; can be toggled off.
- **Grand Total** — Running sum of all active order totals displayed in the table footer.

---

## Project Structure

```
├── server.js           # Express app, API routes, in-memory order store
├── models/
│   └── Customer.js     # Mongoose schema for order history and favourites
└── public/
    ├── index.html      # Customer ordering page
    ├── kitchen.html    # Kitchen dashboard
    ├── css/
    │   └── style.css
    └── js/
        └── app.js      # Customer page logic
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/menu` | Full menu object |
| `POST` | `/api/orders` | Place a new order |
| `GET` | `/api/orders` | List all orders |
| `PATCH` | `/api/orders/:id/status` | Update order status |
| `PATCH` | `/api/orders/:id/reject` | Reject an order (sends email) |
| `GET` | `/api/orders/:id/status-check` | Poll order status (client-side) |
| `GET` | `/api/customer/:name` | Fetch order history and favourites |
| `POST` | `/api/customer/:name/favourites` | Add a favourite item |
| `DELETE` | `/api/customer/:name/favourites/:itemId` | Remove a favourite item |

---

## Notes

- Orders are held **in memory** and are lost on server restart. This is intentional for the current single-session use case. For persistent order storage, replace the `orders` array in `server.js` with a MongoDB collection.
- The kitchen dashboard has no authentication. For a multi-staff environment, add session-based access control before exposing it on a public network.
