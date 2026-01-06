import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { 
  Home, 
  Users, 
  Map, 
  Dices, 
  Menu, 
  X, 
  LogIn, 
  LogOut,
  Scroll,
  Swords
} from "lucide-react";
import { useState } from "react";

export default function NavHeader() {
  const [location] = useLocation();
  const { user, loading, logout, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/characters", label: "Characters", icon: Users },
    { href: "/campaigns", label: "Campaigns", icon: Map },
  ];

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b-2 border-amber-800/30 bg-gradient-to-r from-amber-900 via-red-900 to-amber-900 shadow-lg">
      {/* Decorative top border */}
      <div className="h-1 bg-gradient-to-r from-yellow-600 via-amber-400 to-yellow-600" />
      
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative">
            <Scroll className="h-8 w-8 text-amber-300 group-hover:text-amber-200 transition-colors" />
            <Swords className="h-4 w-4 text-red-400 absolute -bottom-1 -right-1" />
          </div>
          <span className="font-serif text-xl font-bold text-amber-100 hidden sm:block tracking-wide">
            D&D Companion
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  className={`flex items-center gap-2 text-amber-100 hover:text-white hover:bg-amber-800/50 ${
                    isActive(item.href) ? "bg-amber-800/70 text-white" : ""
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="flex items-center gap-2">
          {loading ? (
            <div className="h-8 w-24 bg-amber-800/50 animate-pulse rounded" />
          ) : isAuthenticated ? (
            <div className="flex items-center gap-2">
              <span className="text-amber-200 text-sm hidden sm:block">
                {user?.name || "Adventurer"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => logout()}
                className="text-amber-200 hover:text-white hover:bg-amber-800/50"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <a href={getLoginUrl()}>
              <Button
                variant="ghost"
                size="sm"
                className="text-amber-200 hover:text-white hover:bg-amber-800/50"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            </a>
          )}

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden text-amber-200 hover:text-white hover:bg-amber-800/50"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-amber-800/30 bg-amber-900/95 backdrop-blur">
          <nav className="container py-4 flex flex-col gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start gap-2 text-amber-100 hover:text-white hover:bg-amber-800/50 ${
                      isActive(item.href) ? "bg-amber-800/70 text-white" : ""
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Decorative bottom border */}
      <div className="h-0.5 bg-gradient-to-r from-transparent via-amber-600/50 to-transparent" />
    </header>
  );
}
