const mongoose = require('mongoose');

// ── Sub-schemas ───────────────────────────────────────────────────────────────

const favouriteItemSchema = new mongoose.Schema({
  itemId:   { type: String, required: true },
  name:     { type: String, required: true },
  category: { type: String, default: '' },   // e.g. 'antipasti', 'poke', 'primiPiatti'
  price:    { type: Number, default: 0 },
  addedAt:  { type: Date,   default: Date.now },
});

const orderHistorySchema = new mongoose.Schema({
  orderNumber: { type: Number },
  date:        { type: Date },
  items:       { type: Array, default: [] },
  total:       { type: Number, default: 0 },
});

// ── Main schema ───────────────────────────────────────────────────────────────

const customerSchema = new mongoose.Schema(
  {
    code:         { type: String, required: true, unique: true, uppercase: true, trim: true },
    name:         { type: String, default: '' },
    favourites:   [favouriteItemSchema],
    orderHistory: [orderHistorySchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Customer', customerSchema);
