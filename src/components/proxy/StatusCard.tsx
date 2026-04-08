import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{t('proxy.title')}</CardTitle>
        {isRunning ? (
          <Badge className="bg-green-500 hover:bg-green-600">
            <CheckCircle className="w-3 h-3 mr-1" />
            {t('proxy.status.running')}
          </Badge>
        ) : (
          <Badge variant="secondary">
            <XCircle className="w-3 h-3 mr-1" />
            {t('proxy.status.stopped')}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{isRunning ? `Port ${port}` : '-'}</div>
        <p className="text-xs text-muted-foreground">
          {isRunning ? t('proxy.status.running') : t('proxy.status.stopped')}
        </p>
        <div className="mt-4">
          {isRunning ? (
            <Button variant="destructive" size="sm" onClick={onStop} disabled={isLoading}>
              {t('proxy.stop')}
            </Button>
          ) : (
            <Button size="sm" onClick={onStart} disabled={isLoading}>
              {t('proxy.start')}
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
  const { t } = useTranslation();
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
        return t('proxy.status.running');
      case 'HALF_OPEN':
        return t('proxy.status.stopped');
      case 'OPEN':
        return t('proxy.circuitBreaker');
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
          <span className="text-muted-foreground">
            {t('proxy.cost')}: {failures}
          </span>
          <span className="text-muted-foreground">
            {t('proxy.requests')}: {successes}
          </span>
        </div>
        {state !== 'CLOSED' && (
          <Button variant="outline" size="sm" className="mt-2 w-full" onClick={onReset}>
            {t('proxy.circuitBreaker')}
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
