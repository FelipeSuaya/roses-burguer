import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Trash2, MapPin, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { CartItem } from "@/pages/Pedir";

interface DeliveryZone {
  id: number;
  key: string;
  display_name: string;
  value: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: CartItem[];
  cartTotal: number;
  deliveryZones: DeliveryZone[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onSuccess: () => void;
}

export function CheckoutSheet({ open, onOpenChange, cart, cartTotal, deliveryZones, onUpdateQuantity, onRemove, onSuccess }: Props) {
  const { toast } = useToast();
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [isPickup, setIsPickup] = useState(false);
  const [selectedZone, setSelectedZone] = useState<string>("");
  const [direccion, setDireccion] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const shippingCost = !isPickup && selectedZone
    ? parseInt(deliveryZones.find(z => z.key === selectedZone)?.value || "0") || 0
    : 0;
  const grandTotal = cartTotal + shippingCost;

  const handleSubmit = async () => {
    if (!nombre.trim()) {
      toast({ title: "Falta tu nombre", variant: "destructive" });
      return;
    }
    if (!telefono.trim()) {
      toast({ title: "Falta tu teléfono", variant: "destructive" });
      return;
    }
    if (!isPickup && !selectedZone) {
      toast({ title: "Seleccioná la zona de envío", variant: "destructive" });
      return;
    }
    if (!isPickup && !direccion.trim()) {
      toast({ title: "Falta la dirección de envío", variant: "destructive" });
      return;
    }
    if (cart.length === 0) return;

    setSubmitting(true);

    // Build payload matching receive-order expectations
    const burgerItems = cart
      .filter((c) => c.type === "burger")
      .map((c) => ({
        quantity: c.quantity,
        burger_type: c.name,
        patty_size: c.size || "simple",
        combo: !!c.comboSide,
        price: c.unitPrice * c.quantity,
        additions: c.additions.length > 0 ? c.additions : undefined,
        removals: c.removals.length > 0 ? c.removals : undefined,
        observations: c.observations || undefined,
      }));

    const extraItems = cart
      .filter((c) => c.type === "extra")
      .map((c) => ({
        name: c.name,
        quantity: c.quantity,
        price: c.unitPrice * c.quantity,
      }));

    const zoneName = deliveryZones.find(z => z.key === selectedZone)?.display_name || "";
    const payload = {
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      items: burgerItems,
      extras: extraItems.length > 0 ? extraItems : undefined,
      monto: grandTotal,
      direccion_envio: isPickup ? "Retira en local" : `${direccion.trim()} (${zoneName})`,
      metodo_pago: "pendiente",
    };

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/receive-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseKey}`,
          apikey: supabaseKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Error al enviar el pedido");
      }

      toast({ title: "✅ ¡Pedido enviado!", description: "Te contactamos por WhatsApp" });
      setNombre("");
      setTelefono("");
      setDireccion("");
      setSelectedZone("");
      setIsPickup(false);
      onSuccess();
    } catch (error) {
      console.error("Order submission error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo enviar el pedido",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="roses-theme h-[90vh] rounded-t-2xl overflow-y-auto px-4 pb-6 text-foreground">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-2xl font-bold text-left text-foreground">Tu pedido</SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {/* Cart Items */}
          {cart.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Tu carrito está vacío</p>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="bg-card rounded-xl p-3 border border-border"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm">
                        {item.quantity}x {item.name}
                      </h4>
                      {item.sizeDisplay && (
                        <p className="text-xs text-muted-foreground capitalize">{item.sizeDisplay}</p>
                      )}
                      {item.additions.length > 0 && (
                        <p className="text-xs text-primary mt-0.5">+ {item.additions.join(", ")}</p>
                      )}
                      {item.removals.length > 0 && (
                        <p className="text-xs text-destructive mt-0.5">- {item.removals.join(", ")}</p>
                      )}
                      {item.observations && (
                        <p className="text-xs text-muted-foreground italic mt-0.5">"{item.observations}"</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <span className="font-bold text-sm whitespace-nowrap">
                        ${(item.unitPrice * item.quantity).toLocaleString("es-AR")}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => onRemove(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex justify-between items-center pt-3 border-t border-border">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="text-sm font-semibold">
                  ${cartTotal.toLocaleString("es-AR")}
                </span>
              </div>
              {shippingCost > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Envío ({deliveryZones.find(z => z.key === selectedZone)?.display_name})</span>
                  <span className="text-sm font-semibold">
                    ${shippingCost.toLocaleString("es-AR")}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold">Total</span>
                <span className="text-lg font-bold text-primary">
                  ${grandTotal.toLocaleString("es-AR")}
                </span>
              </div>
            </div>
          )}

          {/* Customer Info */}
          {cart.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-border">
              <h3 className="font-bold text-lg text-foreground">Tus datos</h3>

              <div className="space-y-2">
                <Label htmlFor="checkout-nombre">Nombre *</Label>
                <Input
                  id="checkout-nombre"
                  placeholder="Tu nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="h-12 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="checkout-telefono">Teléfono (WhatsApp) *</Label>
                <Input
                  id="checkout-telefono"
                  placeholder="Ej: 3415551234"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  type="tel"
                  className="h-12 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label>Entrega</Label>
                <div className="flex items-center gap-3 py-2">
                  <Switch
                    checked={isPickup}
                    onCheckedChange={(checked) => {
                      setIsPickup(checked);
                      if (checked) {
                        setDireccion("");
                        setSelectedZone("");
                      }
                    }}
                  />
                  <span className="text-sm flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    {isPickup ? "Retiro en local" : "Envío a domicilio"}
                  </span>
                </div>
              </div>

              {!isPickup && (
                <div className="space-y-3">
                  <Label>Zona de envío *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {deliveryZones.map((zone) => {
                      const cost = parseInt(zone.value) || 0;
                      return (
                        <button
                          key={zone.key}
                          onClick={() => setSelectedZone(zone.key)}
                          className={`p-3 rounded-xl border-2 text-center transition-all text-foreground ${
                            selectedZone === zone.key
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/30"
                          }`}
                        >
                          <span className="font-bold text-sm block">{zone.display_name}</span>
                          <span className="text-xs text-primary font-semibold">+${cost.toLocaleString("es-AR")}</span>
                        </button>
                      );
                    })}
                  </div>

                  <Label htmlFor="checkout-direccion">Dirección *</Label>
                  <Input
                    id="checkout-direccion"
                    placeholder="Calle, número, barrio"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    className="h-12 text-base"
                  />
                </div>
              )}

              <Button
                className="w-full h-14 text-lg font-bold rounded-xl mt-4"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  `Confirmar pedido · $${grandTotal.toLocaleString("es-AR")}`
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Te contactaremos por WhatsApp para coordinar el pago
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
