
import { db } from '../db';
import { matchesTable } from '../db/schema';
import { type ResumeMatchInput, type Match } from '../schema';
import { eq } from 'drizzle-orm';

export const resumeMatch = async (input: ResumeMatchInput): Promise<Match> => {
  try {
    // First, check if the match exists and is paused
    const existingMatches = await db.select()
      .from(matchesTable)
      .where(eq(matchesTable.id, input.match_id))
      .execute();

    if (existingMatches.length === 0) {
      throw new Error('Match not found');
    }

    const match = existingMatches[0];

    if (match.status !== 'paused') {
      throw new Error('Match is not paused');
    }

    // Resume the match by setting status to ongoing
    const result = await db.update(matchesTable)
      .set({
        status: 'ongoing',
        updated_at: new Date()
      })
      .where(eq(matchesTable.id, input.match_id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Resume match failed:', error);
    throw error;
  }
};
