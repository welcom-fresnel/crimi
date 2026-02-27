import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Criminal, CriminalStatus } from '@/types';
import { useCriminals } from '@/contexts/CriminalsContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

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
});

type CriminalFormData = z.infer<typeof criminalSchema>;

interface CriminalFormProps {
  criminal?: Criminal;
  isEditing?: boolean;
}

export function CriminalForm({ criminal, isEditing = false }: CriminalFormProps) {
  const navigate = useNavigate();
  const { crimeTypes, addCriminal, updateCriminal } = useCriminals();
  const { upsertCriminal } = useCriminals();

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
          birthDate: criminal.birthDate || criminal.dateOfBirth || '',
          nationality: criminal.nationality || '',
          crimeTypeId: criminal.crimeType?.id || '',
          arrestDate: criminal.arrestation?.arrestDate || criminal.arrestDate || criminal.crimeDate || '',
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
        }
      : {
          status: 'ARRESTED' as CriminalStatus,
          arrestingUnit: '',
          arrestingOfficer: '',
          warrantNumber: '',
          arrestationNotes: '',
          evidenceTitle: '',
          evidenceDescription: '',
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
      const evidenceInput = document.getElementById('evidenceFiles') as HTMLInputElement | null;
      const evidenceFiles = evidenceInput?.files ? Array.from(evidenceInput.files) : [];
      const hasEvidenceText = !!data.evidenceTitle || !!data.evidenceDescription;
      if (createdId && (hasEvidenceText || evidenceFiles.length > 0)) {
        try {
          const { criminalsAPI } = await import('@/services/api');
          await criminalsAPI.addEvidence(createdId, {
            title: data.evidenceTitle,
            description: data.evidenceDescription,
            files: evidenceFiles,
          });
        } catch (err) {
          console.error('Erreur ajout piece a conviction:', err);
          toast.error('Attention', {
            description: 'Le dossier est cree mais la piece a conviction n a pas pu etre enregistree.',
          });
        }
      }
      // Naviguer directement apres la sauvegarde
      navigate('/criminals');
    } catch (error) {
      // L'erreur est deja geree dans le contexte
      console.error('Erreur lors de la soumission:', error);
    }
  };

  const statusOptions: { value: CriminalStatus; label: string }[] = [
    { value: 'ARRESTED', label: 'Arrete' },
    { value: 'ACTIVE', label: 'Recherche' },
    { value: 'RELEASED', label: 'Libere' },
    { value: 'DECEASED', label: 'Decede' },
    { value: 'UNKNOWN', label: 'Inconnu' },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="mb-4">
        <Label htmlFor="photo">Photo du criminel</Label>
        <input id="photo" name="photo" type="file" accept="image/*" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass-card">
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
                <Input id="nationality" {...register('nationality')} placeholder="Senegalaise" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Informations criminelles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="crimeTypeId">Type de crime *</Label>
              <Select
                onValueChange={value => setValue('crimeTypeId', value)}
                defaultValue={criminal?.crimeType.id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selectionner un type" />
                </SelectTrigger>
                <SelectContent>
                  {crimeTypes && crimeTypes.length > 0 ? (
                    crimeTypes.map(type => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="__none__" disabled>Aucun type disponible</SelectItem>
                  )}
                </SelectContent>
              </Select>
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
                <Select
                  onValueChange={value => setValue('status', value as CriminalStatus)}
                  defaultValue={criminal?.status || 'ARRESTED'}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

        <Card className="glass-card md:col-span-2">
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
                <Label htmlFor="evidenceFiles">Images de preuve</Label>
                <Input id="evidenceFiles" name="evidenceFiles" type="file" accept="image/*" multiple />
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
