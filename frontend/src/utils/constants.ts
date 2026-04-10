export const ROUTES = {
  DASHBOARD: '/',
  SCANS: '/scans',
  KEYVAULT_ITEMS: '/keyvault-items',
  APP_REGISTRATIONS: '/app-registrations',
  ENTERPRISE_APPS: '/enterprise-apps',
  APP_INVENTORY: '/app-inventory',
  CERTIFICATES: '/certificates',
  SAML_ROTATION: '/saml-rotation',
  EVENTGRID_CONFIG: '/eventgrid-config',
  SETTINGS: '/settings',
  PROFILE: '/profile',
} as const;

export const STATUS_COLORS: Record<string, string> = {
  expired: '#D13438',
  critical: '#D83B01',
  warning: '#F7630C',
  notice: '#0078D4',
  healthy: '#107C10',
  no_expiry: '#8A8886',
  unknown: '#8A8886',
};

export const STATUS_LABELS: Record<string, string> = {
  expired: 'Expired',
  critical: 'Critical',
  warning: 'Warning',
  notice: 'Notice',
  healthy: 'Healthy',
  no_expiry: 'No Expiry',
  unknown: 'Unknown',
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
  staged: '#0078D4',
  notified: '#F7630C',
  activated: '#107C10',
  completed: '#8A8886',
  cancelled: '#605E5C',
  failed: '#D13438',
};

export const ROTATION_STATE_LABELS: Record<string, string> = {
  staged: 'Staged',
  notified: 'Awaiting SP Update',
  activated: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
  failed: 'Failed',
};

export const ACTIVITY_COLORS: Record<string, string> = {
  active: '#107C10',
  low_activity: '#F7630C',
  inactive: '#D83B01',
  zombie: '#D13438',
  disabled: '#8A8886',
};

export const ACTIVITY_LABELS: Record<string, string> = {
  active: 'Active',
  low_activity: 'Low Activity',
  inactive: 'Inactive',
  zombie: 'Zombie',
  disabled: 'Disabled',
};
