import { createContext } from 'react';
import type { WorkspaceContextType } from './WorkspaceContext';

export const WorkspaceContext = createContext<WorkspaceContextType | null>(null);
