import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.js",
    env: { VITE_API_URL: "http://api.test/api" },
    css: false,
    restoreMocks: true,
  },
});
