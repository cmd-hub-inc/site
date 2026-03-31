import React from 'react';
import { C } from '../constants';

export default function NotFound() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '70vh' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ color: C.white, fontSize: 48, margin: 0 }}>404</h1>
        <div style={{ color: C.muted, marginTop: 8 }}>Page not found or you're not authorized to view this page.</div>
      </div>
    </div>
  );
}
