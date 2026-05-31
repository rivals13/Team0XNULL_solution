# Development Roadmap

## Purpose
This roadmap defines the next development priorities for the backend, frontend, and shared API contract.

## Short-Term Priorities
### Backend
- Keep `backend/data/transactions.json` as the single source of truth.
- Keep the frontend-facing API namespace stable under `backend/api/api.py`.
- Expand utility-only recurring detection if new utility categories are added.
- Add tests for auth, transaction history, and recurring priority ranking.

### Frontend
- Keep all backend calls in `src/services/automationApi.js`.
- Connect the Statement page to live transaction history.
- Connect the Notification page to live notification data.
- Keep fallback data only for offline or backend-down scenarios.

## Mid-Term Priorities
- Add edit and delete flows in the frontend for transactions and schedules.
- Add filters for utility type, date range, and priority rank.
- Add loading and empty-state consistency across all transaction screens.
- Document every API response shape used by the UI.

## Long-Term Priorities
- Replace hard-coded demo logic with a real user/account system.
- Add persistent database storage if JSON files outgrow the current flow.
- Add automated integration tests for the end-to-end frontend/backend contract.
- Add monitoring or logging for detection and scheduling runs.

## Suggested Ownership
- Backend contract and detection logic: backend team
- UI rendering and state management: frontend team
- API shape and compatibility: both teams together
