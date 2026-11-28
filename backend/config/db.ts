import mongoose from 'mongoose';

let mongoReady = false;

export async function connectDatabase(): Promise<boolean> {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    console.log('[BookHaven DB] MONGODB_URI not provided — running with local transactional persistence.');
    mongoReady = false;
    return false;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    mongoReady = true;
    console.log(`[BookHaven DB] Connected to MongoDB: ${mongoose.connection.host}`);
    return true;
  } catch (err) {
    console.warn('[BookHaven DB] MongoDB connection failed, falling back to local transactional persistence:', (err as Error).message);
    mongoReady = false;
    return false;
  }
}

export function isMongoConnected(): boolean {
  return mongoReady && mongoose.connection.readyState === 1;
}
