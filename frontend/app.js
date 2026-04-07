/* =============================================
   State
   ============================================= */
const state = {
  expenses: [],
  activeCategory: 'All',
  searchQuery: '',
  sortBy: 'date',
  sortOrder: 'desc',
  pendingDeleteId: null,
};

/* =============================================
   Category colour map (must match CSS classes)
   ============================================= */
const CAT_COLORS = {
  Food:          '#f59e0b',
  Transport:     '#3b82f6',
  Entertainment: '#8b5cf6',
  Health:        '#10b981',
  Shopping:      '#ec4899',
  Bills:         '#ef4444',
  Other:         '#6b7280',
};

/* =============================================
   DOM refs
   ============================================= */
const $ = id => document.getElementById(id);

const errorBanner    = $('error-banner');
const errorBannerTxt = $('error-banner-text');
const loadingState   = $('loading-state');
const emptyState     = $('empty-state');
const expenseTbody   = $('expense-tbody');
const expenseCards   = $('expense-cards');
const toast          = $('toast');

const modalOverlay   = $('modal-overlay');
const modalTitle     = $('modal-title');
const expenseForm    = $('expense-form');
const formId         = $('form-expense-id');
const formTitle      = $('form-title');
const formCategory   = $('form-category');
const formAmount     = $('form-amount');
const formDate       = $('form-date');
const formNotes      = $('form-notes');
const submitBtn      = $('form-submit-btn');

const deleteOverlay  = $('delete-overlay');
const deleteNameEl   = $('delete-expense-name');
const deleteConfBtn  = $('delete-confirm-btn');

/* =============================================
   Utility helpers
   ============================================= */
function formatCurrency(n) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(n);
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
}

function toInputDate(dateStr) {
  return new Date(dateStr).toISOString().slice(0, 10);
}

/* =============================================
   Error / Toast UI
   ============================================= */
function showBanner(msg) {
  errorBannerTxt.textContent = msg;
  errorBanner.classList.remove('hidden');
}

function hideBanner() {
  errorBanner.classList.add('hidden');
}

let toastTimer = null;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 3000);
}

/* =============================================
   API helpers
   ============================================= */
const API = '/api/expenses';

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

/* =============================================
   Data loading
   ============================================= */
async function loadExpenses() {
  hideBanner();
  loadingState.classList.remove('hidden');
  emptyState.classList.add('hidden');
  expenseTbody.innerHTML = '';
  expenseCards.innerHTML = '';

  const params = new URLSearchParams();
  if (state.activeCategory !== 'All') params.set('category', state.activeCategory);
  if (state.searchQuery) params.set('search', state.searchQuery);
  params.set('sortBy', state.sortBy);
  params.set('order', state.sortOrder);

  try {
    const data = await apiFetch(`${API}?${params}`);
    state.expenses = data;
    renderExpenseList();
  } catch (err) {
    showBanner('Could not load expenses. Please check your connection and try again.');
    loadingState.classList.add('hidden');
  }
}

async function loadSummary() {
  try {
    const { categoryTotals, overall, monthTotal } = await apiFetch(`${API}/summary`);
    renderSummary(categoryTotals, overall, monthTotal);
  } catch (err) {
    // Non-critical; summary can fail silently
  }
}

/* =============================================
   Rendering — Summary
   ============================================= */
function renderSummary(categoryTotals, overall, monthTotal) {
  $('summary-total').textContent = formatCurrency(overall.total || 0);
  $('summary-count').textContent = `${overall.count || 0} expense${overall.count !== 1 ? 's' : ''}`;
  $('summary-month').textContent = formatCurrency(monthTotal || 0);

  const now = new Date();
  $('summary-month-label').textContent = now.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });

  if (categoryTotals.length > 0) {
    const top = categoryTotals[0];
    $('summary-top-cat').textContent = top._id;
    $('summary-top-cat-amount').textContent = formatCurrency(top.total);
  } else {
    $('summary-top-cat').textContent = '—';
    $('summary-top-cat-amount').textContent = '';
  }

  const barsEl = $('category-bars');
  barsEl.innerHTML = '';
  const maxTotal = categoryTotals[0]?.total || 1;
  const topFive = categoryTotals.slice(0, 5);

  topFive.forEach(({ _id: cat, total }) => {
    const pct = Math.round((total / maxTotal) * 100);
    const color = CAT_COLORS[cat] || '#6b7280';
    const li = document.createElement('li');
    li.className = 'cat-bar-item';
    li.innerHTML = `
      <span class="cat-bar-name">${escHtml(cat)}</span>
      <div class="cat-bar-track">
        <div class="cat-bar-fill" style="width:${pct}%;background:${color}"></div>
      </div>
      <span class="cat-bar-amount">${formatCurrency(total)}</span>
    `;
    barsEl.appendChild(li);
  });
}

