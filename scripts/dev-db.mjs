// A real local MongoDB for development, with no Docker or install needed.
// First run downloads the mongod binary (~100MB, cached). By default NOTHING is kept: data lives in a temp folder that is
// deleted when you stop it (your real data is in Atlas).
//   pnpm db:dev                   -> throwaway mongodb://127.0.0.1:27017
//   PORT=27018 pnpm db:dev        -> another port
//   PERSIST=1 pnpm db:dev         -> opt in to keeping data on this computer in .data/mongo
import { MongoMemoryServer } from "mongodb-memory-server";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

process.env.MONGOMS_DISTRO ??= "ubuntu-22.04"; // Mint/Debian derivatives aren't auto-detected
process.env.MONGOMS_VERSION ??= "7.0.14";

const port = Number(process.env.PORT ?? 27017);
const ephemeral = !process.env.PERSIST;
const dbPath = resolve(".data/mongo");
if (!ephemeral) mkdirSync(dbPath, { recursive: true });

const server = await MongoMemoryServer.create({
  instance: { port, ip: "127.0.0.1", ...(ephemeral ? {} : { dbPath, storageEngine: "wiredTiger" }) },
});
console.log(`MongoDB ready: ${server.getUri()}  (${ephemeral ? "ephemeral" : dbPath})`);
console.log(`Set MONGODB_URI=${server.getUri()} in apps/web/.env.local`);

const stop = async () => {
  await server.stop({ doCleanup: ephemeral });
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
setInterval(() => {}, 1 << 30);
