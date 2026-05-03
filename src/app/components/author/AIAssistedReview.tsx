import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { SearchableSelect } from '../ui/searchable-select';
import { Brain, Download, ExternalLink, FileText, Loader2, Sparkles, CheckCircle2, ScrollText } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { getPapersOfLabMember, getPapersForGuestMember } from '../../services/paperService';
import { generateInlineReview, getReviewSignedUrl, downloadFormalReviewPdf } from '../../services/aiService';

export default function AIAssistedReview() {
  const { user, selectedLab } = useAuth();
  const isGuestInLab = selectedLab?.role === 'GUEST_MEMBER';
  const [selectedPaperId, setSelectedPaperId] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [reviewZipUrl, setReviewZipUrl] = useState<string | null>(null);
  const [pdfStatus, setPdfStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [pdfError, setPdfError] = useState('');

  const { data: papers = [], isLoading: isLoadingPapers } = useQuery({
    queryKey: ['ai-papers', user?.id, selectedLab?.id, isGuestInLab],
    queryFn: async () => {
      const all = await (isGuestInLab
        ? getPapersForGuestMember(selectedLab!.id)
        : getPapersOfLabMember(selectedLab!.id));
      return all.filter(p =>
        !!p.contentLink
        && !!user?.id
        && (p.mainAuthorId === user.id || p.coAuthorIds?.includes(user.id))
      );
    },
    enabled: !!user?.id && !!selectedLab?.id,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (selectedPaperId && !papers.some((paper) => paper.id === selectedPaperId)) {
      setSelectedPaperId('');
    }
  }, [papers, selectedPaperId]);

  useEffect(() => {
    setReviewZipUrl(null);
    setPdfStatus('idle');
    setPdfError('');
  }, [selectedPaperId]);

  const handleGenerateReview = async () => {
    if (!selectedPaperId) return;

    setIsGenerating(true);
    setReviewZipUrl(null);
    try {
      // 1. Generate the review (updates backend state)
      await generateInlineReview(selectedPaperId);
      toast.success('AI Review generated successfully!');
      
      // 2. Fetch the signed URL for the generated ZIP
      const url = await getReviewSignedUrl(selectedPaperId);
      setReviewZipUrl(url);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to generate AI review';
      console.error('Failed to generate review:', error);
      toast.error(msg);
    } finally {
      setIsGenerating(false);

    }
  };

  const openInOverleaf = () => {
    if (!reviewZipUrl) return;
    const overleafUrl = `https://www.overleaf.com/docs?snip_uri=${encodeURIComponent(reviewZipUrl)}`;
    window.open(overleafUrl, '_blank');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-600/10 rounded-xl">
            <Brain className="w-8 h-8 text-purple-600" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">AI Review Assistant</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Get instant, AI-powered LaTeX feedback on your paper. View suggestions directly in Overleaf.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Paper Selection Card */}
        <Card className="border-2 border-purple-600/5 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              Your Submissions
            </CardTitle>
            <CardDescription>
              Choose one of your papers to run an AI analysis.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Paper</label>
              <SearchableSelect
                value={selectedPaperId}
                onValueChange={setSelectedPaperId}
                options={papers.map((paper) => ({
                  value: paper.id,
                  label: paper.title,
                  description: `Version ${paper.version} • ${paper.track}`,
                }))}
                placeholder={isLoadingPapers ? 'Loading papers...' : 'Choose a paper'}
                disabled={isLoadingPapers}
                className="h-12 border-2"
              />
            </div>

            <Button 
              className="w-full h-12 text-lg font-semibold bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-600/20 transition-all active:scale-[0.98]"
              disabled={!selectedPaperId || isGenerating}
              onClick={handleGenerateReview}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Analyzing Paper...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Run AI Review
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Action Card */}
        <Card className="border-2 border-purple-600/5 shadow-xl transition-all duration-300 bg-gradient-to-br from-background to-purple-600/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Review Result
            </CardTitle>
            <CardDescription>
              Actions for your AI-annotated document.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center min-h-[200px] text-center space-y-6">
            {!selectedPaperId ? (
              <div className="flex flex-col items-center gap-3 text-muted-foreground opacity-40">
                <Brain className="w-16 h-16" />
                <p>Select a paper to start</p>
              </div>
            ) : isGenerating ? (
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <Brain className="w-16 h-16 text-purple-600 animate-pulse" />
                  <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-500 animate-bounce" />
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-lg text-purple-700">AI is reviewing your LaTeX...</p>
                  <p className="text-sm text-muted-foreground">Injecting inline comments and suggestions</p>
                </div>
              </div>
            ) : reviewZipUrl ? (
              <div className="w-full space-y-4 animate-in zoom-in-95 duration-300">
                <div className="bg-green-500/10 border-2 border-green-500/20 rounded-2xl p-6 flex flex-col items-center gap-3">
                  <div className="p-3 bg-green-500 rounded-full">
                    <CheckCircle2 className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-xl text-green-700 dark:text-green-400">Analysis Complete!</p>
                    <p className="text-sm text-green-600/80">Open in Overleaf to see annotations.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 w-full">
                  <Button 
                    className="h-14 text-lg bg-[#24814d] hover:bg-[#1a5e38] text-white flex items-center justify-center gap-2"
                    onClick={openInOverleaf}
                  >
                    <ExternalLink className="w-5 h-5" />
                    Open in Overleaf
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-10 border-2"
                    onClick={() => window.open(reviewZipUrl, '_blank')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Annotated ZIP
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 text-muted-foreground">
                <div className="p-4 bg-muted rounded-full">
                  <Sparkles className="w-12 h-12 opacity-50" />
                </div>
                <div className="space-y-1">
                  <p className="font-medium">Ready for Analysis</p>
                  <p className="text-sm">Click "Run AI Review" to begin.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Formal Review Letter Card */}
      <Card className="border-2 border-amber-500/10 shadow-xl hover:shadow-2xl transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-amber-600" />
            Formal Review Letter
          </CardTitle>
          <CardDescription>
            Generate a structured peer-review report as a PDF — ready to share or archive.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pdfStatus === 'success' && (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              PDF downloaded successfully!
            </div>
          )}
          {pdfStatus === 'error' && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {pdfError || 'Failed to generate PDF. Please try again.'}
            </div>
          )}
          {pdfStatus === 'loading' && (
            <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              AI is writing the formal review and compiling it to PDF — this may take up to a minute.
            </div>
          )}
          <Button
            className="w-full h-12 text-base font-semibold bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-600/20 transition-all active:scale-[0.98]"
            disabled={!selectedPaperId || pdfStatus === 'loading'}
            onClick={async () => {
              if (!selectedPaperId) return;
              const paper = papers.find(p => p.id === selectedPaperId);
              if (!paper) {
                setPdfError('Selected paper is no longer available for this account. Please select it again.');
                setPdfStatus('error');
                setSelectedPaperId('');
                return;
              }
              setPdfStatus('loading');
              setPdfError('');
              try {
                await downloadFormalReviewPdf(selectedPaperId, paper?.title ?? selectedPaperId);
                setPdfStatus('success');
                toast.success('Formal review PDF downloaded!');
                setTimeout(() => setPdfStatus('idle'), 4000);
              } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : 'Unknown error';
                setPdfError(msg);
                setPdfStatus('error');
                toast.error('Failed to generate formal review PDF');
              }
            }}
          >
            {pdfStatus === 'loading' ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Generating PDF...</>
            ) : (
              <><FileText className="mr-2 h-5 w-5" />Generate Formal Review (PDF)</>
            )}
          </Button>
          {!selectedPaperId && (
            <p className="text-xs text-center text-muted-foreground">Select a paper above first.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
