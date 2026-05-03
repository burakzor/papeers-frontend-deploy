import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { MessageSquare, Inbox, ChevronLeft, ChevronRight, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { getMyComments, getMyReceivedComments, CommentResponse } from '../../services/commentService';

import { motion, AnimatePresence } from 'framer-motion';
import FeatherLoader from '../shared/FeatherLoader'; // Yolu projene göre teyit et

type TabId = 'sent' | 'received';

function RatingBadge({ label, value }: { label: string; value: number }) {
  const color =
    value >= 8 ? 'border-green-300 text-green-700 dark:text-green-400'
    : value >= 5 ? 'border-amber-300 text-amber-700 dark:text-amber-400'
    : 'border-red-300 text-red-700 dark:text-red-400';
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${color}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}/10</span>
    </span>
  );
}

function CommentCard({ c, variant }: { c: CommentResponse; variant: TabId }) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 mb-1">
          <CardTitle className="text-sm font-medium">
            {variant === 'sent' ? (
              <>
                Reviewer:{' '}
                <span className="text-blue-600 dark:text-blue-400">{c.reviewer}</span>
              </>
            ) : (
              c.sender ? (
                <>
                  From:{' '}
                  <span className="text-blue-600 dark:text-blue-400">{c.sender}</span>
                </>
              ) : (
                <span className="text-muted-foreground italic">Anonymous</span>
              )
            )}
          </CardTitle>
          <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded italic">
            {c.paperTitle || 'Untitled Paper'}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <RatingBadge label="Quality" value={c.qualityRating} />
          <RatingBadge label="Quantity" value={c.quantityRating} />
          <RatingBadge label="Timeliness" value={c.timelinessRating} />
        </div>
        {c.comment && (
          <p className="text-sm text-foreground/80 leading-relaxed border-l-2 border-border pl-3">
            {c.comment}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function CommentList({
  fetchFn,
  queryKey,
  emptyIcon: EmptyIcon,
  emptyTitle,
  emptySubtitle,
  variant,
}: {
  fetchFn: (page: number) => Promise<{ content: CommentResponse[]; totalPages: number }>;
  queryKey: string;
  emptyIcon: React.ElementType;
  emptyTitle: string;
  emptySubtitle: string;
  variant: TabId;
}) {
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: [queryKey, page],
    queryFn: () => fetchFn(page),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  const comments = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;

 // ... (const comments ve totalPages değişkenleri aynı kalacak)

  // ESKİ "if (isLoading)" VE "if (comments.length === 0)" BLOKLARINI BURADAN SİLİYORUZ.

  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        // 1. DURUM: YÜKLENİYOR EKRANI
        <motion.div
          key="loader"
          className="flex min-h-[250px] flex-col items-center justify-center py-12"
        >
          {/* Buradaki alanı çok kaplamaması için boyutu 80'e çektik */}
          <FeatherLoader size={80} />
          <motion.p
            exit={{ opacity: 0, filter: "blur(5px)" }}
            className="mt-6 text-sm font-medium tracking-wide text-slate-500 dark:text-slate-400 animate-pulse"
          >
            Loading comments...
          </motion.p>
        </motion.div>
      ) : comments.length === 0 ? (
        // 2. DURUM: BOŞ LİSTE EKRANI (Empty State)
        <motion.div
          key="empty"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="rounded-full bg-muted p-4">
                <EmptyIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground">{emptyTitle}</p>
              <p className="text-sm text-muted-foreground max-w-xs">{emptySubtitle}</p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        // 3. DURUM: YORUMLAR GELDİĞİNDE GÖSTERİLECEK LİSTE VE SAYFALAMA
        <motion.div
          key="content"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="space-y-4"
        >
          <div className="space-y-3">
            {comments.map((c) => (
              <CommentCard key={c.id} c={c} variant={variant} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages - 1}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'sent', label: 'Sent Comments', icon: Send },
  { id: 'received', label: 'Received Comments', icon: Inbox },
];

export default function MyComments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab: TabId = (searchParams.get('tab') as TabId) ?? 'sent';

  const setTab = (tab: TabId) => {
    setSearchParams({ tab }, { replace: true });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Comments</h1>
        <p className="mt-1 text-muted-foreground">
          View feedback you've given to reviewers and comments you've received on your reviews
        </p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 rounded-xl bg-muted p-1 w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            id={`tab-${id}`}
            onClick={() => setTab(id)}
            className={`
              flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all
              ${activeTab === id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'}
            `}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'sent' ? (
        <CommentList
          key="sent"
          queryKey="my-sent-comments"
          fetchFn={getMyComments}
          emptyIcon={MessageSquare}
          emptyTitle="No comments sent yet"
          emptySubtitle="Open a paper's details and use 'Leave Feedback' on an assigned reviewer to get started."
          variant="sent"
        />
      ) : (
        <CommentList
          key="received"
          queryKey="my-received-comments"
          fetchFn={getMyReceivedComments}
          emptyIcon={Inbox}
          emptyTitle="No feedback received yet"
          emptySubtitle="Authors can leave comments on your reviews after you submit them."
          variant="received"
        />
      )}
    </div>
  );
}
