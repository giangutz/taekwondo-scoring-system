
import { db } from '../db';
import { matchesTable } from '../db/schema';
import { type PauseMatchInput, type Match } from '../schema';
import { eq } from 'drizzle-orm';

export const pauseMatch = async (input: PauseMatchInput): Promise<Match> => {
  try {
    // First check if match exists and is in correct state
    const existingMatch = await db.select()
      .from(matchesTable)
      .where(eq(matchesTable.id, input.match_id))
      .execute();

    if (existingMatch.length === 0) {
      throw new Error('Match not found');
    }

    const match = existingMatch[0];

    // Can only pause ongoing matches
    if (match.status !== 'ongoing') {
      throw new Error('Can only pause ongoing matches');
    }

    // Update match status to paused
    const result = await db.update(matchesTable)
      .set({
        status: 'paused',
        updated_at: new Date()
      })
      .where(eq(matchesTable.id, input.match_id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Match pause failed:', error);
    throw error;
  }
};
