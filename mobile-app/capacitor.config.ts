import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dadasstore.app',
  appName: "Dada's Store",
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'http'
  }
};

export default config;