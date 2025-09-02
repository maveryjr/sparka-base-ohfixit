'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Share,
  Users,
  Globe,
  Lock,
  Copy,
  CheckCircle,
  XCircle,
  UserPlus,
  Mail,
  Link as LinkIcon,
  Star,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

export interface FixletShare {
  id: string;
  fixletId: string;
  fixletTitle: string;
  sharedByUserId: string;
  sharedByName: string;
  sharedWithUserId?: string;
  sharedWithName?: string;
  permissions: 'view' | 'edit' | 'execute';
  createdAt: Date;
  usageCount?: number;
}

export interface FixletSharingProps {
  fixletId: string;
  fixletTitle: string;
  isPublic: boolean;
  onShare?: (sharedWithUserId: string | null, permissions: string) => Promise<void>;
  onMakePublic?: () => Promise<void>;
  onMakePrivate?: () => Promise<void>;
  onUpdatePermissions?: (shareId: string, permissions: string) => Promise<void>;
  onRemoveShare?: (shareId: string) => Promise<void>;
}

export function FixletSharing({
  fixletId,
  fixletTitle,
  isPublic,
  onShare,
  onMakePublic,
  onMakePrivate,
  onUpdatePermissions,
  onRemoveShare,
}: FixletSharingProps) {
  const [shares, setShares] = useState<FixletShare[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [sharePermissions, setSharePermissions] = useState('view');
  const [publicLink, setPublicLink] = useState('');

  useEffect(() => {
    loadShares();
    if (isPublic) {
      generatePublicLink();
    }
  }, [fixletId, isPublic]);

  const loadShares = async () => {
    try {
      const response = await fetch(`/api/ohfixit/fixlet/${fixletId}/share`);
      if (response.ok) {
        const data = await response.json();
        setShares(data.shares || []);
      }
    } catch (error) {
      console.error('Failed to load shares:', error);
    }
  };

  const generatePublicLink = () => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/shared/fixlet/${fixletId}`;
    setPublicLink(link);
  };

  const handleShare = async () => {
    if (!shareEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    setIsLoading(true);
    try {
      // For now, we'll assume the email corresponds to a user ID
      // In a real implementation, you'd look up the user by email
      const mockUserId = `user-${Date.now()}`; // This would be replaced with actual user lookup

      await onShare?.(mockUserId, sharePermissions);

      toast.success('Fixlet shared successfully!');
      setShareEmail('');
      setShowShareDialog(false);
      loadShares();
    } catch (error) {
      toast.error('Failed to share fixlet');
      console.error('Share error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMakePublic = async () => {
    setIsLoading(true);
    try {
      await onMakePublic?.();
      generatePublicLink();
      toast.success('Fixlet is now public!');
      loadShares();
    } catch (error) {
      toast.error('Failed to make fixlet public');
      console.error('Make public error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMakePrivate = async () => {
    setIsLoading(true);
    try {
      await onMakePrivate?.();
      setPublicLink('');
      toast.success('Fixlet is now private!');
      loadShares();
    } catch (error) {
      toast.error('Failed to make fixlet private');
      console.error('Make private error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePermissions = async (shareId: string, permissions: string) => {
    try {
      await onUpdatePermissions?.(shareId, permissions);
      toast.success('Permissions updated!');
      loadShares();
    } catch (error) {
      toast.error('Failed to update permissions');
      console.error('Update permissions error:', error);
    }
  };

  const handleRemoveShare = async (shareId: string) => {
    try {
      await onRemoveShare?.(shareId);
      toast.success('Share removed!');
      loadShares();
    } catch (error) {
      toast.error('Failed to remove share');
      console.error('Remove share error:', error);
    }
  };

  const copyPublicLink = () => {
    navigator.clipboard.writeText(publicLink);
    toast.success('Link copied to clipboard!');
  };

  const getPermissionIcon = (permission: string) => {
    switch (permission) {
      case 'view':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'edit':
        return <UserPlus className="h-4 w-4 text-orange-500" />;
      case 'execute':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPermissionLabel = (permission: string) => {
    switch (permission) {
      case 'view':
        return 'Can View';
      case 'edit':
        return 'Can Edit';
      case 'execute':
        return 'Can Execute';
      default:
        return permission;
    }
  };

  return (
    <div className="space-y-6">
      {/* Public/Private Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isPublic ? (
              <Globe className="h-5 w-5 text-green-500" />
            ) : (
              <Lock className="h-5 w-5 text-gray-500" />
            )}
            {isPublic ? 'Public Fixlet' : 'Private Fixlet'}
          </CardTitle>
          <CardDescription>
            {isPublic
              ? 'This fixlet is publicly accessible via a shareable link'
              : 'This fixlet is private and only accessible to you and explicitly shared users'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {isPublic ? (
              <Button
                variant="outline"
                onClick={handleMakePrivate}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <Lock className="h-4 w-4" />
                Make Private
              </Button>
            ) : (
              <Button
                onClick={handleMakePublic}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <Globe className="h-4 w-4" />
                Make Public
              </Button>
            )}

            {isPublic && (
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Input
                    value={publicLink}
                    readOnly
                    className="flex-1"
                    placeholder="Public link will appear here"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyPublicLink}
                    className="flex items-center gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Share with Specific Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Share className="h-5 w-5" />
              Share with Users
            </span>
            <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Share
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Share Fixlet</DialogTitle>
                  <DialogDescription>
                    Share "{fixletTitle}" with another user
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Email Address</label>
                    <Input
                      type="email"
                      value={shareEmail}
                      onChange={(e) => setShareEmail(e.target.value)}
                      placeholder="Enter user's email address"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Permissions</label>
                    <Select value={sharePermissions} onValueChange={setSharePermissions}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="view">Can View - User can see and execute the fixlet</SelectItem>
                        <SelectItem value="edit">Can Edit - User can modify the fixlet</SelectItem>
                        <SelectItem value="execute">Can Execute - User can only execute the fixlet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowShareDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleShare} disabled={isLoading}>
                      {isLoading ? 'Sharing...' : 'Share Fixlet'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64 w-full">
            <div className="space-y-4">
              {shares.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No users have been granted access yet</p>
                  <p className="text-sm">Click "Share" to grant access to specific users</p>
                </div>
              ) : (
                shares.map((share) => (
                  <Card key={share.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {getPermissionIcon(share.permissions)}
                            <div>
                              <p className="font-medium">
                                {share.sharedWithName || share.sharedWithUserId}
                              </p>
                              <p className="text-sm text-gray-500">
                                {getPermissionLabel(share.permissions)}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Select
                            value={share.permissions}
                            onValueChange={(value) => handleUpdatePermissions(share.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="view">View</SelectItem>
                              <SelectItem value="edit">Edit</SelectItem>
                              <SelectItem value="execute">Execute</SelectItem>
                            </SelectContent>
                          </Select>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveShare(share.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="mt-2 text-xs text-gray-500">
                        Shared by {share.sharedByName} on {new Date(share.createdAt).toLocaleDateString()}
                        {share.usageCount && share.usageCount > 0 && (
                          <span className="ml-2">• Used {share.usageCount} times</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Usage Statistics */}
      {shares.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Sharing Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {shares.length}
                </div>
                <div className="text-sm text-gray-500">Users with Access</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {shares.reduce((sum, share) => sum + (share.usageCount || 0), 0)}
                </div>
                <div className="text-sm text-gray-500">Total Executions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {isPublic ? 'Public' : 'Private'}
                </div>
                <div className="text-sm text-gray-500">Visibility</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
