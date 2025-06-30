import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  name: { type: String, unique: true },
  messages: [
    {
      sender: String,
      text: String,
      timestamp: { type: Date, default: Date.now }
    }
  ]
});
export default mongoose.model('rooms', roomSchema);
