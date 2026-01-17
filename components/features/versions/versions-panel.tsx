"use client";

import { FaHistory } from "react-icons/fa";
import SnapshotItem from "./snapshot-item";
import LiveSessionButton from "./live-session-button";
import { motion, AnimatePresence } from "framer-motion";
import { useSnapshot } from "@/contexts/snapshot-context";

/**
 * 코드 스냅샷 기록과 라이브 세션 선택을 관리하는 패널 컴포넌트
 */
export default function VersionsPanel() {
  const { snapshots, currentVersion, onVersionChange } = useSnapshot();
  const isLiveSessionActive = currentVersion === null;

  /**
   * 저장된 스냅샷으로 전환
   * @param {number} index - 사용자가 선택한 스냅샷 인덱스
   */
  const switchToSnapshot = (index: number) => {
    onVersionChange(index);
  };

  /**
   * 라이브 코딩 세션으로 전환
   */
  const switchToLiveSession = () => {
    onVersionChange(null);
  };

  return (
    <div className="h-full flex flex-col text-gray-800 dark:text-gray-100">
      {/* 상단 고정 영역 */}
      <div className="flex-shrink-0 p-2">
        {/* Live Session 버튼 */}
        <LiveSessionButton
          isActive={isLiveSessionActive}
          onClick={switchToLiveSession}
        />

        {/* 구분선 */}
        <div className="h-px bg-gray-200 dark:bg-gray-800 my-4" />

        {/* 스냅샷 헤더 */}
        <div className="group p-2.5 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="text-blue-500">
              <FaHistory size={15} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-medium text-blue-500">Snapshots</span>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {snapshots.length} versions
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 스크롤 가능한 스냅샷 리스트 영역 */}
      <motion.div className="flex-1 overflow-y-auto px-2" layout>
        <div className="space-y-1 py-2">
          <AnimatePresence mode="popLayout" initial={false}>
            {snapshots.map((snapshot, index) => (
              <SnapshotItem
                key={snapshot.id}
                snapshot={snapshot}
                isActive={currentVersion === index}
                onClick={() => switchToSnapshot(index)}
                layoutId={`snapshot-${snapshot.id}`}
              />
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
