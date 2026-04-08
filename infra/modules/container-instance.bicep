@description('Base name for resources')
param baseName string

@description('Azure region')
param location string

@description('Cosmos DB endpoint')
param cosmosEndpoint string

@secure()
@description('Cosmos DB primary key')
param cosmosKey string

@description('Entra ID Tenant ID')
param tenantId string

@description('App Registration Client ID')
param clientId string

@description('Backend container image')
param backendImage string

@description('Frontend container image')
param frontendImage string

@description('Enable ACME certificate management')
param acmeEnabled bool = false

@description('Key Vault URL for ACME certificates')
param acmeKeyVaultUrl string = ''

var containerGroupName = '${baseName}-containers'

resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${baseName}-identity'
  location: location
}

resource containerGroup 'Microsoft.ContainerInstance/containerGroups@2023-05-01' = {
  name: containerGroupName
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${managedIdentity.id}': {}
    }
  }
  properties: {
    osType: 'Linux'
    restartPolicy: 'Always'
    ipAddress: {
      type: 'Public'
      ports: [
        { port: 80, protocol: 'TCP' }
        { port: 8000, protocol: 'TCP' }
      ]
      dnsNameLabel: baseName
    }
    containers: [
      {
        name: 'backend'
        properties: {
          image: backendImage
          ports: [{ port: 8000, protocol: 'TCP' }]
          resources: {
            requests: { cpu: 1, memoryInGB: 2 }
          }
          environmentVariables: [
            { name: 'AZURE_TENANT_ID', value: tenantId }
            { name: 'AZURE_CLIENT_ID', value: clientId }
            { name: 'MSAL_CLIENT_ID', value: clientId }
            { name: 'MSAL_AUTHORITY', value: 'https://login.microsoftonline.com/${tenantId}' }
            { name: 'COSMOS_ENDPOINT', value: cosmosEndpoint }
            { name: 'COSMOS_KEY', secureValue: cosmosKey }
            { name: 'COSMOS_DATABASE', value: 'secret-manager' }
            { name: 'MANAGED_IDENTITY_CLIENT_ID', value: managedIdentity.properties.clientId }
            { name: 'AZURE_ENVIRONMENT', value: 'AzureCloud' }
            { name: 'ACME_ENABLED', value: string(acmeEnabled) }
            { name: 'ACME_KEY_VAULT_URL', value: acmeKeyVaultUrl }
          ]
        }
      }
      {
        name: 'frontend'
        properties: {
          image: frontendImage
          ports: [{ port: 80, protocol: 'TCP' }]
          resources: {
            requests: { cpu: json('0.5'), memoryInGB: json('0.5') }
          }
        }
      }
    ]
  }
}

output fqdn string = containerGroup.properties.ipAddress.fqdn
output identityPrincipalId string = managedIdentity.properties.principalId
