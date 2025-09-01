'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  Zap, 
  Clock, 
  Shield, 
  CheckCircle, 
  AlertTriangle,
  Monitor,
  Wifi,
  Settings,
  Gauge,
  ShieldCheck,
  Play
} from 'lucide-react';

interface OneClickFix {
  id: string;
  title: string;
  description: string;
  category: 'browser' | 'network' | 'system' | 'performance' | 'security';
  riskLevel: 'low' | 'medium' | 'high';
  estimatedTime: string;
  platforms: string[];
  requiresRestart: boolean;
  actions: number;
  successCriteria: string;
}

interface OneClickFixesProps {
  onExecuteFix: (fixId: string) => void;
  isExecuting?: boolean;
  executingFixId?: string;
}

// Mock data - in real implementation, this would come from the one-click-fixes.ts
const SAMPLE_FIXES: OneClickFix[] = [
  {
    id: 'clear-browser-cache',
    title: 'Clear Browser Cache & Cookies',
    description: 'Clear browser cache, cookies, and temporary data to resolve loading issues',
    category: 'browser',
    riskLevel: 'low',
    estimatedTime: '1 minute',
    platforms: ['web'],
    requiresRestart: false,
    actions: 6,
    successCriteria: 'Browser data cleared successfully'
  },
  {
    id: 'flush-dns-cache',
    title: 'Flush DNS Cache',
    description: 'Clear DNS cache to resolve website loading issues',
    category: 'network',
    riskLevel: 'low',
    estimatedTime: '1 minute',
    platforms: ['windows', 'macos', 'linux'],
    requiresRestart: false,
    actions: 1,
    successCriteria: 'DNS cache cleared successfully'
  },
  {
    id: 'reset-network-settings',
    title: 'Reset Network Settings',
    description: 'Reset network configuration to resolve connectivity issues',
    category: 'network',
    riskLevel: 'medium',
    estimatedTime: '2 minutes',
    platforms: ['windows', 'macos', 'linux'],
    requiresRestart: true,
    actions: 3,
    successCriteria: 'Network connectivity restored'
  },
  {
    id: 'free-disk-space',
    title: 'Free Up Disk Space',
    description: 'Clean temporary files and free up disk space',
    category: 'performance',
    riskLevel: 'low',
    estimatedTime: '5 minutes',
    platforms: ['windows', 'macos', 'linux'],
    requiresRestart: false,
    actions: 4,
    successCriteria: 'Disk space freed up successfully'
  },
  {
    id: 'check-malware',
    title: 'Quick Malware Scan',
    description: 'Run a quick malware scan to detect security threats',
    category: 'security',
    riskLevel: 'low',
    estimatedTime: '5 minutes',
    platforms: ['windows', 'macos'],
    requiresRestart: false,
    actions: 2,
    successCriteria: 'Malware scan completed'
  }
];

export function OneClickFixes({ onExecuteFix, isExecuting, executingFixId }: OneClickFixesProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'browser': return <Monitor className="h-4 w-4" />;
      case 'network': return <Wifi className="h-4 w-4" />;
      case 'system': return <Settings className="h-4 w-4" />;
      case 'performance': return <Gauge className="h-4 w-4" />;
      case 'security': return <ShieldCheck className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'low': return <CheckCircle className="h-3 w-3" />;
      case 'medium': return <AlertTriangle className="h-3 w-3" />;
      case 'high': return <Shield className="h-3 w-3" />;
      default: return <Shield className="h-3 w-3" />;
    }
  };

  const filteredFixes = SAMPLE_FIXES.filter(fix => {
    const matchesSearch = fix.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         fix.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || fix.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...Array.from(new Set(SAMPLE_FIXES.map(fix => fix.category)))];
  const fixesByCategory = categories.reduce((acc, category) => {
    if (category === 'all') {
      acc[category] = SAMPLE_FIXES;
    } else {
      acc[category] = SAMPLE_FIXES.filter(fix => fix.category === category);
    }
    return acc;
  }, {} as Record<string, OneClickFix[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Zap className="h-6 w-6 text-blue-500" />
          <h2 className="text-2xl font-bold">One-Click Fixes</h2>
        </div>
        <p className="text-gray-600">
          Instantly resolve common technical issues with pre-built automation
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search for fixes by issue or keyword..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all" className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            All
          </TabsTrigger>
          <TabsTrigger value="browser" className="flex items-center gap-1">
            <Monitor className="h-3 w-3" />
            Browser
          </TabsTrigger>
          <TabsTrigger value="network" className="flex items-center gap-1">
            <Wifi className="h-3 w-3" />
            Network
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-1">
            <Settings className="h-3 w-3" />
            System
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-1">
            <Gauge className="h-3 w-3" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" />
            Security
          </TabsTrigger>
        </TabsList>

        {categories.map(category => (
          <TabsContent key={category} value={category} className="space-y-4">
            {filteredFixes.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Search className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No fixes found</h3>
                  <p className="text-gray-500 text-center">
                    Try adjusting your search terms or browse different categories
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredFixes.map((fix) => (
                  <Card key={fix.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(fix.category)}
                          <CardTitle className="text-base">{fix.title}</CardTitle>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getRiskColor(fix.riskLevel)}`}
                        >
                          <div className="flex items-center gap-1">
                            {getRiskIcon(fix.riskLevel)}
                            {fix.riskLevel.toUpperCase()}
                          </div>
                        </Badge>
                      </div>
                      <CardDescription className="text-sm">
                        {fix.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Fix Details */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-gray-400" />
                          <span>{fix.estimatedTime}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Settings className="h-3 w-3 text-gray-400" />
                          <span>{fix.actions} actions</span>
                        </div>
                      </div>

                      {/* Platforms */}
                      <div className="flex flex-wrap gap-1">
                        {fix.platforms.map(platform => (
                          <Badge key={platform} variant="secondary" className="text-xs">
                            {platform}
                          </Badge>
                        ))}
                      </div>

                      {/* Warnings */}
                      {fix.requiresRestart && (
                        <Alert className="py-2">
                          <AlertTriangle className="h-3 w-3" />
                          <AlertDescription className="text-xs">
                            Requires system restart
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Success Criteria */}
                      <div className="text-xs text-gray-600">
                        <strong>Success:</strong> {fix.successCriteria}
                      </div>

                      {/* Execute Button */}
                      <Button
                        onClick={() => onExecuteFix(fix.id)}
                        disabled={isExecuting}
                        className="w-full"
                        size="sm"
                      >
                        {isExecuting && executingFixId === fix.id ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2" />
                            Executing...
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3 mr-2" />
                            Execute Fix
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Available Fixes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            {Object.entries(fixesByCategory).map(([category, fixes]) => (
              <div key={category} className="space-y-1">
                <div className="flex items-center justify-center gap-1">
                  {getCategoryIcon(category)}
                  <span className="text-sm font-medium capitalize">
                    {category === 'all' ? 'Total' : category}
                  </span>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {fixes.length}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
