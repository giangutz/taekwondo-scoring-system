
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { matchesTable, roundsTable, scoreEntriesTable, penaltyEntriesTable } from '../db/schema';
import { getMatchDetail } from '../handlers/get_match_detail';
import { eq } from 'drizzle-orm';

describe('getMatchDetail', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return match detail for existing match', async () => {
    // Insert test match
    const matchResult = await db.insert(matchesTable).values({
      weight_category: 'Lightweight',
      red_competitor_name: 'John Doe',
      red_competitor_country: 'USA',
      blue_competitor_name: 'Jane Smith',
      blue_competitor_country: 'Canada',
      status: 'upcoming',
      current_round: 1,
      total_rounds: 3,
      round_duration_minutes: 2,
      red_total_score: 0,
      blue_total_score: 0
    }).returning().execute();

    const match = matchResult[0];
    
    const result = await getMatchDetail(match.id);

    expect(result.match.id).toEqual(match.id);
    expect(result.match.weight_category).toEqual('Lightweight');
    expect(result.match.red_competitor_name).toEqual('John Doe');
    expect(result.match.red_competitor_country).toEqual('USA');
    expect(result.match.blue_competitor_name).toEqual('Jane Smith');
    expect(result.match.blue_competitor_country).toEqual('Canada');
    expect(result.match.status).toEqual('upcoming');
    expect(result.match.current_round).toEqual(1);
    expect(result.match.total_rounds).toEqual(3);
    expect(result.match.round_duration_minutes).toEqual(2);
    expect(result.match.red_total_score).toEqual(0);
    expect(result.match.blue_total_score).toEqual(0);
    expect(result.match.winner_color).toBeNull();
    expect(result.match.created_at).toBeInstanceOf(Date);
    expect(result.match.updated_at).toBeInstanceOf(Date);
  });

  it('should return empty arrays for new match without rounds or entries', async () => {
    // Insert test match
    const matchResult = await db.insert(matchesTable).values({
      weight_category: 'Lightweight',
      red_competitor_name: 'John Doe',
      red_competitor_country: 'USA',
      blue_competitor_name: 'Jane Smith',
      blue_competitor_country: 'Canada',
      status: 'upcoming',
      current_round: 1,
      total_rounds: 3,
      round_duration_minutes: 2
    }).returning().execute();

    const match = matchResult[0];
    
    const result = await getMatchDetail(match.id);

    expect(result.rounds).toEqual([]);
    expect(result.current_round_data).toBeNull();
    expect(result.score_entries).toEqual([]);
    expect(result.penalty_entries).toEqual([]);
  });

  it('should return current round data for ongoing match', async () => {
    // Insert test match
    const matchResult = await db.insert(matchesTable).values({
      weight_category: 'Lightweight',
      red_competitor_name: 'John Doe',
      red_competitor_country: 'USA',
      blue_competitor_name: 'Jane Smith',
      blue_competitor_country: 'Canada',
      status: 'ongoing',
      current_round: 1,
      total_rounds: 3,
      round_duration_minutes: 2
    }).returning().execute();

    const match = matchResult[0];

    // Insert current round
    await db.insert(roundsTable).values({
      match_id: match.id,
      round_number: 1,
      red_score: 0,
      blue_score: 0,
      red_penalties: 0,
      blue_penalties: 0,
      started_at: new Date()
    }).execute();
    
    const result = await getMatchDetail(match.id);

    expect(result.match.status).toEqual('ongoing');
    expect(result.rounds).toHaveLength(1);
    expect(result.current_round_data).not.toBeNull();
    expect(result.current_round_data?.round_number).toEqual(1);
    expect(result.current_round_data?.red_score).toEqual(0);
    expect(result.current_round_data?.blue_score).toEqual(0);
    expect(result.current_round_data?.red_penalties).toEqual(0);
    expect(result.current_round_data?.blue_penalties).toEqual(0);
    expect(result.current_round_data?.winner_color).toBeNull();
    expect(result.current_round_data?.started_at).toBeInstanceOf(Date);
    expect(result.current_round_data?.ended_at).toBeNull();
    expect(result.current_round_data?.duration_seconds).toBeNull();
  });

  it('should include score entries with correct ordering', async () => {
    // Insert test match
    const matchResult = await db.insert(matchesTable).values({
      weight_category: 'Lightweight',
      red_competitor_name: 'John Doe',
      red_competitor_country: 'USA',
      blue_competitor_name: 'Jane Smith',
      blue_competitor_country: 'Canada',
      status: 'ongoing',
      current_round: 1,
      total_rounds: 3,
      round_duration_minutes: 2
    }).returning().execute();

    const match = matchResult[0];

    // Insert round
    const roundResult = await db.insert(roundsTable).values({
      match_id: match.id,
      round_number: 1,
      red_score: 4,
      blue_score: 2,
      started_at: new Date()
    }).returning().execute();

    const round = roundResult[0];

    // Insert score entries with different timestamps
    const now = new Date();
    const earlier = new Date(now.getTime() - 2000);
    const later = new Date(now.getTime() + 1000);

    await db.insert(scoreEntriesTable).values([
      {
        match_id: match.id,
        round_id: round.id,
        competitor_color: 'red',
        score_type: 'punch',
        points: 1,
        timestamp: earlier
      },
      {
        match_id: match.id,
        round_id: round.id,
        competitor_color: 'blue',
        score_type: 'body_kick',
        points: 2,
        timestamp: now
      },
      {
        match_id: match.id,
        round_id: round.id,
        competitor_color: 'red',
        score_type: 'head_kick',
        points: 3,
        timestamp: later
      }
    ]).execute();
    
    const result = await getMatchDetail(match.id);

    expect(result.score_entries).toHaveLength(3);
    expect(result.score_entries[0].competitor_color).toEqual('red');
    expect(result.score_entries[0].score_type).toEqual('punch');
    expect(result.score_entries[0].points).toEqual(1);
    expect(result.score_entries[1].competitor_color).toEqual('blue');
    expect(result.score_entries[1].score_type).toEqual('body_kick');
    expect(result.score_entries[1].points).toEqual(2);
    expect(result.score_entries[2].competitor_color).toEqual('red');
    expect(result.score_entries[2].score_type).toEqual('head_kick');
    expect(result.score_entries[2].points).toEqual(3);
    
    // Verify timestamps are ordered
    expect(result.score_entries[0].timestamp <= result.score_entries[1].timestamp).toBe(true);
    expect(result.score_entries[1].timestamp <= result.score_entries[2].timestamp).toBe(true);
  });

  it('should include penalty entries with correct ordering', async () => {
    // Insert test match
    const matchResult = await db.insert(matchesTable).values({
      weight_category: 'Lightweight',
      red_competitor_name: 'John Doe',
      red_competitor_country: 'USA',
      blue_competitor_name: 'Jane Smith',
      blue_competitor_country: 'Canada',
      status: 'ongoing',
      current_round: 1,
      total_rounds: 3,
      round_duration_minutes: 2
    }).returning().execute();

    const match = matchResult[0];

    // Insert round
    const roundResult = await db.insert(roundsTable).values({
      match_id: match.id,
      round_number: 1,
      red_penalties: 2,
      blue_penalties: 1,
      started_at: new Date()
    }).returning().execute();

    const round = roundResult[0];

    // Insert penalty entries with different timestamps
    const now = new Date();
    const earlier = new Date(now.getTime() - 2000);
    const later = new Date(now.getTime() + 1000);

    await db.insert(penaltyEntriesTable).values([
      {
        match_id: match.id,
        round_id: round.id,
        competitor_color: 'red',
        penalty_type: 'grab',
        timestamp: earlier
      },
      {
        match_id: match.id,
        round_id: round.id,
        competitor_color: 'blue',
        penalty_type: 'fall_down',
        timestamp: now
      },
      {
        match_id: match.id,
        round_id: round.id,
        competitor_color: 'red',
        penalty_type: 'out_of_bounds',
        timestamp: later
      }
    ]).execute();
    
    const result = await getMatchDetail(match.id);

    expect(result.penalty_entries).toHaveLength(3);
    expect(result.penalty_entries[0].competitor_color).toEqual('red');
    expect(result.penalty_entries[0].penalty_type).toEqual('grab');
    expect(result.penalty_entries[1].competitor_color).toEqual('blue');
    expect(result.penalty_entries[1].penalty_type).toEqual('fall_down');
    expect(result.penalty_entries[2].competitor_color).toEqual('red');
    expect(result.penalty_entries[2].penalty_type).toEqual('out_of_bounds');
    
    // Verify timestamps are ordered
    expect(result.penalty_entries[0].timestamp <= result.penalty_entries[1].timestamp).toBe(true);
    expect(result.penalty_entries[1].timestamp <= result.penalty_entries[2].timestamp).toBe(true);
  });

  it('should return rounds in correct order', async () => {
    // Insert test match
    const matchResult = await db.insert(matchesTable).values({
      weight_category: 'Lightweight',
      red_competitor_name: 'John Doe',
      red_competitor_country: 'USA',
      blue_competitor_name: 'Jane Smith',
      blue_competitor_country: 'Canada',
      status: 'completed',
      current_round: 3,
      total_rounds: 3,
      round_duration_minutes: 2
    }).returning().execute();

    const match = matchResult[0];
    
    // Insert rounds in reverse order to test ordering
    await db.insert(roundsTable).values([
      {
        match_id: match.id,
        round_number: 3,
        red_score: 5,
        blue_score: 3
      },
      {
        match_id: match.id,
        round_number: 1,
        red_score: 2,
        blue_score: 1
      },
      {
        match_id: match.id,
        round_number: 2,
        red_score: 3,
        blue_score: 4
      }
    ]).execute();
    
    const result = await getMatchDetail(match.id);

    expect(result.rounds).toHaveLength(3);
    expect(result.rounds[0].round_number).toEqual(1);
    expect(result.rounds[1].round_number).toEqual(2);
    expect(result.rounds[2].round_number).toEqual(3);
    expect(result.rounds[0].red_score).toEqual(2);
    expect(result.rounds[1].red_score).toEqual(3);
    expect(result.rounds[2].red_score).toEqual(5);
  });

  it('should return correct current round data based on match current_round', async () => {
    // Insert test match
    const matchResult = await db.insert(matchesTable).values({
      weight_category: 'Lightweight',
      red_competitor_name: 'John Doe',
      red_competitor_country: 'USA',
      blue_competitor_name: 'Jane Smith',
      blue_competitor_country: 'Canada',
      status: 'ongoing',
      current_round: 2,
      total_rounds: 3,
      round_duration_minutes: 2
    }).returning().execute();

    const match = matchResult[0];
    
    // Create multiple rounds
    await db.insert(roundsTable).values([
      {
        match_id: match.id,
        round_number: 1,
        red_score: 2,
        blue_score: 1,
        ended_at: new Date()
      },
      {
        match_id: match.id,
        round_number: 2,
        red_score: 1,
        blue_score: 3,
        started_at: new Date()
      }
    ]).execute();
    
    const result = await getMatchDetail(match.id);

    expect(result.current_round_data).not.toBeNull();
    expect(result.current_round_data?.round_number).toEqual(2);
    expect(result.current_round_data?.red_score).toEqual(1);
    expect(result.current_round_data?.blue_score).toEqual(3);
    expect(result.current_round_data?.started_at).toBeInstanceOf(Date);
    expect(result.current_round_data?.ended_at).toBeNull();
  });

  it('should throw error for non-existent match', async () => {
    await expect(getMatchDetail(999)).rejects.toThrow(/Match with id 999 not found/i);
  });

  it('should handle match with no current round data', async () => {
    // Insert test match with current_round that doesn't exist
    const matchResult = await db.insert(matchesTable).values({
      weight_category: 'Lightweight',
      red_competitor_name: 'John Doe',
      red_competitor_country: 'USA',
      blue_competitor_name: 'Jane Smith',
      blue_competitor_country: 'Canada',
      status: 'upcoming',
      current_round: 5,
      total_rounds: 3,
      round_duration_minutes: 2
    }).returning().execute();

    const match = matchResult[0];
    
    const result = await getMatchDetail(match.id);

    expect(result.current_round_data).toBeNull();
    expect(result.match.current_round).toEqual(5);
    expect(result.rounds).toEqual([]);
  });

  it('should handle match with mixed score and penalty entries', async () => {
    // Insert test match
    const matchResult = await db.insert(matchesTable).values({
      weight_category: 'Lightweight',
      red_competitor_name: 'John Doe',
      red_competitor_country: 'USA',
      blue_competitor_name: 'Jane Smith',
      blue_competitor_country: 'Canada',
      status: 'ongoing',
      current_round: 1,
      total_rounds: 3,
      round_duration_minutes: 2
    }).returning().execute();

    const match = matchResult[0];

    // Insert round
    const roundResult = await db.insert(roundsTable).values({
      match_id: match.id,
      round_number: 1,
      red_score: 2,
      blue_score: 1,
      red_penalties: 1,
      blue_penalties: 0,
      started_at: new Date()
    }).returning().execute();

    const round = roundResult[0];

    // Insert both score and penalty entries
    await db.insert(scoreEntriesTable).values({
      match_id: match.id,
      round_id: round.id,
      competitor_color: 'red',
      score_type: 'body_kick',
      points: 2
    }).execute();

    await db.insert(penaltyEntriesTable).values({
      match_id: match.id,
      round_id: round.id,
      competitor_color: 'red',
      penalty_type: 'grab'
    }).execute();
    
    const result = await getMatchDetail(match.id);

    expect(result.score_entries).toHaveLength(1);
    expect(result.penalty_entries).toHaveLength(1);
    expect(result.score_entries[0].competitor_color).toEqual('red');
    expect(result.penalty_entries[0].competitor_color).toEqual('red');
    expect(result.current_round_data?.red_score).toEqual(2);
    expect(result.current_round_data?.red_penalties).toEqual(1);
  });
});
