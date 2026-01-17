"use client";

import { createContext, useContext, ReactNode } from "react";
import type { PanelType } from "@/hooks/layout/useSidebarPanels";

interface LayoutContextType {
  isSidebarOpen: boolean;
  activePanel: PanelType;
  leftWidth: number;
  rightWidth: number;
  onSidebarToggle: () => void;
  onPanelChange: (panelName: PanelType) => void;
  onLeftResize: (delta: number) => void;
  onRightResize: (delta: number) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ 
  children,
  isSidebarOpen,
  activePanel,
  leftWidth,
  rightWidth,
  onSidebarToggle,
  onPanelChange,
  onLeftResize,
  onRightResize
}: { 
  children: ReactNode;
  isSidebarOpen: boolean;
  activePanel: PanelType;
  leftWidth: number;
  rightWidth: number;
  onSidebarToggle: () => void;
  onPanelChange: (panelName: PanelType) => void;
  onLeftResize: (delta: number) => void;
  onRightResize: (delta: number) => void;
}) {
  const value: LayoutContextType = {
    isSidebarOpen,
    activePanel,
    leftWidth,
    rightWidth,
    onSidebarToggle,
    onPanelChange,
    onLeftResize,
    onRightResize,
  };

  return (
    <LayoutContext.Provider value={value}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error("useLayout must be used within a LayoutProvider");
  }
  return context;
}
