
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createMatchInputSchema,
  updateMatchInputSchema,
  addScoreInputSchema,
  addPenaltyInputSchema,
  startMatchInputSchema,
  pauseMatchInputSchema,
  resumeMatchInputSchema,
  endRoundInputSchema
} from './schema';

// Import handlers
import { createMatch } from './handlers/create_match';
import { getMatches } from './handlers/get_matches';
import { getMatchDetail } from './handlers/get_match_detail';
import { updateMatch } from './handlers/update_match';
import { startMatch } from './handlers/start_match';
import { pauseMatch } from './handlers/pause_match';
import { resumeMatch } from './handlers/resume_match';
import { addScore } from './handlers/add_score';
import { addPenalty } from './handlers/add_penalty';
import { endRound } from './handlers/end_round';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Match management
  createMatch: publicProcedure
    .input(createMatchInputSchema)
    .mutation(({ input }) => createMatch(input)),

  getMatches: publicProcedure
    .query(() => getMatches()),

  getMatchDetail: publicProcedure
    .input(z.object({ matchId: z.number() }))
    .query(({ input }) => getMatchDetail(input.matchId)),

  updateMatch: publicProcedure
    .input(updateMatchInputSchema)
    .mutation(({ input }) => updateMatch(input)),

  // Match control
  startMatch: publicProcedure
    .input(startMatchInputSchema)
    .mutation(({ input }) => startMatch(input)),

  pauseMatch: publicProcedure
    .input(pauseMatchInputSchema)
    .mutation(({ input }) => pauseMatch(input)),

  resumeMatch: publicProcedure
    .input(resumeMatchInputSchema)
    .mutation(({ input }) => resumeMatch(input)),

  endRound: publicProcedure
    .input(endRoundInputSchema)
    .mutation(({ input }) => endRound(input)),

  // Scoring
  addScore: publicProcedure
    .input(addScoreInputSchema)
    .mutation(({ input }) => addScore(input)),

  addPenalty: publicProcedure
    .input(addPenaltyInputSchema)
    .mutation(({ input }) => addPenalty(input))
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
