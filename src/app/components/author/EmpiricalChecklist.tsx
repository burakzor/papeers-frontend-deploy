import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Brain, CheckSquare, ChevronDown, ChevronRight, Lock, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '../../lib/api';
import {
  assessByPaperId,
  assessEmpiricalChecklist,
  detectEmpiricalChecklistMethods,
  detectMethodsByPaperId,
  getEmpiricalChecklistMethods,
  type AssessedQuestion,
  type ChecklistMethodResponse,
  type ChecklistMethodSuggestionResponse,
  type ChecklistStandardSection,
  type EmpiricalChecklistAssessResponse,
} from '../../services/checklistService';
import { getPapersOfLabMember, getPapersForGuestMember, type PaperResponseDTO } from '../../services/paperService';
import { useAuth } from '../../context/AuthContext';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';

// ---- types -----------------------------------------------------------------

type Source = 'file' | 'paper';
type MethodSelectionMap = Record<string, boolean>;

interface QuestionState {
  answer: 'YES' | 'NO' | null;
  deviationReasonable: boolean | null;
  errorType: number | null;
  freeTextResponse: string;
}

// ---- constants -------------------------------------------------------------

const CATEGORY_ORDER = ['General', 'Qualitative', 'Quantitative', 'Literature review', 'Other'];
const ATTR_ORDER = ['ESSENTIAL', 'DESIRABLE', 'EXTRAORDINARY'] as const;
const ATTR_LABELS: Record<string, string> = {
  ESSENTIAL: 'Essential',
  DESIRABLE: 'Desirable',
  EXTRAORDINARY: 'Extraordinary',
};
const ATTR_STYLES: Record<string, string> = {
  ESSENTIAL: 'text-blue-800 border-blue-200 bg-blue-50',
  DESIRABLE: 'text-green-800 border-green-200 bg-green-50',
  EXTRAORDINARY: 'text-purple-800 border-purple-200 bg-purple-50',
};

function getConfidenceLabel(c: number) {
  return c >= 0.8 ? 'High' : c >= 0.55 ? 'Medium' : 'Low';
}

// ---- sub-components --------------------------------------------------------

