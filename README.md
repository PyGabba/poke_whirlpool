# 🍣 Poke Whirlpool – Ordering System

A Node.js web app for customers to order from the Poke Whirlpool menu.

## Setup

```bash
cd poke-whp
npm install
npm start
```

The server will run at **http://localhost:3000**

## Pages

| URL | Description |
|-----|-------------|
| `http://localhost:3000` | Customer ordering page |
| `http://localhost:3000/kitchen` | Kitchen dashboard (manage orders) |

## Features

### Customer Page (`/`)
- **Poke Builder** – Choose size (Small/Regular/Large), base, proteins, fruits/veggies, sauces, toppings with live selection counters
- **Traditional Poke** – Pokai, Poke Classic, Spicy Special Salmon at €9.90
- **Antipasti, Contorni, Primi Piatti, Secondi Piatti** – Full menu
- **Cart drawer** – Add/remove items, adjust quantities, add name and notes
- **Order confirmation** – Shows order ID after placing order

### Kitchen Dashboard (`/kitchen`)
- **Kanban board** – Ricevuto → In Preparazione → Pronto
- **Auto-refresh** every 15 seconds
- Move orders between stages with one click

## Stack
- **Backend**: Node.js + Express
- **Frontend**: Vanilla HTML/CSS/JS (no framework needed)
- **Storage**: In-memory (orders reset on restart — swap for a DB for production)

## Production Notes
- Replace in-memory `orders` array with a database (SQLite, PostgreSQL, etc.)
- Add authentication for the kitchen page
- Deploy on a VPS, Railway, or Render
