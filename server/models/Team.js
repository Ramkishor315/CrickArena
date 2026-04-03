import mongoose from 'mongoose';

/**
 * Team schema — a named group of players.
 * Players stored as refs, allowing reuse across matches.
 */
const teamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    shortName: { type: String, trim: true, maxlength: 4 }, // e.g. "IND"
    color: { type: String, default: '#f97316' }, // team color for UI
    players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
    // Aggregate team stats
    matchesPlayed: { type: Number, default: 0 },
    matchesWon: { type: Number, default: 0 },
    matchesLost: { type: Number, default: 0 },
    matchesTied: { type: Number, default: 0 },
  },
  { timestamps: true }
);

teamSchema.virtual('winPercentage').get(function () {
  if (!this.matchesPlayed) return 0;
  return parseFloat(((this.matchesWon / this.matchesPlayed) * 100).toFixed(1));
});

export default mongoose.model('Team', teamSchema);
