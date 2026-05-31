# PaySmart Frontend

This is the React + Vite frontend for the PaySmart demo application.

## What it includes

- Responsive dashboard with bill summary cards
- Notification and chatbot flows
- Floating chatbot FAB with urgent badge
- Billing, missed payment, and auto-pay interactions

## Prerequisites

- Node.js v18+
- npm

## Install dependencies

```bash
cd Team0XNULL_solution
npm install
```

## Run locally

```bash
cd Team0XNULL_solution
npm run dev
```

Open the app in your browser at the URL printed by Vite (usually `http://localhost:5173`).

## Environment

The frontend uses `import.meta.env.VITE_API_URL` to connect to the backend.

If your backend is running on a different host or port, create a `.env` file in `Team0XNULL_solution/`:

```env
VITE_API_URL=http://localhost:3000
```

If not set, the app defaults to `http://localhost:3000`.

## Available scripts

- `npm run dev` — start the Vite dev server
- `npm run build` — build the production app
- `npm run preview` — preview the built app
- `npm run lint` — run ESLint

## Folder structure

- `src/` — application source code
- `src/pages/` — page components such as `Home.jsx`, `Chatboat.jsx`, and `Schedules.jsx`
- `src/layout/` — shared layout components
- `src/assets/` — static assets and images
- `vite.config.js` — Vite configuration

## Notes

- The frontend relies on the backend API to fetch billing and notification state.
- There is no real database integration in this prototype.
- `home` and `chatbot` flows are driven by mock data and demo behavior.

## Useful files

- `src/pages/Home.jsx` — dashboard and walkthrough experience
- `src/pages/Chatboat.jsx` — chatbot UI and messaging experience
- `src/pages/Chatbotfab.jsx` — floating chatbot action button
