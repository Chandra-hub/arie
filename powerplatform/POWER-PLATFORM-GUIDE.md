# ARIE — Power Platform Integration Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Power Platform                            │
│                                                                  │
│  ┌──────────────┐   ┌──────────────────┐   ┌────────────────┐  │
│  │  Canvas App  │   │  Copilot Studio  │   │ Power Automate │  │
│  │ (User-facing)│   │  (AI chatbot)    │   │  (Scheduled)   │  │
│  └──────┬───────┘   └────────┬─────────┘   └───────┬────────┘  │
│         │                    │                       │           │
│         └────────────────────┼───────────────────────┘          │
│                              │                                   │
│                    ┌─────────▼──────────┐                       │
│                    │  Custom Connector   │                       │
│                    │  (ARIE Connector)   │                       │
│                    └─────────┬──────────┘                       │
└──────────────────────────────┼──────────────────────────────────┘
                               │ HTTPS / X-Api-Key
                               ▼
                    ┌──────────────────────┐
                    │   ARIE Engine        │
                    │ Azure Container Apps  │
                    │ your-app.azurecontainerapps.io │
                    └──────────────────────┘
```

---

## Step 1 — Deploy ARIE to Azure

Run the deployment script from the repo root:

```bash
chmod +x deploy/azure-deploy.sh

export ANTHROPIC_API_KEY="sk-ant-..."
export POSTGRES_PASSWORD="your-secure-password"
export API_KEY_SALT="your-random-64-char-salt"

./deploy/azure-deploy.sh
```

This creates:
- Azure Container Registry (engine + web images)
- PostgreSQL Flexible Server
- Key Vault (secrets)
- Container Apps Environment
- ARIE Engine (public HTTPS endpoint)
- ARIE Web UI

Note the **Engine API URL** from the output — you need it for the Custom Connector.

---

## Step 2 — Register Your Organisation

Once deployed, register your org to get an API key:

```bash
curl -X POST https://YOUR-ENGINE-URL/api/v1/orgs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Your Company Name",
    "jurisdictionFootprint": ["GB", "US", "AU", "DE"],
    "sectors": ["chemical", "water", "manufacturing"]
  }'
```

Response:
```json
{
  "orgId": "org_abc123",
  "apiKey": "arie_live_xxxxxxxxxxxx",
  "message": "Store your API key securely — it will not be shown again."
}
```

**Save the `apiKey`** — you need it for the Custom Connector.

---

## Step 3 — Create Power Apps Custom Connector

### Option A — Import from JSON (Fastest)

1. Go to **Power Apps → Dataverse → Custom Connectors → New custom connector → Import an OpenAPI file**
2. Upload `powerplatform/custom-connector.json`
3. Update the **Host** field to your ARIE engine URL:
   `your-arie-engine.azurecontainerapps.io`
4. Click through to **Security** tab:
   - Authentication type: `API Key`
   - Parameter label: `ARIE API Key`
   - Parameter name: `X-Api-Key`
   - Parameter location: `Header`
5. **Create connector**
6. Under **Test** tab → **New connection** → paste your `arie_live_...` API key

### Option B — Import from OpenAPI YAML

1. **Power Apps → Custom Connectors → New → Import an OpenAPI from URL**
2. Or upload `powerplatform/openapi.yaml` directly
3. Same steps as above from step 3 onward

### Test the connector

In the **Test** tab, try **ListRegulations** — you should get an empty array initially (run the agent first to populate data).

---

## Step 4 — Trigger Your First Agent Run

Either via the Web UI (`https://your-arie-web.azurecontainerapps.io`) or via API:

```bash
curl -X POST https://YOUR-ENGINE-URL/api/v1/agent/run \
  -H "X-Api-Key: arie_live_..." \
  -H "Content-Type: application/json" \
  -d '{ "force": true }'
```

The agent will scrape all jurisdictions in your footprint, normalise via Claude AI, and populate your database. Wait 2-5 minutes then check `/regulations`.

---

## Step 5 — Build Power Apps Canvas App

### Minimal working canvas app

In Power Apps Studio:

