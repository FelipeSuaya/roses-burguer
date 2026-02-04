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
import { Plus, Trash2, Printer, ChevronDown } from "lucide-react";
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
    const [deliveryAddress, setDeliveryAddress] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("efectivo");

    // Current item being added
    const [selectedFlavor, setSelectedFlavor] = useState("");
    const [selectedPricing, setSelectedPricing] = useState("");
    const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
    const [currentQuantity, setCurrentQuantity] = useState(1);

    // Order items
    const [orderItems, setOrderItems] = useState<OrderItemDraft[]>([]);

    // UI state
    const [extrasOpen, setExtrasOpen] = useState(false);

    // Fetch store data on mount
    useEffect(() => {
        if (open) {
            fetchStoreData();
        }
    }, [open]);

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
        if (!selectedFlavor || !selectedPricing) {
            toast({
                title: "Error",
                description: "Seleccioná un sabor y tipo de hamburguesa",
                variant: "destructive",
            });
            return;
        }

        const pricingItem = pricingRules.find((p) => p.key === selectedPricing);
        const isCombo = pricingItem?.key.toLowerCase().includes("combo") || false;

        const newItem: OrderItemDraft = {
            burger_type: selectedFlavor,
            patty_size: pricingItem?.display_name || selectedPricing,
            combo: isCombo,
            quantity: currentQuantity,
            price: getItemPrice() * currentQuantity,
            additions: selectedExtras,
        };

        setOrderItems([...orderItems, newItem]);

        // Reset current item form
        setSelectedFlavor("");
        setSelectedPricing("");
        setSelectedExtras([]);
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

    const getTotalPrice = (): number => {
        return orderItems.reduce((sum, item) => sum + item.price, 0);
    };

    const generateTicketAndSendToPrinter = async (order: {
        order_number: number;
        nombre: string;
        monto: number;
        metodo_pago: string;
        items: any[];
        direccion_envio?: string;
    }) => {
        const bytes: number[] = [];
        const ESC = 0x1b;
        const GS = 0x1d;
        const LF = 0x0a;
        const CENTER = [ESC, 0x61, 0x01];
        const BOLD_ON = [ESC, 0x45, 0x01];
        const BOLD_OFF = [ESC, 0x45, 0x00];
        const DOUBLE_SIZE = [ESC, 0x21, 0x30];
        const MEDIUM_SIZE = [ESC, 0x21, 0x10];
        const CUT = [GS, 0x56, 0x00];

        const addBytes = (...b: number[]) => bytes.push(...b);
        const addText = (text: string) => {
            const encoder = new TextEncoder();
            addBytes(...Array.from(encoder.encode(text)));
        };
        const addLine = () => {
            addText("================================");
            addBytes(LF);
        };
        const newLine = () => addBytes(LF);

        addBytes(...CENTER);
        addBytes(...DOUBLE_SIZE, ...BOLD_ON);
        addText("CAJA");
        addBytes(...BOLD_OFF, LF);
        addLine();
        addBytes(...BOLD_ON);
        addText(`PEDIDO #${order.order_number}`);
        addBytes(...BOLD_OFF, LF, ...MEDIUM_SIZE);
        addLine();
        newLine();
        addText(`Cliente: ${order.nombre}`);
        newLine();
        if (order.direccion_envio) {
            newLine();
            addText(`Entrega:`);
            newLine();
            addText(`${order.direccion_envio}`);
            newLine();
        }
        newLine();
        addLine();
        newLine();

        order.items.forEach((item) => {
            let itemDesc = `${item.quantity}x ${item.burger_type} ${item.patty_size}`;
            if (item.combo) {
                itemDesc += " (combo)";
            }
            newLine();
            addText(itemDesc);
            newLine();

            if (item.additions && item.additions.length > 0) {
                addText(`+ ${item.additions.join(", ")}`);
                newLine();
            }
        });

        addLine();
        newLine();
        addBytes(...BOLD_ON);
        addText(`TOTAL: $${parseFloat(order.monto.toString()).toLocaleString("es-AR")}`);
        addBytes(...BOLD_OFF, LF);
        newLine();
        addText(`Pago: ${order.metodo_pago}`);
        newLine();

        addBytes(LF, LF, LF, LF, LF);
        addBytes(...CUT);

        const ticketBytes = new Uint8Array(bytes);
        const ticketBase64 = btoa(String.fromCharCode(...ticketBytes));

        const cashierWebhookUrl = "https://n8nwebhookx.botec.tech/webhook/crearFacturaCaja";

        const response = await fetch(cashierWebhookUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                order_number: order.order_number,
                ticket: ticketBase64,
                nombre: order.nombre,
                monto: order.monto,
                metodo_pago: order.metodo_pago,
                items: order.items,
                direccion_envio: order.direccion_envio,
            }),
        });

        if (!response.ok) {
            throw new Error(`Error al enviar a impresora: ${response.status}`);
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
                removals: null,
            }));

            const itemStatus = orderItems.map((item) => ({
                burger_type: item.burger_type,
                quantity: item.quantity,
                patty_size: item.patty_size,
                combo: item.combo,
                completed: false,
            }));

            const totalMonto = getTotalPrice();

            // Insert order
            const { data: newOrder, error: insertError } = await supabase
                .from("orders")
                .insert({
                    nombre: customerName.trim(),
                    monto: totalMonto,
                    status: "pending",
                    items: dbItems,
                    item_status: itemStatus,
                    direccion_envio: deliveryAddress.trim() || null,
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
                monto: totalMonto,
                metodo_pago: paymentMethod,
                items: dbItems,
                direccion_envio: deliveryAddress.trim() || undefined,
            });

            toast({
                title: "¡Pedido creado!",
                description: `Pedido #${orderNumber} enviado a impresora`,
            });

            // Reset form
            setCustomerName("");
            setDeliveryAddress("");
            setPaymentMethod("efectivo");
            setOrderItems([]);
            setSelectedFlavor("");
            setSelectedPricing("");
            setSelectedExtras([]);
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
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="deliveryAddress">Dirección de Envío (opcional)</Label>
                                <Input
                                    id="deliveryAddress"
                                    placeholder="Ej: Av. Corrientes 1234, CABA"
                                    value={deliveryAddress}
                                    onChange={(e) => setDeliveryAddress(e.target.value)}
                                />
                            </div>
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

                                    {selectedFlavor && selectedPricing && (
                                        <div className="flex items-center justify-between pt-2 border-t">
                                            <span className="text-muted-foreground">
                                                Subtotal: ${(getItemPrice() * currentQuantity).toLocaleString("es-AR")}
                                            </span>
                                            <Button onClick={addItemToOrder} size="sm">
                                                <Plus className="w-4 h-4 mr-1" />
                                                Agregar
                                            </Button>
                                        </div>
                                    )}
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
