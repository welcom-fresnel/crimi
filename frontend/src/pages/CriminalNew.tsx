import { CriminalForm } from '@/components/criminals/CriminalForm';

export default function CriminalNew() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Nouveau dossier criminel</h1>
        <p className="text-muted-foreground">Enregistrez un nouveau criminel dans le système</p>
      </div>
      <CriminalForm />
    </div>
  );
}
