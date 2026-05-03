import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth, Lab } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Building2, Search, Users, ChevronRight, LogOut, Plus } from 'lucide-react';
import { createLab } from '../../services/labService';

export default function LabSelection() {
  const [searchQuery, setSearchQuery] = useState('');
  const { user, selectLab, logout, labs, isLoadingLabs, refreshLabs } = useAuth();
  const navigate = useNavigate();
  const [isCreatingLab, setIsCreatingLab] = useState(false);
  const [newLabName, setNewLabName] = useState('');
  const [newLabWorkload, setNewLabWorkload] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredLabs = labs.filter(
    (lab) =>
      lab.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLabSelect = (lab: Lab) => {
    selectLab(lab);

    if (lab.role === 'COORDINATOR') {
      navigate('/coordinator');
    } else {
      navigate('/member');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCreateLab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !newLabName.trim()) return;

    setIsSubmitting(true);
    try {
      const createdLab = await createLab({ 
        name: newLabName,
        ...(newLabWorkload && !isNaN(Number(newLabWorkload)) ? { workloadLimit: Number(newLabWorkload) } : {})
      });
      await refreshLabs();
      selectLab(createdLab);
      navigate('/coordinator');
    } catch (error) {
      console.error('Failed to create lab', error);
      // Optional: Add toast notification for error
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-blue-950/10 text-foreground dark:from-slate-950 dark:via-slate-950 dark:to-blue-950/30">
      <div className="container mx-auto max-w-5xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Select Your Lab</h1>
            <p className="mt-1 text-muted-foreground">
              Welcome back, <span className="font-medium">{user?.name}</span>
            </p>
          </div>
          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search labs by name..."
              className="pl-10 h-12"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

          {/* User Role Badge */}
          <div className="mb-6">
            <Badge variant={user?.role === 'coordinator' ? 'default' : 'secondary'} className="text-sm px-4 py-2">
              {user?.role === 'coordinator' ? 'Coordinator Access' : user?.role === 'guest' ? 'Guest Access' : 'Lab Member Access'}
            </Badge>
          </div>

        {/* Labs Grid */}
        {isLoadingLabs ? (
          <Card className="border-border bg-card p-12 text-center">
            <p className="text-muted-foreground">Loading labs...</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredLabs.map((lab) => (
              <Card
                key={lab.id}
                className="group cursor-pointer border-border bg-card transition-shadow hover:shadow-lg dark:hover:shadow-black/20"
                onClick={() => handleLabSelect(lab)}
              >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                      <Building2 className="w-6 h-6 text-blue-600 group-hover:text-white" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{lab.name}</CardTitle>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{lab.memberCount ?? 1} members</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span>Active</span>
                  </div>
                  {lab.role && (
                    <div className="flex items-center gap-1 ml-auto">
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-semibold bg-blue-50/50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                        {lab.role.replace('_', ' ')}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            ))}
          </div>
        )}

        {!isLoadingLabs && labs.length === 0 && user?.role === 'coordinator' && (
          <Dialog open={true} onOpenChange={() => {}}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <div className="mx-auto mb-4 inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600">
                  <Building2 className="w-6 h-6" />
                </div>
                <DialogTitle className="text-center text-xl">Create Your Lab</DialogTitle>
                <DialogDescription className="text-center">
                  As a coordinator, you need to create a lab before you can start managing papers and members.
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleCreateLab} className="space-y-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="labName" className="text-sm font-medium">Lab Name</label>
                  <Input
                    id="labName"
                    placeholder="e.g., Software Engineering Research Lab"
                    value={newLabName}
                    onChange={(e) => setNewLabName(e.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="workloadLimit" className="text-sm font-medium">Workload Limit (Optional)</label>
                  <Input
                    id="workloadLimit"
                    type="number"
                    min="1"
                    placeholder="e.g., 5"
                    value={newLabWorkload}
                    onChange={(e) => setNewLabWorkload(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground">Maximum concurrent paper assignments per member.</p>
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting || !newLabName.trim()}>
                  {isSubmitting ? 'Creating...' : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Lab
                    </>
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {!isLoadingLabs && labs.length > 0 && filteredLabs.length === 0 && (
          <Card className="border-border bg-card p-12 text-center">
            <div className="mb-2 text-muted-foreground">
              <Search className="mx-auto h-12 w-12" />
            </div>
            <p className="text-muted-foreground">No labs found matching your search.</p>
          </Card>
        )}
        {!isLoadingLabs && labs.length === 0 && user?.role !== 'coordinator' && (
          <Card className="border-border bg-card p-12 text-center">
            <div className="mb-2 text-muted-foreground">
              <Search className="mx-auto h-12 w-12" />
            </div>
            <p className="text-muted-foreground">No labs found matching your search.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
