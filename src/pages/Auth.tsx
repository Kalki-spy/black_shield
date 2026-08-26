import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, Mail, Lock, User, ArrowRight, Eye, EyeOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; email?: string; password?: string }>({});

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const isValidEmail = (val: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val.trim());

  function validate(): boolean {
    const errs: { username?: string; email?: string; password?: string } = {};
    if (!isLogin && !username.trim())
      errs.username = "Username is required.";
    else if (!isLogin && username.trim().length < 3)
      errs.username = "Username must be at least 3 characters.";
    if (!email.trim())
      errs.email = "Email is required.";
    else if (!isValidEmail(email))
      errs.email = "Enter a valid email address (e.g. user@example.com).";
    if (!password)
      errs.password = "Password is required.";
    else if (!isLogin && password.length < 6)
      errs.password = "Password must be at least 6 characters.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  const handleSubmit = async () => {
    setError("");
    if (!validate()) return;
    setLoading(true);
    let result: { error?: string };
    if (isLogin) {
      result = await signIn(email, password);
    } else {
      result = await signUp(username, email, password);
    }
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      navigate("/dashboard");
    }
  };

  const switchMode = (login: boolean) => {
    setIsLogin(login);
    setError("");
    setUsername("");
    setEmail("");
    setPassword("");
    setFieldErrors({});
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(hsl(var(--primary) / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.3) 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
      }} />
      <div className="absolute top-1/3 left-1/3 w-80 h-80 rounded-full bg-primary/5 blur-[120px]" />

      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <Shield className="h-8 w-8 text-primary" />
          <span className="font-mono text-xl font-bold gradient-text">BlackShield</span>
        </Link>

        {/* Card */}
        <div className="neon-card rounded-lg p-8">
          {/* Tabs */}
          <div className="flex mb-8 border-b border-border">
            <button
              onClick={() => switchMode(true)}
              className={`flex-1 pb-3 text-sm font-mono transition-colors ${isLogin ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
            >
              Login
            </button>
            <button
              onClick={() => switchMode(false)}
              className={`flex-1 pb-3 text-sm font-mono transition-colors ${!isLogin ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
            >
              Sign Up
            </button>
          </div>

          <div className="space-y-4">
            {!isLogin && (
              <div className="space-y-1">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Username"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setFieldErrors(p => ({ ...p, username: undefined })); }}
                    className={`pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground ${fieldErrors.username ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  />
                </div>
                {fieldErrors.username && (
                  <p className="flex items-center gap-1.5 text-xs font-mono text-destructive">
                    <AlertCircle className="h-3 w-3 flex-shrink-0" />{fieldErrors.username}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-1">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setFieldErrors(p => ({ ...p, email: undefined })); }}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  className={`pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground ${fieldErrors.email ? "border-destructive focus-visible:ring-destructive" : ""}`}
                />
              </div>
              {fieldErrors.email && (
                <p className="flex items-center gap-1.5 text-xs font-mono text-destructive">
                  <AlertCircle className="h-3 w-3 flex-shrink-0" />{fieldErrors.email}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: undefined })); }}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  className={`pl-10 pr-10 bg-muted border-border text-foreground placeholder:text-muted-foreground ${fieldErrors.password ? "border-destructive focus-visible:ring-destructive" : ""}`}
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="flex items-center gap-1.5 text-xs font-mono text-destructive">
                  <AlertCircle className="h-3 w-3 flex-shrink-0" />{fieldErrors.password}
                </p>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm font-mono bg-destructive/10 border border-destructive/30 rounded px-3 py-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/80 font-mono neon-border"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Processing..." : isLogin ? "Access Terminal" : "Create Account"}
              {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          By continuing, you agree to our{" "}
          <span className="text-primary cursor-pointer">Terms</span> and{" "}
          <span className="text-primary cursor-pointer">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
};

export default Auth;