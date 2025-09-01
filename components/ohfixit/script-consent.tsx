'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Shield, 
  Terminal,
  Download,
  Play,
  X
} from 'lucide-react';

interface GeneratedScript {
  id: string;
  templateId: string;
  name: string;
  description: string;
  platform: 'windows' | 'macos' | 'linux';
  shell: 'bash' | 'zsh' | 'powershell' | 'cmd';
  script: string;
  previewOutput: string;
  riskAssessment: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
    mitigations: string[];
  };
  executionTime: string;
  rollbackScript?: string;
  requiresConsent: boolean;
  consentMessage: string;
}

interface ScriptConsentProps {
  script: GeneratedScript;
  onApprove: (scriptId: string) => void;
  onReject: (scriptId: string) => void;
  onDownload: (scriptId: string) => void;
  isExecuting?: boolean;
}

export function ScriptConsent({ 
  script, 
  onApprove, 
  onReject, 
  onDownload,
  isExecuting = false 
}: ScriptConsentProps) {
  const [hasConsented, setHasConsented] = useState(false);
  const [understandsRisks, setUnderstandsRisks] = useState(false);
  const [activeTab, setActiveTab] = useState('preview');

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
      case 'low': return <CheckCircle className="h-4 w-4" />;
      case 'medium': return <AlertTriangle className="h-4 w-4" />;
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  const canExecute = hasConsented && (script.riskAssessment.level === 'low' || understandsRisks);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              {script.name}
            </CardTitle>
            <CardDescription>{script.description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {script.executionTime}
            </Badge>
            <Badge 
              variant="outline" 
              className={`flex items-center gap-1 ${getRiskColor(script.riskAssessment.level)}`}
            >
              {getRiskIcon(script.riskAssessment.level)}
              {script.riskAssessment.level.toUpperCase()} RISK
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Risk Assessment Alert */}
        {script.riskAssessment.level !== 'low' && (
          <Alert className={`border-l-4 ${
            script.riskAssessment.level === 'high' 
              ? 'border-red-500 bg-red-50' 
              : 'border-yellow-500 bg-yellow-50'
          }`}>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Risk Assessment</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-2">
                <div>
                  <strong>Risk Factors:</strong>
                  <ul className="list-disc list-inside ml-2">
                    {script.riskAssessment.factors.map((factor, index) => (
                      <li key={index} className="text-sm">{factor}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <strong>Mitigations:</strong>
                  <ul className="list-disc list-inside ml-2">
                    {script.riskAssessment.mitigations.map((mitigation, index) => (
                      <li key={index} className="text-sm">{mitigation}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Script Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="script">Full Script</TabsTrigger>
            <TabsTrigger value="rollback">Rollback</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">What this script will do:</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-sm bg-gray-50 p-4 rounded-md overflow-x-auto">
                  {script.previewOutput}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="script" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">
                    Script Content ({script.shell} on {script.platform})
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDownload(script.id)}
                    className="flex items-center gap-1"
                  >
                    <Download className="h-3 w-3" />
                    Download
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64 w-full">
                  <pre className="text-xs bg-gray-900 text-green-400 p-4 rounded-md overflow-x-auto font-mono">
                    {script.script}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rollback" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Rollback Script</CardTitle>
                <CardDescription>
                  Use this script to undo changes if needed
                </CardDescription>
              </CardHeader>
              <CardContent>
                {script.rollbackScript ? (
                  <ScrollArea className="h-48 w-full">
                    <pre className="text-xs bg-blue-900 text-blue-100 p-4 rounded-md overflow-x-auto font-mono">
                      {script.rollbackScript}
                    </pre>
                  </ScrollArea>
                ) : (
                  <p className="text-sm text-gray-500 italic">
                    No automatic rollback available for this script
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Script Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Platform:</span>
                    <span>{script.platform}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Shell:</span>
                    <span>{script.shell}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Estimated Time:</span>
                    <span>{script.executionTime}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Template ID:</span>
                    <span className="font-mono text-xs">{script.templateId}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Safety Features</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Preview before execution</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Explicit user consent required</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Risk assessment provided</span>
                  </div>
                  {script.rollbackScript && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Rollback script available</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Consent Section */}
        <div className="space-y-4 border-t pt-4">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertTitle>Consent Required</AlertTitle>
            <AlertDescription>
              {script.consentMessage}
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="consent"
                checked={hasConsented}
                onCheckedChange={(checked) => setHasConsented(checked as boolean)}
              />
              <label
                htmlFor="consent"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I understand what this script will do and consent to its execution
              </label>
            </div>

            {script.riskAssessment.level !== 'low' && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="risks"
                  checked={understandsRisks}
                  onCheckedChange={(checked) => setUnderstandsRisks(checked as boolean)}
                />
                <label
                  htmlFor="risks"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I understand the risks and potential consequences of this {script.riskAssessment.level}-risk operation
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onReject(script.id)}
            disabled={isExecuting}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => onDownload(script.id)}
              disabled={isExecuting}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download Script
            </Button>

            <Button
              onClick={() => onApprove(script.id)}
              disabled={!canExecute || isExecuting}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              {isExecuting ? 'Executing...' : 'Execute Script'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
