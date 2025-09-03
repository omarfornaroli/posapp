import mongoose from 'mongoose';
import { runSeedOperations } from './seedCore';
import '@/models/User';

mongoose.set('bufferCommands', false);

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null, seedPromise: null };
}

async function dbConnect() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI || MONGODB_URI.includes('YOUR_MONGODB_CONNECTION_STRING')) {
    console.warn('\n⚠️  MONGODB_URI is not configured in .env.local. Database features will not work.');
    return null;
  }

  if (cached.conn) {
    // If we have a connection, we still need to ensure seeding is complete.
    if (cached.seedPromise) {
      await cached.seedPromise;
    }
    return cached.conn;
  }

  if (!cached.promise) {
    console.log('Establishing new database connection...');
    const opts = {
      bufferCommands: false,
    };
    cached.promise = mongoose.connect(MONGODB_URI!, opts).then(mongoose => {
        // Once connected, trigger the seeding operation.
        // We do this here to ensure it only runs once per connection lifecycle.
        if (!cached.seedPromise) {
            console.log('Database connected. Starting seed operations...');
            cached.seedPromise = runSeedOperations().then(() => {
                console.log('Seed operations completed.');
            }).catch(seedErr => {
                console.error("Critical error during seeding process:", seedErr);
                // Decide if the app should fail to start if seeding fails.
                // For now, we log the error and continue.
            });
        }
        return mongoose;
    }).catch(err => {
      console.error("\n❌ Mongoose connection error: " + err.message);
      console.error("Ensure your MongoDB server is running and the MONGODB_URI in .env.local is correct.\n");
      cached.promise = null;
      return null;
    });
  }

  try {
    cached.conn = await cached.promise;
    if (!cached.conn) {
      return null; // Connection failed
    }

    // After getting the connection, always wait for the seeding to finish.
    if (cached.seedPromise) {
      await cached.seedPromise;
    }
    
  } catch (e) {
    cached.promise = null; // Reset promise on error to allow retries
    console.error("An error occurred during DB connection handling:", e);
    return null;
  }

  return cached.conn;
}

export default dbConnect;
