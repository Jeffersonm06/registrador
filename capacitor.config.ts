import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'File System',
  webDir: 'www',
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    StatusBar: {
      overlaysWebView: false
    },
    SplashScreen: {
      launchShowDuration: 4000,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'logo',
      iosSplashResourceName: 'Splash',
      showSpinner: false
    },
    Keyboard: {
      resize: 'body'
    }
  },
};

export default config;
