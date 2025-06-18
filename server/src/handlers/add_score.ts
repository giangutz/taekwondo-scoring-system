
import { db } from '../db';
import { matchesTable, roundsTable, scoreEntriesTable, penaltyEntriesTable } from '../db/schema';
import { type AddScoreInput, type MatchDetail } from '../schema';
import { eq, and } from 'drizzle-orm';

const SCORE_POINTS: Record<string, number> = {
  punch: 1,
  body_kick: 2,
  head_kick: 3,
  turning_body_kick: 4,
  turning_head_kick: 5
};

export const addScore = async (input: AddScoreInput): Promise<MatchDetail> => {
  try {
    // Get match and verify it's ongoing
    const matches = await db.select()
      .from(matchesTable)
      .where(eq(matchesTable.id, input.match_id))
      .execute();

    if (matches.length === 0) {
      throw new Error('Match not found');
    }

    const match = matches[0];
    if (match.status !== 'ongoing') {
      throw new Error('Match is not ongoing');
    }

    // Get current round
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
    const points = SCORE_POINTS[input.score_type];

    // Add score entry
    await db.insert(scoreEntriesTable)
      .values({
        match_id: input.match_id,
        round_id: currentRound.id,
        competitor_color: input.competitor_color,
        score_type: input.score_type,
        points: points
      })
      .execute();

    // Update round scores
    const updatedRoundValues = input.competitor_color === 'red' 
      ? { red_score: currentRound.red_score + points }
      : { blue_score: currentRound.blue_score + points };

    await db.update(roundsTable)
      .set(updatedRoundValues)
      .where(eq(roundsTable.id, currentRound.id))
      .execute();

    // Update match total scores
    const updatedMatchValues = input.competitor_color === 'red'
      ? { red_total_score: match.red_total_score + points }
      : { blue_total_score: match.blue_total_score + points };

    await db.update(matchesTable)
      .set({
        ...updatedMatchValues,
        updated_at: new Date()
      })
      .where(eq(matchesTable.id, input.match_id))
      .execute();

    // Get updated match details
    const [updatedMatch] = await db.select()
      .from(matchesTable)
      .where(eq(matchesTable.id, input.match_id))
      .execute();

    const rounds = await db.select()
      .from(roundsTable)
      .where(eq(roundsTable.match_id, input.match_id))
      .execute();

    const [updatedCurrentRound] = await db.select()
      .from(roundsTable)
      .where(eq(roundsTable.id, currentRound.id))
      .execute();

    const scoreEntries = await db.select()
      .from(scoreEntriesTable)
      .where(eq(scoreEntriesTable.match_id, input.match_id))
      .execute();

    const penaltyEntries = await db.select()
      .from(penaltyEntriesTable)
      .where(eq(penaltyEntriesTable.match_id, input.match_id))
      .execute();

    return {
      match: updatedMatch,
      rounds: rounds,
      current_round_data: updatedCurrentRound,
      score_entries: scoreEntries,
      penalty_entries: penaltyEntries
    };
  } catch (error) {
    console.error('Add score failed:', error);
    throw error;
  }
};
