import { useParams, useNavigate } from 'react-router-dom';
import { useCriminals } from '@/contexts/CriminalsContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/criminals/StatusBadge';
import { ArrowLeft, Pencil, User, Calendar, MapPin, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function CriminalDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { criminals } = useCriminals();

  const criminal = criminals.find(c => c.id === id);

  if (!criminal) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Dossier non trouvé</p>
        <Button variant="link" onClick={() => navigate('/criminals')}>
          Retour à la liste
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/criminals')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">
            {criminal.lastName} {criminal.firstName}
          </h1>
          <p className="text-muted-foreground">{criminal.caseNumber || criminal.fileNumber}</p>
        </div>
        <StatusBadge status={criminal.status} />
        <Button onClick={() => navigate(`/criminals/${id}/edit`)}>
          <Pencil className="h-4 w-4 mr-2" />
          Modifier
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="aspect-square rounded-lg bg-muted flex items-center justify-center mb-4">
                {criminal.photoUrl ? (
                  <img
                    src={criminal.photoUrl}
                    alt={`${criminal.firstName} ${criminal.lastName}`}
                    className="h-full w-full object-cover rounded-lg"
                  />
                ) : (
                  <User className="h-20 w-20 text-muted-foreground" />
                )}
              </div>
              <div className="text-center">
                <h2 className="text-xl font-semibold">
                  {criminal.lastName} {criminal.firstName}
                </h2>
                <p className="text-sm text-muted-foreground">{criminal.nationality || 'Nationalité inconnue'}</p>
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
                  <dd className="font-medium">
                    {(criminal.birthDate || criminal.dateOfBirth)
                      ? format(new Date(criminal.birthDate || criminal.dateOfBirth!), 'd MMMM yyyy', { locale: fr })
                      : 'Non renseignée'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Nationalité</dt>
                  <dd className="font-medium">{criminal.nationality || 'Non renseignée'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">N° Dossier</dt>
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
                  <dd className="font-medium">{criminal.crimeType.name}</dd>
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
                      {(criminal.arrestDate || criminal.crimeDate)
                      ? format(new Date(criminal.arrestDate || criminal.crimeDate!), 'd MMMM yyyy', { locale: fr })
                      : 'Non renseignée'}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <dt className="text-sm text-muted-foreground">Lieu d'arrestation</dt>
                    <dd className="font-medium">{criminal.arrestLocation || criminal.crimeLocation || 'Non renseigné'}</dd>
                  </div>
                </div>
              </dl>
            </CardContent>
          </Card>

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

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Métadonnées</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-muted-foreground">Créé le</dt>
                  <dd className="font-medium">
                    {format(new Date(criminal.createdAt), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                  </dd>
                </div>
                {criminal.updatedAt && (
                  <div>
                    <dt className="text-sm text-muted-foreground">Dernière modification</dt>
                    <dd className="font-medium">
                      {format(new Date(criminal.updatedAt), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
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
