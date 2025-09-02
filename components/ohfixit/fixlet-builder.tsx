'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Plus,
  Save,
  Play,
  Share,
  Trash2,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  Copy,
  Download,
  Upload
} from 'lucide-react';
import { toast } from 'sonner';

export interface FixletStep {
  id: string;
  title: string;
  description: string;
  actions: string[];
  expectedResult: string;
  estimatedTime: string;
  category: string;
  os?: string;
  successCriteria?: string[];
}

export interface Fixlet {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: string;
  tags: string[];
  steps: FixletStep[];
  createdAt: Date;
  updatedAt: Date;
  authorId: string;
  isPublic: boolean;
  usageCount: number;
}

interface FixletBuilderProps {
  initialSteps?: FixletStep[];
  onSave?: (fixlet: Omit<Fixlet, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => Promise<void>;
  onExecute?: (fixlet: Fixlet) => void;
  onShare?: (fixlet: Fixlet) => void;
}

export function FixletBuilder({
  initialSteps = [],
  onSave,
  onExecute,
  onShare
}: FixletBuilderProps) {
  const [fixlet, setFixlet] = useState<Partial<Fixlet>>({
    title: '',
    description: '',
    category: 'General',
    difficulty: 'easy',
    estimatedTime: '10 minutes',
    tags: [],
    steps: initialSteps,
    isPublic: false,
  });

  const [currentStep, setCurrentStep] = useState<Partial<FixletStep>>({
    title: '',
    description: '',
    actions: [''],
    expectedResult: '',
    estimatedTime: '5 minutes',
    category: 'General',
  });

  const [isAddingStep, setIsAddingStep] = useState(false);
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  const addStep = () => {
    if (!currentStep.title?.trim()) {
      toast.error('Step title is required');
      return;
    }

    const newStep: FixletStep = {
      id: `step-${Date.now()}`,
      title: currentStep.title,
      description: currentStep.description || '',
      actions: currentStep.actions?.filter(a => a.trim()) || [],
      expectedResult: currentStep.expectedResult || '',
      estimatedTime: currentStep.estimatedTime || '5 minutes',
      category: currentStep.category || 'General',
      os: currentStep.os,
      successCriteria: [],
    };

    setFixlet(prev => ({
      ...prev,
      steps: [...(prev.steps || []), newStep]
    }));

    setCurrentStep({
      title: '',
      description: '',
      actions: [''],
      expectedResult: '',
      estimatedTime: '5 minutes',
      category: 'General',
    });

    setIsAddingStep(false);
    toast.success('Step added to fixlet');
  };

  const updateStep = (index: number, updatedStep: FixletStep) => {
    setFixlet(prev => ({
      ...prev,
      steps: prev.steps?.map((step, i) => i === index ? updatedStep : step) || []
    }));
  };

  const removeStep = (index: number) => {
    setFixlet(prev => ({
      ...prev,
      steps: prev.steps?.filter((_, i) => i !== index) || []
    }));
    toast.success('Step removed from fixlet');
  };

  const addActionToStep = (stepIndex: number) => {
    setFixlet(prev => ({
      ...prev,
      steps: prev.steps?.map((step, i) =>
        i === stepIndex
          ? { ...step, actions: [...step.actions, ''] }
          : step
      ) || []
    }));
  };

  const updateStepAction = (stepIndex: number, actionIndex: number, value: string) => {
    setFixlet(prev => ({
      ...prev,
      steps: prev.steps?.map((step, i) =>
        i === stepIndex
          ? {
              ...step,
              actions: step.actions.map((action, j) =>
                j === actionIndex ? value : action
              )
            }
          : step
      ) || []
    }));
  };

  const removeStepAction = (stepIndex: number, actionIndex: number) => {
    setFixlet(prev => ({
      ...prev,
      steps: prev.steps?.map((step, i) =>
        i === stepIndex
          ? {
              ...step,
              actions: step.actions.filter((_, j) => j !== actionIndex)
            }
          : step
      ) || []
    }));
  };

  const saveFixlet = async () => {
    if (!fixlet.title?.trim()) {
      toast.error('Fixlet title is required');
      return;
    }

    if (!fixlet.steps?.length) {
      toast.error('Fixlet must have at least one step');
      return;
    }

    setIsSaving(true);
    try {
      await onSave?.({
        title: fixlet.title,
        description: fixlet.description || '',
        category: fixlet.category || 'General',
        difficulty: fixlet.difficulty || 'easy',
        estimatedTime: fixlet.estimatedTime || '10 minutes',
        tags: fixlet.tags || [],
        steps: fixlet.steps,
        authorId: 'current-user', // This would come from auth
        isPublic: fixlet.isPublic || false,
      });

      toast.success('Fixlet saved successfully!');
    } catch (error) {
      toast.error('Failed to save fixlet');
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const exportFixlet = () => {
    const exportData = {
      ...fixlet,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fixlet.title?.toLowerCase().replace(/\s+/g, '-') || 'fixlet'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Fixlet exported successfully!');
  };

  const importFixlet = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (imported.steps && Array.isArray(imported.steps)) {
          setFixlet({
            title: imported.title || '',
            description: imported.description || '',
            category: imported.category || 'General',
            difficulty: imported.difficulty || 'easy',
            estimatedTime: imported.estimatedTime || '10 minutes',
            tags: imported.tags || [],
            steps: imported.steps,
            isPublic: imported.isPublic || false,
          });
          toast.success('Fixlet imported successfully!');
        } else {
          toast.error('Invalid fixlet file format');
        }
      } catch (error) {
        toast.error('Failed to import fixlet');
        console.error('Import error:', error);
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset file input
  };

  return (
    <div className="space-y-6">
      {/* Fixlet Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Fixlet Builder
          </CardTitle>
          <CardDescription>
            Create reusable fixlets by recording troubleshooting steps
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={fixlet.title || ''}
                onChange={(e) => setFixlet(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Fix Slow Wi-Fi Connection"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Category</label>
              <Input
                value={fixlet.category || ''}
                onChange={(e) => setFixlet(prev => ({ ...prev, category: e.target.value }))}
                placeholder="e.g., Network, Hardware, System"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={fixlet.description || ''}
              onChange={(e) => setFixlet(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what this fixlet solves and when to use it"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Difficulty</label>
              <select
                className="w-full p-2 border rounded-md"
                value={fixlet.difficulty || 'easy'}
                onChange={(e) => setFixlet(prev => ({ ...prev, difficulty: e.target.value as any }))}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Estimated Time</label>
              <Input
                value={fixlet.estimatedTime || ''}
                onChange={(e) => setFixlet(prev => ({ ...prev, estimatedTime: e.target.value }))}
                placeholder="e.g., 10-15 minutes"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={fixlet.isPublic || false}
                  onChange={(e) => setFixlet(prev => ({ ...prev, isPublic: e.target.checked }))}
                />
                <span>Make Public</span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={saveFixlet} disabled={isSaving} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Fixlet'}
            </Button>

            <Button variant="outline" onClick={exportFixlet} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>

            <label className="cursor-pointer">
              <Button variant="outline" className="flex items-center gap-2" asChild>
                <span>
                  <Upload className="h-4 w-4" />
                  Import
                </span>
              </Button>
              <input
                type="file"
                accept=".json"
                onChange={importFixlet}
                className="hidden"
              />
            </label>

            {onExecute && (
              <Button
                variant="outline"
                onClick={() => onExecute(fixlet as Fixlet)}
                disabled={!fixlet.steps?.length}
                className="flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                Execute
              </Button>
            )}

            {onShare && (
              <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Share className="h-4 w-4" />
                    Share
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Share Fixlet</DialogTitle>
                    <DialogDescription>
                      Share this fixlet with other users or make it publicly available
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Button
                      onClick={() => {
                        onShare?.(fixlet as Fixlet);
                        setShowShareDialog(false);
                      }}
                      className="w-full"
                    >
                      Share Fixlet
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Steps Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Steps ({fixlet.steps?.length || 0})
            </span>
            <Button
              onClick={() => setIsAddingStep(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Step
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96 w-full">
            <div className="space-y-4">
              {fixlet.steps?.map((step, index) => (
                <Card key={step.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{index + 1}. {step.title}</h4>
                        <p className="text-sm text-gray-600">{step.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{step.estimatedTime}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeStep(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className="text-sm font-medium">Actions:</label>
                        <ol className="list-decimal list-inside text-sm space-y-1 mt-1">
                          {step.actions.map((action, actionIndex) => (
                            <li key={actionIndex} className="text-gray-700">{action}</li>
                          ))}
                        </ol>
                      </div>

                      <div>
                        <label className="text-sm font-medium">Expected Result:</label>
                        <p className="text-sm text-gray-700 mt-1">{step.expectedResult}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {fixlet.steps?.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No steps added yet</p>
                  <p className="text-sm">Click "Add Step" to start building your fixlet</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Add Step Dialog */}
      <Dialog open={isAddingStep} onOpenChange={setIsAddingStep}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Step</DialogTitle>
            <DialogDescription>
              Define a troubleshooting step for your fixlet
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Step Title</label>
              <Input
                value={currentStep.title || ''}
                onChange={(e) => setCurrentStep(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Restart Network Services"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={currentStep.description || ''}
                onChange={(e) => setCurrentStep(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this step does"
                rows={2}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Actions</label>
              <div className="space-y-2">
                {currentStep.actions?.map((action, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={action}
                      onChange={(e) => {
                        const newActions = [...(currentStep.actions || [])];
                        newActions[index] = e.target.value;
                        setCurrentStep(prev => ({ ...prev, actions: newActions }));
                      }}
                      placeholder={`Action ${index + 1}`}
                    />
                    {currentStep.actions && currentStep.actions.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newActions = currentStep.actions?.filter((_, i) => i !== index);
                          setCurrentStep(prev => ({ ...prev, actions: newActions }));
                        }}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCurrentStep(prev => ({
                      ...prev,
                      actions: [...(prev.actions || []), '']
                    }));
                  }}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-3 w-3" />
                  Add Action
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Expected Result</label>
              <Textarea
                value={currentStep.expectedResult || ''}
                onChange={(e) => setCurrentStep(prev => ({ ...prev, expectedResult: e.target.value }))}
                placeholder="What should happen after completing this step"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Estimated Time</label>
                <Input
                  value={currentStep.estimatedTime || ''}
                  onChange={(e) => setCurrentStep(prev => ({ ...prev, estimatedTime: e.target.value }))}
                  placeholder="e.g., 5 minutes"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Category</label>
                <Input
                  value={currentStep.category || ''}
                  onChange={(e) => setCurrentStep(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="e.g., Network"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddingStep(false)}>
                Cancel
              </Button>
              <Button onClick={addStep}>
                Add Step
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
