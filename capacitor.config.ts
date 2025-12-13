import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.agendahof.mobile',
  appName: 'AgendaHOF',
  webDir: 'dist',
  // Modo produção - usa arquivos compilados locais
  // server: {
  //   url: 'http://192.168.15.21:5173',
  //   cleartext: true,
  // },
  plugins: {
    StatusBar: {
      style: 'LIGHT',
      overlaysWebView: true,
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    CapacitorHttp: {
      enabled: true,
    },
  },
  ios: {
    contentInset: 'never',
    // URL Schemes para Deep Links
    scheme: 'agendahof',
    // Permitir requisições de rede
    allowsLinkPreview: false,
    // Usar limitsNavigationsToAppBoundDomains para permitir fetch
    limitsNavigationsToAppBoundDomains: false,
  },
  server: {
    // Permitir todas as origens para requisições
    allowNavigation: ['*.supabase.co', 'https://*.supabase.co'],
  },
};

export default config;
