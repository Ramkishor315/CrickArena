import mongoose from 'mongoose';

/**
 * A single ball delivery event
 */
const ballEventSchema = new mongoose.Schema({
  over: { type: Number, required: true },       // 0-indexed over number
  ball: { type: Number, required: true },        // 1-indexed delivery in over
  batter: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
  bowler: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
  runs: { type: Number, default: 0 },           // runs off bat
  extras: {
    type: { type: String, enum: ['wide', 'noBall', 'bye', 'legBye', 'none'], default: 'none' },
    runs: { type: Number, default: 0 },
  },
  wicket: {
    isWicket: { type: Boolean, default: false },
    kind: { type: String, enum: ['bowled', 'caught', 'runOut', 'lbw', 'stumped', 'hitWicket', 'retired', ''] , default: '' },
    fielder: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
    batter: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
  },
  // Memory for Undo: capture state BEFORE this ball
  preStriker: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
  preNonStriker: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
  preBowler: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

/**
 * Innings sub-document
 */
const inningsSchema = new mongoose.Schema({
  battingTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  bowlingTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  currentStriker: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
  currentNonStriker: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
  currentBowler: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
  balls: [ballEventSchema],
  totalRuns: { type: Number, default: 0 },
  totalWickets: { type: Number, default: 0 },
  totalOvers: { type: Number, default: 0 },   // overs completed (float e.g. 5.3)
  extras: { type: Number, default: 0 },
  isCompleted: { type: Boolean, default: false },
}, { _id: false });

/**
 * Match schema — top-level document for a cricket match
 */
const matchSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true },         // optional friendly name
    format: {
      type: String,
      enum: ['T20', '10-overs', '6-overs', '5-overs', 'custom'],
      default: '6-overs',
    },
    maxOvers: { type: Number, default: 6 },
    teams: {
      home: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
      away: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    },
    players: {
      home: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
      away: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
    },
    toss: {
      winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
      elected: { type: String, enum: ['bat', 'bowl', ''] , default: '' },
    },
    innings: [inningsSchema],                    // max 2
    currentInnings: { type: Number, default: 0 }, // 0 or 1
    status: {
      type: String,
      enum: ['setup', 'live', 'innings-break', 'completed', 'abandoned'],
      default: 'setup',
    },
    result: {
      winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
      margin: { type: String, default: '' },    // e.g. "5 wickets" or "23 runs"
      description: { type: String, default: '' },
    },
    venue: { type: String, trim: true, default: 'Local Ground' },
    // Offline support
    offlineCreated: { type: Boolean, default: false },
    clientId: { type: String },                 // device-generated ID for dedup
    syncedAt: { type: Date },
  },
  { timestamps: true }
);

// Unique constraint on clientId to prevent duplicate offline syncs
matchSchema.index({ clientId: 1 }, { unique: true, sparse: true });

export default mongoose.model('Match', matchSchema);
