import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import pkg from "./package.json";

// 版本號：部署時由 GitHub Actions 以 tag 名稱（github.ref_name）注入 VITE_APP_VERSION，
// 本地/手動建置則退回 package.json 的 version。去掉開頭的 v 後，UI 再統一加上 v。
const version = (process.env.VITE_APP_VERSION || pkg.version).replace(/^v/, "");

// base 設為相對路徑，方便部署到 GitHub Pages 子路徑或直接開啟 dist
export default defineConfig({
  base: "./",
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
});
