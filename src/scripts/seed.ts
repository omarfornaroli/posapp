
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { runSeedOperations } from '../lib/seedCore'; 
// We don't import dbConnect from lib because this is a standalone script
// that needs to manage its own connection lifecycle.

dotenv.config({ path: './.env.local' });

async function seedDatabase() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI || MONGODB_URI.includes('YOUR_MONGODB_CONNECTION_STRING')) {
    console.error('\n❌ Cannot run manual seed. MONGODB_URI is not configured in .env.local.');
    process.exit(1);
  }

  console.log('Attempting to connect to database for manual seed...');
  
  try {
    await mongoose.connect(MONGODB_URI!);
    console.log('Database connected for manual seed.');
    console.log('Forcing seed operations...');
    await runSeedOperations();
    console.log('✅ Manual seeding completed successfully!');
  } catch (error) {
    console.error('Error during manual database seed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed by manual seed script.');
  }
}

seedDatabase();
