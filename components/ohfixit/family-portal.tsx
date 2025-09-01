'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, 
  Clock, 
  Share2, 
  Shield, 
  Settings, 
  Plus,
  Eye,
  UserPlus,
  Timer,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';

interface FamilyMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'member' | 'child';
  minutesUsed: number;
  lastActive: Date;
  isOnline: boolean;
}

interface RemoteSession {
  id: string;
  initiatorId: string;
  targetId: string;
  status: 'pending' | 'active' | 'completed' | 'expired';
  startTime: Date;
  expiresAt: Date;
  sessionUrl: string;
  permissions: string[];
}

interface FamilyPlan {
  id: string;
  name: string;
  totalMinutes: number;
  usedMinutes: number;
  resetDate: Date;
  members: FamilyMember[];
  features: string[];
}

export function FamilyPortal() {
  const [familyPlan, setFamilyPlan] = useState<FamilyPlan | null>(null);
  const [remoteSessions, setRemoteSessions] = useState<RemoteSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading family data
    setTimeout(() => {
      setFamilyPlan({
        id: 'family-1',
        name: 'Johnson Family Plan',
        totalMinutes: 500,
        usedMinutes: 287,
        resetDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
        members: [
          {
            id: 'user-1',
            name: 'John Johnson',
            email: 'john@example.com',
            role: 'admin',
            minutesUsed: 45,
            lastActive: new Date(),
            isOnline: true
          },
          {
            id: 'user-2',
            name: 'Sarah Johnson',
            email: 'sarah@example.com',
            role: 'member',
            minutesUsed: 123,
            lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
            isOnline: false
          },
          {
            id: 'user-3',
            name: 'Emma Johnson',
            email: 'emma@example.com',
            role: 'child',
            minutesUsed: 89,
            lastActive: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
            isOnline: true
          },
          {
            id: 'user-4',
            name: 'Mike Johnson',
            email: 'mike@example.com',
            role: 'child',
            minutesUsed: 30,
            lastActive: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
            isOnline: false
          }
        ],
        features: ['Remote Assist', 'Screen Sharing', 'Priority Support', 'Advanced Diagnostics']
      });
      setIsLoading(false);
    }, 1000);
  }, []);

  const createRemoteSession = async (targetMemberId: string) => {
    const newSession: RemoteSession = {
      id: `session-${Date.now()}`,
      initiatorId: 'current-user',
      targetId: targetMemberId,
      status: 'pending',
      startTime: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      sessionUrl: `https://assist.ohfixit.com/session/${Date.now()}`,
      permissions: ['screen_view', 'remote_control', 'file_access']
    };

    setRemoteSessions(prev => [...prev, newSession]);
    toast.success('Remote assist session created. Link sent to family member.');
  };

  const getRoleColor = (role: FamilyMember['role']) => {
    switch (role) {
      case 'admin': return 'bg-blue-500';
      case 'member': return 'bg-green-500';
      case 'child': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getUsagePercentage = () => {
    if (!familyPlan) return 0;
    return (familyPlan.usedMinutes / familyPlan.totalMinutes) * 100;
  };

  const getDaysUntilReset = () => {
    if (!familyPlan) return 0;
    const now = new Date();
    const diff = familyPlan.resetDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!familyPlan) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Family Plan</h3>
          <p className="text-muted-foreground mb-4">
            Create a family plan to share OhFixIt minutes and enable remote assistance.
          </p>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Family Plan
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Family Plan Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {familyPlan.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {familyPlan.totalMinutes - familyPlan.usedMinutes}
              </div>
              <div className="text-sm text-muted-foreground">Minutes Remaining</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-500">
                {familyPlan.members.length}
              </div>
              <div className="text-sm text-muted-foreground">Family Members</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">
                {getDaysUntilReset()}
              </div>
              <div className="text-sm text-muted-foreground">Days Until Reset</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Usage This Month</span>
              <span>{familyPlan.usedMinutes} / {familyPlan.totalMinutes} minutes</span>
            </div>
            <Progress value={getUsagePercentage()} className="h-2" />
          </div>

          <div className="flex flex-wrap gap-2">
            {familyPlan.features.map(feature => (
              <Badge key={feature} variant="secondary" className="text-xs">
                {feature}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Family Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Family Members
            </span>
            <Button size="sm" variant="outline">
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {familyPlan.members.map(member => (
              <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar>
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback>
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    {member.isOnline && (
                      <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{member.name}</span>
                      <div className={`h-2 w-2 rounded-full ${getRoleColor(member.role)}`}></div>
                      <Badge variant="outline" className="text-xs capitalize">
                        {member.role}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {member.minutesUsed} minutes used • Last active {
                        member.isOnline ? 'now' : 
                        new Date(member.lastActive).toLocaleDateString()
                      }
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => createRemoteSession(member.id)}
                    disabled={!member.isOnline}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Remote Assist
                  </Button>
                  <Button size="sm" variant="ghost">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Remote Sessions */}
      {remoteSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Remote Assist Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {remoteSessions.map(session => {
                const targetMember = familyPlan.members.find(m => m.id === session.targetId);
                return (
                  <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`h-3 w-3 rounded-full ${
                        session.status === 'active' ? 'bg-green-500' :
                        session.status === 'pending' ? 'bg-yellow-500' :
                        'bg-gray-500'
                      }`}></div>
                      
                      <div>
                        <div className="font-medium">
                          Remote session with {targetMember?.name}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Timer className="h-3 w-3" />
                            Started {new Date(session.startTime).toLocaleTimeString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            {session.permissions.length} permissions
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant={
                        session.status === 'active' ? 'default' :
                        session.status === 'pending' ? 'secondary' :
                        'outline'
                      }>
                        {session.status}
                      </Badge>
                      
                      {session.status === 'active' && (
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-2" />
                          View Session
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Usage Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {familyPlan.members.map(member => (
              <div key={member.id} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-xs">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    {member.name}
                  </span>
                  <span>{member.minutesUsed} minutes</span>
                </div>
                <Progress 
                  value={(member.minutesUsed / familyPlan.totalMinutes) * 100} 
                  className="h-1" 
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
