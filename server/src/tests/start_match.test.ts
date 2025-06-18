
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { matchesTable, roundsTable } from '../db/schema';
import { type CreateMatchInput, type StartMatchInput } from '../schema';
import { startMatch } from '../handlers/start_match';
import { eq, and } from 'drizzle-orm';

// Test input for creating a match
const testMatchInput: CreateMatchInput = {
  weight_category: '-68kg',
  red_competitor_name: 'John Smith',
  red_competitor_country: 'USA',
  blue_competitor_name: 'Kim Lee',
  blue_competitor_country: 'KOR',
  total_rounds: 3,
  round_duration_minutes: 2
};

describe('startMatch', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should start an upcoming match', async () => {
    // Create a test match first
    const createdMatches = await db.insert(matchesTable)
      .values({
        ...testMatchInput,
        status: 'upcoming'
      })
      .returning()
      .execute();

    const match = createdMatches[0];
    const startInput: StartMatchInput = { match_id: match.id };

    const result = await startMatch(startInput);

    // Verify match status is updated
    expect(result.id).toEqual(match.id);
    expect(result.status).toEqual('ongoing');
    expect(result.current_round).toEqual(1);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > match.updated_at).toBe(true);

    // Verify other fields remain unchanged
    expect(result.weight_category).toEqual(testMatchInput.weight_category);
    expect(result.red_competitor_name).toEqual(testMatchInput.red_competitor_name);
    expect(result.blue_competitor_name).toEqual(testMatchInput.blue_competitor_name);
    expect(result.total_rounds).toEqual(testMatchInput.total_rounds);
    expect(result.round_duration_minutes).toEqual(testMatchInput.round_duration_minutes);
  });

  it('should create the first round when starting a match', async () => {
    // Create a test match
    const createdMatches = await db.insert(matchesTable)
      .values({
        ...testMatchInput,
        status: 'upcoming'
      })
      .returning()
      .execute();

    const match = createdMatches[0];
    const startInput: StartMatchInput = { match_id: match.id };

    await startMatch(startInput);

    // Verify first round was created
    const rounds = await db.select()
      .from(roundsTable)
      .where(and(
        eq(roundsTable.match_id, match.id),
        eq(roundsTable.round_number, 1)
      ))
      .execute();

    expect(rounds).toHaveLength(1);
    
    const round = rounds[0];
    expect(round.match_id).toEqual(match.id);
    expect(round.round_number).toEqual(1);
    expect(round.red_score).toEqual(0);
    expect(round.blue_score).toEqual(0);
    expect(round.red_penalties).toEqual(0);
    expect(round.blue_penalties).toEqual(0);
    expect(round.winner_color).toBeNull();
    expect(round.started_at).toBeInstanceOf(Date);
    expect(round.ended_at).toBeNull();
    expect(round.duration_seconds).toBeNull();
  });

  it('should update match in database correctly', async () => {
    // Create a test match
    const createdMatches = await db.insert(matchesTable)
      .values({
        ...testMatchInput,
        status: 'upcoming'
      })
      .returning()
      .execute();

    const match = createdMatches[0];
    const startInput: StartMatchInput = { match_id: match.id };

    await startMatch(startInput);

    // Query database to verify changes
    const updatedMatches = await db.select()
      .from(matchesTable)
      .where(eq(matchesTable.id, match.id))
      .execute();

    expect(updatedMatches).toHaveLength(1);
    
    const updatedMatch = updatedMatches[0];
    expect(updatedMatch.status).toEqual('ongoing');
    expect(updatedMatch.current_round).toEqual(1);
    expect(updatedMatch.updated_at).toBeInstanceOf(Date);
    expect(updatedMatch.updated_at > match.updated_at).toBe(true);
  });

  it('should throw error for non-existent match', async () => {
    const startInput: StartMatchInput = { match_id: 999 };

    await expect(startMatch(startInput)).rejects.toThrow(/match not found/i);
  });

  it('should throw error for match not in upcoming status', async () => {
    // Create a match with ongoing status
    const createdMatches = await db.insert(matchesTable)
      .values({
        ...testMatchInput,
        status: 'ongoing'
      })
      .returning()
      .execute();

    const match = createdMatches[0];
    const startInput: StartMatchInput = { match_id: match.id };

    await expect(startMatch(startInput)).rejects.toThrow(/match cannot be started.*current status is not upcoming/i);
  });

  it('should throw error for completed match', async () => {
    // Create a completed match
    const createdMatches = await db.insert(matchesTable)
      .values({
        ...testMatchInput,
        status: 'completed'
      })
      .returning()
      .execute();

    const match = createdMatches[0];
    const startInput: StartMatchInput = { match_id: match.id };

    await expect(startMatch(startInput)).rejects.toThrow(/match cannot be started.*current status is not upcoming/i);
  });

  it('should throw error for paused match', async () => {
    // Create a paused match
    const createdMatches = await db.insert(matchesTable)
      .values({
        ...testMatchInput,
        status: 'paused'
      })
      .returning()
      .execute();

    const match = createdMatches[0];
    const startInput: StartMatchInput = { match_id: match.id };

    await expect(startMatch(startInput)).rejects.toThrow(/match cannot be started.*current status is not upcoming/i);
  });

  it('should handle concurrent start attempts correctly', async () => {
    // Create a test match
    const createdMatches = await db.insert(matchesTable)
      .values({
        ...testMatchInput,
        status: 'upcoming'
      })
      .returning()
      .execute();

    const match = createdMatches[0];
    const startInput: StartMatchInput = { match_id: match.id };

    // Start the match first time
    const result1 = await startMatch(startInput);
    expect(result1.status).toEqual('ongoing');

    // Try to start again - should fail
    await expect(startMatch(startInput)).rejects.toThrow(/match cannot be started.*current status is not upcoming/i);
  });

  it('should preserve match scores and settings when starting', async () => {
    // Create a match with custom settings
    const customMatchInput = {
      ...testMatchInput,
      total_rounds: 5,
      round_duration_minutes: 3
    };

    const createdMatches = await db.insert(matchesTable)
      .values({
        ...customMatchInput,
        status: 'upcoming'
      })
      .returning()
      .execute();

    const match = createdMatches[0];
    const startInput: StartMatchInput = { match_id: match.id };

    const result = await startMatch(startInput);

    // Verify settings are preserved
    expect(result.total_rounds).toEqual(5);
    expect(result.round_duration_minutes).toEqual(3);
    expect(result.red_total_score).toEqual(0);
    expect(result.blue_total_score).toEqual(0);
    expect(result.winner_color).toBeNull();
  });
});
