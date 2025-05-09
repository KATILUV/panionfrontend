import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface MetricItem {
  name: string;
  value: number;
  max: number;
}

interface DataQualityMetricsProps {
  completeness: MetricItem[];
  accuracy: MetricItem[];
  consistency: MetricItem[];
  timeliness: number;
  datasetName: string;
  lastUpdated?: string;
  recordCount?: number;
}

/**
 * A component that visualizes data quality metrics
 */
const DataQualityMetrics: React.FC<DataQualityMetricsProps> = ({
  completeness,
  accuracy,
  consistency,
  timeliness,
  datasetName,
  lastUpdated = 'Unknown',
  recordCount = 0,
}) => {
  // Calculate overall data quality score
  const calculateOverallScore = (): number => {
    const completenessAvg = completeness.reduce((sum, item) => sum + (item.value / item.max) * 100, 0) / completeness.length;
    const accuracyAvg = accuracy.reduce((sum, item) => sum + (item.value / item.max) * 100, 0) / accuracy.length;
    const consistencyAvg = consistency.reduce((sum, item) => sum + (item.value / item.max) * 100, 0) / consistency.length;
    
    // Overall score is the weighted average of all metrics
    return Math.round((completenessAvg * 0.4) + (accuracyAvg * 0.3) + (consistencyAvg * 0.2) + (timeliness * 0.1));
  };

  // Format data for the radar chart
  const radarData = [
    {
      subject: 'Completeness',
      A: completeness.reduce((sum, item) => sum + (item.value / item.max) * 100, 0) / completeness.length,
      fullMark: 100,
    },
    {
      subject: 'Accuracy',
      A: accuracy.reduce((sum, item) => sum + (item.value / item.max) * 100, 0) / accuracy.length,
      fullMark: 100,
    },
    {
      subject: 'Consistency',
      A: consistency.reduce((sum, item) => sum + (item.value / item.max) * 100, 0) / consistency.length,
      fullMark: 100,
    },
    {
      subject: 'Timeliness',
      A: timeliness,
      fullMark: 100,
    },
  ];

  // Get the score color based on overall quality
  const getScoreColor = (score: number): string => {
    if (score >= 85) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const overallScore = calculateOverallScore();
  const scoreColorClass = getScoreColor(overallScore);

  return (
    <div className="flex flex-col gap-6">
      {/* Overview Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{datasetName} Quality Report</CardTitle>
              <CardDescription>Last updated: {lastUpdated} • {recordCount} records</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <Download className="h-4 w-4" /> Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col items-center justify-center p-4 bg-muted/50 rounded-lg">
              <div className={`text-4xl font-bold ${scoreColorClass}`}>{overallScore}%</div>
              <div className="text-sm text-muted-foreground mt-1">Overall Quality Score</div>
            </div>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar name="Quality" dataKey="A" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Completeness Card */}
        <Card>
          <CardHeader>
            <CardTitle>Completeness</CardTitle>
            <CardDescription>Percentage of filled data fields</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={completeness.map(item => ({
                    name: item.name,
                    value: Math.round((item.value / item.max) * 100)
                  }))}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value) => [`${value}%`, 'Completeness']} />
                  <Bar dataKey="value" fill="#4f46e5" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Accuracy Card */}
        <Card>
          <CardHeader>
            <CardTitle>Accuracy</CardTitle>
            <CardDescription>Correctness of the available data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={accuracy.map(item => ({
                    name: item.name,
                    value: Math.round((item.value / item.max) * 100)
                  }))}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value) => [`${value}%`, 'Accuracy']} />
                  <Bar dataKey="value" fill="#06b6d4" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Consistency Card */}
        <Card>
          <CardHeader>
            <CardTitle>Consistency</CardTitle>
            <CardDescription>Uniformity of data across the dataset</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={consistency.map(item => ({
                    name: item.name,
                    value: Math.round((item.value / item.max) * 100)
                  }))}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value) => [`${value}%`, 'Consistency']} />
                  <Bar dataKey="value" fill="#ec4899" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Timeliness Card */}
        <Card>
          <CardHeader>
            <CardTitle>Timeliness</CardTitle>
            <CardDescription>Freshness of the data</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col justify-center h-[300px]">
            <div className="text-center mb-4">
              <span className="text-4xl font-bold">{timeliness}%</span>
            </div>
            <Progress value={timeliness} className="w-full h-4" />
            <p className="text-center text-sm text-muted-foreground mt-4">
              {timeliness >= 90 ? 'Data is very recent and up-to-date' : 
               timeliness >= 70 ? 'Data is reasonably current' : 
               'Data may be outdated and require refresh'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DataQualityMetrics;