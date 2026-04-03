import Match from '../models/Match.js';
import Team from '../models/Team.js';
import Player from '../models/Player.js';
import { AppError } from '../middleware/errorHandler.js';

// ─── Helper: update player stats after match completes ──────────────────────
async function updatePlayerStats(match) {
  for (const innings of match.innings) {
    const batterStats = {}; // playerId -> { runs, balls, fours, sixes, wicket }
    const bowlerStats = {}; // playerId -> { balls, runs, wickets }

    for (const ball of innings.balls) {
      const isLegal = ball.extras.type === 'none' || ball.extras.type === 'bye' || ball.extras.type === 'legBye';
      const batterId = ball.batter?.toString();
      const bowlerId = ball.bowler?.toString();

      // Batting
      if (batterId) {
        if (!batterStats[batterId]) batterStats[batterId] = { runs: 0, balls: 0, fours: 0, sixes: 0, out: false };
        batterStats[batterId].runs += ball.runs;
        if (isLegal) batterStats[batterId].balls += 1;
        if (ball.runs === 4) batterStats[batterId].fours += 1;
        if (ball.runs === 6) batterStats[batterId].sixes += 1;
        if (ball.wicket?.isWicket && ball.wicket.batter?.toString() === batterId) {
          batterStats[batterId].out = true;
        }
      }

      // Bowling
      if (bowlerId) {
        if (!bowlerStats[bowlerId]) bowlerStats[bowlerId] = { balls: 0, runs: 0, wickets: 0 };
        if (isLegal) bowlerStats[bowlerId].balls += 1;
        bowlerStats[bowlerId].runs += ball.runs + (ball.extras.runs || 0);
        if (ball.wicket?.isWicket && !['runOut', 'retired'].includes(ball.wicket.kind)) {
          bowlerStats[bowlerId].wickets += 1;
        }
      }

      // Fielding catches
      if (ball.wicket?.isWicket && ball.wicket.kind === 'caught' && ball.wicket.fielder) {
        await Player.findByIdAndUpdate(ball.wicket.fielder, { $inc: { catches: 1 } });
      }
      // Run outs
      if (ball.wicket?.isWicket && ball.wicket.kind === 'runOut' && ball.wicket.fielder) {
        await Player.findByIdAndUpdate(ball.wicket.fielder, { $inc: { runOuts: 1 } });
      }
    }

    // Persist batting stats
    for (const [id, s] of Object.entries(batterStats)) {
      await Player.findByIdAndUpdate(id, {
        $inc: {
          innings: 1,
          runs: s.runs,
          ballsFaced: s.balls,
          fours: s.fours,
          sixes: s.sixes,
          notOuts: s.out ? 0 : 1,
        },
      });
      // Update high score
      const player = await Player.findById(id);
      if (player && s.runs > player.highScore) {
        player.highScore = s.runs;
        await player.save();
      }
    }

    // Persist bowling stats
    for (const [id, s] of Object.entries(bowlerStats)) {
      await Player.findByIdAndUpdate(id, {
        $inc: { ballsBowled: s.balls, runsConceded: s.runs, wickets: s.wickets },
      });
    }
  }

  // Increment matches played for all players
  const allPlayerIds = new Set();
  for (const innings of match.innings) {
    for (const ball of innings.balls) {
      if (ball.batter) allPlayerIds.add(ball.batter.toString());
      if (ball.bowler) allPlayerIds.add(ball.bowler.toString());
    }
  }
  await Player.updateMany({ _id: { $in: [...allPlayerIds] } }, { $inc: { matches: 1 } });
}

// ─── Helper: Fetch Populated Match ───────────────────────────────────────────
async function getPopulatedMatch(matchId) {
  return Match.findById(matchId)
    .populate('teams.home')
    .populate('teams.away')
    .populate('players.home')
    .populate('players.away')
    .populate('innings.battingTeam', 'name shortName color')
    .populate('innings.bowlingTeam', 'name shortName color')
    .populate('innings.currentStriker')
    .populate('innings.currentNonStriker')
    .populate('innings.currentBowler')
    .populate('innings.balls.batter', 'name')
    .populate('innings.balls.bowler', 'name')
    .populate('innings.balls.wicket.fielder', 'name');
}

// ─── Controllers ─────────────────────────────────────────────────────────────

