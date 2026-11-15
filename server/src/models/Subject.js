import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100, unique: true },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
    order: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

subjectSchema.set('toJSON', {
  transform: (_d, ret) => {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Subject = mongoose.model('Subject', subjectSchema);
