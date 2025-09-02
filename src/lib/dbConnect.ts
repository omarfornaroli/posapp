import mongoose from 'mongoose';
import { runSeedOperations } from './seedCore'; // Import the seeder
import '@/models/User'; // Explicitly import to ensure model is registered

// Disable Mongoose's buffering. If not connected, operations will fail immediately.
mongoose.set('bufferCommands', false);

// Cache the Mongoose connection and promise over multiple requests in development.
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI || MONGODB_URI.includes('YOUR_MONGODB_CONNECTION_STRING')) {
    console.warn('\n⚠️  MONGODB_URI is not configured in .env.local. Database features will not work.');
    return null; // Return null to indicate no connection, prevents app from crashing.
  }
  
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };
    cached.promise = mongoose.connect(MONGODB_URI!, opts).catch(err => {
      console.error("\n❌ Mongoose connection error: " + err.message);
      console.error("Ensure your MongoDB server is running and the MONGODB_URI in .env.local is correct.\n");
      cached.promise = null; // Allow retry on next call
      return null;
    });
  }

  try {
    cached.conn = await cached.promise;
    if (!cached.conn) {
      return null;
    }
    
    // Always run the seed operations on connection. 
    // The seedCore function now handles the logic to prevent overwriting user data.
    console.log('Database connected. Running seed operations...');
    await runSeedOperations();
    console.log('Seed operations completed.');
    
  } catch (e) {
    cached.promise = null;
    console.error("An error occurred during DB connection or seeding:", e);
    return null;
  }

  return cached.conn;
}

export default dbConnect;
