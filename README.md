# Expense Tracker Web App

## Problem

Managing personal spending is difficult without a structured record. This app gives individuals a fast, browser-based way to log, categorise, and review every expense in one place — no spreadsheets, no reloads, no friction. The target user is anyone who wants a lightweight financial overview without signing up for a full budgeting platform.

## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | HTML5, CSS3 (Flexbox / Grid), Vanilla JavaScript (SPA) |
| Styling    | Custom CSS with design tokens (CSS variables), Google Fonts (Inter) |
| Routing    | Express static file serving + client-side DOM swapping |
| Backend    | Node.js 20 + Express 4           |
| Database   | MongoDB 7 + Mongoose 8            |
| Deployment | Local / Render / Railway          |

## Features

- **Full CRUD** — add, view, edit, and delete expenses, all persisted to MongoDB
- **Live summary dashboard** — total spent, this-month total, top spending category, and a visual bar chart of the top 5 categories
- **Category filtering** — filter by Food, Transport, Entertainment, Health, Shopping, Bills, or Other with one click
- **Real-time search** — debounced search by expense title with no page reload
- **Sortable list** — sort by date, amount, or title in either direction
- **Modal-based edit form** — inline editing without navigating away
- **Immediate delete feedback** — item removed from the DOM instantly on confirm, then summary refreshes
- **Responsive design** — table layout on desktop, card layout on mobile (375 px+)
- **Keyboard navigation** — full tab order, Escape to close modals, focus management on open
- **Error handling** — every fetch is wrapped in try/catch; failures show a dismissible banner, never a blank screen
- **Loading states** — spinner shown while data fetches; list clears stale rows before re-rendering
- **Input validation** — client-side checks before any request is sent; server-side validation with Mongoose schema constraints and proper HTTP status codes

## Folder Structure

```
/expense-tracker
  /frontend
    index.html      — single HTML file; all views rendered via JavaScript
    style.css       — all styling: layout, components, responsive breakpoints
    app.js          — SPA logic: state, API calls, DOM rendering, event handling
  /backend
    server.js       — Express app setup, MongoDB connection, static file serving
    /routes
      expenses.js   — Express router: GET, POST, PUT, DELETE, and summary routes
    /models
      Expense.js    — Mongoose schema with validation rules
    /controllers
      expenseController.js — CRUD logic and aggregation pipeline for summary
  /database
    seed.json       — 10 sample expenses for initial data load
  .env.example      — environment variable template (safe to commit)
  .gitignore        — excludes node_modules, .env
  package.json      — project metadata and npm scripts
  README.md
```

## Challenges

One significant challenge was keeping the summary dashboard in sync after every mutation. Initially, after adding or deleting an expense, the category bar chart would show stale totals because the summary data was cached from the initial load. The fix was to fire `loadSummary()` and `loadExpenses()` in parallel with `Promise.all()` after every create, update, or delete, ensuring both the list and the summary always reflect the database state.

A second challenge arose with the delete flow: if a user deleted an item while a slow network caused the list re-fetch to still be in flight, the deleted row could reappear. This was solved by removing the row directly from the DOM and filtering it from `state.expenses` immediately on confirm, before the async call resolves, so the UI always feels instant regardless of network latency.

Handling the mobile layout also required rethinking the data display. A full HTML table overflows at 375 px, so the solution was to render two separate representations of the same data — a `<table>` for wide screens and a `<ul>` of cards for narrow screens — toggled purely with CSS media queries. Both lists are built from the same `state.expenses` array, keeping the rendering logic DRY.
