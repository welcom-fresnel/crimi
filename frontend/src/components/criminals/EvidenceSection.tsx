import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Image as ImageIcon,
  MapPin,
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import { Evidence } from '@/types';
import { criminalsAPI } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const categoryLabels: Record<Evidence['category'], string> = {
  WEAPON: 'Arme',
  DOCUMENT: 'Document',
  DIGITAL: 'Numerique',
  BIOLOGICAL: 'Biologique',
  OTHER: 'Autre',
};

const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

const resolveFileUrl = (value: string) => {
  if (/^https?:\/\//i.test(value)) return value;
  return `${apiBase}${value.startsWith('/') ? value : `/${value}`}`;
};

const getFileName = (value: string) => {
  const lastSegment = value.split('?')[0].split('/').pop() || 'piece-jointe';
  try {
    return decodeURIComponent(lastSegment);
  } catch {
    return lastSegment;
  }
};

const isImageFile = (value: string) => /\.(jpe?g|png|gif|webp|bmp)$/i.test(value.split('?')[0]);

const formatCollectionDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString('fr-FR');
};

interface EvidenceSectionProps {
  criminalId: string;
}

interface EvidenceEditFields {
  title: string;
  description: string;
  category: Evidence['category'];
  collectedAt: string;
  collectedAtLocation: string;
}

