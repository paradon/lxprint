import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import packageConfig from "./package.json";

import * as child from "child_process";

function commitHash() {
  try {
    return child.execSync("git rev-parse --short HEAD").toString();
  } catch {
    return "none";
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { allowedHosts: [".trycloudflare.com"] },
  define: {
    __APP_VERSION__: JSON.stringify(packageConfig.version),
    __COMMIT_HASH__: JSON.stringify(commitHash()),
  },
});
