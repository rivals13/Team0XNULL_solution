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
```

---

## Run Development Server

```bash
npm run dev
```

Application runs at:

```bash
http://localhost:5173
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
Dashboard → Smart Suggestion → Schedule Payment → Confirm Automation
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

---

# Technology Stack

Technologies used in the project:

- React.js
- Vite
- NestJS
- FastAPI
- PostgreSQL
- Figma

---

# System Architecture

The system follows a modular architecture consisting of:

- React frontend for dashboard and scheduling interface
- NestJS backend for APIs and scheduling logic
- FastAPI microservice for intelligent pattern analysis
- PostgreSQL database for transactions and recurring schedules
- WebSocket/FCM for real-time notifications

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