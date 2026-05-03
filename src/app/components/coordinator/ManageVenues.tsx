import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { SearchableSelect } from '../ui/searchable-select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Loader2,
  Building2,
  BookOpen,
  Globe,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../ui/utils';
import {
  getAllVenues,
  createVenue,
  updateVenue,
  deleteVenue,
  updateVenueRequirements,
  VenueResponse,
  VenueCreateRequest,
  VenueRequirementUpdateRequest,
} from '../../services/venueService';

const EMPTY_FORM: VenueCreateRequest = {
  name: '',
  acronym: '',
  type: '',
  rank: '',
  source: '',
  primaryFor: '',
  commentsCount: 0,
  averageRating: 'N/A',
  officialUrl: '',
  dblpUrl: '',
};

const EMPTY_REQ: VenueRequirementUpdateRequest = {
  pageLimit: null,
  abstractWordLimit: null,
  referenceFormat: '',
  anonymityRequired: null,
  requiredSections: '',
  verificationNotes: '',
  manuallyVerified: false,
};

function typeBadge(type: string | null) {
  if (!type) return null;
  const lower = type.toLowerCase();
  if (lower.includes('conference'))
    return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-0 text-[10px]">Conference</Badge>;
  if (lower.includes('journal'))
    return <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-0 text-[10px]">Journal</Badge>;
  return <Badge variant="outline" className="text-[10px]">{type}</Badge>;
}

function rankBadge(rank: string | null) {
  if (!rank) return null;
  const colors: Record<string, string> = {
    'A*': 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
    'A':  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    'B':  'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    'C':  'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  };
  const cls = colors[rank] ?? 'bg-muted text-muted-foreground';
  return <Badge className={cn('border-0 text-[10px] font-semibold', cls)}>{rank}</Badge>;
}

