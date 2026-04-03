import mongoose from 'mongoose';

/**
 * Player schema — stores cumulative career stats.
 * Strike rate, average, and economy are computed as virtuals.
 */
const playerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    nickname: { type: String, trim: true },
    avatar: { type: String, default: '' }, // emoji or color code for avatar
    // Batting
    matches: { type: Number, default: 0 },
    innings: { type: Number, default: 0 },
    notOuts: { type: Number, default: 0 },
    runs: { type: Number, default: 0 },
    ballsFaced: { type: Number, default: 0 },
    highScore: { type: Number, default: 0 },
    fours: { type: Number, default: 0 },
    sixes: { type: Number, default: 0 },
    // Bowling
    wickets: { type: Number, default: 0 },
    ballsBowled: { type: Number, default: 0 },
    runsConceded: { type: Number, default: 0 },
    maidens: { type: Number, default: 0 },
    // Fielding
    catches: { type: Number, default: 0 },
    runOuts: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Virtuals ────────────────────────────────────────────────────────────────
playerSchema.virtual('strikeRate').get(function () {
  if (!this.ballsFaced) return 0;
  return parseFloat(((this.runs / this.ballsFaced) * 100).toFixed(2));
});

playerSchema.virtual('battingAverage').get(function () {
  const dismissals = this.innings - this.notOuts;
  if (!dismissals) return this.runs || 0;
  return parseFloat((this.runs / dismissals).toFixed(2));
});

playerSchema.virtual('economy').get(function () {
  const overs = this.ballsBowled / 6;
  if (!overs) return 0;
  return parseFloat((this.runsConceded / overs).toFixed(2));
});

playerSchema.virtual('bowlingAverage').get(function () {
  if (!this.wickets) return 0;
  return parseFloat((this.runsConceded / this.wickets).toFixed(2));
});

export default mongoose.model('Player', playerSchema);
