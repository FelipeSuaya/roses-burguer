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

export function AdminCard({ item, onToggleActive, onUpdateValue }: AdminCardProps) {
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
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-lg md:text-xl font-bold truncate">
            {item.display_name || item.key}
          </CardTitle>
          <div className="flex items-center gap-2 shrink-0">
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
