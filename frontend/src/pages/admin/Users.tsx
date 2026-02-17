import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Loader2, Users as UsersIcon, Shield, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import userService, { User, UserCreate, UserUpdate, UserRole } from '@/services/users';
import stageService, { Stage } from '@/services/stages';

export function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserCreate>({
    email: '',
    username: '',
    full_name: '',
    role: UserRole.STAGE_WORKER,
    password: '',
    is_active: true,
    stage_ids: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, stagesData] = await Promise.all([
        userService.getAll(),
        stageService.getAll(),
      ]);
      setUsers(usersData);
      setStages(stagesData);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        email: user.email,
        username: user.username || '',
        full_name: user.full_name,
        role: user.role,
        password: '',
        is_active: user.is_active,
        stage_ids: user.stage_ids || [],
      });
    } else {
      setEditingUser(null);
      setFormData({
        email: '',
        username: '',
        full_name: '',
        role: UserRole.STAGE_WORKER,
        password: '',
        is_active: true,
        stage_ids: [],
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingUser(null);
    setFormData({
      email: '',
      username: '',
      full_name: '',
      role: UserRole.STAGE_WORKER,
      password: '',
      is_active: true,
      stage_ids: [],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email.trim() || !formData.full_name.trim()) {
      toast({
        title: 'Error',
        description: 'Email and name are required',
        variant: 'destructive',
      });
      return;
    }

    if (formData.role === UserRole.STAGE_WORKER && (!formData.stage_ids || formData.stage_ids.length === 0)) {
      toast({
        title: 'Error',
        description: 'Stage Worker must be assigned to at least one stage',
        variant: 'destructive',
      });
      return;
    }

    if (!editingUser && !formData.password) {
      toast({
        title: 'Error',
        description: 'Password is required for new users',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      const dataToSubmit = {
        ...formData,
        username: formData.username?.trim() || undefined,
      };

      if (editingUser) {
        const updateData: UserUpdate = {};
        if (dataToSubmit.email !== editingUser.email) updateData.email = dataToSubmit.email;
        if (dataToSubmit.username !== editingUser.username) updateData.username = dataToSubmit.username;
        if (dataToSubmit.full_name !== editingUser.full_name) updateData.full_name = dataToSubmit.full_name;
        if (dataToSubmit.role !== editingUser.role) updateData.role = dataToSubmit.role;
        if (dataToSubmit.is_active !== editingUser.is_active) updateData.is_active = dataToSubmit.is_active;
        if (dataToSubmit.password) updateData.password = dataToSubmit.password;
        if (JSON.stringify(dataToSubmit.stage_ids) !== JSON.stringify(editingUser.stage_ids)) {
          updateData.stage_ids = dataToSubmit.stage_ids;
        }
        
        await userService.update(editingUser.id, updateData);
        toast({
          title: 'Success',
          description: 'User updated successfully',
        });
      } else {
        await userService.create(dataToSubmit);
        toast({
          title: 'Success',
          description: 'User created successfully',
        });
      }
      
      handleCloseDialog();
      loadData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to save user',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Are you sure you want to deactivate "${user.full_name}"?`)) {
      return;
    }

    try {
      await userService.delete(user.id);
      toast({
        title: 'Success',
        description: 'User deactivated successfully',
      });
      loadUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to deactivate user',
        variant: 'destructive',
      });
    }
  };

  const getRoleIcon = (role: UserRole) => {
    return role === UserRole.COMPANY_ADMIN ? Shield : UserCheck;
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.COMPANY_ADMIN:
        return 'Company Admin';
      case UserRole.STAGE_WORKER:
        return 'Stage Worker';
      default:
        return role;
    }
  };

  const getStageNames = (stageIds: number[]) => {
    return stageIds
      .map(id => stages.find(s => s.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  const handleStageToggle = (stageId: number) => {
    setFormData(prev => {
      const currentStageIds = prev.stage_ids || [];
      const newStageIds = currentStageIds.includes(stageId)
        ? currentStageIds.filter(id => id !== stageId)
        : [...currentStageIds, stageId];
      return { ...prev, stage_ids: newStageIds };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            Manage team members, roles, and stage access
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          New User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            View and manage user accounts and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-12">
              <UsersIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No users added yet</p>
              <Button onClick={() => handleOpenDialog()} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Add your first user
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => {
                const RoleIcon = getRoleIcon(user.role);
                return (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between p-4 border rounded-lg ${
                      !user.is_active ? 'opacity-50 bg-muted' : 'hover:bg-accent'
                    } transition-colors`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <RoleIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{user.full_name}</h3>
                          {!user.is_active && (
                            <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-800">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        {user.username && (
                          <p className="text-xs text-muted-foreground">@{user.username}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-muted-foreground">
                            {getRoleLabel(user.role)}
                          </p>
                          {user.role === UserRole.STAGE_WORKER && user.stage_ids && user.stage_ids.length > 0 && (
                            <>
                              <span className="text-xs text-muted-foreground">•</span>
                              <p className="text-xs text-muted-foreground">
                                Stages: {getStageNames(user.stage_ids)}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(user)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(user)}
                        disabled={!user.is_active}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingUser ? 'Edit User' : 'Create New User'}
              </DialogTitle>
              <DialogDescription>
                {editingUser
                  ? 'Update user information and permissions'
                  : 'Add a new team member to your company'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="john@company.com"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Can be used to login
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username (optional)</Label>
                <Input
                  id="username"
                  type="text"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  placeholder="johndoe"
                />
                <p className="text-xs text-muted-foreground">
                  Can also be used to login instead of email
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value as UserRole, stage_ids: [] })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                >
                  <option value={UserRole.STAGE_WORKER}>Stage Worker</option>
                  <option value={UserRole.COMPANY_ADMIN}>Company Admin</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Company Admin: Full access. Stage Worker: Access only to assigned stages.
                </p>
              </div>

              {formData.role === UserRole.STAGE_WORKER && (
                <div className="space-y-2">
                  <Label>Stage Access *</Label>
                  <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                    {stages.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No stages available</p>
                    ) : (
                      stages.map((stage) => (
                        <div key={stage.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`stage-${stage.id}`}
                            checked={formData.stage_ids?.includes(stage.id) || false}
                            onChange={() => handleStageToggle(stage.id)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <Label
                            htmlFor={`stage-${stage.id}`}
                            className="text-sm font-normal cursor-pointer flex-1"
                          >
                            {stage.name}
                            {stage.description && (
                              <span className="text-muted-foreground ml-2">
                                - {stage.description}
                              </span>
                            )}
                          </Label>
                        </div>
                      ))
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Select which stages this worker can access
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">
                  Password {editingUser ? '(leave empty to keep current)' : '*'}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="••••••••"
                  required={!editingUser}
                  minLength={6}
                />
                {!editingUser && (
                  <p className="text-xs text-muted-foreground">
                    Minimum 6 characters
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="is_active" className="text-sm font-normal cursor-pointer">
                  Active user
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingUser ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
