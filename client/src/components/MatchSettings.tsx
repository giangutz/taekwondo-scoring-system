
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import type { CreateMatchInput } from '../../../server/src/schema';

interface MatchSettingsProps {
  onMatchCreated: () => void;
}

export function MatchSettings({ onMatchCreated }: MatchSettingsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CreateMatchInput>({
    weight_category: '',
    red_competitor_name: '',
    red_competitor_country: '',
    blue_competitor_name: '',
    blue_competitor_country: '',
    total_rounds: 3,
    round_duration_minutes: 2
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await trpc.createMatch.mutate(formData);
      setFormData({
        weight_category: '',
        red_competitor_name: '',
        red_competitor_country: '',
        blue_competitor_name: '',
        blue_competitor_country: '',
        total_rounds: 3,
        round_duration_minutes: 2
      });
      onMatchCreated();
    } catch (error) {
      console.error('Failed to create match:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const weightCategories = [
    'Fin (M -54kg)', 'Fly (M -58kg)', 'Bantam (M -63kg)', 'Feather (M -68kg)',
    'Light (M -74kg)', 'Welter (M -80kg)', 'Middle (M -87kg)', 'Heavy (M +87kg)',
    'Fin (W -46kg)', 'Fly (W -49kg)', 'Bantam (W -53kg)', 'Feather (W -57kg)',
    'Light (W -62kg)', 'Welter (W -67kg)', 'Middle (W -73kg)', 'Heavy (W +73kg)'
  ];

  const countries = [
    'KOR', 'USA', 'CHN', 'RUS', 'GBR', 'FRA', 'GER', 'JPN', 'BRA', 'AUS',
    'CAN', 'ESP', 'ITA', 'NED', 'MEX', 'TUR', 'IRI', 'UKR', 'POL', 'SWE'
  ];

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-center">🏆 Create New Match</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Weight Category */}
          <div className="space-y-2">
            <Label htmlFor="weight_category">Weight Category</Label>
            <Select 
              value={formData.weight_category || ''}
              onValueChange={(value: string) => setFormData((prev: CreateMatchInput) => ({ ...prev, weight_category: value }))}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select weight category" />
              </SelectTrigger>
              <SelectContent>
                {weightCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Red Corner */}
          <div className="space-y-4 p-4 bg-red-50 rounded-lg border border-red-200">
            <h3 className="font-semibold text-red-700">🔴 Red Corner</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="red_competitor_name">Competitor Name</Label>
                <Input
                  id="red_competitor_name"
                  value={formData.red_competitor_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateMatchInput) => ({ ...prev, red_competitor_name: e.target.value }))
                  }
                  placeholder="Enter name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="red_competitor_country">Country Code</Label>
                <Select
                  value={formData.red_competitor_country || ''}
                  onValueChange={(value: string) => setFormData((prev: CreateMatchInput) => ({ ...prev, red_competitor_country: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Blue Corner */}
          <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-700">🔵 Blue Corner</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="blue_competitor_name">Competitor Name</Label>
                <Input
                  id="blue_competitor_name"
                  value={formData.blue_competitor_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateMatchInput) => ({ ...prev, blue_competitor_name: e.target.value }))
                  }
                  placeholder="Enter name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="blue_competitor_country">Country Code</Label>
                <Select
                  value={formData.blue_competitor_country || ''}
                  onValueChange={(value: string) => setFormData((prev: CreateMatchInput) => ({ ...prev, blue_competitor_country: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Match Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="total_rounds">Total Rounds</Label>
              <Select
                value={formData.total_rounds?.toString() || '3'}
                onValueChange={(value: string) => setFormData((prev: CreateMatchInput) => ({ ...prev, total_rounds: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Best of 1</SelectItem>
                  <SelectItem value="3">Best of 3</SelectItem>
                  <SelectItem value="5">Best of 5</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="round_duration_minutes">Round Duration (minutes)</Label>
              <Select
                value={formData.round_duration_minutes?.toString() || '2'}
                onValueChange={(value: string) => setFormData((prev: CreateMatchInput) => ({ ...prev, round_duration_minutes: parseFloat(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 minute</SelectItem>
                  <SelectItem value="1.5">1.5 minutes</SelectItem>
                  <SelectItem value="2">2 minutes</SelectItem>
                  <SelectItem value="3">3 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Creating Match...' : '🚀 Create Match'}
          </Button>
        </form>

        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold mb-2">🥋 Scoring System</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <div>• Punch: 1 point</div>
            <div>• Body Kick: 2 points</div>
            <div>• Head Kick: 3 points</div>
            <div>• Turning Body Kick: 4 points</div>
            <div>• Turning Head Kick: 5 points</div>
            <div className="mt-2 font-medium">Penalties give +1 point to opponent</div>
            <div>5 penalties in a round = opponent wins round</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
