import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Inbox, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getMyReceivedComments, CommentResponse } from '../../services/commentService';

function RatingBadge({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}/10</span>
    </span>
  );
}

export default function ReceivedComments() {
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    getMyReceivedComments(page)
      .then((data) => {
        if (cancelled) return;
        setComments(data.content);
        setTotalPages(data.totalPages);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Failed to load comments.';
        toast.error(message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [page]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Received Comments</h1>
        <p className="mt-1 text-muted-foreground">Feedback that authors have written about your reviews</p>
      </div>

      {isLoading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : comments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Inbox className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No feedback received yet.</p>
            <p className="text-sm text-muted-foreground">
              Authors can leave comments on your reviews after you submit them.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {comments.map((c: CommentResponse) => (
            <Card key={c.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {c.sender
                    ? <>From: <span className="text-blue-600 dark:text-blue-400">{c.sender}</span></>
                    : <span className="text-muted-foreground">Anonymous</span>
                  }
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <RatingBadge label="Quality" value={c.qualityRating} />
                  <RatingBadge label="Quantity" value={c.quantityRating} />
                  <RatingBadge label="Timeliness" value={c.timelinessRating} />
                </div>
                {c.comment && (
                  <p className="text-sm text-foreground/90">{c.comment}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p: number) => p - 1)}
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
            onClick={() => setPage((p: number) => p + 1)}
            disabled={page >= totalPages - 1}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
