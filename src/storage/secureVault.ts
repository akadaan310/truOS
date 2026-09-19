import * as SecureStore from 'expo-secure-store';

/**
 * Holds the actual secret material (API keys, bearer tokens, session blobs) for every
 * credential group, backed by the platform keystore (Android Keystore / iOS Keychain) via
 * `expo-secure-store`. This is the only place a raw secret is ever held outside of an in-flight
 * request — agent and credential-group records only ever carry an opaque id, never the secret.
 */
function secretKey(credentialGroupId: string): string {
  return `truos_secret_${credentialGroupId}`;
}

export const secureVault = {
  async putSecret(credentialGroupId: string, secret: string): Promise<void> {
    await SecureStore.setItemAsync(secretKey(credentialGroupId), secret);
  },
  async getSecret(credentialGroupId: string): Promise<string | null> {
    return SecureStore.getItemAsync(secretKey(credentialGroupId));
  },
  async hasSecret(credentialGroupId: string): Promise<boolean> {
    const value = await secureVault.getSecret(credentialGroupId);
    return value != null && value.length > 0;
  },
  async removeSecret(credentialGroupId: string): Promise<void> {
    await SecureStore.deleteItemAsync(secretKey(credentialGroupId));
  },
};
