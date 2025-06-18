
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { matchesTable } from '../db/schema';
import { type CreateMatchInput } from '../schema';
import { createMatch } from '../handlers/create_match';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateMatchInput = {
  weight_category: 'Lightweight',
  red_competitor_name: 'John Smith',
  red_competitor_country: 'USA',
  blue_competitor_name: 'Kim Jong Un',
  blue_competitor_country: 'KOR',
  total_rounds: 3,
  round_duration_minutes: 2
};

describe('createMatch', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a match with all fields', async () => {
    const result = await createMatch(testInput);

    // Verify all basic fields
    expect(result.weight_category).toBe('Lightweight');
    expect(result.red_competitor_name).toBe('John Smith');
    expect(result.red_competitor_country).toBe('USA');
    expect(result.blue_competitor_name).toBe('Kim Jong Un');
    expect(result.blue_competitor_country).toBe('KOR');
    expect(result.total_rounds).toBe(3);
    expect(result.round_duration_minutes).toBe(2);
    
    // Verify generated fields
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    
    // Verify default values
    expect(result.status).toBe('upcoming');
    expect(result.current_round).toBe(1);
    expect(result.red_total_score).toBe(0);
    expect(result.blue_total_score).toBe(0);
    expect(result.winner_color).toBeNull();
  });

  it('should save match to database correctly', async () => {
    const result = await createMatch(testInput);

    // Query the database to verify the match was saved
    const matches = await db.select()
      .from(matchesTable)
      .where(eq(matchesTable.id, result.id))
      .execute();

    expect(matches).toHaveLength(1);
    const savedMatch = matches[0];
    
    expect(savedMatch.weight_category).toBe('Lightweight');
    expect(savedMatch.red_competitor_name).toBe('John Smith');
    expect(savedMatch.red_competitor_country).toBe('USA');
    expect(savedMatch.blue_competitor_name).toBe('Kim Jong Un');
    expect(savedMatch.blue_competitor_country).toBe('KOR');
    expect(savedMatch.total_rounds).toBe(3);
    expect(savedMatch.round_duration_minutes).toBe(2);
    expect(savedMatch.status).toBe('upcoming');
    expect(savedMatch.current_round).toBe(1);
    expect(savedMatch.red_total_score).toBe(0);
    expect(savedMatch.blue_total_score).toBe(0);
  });

  it('should use default values when provided', async () => {
    const inputWithDefaults: CreateMatchInput = {
      weight_category: 'Heavyweight',
      red_competitor_name: 'Mike Tyson',
      red_competitor_country: 'USA',
      blue_competitor_name: 'Muhammad Ali',
      blue_competitor_country: 'USA',
      total_rounds: 3, // Using default value explicitly
      round_duration_minutes: 2 // Using default value explicitly
    };

    const result = await createMatch(inputWithDefaults);

    // Verify defaults were applied
    expect(result.total_rounds).toBe(3);
    expect(result.round_duration_minutes).toBe(2);
  });

  it('should handle custom total_rounds and round_duration_minutes', async () => {
    const customInput: CreateMatchInput = {
      weight_category: 'Middleweight',
      red_competitor_name: 'Fighter A',
      red_competitor_country: 'JPN',
      blue_competitor_name: 'Fighter B',
      blue_competitor_country: 'THA',
      total_rounds: 5,
      round_duration_minutes: 3
    };

    const result = await createMatch(customInput);

    expect(result.total_rounds).toBe(5);
    expect(result.round_duration_minutes).toBe(3);
  });

  it('should round fractional round_duration_minutes to integer', async () => {
    const fractionalInput: CreateMatchInput = {
      weight_category: 'Featherweight',
      red_competitor_name: 'Speed Fighter',
      red_competitor_country: 'CHN',
      blue_competitor_name: 'Power Fighter',
      blue_competitor_country: 'BRA',
      total_rounds: 3,
      round_duration_minutes: 2.7 // Fractional value
    };

    const result = await createMatch(fractionalInput);

    // Should be rounded to nearest integer
    expect(result.round_duration_minutes).toBe(3);
  });

  it('should handle minimum values correctly', async () => {
    const minInput: CreateMatchInput = {
      weight_category: 'Flyweight',
      red_competitor_name: 'Min Fighter',
      red_competitor_country: 'IND',
      blue_competitor_name: 'Small Fighter',
      blue_competitor_country: 'VIE',
      total_rounds: 1, // Minimum allowed
      round_duration_minutes: 1 // Minimum allowed
    };

    const result = await createMatch(minInput);

    expect(result.total_rounds).toBe(1);
    expect(result.round_duration_minutes).toBe(1);
  });

  it('should handle maximum values correctly', async () => {
    const maxInput: CreateMatchInput = {
      weight_category: 'Super Heavyweight',
      red_competitor_name: 'Max Fighter',
      red_competitor_country: 'RUS',
      blue_competitor_name: 'Big Fighter',
      blue_competitor_country: 'GER',
      total_rounds: 5, // Maximum allowed
      round_duration_minutes: 10 // Maximum allowed
    };

    const result = await createMatch(maxInput);

    expect(result.total_rounds).toBe(5);
    expect(result.round_duration_minutes).toBe(10);
  });

  it('should create multiple matches independently', async () => {
    const input1: CreateMatchInput = {
      weight_category: 'Bantamweight',
      red_competitor_name: 'Fighter 1A',
      red_competitor_country: 'MEX',
      blue_competitor_name: 'Fighter 1B',
      blue_competitor_country: 'ARG',
      total_rounds: 3,
      round_duration_minutes: 2
    };

    const input2: CreateMatchInput = {
      weight_category: 'Welterweight',
      red_competitor_name: 'Fighter 2A',
      red_competitor_country: 'CAN',
      blue_competitor_name: 'Fighter 2B',
      blue_competitor_country: 'AUS',
      total_rounds: 4,
      round_duration_minutes: 3
    };

    const result1 = await createMatch(input1);
    const result2 = await createMatch(input2);

    // Verify both matches were created with different IDs
    expect(result1.id).not.toBe(result2.id);
    expect(result1.weight_category).toBe('Bantamweight');
    expect(result2.weight_category).toBe('Welterweight');
    expect(result1.total_rounds).toBe(3);
    expect(result2.total_rounds).toBe(4);

    // Verify both exist in database
    const allMatches = await db.select()
      .from(matchesTable)
      .execute();

    expect(allMatches).toHaveLength(2);
  });

  it('should handle special characters in names and countries', async () => {
    const specialInput: CreateMatchInput = {
      weight_category: "Women's Strawweight",
      red_competitor_name: "María José Contreras",
      red_competitor_country: "ESPAÑA",
      blue_competitor_name: "李小龙",
      blue_competitor_country: "中国",
      total_rounds: 3,
      round_duration_minutes: 2
    };

    const result = await createMatch(specialInput);

    expect(result.weight_category).toBe("Women's Strawweight");
    expect(result.red_competitor_name).toBe("María José Contreras");
    expect(result.red_competitor_country).toBe("ESPAÑA");
    expect(result.blue_competitor_name).toBe("李小龙");
    expect(result.blue_competitor_country).toBe("中国");
  });

  it('should ensure created_at and updated_at are properly set', async () => {
    const beforeCreate = new Date();
    const result = await createMatch(testInput);
    const afterCreate = new Date();

    // Verify timestamps are within reasonable range
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(afterCreate.getTime());

    // For new matches, created_at and updated_at should be very close
    const timeDiff = Math.abs(result.updated_at.getTime() - result.created_at.getTime());
    expect(timeDiff).toBeLessThan(1000); // Within 1 second
  });

  it('should handle edge case with fractional rounding', async () => {
    const roundingInput: CreateMatchInput = {
      weight_category: 'Light Heavyweight',
      red_competitor_name: 'Round Fighter',
      red_competitor_country: 'FRA',
      blue_competitor_name: 'Decimal Fighter',
      blue_competitor_country: 'ITA',
      total_rounds: 3,
      round_duration_minutes: 1.4 // Should round down to 1
    };

    const result = await createMatch(roundingInput);

    expect(result.round_duration_minutes).toBe(1);
  });

  it('should verify all database defaults are applied correctly', async () => {
    const result = await createMatch(testInput);

    // Verify all default database values
    expect(result.status).toBe('upcoming');
    expect(result.current_round).toBe(1);
    expect(result.red_total_score).toBe(0);
    expect(result.blue_total_score).toBe(0);
    expect(result.winner_color).toBeNull();

    // Verify database entry matches returned object
    const dbMatch = await db.select()
      .from(matchesTable)
      .where(eq(matchesTable.id, result.id))
      .execute();

    const savedMatch = dbMatch[0];
    expect(savedMatch.status).toBe('upcoming');
    expect(savedMatch.current_round).toBe(1);
    expect(savedMatch.red_total_score).toBe(0);
    expect(savedMatch.blue_total_score).toBe(0);
    expect(savedMatch.winner_color).toBeNull();
  });
});
