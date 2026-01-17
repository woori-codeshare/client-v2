import { useState, useCallback } from "react";
import { INITIAL_WIDTHS } from "@/constants/panel-config";

export type PanelType = "snapshots" | "comments" | "voting" | null;

interface SidebarPanelState {
  isSidebarOpen: boolean;
  activePanel: PanelType;
  leftWidth: number;
  rightWidth: number;
}

interface SidebarPanelActions {
  toggleSidebar: () => void;
  togglePanel: (panelName: PanelType, canOpen?: boolean) => void;
  handleLeftResize: (delta: number) => void;
  handleRightResize: (delta: number) => void;
  closeAllPanels: () => void;
  openPanel: (panelName: PanelType) => void;
  closePanel: () => void;
}

interface UseSidebarPanelsReturn extends SidebarPanelState, SidebarPanelActions {}

/**
 * 사이드바와 패널 상태를 관리하는 커스텀 훅
 * @returns 사이드바/패널 상태와 제어 함수들
 */
export function useSidebarPanels(): UseSidebarPanelsReturn {
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [leftWidth, setLeftWidth] = useState<number>(INITIAL_WIDTHS.LEFT);
  const [rightWidth, setRightWidth] = useState<number>(INITIAL_WIDTHS.RIGHT);

  /**
   * 사이드바 토글
   */
  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  /**
   * 패널 토글 (조건부 열기 가능)
   * @param panelName - 토글할 패널 이름
   * @param canOpen - 패널을 열 수 있는지 여부 (기본값: true)
   */
  const togglePanel = useCallback((panelName: PanelType, canOpen: boolean = true) => {
    if (!canOpen || panelName === null) {
      setActivePanel(null);
      return;
    }
    
    setActivePanel((prev) => prev === panelName ? null : panelName);
  }, []);

  /**
   * 특정 패널 열기
   */
  const openPanel = useCallback((panelName: PanelType) => {
    if (panelName !== null) {
      setActivePanel(panelName);
    }
  }, []);

  /**
   * 패널 닫기
   */
  const closePanel = useCallback(() => {
    setActivePanel(null);
  }, []);

  /**
   * 모든 패널 닫기
   */
  const closeAllPanels = useCallback(() => {
    setActivePanel(null);
    setIsSidebarOpen(false);
  }, []);

  /**
   * 좌측 사이드바 크기 조절
   */
  const handleLeftResize = useCallback((delta: number) => {
    setLeftWidth((prev) => {
      const newWidth = prev + delta;
      return Math.min(
        Math.max(newWidth, INITIAL_WIDTHS.MIN_LEFT),
        window.innerWidth * INITIAL_WIDTHS.MAX_LEFT_RATIO
      );
    });
  }, []);

  /**
   * 우측 패널 크기 조절
   */
  const handleRightResize = useCallback((delta: number) => {
    setRightWidth((prev) => {
      const newWidth = prev + delta;
      return Math.min(
        Math.max(newWidth, INITIAL_WIDTHS.MIN_RIGHT),
        window.innerWidth * INITIAL_WIDTHS.MAX_RIGHT_RATIO
      );
    });
  }, []);

  return {
    // State
    isSidebarOpen,
    activePanel,
    leftWidth,
    rightWidth,
    // Actions
    toggleSidebar,
    togglePanel,
    handleLeftResize,
    handleRightResize,
    closeAllPanels,
    openPanel,
    closePanel,
  };
}
