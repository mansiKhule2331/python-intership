/**
 * AppLayout - Main application layout with sidebar + header
 */

import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div
        className="main-content"
        style={{ marginLeft: collapsed ? '64px' : 'var(--sidebar-width)' }}
      >
        <Header collapsed={collapsed} />
        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
