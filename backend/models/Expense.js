const mongoose = require('mongoose');

const CATEGORIES = ['Food', 'Transport', 'Entertainment', 'Health', 'Shopping', 'Bills', 'Other'];

const expenseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [100, 'Title must be 100 characters or fewer'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: { values: CATEGORIES, message: 'Invalid category' },
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than zero'],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    notes: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Notes must be 500 characters or fewer'],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Expense', expenseSchema);
