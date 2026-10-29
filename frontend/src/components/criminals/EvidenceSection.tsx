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
import { usePermissions } from '@/hooks/usePermissions';
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

const categoryLabels: Record<Evidence['category'], string> = {
  WEAPON: 'Arme',
  DOCUMENT: 'Document',
  DIGITAL: 'Numerique',
  BIOLOGICAL: 'Biologique',
  OTHER: 'Autre',
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
  const { can } = usePermissions();
  const canEditEvidence = can('criminals', 'update');
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
  const [imageSources, setImageSources] = useState<Record<string, string>>({});

  const imageFiles = useMemo(
    () => evidences.flatMap((evidence) =>
      (evidence.fileUrls || []).flatMap((url, fileIndex) => isImageFile(url)
        ? [{
            key: `${evidence.id}:${fileIndex}`,
            evidenceId: evidence.id,
            fileIndex,
            title: evidence.title || 'Piece a conviction',
            fileName: getFileName(url),
          }]
        : []),
    ),
    [evidences],
  );

  useEffect(() => {
    let active = true;
    const createdObjectUrls: string[] = [];
    setIsLoading(true);
    const loadEvidences = async () => {
      try {
        const response = await criminalsAPI.getEvidences(criminalId);
        if (!response.success) return;
        const records = response.data || [];
        if (active) setEvidences(records);

        const imageRefs = records.flatMap((evidence) =>
          (evidence.fileUrls || []).flatMap((url, fileIndex) => isImageFile(url)
            ? [{ key: `${evidence.id}:${fileIndex}`, evidenceId: evidence.id, fileIndex }]
            : []),
        );
        const loadedImages = await Promise.all(imageRefs.map(async (image) => {
          try {
            const blob = await criminalsAPI.getEvidenceFile(criminalId, image.evidenceId, image.fileIndex);
            const source = URL.createObjectURL(blob);
            createdObjectUrls.push(source);
            return { key: image.key, source };
          } catch {
            return { key: image.key, source: '' };
          }
        }));

        if (!active) {
          createdObjectUrls.forEach((source) => URL.revokeObjectURL(source));
          return;
        }
        setImageSources(Object.fromEntries(loadedImages.filter((image) => image.source).map((image) => [image.key, image.source])));
        setUnavailableImages(new Set(loadedImages.filter((image) => !image.source).map((image) => image.key)));
      } catch {
        console.error('Échec du chargement des pièces à conviction.');
        if (active) toast.error('Impossible de charger les pieces a conviction');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void loadEvidences();

    return () => {
      active = false;
      createdObjectUrls.forEach((source) => URL.revokeObjectURL(source));
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

  const downloadEvidenceFile = async (evidenceId: string, fileIndex: number, fileName: string) => {
    try {
      const blob = await criminalsAPI.getEvidenceFile(criminalId, evidenceId, fileIndex, true);
      const source = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = source;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(source), 1000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Telechargement impossible');
    }
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
                {canEditEvidence && (
                  <Button type="button" variant="outline" size="sm" onClick={() => beginEdit(evidence)}>
                    <Pencil className="mr-2 h-4 w-4" /> Modifier
                  </Button>
                )}
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
                  {evidence.fileUrls.map((storedUrl, fileIndex) => {
                    const name = getFileName(storedUrl);
                    const imageKey = `${evidence.id}:${fileIndex}`;
                    const imageIndex = imageFiles.findIndex((image) => image.key === imageKey);
                    if (isImageFile(storedUrl)) {
                      return (
                        <div key={imageKey} className="relative overflow-hidden rounded-md border bg-muted">
                          {unavailableImages.has(imageKey) ? (
                            <div className="flex h-40 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                              <ImageIcon className="h-6 w-6" /> Image indisponible
                            </div>
                          ) : imageSources[imageKey] ? (
                            <button
                              type="button"
                              className="block w-full"
                              aria-label={`Agrandir ${name}`}
                              onClick={() => setPreviewIndex(imageIndex)}
                            >
                              <img src={imageSources[imageKey]} alt={evidence.title || name} className="h-40 w-full object-cover" />
                            </button>
                          ) : (
                            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Chargement...</div>
                          )}
                          <button type="button" onClick={() => void downloadEvidenceFile(evidence.id, fileIndex, name)} className="absolute bottom-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-sm bg-background/90" aria-label={`Telecharger ${name}`}>
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    }
                    return (
                      <button
                        key={storedUrl}
                        type="button"
                        onClick={() => void downloadEvidenceFile(evidence.id, fileIndex, name)}
                        className="flex min-h-20 items-center gap-3 rounded-md border p-3 hover:bg-muted"
                      >
                        <FileText className="h-6 w-6 shrink-0 text-primary" />
                        <span className="min-w-0 flex-1 truncate text-sm" title={name}>{name}</span>
                        <Download className="h-4 w-4 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
              {!evidence.fileUrls?.length && <p className="text-xs text-muted-foreground">Fichiers : Non communiqué</p>}
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
                  src={imageSources[selectedImage.key]}
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
                  <button type="button" onClick={() => void downloadEvidenceFile(selectedImage.evidenceId, selectedImage.fileIndex, selectedImage.fileName)}>
                    <Download className="mr-2 h-4 w-4" /> Telecharger
                  </button>
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
              <select
                id="editEvidenceCategory"
                value={editFields.category}
                onChange={(event) => setEditFields((value) => ({ ...value, category: event.target.value as Evidence['category'] }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="WEAPON">Arme</option>
                <option value="DOCUMENT">Document</option>
                <option value="DIGITAL">Numerique</option>
                <option value="BIOLOGICAL">Biologique</option>
                <option value="OTHER">Autre</option>
              </select>
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