function QuestionRow({
  question,
  state,
  onChange,
  aiPrefilled,
}: {
  question: AssessedQuestion;
  state: QuestionState;
  onChange: (id: string, field: keyof QuestionState, value: unknown) => void;
  aiPrefilled?: boolean;
}) {
  const hasFollowUp =
    question.attributeType === 'ESSENTIAL' &&
    question.allowedErrorTypes != null &&
    question.allowedErrorTypes.length > 0;

  const showDeviationTree = state.answer === 'NO' && hasFollowUp;
  const showErrorType = showDeviationTree && state.deviationReasonable === false;

  return (
    <div className="border-b last:border-b-0 py-2">
      {/* Main yes / no row */}
      <div className="flex items-start gap-2">
        <RadioGroup
          value={state.answer ?? ''}
          onValueChange={(v) => {
            onChange(question.questionId, 'answer', v as 'YES' | 'NO');
            if (v === 'YES') {
              onChange(question.questionId, 'deviationReasonable', null);
              onChange(question.questionId, 'errorType', null);
              onChange(question.questionId, 'freeTextResponse', '');
            }
          }}
          className="flex gap-0"
        >
          <div className="w-10 flex justify-center pt-0.5">
            <RadioGroupItem value="YES" id={`${question.questionId}-yes`} />
          </div>
          <div className="w-10 flex justify-center pt-0.5">
            <RadioGroupItem value="NO" id={`${question.questionId}-no`} />
          </div>
        </RadioGroup>
        <div className="flex-1 flex items-start gap-2 pt-0.5">
          <Label
            htmlFor={`${question.questionId}-yes`}
            className="flex-1 text-sm font-normal cursor-pointer leading-snug"
          >
            {question.questionText}
          </Label>
          {aiPrefilled && (
            <span className="shrink-0 inline-flex items-center rounded px-1 py-0.5 text-[10px] font-medium bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
              AI
            </span>
          )}
        </div>
      </div>

      {/* Deviation sub-tree (ESSENTIAL + NO answer only) */}
      {showDeviationTree && (
        <div className="ml-20 mt-1 pl-3 border-l-2 border-slate-200 space-y-2">
          {/* Is the deviation reasonable? */}
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">↳ is the deviation reasonable?</span>
            <RadioGroup
              value={
                state.deviationReasonable === true
                  ? 'yes'
                  : state.deviationReasonable === false
                    ? 'no'
                    : ''
              }
              onValueChange={(v) => {
                onChange(question.questionId, 'deviationReasonable', v === 'yes');
                if (v === 'yes') {
                  onChange(question.questionId, 'errorType', null);
                  onChange(question.questionId, 'freeTextResponse', '');
                }
              }}
              className="flex gap-4"
            >
              <label className="flex items-center gap-1.5 cursor-pointer">
                <RadioGroupItem value="yes" /> yes
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <RadioGroupItem value="no" /> no
              </label>
            </RadioGroup>
          </div>

          {/* Error type + free text (deviation NOT reasonable) */}
          {showErrorType && (
            <div className="pl-3 border-l-2 border-slate-200 space-y-2">
              <div className="text-sm text-muted-foreground">
                ↳ Please indicate the type of unreasonable deviations. (Pick the largest number that applies.)
              </div>
              <RadioGroup
                value={state.errorType?.toString() ?? ''}
                onValueChange={(v) =>
                  onChange(question.questionId, 'errorType', parseInt(v))
                }
                className="flex flex-wrap gap-4"
              >
                {question.allowedErrorTypes!.map((t) => (
                  <label key={t} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <RadioGroupItem value={t.toString()} /> type {t}
                  </label>
                ))}
              </RadioGroup>

              <div className="pl-3 border-l-2 border-slate-200">
                <p className="text-sm text-muted-foreground mb-1">
                  ↳ {question.freeTextLabel ?? 'How can this problem be addressed?'}
                </p>
                <Textarea
                  value={state.freeTextResponse}
                  onChange={(e) =>
                    onChange(question.questionId, 'freeTextResponse', e.target.value)
                  }
                  rows={3}
                  className="text-sm"
                  placeholder="Describe how this issue can be resolved…"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AttributeGroup({
  attrType,
  questions,
  answers,
  onChange,
}: {
  attrType: string;
  questions: AssessedQuestion[];
  answers: Record<string, QuestionState>;
  onChange: (id: string, field: keyof QuestionState, value: unknown) => void;
}) {
  // ESSENTIAL is always expanded; DESIRABLE and EXTRAORDINARY start collapsed.
  const defaultOpen = attrType === 'ESSENTIAL';
  const [open, setOpen] = useState(defaultOpen);

  if (questions.length === 0) return null;

  const satisfiedCount = questions.filter((q) => answers[q.questionId]?.answer === 'YES').length;

  return (
    <div className="mt-4 first:mt-0">
      {/* Section header — always visible, clickable to toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center gap-3 px-3 py-2 rounded-t border text-left transition-colors hover:brightness-95 ${
          open ? '' : 'rounded-b'
        } ${ATTR_STYLES[attrType] ?? ''}`}
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
        <span className="font-bold text-sm tracking-wide">{ATTR_LABELS[attrType] ?? attrType}</span>
        <Badge variant="secondary" className="text-xs">{questions.length}</Badge>
        {!open && attrType !== 'ESSENTIAL' && (
          <span className="ml-auto text-xs opacity-70">
            {satisfiedCount}/{questions.length} answered — click to expand
          </span>
        )}
        {attrType !== 'ESSENTIAL' && (
          <span className="ml-auto text-xs opacity-60 italic">
            {attrType === 'DESIRABLE' ? 'Optional — expand to review' : 'Expand to review'}
          </span>
        )}
      </button>

      {/* Collapsible body */}
      {open && (
        <>
          {/* Column headers */}
          <div className="flex items-center text-xs font-medium text-muted-foreground border-x border-slate-200 px-2 py-1 bg-muted/30">
            <span className="w-10 text-center">yes</span>
            <span className="w-10 text-center">no</span>
            <span className="flex-1" />
          </div>
          {/* Question rows */}
          <div className="border border-t-0 border-slate-200 rounded-b px-2 divide-y divide-slate-100">
            {questions.map((q) => (
              <QuestionRow
                key={q.questionId}
                question={q}
                state={answers[q.questionId] ?? { answer: null, deviationReasonable: null, errorType: null, freeTextResponse: '' }}
                onChange={onChange}
                aiPrefilled={answers[q.questionId]?.answer != null}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StandardChecklist({
  section,
  answers,
  onChange,
}: {
  section: ChecklistStandardSection;
  answers: Record<string, QuestionState>;
  onChange: (id: string, field: keyof QuestionState, value: unknown) => void;
}) {
  return (
    <div className="space-y-4">
      {ATTR_ORDER.map((attrType) => (
        <AttributeGroup
          key={attrType}
          attrType={attrType}
          questions={section.questions.filter((q) => q.attributeType === attrType)}
          answers={answers}
          onChange={onChange}
        />
      ))}
    </div>
  );
}

// ---- main component --------------------------------------------------------

export default function EmpiricalChecklist() {
  const { user, selectedLab } = useAuth();
  const isGuestInLab = selectedLab?.role === 'GUEST_MEMBER';

  const [catalog, setCatalog] = useState<ChecklistMethodResponse[]>([]);
  const [isLoadingMethods, setIsLoadingMethods] = useState(true);

  // Source
  const [source, setSource] = useState<Source>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [papers, setPapers] = useState<PaperResponseDTO[]>([]);
  const [isLoadingPapers, setIsLoadingPapers] = useState(false);
  const [hasFetchedPapers, setHasFetchedPapers] = useState(false);
  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null);

  // Method detection
  const [suggestions, setSuggestions] = useState<ChecklistMethodSuggestionResponse[]>([]);
  const [selectedMethods, setSelectedMethods] = useState<MethodSelectionMap>({});
  const [isDetecting, setIsDetecting] = useState(false);

  // Assessment
  const [assessment, setAssessment] = useState<EmpiricalChecklistAssessResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, QuestionState>>({});
  const [isAssessing, setIsAssessing] = useState(false);

  // Load method catalog on mount; auto-select the mandatory General Standard
  useEffect(() => {
    getEmpiricalChecklistMethods()
      .then((methods) => {
        setCatalog(methods);
        // Always pre-select the General Standard (it is mandatory)
        const generalEntry = methods.find((m) => m.name === 'General Standard');
        if (generalEntry) {
          setSelectedMethods((cur) => ({ ...cur, [generalEntry.id]: true }));
        }
      })
      .catch(() => toast.error('Could not load empirical checklist methods.'))
      .finally(() => setIsLoadingMethods(false));
  }, []);

  // Load papers when "paper" tab is first activated
  useEffect(() => {
    if (source !== 'paper' || hasFetchedPapers || isLoadingPapers) return;
    if (!user?.id || !selectedLab?.id) return;
    setIsLoadingPapers(true);
    const fetchFn = isGuestInLab
      ? getPapersForGuestMember(selectedLab.id)
      : getPapersOfLabMember(selectedLab.id);
    fetchFn
      .then(all => setPapers(all.filter(p => !!p.contentLink)))
      .catch(() => toast.error('Could not load submitted papers.'))
      .finally(() => { setIsLoadingPapers(false); setHasFetchedPapers(true); });
  }, [source, hasFetchedPapers, isLoadingPapers, user?.id, selectedLab?.id, isGuestInLab]);

  // Populate editable answer state from AI response
  useEffect(() => {
    if (!assessment) return;
    const init: Record<string, QuestionState> = {};
    assessment.standards.forEach((std) =>
      std.questions.forEach((q) => {
        init[q.questionId] = {
          answer: q.answer,
          deviationReasonable: q.deviationReasonable,
          errorType: q.errorType,
          freeTextResponse: q.freeTextResponse ?? '',
        };
      }),
    );
    setAnswers(init);
  }, [assessment]);

  // ---- derived state -------------------------------------------------------

  const groupedMethods = useMemo(() => {
    const grouped = catalog.reduce<Record<string, ChecklistMethodResponse[]>>((acc, m) => {
      acc[m.category] = [...(acc[m.category] ?? []), m];
      return acc;
    }, {});
    return Object.fromEntries(
      Object.entries(grouped).sort(([a], [b]) => {
        const ai = CATEGORY_ORDER.indexOf(a);
        const bi = CATEGORY_ORDER.indexOf(b);
        if (ai === -1 && bi === -1) return a.localeCompare(b);
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      }),
    );
  }, [catalog]);

  const suggestionMap = useMemo(
    () => Object.fromEntries(suggestions.map((s) => [s.id, s])),
    [suggestions],
  );

  const selectedMethodNames = useMemo(
    () => Object.entries(selectedMethods).filter(([, on]) => on).map(([id]) => id),
    [selectedMethods],
  );

  const hasSource = source === 'file' ? selectedFile != null : selectedPaperId != null;

  // ---- handlers ------------------------------------------------------------

  /** Reset method selections but always keep General Standard locked/checked. */
  const resetMethods = () => {
    setSelectedMethods(() => {
      const base: MethodSelectionMap = {};
      const generalEntry = catalog.find((m) => m.name === 'General Standard');
      if (generalEntry) base[generalEntry.id] = true;
      return base;
    });
  };

  const handleSourceChange = (value: string) => {
    setSource(value as Source);
    setSuggestions([]);
    resetMethods();
    setAssessment(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(e.target.files?.[0] ?? null);
    setSuggestions([]);
    resetMethods();
    setAssessment(null);
  };

  const handlePaperSelect = (paperId: string) => {
    setSelectedPaperId(paperId);
    setSuggestions([]);
    resetMethods();
    setAssessment(null);
  };

  const handleDetectMethods = async () => {
    if (!hasSource) {
      toast.error(source === 'file' ? 'Upload a paper ZIP first.' : 'Select a submitted paper first.');
      return;
    }
    setIsDetecting(true);
    setAssessment(null);
    try {
      const response =
        source === 'file'
          ? await detectEmpiricalChecklistMethods(selectedFile!)
          : await detectMethodsByPaperId(selectedPaperId!);

      setSuggestions(response.suggestions);
      setSelectedMethods((cur) => {
        const next = { ...cur };
        response.suggestions.forEach((s) => { next[s.id] = s.selected; });
        return next;
      });
      toast.success('AI method detection completed.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Method detection failed.');
    } finally {
      setIsDetecting(false);
    }
  };

  const handleGenerate = async () => {
    if (!hasSource) {
      toast.error(source === 'file' ? 'Upload a paper ZIP first.' : 'Select a submitted paper first.');
      return;
    }
    if (selectedMethodNames.length === 0) {
      toast.error('Select at least one empirical method.');
      return;
    }
    setIsAssessing(true);
    try {
      const response =
        source === 'file'
          ? await assessEmpiricalChecklist({ file: selectedFile!, standardNames: selectedMethodNames })
          : await assessByPaperId({ paperId: selectedPaperId!, standardNames: selectedMethodNames });

      setAssessment(response);
      toast.success('Checklist generated.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Checklist generation failed.');
    } finally {
      setIsAssessing(false);
    }
  };

  const updateAnswer = (id: string, field: keyof QuestionState, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const toggleMethod = (id: string, checked: boolean) => {
    // General Standard is mandatory — ignore uncheck attempts
    const method = catalog.find((m) => m.id === id);
    if (method?.name === 'General Standard') return;
    setSelectedMethods((cur) => ({ ...cur, [id]: checked }));
  };

  // ---- render --------------------------------------------------------------

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <CheckSquare className="h-7 w-7 text-emerald-600" />
          Empirical Checklist
        </h2>
        <p className="mt-1 text-muted-foreground">
          Select a paper, detect applicable empirical standards, then generate an AI-prefilled checklist that you can review and adjust.
        </p>
      </div>

      {/* ---- Step 1: Paper source ---------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>1. Choose Paper</CardTitle>
          <CardDescription>Upload a ZIP archive or select one of your submitted papers.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={source} onValueChange={handleSourceChange}>
            <TabsList className="mb-4">
              <TabsTrigger value="file">Upload ZIP</TabsTrigger>
              <TabsTrigger value="paper">My Submitted Papers</TabsTrigger>
            </TabsList>

            <TabsContent value="file">
              <Input type="file" accept=".zip" onChange={handleFileChange} />
              {selectedFile && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Selected: <span className="font-medium text-foreground">{selectedFile.name}</span>
                </p>
              )}
            </TabsContent>

            <TabsContent value="paper">
              {isLoadingPapers ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading papers…
                </div>
              ) : papers.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>No submitted papers found for your account.</AlertDescription>
                </Alert>
              ) : (
                <Select onValueChange={handlePaperSelect} value={selectedPaperId ?? ''}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a submitted paper…" />
                  </SelectTrigger>
                  <SelectContent>
                    {papers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* ---- Step 2: Method selection ------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle>2. Select Empirical Methods</CardTitle>
          <CardDescription>
            Use AI detection to pre-select applicable standards, or choose them manually.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            onClick={handleDetectMethods}
            disabled={!hasSource || isDetecting || isLoadingMethods}
          >
            {isDetecting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Detecting…</>
            ) : (
              <><Brain className="mr-2 h-4 w-4" /> Detect Methods (AI)</>
            )}
          </Button>

          {Object.keys(groupedMethods).length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {Object.entries(groupedMethods).map(([category, methods]) => {
                const isGeneralCategory = category === 'General';
                return (
                  <Card
                    key={category}
                    className={isGeneralCategory ? 'border-blue-300 dark:border-blue-700 bg-blue-50/40 dark:bg-blue-950/20' : 'border-dashed'}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        {isGeneralCategory && <Lock className="h-3.5 w-3.5 text-blue-600" />}
                        {category}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {methods.map((method) => {
                        const suggestion = suggestionMap[method.id];
                        const isLocked = method.name === 'General Standard';
                        return (
                          <label
                            key={method.id}
                            className={`flex items-start gap-3 rounded-lg border p-2.5 ${
                              isLocked
                                ? 'cursor-default bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
                                : 'cursor-pointer hover:bg-muted/30'
                            }`}
                          >
                            <Checkbox
                              checked={Boolean(selectedMethods[method.id])}
                              onCheckedChange={(c) => toggleMethod(method.id, Boolean(c))}
                              disabled={isLocked}
                              className="mt-0.5"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-medium">{method.name}</span>
                                {isLocked ? (
                                  <Badge className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                    Always included
                                  </Badge>
                                ) : suggestion ? (
                                  <Badge
                                    className={
                                      suggestion.selected
                                        ? 'bg-emerald-600 text-white text-xs'
                                        : 'bg-slate-400 text-white text-xs'
                                    }
                                  >
                                    {getConfidenceLabel(suggestion.confidence)} · {Math.round(suggestion.confidence * 100)}%
                                  </Badge>
                                ) : null}
                              </div>
                              {!isLocked && suggestion?.reason && (
                                <p className="mt-1 text-xs text-muted-foreground">{suggestion.reason}</p>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---- Step 3: Generate ------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>3. Generate Checklist</CardTitle>
          <CardDescription>
            AI pre-fills the checklist based on the manuscript. You can review and adjust every answer.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Selected standards: {selectedMethodNames.length > 0 ? selectedMethodNames.join(', ') : 'none'}
          </p>
          <Button
            onClick={handleGenerate}
            disabled={!hasSource || selectedMethodNames.length === 0 || isAssessing}
          >
            {isAssessing ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…</>
            ) : (
              <><Sparkles className="mr-2 h-4 w-4" /> Generate Checklist</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* ---- Checklist results ------------------------------------------ */}
      {assessment && (
        <div className="space-y-6">
          {assessment.standards.map((section) => (
            <Card key={section.standardName}>
              <CardHeader>
                <CardTitle className="text-lg">{section.standardName}</CardTitle>
                <CardDescription>
                  {section.questions.length} question{section.questions.length !== 1 ? 's' : ''}
                  {' · '}
                  {section.questions.filter((q) => answers[q.questionId]?.answer === 'YES').length} satisfied
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StandardChecklist section={section} answers={answers} onChange={updateAnswer} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
