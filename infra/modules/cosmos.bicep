@description('Base name for resources')
param baseName string

@description('Azure region')
param location string

var accountName = '${baseName}-cosmos'
var databaseName = 'secret-manager'

resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2024-02-15-preview' = {
  name: accountName
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    locations: [
      {
        locationName: location
        failoverPriority: 0
      }
    ]
    capabilities: [
      { name: 'EnableServerless' }
    ]
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
  }
}

resource database 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-02-15-preview' = {
  parent: cosmosAccount
  name: databaseName
  properties: {
    resource: { id: databaseName }
  }
}

resource itemsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-02-15-preview' = {
  parent: database
  name: 'items'
  properties: {
    resource: {
      id: 'items'
      partitionKey: {
        paths: ['/partitionKey']
        kind: 'Hash'
      }
      indexingPolicy: {
        includedPaths: [{ path: '/*' }]
        compositeIndexes: [
          [
            { path: '/source', order: 'ascending' }
            { path: '/expirationStatus', order: 'ascending' }
          ]
          [
            { path: '/expirationStatus', order: 'ascending' }
            { path: '/expiresOn', order: 'ascending' }
          ]
        ]
      }
    }
  }
}

resource settingsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-02-15-preview' = {
  parent: database
  name: 'settings'
  properties: {
    resource: {
      id: 'settings'
      partitionKey: {
        paths: ['/settingType']
        kind: 'Hash'
      }
    }
  }
}

resource scanHistoryContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-02-15-preview' = {
  parent: database
  name: 'scan_history'
  properties: {
    resource: {
      id: 'scan_history'
      partitionKey: {
        paths: ['/status']
        kind: 'Hash'
      }
      defaultTtl: 7776000 // 90 days
    }
  }
}

output endpoint string = cosmosAccount.properties.documentEndpoint
output primaryKey string = cosmosAccount.listKeys().primaryMasterKey
