#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# ARIE — Azure Container Apps Deployment Script
# Deploys: Azure Container Registry, PostgreSQL Flexible Server,
#          Key Vault, Container Apps Environment, ARIE Engine, ARIE Web
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ─── Configuration — edit these ───────────────────────────────────────────────
RESOURCE_GROUP="rg-arie-prod"
LOCATION="uksouth"                          # Change to your preferred region
ACR_NAME="arieregistry"                     # Must be globally unique, lowercase
APP_ENV="arie-env"
ENGINE_APP="arie-engine"
WEB_APP="arie-web"
POSTGRES_SERVER="arie-postgres"
POSTGRES_DB="arie"
POSTGRES_USER="arieadmin"
KEYVAULT_NAME="kv-arie-prod"               # Must be globally unique

# Secrets — set these as environment variables before running
ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:?Set ANTHROPIC_API_KEY}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD}"
API_KEY_SALT="${API_KEY_SALT:?Set API_KEY_SALT}"

echo "🚀 Starting ARIE deployment to Azure..."
echo "Resource Group : $RESOURCE_GROUP"
echo "Location       : $LOCATION"
echo ""

# ─── 1. Resource Group ───────────────────────────────────────────────────────
echo "📦 Creating resource group..."
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --output none

# ─── 2. Azure Container Registry ─────────────────────────────────────────────
echo "🐳 Creating Container Registry..."
az acr create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$ACR_NAME" \
  --sku Basic \
  --admin-enabled true \
  --output none

ACR_LOGIN_SERVER=$(az acr show --name "$ACR_NAME" --query loginServer -o tsv)
ACR_PASSWORD=$(az acr credential show --name "$ACR_NAME" --query passwords[0].value -o tsv)

echo "   ACR: $ACR_LOGIN_SERVER"

# ─── 3. Build & Push Docker Images ───────────────────────────────────────────
echo "🔨 Building and pushing ARIE engine image..."
az acr build \
  --registry "$ACR_NAME" \
  --image arie-engine:latest \
  --file Dockerfile \
  . \
  --output none

echo "🔨 Building and pushing ARIE web image..."
az acr build \
  --registry "$ACR_NAME" \
  --image arie-web:latest \
  --file arie-web/Dockerfile \
  arie-web/ \
  --output none

# ─── 4. PostgreSQL Flexible Server ───────────────────────────────────────────
echo "🐘 Creating PostgreSQL Flexible Server..."
az postgres flexible-server create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$POSTGRES_SERVER" \
  --location "$LOCATION" \
  --admin-user "$POSTGRES_USER" \
  --admin-password "$POSTGRES_PASSWORD" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 16 \
  --public-access 0.0.0.0 \
  --output none

az postgres flexible-server db create \
  --resource-group "$RESOURCE_GROUP" \
  --server-name "$POSTGRES_SERVER" \
  --database-name "$POSTGRES_DB" \
  --output none

DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_SERVER}.postgres.database.azure.com:5432/${POSTGRES_DB}?sslmode=require"
echo "   PostgreSQL: ${POSTGRES_SERVER}.postgres.database.azure.com"

# ─── 5. Key Vault ─────────────────────────────────────────────────────────────
echo "🔑 Creating Key Vault..."
az keyvault create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$KEYVAULT_NAME" \
  --location "$LOCATION" \
  --output none

az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "anthropic-api-key"  --value "$ANTHROPIC_API_KEY" --output none
az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "database-url"       --value "$DATABASE_URL"       --output none
az keyvault secret set --vault-name "$KEYVAULT_NAME" --name "api-key-salt"       --value "$API_KEY_SALT"       --output none

# ─── 6. Container Apps Environment ───────────────────────────────────────────
echo "🌐 Creating Container Apps Environment..."
az containerapp env create \
  --name "$APP_ENV" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --output none

# ─── 7. Deploy ARIE Engine ───────────────────────────────────────────────────
echo "⚙️  Deploying ARIE Engine..."
az containerapp create \
  --name "$ENGINE_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --environment "$APP_ENV" \
  --image "${ACR_LOGIN_SERVER}/arie-engine:latest" \
  --registry-server "$ACR_LOGIN_SERVER" \
  --registry-username "$ACR_NAME" \
  --registry-password "$ACR_PASSWORD" \
  --target-port 3000 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 3 \
  --cpu 0.5 \
  --memory 1.0Gi \
  --env-vars \
    "NODE_ENV=production" \
    "PORT=3000" \
    "STORAGE_ADAPTER=postgres" \
    "WEEKLY_CRON_SCHEDULE=0 2 * * 0" \
    "CHANGE_DETECTION_INTERVAL_HOURS=6" \
    "ANTHROPIC_API_KEY=secretref:anthropic-api-key" \
    "DATABASE_URL=secretref:database-url" \
    "API_KEY_SALT=secretref:api-key-salt" \
  --secrets \
    "anthropic-api-key=keyvaultref:https://${KEYVAULT_NAME}.vault.azure.net/secrets/anthropic-api-key,identityref:system" \
    "database-url=keyvaultref:https://${KEYVAULT_NAME}.vault.azure.net/secrets/database-url,identityref:system" \
    "api-key-salt=keyvaultref:https://${KEYVAULT_NAME}.vault.azure.net/secrets/api-key-salt,identityref:system" \
  --output none

ENGINE_URL=$(az containerapp show \
  --name "$ENGINE_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --query properties.configuration.ingress.fqdn -o tsv)

echo "   Engine live: https://${ENGINE_URL}"

# ─── 8. Run Database Migrations ──────────────────────────────────────────────
echo "🗄️  Running database migrations..."
az containerapp exec \
  --name "$ENGINE_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --command "npx drizzle-kit migrate" || echo "⚠️  Run migrations manually: az containerapp exec --name $ENGINE_APP --resource-group $RESOURCE_GROUP --command 'npx drizzle-kit migrate'"

# ─── 9. Deploy ARIE Web ───────────────────────────────────────────────────────
echo "🖥️  Deploying ARIE Web..."
az containerapp create \
  --name "$WEB_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --environment "$APP_ENV" \
  --image "${ACR_LOGIN_SERVER}/arie-web:latest" \
  --registry-server "$ACR_LOGIN_SERVER" \
  --registry-username "$ACR_NAME" \
  --registry-password "$ACR_PASSWORD" \
  --target-port 3001 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 2 \
  --cpu 0.25 \
  --memory 0.5Gi \
  --env-vars \
    "NEXT_PUBLIC_ARIE_API_URL=https://${ENGINE_URL}/api/v1" \
  --output none

WEB_URL=$(az containerapp show \
  --name "$WEB_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --query properties.configuration.ingress.fqdn -o tsv)

# ─── Done ────────────────────────────────────────────────────────────────────
echo ""
echo "✅ ARIE deployed successfully!"
echo ""
echo "  Engine API : https://${ENGINE_URL}/api/v1"
echo "  Web UI     : https://${WEB_URL}"
echo "  Health     : https://${ENGINE_URL}/health"
echo ""
echo "Next steps:"
echo "  1. Register your org:"
echo "     curl -X POST https://${ENGINE_URL}/api/v1/orgs \\"
echo "       -H 'Content-Type: application/json' \\"
echo "       -d '{\"name\":\"Your Org\",\"jurisdictionFootprint\":[\"GB\",\"US\"],\"sectors\":[\"chemical\",\"water\"]}'"
echo ""
echo "  2. Import powerplatform/openapi.yaml into Power Apps as a Custom Connector"
echo "     Base URL: https://${ENGINE_URL}/api/v1"
echo ""
echo "  3. Set the Custom Connector API key to the value returned from step 1"