/* =============================================
   Rendering — Expense List
   ============================================= */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderExpenseList() {
  loadingState.classList.add('hidden');

  if (state.expenses.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  expenseTbody.innerHTML = '';
  expenseCards.innerHTML = '';

  state.expenses.forEach(exp => {
    expenseTbody.appendChild(buildTableRow(exp));
    expenseCards.appendChild(buildCard(exp));
  });
}

function buildTableRow(exp) {
  const tr = document.createElement('tr');
  tr.dataset.id = exp._id;
  tr.innerHTML = `
    <td>
      <strong>${escHtml(exp.title)}</strong>
      ${exp.notes ? `<br><span style="font-size:12px;color:var(--color-muted)">${escHtml(exp.notes)}</span>` : ''}
    </td>
    <td><span class="cat-badge cat-${escHtml(exp.category)}">${escHtml(exp.category)}</span></td>
    <td>${formatDate(exp.date)}</td>
    <td class="align-right expense-amount">${formatCurrency(exp.amount)}</td>
    <td class="align-center">
      <div class="action-btns">
        <button class="icon-btn" aria-label="Edit ${escHtml(exp.title)}" data-action="edit" data-id="${escHtml(exp._id)}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
        <button class="icon-btn icon-btn--danger" aria-label="Delete ${escHtml(exp.title)}" data-action="delete" data-id="${escHtml(exp._id)}" data-title="${escHtml(exp.title)}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <polyline points="3 6 5 6 21 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </td>
  `;
  return tr;
}

function buildCard(exp) {
  const li = document.createElement('li');
  li.className = 'expense-card';
  li.dataset.id = exp._id;
  li.innerHTML = `
    <div class="expense-card-top">
      <span class="expense-card-title">${escHtml(exp.title)}</span>
      <span class="expense-card-amount">${formatCurrency(exp.amount)}</span>
    </div>
    <div class="expense-card-meta">
      <span class="cat-badge cat-${escHtml(exp.category)}">${escHtml(exp.category)}</span>
      <span>${formatDate(exp.date)}</span>
    </div>
    ${exp.notes ? `<p class="expense-card-notes">${escHtml(exp.notes)}</p>` : ''}
    <div class="expense-card-actions">
      <button class="btn btn-ghost" style="padding:5px 12px;font-size:13px" aria-label="Edit ${escHtml(exp.title)}" data-action="edit" data-id="${escHtml(exp._id)}">Edit</button>
      <button class="btn btn-danger" style="padding:5px 12px;font-size:13px" aria-label="Delete ${escHtml(exp.title)}" data-action="delete" data-id="${escHtml(exp._id)}" data-title="${escHtml(exp.title)}">Delete</button>
    </div>
  `;
  return li;
}

/* =============================================
   Modal — Add / Edit
   ============================================= */
function openModal(expense = null) {
  clearFormErrors();
  expenseForm.reset();
  formId.value = '';

  if (expense) {
    modalTitle.textContent = 'Edit Expense';
    submitBtn.textContent = 'Save Changes';
    formId.value = expense._id;
    formTitle.value = expense.title;
    formCategory.value = expense.category;
    formAmount.value = expense.amount;
    formDate.value = toInputDate(expense.date);
    formNotes.value = expense.notes || '';
  } else {
    modalTitle.textContent = 'Add Expense';
    submitBtn.textContent = 'Save Expense';
    formDate.value = new Date().toISOString().slice(0, 10);
  }

  modalOverlay.classList.remove('hidden');
  formTitle.focus();
}

function closeModal() {
  modalOverlay.classList.add('hidden');
}

/* =============================================
   Modal — Delete Confirmation
   ============================================= */
function openDeleteModal(id, title) {
  state.pendingDeleteId = id;
  deleteNameEl.textContent = title;
  deleteOverlay.classList.remove('hidden');
  deleteConfBtn.focus();
}

function closeDeleteModal() {
  deleteOverlay.classList.add('hidden');
  state.pendingDeleteId = null;
}

/* =============================================
   Form validation
   ============================================= */
function clearFormErrors() {
  ['title', 'category', 'amount', 'date'].forEach(field => {
    const el = $(`form-${field}`);
    const err = $(`err-${field}`);
    el.classList.remove('is-invalid');
    if (err) err.textContent = '';
  });
}

function setFieldError(field, msg) {
  $(`form-${field}`).classList.add('is-invalid');
  $(`err-${field}`).textContent = msg;
}

function validateForm() {
  clearFormErrors();
  let valid = true;

  if (!formTitle.value.trim()) {
    setFieldError('title', 'Title is required.');
    valid = false;
  }
  if (!formCategory.value) {
    setFieldError('category', 'Please select a category.');
    valid = false;
  }
  const amt = parseFloat(formAmount.value);
  if (!formAmount.value || isNaN(amt) || amt < 0.01) {
    setFieldError('amount', 'Enter a valid amount greater than $0.00.');
    valid = false;
  }
  if (!formDate.value) {
    setFieldError('date', 'Date is required.');
    valid = false;
  }

  return valid;
}

/* =============================================
   CRUD actions
   ============================================= */
async function handleFormSubmit(e) {
  e.preventDefault();
  if (!validateForm()) return;

  const id = formId.value;
  const payload = {
    title:    formTitle.value.trim(),
    category: formCategory.value,
    amount:   parseFloat(formAmount.value),
    date:     formDate.value,
    notes:    formNotes.value.trim(),
  };

  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving…';

  try {
    if (id) {
      await apiFetch(`${API}/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      showToast('Expense updated.');
    } else {
      await apiFetch(API, { method: 'POST', body: JSON.stringify(payload) });
      showToast('Expense added.');
    }
    closeModal();
    await Promise.all([loadExpenses(), loadSummary()]);
  } catch (err) {
    showBanner(err.message || 'Failed to save expense. Please try again.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = id ? 'Save Changes' : 'Save Expense';
  }
}

async function handleDelete() {
  const id = state.pendingDeleteId;
  if (!id) return;

  deleteConfBtn.disabled = true;
  deleteConfBtn.textContent = 'Deleting…';

  try {
    await apiFetch(`${API}/${id}`, { method: 'DELETE' });

    // Remove immediately from DOM for instant feedback
    document.querySelectorAll(`[data-id="${id}"]`).forEach(el => el.remove());

    // Update in-memory state
    state.expenses = state.expenses.filter(e => e._id !== id);
    if (state.expenses.length === 0) emptyState.classList.remove('hidden');

    closeDeleteModal();
    showToast('Expense deleted.');
    await loadSummary();
  } catch (err) {
    showBanner(err.message || 'Failed to delete expense. Please try again.');
    closeDeleteModal();
  } finally {
    deleteConfBtn.disabled = false;
    deleteConfBtn.textContent = 'Delete';
  }
}

/* =============================================
   Edit helper — fetch expense then open modal
   ============================================= */
async function startEdit(id) {
  try {
    const expense = await apiFetch(`${API}/${id}`);
    openModal(expense);
  } catch (err) {
    showBanner('Could not load expense details. Please try again.');
  }
}

/* =============================================
   Event delegation for table / card buttons
   ============================================= */
function handleListClick(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const { action, id, title } = btn.dataset;
  if (action === 'edit') startEdit(id);
  if (action === 'delete') openDeleteModal(id, title);
}

/* =============================================
   Filter / sort handlers
   ============================================= */
let searchDebounce = null;

function setupControls() {
  // Category chip filters
  $('category-chips').addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('chip--active'));
    chip.classList.add('chip--active');
    state.activeCategory = chip.dataset.cat;
    loadExpenses();
  });

  // Search
  $('search-input').addEventListener('input', e => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      state.searchQuery = e.target.value.trim();
      loadExpenses();
    }, 350);
  });

  // Sort
  $('sort-select').addEventListener('change', e => {
    const [field, order] = e.target.value.split('-');
    state.sortBy = field;
    state.sortOrder = order;
    loadExpenses();
  });
}

/* =============================================
   Modal event wiring
   ============================================= */
function setupModals() {
  // Open add modal
  $('open-add-modal-btn').addEventListener('click', () => openModal());

  // Close add/edit modal
  $('modal-close-btn').addEventListener('click', closeModal);
  $('modal-cancel-btn').addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });

  // Form submit
  expenseForm.addEventListener('submit', handleFormSubmit);

  // Close delete modal
  $('delete-close-btn').addEventListener('click', closeDeleteModal);
  $('delete-cancel-btn').addEventListener('click', closeDeleteModal);
  deleteOverlay.addEventListener('click', e => { if (e.target === deleteOverlay) closeDeleteModal(); });

  // Confirm delete
  deleteConfBtn.addEventListener('click', handleDelete);

  // Escape key closes whichever modal is open
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!modalOverlay.classList.contains('hidden')) closeModal();
      if (!deleteOverlay.classList.contains('hidden')) closeDeleteModal();
    }
  });
}

/* =============================================
   Expense list click delegation
   ============================================= */
function setupListEvents() {
  expenseTbody.addEventListener('click', handleListClick);
  expenseCards.addEventListener('click', handleListClick);
}

/* =============================================
   Boot
   ============================================= */
async function init() {
  setupControls();
  setupModals();
  setupListEvents();
  await Promise.all([loadExpenses(), loadSummary()]);
}

document.addEventListener('DOMContentLoaded', init);
