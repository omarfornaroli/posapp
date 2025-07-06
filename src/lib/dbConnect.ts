import mongoose from 'mongoose';
import { runSeedOperations } from './seedCore'; // Import the seeder

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
    
    // Check if seeding is needed by checking a key collection (e.g., users)
    const userCount = await mongoose.models.User.countDocuments();
    if (userCount === 0) {
      console.log('No users found. Running initial database seed...');
      await runSeedOperations();
      console.log('Database seeding completed.');
    }
    
  } catch (e) {
    cached.promise = null;
    console.error("An error occurred during DB connection or seeding:", e);
    return null;
  }

  return cached.conn;
}

export default dbConnect;
