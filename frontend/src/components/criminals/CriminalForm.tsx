import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CrimeRecord, Criminal, CriminalStatus } from '@/types';
import { useCriminals } from '@/contexts/CriminalsContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Check, Plus, X } from 'lucide-react';

const criminalSchema = z.object({
  firstName: z.string().min(2, 'Le prenom est requis'),
  lastName: z.string().min(2, 'Le nom est requis'),
  birthDate: z.string().optional(),
  nationality: z.string().optional(),
  crimeTypeId: z.string().min(1, 'Le type de crime est requis'),
  arrestDate: z.string().min(1, "La date d'arrestation est requise"),
  arrestLocation: z.string().min(2, "Le lieu d'arrestation est requis"),
  arrestingUnit: z.string().optional(),
  arrestingOfficer: z.string().optional(),
  warrantNumber: z.string().optional(),
  arrestationNotes: z.string().optional(),
  status: z.enum(['ARRESTED', 'ACTIVE', 'RELEASED', 'DECEASED', 'UNKNOWN']),
  notes: z.string().optional(),
  evidenceTitle: z.string().optional(),
  evidenceDescription: z.string().optional(),
  evidenceCategory: z.enum(['WEAPON', 'DOCUMENT', 'DIGITAL', 'BIOLOGICAL', 'OTHER']).optional(),
  collectedAt: z.string().optional(),
  collectedAtLocation: z.string().optional(),
});

type CriminalFormData = z.infer<typeof criminalSchema>;

