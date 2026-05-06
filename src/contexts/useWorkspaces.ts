import { useContext } from 'react';
import { WorkspaceContext } from './workspaceContextValue';

export function useWorkspaces() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspaces must be used within WorkspaceProvider');
  return ctx;
}
