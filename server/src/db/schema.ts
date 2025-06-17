
import { serial, text, pgTable, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const matchStatusEnum = pgEnum('match_status', ['upcoming', 'ongoing', 'completed', 'paused']);
export const competitorColorEnum = pgEnum('competitor_color', ['red', 'blue']);
export const scoreTypeEnum = pgEnum('score_type', ['punch', 'body_kick', 'head_kick', 'turning_body_kick', 'turning_head_kick']);
export const penaltyTypeEnum = pgEnum('penalty_type', ['grab', 'fall_down', 'out_of_bounds']);

// Matches table
export const matchesTable = pgTable('matches', {
  id: serial('id').primaryKey(),
  weight_category: text('weight_category').notNull(),
  red_competitor_name: text('red_competitor_name').notNull(),
  red_competitor_country: text('red_competitor_country').notNull(),
  blue_competitor_name: text('blue_competitor_name').notNull(),
  blue_competitor_country: text('blue_competitor_country').notNull(),
  status: matchStatusEnum('status').notNull().default('upcoming'),
  current_round: integer('current_round').notNull().default(1),
  total_rounds: integer('total_rounds').notNull().default(3),
  round_duration_minutes: integer('round_duration_minutes').notNull().default(2),
  red_total_score: integer('red_total_score').notNull().default(0),
  blue_total_score: integer('blue_total_score').notNull().default(0),
  winner_color: competitorColorEnum('winner_color'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Rounds table
export const roundsTable = pgTable('rounds', {
  id: serial('id').primaryKey(),
  match_id: integer('match_id').references(() => matchesTable.id).notNull(),
  round_number: integer('round_number').notNull(),
  red_score: integer('red_score').notNull().default(0),
  blue_score: integer('blue_score').notNull().default(0),
  red_penalties: integer('red_penalties').notNull().default(0),
  blue_penalties: integer('blue_penalties').notNull().default(0),
  winner_color: competitorColorEnum('winner_color'),
  started_at: timestamp('started_at'),
  ended_at: timestamp('ended_at'),
  duration_seconds: integer('duration_seconds')
});

// Score entries table
export const scoreEntriesTable = pgTable('score_entries', {
  id: serial('id').primaryKey(),
  match_id: integer('match_id').references(() => matchesTable.id).notNull(),
  round_id: integer('round_id').references(() => roundsTable.id).notNull(),
  competitor_color: competitorColorEnum('competitor_color').notNull(),
  score_type: scoreTypeEnum('score_type').notNull(),
  points: integer('points').notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull()
});

// Penalty entries table
export const penaltyEntriesTable = pgTable('penalty_entries', {
  id: serial('id').primaryKey(),
  match_id: integer('match_id').references(() => matchesTable.id).notNull(),
  round_id: integer('round_id').references(() => roundsTable.id).notNull(),
  competitor_color: competitorColorEnum('competitor_color').notNull(),
  penalty_type: penaltyTypeEnum('penalty_type').notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull()
});

// Relations
export const matchesRelations = relations(matchesTable, ({ many }) => ({
  rounds: many(roundsTable),
  scoreEntries: many(scoreEntriesTable),
  penaltyEntries: many(penaltyEntriesTable)
}));

export const roundsRelations = relations(roundsTable, ({ one, many }) => ({
  match: one(matchesTable, {
    fields: [roundsTable.match_id],
    references: [matchesTable.id]
  }),
  scoreEntries: many(scoreEntriesTable),
  penaltyEntries: many(penaltyEntriesTable)
}));

export const scoreEntriesRelations = relations(scoreEntriesTable, ({ one }) => ({
  match: one(matchesTable, {
    fields: [scoreEntriesTable.match_id],
    references: [matchesTable.id]
  }),
  round: one(roundsTable, {
    fields: [scoreEntriesTable.round_id],
    references: [roundsTable.id]
  })
}));

export const penaltyEntriesRelations = relations(penaltyEntriesTable, ({ one }) => ({
  match: one(matchesTable, {
    fields: [penaltyEntriesTable.match_id],
    references: [matchesTable.id]
  }),
  round: one(roundsTable, {
    fields: [penaltyEntriesTable.round_id],
    references: [roundsTable.id]
  })
}));

// Export all tables
export const tables = {
  matches: matchesTable,
  rounds: roundsTable,
  scoreEntries: scoreEntriesTable,
  penaltyEntries: penaltyEntriesTable
};
