
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { matchesTable } from '../db/schema';
import { type CreateMatchInput, type ResumeMatchInput } from '../schema';
import { resumeMatch } from '../handlers/resume_match';
import { eq } from 'drizzle-orm';

const testMatchInput: CreateMatchInput = {
  weight_category: 'Lightweight',
  red_competitor_name: 'John Doe',
  red_competitor_country: 'USA',
  blue_competitor_name: 'Jane Smith',
  blue_competitor_country: 'Canada',
  total_rounds: 3,
  round_duration_minutes: 2
};

describe('resumeMatch', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should resume a paused match', async () => {
    // Create a match
    const matchResult = await db.insert(matchesTable)
      .values({
        ...testMatchInput,
        status: 'paused' // Set status to paused
      })
      .returning()
      .execute();

    const matchId = matchResult[0].id;

    const input: ResumeMatchInput = {
      match_id: matchId
    };

    const result = await resumeMatch(input);

    // Verify the match status is now ongoing
    expect(result.status).toEqual('ongoing');
    expect(result.id).toEqual(matchId);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update the match in database', async () => {
    // Create a paused match
    const matchResult = await db.insert(matchesTable)
      .values({
        ...testMatchInput,
        status: 'paused'
      })
      .returning()
      .execute();

    const matchId = matchResult[0].id;

    const input: ResumeMatchInput = {
      match_id: matchId
    };

    await resumeMatch(input);

    // Query the database to verify the update
    const updatedMatches = await db.select()
      .from(matchesTable)
      .where(eq(matchesTable.id, matchId))
      .execute();

    expect(updatedMatches).toHaveLength(1);
    expect(updatedMatches[0].status).toEqual('ongoing');
    expect(updatedMatches[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent match', async () => {
    const input: ResumeMatchInput = {
      match_id: 999999 // Non-existent match ID
    };

    await expect(resumeMatch(input)).rejects.toThrow(/match not found/i);
  });

  it('should throw error when match is not paused', async () => {
    // Create a match with ongoing status
    const matchResult = await db.insert(matchesTable)
      .values({
        ...testMatchInput,
        status: 'ongoing'
      })
      .returning()
      .execute();

    const matchId = matchResult[0].id;

    const input: ResumeMatchInput = {
      match_id: matchId
    };

    await expect(resumeMatch(input)).rejects.toThrow(/match is not paused/i);
  });

  it('should throw error when match is upcoming', async () => {
    // Create a match with upcoming status
    const matchResult = await db.insert(matchesTable)
      .values({
        ...testMatchInput,
        status: 'upcoming'
      })
      .returning()
      .execute();

    const matchId = matchResult[0].id;

    const input: ResumeMatchInput = {
      match_id: matchId
    };

    await expect(resumeMatch(input)).rejects.toThrow(/match is not paused/i);
  });

  it('should throw error when match is completed', async () => {
    // Create a match with completed status
    const matchResult = await db.insert(matchesTable)
      .values({
        ...testMatchInput,
        status: 'completed'
      })
      .returning()
      .execute();

    const matchId = matchResult[0].id;

    const input: ResumeMatchInput = {
      match_id: matchId
    };

    await expect(resumeMatch(input)).rejects.toThrow(/match is not paused/i);
  });

  it('should preserve other match fields when resuming', async () => {
    // Create a paused match with specific data
    const matchResult = await db.insert(matchesTable)
      .values({
        ...testMatchInput,
        status: 'paused',
        current_round: 2,
        red_total_score: 10,
        blue_total_score: 8
      })
      .returning()
      .execute();

    const matchId = matchResult[0].id;

    const input: ResumeMatchInput = {
      match_id: matchId
    };

    const result = await resumeMatch(input);

    // Verify all other fields are preserved
    expect(result.status).toEqual('ongoing');
    expect(result.current_round).toEqual(2);
    expect(result.red_total_score).toEqual(10);
    expect(result.blue_total_score).toEqual(8);
    expect(result.weight_category).toEqual(testMatchInput.weight_category);
    expect(result.red_competitor_name).toEqual(testMatchInput.red_competitor_name);
    expect(result.blue_competitor_name).toEqual(testMatchInput.blue_competitor_name);
  });
});
