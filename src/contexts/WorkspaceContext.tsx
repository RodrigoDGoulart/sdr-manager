import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { workspaceService, type Workspace } from '../services/api';
import { useAuth } from './AuthContext';

interface WorkspaceContextType {
  workspaces: Workspace[];
  loading: boolean;
  refresh: () => Promise<void>;
  addWorkspace: (ws: Workspace) => void;
  removeWorkspace: (id: string) => void;
  updateWorkspace: (ws: Workspace) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await workspaceService.list();
      setWorkspaces(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) refresh();
  }, [token, refresh]);

  const addWorkspace = useCallback((ws: Workspace) => {
    setWorkspaces((prev) => [...prev, ws]);
  }, []);

  const removeWorkspace = useCallback((id: string) => {
    setWorkspaces((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const updateWorkspace = useCallback((ws: Workspace) => {
    setWorkspaces((prev) => prev.map((w) => (w.id === ws.id ? ws : w)));
  }, []);

  return (
    <WorkspaceContext.Provider value={{ workspaces, loading, refresh, addWorkspace, removeWorkspace, updateWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspaces() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspaces must be used within WorkspaceProvider');
  return ctx;
}
