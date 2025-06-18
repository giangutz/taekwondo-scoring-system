
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { matchesTable } from '../db/schema';
import { type CreateMatchInput } from '../schema';
import { getMatches } from '../handlers/get_matches';

// Test input for creating matches
const testMatchInput: CreateMatchInput = {
  weight_category: '-68kg',
  red_competitor_name: 'John Doe',
  red_competitor_country: 'USA',
  blue_competitor_name: 'Jane Smith',
  blue_competitor_country: 'Canada',
  total_rounds: 3,
  round_duration_minutes: 2
};

const testMatchInput2: CreateMatchInput = {
  weight_category: '-58kg',
  red_competitor_name: 'Mike Johnson',
  red_competitor_country: 'UK',
  blue_competitor_name: 'Sarah Wilson',
  blue_competitor_country: 'Australia',
  total_rounds: 3,
  round_duration_minutes: 2
};

describe('getMatches', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no matches exist', async () => {
    const result = await getMatches();
    expect(result).toEqual([]);
  });

  it('should return all matches', async () => {
    // Create two test matches
    await db.insert(matchesTable)
      .values({
        weight_category: testMatchInput.weight_category,
        red_competitor_name: testMatchInput.red_competitor_name,
        red_competitor_country: testMatchInput.red_competitor_country,
        blue_competitor_name: testMatchInput.blue_competitor_name,
        blue_competitor_country: testMatchInput.blue_competitor_country,
        total_rounds: testMatchInput.total_rounds,
        round_duration_minutes: testMatchInput.round_duration_minutes
      })
      .execute();

    await db.insert(matchesTable)
      .values({
        weight_category: testMatchInput2.weight_category,
        red_competitor_name: testMatchInput2.red_competitor_name,
        red_competitor_country: testMatchInput2.red_competitor_country,
        blue_competitor_name: testMatchInput2.blue_competitor_name,
        blue_competitor_country: testMatchInput2.blue_competitor_country,
        total_rounds: testMatchInput2.total_rounds,
        round_duration_minutes: testMatchInput2.round_duration_minutes
      })
      .execute();

    const result = await getMatches();

    expect(result).toHaveLength(2);
    
    // Verify first match (should be most recent due to desc ordering)
    expect(result[0].weight_category).toEqual('-58kg');
    expect(result[0].red_competitor_name).toEqual('Mike Johnson');
    expect(result[0].red_competitor_country).toEqual('UK');
    expect(result[0].blue_competitor_name).toEqual('Sarah Wilson');
    expect(result[0].blue_competitor_country).toEqual('Australia');
    expect(result[0].status).toEqual('upcoming');
    expect(result[0].current_round).toEqual(1);
    expect(result[0].total_rounds).toEqual(3);
    expect(result[0].round_duration_minutes).toEqual(2);
    expect(result[0].red_total_score).toEqual(0);
    expect(result[0].blue_total_score).toEqual(0);
    expect(result[0].winner_color).toBeNull();
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);

    // Verify second match
    expect(result[1].weight_category).toEqual('-68kg');
    expect(result[1].red_competitor_name).toEqual('John Doe');
    expect(result[1].red_competitor_country).toEqual('USA');
    expect(result[1].blue_competitor_name).toEqual('Jane Smith');
    expect(result[1].blue_competitor_country).toEqual('Canada');
  });

  it('should return matches ordered by creation date (most recent first)', async () => {
    // Create first match
    const firstMatch = await db.insert(matchesTable)
      .values({
        weight_category: testMatchInput.weight_category,
        red_competitor_name: testMatchInput.red_competitor_name,
        red_competitor_country: testMatchInput.red_competitor_country,
        blue_competitor_name: testMatchInput.blue_competitor_name,
        blue_competitor_country: testMatchInput.blue_competitor_country,
        total_rounds: testMatchInput.total_rounds,
        round_duration_minutes: testMatchInput.round_duration_minutes
      })
      .returning()
      .execute();

    // Add small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    // Create second match
    const secondMatch = await db.insert(matchesTable)
      .values({
        weight_category: testMatchInput2.weight_category,
        red_competitor_name: testMatchInput2.red_competitor_name,
        red_competitor_country: testMatchInput2.red_competitor_country,
        blue_competitor_name: testMatchInput2.blue_competitor_name,
        blue_competitor_country: testMatchInput2.blue_competitor_country,
        total_rounds: testMatchInput2.total_rounds,
        round_duration_minutes: testMatchInput2.round_duration_minutes
      })
      .returning()
      .execute();

    const result = await getMatches();

    expect(result).toHaveLength(2);
    
    // Most recent match should be first (secondMatch)
    expect(result[0].id).toEqual(secondMatch[0].id);
    expect(result[0].weight_category).toEqual('-58kg');
    
    // Older match should be second (firstMatch)
    expect(result[1].id).toEqual(firstMatch[0].id);
    expect(result[1].weight_category).toEqual('-68kg');

    // Verify ordering by timestamp
    expect(result[0].created_at >= result[1].created_at).toBe(true);
  });

  it('should return matches with different statuses', async () => {
    // Create matches with different statuses
    await db.insert(matchesTable)
      .values({
        weight_category: testMatchInput.weight_category,
        red_competitor_name: testMatchInput.red_competitor_name,
        red_competitor_country: testMatchInput.red_competitor_country,
        blue_competitor_name: testMatchInput.blue_competitor_name,
        blue_competitor_country: testMatchInput.blue_competitor_country,
        total_rounds: testMatchInput.total_rounds,
        round_duration_minutes: testMatchInput.round_duration_minutes,
        status: 'ongoing'
      })
      .execute();

    await db.insert(matchesTable)
      .values({
        weight_category: testMatchInput2.weight_category,
        red_competitor_name: testMatchInput2.red_competitor_name,
        red_competitor_country: testMatchInput2.red_competitor_country,
        blue_competitor_name: testMatchInput2.blue_competitor_name,
        blue_competitor_country: testMatchInput2.blue_competitor_country,
        total_rounds: testMatchInput2.total_rounds,
        round_duration_minutes: testMatchInput2.round_duration_minutes,
        status: 'completed',
        winner_color: 'red'
      })
      .execute();

    const result = await getMatches();

    expect(result).toHaveLength(2);
    
    // Find matches by status
    const ongoingMatch = result.find(match => match.status === 'ongoing');
    const completedMatch = result.find(match => match.status === 'completed');

    expect(ongoingMatch).toBeDefined();
    expect(ongoingMatch?.weight_category).toEqual('-68kg');
    
    expect(completedMatch).toBeDefined();
    expect(completedMatch?.weight_category).toEqual('-58kg');
    expect(completedMatch?.winner_color).toEqual('red');
  });

  it('should handle matches with custom round settings', async () => {
    // Create match with custom settings
    await db.insert(matchesTable)
      .values({
        weight_category: '+87kg',
        red_competitor_name: 'Heavy Red',
        red_competitor_country: 'Germany',
        blue_competitor_name: 'Heavy Blue',
        blue_competitor_country: 'France',
        total_rounds: 5,
        round_duration_minutes: 3
      })
      .execute();

    const result = await getMatches();

    expect(result).toHaveLength(1);
    expect(result[0].total_rounds).toEqual(5);
    expect(result[0].round_duration_minutes).toEqual(3);
    expect(typeof result[0].total_rounds).toBe('number');
    expect(typeof result[0].round_duration_minutes).toBe('number');
  });
});
