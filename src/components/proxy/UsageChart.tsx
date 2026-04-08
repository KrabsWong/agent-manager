import { useTranslation } from 'react-i18next';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface UsageChartProps {
  data: Array<{ date: string; requestsCount: number; costUsdTotal: number }>;
  type: 'requests' | 'cost';
}

export function UsageChart({ data, type }: UsageChartProps) {
  const { t } = useTranslation();
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  const formatValue = (value: number) => {
    if (type === 'cost') {
      return `$${value.toFixed(2)}`;
    }
    return value.toLocaleString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          {type === 'requests' ? t('proxy.requests') : t('proxy.cost')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              className="text-xs text-muted-foreground"
            />
            <YAxis tickFormatter={formatValue} className="text-xs text-muted-foreground" />
            <Tooltip
              formatter={(value) => [
                formatValue(Number(value)),
                type === 'requests' ? t('proxy.requests') : t('proxy.cost'),
              ]}
              labelFormatter={(label) => formatDate(label as string)}
            />
            <Line
              type="monotone"
              dataKey={type === 'requests' ? 'requestsCount' : 'costUsdTotal'}
              stroke={type === 'requests' ? '#3b82f6' : '#10b981'}
              strokeWidth={2}
              dot={{ fill: type === 'requests' ? '#3b82f6' : '#10b981' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
