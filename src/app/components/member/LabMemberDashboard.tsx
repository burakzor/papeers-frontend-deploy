import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  FileText,
  CheckSquare,
  Clock,
  FileCheck,
  Plus,
  Eye,
  Loader2,
  Users,
  CalendarDays
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { getMyPapers } from '../../services/paperService';
import { getMyAssignments } from '../../services/assignmentService';
import { toast } from 'sonner';
import DeadlineCalendar from '../shared/DeadlineCalendar';
import FeatherLoader from '../shared/FeatherLoader';
import { motion, AnimatePresence } from 'framer-motion';

export default function LabMemberDashboard() {
  const { user, selectedLab } = useAuth();
  const isGuest = user?.role === 'guest';
  const currentLabName = selectedLab?.name || 'Not Assigned';

  const { data: myPapers = [], isLoading: isLoadingPapers } = useQuery({
    queryKey: ['my-papers-member', selectedLab?.id],
    queryFn: async () => {
      if (!selectedLab?.id) return [];

      try {
        return await getMyPapers(selectedLab.id);
      } catch (error) {
        console.error('Dashboard paper load error:', error);
        toast.error('Dashboard data could not load.');
        return [];
      }
    },
    enabled: !!user?.id && !!selectedLab?.id,
    staleTime: 1000 * 60 * 5,
  });

  const { data: assignments = [], isLoading: isLoadingAssignments } = useQuery({
    queryKey: ['member-assignments', user?.id],
    queryFn: async () => {
      const storedUserStr = window.localStorage.getItem('prs.auth.user');
      const currentUser = storedUserStr ? JSON.parse(storedUserStr) : null;
      if (!currentUser?.id) return [];

      try {
        return await getMyAssignments(currentUser.id);
      } catch (error) {
        console.error('Dashboard assignment load error:', error);
        toast.error('Dashboard data could not load.');
        return [];
      }
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2,
  });

  const isLoading = isLoadingPapers || isLoadingAssignments;

  const formatDate = (dateString: string) => {
    if (!dateString) return "Unknown Date";
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const totalPapers = myPapers.length;
  const pendingReviews = assignments.filter(a => !['DONE', 'COMPLETED', 'REJECTED'].includes(a.status)).length;
  const completedReviews = assignments.filter(a => ['DONE', 'COMPLETED'].includes(a.status)).length;
  
  const dueSoonCount = assignments.filter(a => {
    if (['DONE', 'COMPLETED', 'REJECTED'].includes(a.status)) return false;
    const daysLeft = (new Date(a.deadline).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
    return daysLeft > 0 && daysLeft <= 3;
  }).length;

  // ... const declarations (totalPapers, pendingReviews vb.)

  // BURADAKİ ESKİ "if (isLoading)" BLOĞUNU SİLİYORUZ.

  return (
    <div className="space-y-6">
      {/* BAŞLIK KISMI SABİT KALIR (Sadece alttaki içerik animasyonlu geçiş yapar) */}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold tracking-tight">
          {isGuest ? 'Guest Dashboard' : 'Lab Member Dashboard'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isGuest
            ? 'Overview of papers you are collaborating on.'
            : `Welcome back, ${user?.name || 'Member'}. Overview of your research and review tasks.`}
        </p>
      </div>

      <AnimatePresence mode="wait">
        {isLoading ? (
          // YÜKLENİYOR EKRANI (FeatherLoader)
          <motion.div
            key="loader"
            className="py-24 flex flex-col items-center justify-center"
          >
            <FeatherLoader size={100} />
            <motion.p
              exit={{ opacity: 0, filter: "blur(5px)" }}
              className="mt-8 text-sm font-medium tracking-wide text-slate-500 dark:text-slate-400 animate-pulse"
            >
              Loading your dashboard...
            </motion.p>
          </motion.div>
        ) : (
          // İÇERİK EKRANI (İstatistikler, Tablar ve Takvim)
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="space-y-6"
          >
            {/* Stats - Matching Coordinator Layout */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="flex items-center gap-4 pt-5 pb-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-500/15">
                    <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </span>
                  <div>
                    <p className="text-2xl font-semibold leading-none">{totalPapers}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Total papers</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex items-center gap-4 pt-5 pb-5">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${dueSoonCount > 0 ? 'bg-red-100 dark:bg-red-500/15' : 'bg-yellow-100 dark:bg-yellow-500/15'}`}>
                    <Clock className={`h-5 w-5 ${dueSoonCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`} />
                  </span>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-semibold leading-none">{pendingReviews}</p>
                      {dueSoonCount > 0 && (
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-500/10 px-1.5 py-0.5 rounded leading-none">
                          {dueSoonCount} due soon
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">Pending reviews</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex items-center gap-4 pt-5 pb-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-500/15">
                    <FileCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </span>
                  <div>
                    <p className="text-2xl font-semibold leading-none">{completedReviews}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Completed reviews</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex items-center gap-4 pt-5 pb-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-500/15">
                    <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </span>
                  <div>
                    <p className="text-2xl font-semibold leading-none truncate max-w-[120px]" title={currentLabName}>
                      {currentLabName.split(' ')[0]}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Current Lab</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* LEFT COLUMN: PAPERS & REVIEWS TABS (lg:col-span-2) */}
              <div className="lg:col-span-2">
                <Tabs defaultValue="papers" className="w-full">
                  <div className="flex items-center justify-between mb-4">
                    <TabsList className="bg-muted/50 p-1">
                      <TabsTrigger value="papers" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        My Papers
                      </TabsTrigger>
                      <TabsTrigger value="reviews" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        My Reviews
                      </TabsTrigger>
                    </TabsList>

                    <Link to="/member/new-submission">
                      <Button size="sm" className="h-8 gap-1.5 bg-blue-600 hover:bg-blue-700">
                        <Plus className="h-3.5 w-3.5" />
                        New Paper
                      </Button>
                    </Link>
                  </div>

                  <TabsContent value="papers" className="mt-0 focus-visible:outline-none">
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base font-semibold">Recent Papers</CardTitle>
                          <Link to="/member/submissions" className="text-xs text-blue-600 hover:underline">
                            View all
                          </Link>
                        </div>
                        <CardDescription className="text-xs">Papers you authored or co-authored</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {myPapers.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-10 border border-dashed rounded-lg">
                            <FileText className="h-8 w-8 text-muted-foreground/30 mb-2" />
                            <p className="text-xs text-muted-foreground">No papers found.</p>
                          </div>
                        ) : (
                          myPapers.slice(0, 5).map((paper) => (
                            <div key={paper.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
                              <div className="min-w-0 flex-1">
                                <h4 className="text-sm font-medium truncate pr-4" title={paper.title || 'Untitled Paper'}>{paper.title || 'Untitled Paper'}</h4>
                                <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatDate(paper.submissionDate)}
                                  </span>
                                  <span>•</span>
                                  <span className="text-blue-600/80 font-medium">{paper.track}</span>
                                </div>
                              </div>
                              <Badge variant={paper.assignedReviewers?.length > 0 ? "default" : "secondary"} className="text-[10px] h-5">
                                {paper.assignedReviewers?.length > 0 ? "Under Review" : "Pending"}
                              </Badge>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="reviews" className="mt-0 focus-visible:outline-none">
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base font-semibold">Active Assignments</CardTitle>
                          <Link to="/member/reviews" className="text-xs text-blue-600 hover:underline">
                            View all
                          </Link>
                        </div>
                        <CardDescription className="text-xs">Papers assigned to you for review</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {assignments.filter(a => !['DONE', 'COMPLETED', 'REJECTED'].includes(a.status)).length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-10 border border-dashed rounded-lg">
                            <CheckSquare className="h-8 w-8 text-muted-foreground/30 mb-2" />
                            <p className="text-xs text-muted-foreground">No pending assignments.</p>
                          </div>
                        ) : (
                          assignments.filter(a => !['DONE', 'COMPLETED', 'REJECTED'].includes(a.status)).slice(0, 5).map((a) => {
                            const daysLeft = Math.ceil((new Date(a.deadline).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                            const isDueSoon = daysLeft >= 0 && daysLeft <= 3;
                            const isOverdue = daysLeft < 0;

                            return (
                              <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
                                <div className="min-w-0 flex-1">
                                  <h4 className="text-sm font-medium truncate pr-4" title={a.paperTitle || 'Untitled Paper'}>{a.paperTitle || 'Untitled Paper'}</h4>
                                  <div className={`flex items-center gap-1.5 mt-1 text-[11px] ${isOverdue || isDueSoon ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                                    <Clock className="h-3 w-3" />
                                    Deadline: {formatDate(a.deadline)} 
                                    {!isOverdue && <span className="opacity-80">({daysLeft}d left)</span>}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                   <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => window.open(a.overleafLink, '_blank')}>
                                     <Eye className="h-4 w-4" />
                                   </Button>
                                   <Badge variant={isOverdue || isDueSoon ? "destructive" : "secondary"} className="text-[10px] h-5">
                                      {isOverdue ? "Overdue" : (isDueSoon ? "Due Soon" : "Active")}
                                   </Badge>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>

              {/* RIGHT COLUMN: CALENDAR (lg:col-span-1) */}
              <Card className="lg:col-span-1">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base font-semibold">Deadline Calendar</CardTitle>
                  </div>
                  <p className="text-xs text-muted-foreground">Personal review deadlines</p>
                </CardHeader>
                <CardContent>
                  <DeadlineCalendar
                    assignments={assignments}
                    mode="member"
                  />
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
