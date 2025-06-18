
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useState, useEffect } from 'react';
import type { MatchDetail } from '../../../server/src/schema';

interface MatchScoreDisplayProps {
  matchDetail: MatchDetail;
}

export function MatchScoreDisplay({ matchDetail }: MatchScoreDisplayProps) {
  const { match, current_round_data } = matchDetail;
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Calculate time left in current round
  useEffect(() => {
    if (match.status !== 'ongoing' || !current_round_data?.started_at) {
      setTimeLeft(null);
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const startTime = new Date(current_round_data.started_at!);
      const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      const totalTime = match.round_duration_minutes * 60;
      const remaining = Math.max(0, totalTime - elapsed);
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 100);
    
    return () => clearInterval(interval);
  }, [match.status, current_round_data?.started_at, match.round_duration_minutes]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = () => {
    switch (match.status) {
      case 'upcoming':
        return <Badge variant="secondary">Upcoming</Badge>;
      case 'ongoing':
        return <Badge className="bg-green-600">🔴 LIVE</Badge>;
      case 'paused':
        return <Badge className="bg-yellow-600">⏸️ Paused</Badge>;
      case 'completed':
        return <Badge className="bg-gray-600">Completed</Badge>;
      default:
        return <Badge variant="outline">{match.status}</Badge>;
    }
  };

  const getWinnerDisplay = () => {
    if (match.status !== 'completed' || !match.winner_color) return null;
    
    return (
      <div className="text-center mb-4">
        <Badge className={`text-lg px-4 py-2 ${
          match.winner_color === 'red' 
            ? 'bg-red-600' 
            : 'bg-blue-600'
        }`}>
          🏆 {match.winner_color === 'red' ? match.red_competitor_name : match.blue_competitor_name} WINS!
        </Badge>
      </div>
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Weight Category & Status */}
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold mb-2">{match.weight_category}</h2>
        <div className="flex justify-center items-center gap-4">
          {getStatusBadge()}
          <span className="text-gray-600">
            Round {match.current_round} of {match.total_rounds}
          </span>
        </div>
      </div>

      {getWinnerDisplay()}

      {/* Timer */}
      {timeLeft !== null && (
        <Card className="mb-6">
          <CardContent className="text-center py-6">
            <div className="text-6xl font-mono font-bold mb-2">
              {formatTime(timeLeft)}
            </div>
            <Progress 
              value={(timeLeft / (match.round_duration_minutes * 60)) * 100} 
              className="w-full max-w-md mx-auto"
            />
          </CardContent>
        </Card>
      )}

      {/* Main Score Display */}
      <div className="grid grid-cols-2 gap-1 mb-6">
        {/* Red Corner */}
        <Card className="bg-red-600 text-white border-0">
          <CardContent className="p-8 text-center relative">
            {/* Country Flag Placeholder */}
            <div className="absolute top-4 left-4 text-2xl">
              🏴 {match.red_competitor_country}
            </div>
            
            {/* Competitor Name */}
            <h3 className="text-2xl font-bold uppercase mb-4 mt-6">
              {match.red_competitor_name}
            </h3>
            
            {/* Score */}
            <div className="text-8xl font-bold mb-4">
              {match.red_total_score}
            </div>
            
            {/* Current Round Score */}
            {current_round_data && (
              <div className="text-xl opacity-80">
                Round {match.current_round}: {current_round_data.red_score}
              </div>
            )}
            
            {/* Penalties */}
            <div className="mt-4">
              <div className="text-lg">
                Penalties: {current_round_data?.red_penalties || 0}
              </div>
              {(current_round_data?.red_penalties || 0) > 0 && (
                <div className="flex justify-center mt-2 gap-1">
                  {Array.from({ length: current_round_data?.red_penalties || 0 }).map((_, i) => (
                    <div key={i} className="w-4 h-4 bg-yellow-400 rounded-full" />
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Blue Corner */}
        <Card className="bg-blue-600 text-white border-0">
          <CardContent className="p-8 text-center relative">
            {/* Country Flag Placeholder */}
            <div className="absolute top-4 right-4 text-2xl">
              {match.blue_competitor_country} 🏴
            </div>
            
            {/* Competitor Name */}
            <h3 className="text-2xl font-bold uppercase mb-4 mt-6">
              {match.blue_competitor_name}
            </h3>
            
            {/* Score */}
            <div className="text-8xl font-bold mb-4">
              {match.blue_total_score}
            </div>
            
            {/* Current Round Score */}
            {current_round_data && (
              <div className="text-xl opacity-80">
                Round {match.current_round}: {current_round_data.blue_score}
              </div>
            )}
            
            {/* Penalties */}
            <div className="mt-4">
              <div className="text-lg">
                Penalties: {current_round_data?.blue_penalties || 0}
              </div>
              {(current_round_data?.blue_penalties || 0) > 0 && (
                <div className="flex justify-center mt-2 gap-1">
                  {Array.from({ length: current_round_data?.blue_penalties || 0 }).map((_, i) => (
                    <div key={i} className="w-4 h-4 bg-yellow-400 rounded-full" />
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Round History */}
      {matchDetail.rounds.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h4 className="font-semibold mb-4">Round History</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {matchDetail.rounds.map((round) => (
                <div 
                  key={round.id} 
                  className={`p-4 rounded-lg border ${
                    round.round_number === match.current_round 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200'
                  }`}
                >
                  <div className="text-center font-semibold mb-2">
                    Round {round.round_number}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-red-600 font-bold">{round.red_score}</span>
                    <span className="text-xs text-gray-500">-</span>
                    <span className="text-blue-600 font-bold">{round.blue_score}</span>
                  </div>
                  {round.winner_color && (
                    <div className="text-center mt-2">
                      <Badge 
                        variant="outline" 
                        className={round.winner_color === 'red' ? 'text-red-600' : 'text-blue-600'}
                      >
                        {round.winner_color === 'red' ? 'Red' : 'Blue'} wins
                      </Badge>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
