export interface PaginatedResponse<T = Record<string, unknown>> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface DashboardOverview {
  total: number;
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
  byType: Record<string, number>;
}

export interface TimelineItem {
  id: string;
  itemName: string;
  itemType: string;
  source: string;
  vaultName?: string;
  appDisplayName?: string;
  expiresOn: string;
  expirationStatus: string;
  daysUntilExpiration: number;
  subscriptionName?: string;
}

export interface KeyVaultItem {
  id: string;
  partitionKey: string;
  itemType: string;
  source: string;
  subscriptionId: string;
  subscriptionName: string;
  resourceGroup: string;
  vaultName: string;
  vaultUri: string;
  itemName: string;
  itemVersion: string;
  enabled: boolean;
  expiresOn: string | null;
  createdOn: string | null;
  updatedOn: string | null;
  tags: Record<string, string>;
  expirationStatus: string;
  daysUntilExpiration: number | null;
  lastScannedAt: string;
  keyProperties?: {
    keyType: string;
    keySize: number;
    keyOps: string[];
  };
  certProperties?: {
    issuer: string;
    subject: string;
    thumbprint: string;
    serialNumber: string;
  };
}

export interface AppRegistrationItem {
  id: string;
  itemType: string;
  source: string;
  appObjectId: string;
  appId: string;
  appDisplayName: string;
  credentialId: string;
  credentialDisplayName: string;
  expiresOn: string | null;
  createdOn: string | null;
  thumbprint?: string;
  expirationStatus: string;
  daysUntilExpiration: number | null;
  lastScannedAt: string;
}

export interface EnterpriseAppItem {
  id: string;
  itemType: string;
  source: string;
  servicePrincipalId: string;
  appId: string;
  appDisplayName: string;
  certType: string;
  thumbprint: string;
  subject: string;
  expiresOn: string | null;
  createdOn: string | null;
  expirationStatus: string;
  daysUntilExpiration: number | null;
  lastScannedAt: string;
}

export interface AppConfig {
  storageMode: string;
  azureTenantId: string;
  azureClientId: string;
  azureClientSecret: string;
  azureEnvironment: string;
  managedIdentityClientId: string;
  msalClientId: string;
  cosmosEndpoint: string;
  cosmosDatabase: string;
  setupCompletedAt?: string;
  updatedBy?: string;
  updatedAt?: string;
  requiresRestart?: boolean;
}

export interface ThresholdTier {
  name: string;
  daysBeforeExpiry: number;
  color: string;
}

export interface AppSettings {
  thresholds: {
    tiers: ThresholdTier[];
    updatedBy: string;
    updatedAt: string;
  };
  notifications: {
    emailEnabled: boolean;
    emailRecipients: string[];
    emailFrom: string;
    teamsEnabled: boolean;
    teamsWebhookUrl: string;
    slackEnabled: boolean;
    slackWebhookUrl: string;
    webhookEnabled: boolean;
    genericWebhookUrl: string;
    webhookHeaders: Record<string, string>;
    notifyOnStatusChange: boolean;
    dailyDigestEnabled: boolean;
    dailyDigestTime: string;
    updatedBy: string;
    updatedAt: string;
  };
  schedule: {
    cronExpression: string;
    enabled: boolean;
    subscriptionFilter: string[];
    updatedBy: string;
    updatedAt: string;
  };
}

export interface ScanRun {
  id: string;
  status: string;
  trigger: string;
  credentialMode?: string;
  startedAt: string;
  completedAt: string | null;
  subscriptionsScanned: number;
  vaultsScanned: number;
  itemsFound: number;
  appRegistrationsScanned: number;
  enterpriseAppsScanned: number;
  inventoryAppsScanned: number;
  newExpiredFound: number;
  errors: string[];
  triggeredBy: string;
}

export interface ScanLogEvent {
  type: 'log' | 'phase_start' | 'phase_complete' | 'progress' | 'error' | 'complete' | 'failed';
  message: string;
  timestamp: string;
  phase: string | null;
  data: Record<string, unknown>;
}

export interface SubscriptionInfo {
  subscriptionId: string;
  subscriptionName: string;
}

export interface VaultInfo {
  vaultName: string;
  vaultUri: string;
}

// ACME Certificate types
export interface CertificateInfo {
  certificate_name: string;
  domains: string[];
  version: string;
  not_before: string;
  not_after: string;
  issuer: string;
  serial_number: string;
  key_type: string;
}

export interface IssueCertificateRequest {
  domains: string[];
  certificate_name: string;
  key_type: string;
  dns_provider?: string;
  preferred_chain?: string;
  tags?: Record<string, string>;
}

export interface RenewCertificateRequest {
  certificate_name: string;
  domains?: string[];
  key_type: string;
  dns_provider?: string;
  force: boolean;
}

export interface RevokeCertificateRequest {
  certificate_name: string;
  reason: number;
}

export interface DnsProvider {
  key: string;
  name: string;
}

