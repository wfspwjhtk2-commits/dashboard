import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// `base` muss dem GitHub-Pages-Pfad entsprechen, sonst laden Assets nicht.
// Bei Repo-Name `dashboard` => https://<user>.github.io/dashboard/
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? "/dashboard/",
});
