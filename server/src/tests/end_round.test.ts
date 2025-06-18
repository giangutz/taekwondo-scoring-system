
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { matchesTable, roundsTable, scoreEntriesTable, penaltyEntriesTable } from '../db/schema';
import { type CreateMatchInput, type AddScoreInput, type AddPenaltyInput, type StartMatchInput, type EndRoundInput } from '../schema';
import { endRound } from '../handlers/end_round';
import { eq, and } from 'drizzle-orm';

const testMatchInput: CreateMatchInput = {
  weight_category: '-68kg',
  red_competitor_name: 'John Doe',
  red_competitor_country: 'USA',
  blue_competitor_name: 'Jane Smith',
  blue_competitor_country: 'CAN',
  total_rounds: 3,
  round_duration_minutes: 2
};

// Helper function to create a match directly in database
const createTestMatch = async (input: CreateMatchInput) => {
  const result = await db.insert(matchesTable)
    .values({
      weight_category: input.weight_category,
      red_competitor_name: input.red_competitor_name,
      red_competitor_country: input.red_competitor_country,
      blue_competitor_name: input.blue_competitor_name,
      blue_competitor_country: input.blue_competitor_country,
      total_rounds: input.total_rounds || 3,
      round_duration_minutes: input.round_duration_minutes || 2
    })
    .returning()
    .execute();
  
  return result[0];
};

// Helper function to start a match directly in database
const startTestMatch = async (matchId: number) => {
  // Update match status to ongoing
  await db.update(matchesTable)
    .set({
      status: 'ongoing',
      updated_at: new Date()
    })
    .where(eq(matchesTable.id, matchId))
    .execute();

  // Create first round with started_at timestamp
  const roundResult = await db.insert(roundsTable)
    .values({
      match_id: matchId,
      round_number: 1,
      started_at: new Date(Date.now() - 5000) // Start 5 seconds ago to ensure duration > 0
    })
    .returning()
    .execute();

  return roundResult[0];
};

// Helper function to add score directly to database
const addTestScore = async (matchId: number, roundId: number, color: 'red' | 'blue', scoreType: string, points: number) => {
  // Add score entry
  await db.insert(scoreEntriesTable)
    .values({
      match_id: matchId,
      round_id: roundId,
      competitor_color: color,
      score_type: scoreType as any,
      points: points
    })
    .execute();

  // Update round score
  const rounds = await db.select()
    .from(roundsTable)
    .where(eq(roundsTable.id, roundId))
    .execute();

  const currentRound = rounds[0];
  const updatedValues = color === 'red' 
    ? { red_score: currentRound.red_score + points }
    : { blue_score: currentRound.blue_score + points };

  await db.update(roundsTable)
    .set(updatedValues)
    .where(eq(roundsTable.id, roundId))
    .execute();

  // Update match total score
  const matches = await db.select()
    .from(matchesTable)
    .where(eq(matchesTable.id, matchId))
    .execute();

  const currentMatch = matches[0];
  const updatedMatchValues = color === 'red'
    ? { red_total_score: currentMatch.red_total_score + points }
    : { blue_total_score: currentMatch.blue_total_score + points };

  await db.update(matchesTable)
    .set({
      ...updatedMatchValues,
      updated_at: new Date()
    })
    .where(eq(matchesTable.id, matchId))
    .execute();
};

// Helper function to add penalty directly to database
const addTestPenalty = async (matchId: number, roundId: number, color: 'red' | 'blue', penaltyType: string) => {
  // Add penalty entry
  await db.insert(penaltyEntriesTable)
    .values({
      match_id: matchId,
      round_id: roundId,
      competitor_color: color,
      penalty_type: penaltyType as any
    })
    .execute();

  // Add 1 point to opponent's score (penalty gives opponent a point)
  const opponentColor = color === 'red' ? 'blue' : 'red';
  
  // Update round score
  const rounds = await db.select()
    .from(roundsTable)
    .where(eq(roundsTable.id, roundId))
    .execute();

  const currentRound = rounds[0];
  const updatedValues = opponentColor === 'red' 
    ? { red_score: currentRound.red_score + 1 }
    : { blue_score: currentRound.blue_score + 1 };

  await db.update(roundsTable)
    .set(updatedValues)
    .where(eq(roundsTable.id, roundId))
    .execute();

  // Update match total score
  const matches = await db.select()
    .from(matchesTable)
    .where(eq(matchesTable.id, matchId))
    .execute();

  const currentMatch = matches[0];
  const updatedMatchValues = opponentColor === 'red'
    ? { red_total_score: currentMatch.red_total_score + 1 }
    : { blue_total_score: currentMatch.blue_total_score + 1 };

  await db.update(matchesTable)
    .set({
      ...updatedMatchValues,
      updated_at: new Date()
    })
    .where(eq(matchesTable.id, matchId))
    .execute();
};

