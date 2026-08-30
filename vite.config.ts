import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  server: {
    host: true,
    port: 8080,
    hmr: { overlay: false },
    proxy: {
      "/api/sslanalyzer":              { target: "http://localhost:8765", changeOrigin: true, rewrite: (p) => p.replace(/^\/api\/sslanalyzer/, "") },
      "/api/auth":                     { target: "http://localhost:8766", changeOrigin: true, rewrite: (p) => p.replace(/^\/api/, "") },
      "/api/chat":                     { target: "http://localhost:8000", changeOrigin: true, rewrite: (p) => p.replace(/^\/api\/chat/, "/chat") },
      "/api/health":                   { target: "http://localhost:8000", changeOrigin: true, rewrite: (p) => p.replace(/^\/api\/health/, "/health") },
      "/api/firewall":                 { target: "http://localhost:8777", changeOrigin: true, rewrite: (p) => p.replace(/^\/api\/firewall/, "") },
      "/api/network/network/portscan": { target: "http://localhost:8775", changeOrigin: true, rewrite: (p) => p.replace(/^\/api\/network\/network\/portscan/, "/scan") },
      "/api/network/analyze":  { target: "http://localhost:5018", changeOrigin: true, rewrite: (p) => p.replace(/^\/api\/network\/analyze/, "/network/analyze") },
      "/api/gobuster":                 { target: "http://localhost:8767", changeOrigin: true, rewrite: (p) => p.replace(/^\/api\/gobuster/, "") },
      "/api/sqlmap":                   { target: "http://localhost:8768", changeOrigin: true, rewrite: (p) => p.replace(/^\/api\/sqlmap/, "") },
      "/api/network/network": {
    target: "http://localhost:8775",
    changeOrigin: true,
    rewrite: (p) => p.replace(/^\/api\/network\/network/, ""),
  },
    "/api/nmap": {
      target: "http://localhost:8773",
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api\/nmap/, "")
    },
      "/api/ddos":                     { target: "http://localhost:8775", changeOrigin: true, rewrite: (p) => p.replace(/^\/api\/ddos/, "") },
      "/api/password":                 { target: "http://localhost:8778", changeOrigin: true, rewrite: (p) => p.replace(/^\/api\/password/, "") },
      "/api/cve":                      { target: "http://localhost:8779", changeOrigin: true, rewrite: (p) => p.replace(/^\/api\/cve/, "") },
      "/api/ssl":                      { target: "http://localhost:8780", changeOrigin: true, rewrite: (p) => p.replace(/^\/api\/ssl/, "") },
    },
  },
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