const toDateInputValue = (value?: string | null) => {
  if (!value) return '';
  const isoDate = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (isoDate) return isoDate;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface CriminalFormProps {
  criminal?: Criminal;
  isEditing?: boolean;
}

export function CriminalForm({ criminal, isEditing = false }: CriminalFormProps) {
  const navigate = useNavigate();
  const { crimeTypes, addCriminal, updateCriminal } = useCriminals();
  const { upsertCriminal } = useCriminals();
  const [pendingCrimes, setPendingCrimes] = useState<CrimeRecord[]>([]);
  const [crimeDraft, setCrimeDraft] = useState({
    crimeTypeId: '',
    crimeDate: '',
    crimeLocation: '',
    description: '',
    status: 'ACTIVE' as CriminalStatus,
    dangerLevel: '',
  });
  const [activeFormStep, setActiveFormStep] = useState(0);
  const nationalityOptions = useMemo(() => {
    const supportedValuesOf = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf;
    if (!supportedValuesOf || typeof Intl.DisplayNames === 'undefined') {
      return [];
    }
    try {
      const displayNames = new Intl.DisplayNames(['fr'], { type: 'region' as Intl.DisplayNamesOptions['type'] });
      return supportedValuesOf('region')
        .filter(code => code.length === 2)
        .map(code => ({ code, label: displayNames.of(code) ?? code }))
        .filter(option => option.label && option.label !== option.code)
        .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
    } catch (_) {
      return [];
    }
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CriminalFormData>({
    resolver: zodResolver(criminalSchema),
    defaultValues: criminal
      ? {
          firstName: criminal.firstName,
          lastName: criminal.lastName,
          birthDate: toDateInputValue(criminal.birthDate || criminal.dateOfBirth),
          nationality: criminal.nationality || '',
          crimeTypeId: criminal.crimeType?.id || '',
          arrestDate: toDateInputValue(
            criminal.arrestation?.arrestDate || criminal.arrestDate || criminal.crimeDate,
          ),
          arrestLocation:
            criminal.arrestation?.arrestLocation || criminal.arrestLocation || criminal.crimeLocation || '',
          arrestingUnit: criminal.arrestation?.arrestingUnit || '',
          arrestingOfficer: criminal.arrestation?.arrestingOfficer || '',
          warrantNumber: criminal.arrestation?.warrantNumber || '',
          arrestationNotes: criminal.arrestation?.notes || '',
          status: criminal.status as CriminalStatus,
          notes: criminal.notes || criminal.description || '',
          evidenceTitle: '',
          evidenceDescription: '',
          evidenceCategory: 'OTHER',
          collectedAt: '',
          collectedAtLocation: '',
        }
      : {
          status: 'ARRESTED' as CriminalStatus,
          arrestingUnit: '',
          arrestingOfficer: '',
          warrantNumber: '',
          arrestationNotes: '',
          evidenceTitle: '',
          evidenceDescription: '',
          evidenceCategory: 'OTHER',
          collectedAt: '',
          collectedAtLocation: '',
        },
  });

  const generateCaseNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `CR-${year}-${random}`;
  };

  const onSubmit = async (data: CriminalFormData) => {
    if (!crimeTypes || crimeTypes.length === 0) {
      toast.error('Erreur', { description: 'Les types de crimes ne sont pas charges' });
      return;
    }

    const crimeType = crimeTypes.find(ct => ct.id === data.crimeTypeId);
    if (!crimeType) {
      toast.error('Erreur', { description: 'Type de crime invalide' });
      return;
    }

    const evidenceInput = document.getElementById('evidenceFiles') as HTMLInputElement | null;
    const evidenceFiles = evidenceInput?.files ? Array.from(evidenceInput.files) : [];
    if (evidenceFiles.length > 6) {
      toast.error('Trop de fichiers', { description: 'Vous pouvez joindre au maximum 6 fichiers.' });
      return;
    }
    if (evidenceFiles.some((file) => file.size > 5 * 1024 * 1024)) {
      toast.error('Fichier trop volumineux', { description: 'Chaque fichier doit faire 5 Mo maximum.' });
      return;
    }

    // Adapter les donnees pour le backend
    const backendData = {
      caseNumber: isEditing && criminal ? criminal.caseNumber : generateCaseNumber(),
      firstName: data.firstName,
      lastName: data.lastName,
      alias: data.firstName, // Utiliser firstName comme alias temporairement
      dateOfBirth: data.birthDate || undefined,
      nationality: data.nationality || undefined,
      crimeTypeId: data.crimeTypeId,
      crimeDate: data.arrestDate || undefined,
      crimeLocation: data.arrestLocation || undefined,
      description: data.notes || 'Aucune description',
      status: data.status,
      arrestation: {
        arrestDate: data.arrestDate || undefined,
        arrestLocation: data.arrestLocation || undefined,
        arrestingUnit: data.arrestingUnit || undefined,
        arrestingOfficer: data.arrestingOfficer || undefined,
        warrantNumber: data.warrantNumber || undefined,
        notes: data.arrestationNotes || undefined,
      },
    };

    try {
      let createdId: string | null = null;
      if (isEditing && criminal) {
        await updateCriminal(criminal.id, backendData);
        createdId = criminal.id;
      } else {
        const res = await addCriminal(backendData);
        createdId = res?.id || null;
      }

      if (isEditing && criminal && pendingCrimes.length > 0) {
        let savedCount = 0;
        try {
          const { criminalsAPI } = await import('@/services/api');
          for (const pendingCrime of pendingCrimes) {
            await criminalsAPI.addCrime(criminal.id, {
              crimeTypeId: pendingCrime.crimeTypeId,
              crimeDate: pendingCrime.crimeDate || undefined,
              crimeLocation: pendingCrime.crimeLocation || undefined,
              description: pendingCrime.description,
              status: pendingCrime.status,
              dangerLevel: pendingCrime.dangerLevel || undefined,
            });
            savedCount += 1;
          }
          setPendingCrimes([]);
        } catch (error) {
          setPendingCrimes((current) => current.slice(savedCount));
          throw new Error(
            savedCount > 0
              ? `${savedCount} crime(s) ajoute(s), mais les suivants n'ont pas pu etre enregistres. Les crimes restants sont conserves dans le formulaire.`
              : error instanceof Error ? error.message : 'Impossible d ajouter le crime au dossier.',
          );
        }
      }

      // If a photo file was selected, upload it and update local state immediately
      const photoInput = (document.getElementById('photo') as HTMLInputElement);
      if (photoInput && photoInput.files && photoInput.files.length > 0 && createdId) {
        try {
          const file = photoInput.files[0];
          const { criminalsAPI } = await import('@/services/api');
          const uploadResp = await criminalsAPI.uploadPhoto(createdId, file);
          if (uploadResp && uploadResp.success && uploadResp.data) {
            upsertCriminal(uploadResp.data);
          }
        } catch (err) {
          console.error('Erreur upload photo:', err);
        }
      }

      // Ajouter les pieces a conviction (description + images)
      const hasEvidenceText = !!data.evidenceTitle || !!data.evidenceDescription;
      if (createdId && (hasEvidenceText || evidenceFiles.length > 0)) {
        try {
          const { criminalsAPI } = await import('@/services/api');
          await criminalsAPI.addEvidence(createdId, {
            title: data.evidenceTitle,
            description: data.evidenceDescription,
            category: data.evidenceCategory || 'OTHER',
            collectedAt: data.collectedAt || undefined,
            collectedAtLocation: data.collectedAtLocation || undefined,
            files: evidenceFiles,
          });
        } catch (err) {
          console.error('Erreur ajout piece a conviction:', err);
          toast.error('Attention', {
            description: 'Le dossier est cree mais la piece a conviction n a pas pu etre enregistree.',
          });
        }
      }
      if (createdId) {
        try {
          const { criminalsAPI } = await import('@/services/api');
          const refreshed = await criminalsAPI.getById(createdId);
          if (refreshed.success) {
            upsertCriminal(refreshed.data);
          }
        } catch (err) {
          console.error('Erreur lors du rechargement du dossier:', err);
        }

        navigate(`/criminals/${createdId}`);
        return;
      }

      navigate('/criminals');
    } catch (error) {
      // L'erreur est deja geree dans le contexte
      console.error('Erreur lors de la soumission:', error);
      toast.error('Enregistrement incomplet', {
        description: error instanceof Error ? error.message : 'Impossible d enregistrer les modifications.',
      });
    }
  };

  const stageCrime = () => {
    if (!crimeDraft.crimeTypeId) {
      toast.error('Type de crime requis');
      return;
    }
    if (crimeDraft.description.trim().length < 10) {
      toast.error('Description trop courte', { description: 'La description doit contenir au moins 10 caracteres.' });
      return;
    }
    setPendingCrimes((current) => [...current, { ...crimeDraft, description: crimeDraft.description.trim(), id: `pending-${Date.now()}-${current.length}`, crimeType: crimeTypes.find((type) => type.id === crimeDraft.crimeTypeId)!, createdAt: new Date().toISOString() }]);
    setCrimeDraft({ crimeTypeId: '', crimeDate: '', crimeLocation: '', description: '', status: 'ACTIVE', dangerLevel: '' });
  };

  const statusOptions: { value: CriminalStatus; label: string }[] = [
    { value: 'ARRESTED', label: 'Arrete' },
    { value: 'ACTIVE', label: 'Recherche' },
    { value: 'RELEASED', label: 'Libere' },
    { value: 'DECEASED', label: 'Decede' },
    { value: 'UNKNOWN', label: 'Inconnu' },
  ];

  const formSteps = [
    { id: 'criminal-step-identity', label: 'Identite' },
    { id: 'criminal-step-facts', label: 'Faits et arrestation' },
    ...(isEditing ? [{ id: 'criminal-step-crimes', label: 'Infractions' }] : []),
    { id: 'criminal-step-evidence', label: 'Pieces' },
  ];

  const goToFormStep = (index: number) => {
    setActiveFormStep(index);
    document.getElementById(formSteps[index].id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <nav className="form-stepper" aria-label="Sections du formulaire">
        <div className="form-stepper-track" aria-hidden="true">
          <span style={{ width: `${formSteps.length > 1 ? (activeFormStep / (formSteps.length - 1)) * 100 : 100}%` }} />
        </div>
        {formSteps.map((step, index) => (
          <button
            key={step.id}
            type="button"
            className={`form-step ${index === activeFormStep ? 'is-active' : ''} ${index < activeFormStep ? 'is-complete' : ''}`}
            aria-current={index === activeFormStep ? 'step' : undefined}
            onClick={() => goToFormStep(index)}
          >
            <span className="form-step-index">{index < activeFormStep ? <Check aria-hidden="true" className="h-3.5 w-3.5" /> : `0${index + 1}`}</span>
            <span className="form-step-label">{step.label}</span>
          </button>
        ))}
      </nav>
      <div className="mb-4">
        <Label htmlFor="photo">Photo du criminel</Label>
        <input id="photo" name="photo" type="file" accept="image/*" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card id="criminal-step-identity" className="glass-card form-step-section">
          <CardHeader>
            <CardTitle className="text-lg">Identite</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom *</Label>
                <Input id="lastName" {...register('lastName')} placeholder="DIALLO" />
                {errors.lastName && (
                  <p className="text-sm text-destructive">{errors.lastName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstName">Prenom *</Label>
                <Input id="firstName" {...register('firstName')} placeholder="Moussa" />
                {errors.firstName && (
                  <p className="text-sm text-destructive">{errors.firstName.message}</p>
                )}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="birthDate">Date de naissance</Label>
                <Input id="birthDate" type="date" {...register('birthDate')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nationality">Nationalite</Label>
                {nationalityOptions.length > 0 ? (
                  <select
                    id="nationality"
                    {...register('nationality')}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">Selectionner une nationalite</option>
                    {nationalityOptions.map(option => (
                      <option key={option.code} value={option.label}>{option.label}</option>
                    ))}
                  </select>
                ) : (
                  <Input id="nationality" {...register('nationality')} placeholder="Senegalaise" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card id="criminal-step-facts" className="glass-card form-step-section">
          <CardHeader>
            <CardTitle className="text-lg">Informations criminelles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="crimeTypeId">Type de crime *</Label>
                <select
                  id="crimeTypeId"
                  {...register('crimeTypeId')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="" disabled>Selectionner un type</option>
                  {crimeTypes.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}
                </select>
              {errors.crimeTypeId && (
                <p className="text-sm text-destructive">{errors.crimeTypeId.message}</p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="arrestDate">Date d'arrestation *</Label>
                <Input id="arrestDate" type="date" {...register('arrestDate')} />
                {errors.arrestDate && (
                  <p className="text-sm text-destructive">{errors.arrestDate.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Statut *</Label>
                <select
                  id="status"
                  {...register('status')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  {statusOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="arrestLocation">Lieu d'arrestation *</Label>
              <Input
                id="arrestLocation"
                {...register('arrestLocation')}
                placeholder="Dakar, Plateau"
              />
              {errors.arrestLocation && (
                <p className="text-sm text-destructive">{errors.arrestLocation.message}</p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="arrestingUnit">Unite d'intervention</Label>
                <Input
                  id="arrestingUnit"
                  {...register('arrestingUnit')}
                  placeholder="Brigade anti-criminalite"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="arrestingOfficer">Agent responsable</Label>
                <Input id="arrestingOfficer" {...register('arrestingOfficer')} placeholder="Lt. M. Diallo" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="warrantNumber">Numero de mandat</Label>
              <Input id="warrantNumber" {...register('warrantNumber')} placeholder="MANDAT-2026-001" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="arrestationNotes">Observations d'arrestation</Label>
              <Textarea
                id="arrestationNotes"
                {...register('arrestationNotes')}
                placeholder="Contexte de l'interpellation, equipe engagee, resistance constatee..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Notes additionnelles</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              {...register('notes')}
              placeholder="Informations complementaires sur le dossier..."
              rows={4}
            />
          </CardContent>
        </Card>

        {isEditing && criminal && (
          <Card id="criminal-step-crimes" className="glass-card md:col-span-2 form-step-section">
            <CardHeader>
              <CardTitle className="text-lg">Infractions liees au dossier</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {(criminal.crimes || []).length > 0 && (
                <div className="divide-y rounded-md border">
                  {criminal.crimes!.map((crime) => (
                    <div key={crime.id} className="space-y-1 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">{crime.crimeType?.name || 'Crime'}</p>
                        <span className="text-xs text-muted-foreground">{crime.status}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{crime.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {[crime.crimeDate ? toDateInputValue(crime.crimeDate) : '', crime.crimeLocation, crime.dangerLevel].filter(Boolean).join(' · ') || 'Aucune date, lieu ou niveau de danger indique'}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {pendingCrimes.length > 0 && (
                <div className="space-y-2" aria-live="polite">
                  <p className="text-sm font-medium">Nouveaux crimes a enregistrer ({pendingCrimes.length})</p>
                  {pendingCrimes.map((crime) => (
                    <div key={crime.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
                      <div className="min-w-0">
                        <p className="font-medium">{crime.crimeType.name}</p>
                        <p className="text-sm text-muted-foreground">{crime.description}</p>
                      </div>
                      <Button type="button" variant="ghost" size="icon" aria-label="Retirer le crime en attente" onClick={() => setPendingCrimes((current) => current.filter((item) => item.id !== crime.id))}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-4 rounded-md border p-4">
                <h3 className="font-medium">Ajouter un crime</h3>
                <p className="text-sm text-muted-foreground">Preparez un ou plusieurs crimes ici; ils seront enregistres avec le bouton « Mettre a jour » du dossier.</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="newCrimeType">Type de crime *</Label>
                    <select id="newCrimeType" value={crimeDraft.crimeTypeId} onChange={(event) => setCrimeDraft((current) => ({ ...current, crimeTypeId: event.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="">Selectionner un type</option>
                      {crimeTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newCrimeDate">Date du crime</Label>
                    <Input id="newCrimeDate" type="date" value={crimeDraft.crimeDate} onChange={(event) => setCrimeDraft((current) => ({ ...current, crimeDate: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newCrimeLocation">Lieu du crime</Label>
                    <Input id="newCrimeLocation" value={crimeDraft.crimeLocation} onChange={(event) => setCrimeDraft((current) => ({ ...current, crimeLocation: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newCrimeStatus">Statut</Label>
                    <select id="newCrimeStatus" value={crimeDraft.status} onChange={(event) => setCrimeDraft((current) => ({ ...current, status: event.target.value as CriminalStatus }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="newCrimeDanger">Niveau de danger</Label>
                    <select id="newCrimeDanger" value={crimeDraft.dangerLevel} onChange={(event) => setCrimeDraft((current) => ({ ...current, dangerLevel: event.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="">Non precise</option>
                      <option value="LOW">Faible</option>
                      <option value="MEDIUM">Moyen</option>
                      <option value="HIGH">Eleve</option>
                      <option value="CRITICAL">Critique</option>
                    </select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="newCrimeDescription">Description *</Label>
                    <Textarea id="newCrimeDescription" value={crimeDraft.description} onChange={(event) => setCrimeDraft((current) => ({ ...current, description: event.target.value }))} rows={3} placeholder="Decrivez les faits lies a cette infraction..." />
                  </div>
                </div>
                <Button type="button" variant="outline" onClick={stageCrime}>
                  <Plus className="mr-2 h-4 w-4" /> Ajouter a la liste
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card id="criminal-step-evidence" className="glass-card md:col-span-2 form-step-section">
          <CardHeader>
            <CardTitle className="text-lg">Pieces a conviction</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="evidenceTitle">Titre de la piece</Label>
                <Input
                  id="evidenceTitle"
                  {...register('evidenceTitle')}
                  placeholder="Ex: Arme saisie / Telephone / Document"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="evidenceFiles">Fichiers de preuve</Label>
                <Input
                  id="evidenceFiles"
                  name="evidenceFiles"
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                  multiple
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="evidenceCategory">Categorie</Label>
                <select
                  id="evidenceCategory"
                  {...register('evidenceCategory')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="WEAPON">Arme</option>
                  <option value="DOCUMENT">Document</option>
                  <option value="DIGITAL">Numerique</option>
                  <option value="BIOLOGICAL">Biologique</option>
                  <option value="OTHER">Autre</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="collectedAt">Date de collecte</Label>
                <Input id="collectedAt" type="date" {...register('collectedAt')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="collectedAtLocation">Lieu de collecte</Label>
                <Input id="collectedAtLocation" {...register('collectedAtLocation')} placeholder="Lieu de saisie" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="evidenceDescription">Description de la piece</Label>
              <Textarea
                id="evidenceDescription"
                {...register('evidenceDescription')}
                placeholder="Decrivez la piece, son contexte, le lieu et la date de saisie..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-4 mt-6">
        <Button type="button" variant="outline" onClick={() => navigate('/criminals')}>
          Annuler
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isEditing ? 'Mettre a jour' : 'Enregistrer'}
        </Button>
      </div>
    </form>
  );
}

