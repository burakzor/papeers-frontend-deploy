import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  ArrowLeft,
  Loader2,
  MessageSquare,
  User,
  UserCheck,
  Star,
  PackageCheck,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { getCommentById, CommentResponse } from '../../services/commentService';

// ─── Rating bar ──────────────────────────────────────────────────────────────

interface RatingBarProps {
  label: string;
  icon: React.ReactNode;
  value: number;
  max?: number;
  colorClass: string;
}

function RatingBar({ label, icon, value, max = 10, colorClass }: RatingBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 font-medium text-foreground">
          {icon}
          {label}
        </span>
        <span className="tabular-nums font-semibold">
          {value.toFixed(1)}
          <span className="ml-0.5 text-muted-foreground font-normal">/ {max}</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-700 ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Score badge ─────────────────────────────────────────────────────────────

function averageScore(c: CommentResponse) {
  return ((c.qualityRating + c.quantityRating + c.timelinessRating) / 3).toFixed(1);
}

function scoreBadgeVariant(avg: number) {
  if (avg >= 8) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
  if (avg >= 5) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
  return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CommentDetail() {
  const { commentId } = useParams<{ commentId: string }>();
  const navigate = useNavigate();

  const [comment, setComment] = useState<CommentResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!commentId) {
      setError('No comment ID provided.');
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    getCommentById(commentId)
      .then((data) => {
        if (cancelled) return;
        setComment(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Failed to load comment.';
        setError(message);
        toast.error(message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [commentId]);

  // ── Loading ──────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-muted-foreground">Loading comment detail…</p>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────

  if (error || !comment) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <p className="font-medium text-destructive">{error ?? 'Comment not found.'}</p>
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
              Go back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Detail ───────────────────────────────────────────────────────────────

  const avg = parseFloat(averageScore(comment));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* ── Page header ── */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          id="comment-detail-back"
          onClick={() => navigate(-1)}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-foreground">Comment Detail</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Full breakdown of the submitted reviewer feedback
        </p>
      </div>

      {/* ── Participants ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <User className="h-4 w-4" />
              Submitted by (Sender)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-foreground">{comment.sender ?? '—'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <UserCheck className="h-4 w-4" />
              Reviewer (Subject)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-foreground">{comment.reviewer}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Ratings ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Performance Ratings</CardTitle>
          <Badge
            className={`px-3 py-1 text-sm font-bold ${scoreBadgeVariant(avg)}`}
          >
            Avg {avg} / 10
          </Badge>
        </CardHeader>
        <CardContent className="space-y-5">
          <RatingBar
            label="Quality"
            icon={<Star className="h-4 w-4 text-yellow-500" />}
            value={comment.qualityRating}
            colorClass="bg-yellow-500"
          />
          <RatingBar
            label="Quantity"
            icon={<PackageCheck className="h-4 w-4 text-blue-500" />}
            value={comment.quantityRating}
            colorClass="bg-blue-500"
          />
          <RatingBar
            label="Timeliness"
            icon={<Clock className="h-4 w-4 text-green-500" />}
            value={comment.timelinessRating}
            colorClass="bg-green-500"
          />
        </CardContent>
      </Card>

      {/* ── Comment text ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            Comment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <blockquote className="border-l-4 border-blue-400 pl-4 text-sm leading-relaxed text-foreground/90 italic">
            {comment.comment}
          </blockquote>
        </CardContent>
      </Card>

      {/* ── ID chip (useful for coordinators tracing comments) ── */}
      <p className="text-center text-xs text-muted-foreground/60">
        Comment ID: <span className="font-mono">{comment.id ?? commentId}</span>
      </p>
    </div>
  );
}
