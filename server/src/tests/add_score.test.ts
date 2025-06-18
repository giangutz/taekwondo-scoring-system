
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { matchesTable, roundsTable, scoreEntriesTable } from '../db/schema';
import { type AddScoreInput } from '../schema';
import { addScore } from '../handlers/add_score';
import { eq, and } from 'drizzle-orm';

describe('addScore', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const createTestMatch = async () => {
    const [match] = await db.insert(matchesTable)
      .values({
        weight_category: 'Heavyweight',
        red_competitor_name: 'Red Fighter',
        red_competitor_country: 'USA',
        blue_competitor_name: 'Blue Fighter',
        blue_competitor_country: 'Canada',
        status: 'ongoing',
        current_round: 1,
        total_rounds: 3,
        round_duration_minutes: 2,
        red_total_score: 0,
        blue_total_score: 0
      })
      .returning()
      .execute();

    const [round] = await db.insert(roundsTable)
      .values({
        match_id: match.id,
        round_number: 1,
        red_score: 0,
        blue_score: 0,
        red_penalties: 0,
        blue_penalties: 0,
        started_at: new Date()
      })
      .returning()
      .execute();

    return { match, round };
  };

  it('should add punch score (1 point) for red competitor', async () => {
    const { match } = await createTestMatch();

    const input: AddScoreInput = {
      match_id: match.id,
      competitor_color: 'red',
      score_type: 'punch'
    };

    const result = await addScore(input);

    expect(result.match.red_total_score).toBe(1);
    expect(result.match.blue_total_score).toBe(0);
    expect(result.current_round_data?.red_score).toBe(1);
    expect(result.current_round_data?.blue_score).toBe(0);
    expect(result.score_entries).toHaveLength(1);
    expect(result.score_entries[0].points).toBe(1);
    expect(result.score_entries[0].score_type).toBe('punch');
    expect(result.score_entries[0].competitor_color).toBe('red');
  });

  it('should add body kick score (2 points) for blue competitor', async () => {
    const { match } = await createTestMatch();

    const input: AddScoreInput = {
      match_id: match.id,
      competitor_color: 'blue',
      score_type: 'body_kick'
    };

    const result = await addScore(input);

    expect(result.match.red_total_score).toBe(0);
    expect(result.match.blue_total_score).toBe(2);
    expect(result.current_round_data?.red_score).toBe(0);
    expect(result.current_round_data?.blue_score).toBe(2);
    expect(result.score_entries).toHaveLength(1);
    expect(result.score_entries[0].points).toBe(2);
    expect(result.score_entries[0].score_type).toBe('body_kick');
    expect(result.score_entries[0].competitor_color).toBe('blue');
  });

  it('should add head kick score (3 points) for red competitor', async () => {
    const { match } = await createTestMatch();

    const input: AddScoreInput = {
      match_id: match.id,
      competitor_color: 'red',
      score_type: 'head_kick'
    };

    const result = await addScore(input);

    expect(result.match.red_total_score).toBe(3);
    expect(result.current_round_data?.red_score).toBe(3);
    expect(result.score_entries[0].points).toBe(3);
    expect(result.score_entries[0].score_type).toBe('head_kick');
  });

  it('should add turning body kick score (4 points) for blue competitor', async () => {
    const { match } = await createTestMatch();

    const input: AddScoreInput = {
      match_id: match.id,
      competitor_color: 'blue',
      score_type: 'turning_body_kick'
    };

    const result = await addScore(input);

    expect(result.match.blue_total_score).toBe(4);
    expect(result.current_round_data?.blue_score).toBe(4);
    expect(result.score_entries[0].points).toBe(4);
    expect(result.score_entries[0].score_type).toBe('turning_body_kick');
  });

  it('should add turning head kick score (5 points) for red competitor', async () => {
    const { match } = await createTestMatch();

    const input: AddScoreInput = {
      match_id: match.id,
      competitor_color: 'red',
      score_type: 'turning_head_kick'
    };

    const result = await addScore(input);

    expect(result.match.red_total_score).toBe(5);
    expect(result.current_round_data?.red_score).toBe(5);
    expect(result.score_entries[0].points).toBe(5);
    expect(result.score_entries[0].score_type).toBe('turning_head_kick');
  });

  it('should accumulate multiple scores correctly', async () => {
    const { match } = await createTestMatch();

    // Add punch (1 point) for red
    await addScore({
      match_id: match.id,
      competitor_color: 'red',
      score_type: 'punch'
    });

    // Add body kick (2 points) for red
    await addScore({
      match_id: match.id,
      competitor_color: 'red',
      score_type: 'body_kick'
    });

    // Add head kick (3 points) for blue
    const result = await addScore({
      match_id: match.id,
      competitor_color: 'blue',
      score_type: 'head_kick'
    });

    expect(result.match.red_total_score).toBe(3); // 1 + 2
    expect(result.match.blue_total_score).toBe(3); // 3
    expect(result.current_round_data?.red_score).toBe(3);
    expect(result.current_round_data?.blue_score).toBe(3);
    expect(result.score_entries).toHaveLength(3);
  });

  it('should create score entry with correct details', async () => {
    const { match, round } = await createTestMatch();

    const input: AddScoreInput = {
      match_id: match.id,
      competitor_color: 'red',
      score_type: 'head_kick'
    };

    const result = await addScore(input);

    const scoreEntry = result.score_entries[0];
    expect(scoreEntry.match_id).toBe(match.id);
    expect(scoreEntry.round_id).toBe(round.id);
    expect(scoreEntry.competitor_color).toBe('red');
    expect(scoreEntry.score_type).toBe('head_kick');
    expect(scoreEntry.points).toBe(3);
    expect(scoreEntry.timestamp).toBeInstanceOf(Date);
  });

  it('should update match updated_at timestamp', async () => {
    const { match } = await createTestMatch();
    const originalUpdatedAt = match.updated_at;

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: AddScoreInput = {
      match_id: match.id,
      competitor_color: 'red',
      score_type: 'punch'
    };

    const result = await addScore(input);

    expect(result.match.updated_at).not.toEqual(originalUpdatedAt);
    expect(result.match.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent match', async () => {
    const input: AddScoreInput = {
      match_id: 999,
      competitor_color: 'red',
      score_type: 'punch'
    };

    await expect(addScore(input)).rejects.toThrow(/match not found/i);
  });

  it('should throw error for non-ongoing match', async () => {
    const [match] = await db.insert(matchesTable)
      .values({
        weight_category: 'Heavyweight',
        red_competitor_name: 'Red Fighter',
        red_competitor_country: 'USA',
        blue_competitor_name: 'Blue Fighter',
        blue_competitor_country: 'Canada',
        status: 'completed',
        current_round: 1,
        total_rounds: 3,
        round_duration_minutes: 2
      })
      .returning()
      .execute();

    const input: AddScoreInput = {
      match_id: match.id,
      competitor_color: 'red',
      score_type: 'punch'
    };

    await expect(addScore(input)).rejects.toThrow(/match is not ongoing/i);
  });

  it('should throw error when current round not found', async () => {
    const [match] = await db.insert(matchesTable)
      .values({
        weight_category: 'Heavyweight',
        red_competitor_name: 'Red Fighter',
        red_competitor_country: 'USA',
        blue_competitor_name: 'Blue Fighter',
        blue_competitor_country: 'Canada',
        status: 'ongoing',
        current_round: 1,
        total_rounds: 3,
        round_duration_minutes: 2
      })
      .returning()
      .execute();

    // No round created for this match

    const input: AddScoreInput = {
      match_id: match.id,
      competitor_color: 'red',
      score_type: 'punch'
    };

    await expect(addScore(input)).rejects.toThrow(/current round not found/i);
  });

  it('should save score entry to database correctly', async () => {
    const { match, round } = await createTestMatch();

    const input: AddScoreInput = {
      match_id: match.id,
      competitor_color: 'blue',
      score_type: 'turning_body_kick'
    };

    await addScore(input);

    const scoreEntries = await db.select()
      .from(scoreEntriesTable)
      .where(eq(scoreEntriesTable.match_id, match.id))
      .execute();

    expect(scoreEntries).toHaveLength(1);
    expect(scoreEntries[0].match_id).toBe(match.id);
    expect(scoreEntries[0].round_id).toBe(round.id);
    expect(scoreEntries[0].competitor_color).toBe('blue');
    expect(scoreEntries[0].score_type).toBe('turning_body_kick');
    expect(scoreEntries[0].points).toBe(4);
  });

  it('should update round scores in database correctly', async () => {
    const { match, round } = await createTestMatch();

    const input: AddScoreInput = {
      match_id: match.id,
      competitor_color: 'red',
      score_type: 'body_kick'
    };

    await addScore(input);

    const updatedRounds = await db.select()
      .from(roundsTable)
      .where(eq(roundsTable.id, round.id))
      .execute();

    expect(updatedRounds[0].red_score).toBe(2);
    expect(updatedRounds[0].blue_score).toBe(0);
  });

  it('should update match total scores in database correctly', async () => {
    const { match } = await createTestMatch();

    const input: AddScoreInput = {
      match_id: match.id,
      competitor_color: 'blue',
      score_type: 'turning_head_kick'
    };

    await addScore(input);

    const updatedMatches = await db.select()
      .from(matchesTable)
      .where(eq(matchesTable.id, match.id))
      .execute();

    expect(updatedMatches[0].red_total_score).toBe(0);
    expect(updatedMatches[0].blue_total_score).toBe(5);
  });

  it('should handle scores for different rounds correctly', async () => {
    const { match } = await createTestMatch();

    // Create second round
    const [round2] = await db.insert(roundsTable)
      .values({
        match_id: match.id,
        round_number: 2,
        red_score: 0,
        blue_score: 0,
        red_penalties: 0,
        blue_penalties: 0,
        started_at: new Date()
      })
      .returning()
      .execute();

    // Update match to current round 2
    await db.update(matchesTable)
      .set({ current_round: 2 })
      .where(eq(matchesTable.id, match.id))
      .execute();

    const input: AddScoreInput = {
      match_id: match.id,
      competitor_color: 'red',
      score_type: 'head_kick'
    };

    const result = await addScore(input);

    // Score should be added to round 2
    expect(result.score_entries[0].round_id).toBe(round2.id);
    expect(result.current_round_data?.round_number).toBe(2);
    expect(result.current_round_data?.red_score).toBe(3);
  });
});