/** POST /api/matches — create a new match */
export const createMatch = async (req, res, next) => {
  try {
    const { homeTeamId, awayTeamId, homePlayers, awayPlayers, format, maxOvers, venue, title, toss, clientId } = req.body;
    if (!homeTeamId || !awayTeamId) throw new AppError('Both teams are required', 400);

    const match = await Match.create({
      title,
      format,
      maxOvers,
      venue,
      clientId,
      toss,
      teams: { home: homeTeamId, away: awayTeamId },
      players: { home: homePlayers || [], away: awayPlayers || [] },
      innings: [],
      status: 'setup',
    });

    const populatedMatch = await getPopulatedMatch(match._id);
    req.app.get('io').emit('match_list_updated', populatedMatch);
    res.status(201).json({ success: true, data: populatedMatch });
  } catch (err) {
    if (err.code === 11000) return next(new AppError('Match already synced (duplicate clientId)', 409));
    next(err);
  }
};

/** GET /api/matches — list with pagination */
export const getMatches = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [matches, total] = await Promise.all([
      Match.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('teams.home', 'name shortName color')
        .populate('teams.away', 'name shortName color')
        .select('-innings.balls'), // omit ball detail for list view
      Match.countDocuments(),
    ]);

    res.json({ success: true, data: matches, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

/** GET /api/matches/:id — full match with scorecard */
export const getMatch = async (req, res, next) => {
  try {
    const match = await getPopulatedMatch(req.params.id);

    if (!match) throw new AppError('Match not found', 404);
    res.json({ success: true, data: match });
  } catch (err) {
    next(err);
  }
};

/** PATCH /api/matches/:id/start — start match / begin innings */
export const startMatch = async (req, res, next) => {
  try {
    const { battingTeamId, bowlingTeamId } = req.body;
    const match = await Match.findById(req.params.id);
    if (!match) throw new AppError('Match not found', 404);

    match.innings.push({ battingTeam: battingTeamId, bowlingTeam: bowlingTeamId, balls: [] });
    match.status = 'live';
    match.currentInnings = match.innings.length - 1;
    await match.save();

    const populatedMatch = await getPopulatedMatch(match._id);
    console.log(`📢 Emitting match_updated (start): ${match._id.toString()}`);
    const io = req.app.get('io');
    io.to(match._id.toString()).emit('match_updated', populatedMatch);
    io.emit('match_list_updated', populatedMatch); // Global list update
    res.json({ success: true, data: populatedMatch });
  } catch (err) {
    next(err);
  }
};

/** PATCH /api/matches/:id/ball — record a ball */
export const addBall = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) throw new AppError('Match not found', 404);
    if (match.status !== 'live') throw new AppError('Match is not live', 400);

    const inningIdx = match.currentInnings;
    const innings = match.innings[inningIdx];
    if (!innings) throw new AppError('No active innings', 400);

    const { over, ball, batterId, bowlerId, runs, extras, wicket, nextStriker, nextNonStriker, nextBowler } = req.body;

    const ballEvent = {
      over,
      ball,
      batter: batterId,
      bowler: bowlerId,
      runs: runs || 0,
      extras: extras || { type: 'none', runs: 0 },
      wicket: wicket || { isWicket: false },
      // Store state BEFORE this ball to allow Undo
      preStriker: innings.currentStriker,
      preNonStriker: innings.currentNonStriker,
      preBowler: innings.currentBowler,
    };

    innings.balls.push(ballEvent);

    // Update active players based on frontend calculation
    innings.currentStriker = nextStriker || null;
    innings.currentNonStriker = nextNonStriker || null;
    innings.currentBowler = nextBowler || null;

    // Update running totals
    innings.totalRuns += (runs || 0) + (extras?.runs || 0);
    if (wicket?.isWicket && wicket.kind !== 'retired') innings.totalWickets += 1;

    // Count legal balls to determine overs
    const isLegal = !extras || extras.type === 'none' || extras.type === 'bye' || extras.type === 'legBye';
    if (isLegal) {
      const legalBalls = innings.balls.filter(
        (b) => !b.extras?.type || b.extras?.type === 'none' || b.extras?.type === 'bye' || b.extras?.type === 'legBye'
      ).length;
      innings.totalOvers = parseFloat((Math.floor(legalBalls / 6) + (legalBalls % 6) / 10).toFixed(1));
    }

    // Check innings end conditions
    let squadSize = innings.battingTeam.toString() === match.teams.home.toString() 
      ? (match.players.home?.length || 11) : (match.players.away?.length || 11);
    const maxWickets = squadSize > 1 ? squadSize - 1 : 10; // e.g. 6 players = 5 wickets
    
    const legalBallsTotal = innings.balls.filter(
      (b) => !b.extras?.type || b.extras?.type === 'none' || b.extras?.type === 'bye' || b.extras?.type === 'legBye'
    ).length;

    if (innings.totalWickets >= maxWickets || legalBallsTotal >= match.maxOvers * 6) {
      innings.isCompleted = true;
    }

    await match.save();

    const populatedMatch = await getPopulatedMatch(match._id);
    console.log(`📢 Emitting match_updated (ball): ${match._id.toString()}`);
    req.app.get('io').to(match._id.toString()).emit('match_updated', populatedMatch);
    res.json({ success: true, data: populatedMatch });
  } catch (err) {
    next(err);
  }
};

