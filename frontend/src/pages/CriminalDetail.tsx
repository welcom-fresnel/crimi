import { useParams, useNavigate } from 'react-router-dom';
import { useCriminals } from '@/contexts/CriminalsContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/criminals/StatusBadge';
import EvidenceSection from '@/components/criminals/EvidenceSection';
import { ArrowLeft, Download, Pencil, Printer, User, Calendar, MapPin, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { criminalsAPI } from '@/services/api';
import { createCriminalPdf, getCriminalPdfFileName } from '@/lib/criminal-pdf';

const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

const normalizeUrl = (value?: string) => {
  if (!value) return undefined;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  return `${apiBase}${value.startsWith('/') ? value : `/${value}`}`;
};

export default function CriminalDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { criminals, isLoading } = useCriminals();
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const criminal = criminals.find((c) => c.id === id);

  const formatDate = (value?: string) => {
    if (!value) return 'Non renseignee';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Non renseignee';
    return format(date, 'd MMMM yyyy', { locale: fr });
  };

  const formatDateTime = (value?: string) => {
    if (!value) return 'Non renseignee';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Non renseignee';
    return format(date, "d MMMM yyyy 'a' HH:mm", { locale: fr });
  };

  const photoImages = useMemo(() => {
    return [normalizeUrl(criminal?.photo)]
      .filter(Boolean)
      .filter((value, index, self) => self.indexOf(value) === index) as string[];
  }, [criminal?.photo]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const currentImage = photoImages[currentImageIndex] || undefined;
  useEffect(() => {
    if (currentImageIndex >= photoImages.length) {
      setCurrentImageIndex(0);
    }
  }, [currentImageIndex, photoImages.length]);

  const exportCriminalPdf = async (printAfterExport = false) => {
    if (!criminal) return;
    const printWindow = printAfterExport ? window.open('', '_blank') : null;
    if (printAfterExport && !printWindow) {
      toast.error('Impression bloquee', { description: 'Autorisez les fenetres surgissantes pour imprimer le dossier.' });
      return;
    }

    setIsExportingPdf(true);
    try {
      const evidenceResponse = await criminalsAPI.getEvidences(criminal.id);
      const pdf = await createCriminalPdf(criminal, evidenceResponse.data || []);
      const fileName = getCriminalPdfFileName(criminal);

      if (printAfterExport && printWindow) {
        pdf.autoPrint();
        printWindow.location.href = pdf.output('bloburl');
      } else {
        pdf.save(fileName);
        toast.success('PDF telecharge', { description: fileName });
      }
    } catch (error) {
      printWindow?.close();
      console.error('Erreur de generation du PDF du dossier:', error);
      toast.error('Export PDF impossible', {
        description: error instanceof Error ? error.message : 'Une erreur est survenue pendant la generation du PDF.',
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (!criminal && (isLoading || criminals.length === 0)) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Chargement du dossier...</p>
      </div>
    );
  }

  if (!criminal) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Dossier non trouve</p>
        <Button variant="link" onClick={() => navigate('/criminals')}>
          Retour a la liste
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <Button variant="ghost" size="icon" className="self-start" onClick={() => navigate('/criminals')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground break-words">
            {criminal.lastName} {criminal.firstName}
          </h1>
          <p className="text-muted-foreground break-all">{criminal.caseNumber || criminal.fileNumber}</p>
        </div>
        <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-2">
          <StatusBadge status={criminal.status} />
          <Button variant="outline" disabled={isExportingPdf} onClick={() => void exportCriminalPdf(true)} aria-label="Imprimer le dossier PDF">
            <Printer className="h-4 w-4 mr-2" />
            Imprimer
          </Button>
          <Button variant="outline" disabled={isExportingPdf} onClick={() => void exportCriminalPdf()} aria-label="Telecharger le dossier PDF">
            <Download className="h-4 w-4 mr-2" />
            {isExportingPdf ? 'Preparation...' : 'PDF'}
          </Button>
          <Button onClick={() => navigate(`/criminals/${id}/edit`)}>
            <Pencil className="h-4 w-4 mr-2" />
            Modifier
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="aspect-square rounded-lg bg-muted flex items-center justify-center mb-4 overflow-hidden relative">
                {currentImage ? (
                  <>
                    <img
                      src={currentImage}
                      alt={`${criminal.firstName} ${criminal.lastName}`}
                      className="h-full w-full object-cover rounded-lg"
                    />
                    {photoImages.length > 1 && (
                      <>
                        <button
                          type="button"
                          className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-background/80 border flex items-center justify-center"
                          onClick={() =>
                            setCurrentImageIndex((prev) => (prev - 1 + photoImages.length) % photoImages.length)
                          }
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-background/80 border flex items-center justify-center"
                          onClick={() =>
                            setCurrentImageIndex((prev) => (prev + 1) % photoImages.length)
                          }
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <User className="h-20 w-20 text-muted-foreground" />
                )}
              </div>
              <div className="text-center">
                <h2 className="text-xl font-semibold">
                  {criminal.lastName} {criminal.firstName}
                </h2>
                <p className="text-sm text-muted-foreground">{criminal.nationality || 'Nationalite inconnue'}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5" />
                Informations personnelles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-muted-foreground">Nom complet</dt>
                  <dd className="font-medium">
                    {criminal.lastName} {criminal.firstName}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Date de naissance</dt>
                  <dd className="font-medium">{formatDate(criminal.birthDate || criminal.dateOfBirth)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Nationalite</dt>
                  <dd className="font-medium">{criminal.nationality || 'Non renseignee'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">N deg Dossier</dt>
                  <dd className="font-medium">{criminal.caseNumber || criminal.fileNumber}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" />
                Informations criminelles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-muted-foreground">Type de crime</dt>
                  <dd className="font-medium">{criminal.crimeType?.name || 'Type inconnu'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Statut actuel</dt>
                  <dd>
                    <StatusBadge status={criminal.status} />
                  </dd>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <dt className="text-sm text-muted-foreground">Date d'arrestation</dt>
                    <dd className="font-medium">
                      {formatDate(
                        criminal.arrestation?.arrestDate || criminal.arrestDate || criminal.crimeDate,
                      )}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <dt className="text-sm text-muted-foreground">Lieu d'arrestation</dt>
                    <dd className="font-medium">
                      {criminal.arrestation?.arrestLocation ||
                        criminal.arrestLocation ||
                        criminal.crimeLocation ||
                        'Non renseigne'}
                    </dd>
                  </div>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Unite d'intervention</dt>
                  <dd className="font-medium">{criminal.arrestation?.arrestingUnit || 'Non renseignee'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Agent responsable</dt>
                  <dd className="font-medium">{criminal.arrestation?.arrestingOfficer || 'Non renseigne'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Numero de mandat</dt>
                  <dd className="font-medium">{criminal.arrestation?.warrantNumber || 'Non renseigne'}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" />
                Crimes associes ({criminal.crimes?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {criminal.crimes && criminal.crimes.length > 0 ? (
                criminal.crimes.map((crime) => (
                  <article key={crime.id} className="space-y-2 border-b pb-4 last:border-0 last:pb-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold">{crime.crimeType?.name || 'Type de crime inconnu'}</h3>
                        <p className="text-sm text-muted-foreground">
                          {[formatDate(crime.crimeDate || undefined), crime.crimeLocation].filter((value) => value && value !== 'Non renseignee').join(' · ') || 'Date et lieu non renseignes'}
                        </p>
                      </div>
                      <StatusBadge status={crime.status} />
                    </div>
                    <p className="whitespace-pre-wrap text-sm">{crime.description}</p>
                    {crime.dangerLevel && (
                      <p className="text-xs text-muted-foreground">Niveau de danger : {crime.dangerLevel}</p>
                    )}
                  </article>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Aucun crime supplementaire enregistre pour ce dossier.</p>
              )}
            </CardContent>
          </Card>

          {criminal.arrestation?.notes && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">Observations d'arrestation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground whitespace-pre-wrap">{criminal.arrestation.notes}</p>
              </CardContent>
            </Card>
          )}

          {criminal.notes && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground whitespace-pre-wrap">{criminal.notes || criminal.description || ''}</p>
              </CardContent>
            </Card>
          )}

          <EvidenceSection criminalId={criminal.id} />

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Metadonnees</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-muted-foreground">Cree le</dt>
                  <dd className="font-medium">
                    {formatDateTime(criminal.createdAt)}
                  </dd>
                </div>
                {criminal.updatedAt && (
                  <div>
                    <dt className="text-sm text-muted-foreground">Derniere modification</dt>
                    <dd className="font-medium">
                      {formatDateTime(criminal.updatedAt)}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