export default function EvidenceSection({ criminalId }: EvidenceSectionProps) {
  const [evidences, setEvidences] = useState<Evidence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [editingEvidence, setEditingEvidence] = useState<Evidence | null>(null);
  const [editFields, setEditFields] = useState<EvidenceEditFields>({
    title: '',
    description: '',
    category: 'OTHER',
    collectedAt: '',
    collectedAtLocation: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [unavailableImages, setUnavailableImages] = useState<Set<string>>(new Set());

  const imageFiles = useMemo(
    () => evidences.flatMap((evidence) =>
      (evidence.fileUrls || [])
        .filter(isImageFile)
        .map((url) => ({ url, title: evidence.title || 'Piece a conviction' })),
    ),
    [evidences],
  );

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    criminalsAPI.getEvidences(criminalId)
      .then((response) => {
        if (active && response.success) setEvidences(response.data || []);
      })
      .catch((error: unknown) => {
        console.error('Erreur de chargement des pieces a conviction:', error);
        if (active) toast.error('Impossible de charger les pieces a conviction');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [criminalId]);

  useEffect(() => {
    if (previewIndex === null) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        setPreviewIndex((index) => index === null ? null : (index - 1 + imageFiles.length) % imageFiles.length);
      } else if (event.key === 'ArrowRight') {
        setPreviewIndex((index) => index === null ? null : (index + 1) % imageFiles.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewIndex, imageFiles.length]);

  const beginEdit = (evidence: Evidence) => {
    setEditingEvidence(evidence);
    setEditFields({
      title: evidence.title || '',
      description: evidence.description || '',
      category: evidence.category || 'OTHER',
      collectedAt: evidence.collectedAt ? new Date(evidence.collectedAt).toISOString().slice(0, 10) : '',
      collectedAtLocation: evidence.collectedAtLocation || '',
    });
  };

  const saveEdit = async () => {
    if (!editingEvidence) return;
    setIsSaving(true);
    try {
      const response = await criminalsAPI.updateEvidence(criminalId, editingEvidence.id, {
        ...editFields,
        collectedAt: editFields.collectedAt || undefined,
      });
      if (!response.success) throw new Error(response.message || 'La mise a jour a echoue');
      setEvidences((previous) => previous.map((item) =>
        item.id === editingEvidence.id ? response.data : item,
      ));
      setEditingEvidence(null);
      toast.success('Piece a conviction mise a jour');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'La mise a jour a echoue');
    } finally {
      setIsSaving(false);
    }
  };

  const markImageUnavailable = (url: string) => {
    setUnavailableImages((previous) => new Set(previous).add(url));
  };

  const selectedImage = previewIndex === null ? null : imageFiles[previewIndex];

  return (
    <>
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Pieces a conviction
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoading && evidences.length === 0 && (
            <p className="text-sm text-muted-foreground">Chargement des pieces...</p>
          )}
          {!isLoading && evidences.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucune piece a conviction enregistree.</p>
          )}
          {evidences.map((evidence) => (
            <section key={evidence.id} className="space-y-3 border-b pb-5 last:border-0 last:pb-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <h3 className="font-medium">{evidence.title || 'Piece sans titre'}</h3>
                  <span className="inline-flex rounded-sm bg-muted px-2 py-1 text-xs text-muted-foreground">
                    {categoryLabels[evidence.category] || categoryLabels.OTHER}
                  </span>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => beginEdit(evidence)}>
                  <Pencil className="mr-2 h-4 w-4" /> Modifier
                </Button>
              </div>
              {evidence.description && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{evidence.description}</p>
              )}
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                {formatCollectionDate(evidence.collectedAt) && (
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatCollectionDate(evidence.collectedAt)}
                  </span>
                )}
                {evidence.collectedAtLocation && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {evidence.collectedAtLocation}
                  </span>
                )}
              </div>
              {evidence.fileUrls?.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {evidence.fileUrls.map((storedUrl) => {
                    const url = resolveFileUrl(storedUrl);
                    const name = getFileName(storedUrl);
                    const imageIndex = imageFiles.findIndex((image) => image.url === storedUrl);
                    if (isImageFile(storedUrl)) {
                      return (
                        <div key={storedUrl} className="relative overflow-hidden rounded-md border bg-muted">
                          {unavailableImages.has(url) ? (
                            <div className="flex h-40 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                              <ImageIcon className="h-6 w-6" /> Image indisponible
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="block w-full"
                              aria-label={`Agrandir ${name}`}
                              onClick={() => setPreviewIndex(imageIndex)}
                            >
                              <img
                                src={url}
                                alt={evidence.title || name}
                                className="h-40 w-full object-cover"
                                onError={() => markImageUnavailable(url)}
                              />
                            </button>
                          )}
                          <a href={url} download={name} className="absolute bottom-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-sm bg-background/90" aria-label={`Telecharger ${name}`}>
                            <Download className="h-4 w-4" />
                          </a>
                        </div>
                      );
                    }
                    return (
                      <a
                        key={storedUrl}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        download={name}
                        className="flex min-h-20 items-center gap-3 rounded-md border p-3 hover:bg-muted"
                      >
                        <FileText className="h-6 w-6 shrink-0 text-primary" />
                        <span className="min-w-0 flex-1 truncate text-sm" title={name}>{name}</span>
                        <Download className="h-4 w-4 shrink-0" />
                      </a>
                    );
                  })}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Enregistre le {new Date(evidence.createdAt).toLocaleString('fr-FR')}
                {evidence.createdBy?.username ? ` par ${evidence.createdBy.username}` : ''}
              </p>
            </section>
          ))}
        </CardContent>
      </Card>

      <Dialog open={previewIndex !== null} onOpenChange={(open) => !open && setPreviewIndex(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-6xl p-3 sm:p-5">
          {selectedImage && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedImage.title}</DialogTitle>
                <DialogDescription>
                  {previewIndex! + 1} / {imageFiles.length}
                </DialogDescription>
              </DialogHeader>
              <div className="relative flex min-h-[45vh] items-center justify-center rounded bg-black">
                <img
                  src={resolveFileUrl(selectedImage.url)}
                  alt={selectedImage.title}
                  className="max-h-[75vh] w-full object-contain"
                />
                {imageFiles.length > 1 && (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="absolute left-3 top-1/2 -translate-y-1/2"
                      aria-label="Image precedente"
                      onClick={() => setPreviewIndex((previewIndex! - 1 + imageFiles.length) % imageFiles.length)}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      aria-label="Image suivante"
                      onClick={() => setPreviewIndex((previewIndex! + 1) % imageFiles.length)}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </>
                )}
              </div>
              <div className="flex justify-end">
                <Button asChild variant="outline">
                  <a href={resolveFileUrl(selectedImage.url)} download={getFileName(selectedImage.url)}>
                    <Download className="mr-2 h-4 w-4" /> Telecharger
                  </a>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editingEvidence !== null} onOpenChange={(open) => !open && setEditingEvidence(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la piece a conviction</DialogTitle>
            <DialogDescription>Metadonnees de collecte et description.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editEvidenceTitle">Titre</Label>
              <Input id="editEvidenceTitle" value={editFields.title} onChange={(event) => setEditFields((value) => ({ ...value, title: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editEvidenceDescription">Description</Label>
              <Textarea id="editEvidenceDescription" value={editFields.description} onChange={(event) => setEditFields((value) => ({ ...value, description: event.target.value }))} rows={4} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editEvidenceCategory">Categorie</Label>
              <Select value={editFields.category} onValueChange={(category: Evidence['category']) => setEditFields((value) => ({ ...value, category }))}>
                <SelectTrigger id="editEvidenceCategory"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="WEAPON">Arme</SelectItem>
                  <SelectItem value="DOCUMENT">Document</SelectItem>
                  <SelectItem value="DIGITAL">Numerique</SelectItem>
                  <SelectItem value="BIOLOGICAL">Biologique</SelectItem>
                  <SelectItem value="OTHER">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="editCollectedAt">Date de collecte</Label>
                <Input id="editCollectedAt" type="date" value={editFields.collectedAt} onChange={(event) => setEditFields((value) => ({ ...value, collectedAt: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editCollectedAtLocation">Lieu de collecte</Label>
                <Input id="editCollectedAtLocation" value={editFields.collectedAtLocation} onChange={(event) => setEditFields((value) => ({ ...value, collectedAtLocation: event.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditingEvidence(null)}>Annuler</Button>
            <Button type="button" disabled={isSaving} onClick={() => void saveEdit()}>
              {isSaving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}