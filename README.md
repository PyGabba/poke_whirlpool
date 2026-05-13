# 🍣 Poke Garden – Ordering System

> Table-side ordering and kitchen management for Poke Garden restaurant.

![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)
![License](https://img.shields.io/badge/license-ISC-blue)

Customers browse the full menu, build custom poke bowls, and pay via PayPal or Satispay — all from their phone or the table tablet. Kitchen staff manage live order status through a separate dashboard with real-time auto-refresh.

---

## Screenshots

| Customer Page | Kitchen Dashboard |
|:---:|:---:|
| *(ordering page)* | *(kitchen page)* |

---

## Features

### Customer Page (`/`)
- **Poke Builder** — Choose size (Small / Regular / Large) then configure base, proteins, fruit & vegetables, sauces, and toppings. Slot quotas enforced per size; repeating the same ingredient is supported. Extra proteins +€2.00, premium toppings (Tobiko, Ikura, Philadelphia…) +€1.00.
- **Traditional Poke** — Fixed recipes at €9.90: Pokai, Poke Classic, Spicy Special Salmon.
- **Full Menu** — Antipasti, Contorni, Primi Piatti, Secondi Piatti with ± quantity controls.
- **Returning Customer Recognition** — Last order and saved favourites loaded by name for one-tap re-ordering.
- **Cart Drawer** — Live item list with running total before checkout.
- **Payment via QR Code** — PayPal Me and Satispay QR codes generated dynamically from the cart total. 30-second delay prevents accidental submission.
- **Order Status Polling** — Client polls every 10 s; rejection surfaces an in-app modal with refund details and triggers an automated email.

### Kitchen Dashboard (`/kitchen`)
- **Live Order Table** — Active orders with name, bowl composition, allergen notes, chopstick flag, per-item price, and per-order total.
- **Status Workflow** — *Ricevuto → In Preparazione → Pronto* per order, one click.
- **Bulk Actions** — Prepare all pending / archive all completed / reject all pending (with optional reason).
- **Auto-Refresh** — Every 15 seconds, toggleable.
- **Grand Total** — Sum of all active order totals in the table footer.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js + Express |
| Database | MongoDB + Mongoose |
| Sessions | connect-mongo (MongoDB-backed) |
| Frontend | Vanilla HTML / CSS / JS |
| Email | Brevo SMTP API |
| Payments | PayPal Me · Satispay deep link + QR |

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- MongoDB Atlas cluster or local MongoDB instance

### Installation

```bash
git clone https://github.com/PyGabba/poke_whirlpool.git
cd poke_whirlpool
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
# Required
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?appName=<app>

# Recommended
SESSION_SECRET=replace_with_a_long_random_string

# Optional – enables rejection emails to customers
BREVO_API_KEY=your_brevo_api_key
BREVO_FROM=noreply@yourdomain.com

# Optional – defaults to 3000
PORT=3000
```

### Run

```bash
npm start
```

App available at **http://localhost:3000**.

---

## Project Structure

```
├── server.js              # Express app · REST API · in-memory order store
├── models/
│   └── Customer.js        # Mongoose schema – order history & favourites
└── public/
    ├── index.html         # Customer ordering page
    ├── kitchen.html       # Kitchen dashboard
    ├── css/
    │   └── style.css
    └── js/
        └── app.js         # Customer page logic
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/menu` | Full menu object |
| `POST` | `/api/orders` | Place a new order |
| `GET` | `/api/orders` | List all orders |
| `PATCH` | `/api/orders/:id/status` | Update order status |
| `PATCH` | `/api/orders/:id/reject` | Reject an order (triggers email) |
| `GET` | `/api/orders/:id/status-check` | Poll order status |
| `GET` | `/api/customer/:name` | Fetch order history and favourites |
| `POST` | `/api/customer/:name/favourites` | Save a favourite item |
| `DELETE` | `/api/customer/:name/favourites/:itemId` | Remove a favourite item |

---

## Deployment

The app is configured for [Render](https://render.com). Set the environment variables in the Render dashboard and point the start command to `npm start`.

> **Note:** Orders are held in memory and reset on restart. This is intentional for the current single-shift use case. For full persistence, replace the `orders` array in `server.js` with a MongoDB collection.

> **Note:** The `/kitchen` route has no authentication. Add access control before exposing it on a public network in a multi-staff environment.

---

## License

ISC © [PyGabba](https://github.com/PyGabba)