```
1. New blank canvas app (tablet layout)

2. Add data source:
   Insert → Data → Add data → search "ARIE" → Add

3. Home Screen
   ├── Gallery: Items = ARIERegulatoryIntelligence.ListRegulations().regulations
   │   ├── Label: ThisItem.title
   │   ├── Label: ThisItem.jurisdictionCode
   │   └── Label: ThisItem.sector
   └── Button "Run Agent": OnSelect = ARIERegulatoryIntelligence.TriggerAgentRun({force: false})

4. Compliance Screen
   ├── TextInput (id: txtScenario): placeholder = "Describe your operation..."
   ├── Button "Check Compliance":
   │   OnSelect = Set(
   │     varReport,
   │     ARIERegulatoryIntelligence.CheckCompliance({
   │       scenario: txtScenario.Text,
   │       sector: drpSector.Selected.Value
   │     }).complianceReport
   │   )
   └── Label: Text = varReport.status
       Color = If(varReport.status = "compliant", Green,
               If(varReport.status = "non_compliant", Red, Orange))
```

### Recommended screens

| Screen | Key Controls | ARIE Action |
|---|---|---|
| Dashboard | Gallery of recent runs, change count | `ListAgentRuns`, `ListRegulations` |
| Regulations | Searchable gallery, filter by sector/jurisdiction | `ListRegulations` |
| Regulation Detail | Full detail card with obligations + penalties | `GetRegulation` |
| Compliance Check | Text input + sector dropdown + report display | `CheckCompliance` |
| Agent Control | Trigger button + run history gallery | `TriggerAgentRun`, `ListAgentRuns` |
| Settings | Labels showing org footprint | `GetMyOrg` |

---

## Step 6 — Copilot Studio Agent (Optional)

Build a natural language interface over ARIE:

1. **Copilot Studio → Create a copilot → Blank copilot**
2. Name: `ARIE Regulatory Assistant`
3. **Topics → Add topic → Conversational**

### Example topics to create

**Topic: Check Compliance**
```
Trigger phrases:
  - "am I compliant with..."
  - "check my compliance for..."
  - "is it legal to..."

Actions:
  - Ask: "Describe your operational scenario"
  - Call action: ARIE Custom Connector → CheckCompliance
  - Respond with: compliance status + findings summary
```

**Topic: Latest Regulation Changes**
```
Trigger phrases:
  - "what regulations changed recently"
  - "any new rules this week"
  - "show me regulatory updates"

Actions:
  - Call action: ListRegulations with changedSince = last 7 days
  - Respond with: formatted list of changed regulations
```

**Topic: Run Agent**
```
Trigger phrases:
  - "update regulations"
  - "fetch latest rules"
  - "run the agent"

Actions:
  - Call action: TriggerAgentRun
  - Respond with: "Agent run triggered. Check back in a few minutes."
```

4. Add the ARIE Custom Connector as a **Power Automate action** in each topic
5. Publish → embed in Teams, SharePoint, or Power Apps

---

## Step 7 — Power Automate Weekly Digest (Optional)

1. **Power Automate → Import → Import Package**
2. Upload `powerplatform/flow-weekly-digest.json`
3. Configure connections:
   - ARIE connector (your API key)
   - Office 365 Outlook (your email account)
4. Set environment variable `DIGEST_RECIPIENT_EMAIL`
5. Turn on the flow

Every Monday at 08:00 GMT, the flow will fetch regulation changes from the past 7 days and email a formatted HTML digest.

---

## Environment Summary

| Component | URL | Purpose |
|---|---|---|
| ARIE Engine | `https://arie-engine.azurecontainerapps.io` | REST API + Agent |
| ARIE Web UI | `https://arie-web.azurecontainerapps.io` | Admin dashboard |
| Custom Connector | Power Apps / Power Automate | Power Platform bridge |
| Copilot Studio | Teams / SharePoint embed | Natural language interface |

---

## Troubleshooting

**Custom Connector returns 401**
→ Check the API key is correctly set in the connector connection. The key must start with `arie_live_`.

**No regulations returned**
→ The agent hasn't run yet. Trigger a manual run via `/agent/run` with `force: true`.

**Compliance check returns empty findings**
→ No regulations indexed for those jurisdictions. Run the agent for the relevant jurisdictions first.

**Agent run times out**
→ Normal for first run across many jurisdictions. Check status via `GetAgentRun` polling on the `runId`.
