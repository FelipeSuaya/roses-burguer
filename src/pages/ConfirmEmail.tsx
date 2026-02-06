import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';

const ConfirmEmail = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <div className="flex justify-center mb-4">
                        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                            <Mail className="h-8 w-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-center">
                        Confirma tu email
                    </CardTitle>
                    <CardDescription className="text-center">
                        Te hemos enviado un email de confirmación
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="text-center space-y-2">
                        <p className="text-sm text-muted-foreground">
                            Revisa tu bandeja de entrada y haz clic en el enlace de confirmación para activar tu cuenta.
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Si no ves el email, revisa tu carpeta de spam.
                        </p>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col space-y-2">
                    <Link to="/login" className="w-full">
                        <Button variant="outline" className="w-full">
                            Volver al inicio de sesión
                        </Button>
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
};

export default ConfirmEmail;
