# REST & Streaming API Reference

The AgentOrbit Fastify server exposes a REST API along with Server-Sent Events (SSE) for live streaming telemetry.

All endpoints support cross-origin requests (CORS).

---

## Task Management Endpoints

### 1. Dispatch New Task

Creates a task and triggers the autonomous ReAct engine in the background.

- **Method:** `POST`
- **Path:** `/api/tasks`
- **Request Headers:** `Content-Type: application/json`
- **Request Body:**

```json
{
  "prompt": "Monitor flight prices from Chișinău to London under $125",
  "userId": "pilot"
}
```

- **Response (201 Created):**

```json
{
  "taskId": "V1StGXR8_Z5jdHi6B-myT",
  "status": "pending",
  "prompt": "Monitor flight prices from Chișinău to London under $125",
  "createdAt": 1773446400000
}
```

---

### 2. Stream Task Execution (SSE)

Establishes a persistent Server-Sent Events connection. Upon connecting, the server replays all existing steps stored in SQLite, then streams new reasoning and tool execution events in real time.

- **Method:** `GET`
- **Path:** `/api/tasks/:id/stream`
- **Response Headers:**
  - `Content-Type: text/event-stream`
  - `Cache-Control: no-cache`
  - `Connection: keep-alive`

#### Event Format

```
event: step
data: {
  "taskId": "V1StGXR8_Z5jdHi6B-myT",
  "stepNumber": 1,
  "type": "THOUGHT",
  "thought": "I need to check current low-cost flight offerings from Chișinău to London.",
  "timestamp": 1773446401200
}

event: step
data: {
  "taskId": "V1StGXR8_Z5jdHi6B-myT",
  "stepNumber": 1,
  "type": "ACTION",
  "toolName": "web_fetch",
  "toolInput": { "url": "https://news.ycombinator.com" },
  "timestamp": 1773446401300
}

event: step
data: {
  "taskId": "V1StGXR8_Z5jdHi6B-myT",
  "stepNumber": 1,
  "type": "OBSERVATION",
  "toolName": "web_fetch",
  "toolOutput": "Found 3 outbound direct routes: WizzAir ($142), FlyOne ($118), HiSky ($165).",
  "timestamp": 1773446402500
}

event: step
data: {
  "taskId": "V1StGXR8_Z5jdHi6B-myT",
  "stepNumber": 5,
  "type": "FINAL_ANSWER",
  "finalAnswer": "FlyOne 5F 821 is currently $118, which meets the target budget.",
  "timestamp": 1773446405100
}

event: done
data: {"status":"finished"}
```

---

### 3. Fetch Task State & Steps

Retrieves complete task metadata and the chronological list of recorded steps.

- **Method:** `GET`
- **Path:** `/api/tasks/:id`
- **Response (200 OK):**

```json
{
  "task": {
    "id": "V1StGXR8_Z5jdHi6B-myT",
    "user_id": "pilot",
    "prompt": "Monitor flight prices from Chișinău to London under $125",
    "status": "completed",
    "result": "FlyOne 5F 821 is currently $118, which meets the target budget.",
    "created_at": 1773446400000,
    "updated_at": 1773446405200
  },
  "steps": [ ... ],
  "pendingApproval": null
}
```

---

### 4. Submit Human-in-the-Loop Clearance

Submits operator approval or denial for a paused action.

- **Method:** `POST`
- **Path:** `/api/tasks/:id/approve`
- **Request Body:**

```json
{
  "approved": true
}
```

- **Response (200 OK):**

```json
{
  "success": true,
  "status": "approved"
}
```

---

## Background Schedules Endpoints

### 5. List Scheduled Automations

- **Method:** `GET`
- **Path:** `/api/schedules?userId=pilot`
- **Response (200 OK):**

```json
{
  "jobs": [
    {
      "id": "job_9841",
      "user_id": "pilot",
      "name": "RMO-LON Flight Sentinel",
      "cron_expression": "0 */4 * * *",
      "prompt": "Monitor flight prices from Chișinău to London under $125",
      "is_active": 1,
      "last_run_at": 1773440000000,
      "next_run_at": 1773454400000,
      "created_at": 1773430000000
    }
  ]
}
```

---

### 6. Create Scheduled Automation

- **Method:** `POST`
- **Path:** `/api/schedules`
- **Request Body:**

```json
{
  "name": "Morning Tech Radar",
  "cron_expression": "30 8 * * *",
  "prompt": "Extract top AI announcements from Hacker News and summarize trends",
  "userId": "pilot"
}
```

- **Response (201 Created):**

```json
{
  "jobId": "job_1245",
  "name": "Morning Tech Radar",
  "cron_expression": "30 8 * * *",
  "nextRunAt": "2026-09-13T08:30:00.000Z"
}
```

---

### 7. Toggle Automation Active State

- **Method:** `PATCH`
- **Path:** `/api/schedules/:id/toggle`
- **Response (200 OK):**

```json
{
  "id": "job_1245",
  "isActive": false
}
```

---

### 8. Delete Scheduled Automation

- **Method:** `DELETE`
- **Path:** `/api/schedules/:id`
- **Response (200 OK):**

```json
{
  "success": true
}
```

---

## Agent Memory Endpoints

### 9. List Memory Records

- **Method:** `GET`
- **Path:** `/api/memory?userId=pilot`
- **Response (200 OK):**

```json
{
  "memory": [
    {
      "id": "mem_01",
      "user_id": "pilot",
      "key": "min_flight_rmo_lon",
      "value": "$118 via FlyOne 5F 821 on 2026-09-13",
      "updated_at": 1773446403000
    }
  ]
}
```

---

### 10. Delete Memory Record

- **Method:** `DELETE`
- **Path:** `/api/memory/:key?userId=pilot`
- **Response (200 OK):**

```json
{
  "success": true
}
```
