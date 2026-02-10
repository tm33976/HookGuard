# 🛡️ HookGuard v2.0
**Distributed Webhook Ingestion & Delivery System**

HookGuard is a production-inspired middleware system designed to make webhook handling reliable, secure, and observable. It decouples webhook ingestion from processing to ensure durability, controlled retries, and visibility even when downstream services fail.

---

## 🧐 The Problem

In modern distributed systems, webhooks are fragile:

- **Data Loss** – If the receiving server is briefly unavailable, events can be lost.
- **Traffic Spikes** – Sudden bursts of events can overwhelm synchronous APIs.
- **Security Risks** – Unsigned webhooks can be spoofed or replayed.
- **Zero Visibility** – Failures often go unnoticed without proper tooling.

---

## 🚀 The Solution: HookGuard

HookGuard separates **Ingestion** from **Processing**.

- **Ingest Fast** – The API responds immediately (202 Accepted).
- **Process Asynchronously** – Background workers handle delivery.
- **Retry Intelligently** – Failures trigger exponential backoff retries.
- **Observe Everything** – A dashboard exposes task state and history.

---

## ✨ Key Features

### 🛡️ Guaranteed Delivery (At-Least-Once)
- Automatic retries (configurable, default 5)
- Exponential backoff for transient failures
- Dead-letter handling with manual retry

### ⚡ Best Effort Mode
- Single delivery attempt
- Failed tasks are dropped immediately
- Suitable for non-critical events (logs, metrics)

### 🔒 Security
- HMAC SHA-256 signature verification
- Per-endpoint rate limiting

### 📊 Observability Dashboard
- Task lifecycle visibility (PENDING, PROCESSING, COMPLETED, FAILED)
- Retry counts and timestamps
- Interactive playground for testing deliveries

---

## 🛠️ Tech Stack

| Component | Technology | Purpose |
|---------|------------|---------|
| Frontend | Next.js 16 + Tailwind CSS | Observability dashboard |
| Backend | Node.js + Express | Webhook ingestion API |
| Database | MongoDB Atlas | Persistent source of truth |
| Queue | Redis + BullMQ | Asynchronous job processing |
| Worker | Node.js | Delivery, retries, rate limiting |

---

## ⚙️ Getting Started

### 1. Prerequisites
- Node.js v18+
- Docker Desktop (for Redis)
- MongoDB connection string (local or Atlas)

### 2. Clone Repository
```bash
git clone git remote add origin https://github.com/tm33976/HookGuard.git
cd HookGuard
```

### 3. Start Redis
```bash
docker run -d --name redis-stack -p 6379:6379 -p 8001:8001 redis/redis-stack:latest
```

### 4. Backend Setup
```bash
cd backend
npm install
```

Create `.env`:
```
PORT=5000
MONGO_URI=your_mongodb_connection_string
REDIS_HOST=localhost
REDIS_PORT=6379
```

Run:
```bash
npm run dev:api
npm run dev:worker
```

### 5. Frontend Setup
```bash
cd ../web
npm install
npm run dev
```

### 6. Access
Open http://localhost:3000

---

## 🧪 Testing

- Use the Playground to ingest test payloads
- Try valid and invalid target URLs
- Observe retries and failure handling in the dashboard

---

## 📜 API Endpoints

| Method | Endpoint | Description |
|------|----------|-------------|
| POST | /api/v1/ingest | Ingest a webhook |
| GET | /api/v1/tasks | List tasks |
| POST | /api/v1/tasks/:id/retry | Retry failed task |

---

## 👨‍💻 Author

**Tushar Mishra**  
Software Developer | Distributed Systems Enthusiast  
Email: tm3390782@gmail.com

---


