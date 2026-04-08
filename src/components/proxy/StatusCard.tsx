import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import React from 'react';

interface ProxyStatusCardProps {
  isRunning: boolean;
  port: number;
  onStart: () => void;
  onStop: () => void;
  isLoading?: boolean;
}

export function ProxyStatusCard({
  isRunning,
  port,
  onStart,
  onStop,
  isLoading,
}: ProxyStatusCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">代理状态</CardTitle>
        {isRunning ? (
          <Badge className="bg-green-500 hover:bg-green-600">
            <CheckCircle className="w-3 h-3 mr-1" />
            运行中
          </Badge>
        ) : (
          <Badge variant="secondary">
            <XCircle className="w-3 h-3 mr-1" />
            已停止
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{isRunning ? `端口 ${port}` : '-'}</div>
        <p className="text-xs text-muted-foreground">
          {isRunning ? '代理服务器正在运行' : '代理服务器已停止'}
        </p>
        <div className="mt-4">
          {isRunning ? (
            <Button variant="destructive" size="sm" onClick={onStop} disabled={isLoading}>
              停止代理
            </Button>
          ) : (
            <Button size="sm" onClick={onStart} disabled={isLoading}>
              启动代理
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface CircuitBreakerCardProps {
  providerId: string;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failures: number;
  successes: number;
  onReset: () => void;
}

export function CircuitBreakerCard({
  providerId,
  state,
  failures,
  successes,
  onReset,
}: CircuitBreakerCardProps) {
  const getStateColor = () => {
    switch (state) {
      case 'CLOSED':
        return 'bg-green-500';
      case 'HALF_OPEN':
        return 'bg-yellow-500';
      case 'OPEN':
        return 'bg-red-500';
    }
  };

  const getStateText = () => {
    switch (state) {
      case 'CLOSED':
        return '正常';
      case 'HALF_OPEN':
        return '半开';
      case 'OPEN':
        return '熔断';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{providerId}</CardTitle>
        <Badge className={getStateColor()}>
          {state === 'OPEN' && <AlertTriangle className="w-3 h-3 mr-1" />}
          {getStateText()}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">失败: {failures}</span>
          <span className="text-muted-foreground">成功: {successes}</span>
        </div>
        {state !== 'CLOSED' && (
          <Button variant="outline" size="sm" className="mt-2 w-full" onClick={onReset}>
            重置熔断器
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
}

export function StatsCard({ title, value, subtitle, icon }: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}
