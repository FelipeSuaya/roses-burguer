import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Printer, ChevronDown, MapPin } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface StoreDataItem {
    id: number;
    category: string;
    key: string;
    display_name: string;
    value: string;
    is_active: boolean;
    metadata: { ingredientes?: string } | null;
}

interface OrderItemDraft {
    burger_type: string;
    patty_size: string;
    combo: boolean;
    quantity: number;
    price: number;
    additions: string[];
    removals: string[];
}


interface ManualOrderDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onOrderCreated?: () => void;
}

export function ManualOrderDialog({ open, onOpenChange, onOrderCreated }: ManualOrderDialogProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Store data
    const [burgerFlavors, setBurgerFlavors] = useState<StoreDataItem[]>([]);
    const [pricingRules, setPricingRules] = useState<StoreDataItem[]>([]);
    const [extras, setExtras] = useState<StoreDataItem[]>([]);
    const [promos, setPromos] = useState<StoreDataItem[]>([]);

    // Form state
    const [customerName, setCustomerName] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("+549");
    const [isPickup, setIsPickup] = useState(false);
    const [deliveryAddress, setDeliveryAddress] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("efectivo");

    // Current item being added
    const [selectedFlavor, setSelectedFlavor] = useState("");
    const [selectedPricing, setSelectedPricing] = useState("");
    const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
    const [selectedRemovals, setSelectedRemovals] = useState<string[]>([]);
    const [currentQuantity, setCurrentQuantity] = useState(1);

    // Order items
    const [orderItems, setOrderItems] = useState<OrderItemDraft[]>([]);

    // UI state
    const [extrasOpen, setExtrasOpen] = useState(false);
    const [removalsOpen, setRemovalsOpen] = useState(false);

    // Get ingredients for selected burger
    const getAvailableIngredients = (): string[] => {
        if (!selectedFlavor) return [];
        const burger = burgerFlavors.find(b => b.key === selectedFlavor);
        if (!burger?.metadata?.ingredientes) return [];

        // Parse ingredients string and clean up
        return burger.metadata.ingredientes
            .split(',')
            .map(ing => ing.trim())
            .filter(Boolean);
    };

    // Fetch store data on mount
    useEffect(() => {
        if (open) {
            fetchStoreData();
        }
    }, [open]);

    // Clear removals when flavor changes
    useEffect(() => {
        setSelectedRemovals([]);
    }, [selectedFlavor]);

    const fetchStoreData = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("store_data")
                .select("*")
                .in("category", ["sabor_hamburguesa", "regla_precio", "extra", "promo"])
                .eq("is_active", true);

            if (error) throw error;

            const items = data as StoreDataItem[];
            setBurgerFlavors(items.filter((i) => i.category === "sabor_hamburguesa"));
            setPricingRules(items.filter((i) => i.category === "regla_precio"));
            setExtras(items.filter((i) => i.category === "extra"));
            setPromos(items.filter((i) => i.category === "promo"));
        } catch (error) {
            console.error("Error fetching store data:", error);
            toast({
                title: "Error",
                description: "No se pudieron cargar los productos",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const getItemPrice = (): number => {
        const pricingItem = pricingRules.find((p) => p.key === selectedPricing);
        let basePrice = pricingItem ? parseInt(pricingItem.value) || 0 : 0;

        // Add extras prices
        selectedExtras.forEach((extraKey) => {
            const extra = extras.find((e) => e.key === extraKey);
            if (extra) {
                basePrice += parseInt(extra.value) || 0;
            }
        });

        return basePrice;
    };

    const addItemToOrder = () => {
        // For extras-only items, we don't need a burger flavor/pricing
        const hasExtras = selectedExtras.length > 0;
        const hasBurger = selectedFlavor && selectedPricing;

        if (!hasBurger && !hasExtras) {
            toast({
                title: "Error",
                description: "Seleccioná un sabor y tipo de hamburguesa, o al menos un extra",
                variant: "destructive",
            });
            return;
        }

        const pricingItem = hasBurger ? pricingRules.find((p) => p.key === selectedPricing) : null;
        const isCombo = pricingItem?.key.toLowerCase().includes("combo") || false;

        const newItem: OrderItemDraft = {
            burger_type: hasBurger ? selectedFlavor : "Extras",
            patty_size: pricingItem?.display_name || (hasBurger ? selectedPricing : ""),
            combo: isCombo,
            quantity: currentQuantity,
            price: getItemPrice() * currentQuantity,
            additions: selectedExtras,
            removals: selectedRemovals,
        };

        setOrderItems([...orderItems, newItem]);

        // Reset current item form
        setSelectedFlavor("");
        setSelectedPricing("");
        setSelectedExtras([]);
        setSelectedRemovals([]);
        setCurrentQuantity(1);

        toast({
            title: "Item agregado",
            description: `${currentQuantity}x ${selectedFlavor}`,
        });
    };

    const removeItemFromOrder = (index: number) => {
        setOrderItems(orderItems.filter((_, i) => i !== index));
    };

    const toggleExtra = (extraKey: string) => {
        if (selectedExtras.includes(extraKey)) {
            setSelectedExtras(selectedExtras.filter((e) => e !== extraKey));
        } else {
            setSelectedExtras([...selectedExtras, extraKey]);
        }
    };

    const toggleRemoval = (ingredient: string) => {
        if (selectedRemovals.includes(ingredient)) {
            setSelectedRemovals(selectedRemovals.filter((r) => r !== ingredient));
        } else {
            setSelectedRemovals([...selectedRemovals, ingredient]);
        }
    };


    const getTotalPrice = (): number => {
        return orderItems.reduce((sum, item) => sum + item.price, 0);
    };

    // Helper function to detect if order is pickup
    const isPickupOrder = (direccion: string | undefined): boolean => {
        if (!direccion) return false;
        const lower = direccion.toLowerCase();
        return lower.includes('retira') || lower.includes('retiro') || lower.includes('local');
    };

    const generateTicketAndSendToPrinter = async (order: {
        order_number: number;
        nombre: string;
        telefono?: string;
        monto: number;
        metodo_pago: string;
        items: any[];
        direccion_envio?: string;
    }) => {
        const ESC = 0x1b;
        const GS = 0x1d;
        const LF = 0x0a;
        const CENTER = [ESC, 0x61, 0x01];
        const BOLD_ON = [ESC, 0x45, 0x01];
        const BOLD_OFF = [ESC, 0x45, 0x00];
        const DOUBLE_SIZE = [ESC, 0x21, 0x30];
        const MEDIUM_SIZE = [ESC, 0x21, 0x10];
        const CUT = [GS, 0x56, 0x00];

        const addBytes = (bytes: number[], ...b: number[]) => bytes.push(...b);
        const addText = (bytes: number[], text: string) => {
            const encoder = new TextEncoder();
            addBytes(bytes, ...Array.from(encoder.encode(text)));
        };
        const addLine = (bytes: number[]) => {
            addText(bytes, "================================");
            addBytes(bytes, LF);
        };
        const newLine = (bytes: number[]) => addBytes(bytes, LF);

        // Generate KITCHEN ticket
        const kitchenBytes: number[] = [];
        addBytes(kitchenBytes, ...CENTER);
        addBytes(kitchenBytes, ...DOUBLE_SIZE, ...BOLD_ON);
        addText(kitchenBytes, "COCINA");
        addBytes(kitchenBytes, ...BOLD_OFF, LF);

        // Delivery/Pickup indicator
        addBytes(kitchenBytes, ...DOUBLE_SIZE, ...BOLD_ON);
        if (isPickupOrder(order.direccion_envio)) {
            addText(kitchenBytes, "RETIRA EN LOCAL");
        } else {
            addText(kitchenBytes, "ENVIO");
        }
        addBytes(kitchenBytes, ...BOLD_OFF, LF);

        addLine(kitchenBytes);
        addBytes(kitchenBytes, ...BOLD_ON);
        addText(kitchenBytes, `PEDIDO #${order.order_number}`);
        addBytes(kitchenBytes, ...BOLD_OFF, LF, ...MEDIUM_SIZE);
        addLine(kitchenBytes);
        newLine(kitchenBytes);

        order.items.forEach((item) => {
            let itemDesc = `${item.quantity}x ${item.burger_type} ${item.patty_size}`;
            if (item.combo) {
                itemDesc += " (combo)";
            }
            newLine(kitchenBytes);
            addText(kitchenBytes, itemDesc);
            newLine(kitchenBytes);

            if (item.additions && item.additions.length > 0) {
                addText(kitchenBytes, `+ ${item.additions.join(", ")}`);
                newLine(kitchenBytes);
            }
            if (item.removals && item.removals.length > 0) {
                addText(kitchenBytes, `- ${item.removals.join(", ")}`);
                newLine(kitchenBytes);
            }
        });

        addBytes(kitchenBytes, LF, LF, LF, LF, LF);
        addBytes(kitchenBytes, ...CUT);

        // Generate CASHIER ticket
        const cashierBytes: number[] = [];
        addBytes(cashierBytes, ...CENTER);
        addBytes(cashierBytes, ...DOUBLE_SIZE, ...BOLD_ON);
        addText(cashierBytes, "CAJA");
        addBytes(cashierBytes, ...BOLD_OFF, LF);
        addLine(cashierBytes);
        addBytes(cashierBytes, ...BOLD_ON);
        addText(cashierBytes, `PEDIDO #${order.order_number}`);
        addBytes(cashierBytes, ...BOLD_OFF, LF, ...MEDIUM_SIZE);
        addLine(cashierBytes);
        newLine(cashierBytes);
        addText(cashierBytes, `Cliente: ${order.nombre}`);
        newLine(cashierBytes);
        if (order.telefono) {
            addText(cashierBytes, `Teléfono: ${order.telefono}`);
            newLine(cashierBytes);
        }
        if (order.direccion_envio) {
            newLine(cashierBytes);
            addText(cashierBytes, `Entrega:`);
            newLine(cashierBytes);
            addText(cashierBytes, `${order.direccion_envio}`);
            newLine(cashierBytes);
        }
        newLine(cashierBytes);
        addLine(cashierBytes);
        newLine(cashierBytes);

        order.items.forEach((item) => {
            let itemDesc = `${item.quantity}x ${item.burger_type} ${item.patty_size}`;
            if (item.combo) {
                itemDesc += " (combo)";
            }
            newLine(cashierBytes);
            addText(cashierBytes, itemDesc);
            newLine(cashierBytes);

            if (item.additions && item.additions.length > 0) {
                addText(cashierBytes, `+ ${item.additions.join(", ")}`);
                newLine(cashierBytes);
            }
            if (item.removals && item.removals.length > 0) {
                addText(cashierBytes, `- ${item.removals.join(", ")}`);
                newLine(cashierBytes);
            }
        });

        addLine(cashierBytes);
        newLine(cashierBytes);
        addBytes(cashierBytes, ...BOLD_ON);
        addText(cashierBytes, `TOTAL: $${parseFloat(order.monto.toString()).toLocaleString("es-AR")}`);
        addBytes(cashierBytes, ...BOLD_OFF, LF);
        newLine(cashierBytes);
        addText(cashierBytes, `Pago: ${order.metodo_pago}`);
        newLine(cashierBytes);

        addBytes(cashierBytes, LF, LF, LF, LF, LF);
        addBytes(cashierBytes, ...CUT);

        // Convert to base64
        const kitchenTicketBase64 = btoa(String.fromCharCode(...new Uint8Array(kitchenBytes)));
        const cashierTicketBase64 = btoa(String.fromCharCode(...new Uint8Array(cashierBytes)));

        const kitchenWebhookUrl = "https://n8nwebhookx.botec.tech/webhook/crearFacturaCocina";
        const cashierWebhookUrl = "https://n8nwebhookx.botec.tech/webhook/crearFacturaCaja";

        // Send both webhooks in parallel
        const [kitchenResponse, cashierResponse] = await Promise.all([
            fetch(kitchenWebhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    order_number: order.order_number,
                    ticket: kitchenTicketBase64,
                    nombre: order.nombre,
                    telefono: order.telefono,
                    items: order.items,
                }),
            }),
            fetch(cashierWebhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    order_number: order.order_number,
                    ticket: cashierTicketBase64,
                    nombre: order.nombre,
                    telefono: order.telefono,
                    monto: order.monto,
                    metodo_pago: order.metodo_pago,
                    items: order.items,
                    direccion_envio: order.direccion_envio,
                }),
            }),
        ]);

        if (!kitchenResponse.ok) {
            console.error("Error al enviar a impresora cocina:", kitchenResponse.status);
        }
        if (!cashierResponse.ok) {
            console.error("Error al enviar a impresora caja:", cashierResponse.status);
        }
    };

    const handleSubmit = async () => {
        if (!customerName.trim()) {
            toast({
                title: "Error",
                description: "Ingresá el nombre del cliente",
                variant: "destructive",
            });
            return;
        }

        if (orderItems.length === 0) {
            toast({
                title: "Error",
                description: "Agregá al menos un item al pedido",
                variant: "destructive",
            });
            return;
        }

        setSubmitting(true);
        try {
            // Get next order number
            const { data: orderNumber, error: orderNumberError } = await supabase.rpc(
                "get_daily_order_number"
            );

            if (orderNumberError) throw orderNumberError;

            // Prepare items for database
            const dbItems = orderItems.map((item) => ({
                quantity: item.quantity,
                burger_type: item.burger_type,
                patty_size: item.patty_size,
                combo: item.combo,
                additions: item.additions.length > 0 ? item.additions : null,
                removals: item.removals.length > 0 ? item.removals : null,
            }));

            const itemStatus = orderItems.map((item) => ({
                burger_type: item.burger_type,
                quantity: item.quantity,
                patty_size: item.patty_size,
                combo: item.combo,
                completed: false,
            }));

            const totalMonto = getTotalPrice();
            const finalAddress = isPickup ? "Retira en local" : (deliveryAddress.trim() || null);
            // Insert order
            const { data: newOrder, error: insertError } = await supabase
                .from("orders")
                .insert({
                    nombre: customerName.trim(),
                    telefono: phoneNumber.trim() || null,
                    monto: totalMonto,
                    status: "pending",
                    items: dbItems,
                    item_status: itemStatus,
                    direccion_envio: finalAddress,
                    metodo_pago: paymentMethod,
                    order_number: orderNumber,
                    fecha: new Date().toISOString(),
                })
                .select()
                .single();

            if (insertError) throw insertError;

            // Send to printer
            await generateTicketAndSendToPrinter({
                order_number: orderNumber,
                nombre: customerName.trim(),
                telefono: phoneNumber.trim(),
                monto: totalMonto,
                metodo_pago: paymentMethod,
                items: dbItems,
                direccion_envio: finalAddress || undefined,
            });

            toast({
                title: "¡Pedido creado!",
                description: `Pedido #${orderNumber} enviado a impresora`,
            });

            // Reset form
            setCustomerName("");
            setPhoneNumber("+549");
            setIsPickup(false);
            setDeliveryAddress("");
            setPaymentMethod("efectivo");
            setOrderItems([]);
            setSelectedFlavor("");
            setSelectedPricing("");
            setSelectedExtras([]);
            setSelectedRemovals([]);
            setCurrentQuantity(1);

            onOrderCreated?.();
            onOpenChange(false);
        } catch (error) {
            console.error("Error creating order:", error);
            toast({
                title: "Error",
                description: "No se pudo crear el pedido",
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                <DialogHeader className="flex-shrink-0">
                    <DialogTitle className="text-2xl">Nuevo Pedido Manual</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto pr-2" style={{ maxHeight: 'calc(85vh - 140px)' }}>
                    <div className="space-y-6">
                        {/* Customer Info */}
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="customerName">Nombre del Cliente *</Label>
                                    <Input
                                        id="customerName"
                                        placeholder="Ej: Juan Pérez"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phoneNumber">Teléfono *</Label>
                                    <Input
                                        id="phoneNumber"
                                        placeholder="+549..."
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="paymentMethod">Método de Pago</Label>
                                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="efectivo">Efectivo</SelectItem>
                                            <SelectItem value="transferencia">Transferencia</SelectItem>
                                            <SelectItem value="tarjeta">Tarjeta</SelectItem>
                                            <SelectItem value="mercadopago">MercadoPago</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Tipo de Entrega</Label>
                                    <div className="flex items-center gap-3 h-10">
                                        <Switch
                                            checked={isPickup}
                                            onCheckedChange={(checked) => {
                                                setIsPickup(checked);
                                                if (checked) setDeliveryAddress("");
                                            }}
                                        />
                                        <span className="text-sm flex items-center gap-1.5">
                                            <MapPin className="w-4 h-4" />
                                            {isPickup ? "Retira en local" : "Envío a domicilio"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            {!isPickup && (
                                <div className="space-y-2">
                                    <Label htmlFor="deliveryAddress">Dirección de Envío</Label>
                                    <Input
                                        id="deliveryAddress"
                                        placeholder="Ej: Av. Corrientes 1234, CABA"
                                        value={deliveryAddress}
                                        onChange={(e) => setDeliveryAddress(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Add Item Section */}
                        <div className="border rounded-lg p-4 bg-muted/50">
                            <h3 className="font-semibold mb-4">Agregar Item</h3>

                            {loading ? (
                                <p className="text-muted-foreground">Cargando productos...</p>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Sabor de Hamburguesa *</Label>
                                            <Select value={selectedFlavor} onValueChange={setSelectedFlavor}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccionar sabor" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {burgerFlavors.map((flavor) => (
                                                        <SelectItem key={flavor.id} value={flavor.key}>
                                                            {flavor.display_name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Tipo / Tamaño *</Label>
                                            <Select value={selectedPricing} onValueChange={setSelectedPricing}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccionar tipo" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {pricingRules.map((rule) => (
                                                        <SelectItem key={rule.id} value={rule.key}>
                                                            {rule.display_name} - ${parseInt(rule.value).toLocaleString("es-AR")}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Cantidad</Label>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setCurrentQuantity(Math.max(1, currentQuantity - 1))}
                                            >
                                                -
                                            </Button>
                                            <span className="w-8 text-center font-semibold">{currentQuantity}</span>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setCurrentQuantity(currentQuantity + 1)}
                                            >
                                                +
                                            </Button>
                                        </div>
                                    </div>

                                    <Collapsible open={extrasOpen} onOpenChange={setExtrasOpen}>
                                        <CollapsibleTrigger asChild>
                                            <Button variant="ghost" className="w-full justify-between p-0 h-auto font-normal">
                                                <Label className="cursor-pointer">Extras {selectedExtras.length > 0 && `(${selectedExtras.length} seleccionados)`}</Label>
                                                <ChevronDown className={`h-4 w-4 transition-transform ${extrasOpen ? 'rotate-180' : ''}`} />
                                            </Button>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="pt-2">
                                            <div className="flex flex-wrap gap-2">
                                                {extras.map((extra) => (
                                                    <Badge
                                                        key={extra.id}
                                                        variant={selectedExtras.includes(extra.key) ? "default" : "outline"}
                                                        className="cursor-pointer"
                                                        onClick={() => toggleExtra(extra.key)}
                                                    >
                                                        {extra.display_name} (+${parseInt(extra.value).toLocaleString("es-AR")})
                                                    </Badge>
                                                ))}
                                            </div>
                                        </CollapsibleContent>
                                    </Collapsible>

                                    <Collapsible open={removalsOpen} onOpenChange={setRemovalsOpen}>
                                        <CollapsibleTrigger asChild>
                                            <Button variant="ghost" className="w-full justify-between p-0 h-auto font-normal">
                                                <Label className="cursor-pointer">Quitar ingredientes {selectedRemovals.length > 0 && `(${selectedRemovals.length} seleccionados)`}</Label>
                                                <ChevronDown className={`h-4 w-4 transition-transform ${removalsOpen ? 'rotate-180' : ''}`} />
                                            </Button>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="pt-2">
                                            {selectedFlavor ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {getAvailableIngredients().map((ingredient, index) => (
                                                        <Badge
                                                            key={index}
                                                            variant={selectedRemovals.includes(ingredient) ? "destructive" : "outline"}
                                                            className="cursor-pointer"
                                                            onClick={() => toggleRemoval(ingredient)}
                                                        >
                                                            {ingredient}
                                                        </Badge>
                                                    ))}
                                                    {getAvailableIngredients().length === 0 && (
                                                        <p className="text-sm text-muted-foreground">No hay ingredientes disponibles para este sabor</p>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-muted-foreground">Primero seleccioná un sabor de hamburguesa</p>
                                            )}
                                        </CollapsibleContent>
                                    </Collapsible>

                                    {(selectedFlavor && selectedPricing) || selectedExtras.length > 0 ? (
                                        <div className="flex items-center justify-between pt-2 border-t">
                                            <span className="text-muted-foreground">
                                                Subtotal: ${(getItemPrice() * currentQuantity).toLocaleString("es-AR")}
                                            </span>
                                            <Button onClick={addItemToOrder} size="sm">
                                                <Plus className="w-4 h-4 mr-1" />
                                                Agregar
                                            </Button>
                                        </div>
                                    ) : null}
                                </div>
                            )}
                        </div>

                        {/* Order Items */}
                        {orderItems.length > 0 && (
                            <div className="border rounded-lg p-4">
                                <h3 className="font-semibold mb-4">Items del Pedido</h3>
                                <div className="space-y-2">
                                    {orderItems.map((item, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between p-2 bg-muted rounded-md"
                                        >
                                            <div>
                                                <span className="font-medium">
                                                    {item.quantity}x {item.burger_type}
                                                </span>
                                                <span className="text-muted-foreground ml-2">{item.patty_size}</span>
                                                {item.combo && <Badge variant="secondary" className="ml-2">Combo</Badge>}
                                                {item.additions.length > 0 && (
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        + {item.additions.join(", ")}
                                                    </div>
                                                )}
                                                {item.removals.length > 0 && (
                                                    <div className="text-xs text-destructive mt-1">
                                                        - {item.removals.join(", ")}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold">
                                                    ${item.price.toLocaleString("es-AR")}
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeItemFromOrder(index)}
                                                    className="text-destructive hover:text-destructive"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="flex justify-between pt-4 border-t mt-4">
                                        <span className="text-lg font-bold">Total:</span>
                                        <span className="text-lg font-bold">
                                            ${getTotalPrice().toLocaleString("es-AR")}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="pt-4 border-t flex-shrink-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={submitting || orderItems.length === 0 || !customerName.trim()}
                    >
                        {submitting ? (
                            "Creando..."
                        ) : (
                            <>
                                <Printer className="w-4 h-4 mr-2" />
                                Crear e Imprimir
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