describe('endRound', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should end the current round and calculate correct scores', async () => {
    // Create and start match
    const match = await createTestMatch(testMatchInput);
    const round = await startTestMatch(match.id);

    // Add some scores
    await addTestScore(match.id, round.id, 'red', 'punch', 1); // 1 point
    await addTestScore(match.id, round.id, 'red', 'head_kick', 3); // 3 points
    await addTestScore(match.id, round.id, 'blue', 'body_kick', 2); // 2 points

    const result = await endRound({ match_id: match.id });

    // Check round ended
    const endedRound = result.rounds.find(r => r.round_number === 1);
    expect(endedRound).toBeDefined();
    expect(endedRound!.ended_at).toBeInstanceOf(Date);
    expect(endedRound!.red_score).toEqual(4); // 1 + 3
    expect(endedRound!.blue_score).toEqual(2);
    expect(endedRound!.winner_color).toEqual('red');
    expect(endedRound!.duration_seconds).toBeGreaterThanOrEqual(0);

    // Check match advanced to round 2
    expect(result.match.current_round).toEqual(2);
    expect(result.match.status).toEqual('ongoing');
    expect(result.current_round_data).toBeDefined();
    expect(result.current_round_data!.round_number).toEqual(2);
  });

  it('should complete match after final round', async () => {
    // Create match with 1 round only
    const singleRoundMatch = await createTestMatch({ ...testMatchInput, total_rounds: 1 });
    const round = await startTestMatch(singleRoundMatch.id);

    // Add scores to determine winner
    await addTestScore(singleRoundMatch.id, round.id, 'red', 'head_kick', 3); // 3 points
    await addTestScore(singleRoundMatch.id, round.id, 'blue', 'punch', 1); // 1 point

    const result = await endRound({ match_id: singleRoundMatch.id });

    // Check match completed
    expect(result.match.status).toEqual('completed');
    expect(result.match.winner_color).toEqual('red');
    expect(result.current_round_data).toBeNull();
    expect(result.match.red_total_score).toEqual(3);
    expect(result.match.blue_total_score).toEqual(1);
  });

  it('should implement 5-penalty rule for round winner', async () => {
    const match = await createTestMatch(testMatchInput);
    const round = await startTestMatch(match.id);

    // Add 5 penalties to red competitor
    for (let i = 0; i < 5; i++) {
      await addTestPenalty(match.id, round.id, 'red', 'grab');
    }

    // Add higher score to red competitor
    await addTestScore(match.id, round.id, 'red', 'turning_head_kick', 5); // 5 points
    await addTestScore(match.id, round.id, 'blue', 'punch', 1); // 1 point

    const result = await endRound({ match_id: match.id });

    // Despite red having higher total score, blue should win due to 5-penalty rule
    const endedRound = result.rounds.find(r => r.round_number === 1);
    expect(endedRound!.red_penalties).toEqual(5);
    expect(endedRound!.winner_color).toEqual('blue'); // Blue wins due to 5-penalty rule
  });

  it('should handle penalties correctly in score calculation', async () => {
    const match = await createTestMatch(testMatchInput);
    const round = await startTestMatch(match.id);

    // Add penalties (each penalty adds 1 point to opponent)
    await addTestPenalty(match.id, round.id, 'red', 'grab'); // +1 to blue
    await addTestPenalty(match.id, round.id, 'blue', 'fall_down'); // +1 to red

    // Add regular scores
    await addTestScore(match.id, round.id, 'red', 'punch', 1); // +1 to red
    await addTestScore(match.id, round.id, 'blue', 'body_kick', 2); // +2 to blue

    const result = await endRound({ match_id: match.id });

    const endedRound = result.rounds.find(r => r.round_number === 1);
    expect(endedRound!.red_penalties).toEqual(1);
    expect(endedRound!.blue_penalties).toEqual(1);
    
    // Red: 1 (score) + 1 (penalty point from blue) = 2
    // Blue: 2 (score) + 1 (penalty point from red) = 3
    expect(endedRound!.red_score).toEqual(2);
    expect(endedRound!.blue_score).toEqual(3);
    expect(endedRound!.winner_color).toEqual('blue');
  });

  it('should handle tie rounds correctly', async () => {
    const match = await createTestMatch(testMatchInput);
    const round = await startTestMatch(match.id);

    // Add equal scores
    await addTestScore(match.id, round.id, 'red', 'body_kick', 2); // 2 points
    await addTestScore(match.id, round.id, 'blue', 'body_kick', 2); // 2 points

    const result = await endRound({ match_id: match.id });

    const endedRound = result.rounds.find(r => r.round_number === 1);
    expect(endedRound!.red_score).toEqual(2);
    expect(endedRound!.blue_score).toEqual(2);
    expect(endedRound!.winner_color).toBeNull(); // No winner in tie
  });

  it('should handle match with no winner', async () => {
    // Create match with 1 round only
    const singleRoundMatch = await createTestMatch({ ...testMatchInput, total_rounds: 1 });
    const round = await startTestMatch(singleRoundMatch.id);

    // Add equal scores
    await addTestScore(singleRoundMatch.id, round.id, 'red', 'punch', 1); // 1 point
    await addTestScore(singleRoundMatch.id, round.id, 'blue', 'punch', 1); // 1 point

    const result = await endRound({ match_id: singleRoundMatch.id });

    expect(result.match.status).toEqual('completed');
    expect(result.match.winner_color).toBeNull(); // Tie match
    expect(result.match.red_total_score).toEqual(1);
    expect(result.match.blue_total_score).toEqual(1);
  });

  it('should throw error for non-existent match', async () => {
    await expect(endRound({ match_id: 999 })).rejects.toThrow(/match not found/i);
  });

  it('should throw error for non-ongoing match', async () => {
    const match = await createTestMatch(testMatchInput);
    // Don't start the match - it remains in 'upcoming' status

    await expect(endRound({ match_id: match.id })).rejects.toThrow(/not currently ongoing/i);
  });

  it('should throw error when round already ended', async () => {
    const match = await createTestMatch(testMatchInput);
    await startTestMatch(match.id);

    // End the round once
    await endRound({ match_id: match.id });

    // Move back to round 1 to test ending already ended round
    await db.update(matchesTable)
      .set({ current_round: 1 })
      .where(eq(matchesTable.id, match.id))
      .execute();

    // Try to end the same round again - should fail
    await expect(endRound({ match_id: match.id })).rejects.toThrow(/already ended/i);
  });

  it('should update match timestamps correctly', async () => {
    const match = await createTestMatch(testMatchInput);
    await startTestMatch(match.id);

    const beforeEnd = new Date();
    const result = await endRound({ match_id: match.id });
    const afterEnd = new Date();

    expect(result.match.updated_at).toBeInstanceOf(Date);
    expect(result.match.updated_at >= beforeEnd).toBe(true);
    expect(result.match.updated_at <= afterEnd).toBe(true);
  });

  it('should preserve score and penalty entries', async () => {
    const match = await createTestMatch(testMatchInput);
    const round = await startTestMatch(match.id);

    // Add various entries
    await addTestScore(match.id, round.id, 'red', 'punch', 1);
    await addTestScore(match.id, round.id, 'blue', 'head_kick', 3);
    await addTestPenalty(match.id, round.id, 'red', 'grab');

    const result = await endRound({ match_id: match.id });

    // All entries should be preserved
    expect(result.score_entries).toHaveLength(2);
    expect(result.penalty_entries).toHaveLength(1);
    
    // Verify entry details
    const redScore = result.score_entries.find(e => e.competitor_color === 'red');
    const blueScore = result.score_entries.find(e => e.competitor_color === 'blue');
    const redPenalty = result.penalty_entries.find(e => e.competitor_color === 'red');

    expect(redScore?.score_type).toEqual('punch');
    expect(blueScore?.score_type).toEqual('head_kick');
    expect(redPenalty?.penalty_type).toEqual('grab');
  });

  it('should handle blue competitor getting 5 penalties', async () => {
    const match = await createTestMatch(testMatchInput);
    const round = await startTestMatch(match.id);

    // Add 5 penalties to blue competitor
    for (let i = 0; i < 5; i++) {
      await addTestPenalty(match.id, round.id, 'blue', 'out_of_bounds');
    }

    // Add higher score to blue competitor
    await addTestScore(match.id, round.id, 'blue', 'turning_head_kick', 5); // 5 points
    await addTestScore(match.id, round.id, 'red', 'punch', 1); // 1 point

    const result = await endRound({ match_id: match.id });

    // Despite blue having higher total score, red should win due to 5-penalty rule
    const endedRound = result.rounds.find(r => r.round_number === 1);
    expect(endedRound!.blue_penalties).toEqual(5);
    expect(endedRound!.winner_color).toEqual('red'); // Red wins due to blue's 5 penalties
  });

  it('should handle round with no scores or penalties', async () => {
    const match = await createTestMatch(testMatchInput);
    await startTestMatch(match.id);

    const result = await endRound({ match_id: match.id });

    const endedRound = result.rounds.find(r => r.round_number === 1);
    expect(endedRound!.red_score).toEqual(0);
    expect(endedRound!.blue_score).toEqual(0);
    expect(endedRound!.red_penalties).toEqual(0);
    expect(endedRound!.blue_penalties).toEqual(0);
    expect(endedRound!.winner_color).toBeNull(); // No winner with 0-0 score
  });

  it('should handle current round not found error', async () => {
    const match = await createTestMatch(testMatchInput);
    
    // Start match but delete the round to simulate missing round
    await db.update(matchesTable)
      .set({ status: 'ongoing' })
      .where(eq(matchesTable.id, match.id))
      .execute();

    await expect(endRound({ match_id: match.id })).rejects.toThrow(/current round not found/i);
  });
});
