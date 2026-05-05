import type { CapacitorConfig } from '@capacitor/cli';

const serverUrl = process.env.CAPACITOR_SERVER_URL ?? 'https://app.pupmanager.com';
const isCleartext = serverUrl.startsWith('http://');

const config: CapacitorConfig = {
  appId: 'com.pupmanager.app',
  appName: 'PupManager',
  webDir: 'public/native-shell',
  server: {
    url: serverUrl,
    cleartext: isCleartext,
    androidScheme: 'https',
    iosScheme: 'https',
  },
  ios: {
    contentInset: 'always',
    limitsNavigationsToAppBoundDomains: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
