import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

if (!uri) {
  throw new Error("MONGODB_URI is not set.");
}

if (!dbName) {
  throw new Error("MONGODB_DB is not set.");
}

let client: MongoClient;

declare global {
  // eslint-disable-next-line no-var
  var __mongoClient: MongoClient | undefined;
}

if (process.env.NODE_ENV === "development") {
  if (!global.__mongoClient) {
    global.__mongoClient = new MongoClient(uri);
  }
  client = global.__mongoClient;
} else {
  client = new MongoClient(uri);
}

export async function getDb() {
  await client.connect();
  return client.db(dbName);
}
