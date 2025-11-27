import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.agendahof.mobile',
  appName: 'AgendaHOF',
  webDir: 'dist',
  server: {
    // Descomente para desenvolvimento local
    // url: 'http://192.168.x.x:5173',
    // cleartext: true,
  },
  plugins: {
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#ffffff',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
  ios: {
    contentInset: 'automatic',
    // URL Schemes para Deep Links
    scheme: 'agendahof',
  },
};

export default config;
