import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Slider } from '../ui/slider';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { addComment } from '../../services/commentService';

interface AddCommentDialogProps {
  reviewerId: string | null;
  reviewerName: string;
  paperId: string | null;
  paperTitle: string;
  onClose: () => void;
}

interface RatingRowProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
}

function RatingRow({ label, value, onChange }: RatingRowProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground font-mono">{value}/10</span>
      </div>
      <Slider
        min={1}
        max={10}
        step={1}
        value={[value]}
        onValueChange={(vals) => onChange(vals[0])}
      />
    </div>
  );
}

export default function AddCommentDialog({
  reviewerId,
  reviewerName,
  paperId,
  paperTitle,
  onClose,
}: AddCommentDialogProps) {
  const [qualityRating, setQualityRating] = useState(5);
  const [quantityRating, setQuantityRating] = useState(5);
  const [timelinessRating, setTimelinessRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleOpenChange(open: boolean) {
    if (!open) onClose();
  }

  async function handleSubmit() {
    if (!reviewerId || !paperId) return;
    setIsSubmitting(true);
    try {
      await addComment({ 
        reviewerId, 
        paperId,
        qualityRating, 
        quantityRating, 
        timelinessRating, 
        comment 
      });
      toast.success(`Comment submitted for ${reviewerName}.`);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit comment.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={reviewerId !== null} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Review Reviewer</DialogTitle>
          <DialogDescription>
            Leave feedback for <span className="font-semibold text-foreground">{reviewerName}</span> 
            {" "}regarding <span className="font-semibold italic text-blue-600 dark:text-blue-400">{paperTitle}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <RatingRow label="Quality" value={qualityRating} onChange={setQualityRating} />
          <RatingRow label="Quantity" value={quantityRating} onChange={setQuantityRating} />
          <RatingRow label="Timeliness" value={timelinessRating} onChange={setTimelinessRating} />

          <div className="space-y-2">
            <span className="text-sm font-medium">Comment (optional)</span>
            <Textarea
              placeholder="Share your thoughts about this reviewer..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={1000}
              className="min-h-24"
            />
            <p className="text-xs text-muted-foreground text-right">{comment.length}/1000</p>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
