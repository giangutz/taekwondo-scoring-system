
import { db } from '../db';
import { matchesTable, roundsTable, scoreEntriesTable, penaltyEntriesTable } from '../db/schema';
import { type EndRoundInput, type MatchDetail } from '../schema';
import { eq, and } from 'drizzle-orm';

// Score point values based on technique
const SCORE_POINTS: Record<string, number> = {
  punch: 1,
  body_kick: 2,
  head_kick: 3,
  turning_body_kick: 4,
  turning_head_kick: 5
};

export const endRound = async (input: EndRoundInput): Promise<MatchDetail> => {
  try {
    // Get the current match
    const matches = await db.select()
      .from(matchesTable)
      .where(eq(matchesTable.id, input.match_id))
      .execute();

    if (matches.length === 0) {
      throw new Error('Match not found');
    }

    const match = matches[0];

    if (match.status !== 'ongoing') {
      throw new Error('Match is not currently ongoing');
    }

    // Get the current round
    const currentRounds = await db.select()
      .from(roundsTable)
      .where(and(
        eq(roundsTable.match_id, input.match_id),
        eq(roundsTable.round_number, match.current_round)
      ))
      .execute();

    if (currentRounds.length === 0) {
      throw new Error('Current round not found');
    }

    const currentRound = currentRounds[0];

    if (currentRound.ended_at !== null) {
      throw new Error('Current round has already ended');
    }

    // Calculate scores for the current round
    const scoreEntries = await db.select()
      .from(scoreEntriesTable)
      .where(eq(scoreEntriesTable.round_id, currentRound.id))
      .execute();

    const penaltyEntries = await db.select()
      .from(penaltyEntriesTable)
      .where(eq(penaltyEntriesTable.round_id, currentRound.id))
      .execute();

    // Calculate round scores from score entries only
    let redRoundScore = 0;
    let blueRoundScore = 0;

    // Sum up scores by color
    for (const entry of scoreEntries) {
      const points = SCORE_POINTS[entry.score_type];
      if (entry.competitor_color === 'red') {
        redRoundScore += points;
      } else {
        blueRoundScore += points;
      }
    }

    // Count penalties
    let redPenalties = 0;
    let bluePenalties = 0;

    for (const penalty of penaltyEntries) {
      if (penalty.competitor_color === 'red') {
        redPenalties += 1;
      } else {
        bluePenalties += 1;
      }
    }

    // Add penalty points to opponent's score (penalties are already added in add_penalty handler)
    // We use the current round scores which already include penalty points
    const finalRedScore = currentRound.red_score;
    const finalBlueScore = currentRound.blue_score;

    // Determine round winner based on 5-penalty rule first
    let roundWinner: 'red' | 'blue' | null = null;
    if (redPenalties >= 5) {
      roundWinner = 'blue';
    } else if (bluePenalties >= 5) {
      roundWinner = 'red';
    } else {
      // No 5-penalty rule triggered, determine by score comparison
      if (finalRedScore > finalBlueScore) {
        roundWinner = 'red';
      } else if (finalBlueScore > finalRedScore) {
        roundWinner = 'blue';
      }
    }

    // End the current round - calculate duration
    const now = new Date();
    const durationSeconds = currentRound.started_at 
      ? Math.floor((now.getTime() - currentRound.started_at.getTime()) / 1000)
      : 0;

    await db.update(roundsTable)
      .set({
        red_score: finalRedScore,
        blue_score: finalBlueScore,
        red_penalties: redPenalties,
        blue_penalties: bluePenalties,
        winner_color: roundWinner,
        ended_at: now,
        duration_seconds: durationSeconds
      })
      .where(eq(roundsTable.id, currentRound.id))
      .execute();

    // Update match total scores (use current match totals which already include penalty points)
    const newRedTotal = match.red_total_score;
    const newBlueTotal = match.blue_total_score;

    // Determine if match should continue or end
    let newStatus: 'ongoing' | 'completed' = match.status;
    let newCurrentRound = match.current_round;
    let matchWinner: 'red' | 'blue' | null = null;

    if (match.current_round >= match.total_rounds) {
      // Match is complete
      newStatus = 'completed';
      if (newRedTotal > newBlueTotal) {
        matchWinner = 'red';
      } else if (newBlueTotal > newRedTotal) {
        matchWinner = 'blue';
      }
    } else {
      // Advance to next round
      newCurrentRound = match.current_round + 1;
      
      // Create the next round
      await db.insert(roundsTable)
        .values({
          match_id: input.match_id,
          round_number: newCurrentRound
        })
        .execute();
    }

    // Update match
    await db.update(matchesTable)
      .set({
        current_round: newCurrentRound,
        status: newStatus,
        winner_color: matchWinner,
        updated_at: now
      })
      .where(eq(matchesTable.id, input.match_id))
      .execute();

    // Return complete match details
    const updatedMatch = await db.select()
      .from(matchesTable)
      .where(eq(matchesTable.id, input.match_id))
      .execute();

    const allRounds = await db.select()
      .from(roundsTable)
      .where(eq(roundsTable.match_id, input.match_id))
      .execute();

    const currentRoundData = newStatus === 'completed' ? null : 
      allRounds.find(r => r.round_number === newCurrentRound) || null;

    const allScoreEntries = await db.select()
      .from(scoreEntriesTable)
      .where(eq(scoreEntriesTable.match_id, input.match_id))
      .execute();

    const allPenaltyEntries = await db.select()
      .from(penaltyEntriesTable)
      .where(eq(penaltyEntriesTable.match_id, input.match_id))
      .execute();

    return {
      match: updatedMatch[0],
      rounds: allRounds,
      current_round_data: currentRoundData,
      score_entries: allScoreEntries,
      penalty_entries: allPenaltyEntries
    };
  } catch (error) {
    console.error('End round failed:', error);
    throw error;
  }
};
