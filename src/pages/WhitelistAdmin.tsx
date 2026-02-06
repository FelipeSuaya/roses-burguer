import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Trash2, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface WhitelistEntry {
    id: string;
    email: string;
    created_at: string;
    added_by: string | null;
}

const WhitelistAdmin = () => {
    const [whitelist, setWhitelist] = useState<WhitelistEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [newEmail, setNewEmail] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const { user } = useAuth();
    const { toast } = useToast();

    const fetchWhitelist = async () => {
        try {
            const { data, error } = await supabase
                .from('email_whitelist')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setWhitelist(data || []);
        } catch (error) {
            console.error('Error fetching whitelist:', error);
            toast({
                title: 'Error',
                description: 'No se pudo cargar la lista de emails',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWhitelist();
    }, []);

    const handleAddEmail = async () => {
        if (!newEmail || !newEmail.includes('@')) {
            toast({
                title: 'Error',
                description: 'Por favor ingresa un email válido',
                variant: 'destructive',
            });
            return;
        }

        try {
            const { error } = await supabase
                .from('email_whitelist')
                .insert({
                    email: newEmail.toLowerCase(),
                    added_by: user?.id || null,
                });

            if (error) {
                if (error.code === '23505') {
                    toast({
                        title: 'Error',
                        description: 'Este email ya está en la lista',
                        variant: 'destructive',
                    });
                } else {
                    throw error;
                }
                return;
            }

            toast({
                title: 'Email agregado',
                description: `${newEmail} ha sido agregado a la lista`,
            });

            setNewEmail('');
            setDialogOpen(false);
            fetchWhitelist();
        } catch (error) {
            console.error('Error adding email:', error);
            toast({
                title: 'Error',
                description: 'No se pudo agregar el email',
                variant: 'destructive',
            });
        }
    };

    const handleRemoveEmail = async (id: string, email: string) => {
        try {
            // Get the current session to include auth token
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                toast({
                    title: 'Error',
                    description: 'Debes estar autenticado para realizar esta acción',
                    variant: 'destructive',
                });
                return;
            }

            // Call Edge Function to delete from both whitelist and auth
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

            const response = await fetch(
                `${supabaseUrl}/functions/v1/delete-whitelisted-user`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`,
                        'apikey': supabaseKey,
                    },
                    body: JSON.stringify({ email }),
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Error al eliminar');
            }

            // Show different messages based on what was deleted
            const description = result.deletedUser
                ? `${email} ha sido removido de la lista y su cuenta ha sido eliminada`
                : `${email} ha sido removido de la lista (no tenía cuenta registrada)`;

            toast({
                title: 'Eliminado exitosamente',
                description,
            });

            fetchWhitelist();
        } catch (error) {
            console.error('Error removing email:', error);
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'No se pudo eliminar el email',
                variant: 'destructive',
            });
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-6">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <Link
                        to="/admin"
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        <span className="hidden sm:inline">Volver</span>
                    </Link>
                    <h1 className="text-2xl md:text-3xl font-bold">Lista de Acceso</h1>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle>Emails Permitidos</CardTitle>
                                <CardDescription>
                                    Gestiona qué emails pueden registrarse en la aplicación
                                </CardDescription>
                            </div>
                            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button>
                                        <UserPlus className="h-4 w-4 mr-2" />
                                        Agregar Email
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Agregar Email a la Lista</DialogTitle>
                                        <DialogDescription>
                                            Ingresa el email que deseas permitir para registro
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="usuario@ejemplo.com"
                                                value={newEmail}
                                                onChange={(e) => setNewEmail(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        handleAddEmail();
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                            Cancelar
                                        </Button>
                                        <Button onClick={handleAddEmail}>Agregar</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-8 text-muted-foreground">
                                Cargando...
                            </div>
                        ) : whitelist.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                No hay emails en la lista
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Fecha de Agregado</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {whitelist.map((entry) => (
                                        <TableRow key={entry.id}>
                                            <TableCell className="font-medium">{entry.email}</TableCell>
                                            <TableCell>
                                                {new Date(entry.created_at).toLocaleDateString('es-AR', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                })}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="sm">
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Esto eliminará a {entry.email} de la lista de acceso.
                                                                Esta acción no se puede deshacer.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleRemoveEmail(entry.id, entry.email)}
                                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            >
                                                                Eliminar
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default WhitelistAdmin;
