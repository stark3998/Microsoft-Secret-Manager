/**
 * Generate Azure Portal deep links for various resource types.
 */

const PORTAL_BASE = 'https://portal.azure.com';

export function getKeyVaultItemLink(item: Record<string, unknown>): string | null {
  const vaultName = item.vaultName as string;
  const subscriptionId = item.subscriptionId as string;
  const resourceGroup = item.resourceGroup as string;
  const itemName = item.itemName as string;
  const itemType = item.itemType as string;

  if (!vaultName || !subscriptionId || !resourceGroup) return null;

  const vaultResourceId = `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.KeyVault/vaults/${vaultName}`;

  const typeMap: Record<string, string> = {
    secret: 'secrets',
    key: 'keys',
    certificate: 'certificates',
  };

  const section = typeMap[itemType] || 'secrets';
  return `${PORTAL_BASE}/#@/resource${vaultResourceId}/${section}/${itemName}`;
}

export function getAppRegistrationLink(item: Record<string, unknown>): string | null {
  const appObjectId = item.appObjectId as string;
  if (!appObjectId) return null;
  return `${PORTAL_BASE}/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/Credentials/appId/${item.appId || ''}/objectId/${appObjectId}`;
}

export function getEnterpriseAppLink(item: Record<string, unknown>): string | null {
  const spId = item.servicePrincipalId as string;
  if (!spId) return null;
  return `${PORTAL_BASE}/#view/Microsoft_AAD_IAM/ManagedAppMenuBlade/~/Overview/objectId/${spId}`;
}

export function getKeyVaultLink(subscriptionId: string, resourceGroup: string, vaultName: string): string | null {
  if (!subscriptionId || !resourceGroup || !vaultName) return null;
  return `${PORTAL_BASE}/#@/resource/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.KeyVault/vaults/${vaultName}/overview`;
}

export function getResourceLink(item: Record<string, unknown>): string | null {
  const source = item.source as string;
  switch (source) {
    case 'keyvault':
      return getKeyVaultItemLink(item);
    case 'app_registration':
      return getAppRegistrationLink(item);
    case 'enterprise_app':
      return getEnterpriseAppLink(item);
    default:
      return null;
  }
}
