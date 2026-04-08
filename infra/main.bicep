targetScope = 'resourceGroup'

@description('Base name for all resources')
param baseName string = 'secretmgr'

@description('Azure region for deployment')
param location string = resourceGroup().location

@description('Entra ID Tenant ID')
param tenantId string

@description('App Registration Client ID')
param clientId string

@description('Container image for backend')
param backendImage string = ''

@description('Container image for frontend')
param frontendImage string = ''

@description('Enable ACME certificate management')
param acmeEnabled bool = false

@description('Key Vault URL for storing ACME certificates')
param acmeKeyVaultUrl string = ''

// Cosmos DB
module cosmos 'modules/cosmos.bicep' = {
  name: 'cosmos-deploy'
  params: {
    baseName: baseName
    location: location
  }
}

// Container Instance
module container 'modules/container-instance.bicep' = {
  name: 'container-deploy'
  params: {
    baseName: baseName
    location: location
    cosmosEndpoint: cosmos.outputs.endpoint
    cosmosKey: cosmos.outputs.primaryKey
    tenantId: tenantId
    clientId: clientId
    backendImage: backendImage
    frontendImage: frontendImage
    acmeEnabled: acmeEnabled
    acmeKeyVaultUrl: acmeKeyVaultUrl
  }
}

// Event Grid (optional, deploy after webhook endpoint is reachable)
module eventGrid 'modules/event-grid.bicep' = {
  name: 'eventgrid-deploy'
  params: {
    baseName: baseName
    location: location
    webhookUrl: '${container.outputs.fqdn}/api/webhooks/eventgrid'
  }
}

output cosmosEndpoint string = cosmos.outputs.endpoint
output containerFqdn string = container.outputs.fqdn
