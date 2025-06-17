
import { z } from 'zod';

// Enums
export const matchStatusSchema = z.enum(['upcoming', 'ongoing', 'completed', 'paused']);
export const competitorColorSchema = z.enum(['red', 'blue']);
export const scoreTypeSchema = z.enum(['punch', 'body_kick', 'head_kick', 'turning_body_kick', 'turning_head_kick']);
export const penaltyTypeSchema = z.enum(['grab', 'fall_down', 'out_of_bounds']);

// Match schema
export const matchSchema = z.object({
  id: z.number(),
  weight_category: z.string(),
  red_competitor_name: z.string(),
  red_competitor_country: z.string(),
  blue_competitor_name: z.string(),
  blue_competitor_country: z.string(),
  status: matchStatusSchema,
  current_round: z.number().int(),
  total_rounds: z.number().int(),
  round_duration_minutes: z.number(),
  red_total_score: z.number().int(),
  blue_total_score: z.number().int(),
  winner_color: competitorColorSchema.nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Match = z.infer<typeof matchSchema>;

// Round schema
export const roundSchema = z.object({
  id: z.number(),
  match_id: z.number(),
  round_number: z.number().int(),
  red_score: z.number().int(),
  blue_score: z.number().int(),
  red_penalties: z.number().int(),
  blue_penalties: z.number().int(),
  winner_color: competitorColorSchema.nullable(),
  started_at: z.coerce.date().nullable(),
  ended_at: z.coerce.date().nullable(),
  duration_seconds: z.number().int().nullable()
});

export type Round = z.infer<typeof roundSchema>;

// Score entry schema
export const scoreEntrySchema = z.object({
  id: z.number(),
  match_id: z.number(),
  round_id: z.number(),
  competitor_color: competitorColorSchema,
  score_type: scoreTypeSchema,
  points: z.number().int(),
  timestamp: z.coerce.date()
});

export type ScoreEntry = z.infer<typeof scoreEntrySchema>;

// Penalty entry schema
export const penaltyEntrySchema = z.object({
  id: z.number(),
  match_id: z.number(),
  round_id: z.number(),
  competitor_color: competitorColorSchema,
  penalty_type: penaltyTypeSchema,
  timestamp: z.coerce.date()
});

export type PenaltyEntry = z.infer<typeof penaltyEntrySchema>;

// Input schemas
export const createMatchInputSchema = z.object({
  weight_category: z.string(),
  red_competitor_name: z.string(),
  red_competitor_country: z.string(),
  blue_competitor_name: z.string(),
  blue_competitor_country: z.string(),
  total_rounds: z.number().int().min(1).max(5).default(3),
  round_duration_minutes: z.number().min(1).max(10).default(2)
});

export type CreateMatchInput = z.infer<typeof createMatchInputSchema>;

export const updateMatchInputSchema = z.object({
  id: z.number(),
  weight_category: z.string().optional(),
  red_competitor_name: z.string().optional(),
  red_competitor_country: z.string().optional(),
  blue_competitor_name: z.string().optional(),
  blue_competitor_country: z.string().optional(),
  total_rounds: z.number().int().min(1).max(5).optional(),
  round_duration_minutes: z.number().min(1).max(10).optional()
});

export type UpdateMatchInput = z.infer<typeof updateMatchInputSchema>;

export const addScoreInputSchema = z.object({
  match_id: z.number(),
  competitor_color: competitorColorSchema,
  score_type: scoreTypeSchema
});

export type AddScoreInput = z.infer<typeof addScoreInputSchema>;

export const addPenaltyInputSchema = z.object({
  match_id: z.number(),
  competitor_color: competitorColorSchema,
  penalty_type: penaltyTypeSchema
});

export type AddPenaltyInput = z.infer<typeof addPenaltyInputSchema>;

export const startMatchInputSchema = z.object({
  match_id: z.number()
});

export type StartMatchInput = z.infer<typeof startMatchInputSchema>;

export const pauseMatchInputSchema = z.object({
  match_id: z.number()
});

export type PauseMatchInput = z.infer<typeof pauseMatchInputSchema>;

export const resumeMatchInputSchema = z.object({
  match_id: z.number()
});

export type ResumeMatchInput = z.infer<typeof resumeMatchInputSchema>;

export const endRoundInputSchema = z.object({
  match_id: z.number()
});

export type EndRoundInput = z.infer<typeof endRoundInputSchema>;

// Match with detailed information
export const matchDetailSchema = z.object({
  match: matchSchema,
  rounds: z.array(roundSchema),
  current_round_data: roundSchema.nullable(),
  score_entries: z.array(scoreEntrySchema),
  penalty_entries: z.array(penaltyEntrySchema)
});

export type MatchDetail = z.infer<typeof matchDetailSchema>;
