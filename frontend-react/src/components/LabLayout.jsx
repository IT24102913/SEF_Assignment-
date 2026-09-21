import React from 'react';
import Sidebar from './Sidebar';

export default function LabLayout({ children }) {
  return (
    <div className="layout">
      <Sidebar />
      <main className="main-content animate-fade-in">
        {children}
      </main>
    </div>
  );
}
