import { User } from 'lucide-react';
import { useCriminalPhoto } from '@/hooks/useCriminalPhoto';

interface CriminalPhotoProps {
  criminalId: string;
  hasPhoto: boolean;
  version?: string;
  alt: string;
  context?: 'detail';
  className?: string;
}

export function CriminalPhoto({ criminalId, hasPhoto, version, alt, context, className }: CriminalPhotoProps) {
  const { imageUrl, setTarget } = useCriminalPhoto(criminalId, hasPhoto, version, context);
  return (
    <div ref={setTarget} className={`flex items-center justify-center overflow-hidden ${className || ''}`}>
      {imageUrl ? <img src={imageUrl} alt={alt} className="h-full w-full object-cover" /> : <User aria-hidden="true" className="h-10 w-10 text-muted-foreground" />}
    </div>
  );
}
