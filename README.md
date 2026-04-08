# MS Secret Manager

A centralized Azure secrets, keys, and certificate lifecycle management platform. Automatically discovers and monitors expiring credentials across Azure Key Vaults, Entra ID App Registrations, and Enterprise Applications — with automated certificate issuance (ACME) and SAML certificate rotation built in.

---

## Table of Contents

- [Why This Tool Exists](#why-this-tool-exists)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Security Model](#security-model)
- [Use Cases](#use-cases)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Quick Setup](#quick-setup)
  - [Setup Wizard (First-Time Configuration)](#setup-wizard-first-time-configuration)
  - [Environment Configuration](#environment-configuration)
  - [Running Locally](#running-locally)
  - [Running with Docker](#running-with-docker)
- [Deployment to Azure](#deployment-to-azure)
- [API Reference](#api-reference)
- [Feature Deep Dives](#feature-deep-dives)
  - [Setup Wizard and Dual-Mode Storage](#setup-wizard-and-dual-mode-storage)
  - [Automated Secret Scanning](#automated-secret-scanning)
  - [ACME Certificate Management](#acme-certificate-management)
  - [SAML Certificate Auto-Rotation](#saml-certificate-auto-rotation)
  - [Real-Time Event Grid Integration](#real-time-event-grid-integration)
  - [Event Grid Configuration Page](#event-grid-configuration-page)
  - [Multi-Channel Notifications](#multi-channel-notifications)
  - [Export and Reporting](#export-and-reporting)
  - [Acknowledgment and Snooze Workflow](#acknowledgment-and-snooze-workflow)
  - [Key Vault Tag Write-Back](#key-vault-tag-write-back)
- [Security Improvements Over Manual Processes](#security-improvements-over-manual-processes)
- [Advantages](#advantages)
- [Future Work](#future-work)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## Why This Tool Exists

Organizations running on Azure accumulate hundreds of secrets, keys, and certificates across Key Vaults, App Registrations, and Enterprise Applications. When these credentials expire unnoticed, the results are service outages, broken SSO flows, and failed API integrations — often at the worst possible time.

Manual tracking via spreadsheets or calendar reminders does not scale. This tool provides:

- **Automated discovery** — scans every subscription, vault, and Entra ID app on a schedule
- **Centralized visibility** — one dashboard showing every credential's expiration status
- **Proactive alerting** — notifications before things break, not after
- **Automated remediation** — ACME certificate issuance and SAML certificate rotation without human intervention

---

## Key Features

| Feature | Description |
|---|---|
| **Setup Wizard** | Guided first-time configuration — choose between Azure Cosmos DB or fully local storage, configure Azure identity, and start using the app with no manual .env editing required |
| **Dual-Mode Storage** | Run with Azure Cosmos DB for production or with local JSON file storage for development and evaluation — same query interface, zero cloud dependency in local mode |
| **Multi-Source Scanning** | Discovers secrets, keys, and certificates from Azure Key Vaults, App Registrations (client secrets + certificates), and Enterprise Applications (SAML signing certs) |
| **Configurable Expiration Tiers** | Define custom thresholds (critical, warning, notice) with configurable day ranges |
| **ACME Certificate Lifecycle** | Issue, renew, and revoke TLS certificates via Let's Encrypt or any ACME CA, with DNS-01 validation across Azure DNS, Cloudflare, and Route 53 |
| **SAML Certificate Auto-Rotation** | Staged dual-certificate rollover for Entra ID enterprise apps via Microsoft Graph API |
| **Real-Time Updates** | Azure Event Grid webhooks for instant detection of Key Vault changes (new versions, near-expiry, expired) |
| **Event Grid Configuration Page** | Interactive setup guide with auto-detected webhook URL, Azure CLI commands, Bicep snippets, and endpoint verification |
| **Multi-Channel Notifications** | Email, Microsoft Teams, Slack, and custom webhooks |
| **RBAC with Entra ID** | Role-based access control using Entra ID App Roles with granular per-action permissions |
| **Export** | CSV and PDF reports with server-side filtering and color-coded status |
| **Acknowledge/Snooze** | Mark items as acknowledged or snooze notifications for a configurable period |
| **Tag Write-Back** | Write expiration metadata back to Key Vault items as tags, visible directly in the Azure Portal |
| **Scheduled Jobs** | Configurable cron-based scanning, certificate renewal, SAML rotation, and data purge |
| **OpenTelemetry** | Distributed tracing with Azure Monitor Application Insights and OTLP export |
| **Sovereign Cloud Support** | Works with AzureCloud, AzureChinaCloud, and AzureUSGovernment |

---

## Architecture

```
                         +-----------------------+
                         |     Frontend (SPA)    |
                         |  React + MUI + Vite   |
                         |  MSAL.js Auth (Entra) |
                         |  Setup Wizard (first  |
                         |    run, no auth)      |
                         +---------+-------------+
                                   |
                            Bearer Token (JWT)
                           (or unauthenticated
                            for setup wizard)
                                   |
                         +---------v-------------+
                         |   Backend (FastAPI)    |
                         |   Python 3.12 Async   |
                         +---------+-------------+
                                   |
           +-------+-------+------+------+-------+-------+
           |       |       |      |      |       |       |
           v       v       v      v      v       v       v
     +----------+ +------+ +----+ +----+ +-----+ +-----+ +-------+
     | Storage  | |Graph | |Key | |ACME| |Event| |Notif| |  DNS  |
     | Layer    | | API  | |Vault| | CA | |Grid | |icate| |Provid.|
     +----+-----+ +------+ +----+ +----+ +-----+ +-----+ +-------+
          |            |       |                      |
     +----+-----+  App Regs  KV Secrets        Email/Teams/
     |          |  Ent Apps  KV Keys            Slack/Webhook
     v          v  SAML Certs KV Certs
  +------+  +------+
  |Cosmos|  |Local |
  |  DB  |  |JSON  |
  +------+  |Store |
            +------+
     (set via STORAGE_MODE
      env var or setup wizard)
```

### Data Flow

1. **Scheduled scan** (APScheduler cron) triggers `ScanOrchestrator`
2. Orchestrator concurrently scans:
   - All Azure subscriptions for Key Vaults (secrets, keys, certificates)
   - Entra ID App Registrations (client secrets + certificates)
   - Entra ID Enterprise Applications (SAML signing/verification certs)
3. Each item gets an expiration status computed against configurable thresholds
4. Items are upserted into Cosmos DB `items` container
5. Notification engine evaluates results and sends alerts on expired/critical items
6. Between scans, Event Grid pushes real-time Key Vault changes via webhook
7. ACME orchestrator checks and renews TLS certificates on its own cron schedule
8. SAML rotation orchestrator processes certificate rollover state machine on its own schedule

### Storage Schema

The app uses three containers, available in both Cosmos DB and local JSON file modes:

| Container | Partition Key | Purpose |
|---|---|---|
| `items` | `/partitionKey` | All scanned items (secrets, keys, certs, app credentials, SAML rotation jobs) |
| `settings` | `/settingType` | Configuration (thresholds, notifications, schedule, SAML rotation, app_config) |
| `scan_history` | `/status` | Scan run records with 90-day TTL auto-expiry (Cosmos only) |

**Cosmos DB mode** (`STORAGE_MODE=cosmos`): Azure Cosmos DB NoSQL API with serverless billing. Containers are auto-created on first run.

**Local mode** (`STORAGE_MODE=local`): Each container is stored as a JSON file under the data directory (default `./data`). A `LocalContainerProxy` class implements the same async interface as the Cosmos SDK, including a mini SQL engine that supports `SELECT`, `WHERE`, `AND`, `ORDER BY`, `OFFSET/LIMIT`, `TOP`, `COUNT`, `GROUP BY`, `DISTINCT`, and `CONTAINS(LOWER(...))`.

---

## Tech Stack

### Backend

| Component | Technology |
|---|---|
| Framework | FastAPI 0.115 with async/await throughout |
| Runtime | Python 3.12 |
| Azure SDKs | `azure-identity`, `azure-cosmos`, `azure-keyvault-*`, `azure-mgmt-*`, `msgraph-sdk` |
| ACME | `acme` + `josepy` libraries (RFC 8555 compliant) |
| Auth | `python-jose` for JWT validation against Entra ID JWKS |
| HTTP Client | `httpx` (async) for Graph API and webhook calls |
| Scheduler | APScheduler 3 (AsyncIOScheduler + CronTrigger) |
| DNS | `dnspython` for propagation checks |
| Export | `openpyxl` (Excel), `reportlab` (PDF) |
| Telemetry | OpenTelemetry SDK + Azure Monitor exporter |
| Testing | pytest + pytest-asyncio |

### Frontend

| Component | Technology |
|---|---|
| Framework | React 18 with TypeScript |
| Build Tool | Vite 5 |
| UI Library | Material UI 5 (MUI) |
| Data Fetching | TanStack React Query 5 |
| Auth | MSAL.js 3 (`@azure/msal-browser` + `@azure/msal-react`) |
| Routing | React Router 6 |
| Charts | Recharts 2 |
| HTTP Client | Axios |

### Infrastructure

| Component | Technology |
|---|---|
| Database | Azure Cosmos DB (serverless, NoSQL API) or local JSON file store (no cloud dependency) |
| IaC | Bicep modules for Cosmos DB, Container Instances, Event Grid |
| Containerization | Docker with multi-stage builds, Nginx for frontend |
| Orchestration | Docker Compose (production + dev overrides) |
| Identity | User-assigned Managed Identity for Azure service auth |

---

## Security Model

### Authentication

- **Frontend**: MSAL.js performs OAuth 2.0 authorization code flow with PKCE against Entra ID. Access tokens are acquired silently and sent as Bearer tokens to the backend.
- **Backend**: Every API request is validated by decoding the JWT, verifying the signature against Entra ID's JWKS endpoint, checking the audience matches the app registration, and confirming the issuer matches the tenant. JWKS keys are cached for 1 hour.
- **Service-to-Azure**: The backend authenticates to Azure services (Key Vault, Graph API, Cosmos DB) using `DefaultAzureCredential`, which supports managed identity in production and client secret/CLI credentials in development.

### Authorization (RBAC)

The system implements a layered permission model mapped from Entra ID App Roles:

| Role | Permissions |
|---|---|
| **Admin** | All permissions (implicit grant of every `Permission` enum value) |
| **Viewer** | Read-only access + data export |

Granular per-action permissions that can be assigned as individual App Roles:

| Permission | Scope |
|---|---|
| `SecretManager.TriggerScan` | Initiate on-demand scans |
| `SecretManager.ManageSettings` | Modify thresholds, schedules, notifications |
| `SecretManager.IssueCertificate` | Issue ACME certificates |
| `SecretManager.RenewCertificate` | Renew ACME certificates |
| `SecretManager.RevokeCertificate` | Revoke ACME certificates |
| `SecretManager.AcknowledgeItem` | Acknowledge/snooze expiring items |
| `SecretManager.ExportData` | Export CSV/PDF reports |
| `SecretManager.ManageDns` | View DNS zones and providers |
| `SecretManager.RotateSamlCertificate` | Initiate/activate/cancel SAML rotations |

### How the Tool is Secure

1. **Zero secrets in code** — All credentials are loaded from environment variables via `pydantic-settings`. The `.env` file is gitignored. Cosmos DB keys, client secrets, and webhook URLs are never hardcoded.

2. **Token validation on every request** — No endpoint (except `/api/health` and `/api/setup/*`) is accessible without a valid, signed JWT from your Entra ID tenant. Token validation checks signature (RS256), audience, and issuer. Setup endpoints are only accessible before the app is fully configured and are automatically locked once initialization completes.

3. **Least-privilege RBAC** — Viewers cannot trigger scans, modify settings, or perform write operations. Individual permissions can be assigned at the App Role level without granting full Admin access.

4. **Managed Identity in production** — When deployed to Azure, the backend uses a user-assigned managed identity. No client secrets need to be stored or rotated for Azure service authentication.

5. **Parameterized Cosmos queries** — All user-supplied filter values are passed as parameters (`@param`), preventing NoSQL injection.

6. **CORS lockdown** — Only `localhost:3000` and `localhost:5173` are allowed in development. In production, configure the CORS origin list to match your deployment domain.

7. **Event Grid validation** — The webhook endpoint validates Event Grid subscription handshakes before processing events, preventing unauthorized event injection.

8. **Retry with backoff and jitter** — All Azure API calls use exponential backoff with jitter, preventing thundering herd problems and respecting API throttling limits.

9. **Concurrency-limited scanning** — A semaphore (default 10) limits parallel Azure API calls during scans, preventing rate limit violations.

10. **Scan history auto-purge** — Cosmos DB TTL (90 days) automatically deletes old scan records, reducing data accumulation risk.

11. **SAML rotation safety defaults** — Auto-activation is disabled by default. Rotations require manual admin approval to prevent accidental breakage of SP trust configurations. A 14-day grace period allows SP owners to update their trust.

12. **ACME DNS cleanup** — DNS TXT records created for ACME challenges are always cleaned up in a `finally` block, even on failure.

13. **Sovereign cloud support** — Authority URLs, resource manager endpoints, and Key Vault suffixes are resolved per-environment, ensuring compliance with data residency requirements.

---

## Use Cases

### 1. Preventing Secret Expiration Outages
An organization has 200+ Key Vaults across 15 subscriptions. Client secrets and certificates expire unpredictably. MS Secret Manager scans all subscriptions nightly, identifies items within configurable thresholds (e.g., 7 days critical, 30 days warning), and sends alerts to Teams and email before anything breaks.

### 2. Automated TLS Certificate Management
A team manages 50+ domains with TLS certificates stored in Key Vault. Instead of manually requesting and uploading certificates, they configure ACME with Let's Encrypt and DNS-01 validation via Azure DNS. Certificates auto-renew 30 days before expiry with no human intervention.

### 3. SAML Certificate Rotation at Scale
An identity team manages 100+ enterprise applications with SAML SSO. When signing certificates approach expiration, the tool automatically stages a new certificate, notifies SP owners to update their trust configuration via the federation metadata URL, and activates the new cert after a grace period — without downtime.

### 4. Compliance Reporting
A security team needs monthly reports of all expiring/expired credentials for audit. They use the CSV/PDF export with status filters to generate color-coded reports showing the complete credential landscape.

### 5. Decentralized Ownership with Centralized Visibility
Key Vault tags (`sm-status`, `sm-days`, `sm-scanned`) are written back to items, so app teams can see expiration status directly in the Azure Portal without needing access to this tool.

### 6. Real-Time Incident Response
When a Key Vault secret is rotated or expires, Event Grid triggers an immediate update in the system — no need to wait for the next scheduled scan.

### 7. Quick Evaluation Without Azure
A team wants to evaluate the tool before provisioning Azure resources. They clone the repo, run `docker-compose up`, and the setup wizard lets them choose "Run Locally". The app starts with JSON file storage — no Cosmos DB, no Azure subscription needed. When ready for production, they re-run the wizard or set `STORAGE_MODE=cosmos` in their `.env`.

---

## Getting Started

### Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Python | 3.12+ | Backend runtime |
| Node.js | 20+ | Frontend build and dev server |
| Docker | Latest | Containerized deployment |
| Azure CLI | Latest | (Optional) Azure resource management |

**Azure Resources (for cloud mode):**
- Entra ID tenant with an App Registration
- Azure Cosmos DB account (serverless recommended) — *not required if using local storage mode*
- (Optional) Azure Key Vault for ACME certificate storage
- (Optional) Azure Event Grid for real-time updates

**No Azure resources required for local mode** — the app can run entirely offline with JSON file storage for evaluation and development.

### Quick Setup

```bash
# Clone the repository
git clone https://github.com/your-org/MS-Secret-Manager.git
cd MS-Secret-Manager

# Run the setup script (creates venv, installs deps, copies .env files)
./setup.sh        # Linux/macOS/WSL
# or
.\setup.ps1       # Windows PowerShell
```

After starting the app, open it in your browser. If no `.env` file is present (or configuration is incomplete), the **Setup Wizard** will launch automatically — no manual environment file editing is required. See [Setup Wizard](#setup-wizard-first-time-configuration) for details.

### Setup Wizard (First-Time Configuration)

When you launch the app for the first time without a `.env` file (or with an unconfigured instance), the frontend automatically detects that the app is not yet initialized and presents a guided setup wizard instead of the login page.

**Step 1 — Choose Storage Mode:**
- **Azure Cosmos DB** — Production-ready cloud storage. You'll provide connection details in the next step.
- **Run Locally** — Zero cloud dependency. Data is stored as JSON files in the `./data` directory. Ideal for evaluation, development, or air-gapped environments.

**Step 2 — Cosmos DB Connection** *(skipped in local mode)*:
- Enter your Cosmos DB endpoint, key, and database name
- Toggle "Use Cosmos DB Emulator" to auto-fill emulator credentials for local development
- Toggle "Use Managed Identity" for Azure-hosted deployments
- **Test Connection** button validates connectivity before proceeding

**Step 3 — Azure / Entra ID Configuration:**
- Tenant ID, Client ID, Client Secret (for local dev)
- Azure environment (AzureCloud, AzureChinaCloud, AzureUSGovernment)
- Optional: Managed Identity Client ID, MSAL Client ID

**Step 4 — Review & Apply:**
- Summary of all configuration
- **Initialize Now** — Writes config to the database (or local store), starts the scheduler, and reloads the app into normal mode
- **Generate .env File** — Downloads a complete `.env` file for manual deployment, useful for Docker or CI/CD pipelines

After initialization, the setup endpoints are locked and the app redirects to the normal authentication flow.

### Environment Configuration

Copy `.env.example` to `.env` and fill in the required values (alternatively, use the [Setup Wizard](#setup-wizard-first-time-configuration) for guided configuration):

```bash
# Storage Mode — "cosmos" (Azure Cosmos DB) or "local" (JSON files, no cloud)
STORAGE_MODE=cosmos
# LOCAL_DATA_DIR=./data                          # Only used when STORAGE_MODE=local

# Required — Azure / Entra ID
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-app-registration-client-id
AZURE_CLIENT_SECRET=your-client-secret          # Local dev only; use managed identity in production

# Required (cosmos mode only) — Cosmos DB
COSMOS_ENDPOINT=https://your-account.documents.azure.com:443/
COSMOS_KEY=your-cosmos-key
COSMOS_DATABASE=secret-manager

# Required — MSAL Token Validation
MSAL_CLIENT_ID=your-app-registration-client-id
MSAL_AUTHORITY=https://login.microsoftonline.com/your-tenant-id

# Optional — Notifications
TEAMS_WEBHOOK_URL=https://outlook.office.com/webhook/...
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
NOTIFICATION_EMAIL_FROM=no-reply@yourcompany.com

# Optional — ACME Certificates
ACME_ENABLED=false
ACME_KEY_VAULT_URL=https://your-cert-vault.vault.azure.net/
ACME_CONTACTS=admin@yourcompany.com

# Optional — SAML Rotation (requires Application.ReadWrite.All)
SAML_ROTATION_ENABLED=false

# Optional — Observability
APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=...
```

Copy `frontend/.env.example` to `frontend/.env`:

```bash
VITE_AZURE_CLIENT_ID=your-app-registration-client-id
VITE_AZURE_TENANT_ID=your-tenant-id
VITE_API_BASE_URL=http://localhost:8000
```

### Entra ID App Registration Setup

1. Register an application in Entra ID
2. Set the redirect URI to `http://localhost:3000` (or your deployment URL)
3. Create an API scope: `api://{client-id}/access_as_user`
4. Define App Roles: `Admin`, `Viewer` (and optionally granular permissions like `SecretManager.TriggerScan`)
5. Assign users to the appropriate roles
6. Grant API Permissions to the app registration:
   - `User.Read` (delegated) — basic sign-in
   - `Application.Read.All` (application) — scan app registrations
   - `Directory.Read.All` (application) — scan enterprise apps
   - `Application.ReadWrite.All` (application) — SAML certificate rotation (only if using SAML rotation feature)

### Running Locally

```bash
# Start both backend and frontend with hot reload
./start-local.sh        # Linux/macOS/WSL
# or
.\start-local.ps1       # Windows PowerShell
```

This starts:
- **Backend** at `http://localhost:8000` (uvicorn with --reload)
- **Frontend** at `http://localhost:3000` (Vite dev server)
- **API Docs** at `http://localhost:8000/docs` (Swagger UI)
- **Health Check** at `http://localhost:8000/api/health`

### Running with Docker

```bash
# Production mode
docker-compose up -d

# Development mode (hot reload, volume mounts)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# With Cosmos DB Emulator for fully local development
docker-compose --profile dev up

# Fully local (no Azure) — set STORAGE_MODE=local in .env or use the setup wizard
STORAGE_MODE=local docker-compose up -d
```

| Service | URL |
|---|---|
| Frontend | `http://localhost:3000` |
| Backend API | `http://localhost:8000` |
| API Docs | `http://localhost:8000/docs` |
| Cosmos Emulator | `https://localhost:8081` (with `--profile dev`) |

---

## Deployment to Azure

The project includes Bicep templates for one-command Azure deployment:

```bash
az deployment group create \
  --resource-group your-rg \
  --template-file infra/main.bicep \
  --parameters \
    baseName=secretmgr \
    tenantId=your-tenant-id \
    clientId=your-client-id \
    backendImage=yourregistry.azurecr.io/secret-manager-backend:latest \
    frontendImage=yourregistry.azurecr.io/secret-manager-frontend:latest
```

**What gets deployed:**
- Azure Cosmos DB (serverless, NoSQL API) with 3 containers and composite indexes
- Azure Container Instances with a user-assigned managed identity
- Event Grid system topic and subscription for Key Vault events

**Post-deployment steps:**
1. Assign the managed identity `Reader` access to target subscriptions (for Key Vault discovery)
2. Assign the managed identity `Key Vault Secrets User` / `Key Vault Reader` on each vault
3. Grant the managed identity `Application.Read.All` and `Directory.Read.All` in Graph API
4. Update the Entra ID app registration redirect URI to the container FQDN
5. Update CORS origins in `main.py` to match the production frontend URL

---

## API Reference

All endpoints require a valid Bearer token from Entra ID (except `/api/health` and `/api/setup/*`).

### Setup (Unauthenticated — only available before initialization)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/setup/status` | Check if the app is configured (storage ready, Azure configured, MSAL configured) |
| `GET` | `/api/setup/frontend-config` | Get MSAL client config for dynamic frontend auth initialization |
| `POST` | `/api/setup/validate-cosmos` | Test Cosmos DB connectivity with provided credentials |
| `POST` | `/api/setup/initialize` | Apply configuration, initialize storage, seed defaults, start scheduler |
| `POST` | `/api/setup/generate-env` | Generate a downloadable `.env` file from provided configuration |

These endpoints are protected by `_require_setup_mode()` — they return `403` once the app is fully configured, preventing reconfiguration through the API.

### Core Endpoints

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/api/health` | None | Health check |
| `GET` | `/api/dashboard/overview` | Viewer | Aggregated counts by status, source, type |
| `GET` | `/api/dashboard/timeline` | Viewer | Items with expiration dates for timeline view |

### Key Vault Items

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/api/keyvault-items` | Viewer | Paginated list with filters |

### App Registrations

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/api/app-registrations` | Viewer | Paginated list of app registration credentials |

### Enterprise Apps

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/api/enterprise-apps` | Viewer | Paginated list of enterprise app certificates |

### Scans

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/api/scans` | Viewer | Scan history |
| `POST` | `/api/scans/trigger` | TriggerScan | Trigger on-demand scan |

### ACME Certificates

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/api/certificates` | Viewer | List managed certificates |
| `POST` | `/api/certificates/issue` | IssueCertificate | Issue a new certificate |
| `POST` | `/api/certificates/renew` | RenewCertificate | Renew a certificate |
| `POST` | `/api/certificates/revoke` | RevokeCertificate | Revoke a certificate |

### SAML Rotation

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/api/saml-rotation` | RotateSamlCertificate | List rotation jobs (filter by status, sp_id) |
| `GET` | `/api/saml-rotation/eligible` | RotateSamlCertificate | List apps eligible for rotation |
| `GET` | `/api/saml-rotation/{id}` | RotateSamlCertificate | Get rotation job details |
| `POST` | `/api/saml-rotation/initiate` | RotateSamlCertificate | Initiate rotation for a service principal |
| `POST` | `/api/saml-rotation/activate` | RotateSamlCertificate | Activate a staged rotation |
| `POST` | `/api/saml-rotation/cancel` | RotateSamlCertificate | Cancel an in-progress rotation |
| `POST` | `/api/saml-rotation/run-cycle` | RotateSamlCertificate | Run full rotation cycle |

### Settings

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/api/settings` | ManageSettings | All settings |
| `PUT` | `/api/settings/thresholds` | ManageSettings | Update expiration thresholds |
| `PUT` | `/api/settings/notifications` | ManageSettings | Update notification config |
| `PUT` | `/api/settings/schedule` | ManageSettings | Update scan schedule |
| `GET` | `/api/settings/saml-rotation` | ManageSettings | SAML rotation settings |
| `PUT` | `/api/settings/saml-rotation` | ManageSettings | Update SAML rotation settings |

### Export

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/api/export/csv` | ExportData | Export items as CSV |
| `GET` | `/api/export/pdf` | ExportData | Export items as PDF |

### Acknowledgment

| Method | Path | Permission | Description |
|---|---|---|---|
| `POST` | `/api/acknowledge` | AcknowledgeItem | Acknowledge an expiring item |
| `POST` | `/api/acknowledge/snooze` | AcknowledgeItem | Snooze notifications for an item |
| `DELETE` | `/api/acknowledge/{id}` | AcknowledgeItem | Remove acknowledgment |

### Webhooks

| Method | Path | Permission | Description |
|---|---|---|---|
| `POST` | `/api/webhooks/eventgrid` | None (validated) | Event Grid webhook receiver |

---

## Feature Deep Dives

### Setup Wizard and Dual-Mode Storage

The app supports two storage backends, selectable at startup via the setup wizard or the `STORAGE_MODE` environment variable:

**Cosmos DB Mode** (`STORAGE_MODE=cosmos`)
- Production-ready Azure Cosmos DB NoSQL API
- Containers are auto-created on first run with appropriate partition keys
- Supports Cosmos DB Emulator for local development without an Azure account
- Managed Identity authentication for Azure-hosted deployments

**Local Mode** (`STORAGE_MODE=local`)
- Zero cloud dependency — all data stored as JSON files in `LOCAL_DATA_DIR` (default: `./data`)
- `LocalContainerProxy` implements the same async interface as the Cosmos DB SDK (`create_item`, `upsert_item`, `read_item`, `delete_item`, `query_items`)
- Built-in mini SQL engine parses the Cosmos SQL dialect used throughout the codebase
- Atomic writes via temp file + `os.replace` to prevent data corruption
- Ideal for evaluation, demos, development, and air-gapped environments

**How the setup wizard works:**

1. On first load, the frontend calls `GET /api/setup/status` (unauthenticated)
2. If the app is not configured, the frontend renders `SetupWizardPage` instead of the login flow
3. The wizard collects storage mode, connection details, and Azure identity configuration
4. On "Initialize Now", the frontend `POST`s to `/api/setup/initialize` which:
   - Updates the in-memory settings singleton
   - Initializes the storage layer (Cosmos DB or local)
   - Seeds default settings (thresholds, notifications, schedule)
   - Stores an `app_config` document in the settings container
   - Starts the scheduler
5. The frontend reloads, MSAL fetches its config from `/api/setup/frontend-config`, and the normal auth flow begins
6. Setup endpoints are locked after initialization — `_require_setup_mode()` returns `403`

**Dynamic MSAL Configuration:**
The frontend does not require `VITE_AZURE_CLIENT_ID` or `VITE_AZURE_TENANT_ID` to be set at build time. If these environment variables are absent, the `AuthProvider` fetches the MSAL configuration at runtime from the backend's `/api/setup/frontend-config` endpoint, which reads from the stored `app_config` document. This allows the frontend to be built once and deployed anywhere.

### Automated Secret Scanning

The scanner runs on a configurable cron schedule (default: daily at 6 AM) and performs:

1. **Subscription enumeration** — Discovers all accessible Azure subscriptions (with optional filter)
2. **Key Vault scanning** — For each subscription, lists all Key Vaults and reads all secrets, keys, and certificates with their expiration dates
3. **App Registration scanning** — Via Microsoft Graph API, reads all app registrations and their client secrets + certificates
4. **Enterprise App scanning** — Reads all service principals and their SAML signing/verification certificates
5. **Expiration computation** — Each item gets classified (expired, critical, warning, notice, healthy) against configurable tiers
6. **Upsert to Cosmos DB** — All items are upserted in batches for efficient writes
7. **Notification evaluation** — Expired and critical items trigger multi-channel alerts

The scanner uses a semaphore (limit: 10) to prevent Azure API throttling across concurrent subscription scans.

### ACME Certificate Management

Full RFC 8555 ACME certificate lifecycle management:

- **Issue** — Request a TLS certificate for one or more domains via DNS-01 challenge
- **Renew** — Automatically renew certificates within a configurable window (default: 30 days before expiry)
- **Revoke** — Revoke compromised certificates with RFC 5280 reason codes
- **Store** — Certificates and private keys are stored in Azure Key Vault with metadata tags

**Supported DNS Providers for DNS-01 validation:**

| Provider | Authentication |
|---|---|
| Azure DNS | Subscription ID + managed identity |
| Cloudflare | API token |
| AWS Route 53 | Access key + secret key |

The provider is auto-detected based on which zone hosts the domain, or can be explicitly specified. DNS TXT records are always cleaned up after validation, even on error.

**Supported ACME CAs:**
- Let's Encrypt (production and staging)
- Any RFC 8555 compliant CA (ZeroSSL, Google Trust Services, etc.)
- External Account Binding (EAB) supported for CAs that require it

### SAML Certificate Auto-Rotation

Automates the Entra ID SAML signing certificate lifecycle using a staged dual-certificate rollover pattern:

```
[Eligible] --> [Staged] --> [Notified] --> [Activated] --> [Completed]
                  |             |
                  +---> [Cancelled]
                  |             |
                  +-------> [Failed]
```

**How it works:**

1. **Evaluate** — Identifies enterprise apps with SAML certs expiring within `triggerDays` (default: 60)
2. **Stage** — Calls `POST /servicePrincipals/{id}/addTokenSigningCertificate` to generate a new self-signed cert as inactive. The new cert immediately appears in the federation metadata XML alongside the old cert.
3. **Notify** — After a configurable delay, notifies SP owners to update their trust configuration from the federation metadata URL
4. **Activate** — After the grace period (default: 14 days), sets the new cert as `preferredTokenSigningKeyThumbprint`. Can be manual (default) or automatic.
5. **Complete** — After the cleanup grace period (default: 7 days), removes the old certificate via Graph API

**Safety features:**
- Only one active rotation per service principal
- Auto-activation is disabled by default (requires manual admin approval)
- Excluded service principals list for apps that should never be auto-rotated
- Metadata-refresh-capable SP list for apps that auto-trust from federation metadata

### Real-Time Event Grid Integration

Azure Event Grid delivers Key Vault events to the system via webhook. Supported events:

| Event Type | Trigger |
|---|---|
| `SecretNewVersionCreated` | A new secret version is created |
| `SecretNearExpiry` | A secret is approaching expiration |
| `SecretExpired` | A secret has expired |
| `KeyNewVersionCreated` | A new key version is created |
| `KeyNearExpiry` | A key is approaching expiration |
| `KeyExpired` | A key has expired |
| `CertificateNewVersionCreated` | A new certificate version is created |
| `CertificateNearExpiry` | A certificate is approaching expiration |
| `CertificateExpired` | A certificate has expired |

When an event arrives, the system fetches the updated item directly from Key Vault, recomputes its expiration status, and upserts it into Cosmos DB — providing near-instant updates between scheduled scans.

### Event Grid Configuration Page

The app includes an interactive Event Grid setup guide accessible from the sidebar (Admin only). This page helps administrators configure Azure Event Grid to send Key Vault events to the application.

**Auto-detected webhook URL:** The page automatically detects the browser's current origin (e.g., `https://secretmgr.azurewebsites.net`) and appends `/api/webhooks/eventgrid` to generate the correct webhook endpoint URL. This eliminates manual URL construction errors.

**Features:**
- **Verify Endpoint** button — Sends a mock Event Grid subscription validation event to confirm the webhook is reachable and responding correctly
- **Step-by-step guide** — 5-step interactive MUI Stepper walking through prerequisites, Azure Portal navigation, Event Grid configuration, endpoint setup, and verification
- **Azure CLI commands** — Ready-to-run CLI commands with the webhook URL pre-filled
- **Bicep snippets** — Infrastructure-as-code templates for automated deployment
- **Supported Event Types** — Visual reference of all 9 supported Key Vault events, color-coded by category (secrets, keys, certificates)
- **How It Works** — Flow diagram explaining the event processing pipeline
- **Retry Policy** — Information about Event Grid's built-in retry behavior

### Multi-Channel Notifications

The notification engine evaluates scan results and sends alerts through multiple channels:

| Channel | Configuration | Format |
|---|---|---|
| **Email** | SMTP from address + recipient list | HTML email with item summary tables |
| **Microsoft Teams** | Incoming webhook URL | Adaptive Card with status breakdown |
| **Slack** | Incoming webhook URL | Block Kit message with status breakdown |
| **Generic Webhook** | Custom URL + custom headers | JSON payload with expired/critical/warning arrays |

Notifications are triggered only when expired or critical items are found. Acknowledged and snoozed items are excluded.

### Export and Reporting

Generate compliance reports in two formats:

- **CSV** — Full data export with all columns, filterable by source, status, subscription, and search term
- **PDF** — Formatted landscape report with color-coded status cells (red for expired, orange for critical, yellow for warning), configurable title, and generation timestamp

Maximum export size is configurable (default: 10,000 items).

### Acknowledgment and Snooze Workflow

For items that are known-acceptable (e.g., intentionally long-lived secrets, or items with a planned rotation):

- **Acknowledge** — Mark an item as reviewed with a note and the reviewer's identity. Acknowledged items are visually distinguished in the dashboard and excluded from notifications.
- **Snooze** — Suppress notifications for a configurable number of days (default: 30). The item remains visible but won't trigger alerts until the snooze period expires.
- **Unacknowledge** — Remove the acknowledgment to resume normal alerting.

### Key Vault Tag Write-Back

After scanning, the system can write expiration metadata back to Key Vault items as Azure resource tags:

| Tag | Example Value | Purpose |
|---|---|---|
| `sm-status` | `critical` | Expiration status tier |
| `sm-days` | `12` | Days until expiration |
| `sm-scanned` | `2026-04-08` | Date of last scan |

These tags are visible directly in the Azure Portal, Azure Resource Graph queries, and Azure Policy evaluations — enabling decentralized ownership without centralizing all access through this tool.

---

## Security Improvements Over Manual Processes

| Manual Process | MS Secret Manager |
|---|---|
| Spreadsheets tracking expiration dates | Automated discovery across all subscriptions and Entra ID |
| Calendar reminders for renewals | Proactive multi-channel alerts with configurable thresholds |
| Copy-pasting certificates between portals | ACME auto-issuance + Key Vault storage |
| Emailing SP owners to update SAML trust | Staged rotation with automated notifications and federation metadata |
| Periodic manual audits | Continuous scheduled scanning + real-time Event Grid |
| One admin with all the keys | RBAC with granular permissions mapped to Entra ID App Roles |
| No visibility into credential landscape | Centralized dashboard with status breakdown by source, type, and tier |
| Post-incident detection of expired creds | Pre-expiration detection at 90/30/7 day thresholds (configurable) |

---

## Advantages

- **Full Azure-native integration** — Uses Azure Identity, Key Vault, Graph API, Cosmos DB, Event Grid, and Managed Identity natively. No third-party secret stores or non-Azure dependencies.

- **Async-first architecture** — Backend is fully async (FastAPI + asyncio + httpx), enabling high-throughput scanning across hundreds of subscriptions and vaults without blocking.

- **Modular service design** — Scanner, notification, ACME, SAML rotation, and export are independent service modules. Enable only what you need.

- **Zero-config local mode** — Run the entire app with no Azure dependency using local JSON file storage. Switch to Cosmos DB when ready for production — the same query interface works with both backends.

- **Guided setup** — First-time setup wizard handles storage selection, Azure identity configuration, and Cosmos DB connectivity testing. No manual `.env` editing required.

- **Serverless-friendly data layer** — Cosmos DB serverless mode means you pay only for what you consume. No provisioned throughput to manage.

- **Multi-cloud DNS** — ACME certificate validation works across Azure DNS, Cloudflare, and AWS Route 53, supporting hybrid and multi-cloud organizations.

- **Sovereign cloud ready** — Full support for AzureCloud, AzureChinaCloud, and AzureUSGovernment with environment-aware endpoint resolution.

- **Developer experience** — Hot reload in development, Docker Compose for one-command startup, setup scripts for both bash and PowerShell, Swagger UI for API exploration.

- **Production observability** — OpenTelemetry instrumentation with dual export to Azure Monitor (Application Insights) and any OTLP-compatible backend (Grafana, Jaeger, etc.).

---

## Future Work

- **Azure DevOps / GitHub Actions CI/CD pipeline** — Automated build, test, and deploy on push
- **Unit and integration tests** — Test coverage for scanner orchestrator, ACME lifecycle, SAML rotation state machine, and notification engine
- **Azure Key Vault RBAC mode support** — Support Key Vaults using RBAC authorization in addition to access policies
- **Managed certificate auto-rotation for App Registrations** — Extend the SAML rotation pattern to automatically rotate App Registration client secrets and certificates
- **Custom alerting rules** — User-defined rules for per-vault or per-app alerting (e.g., "alert immediately if any certificate in production-vault expires within 90 days")
- **Audit log** — Track all administrative actions (scans triggered, settings changed, certificates issued, rotations activated) with user attribution
- **Multi-tenant support** — Manage secrets across multiple Entra ID tenants from a single deployment
- **Azure Policy integration** — Publish a custom policy definition that flags Key Vault items without `sm-status` tags
- **Bulk operations** — Acknowledge, snooze, or export items in batch from the UI
- **Dashboard customization** — Configurable dashboard widgets and saved filter views
- **Certificate chain validation** — Verify certificate chain integrity and trust anchors during scans
- **Integration with ServiceNow/Jira** — Auto-create tickets for expiring credentials

---

## Project Structure

```
MS-Secret-Manager/
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py                          # FastAPI app, lifespan, middleware
│   │   ├── config.py                        # pydantic-settings configuration
│   │   ├── auth/
│   │   │   ├── dependencies.py              # FastAPI auth dependencies
│   │   │   ├── msal_validator.py            # JWT validation against Entra ID JWKS
│   │   │   └── rbac.py                      # Roles, permissions, RBAC definitions
│   │   ├── db/
│   │   │   ├── cosmos_client.py             # Dual-mode storage init (Cosmos DB or local)
│   │   │   ├── local_store.py               # Local JSON file store + mini SQL engine
│   │   │   ├── containers.py                # Container references
│   │   │   └── queries.py                   # Parameterized query helpers
│   │   ├── models/
│   │   │   ├── common.py                    # Shared enums (ExpirationStatus, ItemType)
│   │   │   ├── user.py                      # UserInfo model
│   │   │   ├── keyvault_item.py             # Key Vault item model
│   │   │   ├── app_registration.py          # App registration credential model
│   │   │   ├── enterprise_app.py            # Enterprise app certificate model
│   │   │   ├── saml_rotation.py             # SAML rotation job model + state machine
│   │   │   ├── scan.py                      # Scan run model
│   │   │   └── settings.py                  # Settings model
│   │   ├── routers/
│   │   │   ├── setup.py                     # Setup wizard API (unauthenticated, pre-init only)
│   │   │   ├── health.py                    # Health check endpoint
│   │   │   ├── dashboard.py                 # Dashboard overview + timeline
│   │   │   ├── keyvault_items.py            # Key Vault items CRUD
│   │   │   ├── app_registrations.py         # App registration items
│   │   │   ├── enterprise_apps.py           # Enterprise app items
│   │   │   ├── scans.py                     # Scan history + trigger
│   │   │   ├── certificates.py              # ACME certificate lifecycle
│   │   │   ├── saml_rotation.py             # SAML rotation endpoints
│   │   │   ├── settings.py                  # Settings management
│   │   │   ├── export.py                    # CSV/PDF export
│   │   │   ├── acknowledgment.py            # Acknowledge/snooze items
│   │   │   ├── dns_zones.py                 # DNS zone listing
│   │   │   └── webhooks.py                  # Event Grid webhook receiver
│   │   ├── services/
│   │   │   ├── scheduler.py                 # APScheduler cron job management
│   │   │   ├── expiration.py                # Expiration status computation
│   │   │   ├── export.py                    # CSV/PDF report generation
│   │   │   ├── acknowledgment.py            # Acknowledgment/snooze logic
│   │   │   ├── tag_writeback.py             # Key Vault tag write-back
│   │   │   ├── purge.py                     # Scan history purge
│   │   │   ├── scanner/
│   │   │   │   ├── orchestrator.py          # Full scan orchestration
│   │   │   │   ├── subscription_scanner.py  # Azure subscription enumeration
│   │   │   │   ├── keyvault_scanner.py      # Key Vault item scanning
│   │   │   │   └── graph_scanner.py         # Graph API scanning (apps + SPs)
│   │   │   ├── notification/
│   │   │   │   ├── engine.py                # Notification evaluation engine
│   │   │   │   ├── email_sender.py          # Email notifications
│   │   │   │   ├── teams_sender.py          # Teams webhook notifications
│   │   │   │   ├── slack_sender.py          # Slack webhook notifications
│   │   │   │   └── webhook_sender.py        # Generic webhook notifications
│   │   │   ├── acme/
│   │   │   │   ├── client.py                # ACME protocol client (RFC 8555)
│   │   │   │   ├── orchestrator.py          # Certificate lifecycle orchestration
│   │   │   │   └── keyvault_store.py        # Key Vault certificate storage
│   │   │   ├── saml_rotation/
│   │   │   │   ├── graph_operations.py      # Graph API calls for SAML certs
│   │   │   │   ├── orchestrator.py          # Rotation state machine engine
│   │   │   │   └── notifier.py              # Rotation-specific notifications
│   │   │   ├── dns_providers/
│   │   │   │   ├── base.py                  # DNS provider abstract base class
│   │   │   │   ├── azure_dns.py             # Azure DNS provider
│   │   │   │   ├── cloudflare.py            # Cloudflare DNS provider
│   │   │   │   ├── route53.py               # AWS Route 53 DNS provider
│   │   │   │   └── registry.py              # Provider auto-detection
│   │   │   └── eventgrid/
│   │   │       ├── handler.py               # Event Grid event processing
│   │   │       └── validator.py             # Subscription validation
│   │   └── utils/
│   │       ├── azure_credential.py          # DefaultAzureCredential wrapper
│   │       ├── retry.py                     # Exponential backoff + jitter
│   │       ├── pagination.py                # Cosmos DB pagination helper
│   │       └── telemetry.py                 # OpenTelemetry setup
│   └── tests/
│       ├── conftest.py                      # Pytest fixtures
│       └── __init__.py
├── frontend/
│   ├── Dockerfile                           # Production build (multi-stage + nginx)
│   ├── Dockerfile.dev                       # Dev build (Vite dev server)
│   ├── nginx.conf                           # Nginx config with API proxy + SPA fallback
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── src/
│       ├── main.tsx                         # App entry point
│       ├── App.tsx                          # Root component with routing
│       ├── auth/
│       │   ├── AuthProvider.tsx             # MSAL provider wrapper
│       │   ├── ProtectedRoute.tsx           # Role-based route guard
│       │   ├── msalConfig.ts               # MSAL configuration
│       │   └── useAuth.ts                  # Auth hook (login, logout, token)
│       ├── api/
│       │   ├── client.ts                   # Axios instance with auth interceptor
│       │   ├── setup.ts                    # Setup wizard API (no auth, plain axios)
│       │   ├── dashboard.ts                # Dashboard API calls
│       │   ├── keyvaultItems.ts            # Key Vault items API
│       │   ├── appRegistrations.ts         # App registrations API
│       │   ├── enterpriseApps.ts           # Enterprise apps API
│       │   ├── certificates.ts             # ACME certificates API
│       │   ├── samlRotation.ts             # SAML rotation API
│       │   ├── scans.ts                    # Scan history API
│       │   ├── settings.ts                 # Settings API
│       │   ├── export.ts                   # Export API
│       │   ├── acknowledgment.ts           # Acknowledgment API
│       │   └── dns.ts                      # DNS zones API
│       ├── hooks/
│       │   ├── useDashboard.ts             # Dashboard data hooks
│       │   ├── useItems.ts                 # Item listing hooks
│       │   ├── useCertificates.ts          # ACME certificate hooks
│       │   ├── useSamlRotation.ts          # SAML rotation hooks
│       │   ├── useScans.ts                 # Scan history hooks
│       │   ├── useSettings.ts              # Settings hooks
│       │   └── useAcknowledgment.ts        # Acknowledgment hooks
│       ├── pages/
│       │   ├── SetupWizardPage.tsx          # First-time setup wizard (storage + Azure config)
│       │   ├── EventGridConfigPage.tsx      # Event Grid webhook setup guide
│       │   ├── DashboardPage.tsx           # Overview dashboard
│       │   ├── KeyVaultItemsPage.tsx       # Key Vault items table
│       │   ├── AppRegistrationsPage.tsx    # App registration credentials
│       │   ├── EnterpriseAppsPage.tsx      # Enterprise app certificates
│       │   ├── CertificatesPage.tsx        # ACME certificate management
│       │   ├── SamlRotationPage.tsx        # SAML rotation management
│       │   ├── SettingsPage.tsx            # Admin settings
│       │   └── NotFoundPage.tsx            # 404 page
│       ├── components/
│       │   ├── layout/
│       │   │   ├── AppShell.tsx            # Main layout (sidebar + header + outlet)
│       │   │   ├── Sidebar.tsx             # Navigation sidebar
│       │   │   └── Header.tsx              # Top header bar
│       │   ├── dashboard/
│       │   │   ├── OverviewCards.tsx        # Status summary cards
│       │   │   ├── ExpirationChart.tsx     # Expiration distribution chart
│       │   │   ├── RecentActivity.tsx      # Recent scan activity
│       │   │   └── TimelineView.tsx        # Expiration timeline
│       │   ├── items/
│       │   │   ├── ItemsTable.tsx          # Paginated data table
│       │   │   ├── ItemFilters.tsx         # Filter controls
│       │   │   ├── ExportToolbar.tsx       # CSV/PDF export buttons
│       │   │   └── AcknowledgeActions.tsx  # Acknowledge/snooze controls
│       │   └── common/
│       │       ├── ErrorBoundary.tsx       # React error boundary
│       │       ├── LoadingSpinner.tsx      # Loading indicator
│       │       └── StatusBadge.tsx         # Color-coded status chip
│       ├── types/
│       │   └── index.ts                   # TypeScript type definitions
│       └── utils/
│           ├── constants.ts               # Routes, colors, labels
│           └── formatters.ts              # Date/number formatting helpers
├── infra/
│   ├── main.bicep                         # Main Bicep orchestrator
│   └── modules/
│       ├── cosmos.bicep                   # Cosmos DB account + containers
│       ├── container-instance.bicep       # ACI with managed identity
│       └── event-grid.bicep               # Event Grid topic + subscription
├── data/                                  # Local JSON store (STORAGE_MODE=local, gitignored)
├── docker-compose.yml                     # Production Docker Compose
├── docker-compose.dev.yml                 # Dev overrides (hot reload)
├── .env.example                           # Backend environment template
├── setup.sh / setup.ps1                   # One-time setup scripts
├── start-local.sh / start-local.ps1       # Local dev startup scripts
└── startup.sh / startup.ps1               # Docker startup scripts
```

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Run `./setup.sh` to set up your development environment
4. Make your changes
5. Run tests: `cd backend && pytest`
6. Submit a pull request

---

## License

This project is proprietary. All rights reserved.
