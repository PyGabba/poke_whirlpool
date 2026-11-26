const mongoose = require('mongoose');

// ── Sub-schemas ───────────────────────────────────────────────────────────────

const favouriteItemSchema = new mongoose.Schema({
  itemId:   { type: String, required: true },
  name:     { type: String, required: true },
  category: { type: String, default: '' },
  price:    { type: Number, default: 0 },
  detail:   { type: String, default: '' },                    // custom poke/burger: ingredient summary
  config:   { type: mongoose.Schema.Types.Mixed, default: null }, // custom poke/burger: { type, cartName }
  addedAt:  { type: Date,   default: Date.now },
});

const orderHistorySchema = new mongoose.Schema({
  orderId:     { type: String },            // uuid of the in-memory order (orderNumber resets on restart)
  orderNumber: { type: Number },
  rejected:    { type: Boolean, default: false },
  customer:    { type: String },
  date:        { type: Date },
  items:       { type: Array, default: [] },
  total:       { type: Number, default: 0 },
  notes:       { type: String, default: '' },
  bacchette:   { type: Boolean, default: false },
});

// ── Main schema ───────────────────────────────────────────────────────────────
// No top-level key field — documents are found via { 'orderHistory.customer': name }

const customerSchema = new mongoose.Schema(
  {
    favourites:   [favouriteItemSchema],
    orderHistory: [orderHistorySchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Customer', customerSchema);
