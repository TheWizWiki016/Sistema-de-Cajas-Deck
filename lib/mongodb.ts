import { MongoClient, type Db } from "mongodb"

function getMongoUri(): string {
  if (!process.env.MONGODB_URI) {
    throw new Error("Please add your MongoDB URI to .env.local")
  }
  return process.env.MONGODB_URI
}

const options = {}

let client: MongoClient
let clientPromise: Promise<MongoClient>

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

function initializeClient(): Promise<MongoClient> {
  const uri = getMongoUri()

  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri, options)
      global._mongoClientPromise = client.connect()
    }
    return global._mongoClientPromise
  } else {
    client = new MongoClient(uri, options)
    return client.connect()
  }
}

export async function getDb(): Promise<Db> {
  if (!clientPromise) {
    clientPromise = initializeClient()
  }
  const client = await clientPromise
  return client.db("button_dashboard")
}

export default async function getClientPromise(): Promise<MongoClient> {
  if (!clientPromise) {
    clientPromise = initializeClient()
  }
  return clientPromise
}
