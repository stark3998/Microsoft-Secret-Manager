export const ROUTES = {
  DASHBOARD: '/',
  SCANS: '/scans',
  KEYVAULT_ITEMS: '/keyvault-items',
  APP_REGISTRATIONS: '/app-registrations',
  ENTERPRISE_APPS: '/enterprise-apps',
  CERTIFICATES: '/certificates',
  SAML_ROTATION: '/saml-rotation',
  EVENTGRID_CONFIG: '/eventgrid-config',
  SETTINGS: '/settings',
  PROFILE: '/profile',
} as const;

export const STATUS_COLORS: Record<string, string> = {
  expired: '#DC2626',
  critical: '#DC2626',
  warning: '#D97706',
  notice: '#0284C7',
  healthy: '#059669',
  no_expiry: '#9CA3AF',
};

export const STATUS_LABELS: Record<string, string> = {
  expired: 'Expired',
  critical: 'Critical',
  warning: 'Warning',
  notice: 'Notice',
  healthy: 'Healthy',
  no_expiry: 'No Expiry',
};

export const SOURCE_LABELS: Record<string, string> = {
  keyvault: 'Key Vault',
  app_registration: 'App Registration',
  enterprise_app: 'Enterprise App',
};

export const ITEM_TYPE_LABELS: Record<string, string> = {
  secret: 'Secret',
  key: 'Key',
  certificate: 'Certificate',
  client_secret: 'Client Secret',
  saml_certificate: 'SAML Certificate',
};

export const ROTATION_STATE_COLORS: Record<string, string> = {
  staged: '#0284C7',
  notified: '#D97706',
  activated: '#059669',
  completed: '#9CA3AF',
  cancelled: '#6B7280',
  failed: '#DC2626',
};

export const ROTATION_STATE_LABELS: Record<string, string> = {
  staged: 'Staged',
  notified: 'Awaiting SP Update',
  activated: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
  failed: 'Failed',
};
