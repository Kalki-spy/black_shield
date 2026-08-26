import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Shield, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleHomeClick = () => {
    setMobileOpen(false);
    if (window.location.pathname !== "/") {
      navigate("/");
      setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleServicesClick = () => {
    setMobileOpen(false);
    if (window.location.pathname !== "/") {
      navigate("/");
      setTimeout(() => document.getElementById("services")?.scrollIntoView({ behavior: "smooth" }), 100);
    } else {
      document.getElementById("services")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 glass">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">

        {/* Logo */}
        <button onClick={handleHomeClick} className="flex items-center gap-2">
          <Shield className="h-7 w-7 text-primary" />
          <span className="font-mono text-lg font-bold gradient-text">BlackShield</span>
        </button>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-6">
          <button onClick={handleHomeClick} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Home
          </button>
          <button onClick={handleServicesClick} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Services
          </button>

          {user ? (
            <Link to="/dashboard">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/80 font-mono text-xs">
                Dashboard
              </Button>
            </Link>
          ) : (
            <Link to="/auth">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/80 font-mono text-xs">
                Login / Sign Up
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile Toggle */}
        <button className="md:hidden text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden glass border-t border-border p-4 space-y-3">
          <button onClick={handleHomeClick} className="block w-full text-left text-sm text-muted-foreground hover:text-foreground">
            Home
          </button>
          <button onClick={handleServicesClick} className="block w-full text-left text-sm text-muted-foreground hover:text-foreground">
            Services
          </button>
          {user ? (
            <Link to="/dashboard" onClick={() => setMobileOpen(false)}>
              <Button size="sm" className="w-full bg-primary text-primary-foreground hover:bg-primary/80 font-mono text-xs">
                Dashboard
              </Button>
            </Link>
          ) : (
            <Link to="/auth" onClick={() => setMobileOpen(false)}>
              <Button size="sm" className="w-full bg-primary text-primary-foreground hover:bg-primary/80 font-mono text-xs">
                Login / Sign Up
              </Button>
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}