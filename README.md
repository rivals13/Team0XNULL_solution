# PaySmart

Intelligent Payment Scheduling & Recurring Payment Automation solution developed for the eSewa × WWF Hackathon 2026 by Team 0XNULL.

PaySmart is designed to simplify recurring digital payments through intelligent automation, smart bill alerts, recurring payment scheduling, AI-based payment pattern detection, and low-balance awareness notifications.

The solution aims to transform digital wallets into proactive financial assistants that reduce repetitive manual effort while improving user convenience and payment reliability.

---

# Problem Statement

Recurring payments such as electricity bills, internet subscriptions, rent, and monthly services are predictable expenses. However, users still manually repeat the same payment process every month.

Existing scheduling and automation systems are often difficult to discover or require multiple setup steps, causing users to rely on manual payment habits.

PaySmart addresses these challenges by making payment automation more visible, intelligent, and user-friendly.

---

# Core Features

## Smart Bill Alerts

- Detects upcoming bills
- Sends contextual in-app reminders
- Pre-fills payment information
- Allows instant payment or scheduling

---

## AI-Based Pattern Detection

The system analyzes:

- Same recipient
- Similar transaction amount
- Repeating payment intervals

When recurring behavior is detected, PaySmart generates automation suggestions.

---

## Flexible Scheduling

Users can:

- Schedule payments within flexible time windows
- Handle dynamic payment amounts
- Modify schedules easily

---

## Low Balance Notifications

Before automated execution:

- Wallet balance is verified
- Users receive preventive low-balance alerts
- Users can top up or reschedule payments

---

# Installation

Instructions to run the project locally.

## Prerequisites

Make sure the following tools are installed:

- Node.js
- npm
- Python 3.14+
- Git

Verify installation:

```bash
node -v
npm -v
git --version
```

---

## Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
```

---

## Navigate to Project Directory

```bash
cd YOUR_REPOSITORY
```

---

## Install Dependencies

```bash
npm install
python -m pip install -r requirements.txt
```

---

## Run the Frontend

```bash
npm run dev
```

Application runs at:

```bash
http://localhost:5173
```

---

## Run the Backend

```bash
python -m uvicorn backend.main:app --reload --port 8000
```

The API runs at:

```bash
http://127.0.0.1:8000
```

---

# Usage

PaySmart allows users to:

- Detect recurring payment behavior
- Receive intelligent bill reminders
- Schedule recurring payments
- Enable payment automation
- Receive real-time notifications

Example workflow:

```bash
JSON transaction log → FastAPI pattern detection → Schedules prompt → Automation dashboard
```

---

# Deploy

Build the project for production:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

To run the API in production mode, use a process manager such as Uvicorn or Gunicorn behind a reverse proxy.

---

# Technology Stack

Technologies used in the project:

- React.js
- Vite
- FastAPI
- Scikit-learn
- JSON file storage
- JWT authentication

---

# System Architecture

The system follows a modular architecture consisting of:

- React frontend for the schedules prompt and automation dashboard
- FastAPI backend for transaction CRUD, pattern insights, and automation workflows
- JSON files for transaction history and saved automation rules
- Scikit-learn recurring-pattern detection over grouped transaction history
- JWT-protected API requests between the frontend and backend

### API Endpoints

- `POST /login` authenticates demo user (`demo` / `demo123`) and returns success message with JWT
- `POST /auth/login` issues a demo JWT (backward compatibility route)
- `GET /transactions` returns stored transaction history
- `POST /transactions` creates a transaction record and returns a confirmation payload
- `GET /patterns` returns detected recurring-payment insights
- `GET /automation` lists saved automation rules
- `POST /automation` saves a recurring-payment automation rule

### API Response and Error Contract

- `200` successful login/transaction responses (JSON body)
- `400` invalid request payloads (validation errors)
- `401` invalid credentials for login
- `404` endpoint/resource not found
- Swagger/OpenAPI docs available at `/docs`

---

# Team 0XNULL

| Name | Responsibility |
|---|---|
| Sansar Chhetri | Python (FastAPI) |
| Nirmal Bista | PostgreSQL Database |
| Rajkumar Tiruwa | UI/UX Design |
| Paras Adhikari | Frontend Development |
| Abishek Kunwar | Backend Development (NestJS) |

---

# Contributing

Steps to contribute:

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push updates
5. Create a Pull Request

---

# Documentation

Additional project details, architecture, and workflow documentation are included within the project report and source files.

---

# Security & Privacy

PaySmart ensures:

- Secure API communication
- User-approved automation
- Protected transaction handling
- Real-time payment notifications
- Safe recurring payment execution

---

# Expected Impact

PaySmart aims to:

- Reduce missed payments
- Improve user convenience
- Increase transaction consistency
- Enhance user engagement within eSewa

---

# License

This project is developed for educational and hackathon purposes.