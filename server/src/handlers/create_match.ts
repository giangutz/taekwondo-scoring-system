
import { db } from '../db';
import { matchesTable } from '../db/schema';
import { type CreateMatchInput, type Match } from '../schema';

export const createMatch = async (input: CreateMatchInput): Promise<Match> => {
  try {
    // Insert match record
    const result = await db.insert(matchesTable)
      .values({
        weight_category: input.weight_category,
        red_competitor_name: input.red_competitor_name,
        red_competitor_country: input.red_competitor_country,
        blue_competitor_name: input.blue_competitor_name,
        blue_competitor_country: input.blue_competitor_country,
        total_rounds: input.total_rounds,
        round_duration_minutes: Math.round(input.round_duration_minutes) // Ensure integer for database
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Match creation failed:', error);
    throw error;
  }
};
