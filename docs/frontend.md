# Frontend Documentation

## Purpose
The frontend presents transaction history, recurring-payment insights, schedules, and automation controls. It communicates with the backend through a dedicated API service layer.

## Technology Stack
- React
- Vite
- React Router
- Tailwind-style utility classes
- Fetch-based API client

## Main Frontend Entry Point
- [src/main.jsx](../src/main.jsx)
- [src/App.jsx](../src/App.jsx)

## API Service Layer
- [src/services/automationApi.js](../src/services/automationApi.js)

This file is the communication layer between the UI and backend.

### Main helpers
- `loginDemo()` - authenticates with the backend
- `fetchTransactionHistory()` - reads live transaction history from the backend API
- `fetchScheduleSnapshot()` - reads transaction history and utility priority data for schedules UI
- `createAutomationRule()` - stores an automation rule
- `fetchAutomations()` - loads saved automation rules

## Backend Endpoints Used by the UI
- `POST /api/login`
- `GET /api/transactions-history`
- `GET /api/utility-priority-list`
- `GET /api/notifications`
- `GET /api/schedules`

## UI Data Flow
1. The user opens a page in the React app.
2. The page calls the service layer in `src/services/automationApi.js`.
3. The service layer fetches live data from the FastAPI backend.
4. The page renders the returned JSON records without changing the visual layout.

## Pages and Their Backend Usage
### Home
- File: [src/pages/Home.jsx](../src/pages/Home.jsx)
- Currently shows UI cards and walkthrough behavior.
- Can be extended to show live backend notifications if needed.

### Schedules List
- File: [src/pages/SchedulesList.jsx](../src/pages/SchedulesList.jsx)
- Uses `fetchScheduleSnapshot()`.
- Reads live transaction history and utility recurring priorities.
- Shows the top detected utility payment and related recurring transaction history.

### Automation Dashboard
- File: [src/pages/AutomationDashboard.jsx](../src/pages/AutomationDashboard.jsx)
- Uses `createAutomationRule()`.
- Builds an automation payload from the selected recurring suggestion.

### Statement
- File: [src/pages/Statement.jsx](../src/pages/Statement.jsx)
- Placeholder page that can be connected to `fetchTransactionHistory()`.

## Authentication in the UI
- Demo login uses `demo / demo123`.
- The token is stored in browser local storage under `paysmart_access_token`.
- The API service automatically reuses the token for authenticated requests.

## Transaction History Integration
If you want a page to show transaction history, use `fetchTransactionHistory()`.

Expected transaction shape:
- `transaction_id`
- `amount`
- `recipient`
- `date`
- `category`
- `note`

## Recurring Priority Integration
The schedules UI reads utility-only recurring items from `GET /api/utility-priority-list`.

Expected item shape after mapping:
- `pattern_id`
- `recipient`
- `amount`
- `category`
- `payment_count`
- `average_interval_days`
- `next_due_date`
- `priority_rank`

## Error Handling in the UI
- If backend requests fail, the service layer falls back to local sample data.
- This keeps the UI usable even when the backend is unavailable.
- If the backend returns validation errors, the UI should display a friendly message or keep the current fallback state.

## How to Run the Frontend
```bash
npm run dev
```

## How to Verify the Frontend Build
```bash
npm run build
```

## Maintenance Notes
- Keep the API service as the only place that knows backend URLs.
- Update page components only to consume the service layer, not direct fetch calls.
- If the backend response shape changes, update the mapping functions in `src/services/automationApi.js` first.
- Preserve the current UI design; only change the data source if the visual requirement does not change.

## Next Development Steps
- See [Development Roadmap](roadmap.md) for planned frontend work.
- Connect the Statement page to `fetchTransactionHistory()`.
- Connect the Notification page to `GET /api/notifications`.
- Keep the schedules and automation screens aligned with the backend API contract.
