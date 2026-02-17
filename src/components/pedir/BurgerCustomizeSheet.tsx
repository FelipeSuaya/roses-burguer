import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Minus, X } from "lucide-react";
import type { CartItem } from "@/pages/Pedir";

interface StoreItem {
  id: number;
  category: string;
  key: string;
  display_name: string;
  value: string;
  is_active: boolean;
  metadata: { ingredientes?: string } | null;
}

interface Props {
  burger: StoreItem;
  pricingRules: StoreItem[];
  extras: StoreItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToCart: (item: CartItem) => void;
}

type Size = "simple" | "doble" | "triple";

interface ComboOption {
  key: string;
  label: string;
}

export function BurgerCustomizeSheet({ burger, pricingRules, extras, open, onOpenChange, onAddToCart }: Props) {
  const [size, setSize] = useState<Size>("simple");
  const [isCombo, setIsCombo] = useState(false);
  const [comboSide, setComboSide] = useState<string | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [removals, setRemovals] = useState<string[]>([]);
  const [observations, setObservations] = useState("");
  const [quantity, setQuantity] = useState(1);

  const ingredients = useMemo(() => {
    if (!burger.metadata?.ingredientes) return [];
    return burger.metadata.ingredientes
      .split(",")
      .map((i) => i.trim())
      .filter(Boolean);
  }, [burger]);

  // Extract available combo sides from pricing rules
  const comboOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: ComboOption[] = [];
    pricingRules.forEach((r) => {
      const normalized = r.key.toLowerCase().replace(/_/g, " ");
      const match = normalized.match(/en combo con (.+)/);
      if (match) {
        const side = match[1];
        if (!seen.has(side)) {
          seen.add(side);
          // Find a nice display name
          const label = side
            .split(" ")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");
          options.push({ key: side, label });
        }
      }
    });
    return options;
  }, [pricingRules]);

  // Addon extras (cheap toppings, not upgrades, not standalone sides)
  const addonExtras = useMemo(
    () =>
      extras.filter((e) => {
        const k = e.key.toLowerCase();
        return !k.includes("upgrade") && (parseInt(e.value) || 0) <= 3000;
      }),
    [extras]
  );

  // Find price based on current selection
  const findPrice = (): number => {
    let targetKey: string;
    if (isCombo && comboSide) {
      targetKey = `hamburguesa ${size} en combo con ${comboSide}`;
    } else {
      targetKey = `hamburguesa ${size}`;
    }

    const rule = pricingRules.find(
      (r) => r.key.toLowerCase().replace(/_/g, " ") === targetKey.toLowerCase()
    );
    let price = rule ? parseInt(rule.value) || 0 : 0;

    // Add addon prices
    selectedAddons.forEach((addonKey) => {
      const addon = extras.find((e) => e.key === addonKey);
      if (addon) price += parseInt(addon.value) || 0;
    });

    return price;
  };

  const unitPrice = findPrice();
  const totalPrice = unitPrice * quantity;

  const sizeDisplay = useMemo(() => {
    if (isCombo && comboSide) {
      const opt = comboOptions.find((o) => o.key === comboSide);
      return `${size} combo ${opt?.label || comboSide}`;
    }
    return size;
  }, [size, isCombo, comboSide, comboOptions]);

  const handleAdd = () => {
    if (isCombo && !comboSide) return;

    onAddToCart({
      id: crypto.randomUUID(),
      type: "burger",
      name: burger.display_name,
      size,
      sizeDisplay,
      comboSide: isCombo ? comboSide : null,
      additions: selectedAddons,
      removals,
      quantity,
      unitPrice,
      observations: observations.trim() || undefined,
    });

    // Reset
    setSize("simple");
    setIsCombo(false);
    setComboSide(null);
    setSelectedAddons([]);
    setRemovals([]);
    setObservations("");
    setQuantity(1);
  };

  const toggleAddon = (key: string) => {
    setSelectedAddons((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleRemoval = (ingredient: string) => {
    setRemovals((prev) =>
      prev.includes(ingredient) ? prev.filter((r) => r !== ingredient) : [...prev, ingredient]
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="roses-theme h-[85vh] rounded-t-2xl overflow-y-auto px-4 pb-6">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-2xl font-bold text-left">{burger.display_name}</SheetTitle>
          {ingredients.length > 0 && (
            <p className="text-sm text-muted-foreground text-left">{ingredients.join(", ")}</p>
          )}
        </SheetHeader>

        <div className="space-y-6">
          {/* Size Selector */}
          <div>
            <h3 className="font-semibold mb-3">Tamaño del medallón</h3>
            <div className="grid grid-cols-3 gap-2">
              {(["simple", "doble", "triple"] as Size[]).map((s) => {
                const rule = pricingRules.find(
                  (r) => r.key.toLowerCase().replace(/_/g, " ") === `hamburguesa ${s}`
                );
                const price = rule ? parseInt(rule.value) || 0 : 0;
                return (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={`p-3 rounded-xl border-2 text-center transition-all text-foreground ${
                      size === s
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <span className="block font-bold text-sm capitalize">{s}</span>
                    <span className="block text-xs text-muted-foreground mt-1">
                      ${price.toLocaleString("es-AR")}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Combo Toggle */}
          <div>
            <h3 className="font-semibold mb-3">¿Hacerlo combo?</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setIsCombo(false);
                  setComboSide(null);
                }}
                className={`p-3 rounded-xl border-2 text-center transition-all text-foreground ${
                  !isCombo ? "border-primary bg-primary/10" : "border-border"
                }`}
              >
                <span className="block font-bold text-sm">Solo</span>
                <span className="block text-xs text-muted-foreground">Sin acompañamiento</span>
              </button>
              <button
                onClick={() => setIsCombo(true)}
                className={`p-3 rounded-xl border-2 text-center transition-all text-foreground ${
                  isCombo ? "border-primary bg-primary/10" : "border-border"
                }`}
              >
                <span className="block font-bold text-sm">Combo 🍟</span>
                <span className="block text-xs text-muted-foreground">Con acompañamiento</span>
              </button>
            </div>
          </div>

          {/* Combo Side Selector */}
          {isCombo && (
            <div>
              <h3 className="font-semibold mb-3">Elegí tu acompañamiento</h3>
              <div className="space-y-2">
                {comboOptions.map((opt) => {
                  const rule = pricingRules.find(
                    (r) =>
                      r.key.toLowerCase().replace(/_/g, " ") ===
                      `hamburguesa ${size} en combo con ${opt.key}`
                  );
                  const comboPrice = rule ? parseInt(rule.value) || 0 : 0;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setComboSide(opt.key)}
                      className={`w-full p-3 rounded-xl border-2 text-left flex justify-between items-center transition-all text-foreground ${
                        comboSide === opt.key
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/30"
                      }`}
                    >
                      <span className="font-medium text-sm">{opt.label}</span>
                      <span className="text-sm text-primary font-semibold">
                        ${comboPrice.toLocaleString("es-AR")}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Addon Extras */}
          {addonExtras.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Extras para tu hamburguesa</h3>
              <div className="flex flex-wrap gap-2">
                {addonExtras.map((extra) => {
                  const selected = selectedAddons.includes(extra.key);
                  const price = parseInt(extra.value) || 0;
                  return (
                    <Badge
                      key={extra.id}
                      variant={selected ? "default" : "outline"}
                      className="cursor-pointer py-2 px-3 text-sm"
                      onClick={() => toggleAddon(extra.key)}
                    >
                      {selected && <X className="w-3 h-3 mr-1" />}
                      {extra.display_name} +${price.toLocaleString("es-AR")}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          {/* Remove Ingredients */}
          {ingredients.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Quitar ingredientes</h3>
              <div className="flex flex-wrap gap-2">
                {ingredients.map((ing, i) => {
                  const removed = removals.includes(ing);
                  return (
                    <Badge
                      key={i}
                      variant={removed ? "destructive" : "outline"}
                      className="cursor-pointer py-2 px-3 text-sm"
                      onClick={() => toggleRemoval(ing)}
                    >
                      {removed && <X className="w-3 h-3 mr-1" />}
                      {ing}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          {/* Observations */}
          <div>
            <h3 className="font-semibold mb-2">Observaciones</h3>
            <Textarea
              placeholder="Ej: bien cocida, sin sal, etc."
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              className="resize-none"
              rows={2}
            />
          </div>

          {/* Quantity */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Cantidad</h3>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-xl font-bold w-8 text-center">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Add to Cart Button */}
          <Button
            className="w-full h-14 text-lg font-bold rounded-xl"
            onClick={handleAdd}
            disabled={isCombo && !comboSide}
          >
            Agregar · ${totalPrice.toLocaleString("es-AR")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
