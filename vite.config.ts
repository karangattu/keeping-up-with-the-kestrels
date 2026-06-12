import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? "/keeping-up-with-the-kestrels/" : "/",
  plugins: [react()],
  server: {
    host: "0.0.0.0",
  },
});
