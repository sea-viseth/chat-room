import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

export default () => {
  return mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch((err) => console.error('❌ MongoDB error:', err));
};
