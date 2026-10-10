'use client';

import React from 'react';

export interface RoleGuardProps {
  children: React.ReactNode;
}

export function RoleGuard({ children }: RoleGuardProps) {
  return <>{children}</>;
}
