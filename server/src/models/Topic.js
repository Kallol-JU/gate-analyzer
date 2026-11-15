import mongoose from 'mongoose';

const topicSchema = new mongoose.Schema(
  {
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, trim: true, lowercase: true },
  },
  { timestamps: true },
);

topicSchema.index({ subjectId: 1, slug: 1 }, { unique: true });

topicSchema.set('toJSON', {
  transform: (_d, ret) => {
    ret.id = String(ret._id);
    ret.subjectId = String(ret.subjectId);
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Topic = mongoose.model('Topic', topicSchema);
