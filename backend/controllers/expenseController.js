const Expense = require('../models/Expense');

// GET /api/expenses?category=Food&search=coffee&sortBy=date&order=desc
exports.getAll = async (req, res) => {
  try {
    const { category, search, sortBy = 'date', order = 'desc' } = req.query;
    const filter = {};

    if (category && category !== 'All') filter.category = category;
    if (search && search.trim()) {
      filter.title = { $regex: search.trim(), $options: 'i' };
    }

    const allowedSortFields = ['date', 'amount', 'title', 'category', 'createdAt'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'date';
    const sortOrder = order === 'asc' ? 1 : -1;

    // Secondary sort by createdAt keeps ordering deterministic when primary keys tie
    const sortSpec = { [sortField]: sortOrder };
    if (sortField !== 'createdAt') sortSpec.createdAt = sortOrder;

    let query = Expense.find(filter).sort(sortSpec);

    // Case-insensitive A-Z ordering for title sort
    if (sortField === 'title') {
      query = query.collation({ locale: 'en', strength: 2 });
    }

    const expenses = await query;
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
};

// GET /api/expenses/:id
exports.getOne = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    res.json(expense);
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Expense not found' });
    res.status(500).json({ error: 'Failed to fetch expense' });
  }
};

// POST /api/expenses
exports.create = async (req, res) => {
  try {
    const { title, category, amount, date, notes } = req.body;

    if (!title || !category || amount == null || !date) {
      return res.status(400).json({ error: 'Title, category, amount, and date are required' });
    }

    const expense = new Expense({ title, category, amount, date, notes });
    await expense.save();
    res.status(201).json(expense);
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message).join('; ');
      return res.status(400).json({ error: messages });
    }
    res.status(500).json({ error: 'Failed to create expense' });
  }
};

// PUT /api/expenses/:id
exports.update = async (req, res) => {
  try {
    const { title, category, amount, date, notes } = req.body;

    if (!title || !category || amount == null || !date) {
      return res.status(400).json({ error: 'Title, category, amount, and date are required' });
    }

    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      { title, category, amount, date, notes },
      { new: true, runValidators: true }
    );

    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    res.json(expense);
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Expense not found' });
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message).join('; ');
      return res.status(400).json({ error: messages });
    }
    res.status(500).json({ error: 'Failed to update expense' });
  }
};

// DELETE /api/expenses/:id
exports.remove = async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    res.json({ message: 'Expense deleted successfully' });
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ error: 'Expense not found' });
    res.status(500).json({ error: 'Failed to delete expense' });
  }
};

// GET /api/expenses/summary — category totals
exports.summary = async (req, res) => {
  try {
    const pipeline = [
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ];
    const categoryTotals = await Expense.aggregate(pipeline);

    const overallPipeline = [
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ];
    const overall = await Expense.aggregate(overallPipeline);

    // Current month total
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthPipeline = [
      { $match: { date: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ];
    const monthData = await Expense.aggregate(monthPipeline);

    res.json({
      categoryTotals,
      overall: overall[0] || { total: 0, count: 0 },
      monthTotal: monthData[0]?.total || 0,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
};
