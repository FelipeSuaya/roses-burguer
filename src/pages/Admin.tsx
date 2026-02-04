import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminCard } from '@/components/admin/AdminCard';
import { AddItemDialog } from '@/components/admin/AddItemDialog';
import { useStoreData } from '@/hooks/useStoreData';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const CATEGORIES = [
  { value: 'sabor_hamburguesa', label: '🍔 Burgers', addLabel: 'Burger' },
  { value: 'extra', label: '🍟 Extras', addLabel: 'Extra' },
  { value: 'regla_precio', label: '💰 Precios', addLabel: 'Precio' },
  { value: 'regla_demora', label: '🕒 Demoras', addLabel: 'Demora' },
  { value: 'promo', label: '🔥 Promos', addLabel: 'Promo' },
] as const;

function CategoryContent({ category, addLabel }: { category: string; addLabel: string }) {
  const { items, loading, updateIsActive, updateValue, deleteItem, refetch } = useStoreData(category);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Skeleton className="h-12 w-40" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AddItemDialog
          category={category}
          categoryLabel={addLabel}
          onItemAdded={refetch}
        />
      </div>
      {items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No hay items en esta categoría
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <AdminCard
              key={item.id}
              item={item}
              onToggleActive={updateIsActive}
              onUpdateValue={updateValue}
              onDelete={deleteItem}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Admin() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            to="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="hidden sm:inline">Volver</span>
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold">Panel de Administración</h1>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="sabor_hamburguesa" className="w-full">
          <TabsList className="w-full h-auto flex-wrap justify-start gap-1 mb-6 bg-muted/50 p-2">
            {CATEGORIES.map((cat) => (
              <TabsTrigger
                key={cat.value}
                value={cat.value}
                className="text-sm md:text-base px-3 py-2 data-[state=active]:bg-background"
              >
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {CATEGORIES.map((cat) => (
            <TabsContent key={cat.value} value={cat.value}>
              <CategoryContent category={cat.value} addLabel={cat.addLabel} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
