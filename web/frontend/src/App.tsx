import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  Sun,
  MapPin,
  Calendar,
  Bell,
  Settings,
  Menu,
  X,
  Shield,
  Home,
  BarChart3,
  Users,
  Info,
} from 'lucide-react';

// Pages
import Dashboard from './pages/Dashboard';
import Forecast from './pages/Forecast';
import HeatMap from './pages/HeatMap';
import Alerts from './pages/Alerts';
import Schedule from './pages/Schedule';
import Demo from './pages/Demo';
import About from './pages/About';

// Navigation component
function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/forecast', label: 'Forecast', icon: Calendar },
    { path: '/map', label: 'Heat Map', icon: MapPin },
    { path: '/schedule', label: 'Work Schedule', icon: BarChart3 },
    { path: '/alerts', label: 'Alerts', icon: Bell },
    { path: '/demo', label: 'Demo', icon: Users },
    { path: '/about', label: 'About', icon: Info },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-green-600" />
              <div className="flex flex-col">
                <span className="text-xl font-bold text-gray-900">HeatShield</span>
                <span className="text-xs text-gray-500 -mt-1">Agri</span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? 'bg-green-100 text-green-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-gray-100">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-2 px-3 py-3 rounded-lg text-sm font-medium ${
                    isActive(item.path)
                      ? 'bg-green-100 text-green-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}

// Footer component
function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-green-600" />
            <span className="text-sm text-gray-600">
              HeatShield Agri - Protecting farmers from dangerous heat
            </span>
          </div>
          <div className="text-sm text-gray-500">
            &copy; 2026 HeatShield Agri. Built for Uganda's agricultural workers.
          </div>
        </div>
      </div>
    </footer>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/forecast" element={<Forecast />} />
            <Route path="/map" element={<HeatMap />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/demo" element={<Demo />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
