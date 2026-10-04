import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "org.sfbbo.kestrels",
  appName: "Kestrels",
  webDir: "dist",
  // All game assets ship inside the APK, so the game runs fully offline.
  // `https` keeps localStorage/service-worker style APIs on a secure origin.
  server: {
    androidScheme: "https",
  },
  android: {
    // No cleartext traffic: the leaderboard uses HTTPS Supabase.
    allowMixedContent: false,
    backgroundColor: "#102a2f",
  },
};

export default config;