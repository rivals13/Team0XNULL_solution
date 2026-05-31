# Backend Documentation

## Purpose
The backend is the source of truth for authentication, transaction storage, recurring-payment detection, utility priority ranking, schedules, and notifications.

## Technology Stack
- FastAPI
- Pydantic
- JSON file storage
- JWT authentication
- Python standard library file and date utilities

## Main Backend Entry Point
- [backend/main.py](../backend/main.py)

The FastAPI app mounts routers, enables CORS for the frontend, exposes a health check, and runs the recurring detection cycle on startup.

## API Modules
- [backend/api/api.py](../backend/api/api.py)
- [backend/routes/auth.py](../backend/routes/auth.py)
- [backend/routes/transactions.py](../backend/routes/transactions.py)
- [backend/routes/recurring.py](../backend/routes/recurring.py)
- [backend/routes/patterns.py](../backend/routes/patterns.py)
- [backend/routes/automation.py](../backend/routes/automation.py)

## Key API Endpoints
### Frontend-facing API namespace
- `POST /api/login`
- `GET /api/transactions-history`
- `GET /api/utility-priority-list`
- `GET /api/notifications`
- `GET /api/schedules`

### Core backend routes
- `POST /login`
- `POST /auth/login`
- `GET /transactions`
- `POST /transactions`
- `GET /patterns`
- `GET /automation`
- `POST /automation`
- `POST /recurring/detect`
- `GET /recurring/priority-list`
- `GET /recurring/utility-priority-list`
- `GET /recurring/notifications`
- `GET /recurring/schedules`

## Authentication Flow
- Demo credentials are defined in [backend/services/auth_service.py](../backend/services/auth_service.py).
- Successful login returns a JWT token.
- Protected endpoints use the JWT bearer token dependency in [backend/routes/dependencies.py](../backend/routes/dependencies.py).

## Transaction Data Flow
1. The backend stores transaction history in `backend/data/transactions.json`.
2. The transaction CRUD route reads and writes through [backend/database/db_handler.py](../backend/database/db_handler.py).
3. The frontend reads transaction history through `GET /api/transactions-history`.
4. The recurring workflow uses the same canonical transaction source.

## Recurring Priority Logic
The recurring logic lives in [backend/services/priority_workflow.py](../backend/services/priority_workflow.py).

Important behavior:
- Loads canonical transaction data from `backend/data/transactions.json`
- Groups transactions by merchant/service provider
- Calculates average amount, estimated interval, and next due date
- Assigns `priority_rank` after sorting
- Filters utility-only recurring items for the UI through `GET /api/utility-priority-list`
- Requires `occurrences_in_year >= 5` for recurring suggestions

## Data Files
- `backend/data/transactions.json` - canonical transaction store
- `backend/data/notification_database.json` - detected notifications
- `backend/data/schedule_database.json` - user-confirmed schedules
- `backend/config.json` - recurring detection configuration

## Validation Rules
Transaction payloads use Pydantic models from [backend/database/models.py](../backend/database/models.py):
- `transaction_id`
- `amount`
- `recipient`
- `date`
- `category`
- `note`

Validation failures return HTTP `400` through the custom validation handler in [backend/main.py](../backend/main.py).

## Error Behavior
- `200` - successful API response
- `400` - invalid payload
- `401` - invalid login credentials
- `404` - missing endpoint or resource

## How to Run the Backend
```bash
python -m uvicorn backend.main:app --reload --port 8000
```

## How to Test Quickly
```bash
Invoke-RestMethod -Uri http://127.0.0.1:8000/api/login -Method Post -ContentType "application/json" -Body '{"username":"demo","password":"demo123"}'
Invoke-RestMethod -Uri http://127.0.0.1:8000/api/transactions-history -Method Get
Invoke-RestMethod -Uri http://127.0.0.1:8000/api/utility-priority-list -Method Get
```

## Maintenance Notes
- Keep `transactions.json` as the single source of truth for transaction history.
- Update `priority_workflow.py` if the recurring ranking logic changes.
- Update the API namespace in `backend/api/api.py` if the frontend needs new read endpoints.
- Regenerate notification data by running the detection cycle at startup or by calling the recurring detect route.
- Use `POST /recurring/schedules/{schedule_id}/ignore` to archive a saved schedule back into `notification_database.json`.

## Next Development Steps
- See [Development Roadmap](roadmap.md) for planned backend improvements.
- Add tests for API responses, ranking order, and login behavior.
- Keep the transaction-history contract stable so the frontend can read it without page changes.
