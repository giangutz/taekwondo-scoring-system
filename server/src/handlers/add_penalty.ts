
import { db } from '../db';
import { matchesTable, roundsTable, penaltyEntriesTable, scoreEntriesTable } from '../db/schema';
import { type AddPenaltyInput, type MatchDetail } from '../schema';
import { eq, and, desc } from 'drizzle-orm';

export const addPenalty = async (input: AddPenaltyInput): Promise<MatchDetail> => {
  try {
    // Get the match and verify it exists and is ongoing
    const matches = await db.select()
      .from(matchesTable)
      .where(eq(matchesTable.id, input.match_id))
      .execute();

    if (matches.length === 0) {
      throw new Error('Match not found');
    }

    const match = matches[0];
    if (match.status !== 'ongoing') {
      throw new Error('Cannot add penalty to a match that is not ongoing');
    }

    // Get the current round
    const rounds = await db.select()
      .from(roundsTable)
      .where(and(
        eq(roundsTable.match_id, input.match_id),
        eq(roundsTable.round_number, match.current_round)
      ))
      .execute();

    if (rounds.length === 0) {
      throw new Error('Current round not found');
    }

    const currentRound = rounds[0];

    // Add the penalty entry
    await db.insert(penaltyEntriesTable)
      .values({
        match_id: input.match_id,
        round_id: currentRound.id,
        competitor_color: input.competitor_color,
        penalty_type: input.penalty_type
      })
      .execute();

    // Update round penalty counts and add 1 point to opponent's score
    let roundUpdates: any = {};
    let matchUpdates: any = {};

    if (input.competitor_color === 'red') {
      // Red gets penalty, blue gets +1 point
      roundUpdates = {
        red_penalties: currentRound.red_penalties + 1,
        blue_score: currentRound.blue_score + 1
      };
      matchUpdates = {
        blue_total_score: match.blue_total_score + 1,
        updated_at: new Date()
      };
    } else {
      // Blue gets penalty, red gets +1 point
      roundUpdates = {
        blue_penalties: currentRound.blue_penalties + 1,
        red_score: currentRound.red_score + 1
      };
      matchUpdates = {
        red_total_score: match.red_total_score + 1,
        updated_at: new Date()
      };
    }

    // Update round scores and penalty counts
    await db.update(roundsTable)
      .set(roundUpdates)
      .where(eq(roundsTable.id, currentRound.id))
      .execute();

    // Update match total scores
    await db.update(matchesTable)
      .set(matchUpdates)
      .where(eq(matchesTable.id, input.match_id))
      .execute();

    // Return complete match details
    return await getMatchDetails(input.match_id);
  } catch (error) {
    console.error('Add penalty failed:', error);
    throw error;
  }
};

const getMatchDetails = async (matchId: number): Promise<MatchDetail> => {
  // Get match
  const matches = await db.select()
    .from(matchesTable)
    .where(eq(matchesTable.id, matchId))
    .execute();

  const match = matches[0];

  // Get all rounds
  const rounds = await db.select()
    .from(roundsTable)
    .where(eq(roundsTable.match_id, matchId))
    .orderBy(desc(roundsTable.round_number))
    .execute();

  // Get current round data
  const currentRoundData = rounds.find(r => r.round_number === match.current_round) || null;

  // Get all score entries
  const scoreEntries = await db.select()
    .from(scoreEntriesTable)
    .where(eq(scoreEntriesTable.match_id, matchId))
    .execute();

  // Get all penalty entries
  const penaltyEntries = await db.select()
    .from(penaltyEntriesTable)
    .where(eq(penaltyEntriesTable.match_id, matchId))
    .execute();

  return {
    match,
    rounds: rounds.reverse(), // Return in ascending order
    current_round_data: currentRoundData,
    score_entries: scoreEntries,
    penalty_entries: penaltyEntries
  };
};
