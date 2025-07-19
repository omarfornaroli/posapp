
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { runSeedOperations } from '../lib/seedCore'; 
import dbConnect from '../lib/dbConnect';

dotenv.config({ path: process.cwd() + '/.env.local' });

async function seedDatabase() {
  try {
    console.log('Connecting to database for manual seed...');
    await dbConnect(); 
    console.log('Database connected. Starting manual seed via script...');
    
    // Now run the seed operations explicitly
    await runSeedOperations();
    
    console.log('Database seeding completed successfully via manual script!');
  } catch (error) {
    console.error('Error seeding database via manual script:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed by manual seed script.');
  }
}

seedDatabase();
