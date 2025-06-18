
import { db } from '../db';
import { matchesTable } from '../db/schema';
import { type Match } from '../schema';
import { desc } from 'drizzle-orm';

export const getMatches = async (): Promise<Match[]> => {
  try {
    const results = await db.select()
      .from(matchesTable)
      .orderBy(desc(matchesTable.created_at))
      .execute();

    return results.map(match => ({
      ...match,
      // Ensure numeric fields are properly typed
      // All integer fields are already numbers from the database
      round_duration_minutes: match.round_duration_minutes
    }));
  } catch (error) {
    console.error('Get matches failed:', error);
    throw error;
  }
};
