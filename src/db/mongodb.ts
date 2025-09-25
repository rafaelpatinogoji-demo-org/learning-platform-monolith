import mongoose from 'mongoose';
import { config } from '../config';

let isConnected = false;

export const connectMongoDB = async (): Promise<void> => {
  if (isConnected) {
    return;
  }

  try {
    const mongoUrl = config.mongodbAuthUrl;
    if (!mongoUrl) {
      throw new Error('MONGODB_AUTH_URL environment variable is required');
    }

    await mongoose.connect(mongoUrl);
    isConnected = true;
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

export const disconnectMongoDB = async (): Promise<void> => {
  if (!isConnected) {
    return;
  }

  try {
    await mongoose.disconnect();
    isConnected = false;
    console.log('MongoDB disconnected successfully');
  } catch (error) {
    console.error('MongoDB disconnection error:', error);
    throw error;
  }
};

export { mongoose };
