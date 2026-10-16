import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Google sign-in only accepts http://localhost:5173, so never drift to another port.
  server: { port: 5173, strictPort: true },
});