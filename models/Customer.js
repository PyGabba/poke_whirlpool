const mongoose = require('mongoose');

// ── Sub-schemas ───────────────────────────────────────────────────────────────

const favouriteItemSchema = new mongoose.Schema({
  itemId:   { type: String, required: true },
  name:     { type: String, required: true },
  category: { type: String, default: '' },
  price:    { type: Number, default: 0 },
  addedAt:  { type: Date,   default: Date.now },
});

const orderHistorySchema = new mongoose.Schema({
  orderNumber: { type: Number },
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
