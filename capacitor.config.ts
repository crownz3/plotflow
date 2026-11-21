import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.plotflow.crm',
  appName: 'PlotFlow',
  webDir: 'dist/estate-broker-crm/browser',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#1A73E8',
      sound: 'beep.wav'
    }
  }
};

export default config;

