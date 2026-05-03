import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import LabMemberNameLink from './LabMemberNameLink';

// Servisler
import { getReviewerAnalytics } from '../../services/labService';
import { getPapersByLab, PaperResponseDTO } from '../../services/paperService';
import { createAssignment } from '../../services/assignmentService';

// UI Bileşenleri
import {
  Loader2,
  Award,
  Clock,
  Calendar,
  AlertCircle,
  ArrowUpDown,
  XCircle,
  TimerReset,
  TriangleAlert,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { SearchableSelect } from '../ui/searchable-select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

import { motion, AnimatePresence } from 'framer-motion';
import FeatherLoader from '../shared/FeatherLoader'; // Yolu projene göre teyit et

// Tip Tanımlamaları
export interface ReviewerAnalyticsResponse {
  id: string;
  name: string;
  email: string;
  avgScore: number;
  timeliness: number;
  reviewsCompleted: number;
  currentLoad: number;
  avgTurnaround: number;
  avgTurnaround: number;
}

type ReviewerStatus = 'active' | 'overloaded' | 'available';
type SortField = 'avgScore' | 'timeliness' | 'reviewsCompleted' | 'currentLoad' | 'avgTurnaround';
type SortDirection = 'asc' | 'desc';

export default function ReviewerAnalytics() {
  const { selectedLab } = useAuth();
  const queryClient = useQueryClient();

  // Lab bilgisini güvenli şekilde al
  const labId = useMemo(() => {
    try {
      const storedLabStr = window.localStorage.getItem('prs.selected.lab');
      return storedLabStr ? JSON.parse(storedLabStr)?.id : null;
    } catch {
      return null;
    }
  }, []);

  // UI Stateleri
  const [selectedReviewer, setSelectedReviewer] = useState<ReviewerAnalyticsResponse | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [deadline, setDeadline] = useState('');
  const [paperQuery, setPaperQuery] = useState('');
  const [selectedPaper, setSelectedPaper] = useState<PaperResponseDTO | null>(null);

  // Filtre/Sıralama Stateleri
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ReviewerStatus>('all');
  const [sortField, setSortField] = useState<SortField>('currentLoad');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // 1. Verileri React Query ile Çek
  const { data: reviewers = [], isLoading: isLoadingAnalytics, isError } = useQuery({
    queryKey: ['reviewer-analytics', labId],
    queryFn: () => getReviewerAnalytics(), // Backend'de coordinator kontrolü yapılıyor
    enabled: !!labId,
    staleTime: 1000 * 60 * 5, // 5 dk cache
  });

  const { data: labPapers = [] } = useQuery({
    queryKey: ['lab-papers', labId],
    queryFn: () => getPapersByLab(labId!),
    enabled: !!labId,
    staleTime: 1000 * 60 * 5,
  });

  // 2. Atama Mutasyonu
  const assignmentMutation = useMutation({
    mutationFn: createAssignment,
    onSuccess: () => {
      // Başarılı atamada hem analitikleri hem de makaleleri yenile
      queryClient.invalidateQueries({ queryKey: ['reviewer-analytics', labId] });
      queryClient.invalidateQueries({ queryKey: ['lab-papers', labId] });

      toast.success(`"${selectedPaper?.title}" assigned successfully to ${selectedReviewer?.name}`);
      setAssignModalOpen(false);
      resetModal();
      setSelectedReviewer(null);
    },
    onError: (error: any) => {
      const errorMessage = error?.message || error?.response?.data || 'Failed to assign paper';
      toast.error(errorMessage);
    }
  });

  // Modal Sıfırlama
  const resetModal = () => {
    setPaperQuery('');
    setSelectedPaper(null);
    setDeadline('');
  };

  // 3. Hesaplamalar ve Filtrelemeler
  const matchingPapers = useMemo(() => {
    return labPapers
        .filter((paper) => paper.title.toLowerCase().includes(paperQuery.toLowerCase()))
        .slice(0, 6);
  }, [labPapers, paperQuery]);

  const getReviewerStatus = (reviewer: ReviewerAnalyticsResponse): ReviewerStatus => {
    if (reviewer.currentLoad === 0) return 'available';
    if (reviewer.currentLoad >= 5) return 'overloaded';
    return 'active';
  };

  const handleAssign = (reviewer: ReviewerAnalyticsResponse) => {
    resetModal();
    setSelectedReviewer(reviewer);
    setAssignModalOpen(true);
  };

  const handleSubmitAssignment = () => {
    if (!selectedReviewer) return;
    if (!selectedPaper) {
      toast.error('Please select a paper from your lab list');
      return;
    }
    if (!deadline) {
      toast.error('Please set a deadline');
      return;
    }

    // Backend'in beklediği format (LocalDateTime için gün sonu)
    const formattedDeadline = `${deadline}T23:59:59`;

    assignmentMutation.mutate({
      paperId: selectedPaper.id,
      reviewerId: selectedReviewer.id,
      assignedDate: new Date().toISOString(),
      deadline: formattedDeadline,
    });
  };

  const getStatusBadge = (status: ReviewerStatus) => {
    switch (status) {
      case 'available':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Available</Badge>;
      case 'active':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Active</Badge>;
      case 'overloaded':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Overloaded</Badge>;
    }
  };

  const getTimelinessColor = (timeliness: number) => {
    if (timeliness >= 90) return 'text-green-600';
    if (timeliness >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const isHighRisk = (reviewer: ReviewerAnalyticsResponse) =>
    reviewer.currentLoad >= 5;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortField(field);
    setSortDirection('desc');
  };

  const filteredReviewers = useMemo(() => {
    return reviewers
        .filter((reviewer) => {
          const matchesSearch =
              reviewer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              reviewer.email.toLowerCase().includes(searchTerm.toLowerCase());

          const reviewerStatus = getReviewerStatus(reviewer);
          const matchesStatus = statusFilter === 'all' || reviewerStatus === statusFilter;

          return matchesSearch && matchesStatus;
        })
        .sort((a, b) => {
          const aValue = a[sortField] ?? 0;
          const bValue = b[sortField] ?? 0;

          if (sortDirection === 'asc') {
            return aValue > bValue ? 1 : -1;
          }
          return bValue > aValue ? 1 : -1;
        });
  }, [reviewers, searchTerm, statusFilter, sortField, sortDirection]);

  // Özet İstatistikler
  const summaryStats = useMemo(() => {
    if (reviewers.length === 0) return { avgScore: '0.0', avgTimeliness: 0, available: 0, overloaded: 0 };

    const n = reviewers.length;
    const totalScore = reviewers.reduce((sum, r) => sum + (r.avgScore ?? 0), 0);
    const totalTimeliness = reviewers.reduce((sum, r) => sum + (r.timeliness ?? 0), 0);
    const available = reviewers.filter(r => getReviewerStatus(r) === 'available').length;
    const overloaded = reviewers.filter(r => getReviewerStatus(r) === 'overloaded').length;

    return {
      avgScore: (totalScore / n).toFixed(1),
      avgTimeliness: Math.round(totalTimeliness / n),
      available,
      overloaded,
    };
  }, [reviewers]);


  if (isError) {
    return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center text-red-800">
          <p className="font-medium">Error loading reviewer analytics</p>
          <Button
              variant="outline"
              className="mt-4"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['reviewer-analytics'] })}
          >
            Try Again
          </Button>
        </div>
    );
  }

  const todayString = new Date().toISOString().split('T')[0];

  return (
      <div className="space-y-6">
        {/* BAŞLIK SABİT KALIR */}
        <div>
          <h2 className="text-2xl font-bold text-foreground">Reviewer Analytics</h2>
          <p className="mt-1 text-muted-foreground">Monitor reviewer performance and assign papers</p>
        </div>

        <AnimatePresence mode="wait">
          {isLoadingAnalytics ? (
            // YÜKLENİYOR EKRANI
            <motion.div
              key="loader"
              className="py-24 flex flex-col items-center justify-center"
            >
              <FeatherLoader size={100} />
              <motion.p
                exit={{ opacity: 0, filter: "blur(5px)" }}
                className="mt-8 text-sm font-medium tracking-wide text-slate-500 dark:text-slate-400 animate-pulse"
              >
                Loading reviewer analytics...
              </motion.p>
            </motion.div>
          ) : (
            // İÇERİK EKRANI (İstatistikler ve Tablo)
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="space-y-6"
            >

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Award className="h-4 w-4" />
                Avg Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{summaryStats.avgScore}</div>
              <p className="mt-1 text-xs text-muted-foreground">Across all reviewers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Clock className="h-4 w-4" />
                Avg Timeliness
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{summaryStats.avgTimeliness}%</div>
              <p className="mt-1 text-xs text-muted-foreground">On-time completion rate</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Available
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{summaryStats.available}</div>
              <p className="mt-1 text-xs text-muted-foreground">Ready for new assignments</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                Overloaded
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${summaryStats.overloaded > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {summaryStats.overloaded}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Needs redistribution</p>
            </CardContent>
          </Card>
        </div>

        {/* Performance Table */}
        <Card>
          <CardHeader>
            <CardTitle>Reviewer Performance Table</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              View average scores and timeliness metrics for all reviewers
            </p>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by reviewer name or email"
                  className="sm:max-w-sm"
              />
              <SearchableSelect
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as 'all' | ReviewerStatus)}
                options={[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'available', label: 'Available' },
                  { value: 'active', label: 'Active' },
                  { value: 'overloaded', label: 'Overloaded' },
                ]}
                placeholder="Filter by status"
                className="w-full sm:w-48"
              />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reviewer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">
                    <Button variant="ghost" size="sm" className="h-auto p-0 font-medium" onClick={() => handleSort('avgScore')}>
                      Average Score <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">
                    <Button variant="ghost" size="sm" className="h-auto p-0 font-medium" onClick={() => handleSort('timeliness')}>
                      Timeliness <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">
                    <Button variant="ghost" size="sm" className="h-auto p-0 font-medium" onClick={() => handleSort('reviewsCompleted')}>
                      Completed <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">
                    <Button variant="ghost" size="sm" className="h-auto p-0 font-medium" onClick={() => handleSort('currentLoad')}>
                      Current Load <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">
                    <Button variant="ghost" size="sm" className="h-auto p-0 font-medium" onClick={() => handleSort('avgTurnaround')}>
                      Avg Turnaround <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReviewers.map((reviewer) => {
                  const reviewerStatus = getReviewerStatus(reviewer);

                  return (
                      <TableRow key={reviewer.id}>
                        <TableCell>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <LabMemberNameLink name={reviewer.name} className="font-medium text-blue-600 hover:text-blue-700 hover:underline" />
                              {isHighRisk(reviewer) && (
                                <TriangleAlert className="h-3.5 w-3.5 text-red-500 shrink-0" title="High rejection and extension rates" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{reviewer.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(reviewerStatus)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className="font-medium text-foreground">{(reviewer.avgScore ?? 0).toFixed(1)}</span>
                            <span className="text-muted-foreground">/10</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                    <span className={`font-medium ${getTimelinessColor(reviewer.timeliness)}`}>
                      {reviewer.timeliness}%
                    </span>
                        </TableCell>
                        <TableCell className="text-center">{reviewer.reviewsCompleted}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{reviewer.currentLoad}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-medium">{(reviewer.avgTurnaround ?? 0).toFixed(1)} days</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                              size="sm"
                              onClick={() => handleAssign(reviewer)}
                              disabled={reviewerStatus === 'overloaded'}
                          >
                            Assign
                          </Button>
                        </TableCell>
                      </TableRow>
                  );})}
                {filteredReviewers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-8">
                        No reviewers found for current filters.
                      </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        </motion.div>
          )}
        </AnimatePresence>

        {/* Assignment Modal */}
        <Dialog open={assignModalOpen} onOpenChange={(open) => {
          setAssignModalOpen(open);
          if (!open) resetModal();
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Paper to Reviewer</DialogTitle>
              <DialogDescription>
                Set a deadline for <LabMemberNameLink name={selectedReviewer?.name ?? ''} className="text-blue-600 hover:text-blue-700 hover:underline" /> to complete the review
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Reviewer</Label>
                <Input value={selectedReviewer?.name || ''} disabled />
              </div>

              <div className="relative space-y-2">
                <Label htmlFor="paper">Paper Title</Label>
                <Input
                    id="paper"
                    placeholder={selectedLab ? `Search papers in ${selectedLab.name}...` : 'Search papers...'}
                    value={paperQuery}
                    onChange={(e) => {
                      setPaperQuery(e.target.value);
                      setSelectedPaper(null);
                    }}
                />
                {/* Paper Search Dropdown */}
                {paperQuery.trim().length > 0 && !selectedPaper && (
                    <div className="absolute z-10 w-full mt-1 max-h-40 overflow-y-auto rounded-md border border-border bg-popover shadow-lg">
                      {matchingPapers.length > 0 ? (
                          matchingPapers.map((paper) => (
                              <button
                                  key={paper.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedPaper(paper);
                                    setPaperQuery(paper.title);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-accent border-b last:border-0 transition-colors"
                              >
                                {paper.title}
                              </button>
                          ))
                      ) : (
                          <p className="px-3 py-2 text-sm text-muted-foreground">No matching papers found in this lab.</p>
                      )}
                    </div>
                )}
                {selectedPaper && (
                    <p className="text-xs text-green-700 font-medium">✓ Selected: {selectedPaper.title}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline">Review Deadline</Label>
                <Input
                    id="deadline"
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    min={todayString}
                />
              </div>

              <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950/20 space-y-1">
                <p className="text-sm text-blue-800 dark:text-blue-100">
                  <strong>Current Load:</strong> {selectedReviewer?.currentLoad ?? 0} active reviews
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-100">
                  <strong>Avg Turnaround:</strong> {(selectedReviewer?.avgTurnaround ?? 0).toFixed(1)} days
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setAssignModalOpen(false);
                resetModal();
              }}>
                Cancel
              </Button>
              <Button
                  onClick={handleSubmitAssignment}
                  disabled={assignmentMutation.isPending}
              >
                {assignmentMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Assign Paper
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
}