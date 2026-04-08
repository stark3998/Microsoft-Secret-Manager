@description('Base name for resources')
param baseName string

@description('Azure region')
param location string

@description('Webhook URL for Event Grid subscription')
param webhookUrl string

resource eventGridTopic 'Microsoft.EventGrid/systemTopics@2024-06-01-preview' = {
  name: '${baseName}-keyvault-events'
  location: location
  properties: {
    source: subscription().id
    topicType: 'Microsoft.KeyVault.vaults'
  }
}

resource eventSubscription 'Microsoft.EventGrid/systemTopics/eventSubscriptions@2024-06-01-preview' = {
  parent: eventGridTopic
  name: '${baseName}-kv-webhook'
  properties: {
    destination: {
      endpointType: 'WebHook'
      properties: {
        endpointUrl: 'https://${webhookUrl}'
      }
    }
    filter: {
      includedEventTypes: [
        'Microsoft.KeyVault.SecretNewVersionCreated'
        'Microsoft.KeyVault.SecretNearExpiry'
        'Microsoft.KeyVault.SecretExpired'
        'Microsoft.KeyVault.KeyNewVersionCreated'
        'Microsoft.KeyVault.KeyNearExpiry'
        'Microsoft.KeyVault.KeyExpired'
        'Microsoft.KeyVault.CertificateNewVersionCreated'
        'Microsoft.KeyVault.CertificateNearExpiry'
        'Microsoft.KeyVault.CertificateExpired'
      ]
    }
    eventDeliverySchema: 'EventGridSchema'
    retryPolicy: {
      maxDeliveryAttempts: 30
      eventTimeToLiveInMinutes: 1440
    }
  }
}
