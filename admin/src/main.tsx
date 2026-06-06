import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import Layout from './layouts/Layout'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'

import Logs from './pages/Logs'
import Users from './pages/Users'
import Disputes from './pages/Disputes'
import Claims from './pages/Claims'
import Reports from './pages/Reports'
import Businesses from './pages/Businesses'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        path: '/',
        element: <Dashboard />,
      },
      {
        path: '/users',
        element: <Users />,
      },
      {
        path: '/logs',
        element: <Logs />,
      },
      {
        path: '/businesses',
        element: <Businesses />,
      },
      {
        path: '/disputes',
        element: <Disputes />,
      },
      {
        path: '/claims',
        element: <Claims />,
      },
      {
        path: '/reports',
        element: <Reports />,
      },
    ],
  },
  {
    path: '/login',
    element: <Login />,
  },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
