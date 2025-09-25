import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password_hash: string;
  name: string;
  role: 'admin' | 'instructor' | 'student';
  created_at: Date;
  updated_at: Date;
}

const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  password_hash: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'instructor', 'student'],
    default: 'student',
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

userSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

userSchema.index({ email: 1 });
userSchema.index({ role: 1 });

export const User = model<IUser>('User', userSchema);
