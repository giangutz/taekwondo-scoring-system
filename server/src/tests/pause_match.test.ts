
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { matchesTable } from '../db/schema';
import { type PauseMatchInput, type CreateMatchInput } from '../schema';
import { pauseMatch } from '../handlers/pause_match';
import { eq } from 'drizzle-orm';

// Helper function to create a test match
const createTestMatch = async (status: 'upcoming' | 'ongoing' | 'completed' | 'paused' = 'ongoing'): Promise<number> => {
  const testMatchInput: CreateMatchInput = {
    weight_category: 'Heavyweight',
    red_competitor_name: 'Fighter Red',
    red_competitor_country: 'USA',
    blue_competitor_name: 'Fighter Blue',
    blue_competitor_country: 'Canada',
    total_rounds: 3,
    round_duration_minutes: 2
  };

  const result = await db.insert(matchesTable)
    .values({
      ...testMatchInput,
      status: status
    })
    .returning()
    .execute();

  return result[0].id;
};

describe('pauseMatch', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should pause an ongoing match', async () => {
    // Create an ongoing match
    const matchId = await createTestMatch('ongoing');

    const input: PauseMatchInput = {
      match_id: matchId
    };

    const result = await pauseMatch(input);

    // Verify the result
    expect(result.status).toEqual('paused');
    expect(result.id).toEqual(matchId);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify the match was updated in the database
    const matches = await db.select()
      .from(matchesTable)
      .where(eq(matchesTable.id, matchId))
      .execute();

    expect(matches).toHaveLength(1);
    expect(matches[0].status).toEqual('paused');
    expect(matches[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent match', async () => {
    const input: PauseMatchInput = {
      match_id: 999999
    };

    await expect(pauseMatch(input)).rejects.toThrow(/match not found/i);
  });

  it('should throw error when trying to pause upcoming match', async () => {
    // Create an upcoming match
    const matchId = await createTestMatch('upcoming');

    const input: PauseMatchInput = {
      match_id: matchId
    };

    await expect(pauseMatch(input)).rejects.toThrow(/can only pause ongoing matches/i);

    // Verify match status unchanged
    const matches = await db.select()
      .from(matchesTable)
      .where(eq(matchesTable.id, matchId))
      .execute();

    expect(matches[0].status).toEqual('upcoming');
  });

  it('should throw error when trying to pause completed match', async () => {
    // Create a completed match
    const matchId = await createTestMatch('completed');

    const input: PauseMatchInput = {
      match_id: matchId
    };

    await expect(pauseMatch(input)).rejects.toThrow(/can only pause ongoing matches/i);

    // Verify match status unchanged
    const matches = await db.select()
      .from(matchesTable)
      .where(eq(matchesTable.id, matchId))
      .execute();

    expect(matches[0].status).toEqual('completed');
  });

  it('should throw error when trying to pause already paused match', async () => {
    // Create a paused match
    const matchId = await createTestMatch('paused');

    const input: PauseMatchInput = {
      match_id: matchId
    };

    await expect(pauseMatch(input)).rejects.toThrow(/can only pause ongoing matches/i);

    // Verify match status unchanged
    const matches = await db.select()
      .from(matchesTable)
      .where(eq(matchesTable.id, matchId))
      .execute();

    expect(matches[0].status).toEqual('paused');
  });

  it('should preserve all other match data when pausing', async () => {
    // Create an ongoing match with specific data
    const matchId = await createTestMatch('ongoing');

    // Update the match with some scores to test data preservation
    await db.update(matchesTable)
      .set({
        red_total_score: 5,
        blue_total_score: 3,
        current_round: 2
      })
      .where(eq(matchesTable.id, matchId))
      .execute();

    const input: PauseMatchInput = {
      match_id: matchId
    };

    const result = await pauseMatch(input);

    // Verify all other data is preserved
    expect(result.red_total_score).toEqual(5);
    expect(result.blue_total_score).toEqual(3);
    expect(result.current_round).toEqual(2);
    expect(result.weight_category).toEqual('Heavyweight');
    expect(result.red_competitor_name).toEqual('Fighter Red');
    expect(result.blue_competitor_name).toEqual('Fighter Blue');
    expect(result.total_rounds).toEqual(3);
    expect(result.round_duration_minutes).toEqual(2);
  });

  it('should update the updated_at timestamp', async () => {
    // Create an ongoing match
    const matchId = await createTestMatch('ongoing');

    // Get the original timestamp
    const originalMatch = await db.select()
      .from(matchesTable)
      .where(eq(matchesTable.id, matchId))
      .execute();

    const originalUpdatedAt = originalMatch[0].updated_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: PauseMatchInput = {
      match_id: matchId
    };

    const result = await pauseMatch(input);

    // Verify updated_at was changed
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });
});
