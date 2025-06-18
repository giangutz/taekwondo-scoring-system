
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { matchesTable } from '../db/schema';
import { type UpdateMatchInput } from '../schema';
import { updateMatch } from '../handlers/update_match';
import { eq } from 'drizzle-orm';

describe('updateMatch', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update match with all fields', async () => {
    // Create a match directly in database
    const createdMatches = await db.insert(matchesTable)
      .values({
        weight_category: 'Lightweight',
        red_competitor_name: 'John Doe',
        red_competitor_country: 'USA',
        blue_competitor_name: 'Jane Smith',
        blue_competitor_country: 'CAN',
        total_rounds: 3,
        round_duration_minutes: 2
      })
      .returning()
      .execute();
    
    const createdMatch = createdMatches[0];

    const updateInput: UpdateMatchInput = {
      id: createdMatch.id,
      weight_category: 'Middleweight',
      red_competitor_name: 'Updated Red',
      red_competitor_country: 'GBR',
      blue_competitor_name: 'Updated Blue',
      blue_competitor_country: 'FRA',
      total_rounds: 5,
      round_duration_minutes: 3
    };

    const result = await updateMatch(updateInput);

    // Verify updated fields
    expect(result.weight_category).toEqual('Middleweight');
    expect(result.red_competitor_name).toEqual('Updated Red');
    expect(result.red_competitor_country).toEqual('GBR');
    expect(result.blue_competitor_name).toEqual('Updated Blue');
    expect(result.blue_competitor_country).toEqual('FRA');
    expect(result.total_rounds).toEqual(5);
    expect(result.round_duration_minutes).toEqual(3);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > createdMatch.updated_at).toBe(true);

    // Verify unchanged fields
    expect(result.id).toEqual(createdMatch.id);
    expect(result.status).toEqual('upcoming');
    expect(result.current_round).toEqual(1);
    expect(result.red_total_score).toEqual(0);
    expect(result.blue_total_score).toEqual(0);
    expect(result.winner_color).toBeNull();
  });

  it('should update match with partial fields', async () => {
    // Create a match directly in database
    const createdMatches = await db.insert(matchesTable)
      .values({
        weight_category: 'Lightweight',
        red_competitor_name: 'John Doe',
        red_competitor_country: 'USA',
        blue_competitor_name: 'Jane Smith',
        blue_competitor_country: 'CAN',
        total_rounds: 3,
        round_duration_minutes: 2
      })
      .returning()
      .execute();
    
    const createdMatch = createdMatches[0];

    const updateInput: UpdateMatchInput = {
      id: createdMatch.id,
      weight_category: 'Heavyweight',
      total_rounds: 4
    };

    const result = await updateMatch(updateInput);

    // Verify updated fields
    expect(result.weight_category).toEqual('Heavyweight');
    expect(result.total_rounds).toEqual(4);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > createdMatch.updated_at).toBe(true);

    // Verify unchanged fields
    expect(result.red_competitor_name).toEqual('John Doe');
    expect(result.red_competitor_country).toEqual('USA');
    expect(result.blue_competitor_name).toEqual('Jane Smith');
    expect(result.blue_competitor_country).toEqual('CAN');
    expect(result.round_duration_minutes).toEqual(2);
  });

  it('should update only red competitor information', async () => {
    // Create a match directly in database
    const createdMatches = await db.insert(matchesTable)
      .values({
        weight_category: 'Lightweight',
        red_competitor_name: 'John Doe',
        red_competitor_country: 'USA',
        blue_competitor_name: 'Jane Smith',
        blue_competitor_country: 'CAN',
        total_rounds: 3,
        round_duration_minutes: 2
      })
      .returning()
      .execute();
    
    const createdMatch = createdMatches[0];

    const updateInput: UpdateMatchInput = {
      id: createdMatch.id,
      red_competitor_name: 'New Red Fighter',
      red_competitor_country: 'KOR'
    };

    const result = await updateMatch(updateInput);

    // Verify updated red competitor fields
    expect(result.red_competitor_name).toEqual('New Red Fighter');
    expect(result.red_competitor_country).toEqual('KOR');

    // Verify blue competitor fields unchanged
    expect(result.blue_competitor_name).toEqual('Jane Smith');
    expect(result.blue_competitor_country).toEqual('CAN');

    // Verify other fields unchanged
    expect(result.weight_category).toEqual('Lightweight');
    expect(result.total_rounds).toEqual(3);
    expect(result.round_duration_minutes).toEqual(2);
  });

  it('should update only blue competitor information', async () => {
    // Create a match directly in database
    const createdMatches = await db.insert(matchesTable)
      .values({
        weight_category: 'Lightweight',
        red_competitor_name: 'John Doe',
        red_competitor_country: 'USA',
        blue_competitor_name: 'Jane Smith',
        blue_competitor_country: 'CAN',
        total_rounds: 3,
        round_duration_minutes: 2
      })
      .returning()
      .execute();
    
    const createdMatch = createdMatches[0];

    const updateInput: UpdateMatchInput = {
      id: createdMatch.id,
      blue_competitor_name: 'New Blue Fighter',
      blue_competitor_country: 'JPN'
    };

    const result = await updateMatch(updateInput);

    // Verify updated blue competitor fields
    expect(result.blue_competitor_name).toEqual('New Blue Fighter');
    expect(result.blue_competitor_country).toEqual('JPN');

    // Verify red competitor fields unchanged
    expect(result.red_competitor_name).toEqual('John Doe');
    expect(result.red_competitor_country).toEqual('USA');

    // Verify other fields unchanged
    expect(result.weight_category).toEqual('Lightweight');
    expect(result.total_rounds).toEqual(3);
    expect(result.round_duration_minutes).toEqual(2);
  });

  it('should save updated match to database', async () => {
    // Create a match directly in database
    const createdMatches = await db.insert(matchesTable)
      .values({
        weight_category: 'Lightweight',
        red_competitor_name: 'John Doe',
        red_competitor_country: 'USA',
        blue_competitor_name: 'Jane Smith',
        blue_competitor_country: 'CAN',
        total_rounds: 3,
        round_duration_minutes: 2
      })
      .returning()
      .execute();
    
    const createdMatch = createdMatches[0];

    const updateInput: UpdateMatchInput = {
      id: createdMatch.id,
      weight_category: 'Featherweight',
      round_duration_minutes: 1
    };

    const result = await updateMatch(updateInput);

    // Query database to verify changes were persisted
    const matches = await db.select()
      .from(matchesTable)
      .where(eq(matchesTable.id, result.id))
      .execute();

    expect(matches).toHaveLength(1);
    const dbMatch = matches[0];
    expect(dbMatch.weight_category).toEqual('Featherweight');
    expect(dbMatch.round_duration_minutes).toEqual(1);
    expect(dbMatch.updated_at).toBeInstanceOf(Date);
    expect(dbMatch.updated_at > createdMatch.updated_at).toBe(true);
  });

  it('should throw error for non-existent match', async () => {
    const updateInput: UpdateMatchInput = {
      id: 999,
      weight_category: 'Heavyweight'
    };

    await expect(updateMatch(updateInput)).rejects.toThrow(/Match with id 999 not found/i);
  });

  it('should handle minimum and maximum values correctly', async () => {
    // Create a match directly in database
    const createdMatches = await db.insert(matchesTable)
      .values({
        weight_category: 'Lightweight',
        red_competitor_name: 'John Doe',
        red_competitor_country: 'USA',
        blue_competitor_name: 'Jane Smith',
        blue_competitor_country: 'CAN',
        total_rounds: 3,
        round_duration_minutes: 2
      })
      .returning()
      .execute();
    
    const createdMatch = createdMatches[0];

    const updateInput: UpdateMatchInput = {
      id: createdMatch.id,
      total_rounds: 5, // Maximum allowed by schema
      round_duration_minutes: 10 // Maximum allowed by schema
    };

    const result = await updateMatch(updateInput);

    expect(result.total_rounds).toEqual(5);
    expect(result.round_duration_minutes).toEqual(10);
  });

  it('should update with empty optional fields', async () => {
    // Create a match directly in database
    const createdMatches = await db.insert(matchesTable)
      .values({
        weight_category: 'Lightweight',
        red_competitor_name: 'John Doe',
        red_competitor_country: 'USA',
        blue_competitor_name: 'Jane Smith',
        blue_competitor_country: 'CAN',
        total_rounds: 3,
        round_duration_minutes: 2
      })
      .returning()
      .execute();
    
    const createdMatch = createdMatches[0];

    const updateInput: UpdateMatchInput = {
      id: createdMatch.id
      // No optional fields provided
    };

    const result = await updateMatch(updateInput);

    // Should only update the updated_at timestamp
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > createdMatch.updated_at).toBe(true);

    // All other fields should remain unchanged
    expect(result.weight_category).toEqual('Lightweight');
    expect(result.red_competitor_name).toEqual('John Doe');
    expect(result.red_competitor_country).toEqual('USA');
    expect(result.blue_competitor_name).toEqual('Jane Smith');
    expect(result.blue_competitor_country).toEqual('CAN');
    expect(result.total_rounds).toEqual(3);
    expect(result.round_duration_minutes).toEqual(2);
  });
});
