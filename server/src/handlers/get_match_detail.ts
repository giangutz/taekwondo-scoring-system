
import { db } from '../db';
import { matchesTable, roundsTable, scoreEntriesTable, penaltyEntriesTable } from '../db/schema';
import { type MatchDetail } from '../schema';
import { eq, asc } from 'drizzle-orm';

export const getMatchDetail = async (matchId: number): Promise<MatchDetail> => {
  try {
    // Get match data
    const matches = await db.select()
      .from(matchesTable)
      .where(eq(matchesTable.id, matchId))
      .execute();

    if (matches.length === 0) {
      throw new Error(`Match with id ${matchId} not found`);
    }

    const match = matches[0];

    // Get all rounds for this match, ordered by round number
    const rounds = await db.select()
      .from(roundsTable)
      .where(eq(roundsTable.match_id, matchId))
      .orderBy(asc(roundsTable.round_number))
      .execute();

    // Get current round data (if match is ongoing)
    const currentRoundData = rounds.find(round => 
      round.round_number === match.current_round
    ) || null;

    // Get all score entries for this match, ordered by timestamp
    const scoreEntries = await db.select()
      .from(scoreEntriesTable)
      .where(eq(scoreEntriesTable.match_id, matchId))
      .orderBy(asc(scoreEntriesTable.timestamp))
      .execute();

    // Get all penalty entries for this match, ordered by timestamp
    const penaltyEntries = await db.select()
      .from(penaltyEntriesTable)
      .where(eq(penaltyEntriesTable.match_id, matchId))
      .orderBy(asc(penaltyEntriesTable.timestamp))
      .execute();

    return {
      match,
      rounds,
      current_round_data: currentRoundData,
      score_entries: scoreEntries,
      penalty_entries: penaltyEntries
    };
  } catch (error) {
    console.error('Get match detail failed:', error);
    throw error;
  }
};
