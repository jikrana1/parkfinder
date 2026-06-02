import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import * as Icons from "lucide-react";

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Detect system theme
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    setTheme(mediaQuery.matches ? 'light' : 'dark');

    const handler = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? 'light' : 'dark');
    };
    
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Theme-based classes
  const getThemeClasses = () => {
    return theme === 'light' 
      ? {
          bg: 'bg-white',
          bgSecondary: 'bg-gray-50',
          text: 'text-gray-900',
          textSecondary: 'text-gray-600',
          border: 'border-gray-200',
          cardBg: 'bg-white',
          cardBorder: 'border-gray-200',
          overlay: 'bg-black/5',
          gradient: {
            primary: 'from-blue-600 to-blue-500',
            secondary: 'from-pink-600 to-pink-500',
            accent: 'from-blue-600 to-pink-600'
          },
          navBg: isScrolled 
            ? 'bg-white/90 backdrop-blur-xl border-b border-gray-200' 
            : 'bg-white/70 backdrop-blur-lg'
        }
      : {
          bg: 'bg-[#191919]',
          bgSecondary: 'bg-[#0f0f0f]',
          text: 'text-[#EEECF6]',
          textSecondary: 'text-[#EEECF6]/70',
          border: 'border-[#1B42CB]/20',
          cardBg: 'bg-[#191919]/40',
          cardBorder: 'border-[#1B42CB]/20',
          overlay: 'bg-black/40',
          gradient: {
            primary: 'from-[#1B42CB] to-[#1B42CB]/80',
            secondary: 'from-[#FF2F6C] to-[#FF2F6C]/80',
            accent: 'from-[#1B42CB] to-[#FF2F6C]'
          },
          navBg: isScrolled
            ? 'backdrop-blur-xl bg-[#191919]/90 border-b border-[#1B42CB]/20'
            : 'backdrop-blur-lg bg-[#191919]/70'
        };
  };

  const themeClasses = getThemeClasses();

  const navItems = [
    { name: "Home", path: "/", icon: Icons.Home },
    { name: "Dashboard", path: "/dashboard", icon: Icons.LayoutDashboard },
    { name: "Parking Slots", path: "/parkingslots", icon: Icons.MapPin },
    { name: "Bookings", path: "/bookings", icon: Icons.Calendar },
    ...(user?.role === "admin"
      ? [{ name: "Admin Panel", path: "/admin-panel", icon: Icons.Shield }]
      : []),
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate("/login");
    setIsMobileMenuOpen(false);
    setIsDropdownOpen(false);
  };

  return (
    <>
      {/* Navbar */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 bg-gradient-to-br ${
          theme === "light"
            ? "from-gray-50 via-white to-gray-50"
            : "from-[#191919] via-[#0f0f0f] to-[#191919]"
        } ${themeClasses.navBg}`}
      >
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center group relative">
              <img
                src="/logo.png"
                alt="SmartPark"
                className="h-11 md:h-12 w-auto object-contain transition-all duration-300 group-hover:scale-105"
                style={{
                  filter:
                    theme === "light"
                      ? "brightness(0)"
                      : "brightness(0) invert(1)",
                }}
              />
              {/* Glow Effect */}
              <div
                className={`absolute inset-0 bg-gradient-to-r ${themeClasses.gradient.accent} rounded-full blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-300 -z-10`}
              ></div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`relative px-6 py-3 rounded-xl font-medium transition-all duration-300 group flex items-center gap-2 ${
                      isActive(item.path)
                        ? `bg-gradient-to-r from-[#1B42CB]/20 to-[#FF2F6C]/20 ${themeClasses.text}`
                        : `${themeClasses.textSecondary} hover:${themeClasses.text} hover:bg-[#1B42CB]/10`
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span className="relative z-10">{item.name}</span>
                    {isActive(item.path) && (
                      <div
                        className={`absolute inset-0 border ${themeClasses.border} rounded-xl`}
                      ></div>
                    )}
                    {!isActive(item.path) && (
                      <div className="absolute inset-0 border border-transparent group-hover:border-[#1B42CB]/20 rounded-xl transition-all duration-300"></div>
                    )}
                    <div
                      className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r ${themeClasses.gradient.accent} group-hover:w-3/4 transition-all duration-300`}
                    ></div>
                  </Link>
                );
              })}
            </div>

            {/* Right Side Actions */}
            <div className="hidden md:flex items-center space-x-4">
              {user ? (
                // User dropdown
                <div className="relative">
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className={`flex items-center space-x-3 px-4 py-2 rounded-xl ${
                      theme === "light"
                        ? "bg-gray-100 border-gray-200 hover:bg-gray-200"
                        : "bg-[#191919] border-[#1B42CB]/30 hover:bg-[#1B42CB]/10"
                    } border transition-all duration-300 cursor-pointer`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Icons.User
                        className={`w-4 h-4 ${themeClasses.textSecondary}`}
                      />
                      <span
                        className={`font-medium text-sm ${themeClasses.text}`}
                      >
                        {user.name?.toUpperCase() || "USER"}
                      </span>
                    </div>

                    <Icons.ChevronDown
                      className={`w-4 h-4 ${themeClasses.textSecondary} transition-transform duration-300 ${
                        isDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0"
                        onClick={() => setIsDropdownOpen(false)}
                      ></div>
                      <div
                        className={`absolute right-0 mt-2 w-48 rounded-xl backdrop-blur-xl ${
                          theme === "light"
                            ? "bg-white/95 border-gray-200"
                            : "bg-[#191919]/95 border-[#1B42CB]/30"
                        } border shadow-lg overflow-hidden z-50`}
                      >
                        <div
                          className={`px-4 py-3 border-b ${themeClasses.border}`}
                        >
                          <div
                            className={`text-sm font-medium ${themeClasses.text}`}
                          >
                            {user.name}
                          </div>
                          <div
                            className={`text-xs ${themeClasses.textSecondary}`}
                          >
                            {user.role === "admin" ? "Administrator" : "User"}
                          </div>
                        </div>
                        <button
                          onClick={handleLogout}
                          className={`w-full flex items-center justify-between px-4 py-3 text-sm text-[#FF2F6C] hover:bg-[#FF2F6C]/10 transition-all duration-300`}
                        >
                          <span>Logout</span>
                          <Icons.LogOut className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <button
                    onClick={() => navigate("/login")}
                    className={`px-4 py-2 rounded-xl ${
                      theme === "light"
                        ? "bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200"
                        : "bg-[#191919] border-[#1B42CB]/30 text-[#EEECF6] hover:bg-[#1B42CB]/10"
                    } border flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer`}
                  >
                    <Icons.LogIn className="w-4 h-4" />
                    <span>Login</span>
                  </button>
                  <button
                    onClick={() => navigate("/signup")}
                    className={`px-4 py-2 rounded-xl bg-gradient-to-br ${themeClasses.gradient.accent} text-white flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-[#FF2F6C]/20 transition-all duration-300 cursor-pointer`}
                  >
                    <Icons.UserPlus className="w-4 h-4" />
                    <span>Sign Up</span>
                  </button>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`md:hidden w-10 h-10 rounded-xl ${
                theme === "light"
                  ? "bg-gray-100 border-gray-200"
                  : "bg-[#191919] border-[#1B42CB]/30"
              } border flex items-center justify-center ${themeClasses.text}`}
            >
              {isMobileMenuOpen ? (
                <Icons.X className="w-6 h-6" />
              ) : (
                <Icons.Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div
            className={`md:hidden backdrop-blur-xl ${
              theme === "light"
                ? "bg-white/95 border-gray-200"
                : "bg-[#191919]/95 border-[#1B42CB]/20"
            } border-t`}
          >
            <div className="px-4 pt-2 pb-4 space-y-1">
              {navItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
                      isActive(item.path)
                        ? `bg-gradient-to-r from-[#1B42CB]/20 to-[#FF2F6C]/20 ${themeClasses.text}`
                        : `${themeClasses.textSecondary} hover:${themeClasses.text} hover:bg-[#1B42CB]/10`
                    }`}
                  >
                    <IconComponent className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}

              <div className={`pt-4 border-t ${themeClasses.border}`}>
                {user ? (
                  <>
                    {/* User Info */}
                    <div className="flex items-center space-x-3 px-4 py-3 mb-3">
                      <div
                        className={`w-10 h-10 rounded-full bg-gradient-to-br ${themeClasses.gradient.accent} flex items-center justify-center`}
                      >
                        <span className="text-white font-medium">
                          {user.name?.charAt(0).toUpperCase() || "U"}
                        </span>
                      </div>
                      <div>
                        <div className={`font-medium ${themeClasses.text}`}>
                          {user.name}
                        </div>
                        <div
                          className={`text-xs ${themeClasses.textSecondary}`}
                        >
                          {user.role === "admin" ? "Administrator" : "User"}
                        </div>
                      </div>
                    </div>

                    {/* Logout Button */}
                    <button
                      onClick={handleLogout}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl ${
                        theme === "light"
                          ? "bg-gray-100 border-gray-200"
                          : "bg-[#191919] border-[#FF2F6C]/30"
                      } border text-[#FF2F6C] font-medium hover:bg-[#FF2F6C]/10 transition-all duration-300`}
                    >
                      <Icons.LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </>
                ) : (
                  // Mobile menu when user is NOT logged in
                  <>
                    <button
                      onClick={() => {
                        navigate("/login");
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl ${
                        theme === "light"
                          ? "bg-gray-100 border-gray-200 text-gray-700"
                          : "bg-[#191919] border-[#1B42CB]/30 text-[#EEECF6]"
                      } border font-medium hover:bg-[#1B42CB]/10 transition-all duration-300 mb-2`}
                    >
                      <Icons.LogIn className="w-4 h-4" />
                      <span>Login</span>
                    </button>
                    <button
                      onClick={() => {
                        navigate("/signup");
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r ${themeClasses.gradient.accent} text-white font-medium hover:shadow-lg hover:shadow-[#FF2F6C]/20 transition-all duration-300`}
                    >
                      <Icons.UserPlus className="w-4 h-4" />
                      <span>Sign Up</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Spacer for fixed navbar */}
      <div className="h-16 md:h-20"></div>

      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#1B42CB]/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#FF2F6C]/5 rounded-full blur-3xl"></div>
      </div>
    </>
  );
};

export default Navbar;