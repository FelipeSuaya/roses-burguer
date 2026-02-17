import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Plus, Minus, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BurgerCustomizeSheet } from "@/components/pedir/BurgerCustomizeSheet";
import { CheckoutSheet } from "@/components/pedir/CheckoutSheet";

interface StoreItem {
  id: number;
  category: string;
  key: string;
  display_name: string;
  value: string;
  is_active: boolean;
  metadata: { ingredientes?: string } | null;
}

export interface CartItem {
  id: string;
  type: "burger" | "extra";
  name: string;
  size?: string;
  sizeDisplay?: string;
  comboSide?: string | null;
  additions: string[];
  removals: string[];
  quantity: number;
  unitPrice: number;
  observations?: string;
}

export default function Pedir() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [burgerFlavors, setBurgerFlavors] = useState<StoreItem[]>([]);
  const [pricingRules, setPricingRules] = useState<StoreItem[]>([]);
  const [extras, setExtras] = useState<StoreItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedBurger, setSelectedBurger] = useState<StoreItem | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  useEffect(() => {
    fetchStoreData();
  }, []);

  const fetchStoreData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("store_data")
      .select("*")
      .in("category", ["sabor_hamburguesa", "regla_precio", "extra"])
      .eq("is_active", true);

    if (error) {
      toast({ title: "Error", description: "No se pudo cargar el menú", variant: "destructive" });
      setLoading(false);
      return;
    }

    const items = (data || []) as StoreItem[];
    setBurgerFlavors(items.filter((i) => i.category === "sabor_hamburguesa"));
    setPricingRules(items.filter((i) => i.category === "regla_precio"));
    setExtras(items.filter((i) => i.category === "extra"));
    setLoading(false);
  };

  // Separate extras into standalone sides vs upgrade-type (hide upgrades)
  const standaloneSides = useMemo(
    () => extras.filter((e) => !e.key.toLowerCase().includes("upgrade")),
    [extras]
  );

  // Get the minimum burger price for "desde" display
  const minPrice = useMemo(() => {
    const simplePrices = pricingRules
      .filter((r) => r.key.toLowerCase().replace(/_/g, " ").startsWith("hamburguesa simple"))
      .map((r) => parseInt(r.value) || 0)
      .filter((p) => p > 0);
    return simplePrices.length > 0 ? Math.min(...simplePrices) : 0;
  }, [pricingRules]);

  const cartTotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const addToCart = (item: CartItem) => {
    setCart((prev) => [...prev, item]);
  };

  const updateCartItemQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item))
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const addExtraToCart = (extra: StoreItem) => {
    const existing = cart.find((c) => c.type === "extra" && c.name === extra.display_name);
    if (existing) {
      updateCartItemQuantity(existing.id, 1);
    } else {
      addToCart({
        id: crypto.randomUUID(),
        type: "extra",
        name: extra.display_name,
        additions: [],
        removals: [],
        quantity: 1,
        unitPrice: parseInt(extra.value) || 0,
      });
    }
  };

  const getExtraCartQty = (extra: StoreItem) => {
    const item = cart.find((c) => c.type === "extra" && c.name === extra.display_name);
    return item?.quantity || 0;
  };

  const handleOrderSuccess = () => {
    setCart([]);
    setCheckoutOpen(false);
    setOrderSuccess(true);
  };

  if (orderSuccess) {
    return (
      <div className="roses-theme min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="text-center space-y-6 max-w-sm">
          <div className="text-6xl">🎉</div>
          <h1 className="text-3xl font-bold">¡Pedido enviado!</h1>
          <p className="text-muted-foreground text-lg">
            Tu pedido fue recibido. Te vamos a contactar por WhatsApp para coordinar el pago y la entrega.
          </p>
          <Button
            onClick={() => {
              setOrderSuccess(false);
              setCart([]);
            }}
            className="w-full h-14 text-lg font-bold"
          >
            Hacer otro pedido
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="roses-theme min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <img
            src="/lovable-uploads/86ac5a9c-d0bd-40ac-88b0-07fc04f59e14.png"
            alt="Roses Burguer"
            className="w-10 h-10 rounded-full object-cover"
          />
          <div>
            <h1 className="text-lg font-bold tracking-tight">Roses Burguer</h1>
            <p className="text-xs text-muted-foreground">Armá tu pedido 🍔</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pb-32">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <>
            {/* Burgers Section */}
            <section className="py-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Flame className="w-5 h-5 text-primary" />
                Hamburguesas
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {burgerFlavors.map((burger) => {
                  const ingredients = burger.metadata?.ingredientes || "";
                  return (
                    <button
                      key={burger.id}
                      onClick={() => setSelectedBurger(burger)}
                      className="bg-card rounded-xl p-4 text-left border border-border hover:border-primary/50 transition-all active:scale-[0.97]"
                    >
                      <h3 className="font-bold text-sm mb-1">{burger.display_name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                        {ingredients}
                      </p>
                      <span className="text-xs font-semibold text-primary">
                        Desde ${minPrice.toLocaleString("es-AR")}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Extras / Sides Section */}
            {standaloneSides.length > 0 && (
              <section className="py-6 border-t border-border">
                <h2 className="text-xl font-bold mb-4">🍟 Acompañamientos y extras</h2>
                <div className="space-y-2">
                  {standaloneSides.map((extra) => {
                    const qty = getExtraCartQty(extra);
                    const price = parseInt(extra.value) || 0;
                    return (
                      <div
                        key={extra.id}
                        className="bg-card rounded-xl p-4 border border-border flex items-center justify-between"
                      >
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm">{extra.display_name}</h3>
                          <span className="text-sm text-primary font-semibold">
                            ${price.toLocaleString("es-AR")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          {qty > 0 ? (
                            <>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 rounded-full"
                                onClick={() => {
                                  const item = cart.find(
                                    (c) => c.type === "extra" && c.name === extra.display_name
                                  );
                                  if (item) updateCartItemQuantity(item.id, -1);
                                }}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="w-6 text-center font-bold text-sm">{qty}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 rounded-full"
                                onClick={() => addExtraToCart(extra)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-full"
                              onClick={() => addExtraToCart(extra)}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Agregar
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* Floating Cart Bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/95 backdrop-blur border-t border-border">
          <div className="max-w-lg mx-auto">
            <Button
              className="w-full h-14 text-lg font-bold rounded-xl relative"
              onClick={() => setCheckoutOpen(true)}
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              Ver pedido · ${cartTotal.toLocaleString("es-AR")}
              <Badge className="absolute -top-2 -right-1 bg-destructive text-destructive-foreground">
                {cartCount}
              </Badge>
            </Button>
          </div>
        </div>
      )}

      {/* Burger Customizer Sheet */}
      {selectedBurger && (
        <BurgerCustomizeSheet
          burger={selectedBurger}
          pricingRules={pricingRules}
          extras={extras}
          open={!!selectedBurger}
          onOpenChange={(open) => !open && setSelectedBurger(null)}
          onAddToCart={(item) => {
            addToCart(item);
            setSelectedBurger(null);
            toast({ title: "🍔 Agregado", description: `${item.name} al pedido` });
          }}
        />
      )}

      {/* Checkout Sheet */}
      <CheckoutSheet
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        cart={cart}
        cartTotal={cartTotal}
        onUpdateQuantity={updateCartItemQuantity}
        onRemove={removeFromCart}
        onSuccess={handleOrderSuccess}
      />
    </div>
  );
}
