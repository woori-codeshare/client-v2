"use client";

import { FaQuestion, FaVoteYea, FaHistory } from "react-icons/fa";
import ResizeHandle from "@/components/ui/resize-handle";
import VersionsPanel from "@/components/features/versions/versions-panel";
import QuestionsPanel from "@/components/features/questions/questions-panel";
import VotingPanel from "@/components/features/voting/voting-panel";
import SnapshotEditor from "@/components/features/editor/snapshot-editor";
import LiveSessionEditor from "@/components/features/editor/live-session-editor";
import { useEditor } from "@/contexts/editor-context";
import { useSnapshot } from "@/contexts/snapshot-context";
import { useLayout } from "@/contexts/layout-context";

/**
 * 코드 에디터 레이아웃 컴포넌트
 */
export default function CodeEditorLayout() {
  const { displayCode, isReadOnly, onCodeChangeAction, isDisabled, onCreateSnapshotAction } = useEditor();
  const { currentVersion, currentSnapshot } = useSnapshot();
  const { 
    isSidebarOpen, 
    activePanel, 
    leftWidth, 
    rightWidth,
    onSidebarToggle,
    onPanelChange,
    onLeftResize,
    onRightResize 
  } = useLayout();
  const renderEditor = () => {
    if (isReadOnly && currentSnapshot) {
      return (
        <SnapshotEditor
          code={displayCode}
          title={currentSnapshot.title}
          description={currentSnapshot.description}
          isSidebarOpen={isSidebarOpen}
          isRightPanelOpen={!!activePanel}
        />
      );
    } else {
      return (
        <LiveSessionEditor
          code={displayCode}
          onCodeChangeAction={onCodeChangeAction}
          isDisabled={isDisabled}
          onCreateSnapshotAction={onCreateSnapshotAction}
          isSidebarOpen={isSidebarOpen}
          isRightPanelOpen={!!activePanel}
        />
      );
    }
  };

  const renderActivePanel = () => {
    switch (activePanel) {
      case "comments":
        return <QuestionsPanel />;
      case "voting":
        return <VotingPanel />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* 좌측 사이드바 영역 */}
      <div
        className="h-full relative flex"
        style={{
          width: isSidebarOpen ? `${leftWidth}px` : "3rem",
          minWidth: isSidebarOpen ? `${leftWidth}px` : "3rem",
          maxWidth: isSidebarOpen ? "50vw" : "3rem",
          flexShrink: 0,
          transition: "all 200ms ease-in-out",
        }}
      >
        {/* 아이콘 메뉴 */}
        <div className="w-12 h-full border-r flex-shrink-0 z-20 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <div className="flex flex-col items-center py-4">
            <button
              onClick={onSidebarToggle}
              className={`p-3 rounded-lg transition-colors ${
                isSidebarOpen
                  ? "bg-blue-500/20 text-blue-600"
                  : "text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
              title="snapshot"
            >
              <FaHistory size={18} />
            </button>
          </div>
        </div>

        {/* 버전 관리 패널 */}
        <div
          className={`
          h-full border-r
          transition-transform duration-200 ease-in-out relative
          bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800
          ${isSidebarOpen ? "w-[calc(100%-3rem)]" : "w-0 overflow-hidden"}
        `}
        >
          <VersionsPanel />
        </div>

        {/* 좌측 크기 조절 핸들 */}
        {isSidebarOpen && (
          <ResizeHandle
            onResize={onLeftResize}
            direction="left"
            className="bg-gray-200 dark:bg-gray-800 z-30"
          />
        )}
      </div>

      {/* 메인 컨텐츠 (코드 에디터) */}
      <div className="flex-1 h-full min-w-[300px] relative p-2 overflow-hidden bg-gray-50 dark:bg-gray-900">
        <div className="h-full rounded-lg overflow-hidden">
          {renderEditor()}
        </div>
      </div>

      {/* 우측 패널 영역 */}
      <div className="relative w-12">
        {/* 우측 고정 영역 */}
        <div className="fixed right-0 top-16 bottom-0 w-12 border-l flex flex-col items-center py-4 z-20 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <button
            onClick={() => onPanelChange("comments")}
            className={`p-3 mb-2 rounded-lg transition-colors ${
              activePanel === "comments"
                ? "bg-blue-500/20 text-blue-600"
                : "text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
            } ${
              currentVersion === null ? "opacity-50 cursor-not-allowed" : ""
            }`}
            title={
              currentVersion === null
                ? "Only available in snapshot mode"
                : "Questions"
            }
            disabled={currentVersion === null}
          >
            <FaQuestion size={18} />
          </button>
          <button
            onClick={() => onPanelChange("voting")}
            className={`p-3 rounded-lg transition-colors ${
              activePanel === "voting"
                ? "bg-blue-500/20 text-blue-600"
                : "text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
            } ${
              currentVersion === null ? "opacity-50 cursor-not-allowed" : ""
            }`}
            title={
              currentVersion === null
                ? "Only available in snapshot mode"
                : "Voting"
            }
            disabled={currentVersion === null}
          >
            <FaVoteYea size={18} />
          </button>
        </div>

        {/* 패널 컨텐츠 */}
        <div
          className={`fixed right-12 top-16 bottom-0 border-l
          transition-transform duration-200 ease-in-out flex
          bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800
          ${
            activePanel && currentVersion !== null
              ? "translate-x-0"
              : "translate-x-full"
          }
        `}
          style={{ width: `${rightWidth}px` }}
        >
          <ResizeHandle
            onResize={onRightResize}
            direction="right"
            className="bg-gray-200 dark:bg-gray-800"
          />
          <div className="flex-1 p-4 h-full ml-1">{renderActivePanel()}</div>
        </div>
      </div>
    </div>
  );
}
