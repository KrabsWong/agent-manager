/**
 * Provider Form Layout
 *
 * Unified tab-based layout for all provider configuration forms
 */

import { Key, Globe, Cpu, SlidersHorizontal, FileText } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';

interface TabConfig {
  id: string;
  label: string;
  icon: React.ElementType;
  content: React.ReactNode;
}

interface ProviderFormLayoutProps {
  tabs: TabConfig[];
  defaultTab?: string;
}

export function ProviderFormLayout({ tabs, defaultTab }: ProviderFormLayoutProps) {
  return (
    <Tabs defaultValue={defaultTab || tabs[0]?.id} className="w-full">
      <TabsList className="grid w-full grid-cols-4 h-11 p-1 bg-muted/50 sticky top-0 z-10">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            className="flex items-center gap-2 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <tab.icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{tab.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      {tabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id} className="mt-4 min-h-[280px]">
          <Card className="border-muted shadow-sm">
            <CardContent className="pt-5 pb-5 px-4">{tab.content}</CardContent>
          </Card>
        </TabsContent>
      ))}
    </Tabs>
  );
}

export { Key, Globe, Cpu, SlidersHorizontal, FileText };
