
import { db } from '../db';
import { matchesTable, roundsTable } from '../db/schema';
import { type StartMatchInput, type Match } from '../schema';
import { eq } from 'drizzle-orm';

export const startMatch = async (input: StartMatchInput): Promise<Match> => {
  try {
    // First, get the match to verify it exists and is in correct state
    const matches = await db.select()
      .from(matchesTable)
      .where(eq(matchesTable.id, input.match_id))
      .execute();

    if (matches.length === 0) {
      throw new Error('Match not found');
    }

    const match = matches[0];

    if (match.status !== 'upcoming') {
      throw new Error('Match cannot be started - current status is not upcoming');
    }

    // Update match status to ongoing
    const updatedMatches = await db.update(matchesTable)
      .set({
        status: 'ongoing',
        updated_at: new Date()
      })
      .where(eq(matchesTable.id, input.match_id))
      .returning()
      .execute();

    // Create the first round
    await db.insert(roundsTable)
      .values({
        match_id: input.match_id,
        round_number: 1,
        started_at: new Date()
      })
      .execute();

    return updatedMatches[0];
  } catch (error) {
    console.error('Match start failed:', error);
    throw error;
  }
};
