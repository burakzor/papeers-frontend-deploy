import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog';
import { Building2, Search, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getAllLabs } from '../../services/labService';
import { useQuery } from '@tanstack/react-query';

interface Lab {
  id: string;
  name: string;
  institution: string;
  coordinator: string;
  coordinatorEmail: string;
  memberCount: number;
}

export default function ManageLabs() {
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch labs with React Query
  const { data: labs = [], isLoading } = useQuery({
    queryKey: ['labs'],
    queryFn: () => getAllLabs(),
    staleTime: 1000 * 60 * 5,
    select: (data) => data.map((l: any) => ({
      id: l.id,
      name: l.name,
      institution: 'Bilkent University',
      coordinator: l.coordinatorName || 'No Coordinator',
      coordinatorEmail: l.coordinatorEmail || 'N/A',
      memberCount: l.memberCount || 0,
    })),
  });

  const filteredLabs = labs.filter(lab =>
    lab.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lab.institution.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lab.coordinator.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Manage Labs
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage research labs in the system
          </p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search labs by name, institution, or coordinator..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Labs List */}
      <Card>
        <CardHeader>
          <CardTitle>Labs ({filteredLabs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
              <p>Loading labs...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLabs.map((lab) => (
                <div
                  key={lab.id}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {lab.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {lab.institution}
                      </p>
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">Coordinator:</span>
                          <span>{lab.coordinator}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">Email:</span>
                          <span>{lab.coordinatorEmail}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {lab.memberCount} members
                    </Badge>
                    </div>
                  </div>
                </div>
              ))}
              {filteredLabs.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No labs found matching your search.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}