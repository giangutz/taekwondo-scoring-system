
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { trpc } from '@/utils/trpc';
import type { competitorColorSchema, scoreTypeSchema, penaltyTypeSchema } from '../../../server/src/schema';
import { z } from 'zod';

// Create types from the schemas
type CompetitorColor = z.infer<typeof competitorColorSchema>;
type ScoreType = z.infer<typeof scoreTypeSchema>;
type PenaltyType = z.infer<typeof penaltyTypeSchema>;

interface ScoringPanelProps {
  matchId: number;
  onScoreAdded: () => void;
}

export function ScoringPanel({ matchId, onScoreAdded }: ScoringPanelProps) {
  const handleAddScore = async (color: CompetitorColor, scoreType: ScoreType) => {
    try {
      await trpc.addScore.mutate({
        match_id: matchId,
        competitor_color: color,
        score_type: scoreType
      });
      onScoreAdded();
    } catch (error) {
      console.error('Failed to add score:', error);
    }
  };

  const handleAddPenalty = async (color: CompetitorColor, penaltyType: PenaltyType) => {
    try {
      await trpc.addPenalty.mutate({
        match_id: matchId,
        competitor_color: color,
        penalty_type: penaltyType
      });
      onScoreAdded();
    } catch (error) {
      console.error('Failed to add penalty:', error);
    }
  };

  const scoreButtons = [
    { type: 'punch' as ScoreType, label: '👊 Punch', points: 1 },
    { type: 'body_kick' as ScoreType, label: '🦵 Body Kick', points: 2 },
    { type: 'head_kick' as ScoreType, label: '🎯 Head Kick', points: 3 },
    { type: 'turning_body_kick' as ScoreType, label: '🌪️ Turn Body', points: 4 },
    { type: 'turning_head_kick' as ScoreType, label: '⚡ Turn Head', points: 5 }
  ];

  const penaltyButtons = [
    { type: 'grab' as PenaltyType, label: '🤝 Grab' },
    { type: 'fall_down' as PenaltyType, label: '⬇️ Fall Down' },
    { type: 'out_of_bounds' as PenaltyType, label: '🚫 Out of Bounds' }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scoring Panel</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          {/* Red Corner */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-red-600 text-center">Red Corner</h3>
            
            <div className="space-y-2">
              <h4 className="font-medium">Score Points</h4>
              <div className="grid grid-cols-1 gap-2">
                {scoreButtons.map((score) => (
                  <Button
                    key={score.type}
                    onClick={() => handleAddScore('red', score.type)}
                    className="bg-red-600 hover:bg-red-700 text-white justify-between"
                  >
                    <span>{score.label}</span>
                    <span className="font-bold">+{score.points}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Penalties</h4>
              <div className="grid grid-cols-1 gap-2">
                {penaltyButtons.map((penalty) => (
                  <Button
                    key={penalty.type}
                    onClick={() => handleAddPenalty('red', penalty.type)}
                    variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    {penalty.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Blue Corner */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-blue-600 text-center">Blue Corner</h3>
            
            <div className="space-y-2">
              <h4 className="font-medium">Score Points</h4>
              <div className="grid grid-cols-1 gap-2">
                {scoreButtons.map((score) => (
                  <Button
                    key={score.type}
                    onClick={() => handleAddScore('blue', score.type)}
                    className="bg-blue-600 hover:bg-blue-700 text-white justify-between"
                  >
                    <span>{score.label}</span>
                    <span className="font-bold">+{score.points}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Penalties</h4>
              <div className="grid grid-cols-1 gap-2">
                {penaltyButtons.map((penalty) => (
                  <Button
                    key={penalty.type}
                    onClick={() => handleAddPenalty('blue', penalty.type)}
                    variant="outline"
                    className="border-blue-300 text-blue-600 hover:bg-blue-50"
                  >
                    {penalty.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">Penalty Rules</h4>
          <p className="text-sm text-gray-600">
            Each penalty gives +1 point to the opponent. 
            5 penalties in a round results in the opponent winning that round.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