/** PATCH /api/matches/:id/innings-break — switch innings */
export const switchInnings = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) throw new AppError('Match not found', 404);

    const { battingTeamId, bowlingTeamId } = req.body;
    match.innings[match.currentInnings].isCompleted = true;
    match.innings.push({ battingTeam: battingTeamId, bowlingTeam: bowlingTeamId, balls: [] });
    match.currentInnings = match.innings.length - 1;
    match.status = 'live';
    await match.save();

    const populatedMatch = await getPopulatedMatch(match._id);
    console.log(`📢 Emitting match_updated (innings switch): ${match._id.toString()}`);
    req.app.get('io').to(match._id.toString()).emit('match_updated', populatedMatch);
    res.json({ success: true, data: populatedMatch });
  } catch (err) {
    next(err);
  }
};

/** PATCH /api/matches/:id/complete — finalise match and update player stats */
export const completeMatch = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) throw new AppError('Match not found', 404);

    const { winnerId, margin, description } = req.body;
    match.status = 'completed';
    match.result = { winner: winnerId || null, margin: margin || '', description: description || '' };
    match.innings[match.currentInnings].isCompleted = true;
    await match.save();

    // Update player cumulative stats
    await updatePlayerStats(match);

    // Update team win/loss records
    if (winnerId) {
      await Team.findByIdAndUpdate(winnerId, { $inc: { matchesWon: 1, matchesPlayed: 1 } });
      const loserId = winnerId === match.teams.home.toString() ? match.teams.away : match.teams.home;
      await Team.findByIdAndUpdate(loserId, { $inc: { matchesLost: 1, matchesPlayed: 1 } });
    } else {
      // Tie
      await Team.findByIdAndUpdate(match.teams.home, { $inc: { matchesTied: 1, matchesPlayed: 1 } });
      await Team.findByIdAndUpdate(match.teams.away, { $inc: { matchesTied: 1, matchesPlayed: 1 } });
    }

    const populatedMatch = await getPopulatedMatch(match._id);
    console.log(`📢 Emitting match_updated (complete): ${match._id.toString()}`);
    const io = req.app.get('io');
    io.to(match._id.toString()).emit('match_updated', populatedMatch);
    io.emit('match_list_updated', populatedMatch); // Global list update
    res.json({ success: true, data: populatedMatch });
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/matches/:id — remove a match */
export const deleteMatch = async (req, res, next) => {
  try {
    await Match.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Match deleted' });
  } catch (err) {
    next(err);
  }
};
/** POST /api/matches/:id/undo — remove the last ball and revert state */
export const undoBall = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) throw new AppError('Match not found', 404);
    if (match.status !== 'live') throw new AppError('Match is not live', 400);

    const inningIdx = match.currentInnings;
    const innings = match.innings[inningIdx];
    if (!innings || innings.balls.length === 0) {
      throw new AppError('No balls to undo', 400);
    }

    // 1. Get the last ball before removing it
    const lastBall = innings.balls.pop();

    // 2. Revert totals
    innings.totalRuns -= (lastBall.runs || 0) + (lastBall.extras?.runs || 0);
    if (lastBall.wicket?.isWicket && lastBall.wicket.kind !== 'retired') innings.totalWickets -= 1;

    // 3. Revert Player positions to "Pre-Ball" state
    innings.currentStriker = lastBall.preStriker;
    innings.currentNonStriker = lastBall.preNonStriker;
    innings.currentBowler = lastBall.preBowler;

    // 4. Recalculate Overs
    const legalBalls = innings.balls.filter(
      (b) => !b.extras?.type || b.extras?.type === 'none' || b.extras?.type === 'bye' || b.extras?.type === 'legBye'
    ).length;
    innings.totalOvers = parseFloat((Math.floor(legalBalls / 6) + (legalBalls % 6) / 10).toFixed(1));

    // 5. Ensure match is not completed if we undo the final ball
    innings.isCompleted = false;

    await match.save();

    const populatedMatch = await getPopulatedMatch(match._id);
    const io = req.app.get('io');
    io.to(match._id.toString()).emit('match_updated', populatedMatch);

    res.status(200).json({ success: true, data: populatedMatch });
  } catch (err) {
    next(err);
  }
};
