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
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const criminalSchema = z.object({
  firstName: z.string().min(2, 'Le prénom est requis'),
  lastName: z.string().min(2, 'Le nom est requis'),
  birthDate: z.string().optional(),
  nationality: z.string().optional(),
  crimeTypeId: z.string().min(1, 'Le type de crime est requis'),
  arrestDate: z.string().min(1, "La date d'arrestation est requise"),
  arrestLocation: z.string().min(2, "Le lieu d'arrestation est requis"),
  status: z.enum(['arrested', 'wanted', 'released', 'deceased']),
  notes: z.string().optional(),
});

type CriminalFormData = z.infer<typeof criminalSchema>;

interface CriminalFormProps {
  criminal?: Criminal;
  isEditing?: boolean;
}

export function CriminalForm({ criminal, isEditing = false }: CriminalFormProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { crimeTypes, addCriminal, updateCriminal } = useCriminals();
  const { upsertCriminal } = useCriminals();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
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
          arrestDate: criminal.arrestDate || criminal.crimeDate || '',
          arrestLocation: criminal.arrestLocation || criminal.crimeLocation || '',
          status: (criminal.status === 'ARRESTED' ? 'arrested' :
                  criminal.status === 'ACTIVE' ? 'wanted' :
                  criminal.status === 'DECEASED' ? 'released' : 'deceased') as CriminalStatus,
          notes: criminal.notes || criminal.description || '',
        }
      : {
          status: 'arrested' as CriminalStatus,
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
      toast.error('Erreur', { description: 'Les types de crimes ne sont pas chargés' });
      return;
    }

    const crimeType = crimeTypes.find(ct => ct.id === data.crimeTypeId);
    if (!crimeType) {
      toast.error('Erreur', { description: 'Type de crime invalide' });
      return;
    }

    // Adapter les données pour le backend
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
      status: data.status === 'arrested' ? 'ARRESTED' : 
              data.status === 'wanted' ? 'ACTIVE' :
              data.status === 'released' ? 'DECEASED' : 'UNKNOWN',
    };

    try {
      let createdId: string | null = null;
      if (isEditing && criminal) {
        await updateCriminal(criminal.id, backendData);
        createdId = criminal.id;
      } else {
        const res = await addCriminal(backendData);
        createdId = res?.data?.id || null;
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
      // Attendre un peu pour que le WebSocket mette à jour la liste avant de naviguer
      setTimeout(() => {
        navigate('/criminals');
      }, 300);
    } catch (error) {
      // L'erreur est déjà gérée dans le contexte
      console.error('Erreur lors de la soumission:', error);
    }
  };

  const statusOptions: { value: CriminalStatus; label: string }[] = [
    { value: 'arrested', label: 'Arrêté' },
    { value: 'wanted', label: 'Recherché' },
    { value: 'released', label: 'Libéré' },
    { value: 'deceased', label: 'Décédé' },
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
            <CardTitle className="text-lg">Identité</CardTitle>
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
                <Label htmlFor="firstName">Prénom *</Label>
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
                <Label htmlFor="nationality">Nationalité</Label>
                <Input id="nationality" {...register('nationality')} placeholder="Sénégalaise" />
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
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
                <SelectContent>
                  {crimeTypes && crimeTypes.length > 0 ? (
                    crimeTypes.map(type => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>Aucun type disponible</SelectItem>
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
                  defaultValue={criminal?.status || 'arrested'}
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
          </CardContent>
        </Card>

        <Card className="glass-card md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Notes additionnelles</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              {...register('notes')}
              placeholder="Informations complémentaires sur le dossier..."
              rows={4}
            />
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-4 mt-6">
        <Button type="button" variant="outline" onClick={() => navigate('/criminals')}>
          Annuler
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isEditing ? 'Mettre à jour' : 'Enregistrer'}
        </Button>
      </div>
    </form>
  );
}
