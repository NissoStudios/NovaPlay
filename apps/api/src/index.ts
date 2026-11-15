import { createServer } from "node:http";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { NovaPlayDatabase } from "./database.js";

const config = loadConfig();
const database = new NovaPlayDatabase(config.databasePath);
const app = createApp({ database, config });
const server = createServer(app);

server.listen(config.port, "127.0.0.1", () => {
  console.log(`[NovaPlay] API disponible sur http://127.0.0.1:${config.port}`);
});

function shutdown(signal: string): void {
  console.log(`[NovaPlay] Arrêt demandé (${signal})`);
  server.close((error) => {
    database.close();
    if (error) {
      console.error("[NovaPlay] Échec de l’arrêt du serveur", error);
      process.exitCode = 1;
    }
  });
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
