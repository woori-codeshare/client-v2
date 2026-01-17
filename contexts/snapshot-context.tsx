"use client";

import { createContext, useContext, ReactNode } from "react";

interface Snapshot {
  id: string;
  createdAt: Date;
  title: string;
  description: string;
  code: string;
  comments: any[];
}

interface SnapshotContextType {
  snapshots: Snapshot[];
  currentVersion: number | null;
  currentSnapshot: Snapshot | null;
  onVersionChange: (index: number | null) => void;
  fetchSnapshots: () => Promise<void>;
}

const SnapshotContext = createContext<SnapshotContextType | undefined>(undefined);

export function SnapshotProvider({ 
  children,
  snapshots,
  currentVersion,
  onVersionChange,
  fetchSnapshots
}: { 
  children: ReactNode;
  snapshots: Snapshot[];
  currentVersion: number | null;
  onVersionChange: (index: number | null) => void;
  fetchSnapshots: () => Promise<void>;
}) {
  const currentSnapshot =
    currentVersion !== null ? snapshots[currentVersion] ?? null : null;

  const value: SnapshotContextType = {
    snapshots,
    currentVersion,
    currentSnapshot,
    onVersionChange,
    fetchSnapshots,
  };

  return (
    <SnapshotContext.Provider value={value}>
      {children}
    </SnapshotContext.Provider>
  );
}

export function useSnapshot() {
  const context = useContext(SnapshotContext);
  if (!context) {
    throw new Error("useSnapshot must be used within a SnapshotProvider");
  }
  return context;
}
