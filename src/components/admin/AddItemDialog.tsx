import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AddItemDialogProps {
  category: string;
  categoryLabel: string;
  onItemAdded: () => void;
}

export function AddItemDialog({ category, categoryLabel, onItemAdded }: AddItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [value, setValue] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [validPayments, setValidPayments] = useState<string[]>([]);

  const isPromo = category === 'promo';
  const paymentOptions = [
    { value: 'efectivo', label: 'Efectivo' },
    { value: 'transferencia', label: 'Transferencia' },
    { value: 'link', label: 'Link de pago' },
  ];

  const handleSubmit = async () => {
    if (!displayName.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre es obligatorio',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    const paymentLabels: Record<string, string> = {
      efectivo: 'Pago en Efectivo',
      transferencia: 'Pago por Transferencia',
      link: 'Pago por Link',
    };

    const metadata = isPromo && validPayments.length === 1
      ? { condicion: paymentLabels[validPayments[0]] }
      : isPromo && validPayments.length > 1
        ? { condicion: validPayments.map(p => paymentLabels[p]).join(' o ') }
        : {};

    const { error } = await supabase.from('store_data').insert({
      category,
      key: displayName.trim().toLowerCase().replace(/\s+/g, '_'),
      display_name: displayName.trim(),
      value: value.trim() || null,
      is_active: isActive,
      metadata,
    });

    if (error) {
      console.error('Error adding item:', error);
      toast({
        title: 'Error',
        description: 'No se pudo agregar el item',
        variant: 'destructive',
      });
    } else {
      toast({
        title: '✅ Agregado',
        description: `${displayName} fue agregado correctamente`,
      });
      setOpen(false);
      setDisplayName('');
      setValue('');
      setIsActive(true);
      setValidPayments([]);
      onItemAdded();
    }

    setIsSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="h-12 gap-2">
          <Plus className="h-5 w-5" />
          <span>Agregar {categoryLabel}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Agregar {categoryLabel}</DialogTitle>
          <DialogDescription>
            Completá los datos del nuevo item para {categoryLabel.toLowerCase()}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="displayName">Nombre *</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ej: Cheeseburger Doble"
              className="h-12 text-base"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="value">Valor (precio, tiempo, etc.)</Label>
            <Input
              id="value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Ej: 15000 o 40-50 min"
              className="h-12 text-base"
            />
          </div>
          {isPromo && (
            <div className="grid gap-2">
              <Label>Válido únicamente en</Label>
              <p className="text-xs text-muted-foreground">Si no seleccionás ninguno, será válido en todos los métodos de pago.</p>
              <div className="flex flex-col gap-2">
                {paymentOptions.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={validPayments.includes(opt.value)}
                      onCheckedChange={(checked) => {
                        setValidPayments(prev =>
                          checked
                            ? [...prev, opt.value]
                            : prev.filter(v => v !== opt.value)
                        );
                      }}
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <Label htmlFor="isActive">Activo / Con stock</Label>
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
              className="scale-125"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={isSaving || !displayName.trim()}
            size="lg"
            className="w-full h-12"
          >
            {isSaving ? 'Guardando...' : 'Agregar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
