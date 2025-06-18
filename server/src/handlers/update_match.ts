
import { db } from '../db';
import { matchesTable } from '../db/schema';
import { type UpdateMatchInput, type Match } from '../schema';
import { eq } from 'drizzle-orm';

export const updateMatch = async (input: UpdateMatchInput): Promise<Match> => {
  try {
    // Check if match exists
    const existingMatch = await db.select()
      .from(matchesTable)
      .where(eq(matchesTable.id, input.id))
      .execute();

    if (existingMatch.length === 0) {
      throw new Error(`Match with id ${input.id} not found`);
    }

    // Only update provided fields
    const updateData: Partial<typeof matchesTable.$inferInsert> = {};
    
    if (input.weight_category !== undefined) {
      updateData.weight_category = input.weight_category;
    }
    if (input.red_competitor_name !== undefined) {
      updateData.red_competitor_name = input.red_competitor_name;
    }
    if (input.red_competitor_country !== undefined) {
      updateData.red_competitor_country = input.red_competitor_country;
    }
    if (input.blue_competitor_name !== undefined) {
      updateData.blue_competitor_name = input.blue_competitor_name;
    }
    if (input.blue_competitor_country !== undefined) {
      updateData.blue_competitor_country = input.blue_competitor_country;
    }
    if (input.total_rounds !== undefined) {
      updateData.total_rounds = input.total_rounds;
    }
    if (input.round_duration_minutes !== undefined) {
      updateData.round_duration_minutes = input.round_duration_minutes;
    }

    // Set updated_at timestamp
    updateData.updated_at = new Date();

    // Update match
    const result = await db.update(matchesTable)
      .set(updateData)
      .where(eq(matchesTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Match update failed:', error);
    throw error;
  }
};
