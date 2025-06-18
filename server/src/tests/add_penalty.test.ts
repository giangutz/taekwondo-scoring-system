
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { matchesTable, roundsTable, penaltyEntriesTable } from '../db/schema';
import { type CreateMatchInput, type AddPenaltyInput } from '../schema';
import { addPenalty } from '../handlers/add_penalty';
import { eq, and } from 'drizzle-orm';

// Test input data
const testMatchInput: CreateMatchInput = {
  weight_category: '-68kg',
  red_competitor_name: 'John Doe',
  red_competitor_country: 'USA',
  blue_competitor_name: 'Jane Smith',
  blue_competitor_country: 'KOR',
  total_rounds: 3,
  round_duration_minutes: 2
};

const createTestMatch = async () => {
  const result = await db.insert(matchesTable)
    .values({
      ...testMatchInput,
      status: 'ongoing',
      red_total_score: 5, // Match the round scores
      blue_total_score: 3
    })
    .returning()
    .execute();

  const match = result[0];

  // Create the current round
  await db.insert(roundsTable)
    .values({
      match_id: match.id,
      round_number: 1,
      red_score: 5,
      blue_score: 3,
      red_penalties: 1,
      blue_penalties: 2
    })
    .execute();

  return match;
};

describe('addPenalty', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should add penalty to red competitor and give blue 1 point', async () => {
    const match = await createTestMatch();

    const input: AddPenaltyInput = {
      match_id: match.id,
      competitor_color: 'red',
      penalty_type: 'grab'
    };

    const result = await addPenalty(input);

    // Check penalty entry was created
    const penaltyEntries = await db.select()
      .from(penaltyEntriesTable)
      .where(eq(penaltyEntriesTable.match_id, match.id))
      .execute();

    expect(penaltyEntries).toHaveLength(1);
    expect(penaltyEntries[0].competitor_color).toEqual('red');
    expect(penaltyEntries[0].penalty_type).toEqual('grab');

    // Check round scores and penalties were updated
    const rounds = await db.select()
      .from(roundsTable)
      .where(and(
        eq(roundsTable.match_id, match.id),
        eq(roundsTable.round_number, 1)
      ))
      .execute();

    expect(rounds).toHaveLength(1);
    expect(rounds[0].red_penalties).toEqual(2); // Was 1, now 2
    expect(rounds[0].blue_penalties).toEqual(2); // Unchanged
    expect(rounds[0].red_score).toEqual(5); // Unchanged
    expect(rounds[0].blue_score).toEqual(4); // Was 3, now 4 (+1 from penalty)

    // Check match total scores were updated
    const matches = await db.select()
      .from(matchesTable)
      .where(eq(matchesTable.id, match.id))
      .execute();

    expect(matches[0].red_total_score).toEqual(5); // Unchanged
    expect(matches[0].blue_total_score).toEqual(4); // Was 3, now 4 (+1 from penalty)

    // Check returned match detail
    expect(result.match.red_total_score).toEqual(5);
    expect(result.match.blue_total_score).toEqual(4);
    expect(result.current_round_data?.red_penalties).toEqual(2);
    expect(result.current_round_data?.blue_score).toEqual(4);
    expect(result.penalty_entries).toHaveLength(1);
  });

  it('should add penalty to blue competitor and give red 1 point', async () => {
    const match = await createTestMatch();

    const input: AddPenaltyInput = {
      match_id: match.id,
      competitor_color: 'blue',
      penalty_type: 'fall_down'
    };

    const result = await addPenalty(input);

    // Check round scores and penalties were updated
    const rounds = await db.select()
      .from(roundsTable)
      .where(and(
        eq(roundsTable.match_id, match.id),
        eq(roundsTable.round_number, 1)
      ))
      .execute();

    expect(rounds[0].blue_penalties).toEqual(3); // Was 2, now 3
    expect(rounds[0].red_penalties).toEqual(1); // Unchanged
    expect(rounds[0].blue_score).toEqual(3); // Unchanged
    expect(rounds[0].red_score).toEqual(6); // Was 5, now 6 (+1 from penalty)

    // Check match total scores were updated
    const matches = await db.select()
      .from(matchesTable)
      .where(eq(matchesTable.id, match.id))
      .execute();

    expect(matches[0].blue_total_score).toEqual(3); // Unchanged
    expect(matches[0].red_total_score).toEqual(6); // Was 5, now 6 (+1 from penalty)

    // Check returned match detail
    expect(result.match.blue_total_score).toEqual(3);
    expect(result.match.red_total_score).toEqual(6);
    expect(result.current_round_data?.blue_penalties).toEqual(3);
    expect(result.current_round_data?.red_score).toEqual(6);
  });

  it('should handle multiple penalties correctly', async () => {
    const match = await createTestMatch();

    // Add first penalty to red
    await addPenalty({
      match_id: match.id,
      competitor_color: 'red',
      penalty_type: 'grab'
    });

    // Add second penalty to red
    const result = await addPenalty({
      match_id: match.id,
      competitor_color: 'red',
      penalty_type: 'out_of_bounds'
    });

    // Check final state
    expect(result.current_round_data?.red_penalties).toEqual(3); // Was 1, added 2 more
    expect(result.current_round_data?.blue_score).toEqual(5); // Was 3, added 2 points from penalties
    expect(result.match.blue_total_score).toEqual(5);
    expect(result.penalty_entries).toHaveLength(2);
  });

  it('should throw error for non-existent match', async () => {
    const input: AddPenaltyInput = {
      match_id: 999,
      competitor_color: 'red',
      penalty_type: 'grab'
    };

    await expect(addPenalty(input)).rejects.toThrow(/match not found/i);
  });

  it('should throw error for non-ongoing match', async () => {
    const result = await db.insert(matchesTable)
      .values({
        ...testMatchInput,
        status: 'completed'
      })
      .returning()
      .execute();

    const match = result[0];

    const input: AddPenaltyInput = {
      match_id: match.id,
      competitor_color: 'red',
      penalty_type: 'grab'
    };

    await expect(addPenalty(input)).rejects.toThrow(/cannot add penalty to a match that is not ongoing/i);
  });

  it('should throw error when current round not found', async () => {
    const result = await db.insert(matchesTable)
      .values({
        ...testMatchInput,
        status: 'ongoing',
        current_round: 2 // No round 2 exists
      })
      .returning()
      .execute();

    const match = result[0];

    const input: AddPenaltyInput = {
      match_id: match.id,
      competitor_color: 'red',
      penalty_type: 'grab'
    };

    await expect(addPenalty(input)).rejects.toThrow(/current round not found/i);
  });

  it('should correctly update match updated_at timestamp', async () => {
    const match = await createTestMatch();
    const originalUpdatedAt = match.updated_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: AddPenaltyInput = {
      match_id: match.id,
      competitor_color: 'red',
      penalty_type: 'grab'
    };

    const result = await addPenalty(input);

    expect(result.match.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should return complete match details with all related data', async () => {
    const match = await createTestMatch();

    const input: AddPenaltyInput = {
      match_id: match.id,
      competitor_color: 'red',
      penalty_type: 'grab'
    };

    const result = await addPenalty(input);

    // Verify structure of returned match detail
    expect(result.match).toBeDefined();
    expect(result.rounds).toBeInstanceOf(Array);
    expect(result.rounds).toHaveLength(1);
    expect(result.current_round_data).toBeDefined();
    expect(result.score_entries).toBeInstanceOf(Array);
    expect(result.penalty_entries).toBeInstanceOf(Array);
    expect(result.penalty_entries).toHaveLength(1);

    // Verify current round data matches the actual round
    expect(result.current_round_data?.round_number).toEqual(1);
    expect(result.current_round_data?.match_id).toEqual(match.id);
  });
});