export default function ManageVenues() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'conference' | 'journal'>('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<VenueResponse | null>(null);
  const [form, setForm] = useState<VenueCreateRequest>(EMPTY_FORM);
  const [req, setReq] = useState<VenueRequirementUpdateRequest>(EMPTY_REQ);
  const [showReq, setShowReq] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<VenueResponse | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [nameError, setNameError] = useState('');

  const { data: venues = [], isLoading } = useQuery({
    queryKey: ['venues'],
    queryFn: getAllVenues,
    staleTime: 0,
  });

  const createMutation = useMutation({
    mutationFn: createVenue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venues'] });
      queryClient.invalidateQueries({ queryKey: ['all-venues'] });
      toast.success('Venue created.');
      closeDialog();
    },
    onError: (e: any) => {
      const msg: string = e?.message ?? '';
      if (msg.toLowerCase().includes('already exists')) {
        setNameError('A venue with this name already exists.');
      } else {
        toast.error(msg || 'Failed to create venue.');
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: VenueCreateRequest }) => updateVenue(id, data),
    onSuccess: async (_, { id }) => {
      if (showReq) {
        await updateVenueRequirements(id, req).catch(() => {});
      }
      queryClient.invalidateQueries({ queryKey: ['venues'] });
      queryClient.invalidateQueries({ queryKey: ['all-venues'] });
      toast.success('Venue saved.');
      closeDialog();
    },
    onError: (e: any) => {
      const msg: string = e?.message ?? '';
      if (msg.toLowerCase().includes('already exists')) {
        setNameError('A venue with this name already exists.');
      } else {
        toast.error(msg || 'Failed to save venue.');
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteVenue(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venues'] });
      queryClient.invalidateQueries({ queryKey: ['all-venues'] });
      toast.success('Venue deleted.');
      setDeleteTarget(null);
    },
    onError: (e: any) => toast.error(e?.response?.data || 'Failed to delete venue.'),
  });

  const filtered = useMemo(() => {
    return venues.filter((v) => {
      const matchSearch =
        v.name.toLowerCase().includes(search.toLowerCase()) ||
        (v.acronym ?? '').toLowerCase().includes(search.toLowerCase());
      const matchType =
        typeFilter === 'all' ||
        (typeFilter === 'conference' && (v.type ?? '').toLowerCase().includes('conference')) ||
        (typeFilter === 'journal' && (v.type ?? '').toLowerCase().includes('journal'));
      return matchSearch && matchType;
    });
  }, [venues, search, typeFilter]);

  const conferenceCount = venues.filter(v => (v.type ?? '').toLowerCase().includes('conference')).length;
  const journalCount = venues.filter(v => (v.type ?? '').toLowerCase().includes('journal')).length;

  function openAdd() {
    setEditingVenue(null);
    setForm(EMPTY_FORM);
    setReq(EMPTY_REQ);
    setShowReq(false);
    setDialogOpen(true);
  }

  function openEdit(venue: VenueResponse) {
    setEditingVenue(venue);
    setForm({
      name: venue.name ?? '',
      acronym: venue.acronym ?? '',
      type: venue.type ?? '',
      rank: venue.rank ?? '',
      source: venue.source ?? '',
      primaryFor: venue.primaryFor ?? '',
      commentsCount: venue.commentsCount ?? 0,
      averageRating: venue.averageRating ?? 'N/A',
      officialUrl: venue.officialUrl ?? '',
      dblpUrl: venue.dblpUrl ?? '',
    });
    const r = venue.requirement;
    setReq({
      pageLimit: r?.pageLimit ?? null,
      abstractWordLimit: r?.abstractWordLimit ?? null,
      referenceFormat: r?.referenceFormat ?? '',
      anonymityRequired: r?.anonymityRequired ?? null,
      requiredSections: r?.requiredSections ?? '',
      verificationNotes: r?.verificationNotes ?? '',
      manuallyVerified: r?.manuallyVerified ?? false,
    });
    setShowReq(false);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingVenue(null);
    setNameError('');
  }

  function handleSave() {
    if (!form.name.trim() || !form.acronym.trim() || !form.type || !form.rank.trim()) {
      toast.error('Name, acronym, type and rank are required.');
      return;
    }
    const payload: VenueCreateRequest = {
      ...form,
      source: form.source || 'Manual',
      primaryFor: form.primaryFor || 'General',
      commentsCount: form.commentsCount ?? 0,
      averageRating: form.averageRating || 'N/A',
    };
    if (editingVenue) {
      updateMutation.mutate({ id: editingVenue.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
        <p className="text-sm text-muted-foreground">Loading venues...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Manage Venues</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            View, edit, and add publication venues used across the lab.
          </p>
        </div>
        <Button className="gap-2 shrink-0" onClick={openAdd}>
          <Plus className="h-4 w-4" /> Add Venue
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total venues', value: venues.length, icon: Globe, color: 'blue' },
          { label: 'Conferences', value: conferenceCount, icon: Building2, color: 'indigo' },
          { label: 'Journals', value: journalCount, icon: BookOpen, color: 'purple' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-3 pt-4 pb-4">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-${color}-100 dark:bg-${color}-500/15`}>
                <Icon className={`h-4 w-4 text-${color}-600 dark:text-${color}-400`} />
              </span>
              <div>
                <p className="text-xl font-semibold leading-none">{value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            placeholder="Search by name or acronym..."
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'conference', 'journal'] as const).map((t) => (
            <Button
              key={t}
              size="sm"
              variant={typeFilter === t ? 'default' : 'outline'}
              className="capitalize"
              onClick={() => setTypeFilter(t)}
            >
              {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1) + 's'}
            </Button>
          ))}
        </div>
      </div>

      {/* Venue list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
            <Search className="mb-3 h-8 w-8 text-muted-foreground/40" />
            <p className="font-medium">No venues found</p>
            <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search or filter.</p>
          </div>
        ) : (
          filtered.map((venue) => {
            const isExpanded = expandedId === venue.id;
            const r = venue.requirement;
            return (
              <Card key={venue.id} className="overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3">
                  {/* Left: identity */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm truncate">{venue.name}</span>
                        {venue.acronym && (
                          <span className="text-xs text-muted-foreground font-mono shrink-0">({venue.acronym})</span>
                        )}
                        {typeBadge(venue.type)}
                        {rankBadge(venue.rank)}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground">
                        {venue.source && <span>Source: {venue.source}</span>}
                        {venue.primaryFor && <span>Field: {venue.primaryFor}</span>}
                        {venue.officialUrl && (
                          <a
                            href={venue.officialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-0.5 text-blue-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-3 w-3" /> Website
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs gap-1 text-muted-foreground"
                      onClick={() => setExpandedId(isExpanded ? null : venue.id)}
                    >
                      Requirements
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => openEdit(venue)}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                      onClick={() => setDeleteTarget(venue)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Expandable requirements */}
                {isExpanded && (
                  <div className="border-t border-border bg-muted/20 px-4 py-3 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-xs">
                    <div><span className="text-muted-foreground">Page limit:</span> <span className="font-medium">{r?.pageLimit ?? '—'}</span></div>
                    <div><span className="text-muted-foreground">Abstract words:</span> <span className="font-medium">{r?.abstractWordLimit ?? '—'}</span></div>
                    <div><span className="text-muted-foreground">Ref. format:</span> <span className="font-medium">{r?.referenceFormat || '—'}</span></div>
                    <div><span className="text-muted-foreground">Anonymity:</span> <span className="font-medium">{r?.anonymityRequired == null ? '—' : r.anonymityRequired ? 'Required' : 'Not required'}</span></div>
                    <div className="col-span-2"><span className="text-muted-foreground">Sections:</span> <span className="font-medium">{r?.requiredSections || '—'}</span></div>
                    {!r && <div className="col-span-3 text-muted-foreground italic">No requirements set — click Edit to add them.</div>}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingVenue ? 'Edit Venue' : 'Add New Venue'}</DialogTitle>
            <DialogDescription>
              {editingVenue ? 'Update the venue details below.' : 'Fill in the details for the new venue.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => { setForm(f => ({ ...f, name: e.target.value })); setNameError(''); }}
                  placeholder="e.g. International Conference on Machine Learning"
                  className={nameError ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {nameError && <p className="text-sm text-red-600 dark:text-red-400">{nameError}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Acronym *</Label>
                <Input value={form.acronym} onChange={(e) => setForm(f => ({ ...f, acronym: e.target.value }))} placeholder="e.g. ICML" />
              </div>
              <div className="space-y-1.5">
                <Label>Rank *</Label>
                <Input value={form.rank} onChange={(e) => setForm(f => ({ ...f, rank: e.target.value }))} placeholder="e.g. A*" />
              </div>
              <div className="space-y-1.5">
                <Label>Type *</Label>
                <SearchableSelect
                  value={form.type}
                  onValueChange={(v) => setForm(f => ({ ...f, type: v }))}
                  options={[
                    { value: 'Conference', label: 'Conference' },
                    { value: 'Journal', label: 'Journal' },
                  ]}
                  placeholder="Select type"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Source</Label>
                <Input value={form.source} onChange={(e) => setForm(f => ({ ...f, source: e.target.value }))} placeholder="e.g. CORE, Scimago" />
              </div>
              <div className="space-y-1.5">
                <Label>Primary Field</Label>
                <Input value={form.primaryFor} onChange={(e) => setForm(f => ({ ...f, primaryFor: e.target.value }))} placeholder="e.g. Computer Science" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Official URL</Label>
                <Input value={form.officialUrl} onChange={(e) => setForm(f => ({ ...f, officialUrl: e.target.value }))} placeholder="https://..." />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>DBLP URL</Label>
                <Input value={form.dblpUrl} onChange={(e) => setForm(f => ({ ...f, dblpUrl: e.target.value }))} placeholder="https://dblp.org/..." />
              </div>
            </div>

            {/* Requirements section (edit only) */}
            {editingVenue && (
              <div className="border-t border-border pt-4">
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-sm font-medium"
                  onClick={() => setShowReq(v => !v)}
                >
                  <span>Submission Requirements</span>
                  {showReq ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {showReq && (
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Page Limit</Label>
                      <Input type="number" min={0} value={req.pageLimit ?? ''} onChange={(e) => setReq(r => ({ ...r, pageLimit: e.target.value ? Number(e.target.value) : null }))} placeholder="e.g. 8" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Abstract Word Limit</Label>
                      <Input type="number" min={0} value={req.abstractWordLimit ?? ''} onChange={(e) => setReq(r => ({ ...r, abstractWordLimit: e.target.value ? Number(e.target.value) : null }))} placeholder="e.g. 250" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Reference Format</Label>
                      <Input value={req.referenceFormat ?? ''} onChange={(e) => setReq(r => ({ ...r, referenceFormat: e.target.value }))} placeholder="e.g. IEEE, APA" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Anonymity</Label>
                      <SearchableSelect
                        value={req.anonymityRequired == null ? 'null' : String(req.anonymityRequired)}
                        onValueChange={(v) => setReq(r => ({ ...r, anonymityRequired: v === 'null' ? null : v === 'true' }))}
                        options={[
                          { value: 'null', label: 'Not specified' },
                          { value: 'true', label: 'Required' },
                          { value: 'false', label: 'Not required' },
                        ]}
                      />
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <Label>Required Sections</Label>
                      <Textarea value={req.requiredSections ?? ''} onChange={(e) => setReq(r => ({ ...r, requiredSections: e.target.value }))} placeholder="e.g. Abstract, Introduction, Related Work, Conclusion" className="min-h-[80px]" />
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <Label>Verification Notes</Label>
                      <Textarea value={req.verificationNotes ?? ''} onChange={(e) => setReq(r => ({ ...r, verificationNotes: e.target.value }))} placeholder="Any notes about these requirements..." className="min-h-[60px]" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingVenue ? 'Save Changes' : 'Add Venue'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Venue</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
              Papers referencing this venue will lose their expected venue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}