import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Lock, Eye, EyeOff, Mail, Phone, User } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const loginSchema = z.object({
  identifier: z.string().trim().min(1, { message: "Email or username is required" }),
  password: z.string().min(1, { message: "Password is required" }),
});

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Create admin account on first load (one-time setup)
  useEffect(() => {
    async function createAdminIfNeeded() {
      // Check if admin already exists by trying to sign in
      const { error } = await supabase.auth.signInWithPassword({
        email: 'ahsan.ahmad87@gmail.com',
        password: 'Ehsaan',
      });
      
      if (error && error.message.includes('Invalid login credentials')) {
        // Admin doesn't exist, create it
        const { error: signUpError } = await supabase.auth.signUp({
          email: 'ahsan.ahmad87@gmail.com',
          password: 'Ehsaan',
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              username: 'admin',
              full_name: 'Ehsaan Ahmad',
              role: 'admin',
            }
          }
        });
        
        if (!signUpError) {
          console.log('Admin account created successfully');
        }
      } else if (!error) {
        // Sign out after checking - don't auto-login
        await supabase.auth.signOut();
      }
    }
    
    createAdminIfNeeded();
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    
    const validation = loginSchema.safeParse({ identifier, password });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    try {
      // Determine if input is email or username
      const isEmail = identifier.includes('@');
      let email = identifier;
      
      if (!isEmail) {
        // Look up email by username from profiles
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('username', identifier)
          .maybeSingle();
        
        if (profileError || !profileData) {
          toast.error('Invalid username or password');
          setIsLoading(false);
          return;
        }
        
        // Get the user's email from auth
        const { data: userData } = await supabase.auth.admin?.getUserById?.(profileData.user_id) || {};
        
        // If we can't get email via admin API, try with the identifier as email anyway
        // This will work if user enters their email directly
        if (!userData?.user?.email) {
          // Try signing in with identifier as email (fallback)
          const { error } = await signIn(identifier, password);
          if (error) {
            toast.error('Invalid username or password');
          } else {
            toast.success('Welcome back, Ehsaan Ahmad!');
            navigate('/');
          }
          setIsLoading(false);
          return;
        }
        
        email = userData.user.email;
      }
      
      const { error } = await signIn(email, password);
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Invalid email/username or password');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success('Welcome back, Ehsaan Ahmad!');
        navigate('/');
      }
    } catch (error) {
      toast.error('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
              <Building2 className="h-8 w-8" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">AccuBooks</h1>
          <p className="text-muted-foreground">Professional Accounting Tool</p>
        </div>

        {/* Login Form */}
        <Card className="border-border/50 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your email or username to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-identifier">Email or Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="login-identifier"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="admin or your@email.com"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-6 rounded-lg bg-muted/50 p-4 text-center text-sm text-muted-foreground">
              <p>Contact administrator to create an account</p>
            </div>
          </CardContent>
        </Card>

        {/* Footer with branding */}
        <div className="text-center space-y-1">
          <p className="text-sm font-medium">Developed by <strong>Ehsaan Ahmad</strong></p>
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            <Phone className="h-3 w-3" /> +923224875471
          </p>
        </div>
      </div>
    </div>
  );
}
