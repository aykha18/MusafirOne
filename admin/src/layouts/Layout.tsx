import React from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { authService } from '../services/auth.service';

const Layout: React.FC = () => {
  const token = localStorage.getItem('adminToken');
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const isActive = (path: string) => {
    return location.pathname === path ? 'bg-gray-200' : 'hover:bg-gray-100';
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold">Muhajir Admin</h1>
        </div>
        <nav className="p-4 flex-1">
          <ul>
            <li className="mb-2">
              <Link to="/" className={`block p-2 rounded ${isActive('/')}`}>
                Dashboard
              </Link>
            </li>
            <li className="mb-2">
              <Link to="/users" className={`block p-2 rounded ${isActive('/users')}`}>
                Users
              </Link>
            </li>
            <li className="mb-2">
              <Link to="/disputes" className={`block p-2 rounded ${isActive('/disputes')}`}>
                Disputes
              </Link>
            </li>
            <li className="mb-2">
              <Link to="/logs" className={`block p-2 rounded ${isActive('/logs')}`}>
                System Logs
              </Link>
            </li>
          </ul>
        </nav>
        <div className="p-4 border-t">
          <button 
            onClick={() => authService.logout()}
            className="w-full text-left p-2 rounded hover:bg-red-50 text-red-600"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
