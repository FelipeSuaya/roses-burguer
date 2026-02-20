import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Save, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { StoreDataItem } from '@/hooks/useStoreData';

interface AdminCardProps {
  item: StoreDataItem;
  onToggleActive: (id: number, isActive: boolean) => Promise<boolean>;
  onUpdateValue: (id: number, value: string) => Promise<boolean>;
  onDelete: (id: number) => Promise<boolean>;
}

function formatMetadata(item: StoreDataItem): string | null {
  const meta = item.metadata as Record<string, unknown> | null;
  if (!meta) return null;

  if (meta.dia) {
    const dia = (meta.dia as string).charAt(0).toUpperCase() + (meta.dia as string).slice(1);
    const horaInicio = (meta.hora_inicio as string)?.slice(0, 5) || '';
    const horaFin = (meta.hora_fin as string)?.slice(0, 5) || '';
    const zona = (meta.zona as string) || '';
    return `${zona} — ${dia} ${horaInicio}–${horaFin}`;
  }

  return null;
}

function formatValidPayments(item: StoreDataItem): string | null {
  const meta = item.metadata as Record<string, unknown> | null;
  if (!meta) return null;

  if (meta.condicion) return meta.condicion as string;

  if (!meta.valid_payments) return null;
  const payments = meta.valid_payments as string[];
  if (payments.length === 0) return null;
  const labels: Record<string, string> = { efectivo: 'Efectivo', transferencia: 'Transferencia', link: 'Link de pago' };
  return payments.map(p => labels[p] || p).join(', ');
}

export function AdminCard({ item, onToggleActive, onUpdateValue, onDelete }: AdminCardProps) {
  const metadataInfo = formatMetadata(item);
  const validPaymentsInfo = formatValidPayments(item);
  const [localValue, setLocalValue] = useState(item.value || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const hasChanges = localValue !== (item.value || '');

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(item.id);
    setIsDeleting(false);
  };

  const handleToggle = async (checked: boolean) => {
    setIsToggling(true);
    await onToggleActive(item.id, checked);
    setIsToggling(false);
  };

  const handleSave = async () => {
    if (!hasChanges) return;
    setIsSaving(true);
    const success = await onUpdateValue(item.id, localValue);
    if (!success) setLocalValue(item.value || '');
    setIsSaving(false);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base font-semibold leading-tight truncate">
              {metadataInfo || item.display_name || item.key}
            </CardTitle>
            {metadataInfo && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Demora: {item.value}
              </p>
            )}
            {validPaymentsInfo && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Válido en: {validPaymentsInfo}
              </p>
            )}
          </div>

          {/* Status indicator — dot + label + switch */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`w-1.5 h-1.5 rounded-full ${
              item.is_active
                ? 'bg-[hsl(var(--status-active))]'
                : 'bg-[hsl(var(--status-inactive))]'
            }`} />
            <span className="text-xs text-muted-foreground">
              {item.is_active ? 'Activo' : 'Pausado'}
            </span>
            <Switch
              checked={item.is_active ?? false}
              onCheckedChange={handleToggle}
              disabled={isToggling}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex gap-2">
          <Input
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="Valor (precio, tiempo, etc.)"
            className="text-sm h-9"
          />
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            size="sm"
            className="h-9 px-3 shrink-0"
          >
            <Save className="h-4 w-4" />
            <span className="hidden sm:inline ml-1.5">Guardar</span>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3 shrink-0 border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar este item?</AlertDialogTitle>
                <AlertDialogDescription>
                  Vas a eliminar "{item.display_name || item.key}". Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? 'Eliminando...' : 'Eliminar'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
