
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Match } from '../../../server/src/schema';

interface MatchListProps {
  matches: Match[];
  onMatchSelect: (match: Match) => void;
  selectedMatchId: number | null;
}

export function MatchList({ matches, onMatchSelect, selectedMatchId }: MatchListProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'upcoming':
        return <Badge variant="secondary">⏳ Upcoming</Badge>;
      case 'ongoing':
        return <Badge className="bg-green-600">🔴 Live</Badge>;
      case 'paused':
        return <Badge className="bg-yellow-600">⏸️ Paused</Badge>;
      case 'completed':
        return <Badge className="bg-gray-600">✅ Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getMatchResult = (match: Match) => {
    if (match.status !== 'completed') {
      return `${match.red_total_score} - ${match.blue_total_score}`;
    }
    
    const winnerName = match.winner_color === 'red' 
      ? match.red_competitor_name 
      : match.blue_competitor_name;
    
    return (
      <div className="text-center">
        <div className="text-lg font-bold">
          {match.red_total_score} - {match.blue_total_score}
        </div>
        <div className={`text-sm font-medium ${
          match.winner_color === 'red' ? 'text-red-600' : 'text-blue-600'
        }`}>
          🏆 {winnerName} wins
        </div>
      </div>
    );
  };

  const ongoingMatches = matches.filter(m => m.status === 'ongoing' || m.status === 'paused');
  const upcomingMatches = matches.filter(m => m.status === 'upcoming');
  const completedMatches = matches.filter(m => m.status === 'completed');

  return (
    <div className="space-y-6">
      {/* Ongoing Matches */}
      {ongoingMatches.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">🔴 Live Matches</h2>
          <div className="grid gap-4">
            {ongoingMatches.map((match: Match) => (
              <Card 
                key={match.id} 
                className={`cursor-pointer transition-all ${
                  selectedMatchId === match.id 
                    ? 'ring-2 ring-blue-500 bg-blue-50' 
                    : 'hover:shadow-lg'
                }`}
                onClick={() => onMatchSelect(match)}
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold">{match.weight_category}</h3>
                      <p className="text-gray-600">Round {match.current_round} of {match.total_rounds}</p>
                    </div>
                    {getStatusBadge(match.status)}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 items-center">
                    <div className="text-center">
                      <div className="font-semibold text-red-600">{match.red_competitor_name}</div>
                      <div className="text-sm text-gray-600">🏴 {match.red_competitor_country}</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-3xl font-bold">
                        {match.red_total_score} - {match.blue_total_score}
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="font-semibold text-blue-600">{match.blue_competitor_name}</div>
                      <div className="text-sm text-gray-600">{match.blue_competitor_country} 🏴</div>
                    </div>
                  </div>
                  
                  <div className="mt-4 text-center">
                    <Button size="sm" onClick={(e) => { e.stopPropagation(); onMatchSelect(match); }}>
                      {selectedMatchId === match.id ? 'Currently Viewing' : 'View Match'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Matches */}
      {upcomingMatches.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">⏳ Upcoming Matches</h2>
          <div className="grid gap-4">
            {upcomingMatches.map((match: Match) => (
              <Card 
                key={match.id}
                className={`cursor-pointer transition-all ${
                  selectedMatchId === match.id 
                    ? 'ring-2 ring-blue-500 bg-blue-50' 
                    : 'hover:shadow-lg'
                }`}
                onClick={() => onMatchSelect(match)}
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold">{match.weight_category}</h3>
                      <p className="text-gray-600">{match.total_rounds} rounds × {match.round_duration_minutes} min</p>
                    </div>
                    {getStatusBadge(match.status)}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 items-center">
                    <div className="text-center">
                      <div className="font-semibold text-red-600">{match.red_competitor_name}</div>
                      <div className="text-sm text-gray-600">🏴 {match.red_competitor_country}</div>
                    </div>
                    
                    <div className="text-center text-2xl font-bold text-gray-400">
                      VS
                    </div>
                    
                    <div className="text-center">
                      <div className="font-semibold text-blue-600">{match.blue_competitor_name}</div>
                      <div className="text-sm text-gray-600">{match.blue_competitor_country} 🏴</div>
                    </div>
                  </div>
                  
                  <div className="mt-4 text-center">
                    <Button size="sm" onClick={(e) => { e.stopPropagation(); onMatchSelect(match); }}>
                      {selectedMatchId === match.id ? 'Currently Selected' : 'Select Match'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Completed Matches */}
      {completedMatches.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">✅ Completed Matches</h2>
          <div className="grid gap-4">
            {completedMatches.map((match: Match) => (
              <Card 
                key={match.id}
                className={`cursor-pointer transition-all ${
                  selectedMatchId === match.id 
                    ? 'ring-2 ring-blue-500 bg-blue-50' 
                    : 'hover:shadow-lg'
                }`}
                onClick={() => onMatchSelect(match)}
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold">{match.weight_category}</h3>
                      <p className="text-gray-600">
                        {new Date(match.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    {getStatusBadge(match.status)}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 items-center">
                    <div className="text-center">
                      <div className={`font-semibold ${
                        match.winner_color === 'red' ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {match.red_competitor_name}
                        {match.winner_color === 'red' && ' 🏆'}
                      </div>
                      <div className="text-sm text-gray-600">🏴 {match.red_competitor_country}</div>
                    </div>
                    
                    <div className="text-center">
                      {getMatchResult(match)}
                    </div>
                    
                    <div className="text-center">
                      <div className={`font-semibold ${
                        match.winner_color === 'blue' ? 'text-blue-600' : 'text-gray-600'
                      }`}>
                        {match.blue_competitor_name}
                        {match.winner_color === 'blue' && ' 🏆'}
                      </div>
                      <div className="text-sm text-gray-600">{match.blue_competitor_country} 🏴</div>
                    </div>
                  </div>
                  
                  <div className="mt-4 text-center">
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onMatchSelect(match); }}>
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {matches.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-xl font-semibold mb-2">No Matches Yet</h3>
            <p className="text-gray-600 mb-4">Create your first match to get started!</p>
            <p className="text-sm text-gray-500">Go to Match Settings to create a new match</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
