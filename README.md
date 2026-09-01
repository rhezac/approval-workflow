# 🚀 Multi-Level Approval Workflow System

A Multi-Level Approval Workflow Engine and Centralized Governance Platform built with **NestJS**, **PostgreSQL (TypeORM)**, and **React (Vite + Tailwind CSS + TypeScript)**.

---

## 📑 Table of Contents
1. [Key Capabilities & Domain Features](#-key-capabilities--domain-features)
2. [Project & Folder Structure](#-project--folder-structure)
3. [Step-by-Step Installation & Setup](#-step-by-step-installation--setup)
4. [Database Initialization & .env Encryption](#-database-initialization---env-encryption)
5. [API Documentation (Swagger OpenAPI)](#-api-documentation-swagger-openapi)
6. [Postman Collection Guide](#-postman-collection-guide)
7. [How to Configure Approval Workflows in the UI](#-how-to-configure-approval-workflows-in-the-ui)
8. [Integrating 3rd-Party Applications as a Centralized Approval Hub](#-integrating-3rd-party-applications-as-a-centralized-approval-hub)
9. [Automated Unit Testing & Quality Assurance](#-automated-unit-testing--quality-assurance)

---

## 🌟 Key Capabilities & Domain Features

### 1. 👥 Dynamic RBAC & Full Name Identity
- **Roles**: `Admin`, `Direktur`, `Head of Division`, `Manager`, `Leader`, `Staff`.
- **Divisions**: `IT`, `Finance`, `Business`, `Operation`, `Human Resources (HR)`.
- **Identity**: Every user has a **Full Name** and unique **Username**. Autocomplete searches query both fields seamlessly.

### 2. 🔀 Granular Multi-Approver Configuration per Level
- Workflows support sequential stages (Level 1 -> Level 2 -> Level N).
- Within each level, multiple granular **Approver Units** can be combined:
  1. **Role + Division**: Evaluated dynamically based on the requester's division or a specific target division.
  2. **Specific User**: Direct assignment to an explicit individual.
  3. **Multi-User Choice (Logic OR)**: Pool of candidate approvers where **approval by ANY 1 candidate immediately fulfills the unit** and marks counterpart candidates as `Approved / Covered (OR)`.

### 3. 🛡️ Level Stage Isolation & Workflow Versioning
- **Stage Isolation**: Users assigned across multiple levels must approve each level sequentially (approving Level 1 will never auto-approve Level 2).
- **Snapshot Execution**: When a task is submitted, its workflow blueprint is snapshot-copied into `snapshotWorkflowSteps`, guaranteeing that future workflow edits or version increments will never break in-flight tasks.
- **Workflow Deletion Guard**: Active workflows associated with open tasks (`pending`, `in progress`, `revision`) cannot be hard-deleted.

### 4. 🔄 Revision Cycle & Delegation
- **Revision Lifecycle**: Approvers can request revisions; the requester/staff can submit updated fields/attachments, which returns the task into the active workflow.
- **Same-Role Delegation**: Approvers can delegate authority during leave to colleagues holding the **exact same role** within an active date window.
- **Admin Reassignment**: Admins can reassign pending approval tasks to another user.

### 5. 🔒 Security, Non-Blocking Logging & AES-256 .env Encryption
- **AES-256-GCM Encrypted .env**: Database credentials in `.env` are encrypted (`enc:...`) with automatic runtime decryption.
- **Asynchronous HTTP System Logs**: Daily rotating request/response logging (`backend/logs/system-YYYY-MM-DD.log`).
- **Compliance Audit Trail**: Immutable state change logs with before/after diffs (`backend/logs/audit-YYYY-MM-DD.log`).
- **Recursive Sensitive Data Masking**: Automatically masks passwords, JWT tokens, and API keys.

---

## 📁 Project & Folder Structure

```
approval-workflow/
├── README.md                                  # Unified Project Documentation
├── backend/                                   # NestJS REST API Server
│   ├── .env                                   # Application configuration (with encrypted DB password)
│   ├── .env.example                           # Example environment template
│   ├── nest-cli.json                          # NestJS CLI build & asset settings
│   ├── package.json
│   ├── scripts/
│   │   └── crypto-cli.js                      # CLI utility to encrypt/decrypt .env values
│   ├── src/
│   │   ├── app.module.ts                      # Root NestJS Module
│   │   ├── main.ts                            # Application Bootstrap & Swagger Configuration
│   │   ├── database-helper.ts                 # Database auto-creation & preflight helper
│   │   ├── database-seeder.service.ts         # Initial user and workflow seeder
│   │   ├── common/
│   │   │   ├── audit/audit-logger.ts          # Async Audit Logger (Who, What, When, Where)
│   │   │   ├── crypto-helper.ts               # AES-256-GCM Encryption / Decryption Helper
│   │   │   ├── date-helper.ts                 # Date normalization utility
│   │   │   ├── decorators/auth.decorator.ts   # Custom decorators (@Public, @Roles)
│   │   │   ├── filters/http-exception.filter.ts # Global Exception Filter (clean error responses)
│   │   │   └── interceptors/logging.interceptor.ts # Non-blocking HTTP Logger with Data Masking
│   │   ├── config/
│   │   │   ├── api-keys.json                  # External System API Keys Configuration
│   │   │   └── combobox-data.json             # Dynamic Roles & Divisions Reference
│   │   ├── entities/                          # TypeORM Database Entities
│   │   │   ├── user.entity.ts
│   │   │   ├── task.entity.ts
│   │   │   ├── task-approval.entity.ts
│   │   │   ├── task-history.entity.ts
│   │   │   ├── approval-workflow.entity.ts
│   │   │   └── approval-delegation.entity.ts
│   │   └── modules/
│   │       ├── auth/                          # JWT & API Key Authentication Module
│   │       ├── users/                         # User Management & Search Autocomplete Module
│   │       ├── workflows/                     # Approval Flow Blueprint Configuration Module
│   │       ├── tasks/                         # Core Task Lifecycle & Approval Engine Module
│   │       ├── combobox/                      # Dynamic Reference Combobox API Module
│   │       └── health/                        # Diagnostic Health Check Module
│   └── uploads/                               # Stored Task File Attachments
├── database/                                  # Database DDL, Seed Scripts & Postman
│   ├── 01_create_database.sql                 # SQL to create database
│   ├── 02_create_schema.sql                   # SQL to create ENUMs, Tables & Constraints
│   ├── 03_seed_data.sql                       # SQL to insert seed users & default workflows
│   ├── schema_and_seed.sql                    # All-In-One SQL Script
│   └── Approval_Workflow_API.postman_collection.json # Ready-to-use Postman Collection
└── frontend/                                  # React (Vite + Tailwind CSS + TypeScript)
    ├── package.json
    ├── tailwind.config.js
    ├── src/
    │   ├── App.tsx                            # Root Application Router
    │   ├── context/AuthContext.tsx            # Global Authentication Context & Session Guard
    │   ├── services/api.ts                    # Axios HTTP Client with JWT Interceptors
    │   ├── components/
    │   │   └── MainLayout.tsx                 # Responsive Sidebar & User Navigation
    │   └── pages/
    │       ├── LoginPage.tsx                  # User Login Form
    │       ├── UsersPage.tsx                  # User Management & Role/Division Assignments
    │       ├── WorkflowsPage.tsx              # Multi-Level Workflow Visual Builder (Logic OR)
    │       ├── TasksPage.tsx                  # Task Management, Approvals & Progression Cards
    │       └── DelegationsPage.tsx            # Substitute Approver Delegation Management
```

---

## 🛠️ Step-by-Step Installation & Setup

### Prerequisites
- **Node.js**: `v18.x` or `v20.x`
- **PostgreSQL**: `v14+` / `v16.x` running on `localhost:5432`

---

### Step 1: Initialize the Database

You can initialize the database using the PostgreSQL CLI (`psql`) or a GUI tool (**pgAdmin 4 / DBeaver**):

#### Via Command Line (psql)
```bash
# 1. Create the database
psql -U postgres -h localhost -f database/01_create_database.sql

# 2. Run schema and initial seed data
psql -U postgres -h localhost -d approval_workflow_db -f database/schema_and_seed.sql
```

### Step 2: Configure & Start the Backend

```bash
cd backend
npm install
npm run build
npm run start:dev
```

The NestJS backend will start at:
- **API Base URL**: `http://localhost:3000/api`
- **Swagger Documentation**: `http://localhost:3000/api/docs`
- **Health Check**: `http://localhost:3000/api/health`

---

### Step 3: Start the Frontend Application

In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```

Open your browser at:
👉 **`http://localhost:5173`**

---

## 🔑 Pre-Seeded Default Accounts
All default accounts share the password: **`Admin@123`**

| Full Name | Username | Role | Division |
| :--- | :--- | :--- | :--- |
| **Administrator IT** | `admin` | **Admin** | IT |
| **Bambang Direktur Utama** | `direktur` | **Direktur** | Business |
| **Irwan Manager IT** | `manager_it` | **Manager** | IT |
| **Farida Manager Finance** | `manager_fin` | **Manager** | Finance |
| **Budi Manager Business** | `manager_biz` | **Manager** | Business |
| **Surya Staff IT** | `staff_it` | **Staff** | IT |
| **Siti Staff Finance** | `staff_fin` | **Staff** | Finance |
| **Bayu Staff Business** | `staff_biz` | **Staff** | Business |

---

## 🔐 Database .env Password Encryption

Database passwords in `backend/.env` are encrypted using **AES-256-GCM**.

To encrypt or decrypt a new password:
```bash
cd backend

# Encrypt a plaintext password
node scripts/crypto-cli.js encrypt mySecretPassword

# Decrypt an encrypted token
node scripts/crypto-cli.js decrypt enc:434a3e2bf8d9f748209612913e4f39b5:137d12f7ae7c2616b432323c81254bed:14ba15dfb66f86fc
```

---

## 📖 API Documentation (Swagger OpenAPI)

Interactive Swagger API documentation is available at:
👉 **`http://localhost:3000/api/docs`**

### Swagger Features:
- **Dual Authentication**: Test endpoints using **Bearer JWT Token** or **`x-api-key`**.
- **Complete Response Schemas**: Includes real sample payloads and standardized HTTP Status Codes (`200 Success Operation`, `201 Created`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`, `503 Service Unavailable`).

---

## 📮 Postman Collection Guide

The complete Postman Collection is located at:
📁 **`database/Approval_Workflow_API.postman_collection.json`**

### How to Use:
1. Open **Postman** -> Click **Import** -> Select `database/Approval_Workflow_API.postman_collection.json`.
2. **Auto-Token Capture**:
   - Run the request in **`2. Authentication > Login - Admin`** (or Login Manager).
   - Postman test scripts will **automatically save the JWT token** into the `{{authToken}}` collection variable.
   - All subsequent requests will automatically be authenticated.
3. **Structured Request Folders**:
   - `1. Health & Reference Data`
   - `2. Authentication`
   - `3. User Management`
   - `4. Workflow Configuration (Multi-Level & Logic OR)`
   - `5. Task Management & Approval Execution (APPROVE, REVISION, CANCEL)`
   - `6. Approval Delegations`
   - `7. API Key Integration (x-api-key)`

---

## 🖥️ How to Configure Approval Workflows in the UI

1. Log in as an **Admin** user (e.g. `admin` / `Admin@123`).
2. Navigate to **Approval Flows** in the sidebar.
3. Click **+ Create Multi-Level Workflow** (or **Edit** on an existing workflow).
4. For each stage (e.g. *Level 1: Verification*, *Level 2: Final Sign-off*), add one or more **Approver Units**:
   - **Type 1: Role + Division**: Select role (e.g. `Manager`, `Head of Division`, `Leader`) and division (`IT`, `Finance`, `Same Division as Requester`, or `Any Division`).
   - **Type 2: Specific Username**: Search and select an explicit user with the autocomplete input.
   - **Type 3: Multi-User Choice (Logic OR)**: Search and add multiple candidates using the autocomplete search bar.
5. Click **Save Workflow**.

---

## 🔌 Integrating 3rd-Party Applications as a Centralized Approval Hub

External systems (such as ERP, HRIS, Procurement, or CRM applications) can use this platform as their **Centralized Approval Authority**.

### 1. Authentication for External Systems
External systems can authenticate using either:
- A dedicated **JWT Token** via `POST /api/auth/login`.
- A direct **API Key** via the `x-api-key` HTTP Header (configured in `backend/src/config/api-keys.json`).

```http
GET /api/tasks HTTP/1.1
Host: localhost:3000
x-api-key: ak_live_enterprise_flow_7829104812
Content-Type: application/json
```

---

### 2. Submitting a Task for Approval from a 3rd-Party App
```http
POST /api/tasks HTTP/1.1
Host: localhost:3000
Authorization: Bearer <JWT_TOKEN> (or x-api-key)
Content-Type: application/json

{
  "title": "ERP PR-2026-0089: Server Procurement",
  "description": "Purchase request generated by SAP ERP for cluster expansion.",
  "priority": "HIGH",
  "division": "IT",
  "workflowId": "b0000000-0000-0000-0000-000000000001",
  "notes": "Automated sync from ERP",
  "attachments": [
    {
      "name": "ERP Purchase Requisition Link",
      "url": "https://erp.internal.company.com/pr/0089",
      "type": "link",
      "notes": "Direct ERP Document Link"
    }
  ]
}
```

---

### 3. Reading Approval Stages & Status via API
When calling `GET /api/tasks/:id`, the response structure provides full visibility into the approval pipeline:

```json
{
  "id": "2cd513e3-5065-4c83-bef0-91a342c46a3d",
  "title": "ERP PR-2026-0089: Server Procurement",
  "status": "in progress",
  "currentStepOrder": 1,
  "snapshotWorkflowSteps": [
    {
      "stepOrder": 1,
      "name": "Level 1: Leads & Multi Reviewers",
      "approverUnits": [
        { "id": "u-1-1", "label": "Manager IT", "type": "ROLE_DIVISION" },
        { "id": "u-1-2", "label": "Finance Approval", "type": "MULTI_USER_OPTION" }
      ]
    },
    {
      "stepOrder": 2,
      "name": "Level 2: Final Director Sign-off",
      "approverUnits": [
        { "id": "u-2-1", "label": "Direktur Approval", "type": "ROLE_DIVISION" }
      ]
    }
  ],
  "approvals": [
    {
      "stepOrder": 1,
      "unitId": "u-1-1",
      "action": "APPROVED",
      "assignedApprover": { "username": "manager_it", "fullName": "Irwan Manager IT" }
    },
    {
      "stepOrder": 1,
      "unitId": "u-1-2",
      "action": "APPROVED",
      "assignedApprover": { "username": "staff_fin", "fullName": "Siti Staff Finance" }
    },
    {
      "stepOrder": 1,
      "unitId": "u-1-2",
      "action": "APPROVED",
      "notes": "Completed via approval by staff_fin",
      "assignedApprover": { "username": "manager_fin", "fullName": "Farida Manager Finance" }
    },
    {
      "stepOrder": 2,
      "unitId": "u-2-1",
      "action": "PENDING",
      "assignedApprover": { "username": "direktur", "fullName": "Bambang Direktur Utama" }
    }
  ]
}
```

#### 💡 How to Interpret the API Structure:
- **`currentStepOrder`**: Indicates the stage currently requiring approval (e.g. `1` means Level 1 is active).
- **`approvals[]`**: Contains the individual approval records for each assigned approver.
  - `action = "PENDING"`: Awaiting decision.
  - `action = "APPROVED"`: Approved by that user.
  - `action = "REJECTED"`: Task has been rejected.
  - `action = "REVISION"`: Task has been returned for revision.

---

### 4. Executing an Approval Decision via API
To approve or reject a task programmatically from an external system:
```http
POST /api/tasks/2cd513e3-5065-4c83-bef0-91a342c46a3d/approval HTTP/1.1
Host: localhost:3000
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "decision": "APPROVED",
  "notes": "Approved via ERP integration"
}
```

---

## 🧪 Automated Unit Testing & Quality Assurance

The test suite covers 100% of domain modules with **33 automated unit test cases**.

```bash
cd backend
npm test
```

### Output:
```
PASS src/modules/workflows/workflows.service.spec.ts
PASS src/modules/users/users.service.spec.ts
PASS src/modules/auth/auth.service.spec.ts
PASS src/modules/tasks/tasks.service.spec.ts
PASS src/common/crypto-helper.spec.ts

Test Suites: 5 passed, 5 total
Tests:       33 passed, 33 total
Snapshots:   0 total
```
