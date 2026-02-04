import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import type { StoreDataItem } from '@/hooks/useStoreData';

interface AdminCardProps {
  item: StoreDataItem;
  onToggleActive: (id: number, isActive: boolean) => Promise<boolean>;
  onUpdateValue: (id: number, value: string) => Promise<boolean>;
}

function formatMetadata(item: StoreDataItem): string | null {
  const meta = item.metadata as Record<string, string> | null;
  if (!meta) return null;
  
  // Para reglas de demora, mostrar día y horario
  if (meta.dia) {
    const dia = meta.dia.charAt(0).toUpperCase() + meta.dia.slice(1);
    const horaInicio = meta.hora_inicio?.slice(0, 5) || '';
    const horaFin = meta.hora_fin?.slice(0, 5) || '';
    const zona = meta.zona || '';
    return `${zona} - ${dia} ${horaInicio}-${horaFin}`;
  }
  
  return null;
}

export function AdminCard({ item, onToggleActive, onUpdateValue }: AdminCardProps) {
  const metadataInfo = formatMetadata(item);
  const [localValue, setLocalValue] = useState(item.value || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const hasChanges = localValue !== (item.value || '');

  const handleToggle = async (checked: boolean) => {
    setIsToggling(true);
    await onToggleActive(item.id, checked);
    setIsToggling(false);
  };

  const handleSave = async () => {
    if (!hasChanges) return;
    setIsSaving(true);
    const success = await onUpdateValue(item.id, localValue);
    if (!success) {
      setLocalValue(item.value || '');
    }
    setIsSaving(false);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3">
          <CardTitle className="text-lg md:text-xl font-bold leading-tight">
            {metadataInfo || item.display_name || item.key}
          </CardTitle>
          {metadataInfo && (
            <p className="text-sm text-muted-foreground">
              Demora: {item.value}
            </p>
          )}
          <div className="flex items-center justify-end gap-2">
            <span className={`text-sm font-medium ${item.is_active ? 'text-green-600' : 'text-muted-foreground'}`}>
              {item.is_active ? 'Activo' : 'Pausado'}
            </span>
            <Switch
              checked={item.is_active ?? false}
              onCheckedChange={handleToggle}
              disabled={isToggling}
              className="scale-125"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Input
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            placeholder="Valor (precio, tiempo, etc.)"
            className="text-base h-12"
          />
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            size="lg"
            className="h-12 px-4 shrink-0"
          >
            <Save className="h-5 w-5" />
            <span className="hidden sm:inline ml-2">Guardar</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