export interface DnsZone {
  zone: string | null;
  provider: string;
  provider_name: string;
  error?: string;
}

export interface AcknowledgeRequest {
  item_id: string;
  partition_key: string;
  note?: string;
}

export interface SnoozeRequest {
  item_id: string;
  partition_key: string;
  snooze_days: number;
  note?: string;
}

// SAML Certificate Rotation types
export type RotationState = 'staged' | 'notified' | 'activated' | 'completed' | 'cancelled' | 'failed';

export interface RotationJob {
  id: string;
  partitionKey: string;
  itemType: string;
  servicePrincipalId: string;
  appId: string;
  appDisplayName: string;
  state: RotationState;
  oldThumbprint: string;
  oldKeyId: string;
  newThumbprint: string;
  newKeyId: string;
  newCertExpiresOn: string | null;
  initiatedAt: string;
  initiatedBy: string;
  stagedAt: string | null;
  notifiedAt: string | null;
  activatedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelledBy: string;
  failedAt: string | null;
  failureReason: string;
  history: Array<{ action: string; at: string; by?: string; details?: string }>;
}

export interface InitiateRotationRequest {
  service_principal_id: string;
  app_display_name?: string;
}

export interface EligibleApp {
  servicePrincipalId: string;
  appId: string;
  appDisplayName: string;
  currentThumbprint: string;
  expiresOn: string;
  daysUntilExpiration: number;
  hasActiveRotation: boolean;
  isExcluded: boolean;
}

export interface RotationCycleSummary {
  initiated: number;
  notified: number;
  activated: number;
  completed: number;
  errors: number;
}

export interface SamlRotationSettings {
  enabled: boolean;
  triggerDays: number;
  activationGraceDays: number;
  cleanupGraceDays: number;
  autoActivate: boolean;
  excludedServicePrincipals: string[];
  spMetadataRefreshCapable: string[];
  updatedBy: string;
  updatedAt: string | null;
}

// App Inventory types
export type ActivityClassification = 'active' | 'low_activity' | 'inactive' | 'zombie' | 'disabled';

export interface AppInventoryRecord {
  id: string;
  partitionKey: string;
  itemType: string;
  appId: string;
  appObjectId: string;
  servicePrincipalId: string;
  appDisplayName: string;
  appType: string;
  accountEnabled: boolean;
  totalSecrets: number;
  activeSecrets: number;
  expiredSecrets: number;
  totalCertificates: number;
  activeCertificates: number;
  expiredCertificates: number;
  nearestExpiry: string | null;
  signInCount30d: number;
  interactiveSignInCount: number;
  nonInteractiveSignInCount: number;
  servicePrincipalSignInCount: number;
  managedIdentitySignInCount: number;
  failedSignInCount: number;
  lastSignInAt: string | null;
  uniqueUsers30d: number;
  topUsers: Array<{ userPrincipalName: string; displayName: string; count: number }>;
  topLocations: Array<{ location: string; count: number }>;
  topBrowsers: Array<{ browser: string; count: number }>;
  topClientApps: Array<{ clientApp: string; count: number }>;
  spLastSignIn: string | null;
  appClientLastSignIn: string | null;
  appResourceLastSignIn: string | null;
  delegatedClientLastSignIn: string | null;
  delegatedResourceLastSignIn: string | null;
  credentialActivities: Array<{
    keyId: string;
    keyType: string;
    credentialOrigin: string;
    lastSignIn: string | null;
    expirationDate: string | null;
    resourceId: string;
  }>;
  activityClassification: ActivityClassification;
  lastActivityScannedAt: string | null;
  scanRunId: string;
  lastScannedAt: string | null;
}

export interface InventorySummary {
  total: number;
  active: number;
  lowActivity: number;
  inactive: number;
  zombie: number;
  disabled: number;
}

export interface AppSignInRecord {
  id: string;
  appId: string;
  appDisplayName: string;
  userPrincipalName: string;
  userDisplayName: string;
  userId: string;
  createdDateTime: string;
  status: { errorCode: number; failureReason: string };
  signInEventTypes: string[];
  ipAddress: string;
  clientAppUsed: string;
  resourceDisplayName: string;
  isInteractive: boolean;
  userAgent: string;
  deviceDetail: {
    browser: string;
    operatingSystem: string;
    displayName: string;
  };
  location: {
    city: string;
    state: string;
    countryOrRegion: string;
  };
  riskDetail: string;
  riskLevelDuringSignIn: string;
  conditionalAccessStatus: string;
}

export interface DisableAppAction {
  id: string;
  appId: string;
  servicePrincipalId: string;
  appDisplayName: string;
  state: string;
  previousEnabledState: boolean;
  initiatedAt: string;
  initiatedBy: string;
  completedAt: string | null;
  failedAt: string | null;
  failureReason: string;
  revertedAt: string | null;
  revertedBy: string;
  history: Array<{ action: string; at: string; by?: string; details?: string }>;
}
