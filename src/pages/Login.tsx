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
  username: z.string().trim().min(1, { message: "Username is required" }),
  password: z.string().min(1, { message: "Password is required" }),
});

export default function Login() {
  const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'ahsan.ahmad87@gmail.com';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, isAuthenticated, resetPassword } = useAuth();
  const navigate = useNavigate();



  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    const validation = loginSchema.safeParse({ username, password });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    try {
      // Resolve email by username using RPC or admin email
      const emailLocal = localStorage.getItem('accubooks_admin_email') || ADMIN_EMAIL;
      const adminEmailToUse = username === 'admin' ? emailLocal : null;
      let emailToUse: string | null = adminEmailToUse;
      if (!emailToUse) {
        const { data: resolvedEmail, error: rpcError } = await supabase.rpc('resolve_email_by_username', {
          p_username: username,
        });
        if (rpcError) {
          console.warn('RPC resolve_email_by_username failed:', rpcError);
          // Fallback: if username looks like an email, use it. 
          // Or if it's 'admin', use the local admin email.
          if (username.toLowerCase() === 'admin') {
            // Pass 'admin' directly so AuthContext fallback can find the user by username
            // ignoring potentially stale local storage email
            emailToUse = 'admin';
          } else if (username.includes('@')) {
            emailToUse = username;
          } else {
            // If we can't resolve it, we might still try to pass it to signIn 
            // in case AuthContext handles it (which we just added logic for).
            emailToUse = username;
          }
        }
        if (!emailToUse && !rpcError) {
          // RPC returned null/empty
          emailToUse = null;
        } else if (!emailToUse) {
          // Fallback logic above might have set it
          emailToUse = (resolvedEmail as string) || null;
        }
      }

      if (!emailToUse) {
        // Final attempt: if it's just a username, pass it through. 
        // AuthContext might match it against local users.
        emailToUse = username;
      }

      if (!emailToUse) {
        toast.error('Invalid username or password');
        setIsLoading(false);
        return;
      }
      const { error } = await signIn(emailToUse, password);
      if (error) {
        if (error.message.toLowerCase().includes('confirm')) {
          toast.error('Please confirm the email before signing in');
        } else if (error.message.includes('Invalid login credentials')) {
          toast.error('Invalid username or password');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success('Welcome back!');
        navigate('/');
      }
    } catch (error) {
      toast.error('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleForgotPassword() {
    const emailLocal = localStorage.getItem('accubooks_admin_email') || ADMIN_EMAIL;
    const adminEmailToUse = username === 'admin' ? emailLocal : null;
    let emailToUse: string | null = adminEmailToUse;
    if (!emailToUse && username) {
      const { data: resolvedEmail } = await supabase.rpc('resolve_email_by_username', {
        p_username: username,
      });
      emailToUse = (resolvedEmail as string) || null;
    }
    if (!emailToUse) {
      toast.error('Enter a valid username first');
      return;
    }
    const { error } = await resetPassword(emailToUse);
    if (error) {
      toast.error(error.message);
    } else {
      toast.info('Password reset link sent to your email');
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
              Enter your username to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="login-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin"
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
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-muted-foreground hover:text-foreground underline mt-2"
                >
                  Forgot password?
                </button>
              </div>
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
