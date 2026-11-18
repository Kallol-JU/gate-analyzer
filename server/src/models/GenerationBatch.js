import mongoose from 'mongoose';

const { Schema } = mongoose;

/** One admin request to the AI generator, kept as an audit trail and a progress record. */
const batchSchema = new Schema(
  {
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    params: { type: Schema.Types.Mixed, required: true }, // subject, topic, counts, difficulty, style, concepts, reference
    model: String,
    promptVersion: String,
    status: { type: String, enum: ['running', 'completed', 'partial', 'failed'], default: 'running' },
    requested: { type: Number, required: true },
    saved: { type: Number, default: 0 }, // drafts created
    flagged: { type: Number, default: 0 }, // saved, but the independent solver disagreed or found it ambiguous
    rejectedCount: { type: Number, default: 0 }, // failed validation, not saved
    rejected: [new Schema({ reason: String, detail: String, snippet: String }, { _id: false })],
    questionIds: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
    usage: { calls: { type: Number, default: 0 }, promptTokens: { type: Number, default: 0 }, outputTokens: { type: Number, default: 0 } },
    error: String,
    startedAt: { type: Date, default: Date.now },
    finishedAt: Date,
  },
  { timestamps: true },
);

batchSchema.index({ createdBy: 1, createdAt: -1 });
batchSchema.index({ status: 1 });

export const GenerationBatch = mongoose.model('GenerationBatch', batchSchema);
