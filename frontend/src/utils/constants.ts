export const ROUTES = {
  DASHBOARD: '/',
  KEYVAULT_ITEMS: '/keyvault-items',
  APP_REGISTRATIONS: '/app-registrations',
  ENTERPRISE_APPS: '/enterprise-apps',
  CERTIFICATES: '/certificates',
  SETTINGS: '/settings',
} as const;

export const STATUS_COLORS: Record<string, string> = {
  expired: '#d32f2f',
  critical: '#d32f2f',
  warning: '#ed6c02',
  notice: '#0288d1',
  healthy: '#2e7d32',
  no_expiry: '#9e9e9e',
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
