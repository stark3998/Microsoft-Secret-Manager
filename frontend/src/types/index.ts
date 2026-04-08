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
  startedAt: string;
  completedAt: string | null;
  subscriptionsScanned: number;
  vaultsScanned: number;
  itemsFound: number;
  appRegistrationsScanned: number;
  enterpriseAppsScanned: number;
  newExpiredFound: number;
  errors: string[];
  triggeredBy: string;
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
