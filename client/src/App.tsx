
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/utils/trpc';
import { MatchScoreDisplay } from '@/components/MatchScoreDisplay';
import { MatchSettings } from '@/components/MatchSettings';
import { MatchList } from '@/components/MatchList';
import { ScoringPanel } from '@/components/ScoringPanel';
import type { Match, MatchDetail } from '../../server/src/schema';

function App() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<MatchDetail | null>(null);
  const [activeTab, setActiveTab] = useState('live');

  // Load all matches
  const loadMatches = useCallback(async () => {
    try {
      const result = await trpc.getMatches.query();
      setMatches(result);
    } catch (error) {
      console.error('Failed to load matches:', error);
    }
  }, []);

  // Load match detail
  const loadMatchDetail = useCallback(async (matchId: number) => {
    try {
      const result = await trpc.getMatchDetail.query({ matchId });
      setSelectedMatch(result);
    } catch (error) {
      console.error('Failed to load match detail:', error);
    }
  }, []);

  // Auto-refresh for live matches
  useEffect(() => {
    loadMatches();
    
    const interval = setInterval(() => {
      loadMatches();
      if (selectedMatch && (selectedMatch.match.status === 'ongoing' || selectedMatch.match.status === 'paused')) {
        loadMatchDetail(selectedMatch.match.id);
      }
    }, 2000); // Refresh every 2 seconds for live updates

    return () => clearInterval(interval);
  }, [loadMatches, loadMatchDetail, selectedMatch]);

  // Find ongoing match for auto-selection
  const ongoingMatch = matches.find(match => match.status === 'ongoing');
  
  // Auto-select ongoing match if none selected
  useEffect(() => {
    if (ongoingMatch && (!selectedMatch || selectedMatch.match.id !== ongoingMatch.id)) {
      loadMatchDetail(ongoingMatch.id);
    }
  }, [ongoingMatch, selectedMatch, loadMatchDetail]);

  // Handle match creation
  const handleMatchCreated = useCallback(() => {
    loadMatches();
    setActiveTab('live');
  }, [loadMatches]);

  // Handle match selection
  const handleMatchSelect = useCallback((match: Match) => {
    loadMatchDetail(match.id);
    setActiveTab('live');
  }, [loadMatchDetail]);

  // Helper function to check if deductScore is available
  const isDeductScoreAvailable = () => {
    return 'deductScore' in trpc;
  };

  // Helper function to safely call deductScore
  const safeDeductScore = (params: { match_id: number; competitor_color: 'red' | 'blue' }) => {
    if (isDeductScoreAvailable()) {
      // Type assertion is safe here because we've checked the method exists
      const trpcWithDeduct = trpc as typeof trpc & {
        deductScore: {
          mutate: (input: { match_id: number; competitor_color: 'red' | 'blue' }) => void;
        };
      };
      trpcWithDeduct.deductScore.mutate(params);
    } else {
      console.log(`${params.competitor_color} point deduction requested - backend implementation needed`);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!selectedMatch || selectedMatch.match.status !== 'ongoing') return;

      const matchId = selectedMatch.match.id;
      
      switch (e.key.toLowerCase()) {
        case '1': // Red punch
          trpc.addScore.mutate({ match_id: matchId, competitor_color: 'red', score_type: 'punch' });
          break;
        case '2': // Red body kick
          trpc.addScore.mutate({ match_id: matchId, competitor_color: 'red', score_type: 'body_kick' });
          break;
        case '3': // Red head kick
          trpc.addScore.mutate({ match_id: matchId, competitor_color: 'red', score_type: 'head_kick' });
          break;
        case '4': // Red turning body kick
          trpc.addScore.mutate({ match_id: matchId, competitor_color: 'red', score_type: 'turning_body_kick' });
          break;
        case '5': // Red turning head kick
          trpc.addScore.mutate({ match_id: matchId, competitor_color: 'red', score_type: 'turning_head_kick' });
          break;
        case '6': // Blue punch
          trpc.addScore.mutate({ match_id: matchId, competitor_color: 'blue', score_type: 'punch' });
          break;
        case '7': // Blue body kick
          trpc.addScore.mutate({ match_id: matchId, competitor_color: 'blue', score_type: 'body_kick' });
          break;
        case '8': // Blue head kick
          trpc.addScore.mutate({ match_id: matchId, competitor_color: 'blue', score_type: 'head_kick' });
          break;
        case '9': // Blue turning body kick
          trpc.addScore.mutate({ match_id: matchId, competitor_color: 'blue', score_type: 'turning_body_kick' });
          break;
        case '0': // Blue turning head kick
          trpc.addScore.mutate({ match_id: matchId, competitor_color: 'blue', score_type: 'turning_head_kick' });
          break;
        case 'q': // Red deduct point
          safeDeductScore({ match_id: matchId, competitor_color: 'red' });
          break;
        case 'p': // Blue deduct point
          safeDeductScore({ match_id: matchId, competitor_color: 'blue' });
          break;
        case ' ': // Space to pause/resume
          e.preventDefault();
          if (selectedMatch.match.status === 'ongoing') {
            trpc.pauseMatch.mutate({ match_id: matchId });
          } else if (selectedMatch.match.status === 'paused') {
            trpc.resumeMatch.mutate({ match_id: matchId });
          }
          break;
        case 'r': // End round
          trpc.endRound.mutate({ match_id: matchId });
          break;
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [selectedMatch]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-red-50">
      <div className="container mx-auto p-4">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🥋 Taekwondo Tournament</h1>
          <p className="text-gray-600">Real-time scoring system</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="live">Live Match</TabsTrigger>
            <TabsTrigger value="matches">All Matches</TabsTrigger>
            <TabsTrigger value="settings">Match Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="live" className="space-y-6">
            {selectedMatch ? (
              <div className="space-y-6">
                {/* Main Match Display */}
                <MatchScoreDisplay matchDetail={selectedMatch} />
                
                {/* Scoring Panel for Administrators */}
                {selectedMatch.match.status === 'ongoing' && (
                  <ScoringPanel 
                    matchId={selectedMatch.match.id}
                    onScoreAdded={() => loadMatchDetail(selectedMatch.match.id)}
                  />
                )}

                {/* Match Controls */}
                <Card>
                  <CardHeader>
                    <CardTitle>Match Controls</CardTitle>
                  </CardHeader>
                  <CardContent className="flex gap-4">
                    {selectedMatch.match.status === 'upcoming' && (
                      <Button 
                        onClick={() => trpc.startMatch.mutate({ match_id: selectedMatch.match.id })}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        ▶️ Start Match
                      </Button>
                    )}
                    
                    {selectedMatch.match.status === 'ongoing' && (
                      <>
                        <Button 
                          onClick={() => trpc.pauseMatch.mutate({ match_id: selectedMatch.match.id })}
                          variant="outline"
                        >
                          ⏸️ Pause
                        </Button>
                        <Button 
                          onClick={() => trpc.endRound.mutate({ match_id: selectedMatch.match.id })}
                          className="bg-orange-600 hover:bg-orange-700"
                        >
                          ⏹️ End Round
                        </Button>
                      </>
                    )}
                    
                    {selectedMatch.match.status === 'paused' && (
                      <Button 
                        onClick={() => trpc.resumeMatch.mutate({ match_id: selectedMatch.match.id })}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        ▶️ Resume
                      </Button>
                    )}
                  </CardContent>
                </Card>

                {/* Keyboard Shortcuts Help */}
                <Card>
                  <CardHeader>
                    <CardTitle>Keyboard Shortcuts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <h4 className="font-semibold text-red-600 mb-2">Red Corner</h4>
                        <div className="space-y-1">
                          <div>1 - Punch (1pt)</div>
                          <div>2 - Body Kick (2pts)</div>
                          <div>3 - Head Kick (3pts)</div>
                          <div>4 - Turning Body Kick (4pts)</div>
                          <div>5 - Turning Head Kick (5pts)</div>
                          <div className={isDeductScoreAvailable() ? '' : 'text-gray-500'}>
                            Q - Deduct Point (1pt)
                            {!isDeductScoreAvailable() && ' *'}
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-blue-600 mb-2">Blue Corner</h4>
                        <div className="space-y-1">
                          <div>6 - Punch (1pt)</div>
                          <div>7 - Body Kick (2pts)</div>
                          <div>8 - Head Kick (3pts)</div>
                          <div>9 - Turning Body Kick (4pts)</div>
                          <div>0 - Turning Head Kick (5pts)</div>
                          <div className={isDeductScoreAvailable() ? '' : 'text-gray-500'}>
                            P - Deduct Point (1pt)
                            {!isDeductScoreAvailable() && ' *'}
                          </div>
                        </div>
                      </div>
                      <div className="col-span-2 mt-4 pt-4 border-t">
                        <div><strong>Space</strong> - Pause/Resume</div>
                        <div><strong>R</strong> - End Round</div>
                        {!isDeductScoreAvailable() && (
                          <div className="text-xs text-gray-500 mt-2">
                            * Point deduction feature requires backend implementation
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <h3 className="text-xl font-semibold mb-2">No Active Match</h3>
                  <p className="text-gray-600 mb-4">Select a match from the matches tab or create a new one</p>
                  <Button onClick={() => setActiveTab('matches')}>
                    View All Matches
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="matches">
            <MatchList 
              matches={matches} 
              onMatchSelect={handleMatchSelect}
              selectedMatchId={selectedMatch?.match.id || null}
            />
          </TabsContent>

          <TabsContent value="settings">
            <MatchSettings onMatchCreated={handleMatchCreated} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;
