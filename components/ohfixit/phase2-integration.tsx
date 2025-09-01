'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Mic, 
  BookOpen, 
  Shield, 
  Monitor, 
  Users,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { VoiceMode } from './voice-mode';
import { RedactionAssist } from './redaction-assist';
import { FamilyPortal } from './family-portal';
import { AutomationPanel } from './automation-panel';

interface Phase2IntegrationProps {
  chatId: string;
  onFeatureSelect: (feature: string) => void;
}

export function Phase2Integration({ chatId, onFeatureSelect }: Phase2IntegrationProps) {
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState('');

  const phase2Features = [
    {
      id: 'voice-mode',
      title: 'Voice Mode',
      description: 'Hands-free guidance with speech recognition and text-to-speech',
      icon: Mic,
      status: 'available',
      category: 'interaction'
    },
    {
      id: 'issue-playbooks',
      title: 'Issue Playbooks',
      description: 'Pre-built solutions for common tech problems',
      icon: BookOpen,
      status: 'available',
      category: 'automation'
    },
    {
      id: 'redaction-assist',
      title: 'Redaction Assist',
      description: 'Automatically detect and blur sensitive information',
      icon: Shield,
      status: 'available',
      category: 'privacy'
    },
    {
      id: 'desktop-helper',
      title: 'Desktop Helper',
      description: 'Native OS automation with strict sandboxing',
      icon: Monitor,
      status: 'coming-soon',
      category: 'automation'
    },
    {
      id: 'automation-panel',
      title: 'Automation Panel',
      description: 'Preview → Approve → Execute allowlisted actions',
      icon: Monitor,
      status: 'available',
      category: 'automation'
    },
    {
      id: 'family-portal',
      title: 'Family Portal',
      description: 'Shared minutes and remote assistance',
      icon: Users,
      status: 'available',
      category: 'collaboration'
    }
  ];

  const availablePlaybooks = [
    { id: 'wifi-slow', title: 'Fix Slow Wi-Fi', category: 'Network', difficulty: 'easy' },
    { id: 'printer-offline', title: 'Printer Offline', category: 'Hardware', difficulty: 'medium' },
    { id: 'storage-full', title: 'Free Up Storage', category: 'System', difficulty: 'easy' },
    { id: 'browser-popup-malware', title: 'Remove Browser Malware', category: 'Security', difficulty: 'medium' }
  ];

  const handleVoiceTranscription = (text: string) => {
    setVoiceTranscript(text);
    // Auto-submit voice input to chat
    onFeatureSelect(`voice-input: ${text}`);
  };

  const handleRedactedImage = (imageUrl: string, regions: any[]) => {
    onFeatureSelect(`redacted-screenshot: ${regions.length} regions blurred`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'coming-soon': return 'bg-yellow-500';
      case 'beta': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Phase 2 Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            OhFixIt Phase 2: Advanced "Do It For Me" Features
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Enhanced automation capabilities with voice control, issue playbooks, privacy protection, and family collaboration.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {phase2Features.map(feature => {
              const Icon = feature.icon;
              return (
                <Card 
                  key={feature.id} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    activeFeature === feature.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setActiveFeature(activeFeature === feature.id ? null : feature.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <Icon className="h-5 w-5 text-primary" />
                      <div className={`h-2 w-2 rounded-full ${getStatusColor(feature.status)}`} />
                    </div>
                    <h3 className="font-semibold text-sm mb-1">{feature.title}</h3>
                    <p className="text-xs text-muted-foreground mb-2">{feature.description}</p>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {feature.category}
                      </Badge>
                      <Badge variant={feature.status === 'available' ? 'default' : 'secondary'} className="text-xs">
                        {feature.status === 'available' ? 'Ready' : 'Soon'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Feature Details */}
      {activeFeature && (
        <Tabs value={activeFeature} onValueChange={setActiveFeature}>
          <TabsList className="grid w-full grid-cols-6">
            {phase2Features.map(feature => (
              <TabsTrigger 
                key={feature.id} 
                value={feature.id}
                disabled={feature.status !== 'available'}
                className="text-xs"
              >
                {feature.title}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="voice-mode" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Voice Mode - Hands-Free Guidance</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Use voice commands to interact with OhFixIt and receive spoken responses.
                </p>
              </CardHeader>
              <CardContent>
                <VoiceMode
                  onTranscription={handleVoiceTranscription}
                  onSpeechStart={() => console.log('Voice input started')}
                  onSpeechEnd={() => console.log('Voice input ended')}
                />
                {voiceTranscript && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <p className="text-sm"><strong>Last transcription:</strong> {voiceTranscript}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="issue-playbooks" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Issue Playbooks - Pre-Built Solutions</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Step-by-step guides for common technical problems with reusable solutions.
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availablePlaybooks.map(playbook => (
                    <Card key={playbook.id} className="cursor-pointer hover:shadow-md">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm">{playbook.title}</h4>
                          <Badge variant="outline" className="text-xs">
                            {playbook.difficulty}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">{playbook.category}</p>
                        <Button 
                          size="sm" 
                          className="w-full"
                          onClick={() => onFeatureSelect(`playbook:${playbook.id}`)}
                        >
                          Start Playbook
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="redaction-assist" className="space-y-4">
            <RedactionAssist
              imageUrl="/api/placeholder-screenshot"
              onRedactedImage={handleRedactedImage}
              autoDetect={true}
            />
          </TabsContent>

          <TabsContent value="desktop-helper" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Desktop Helper - Native OS Automation</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Secure desktop application for native OS-level automation tasks.
                </p>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Monitor className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
                  <p className="text-muted-foreground mb-4">
                    Desktop Helper will provide secure, sandboxed automation for:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 mb-6">
                    <li>• Wi-Fi network resets and configuration</li>
                    <li>• Printer installation and management</li>
                    <li>• System cleanup and optimization</li>
                    <li>• Firewall and security settings</li>
                  </ul>
                  <Badge variant="secondary">
                    Available in Q2 2024
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="family-portal" className="space-y-4">
            <FamilyPortal />
          </TabsContent>

          <TabsContent value="automation-panel" className="space-y-4">
            <AutomationPanel chatId={chatId} />
          </TabsContent>
        </Tabs>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onFeatureSelect('enable-voice-mode')}
            >
              <Mic className="h-4 w-4 mr-2" />
              Enable Voice Mode
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onFeatureSelect('browse-playbooks')}
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Browse Playbooks
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onFeatureSelect('capture-and-redact')}
            >
              <Shield className="h-4 w-4 mr-2" />
              Capture & Redact
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onFeatureSelect('family-settings')}
            >
              <Users className="h-4 w-4 mr-2" />
              Family Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
