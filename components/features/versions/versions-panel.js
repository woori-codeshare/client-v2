"use client";

import { useState, useEffect, useCallback } from "react";
import { FaHistory } from "react-icons/fa";
import SnapshotItem from "./snapshot-item";
import LiveSessionButton from "./live-session-button";
import { motion, AnimatePresence } from "framer-motion";
import { useWebSocket } from "@/contexts/websocket-context";
import { toast } from "react-toastify";

/**
 * 코드 스냅샷 기록과 라이브 세션 선택을 관리하는 패널 컴포넌트
 * @param {Object} props
 * @param {string} props.roomUuid - 방 UUID
 * @param {Array} props.snapshots - 저장된 코드 스냅샷 배열
 * @param {number|null} props.currentVersion - 현재 선택된 스냅샷 인덱스 (null일 경우 라이브 세션)
 * @param {Function} props.setCurrentVersion - 버전 변경 상태 업데이트 함수
 * @param {Function} props.onSnapshotsUpdate - 스냅샷 업데이트 콜백 함수
 */
export default function VersionsPanel({
  roomUuid,
  snapshots: externalSnapshots,
  currentVersion,
  setCurrentVersion,
  onSnapshotsUpdate,
}) {
  const { client, connected } = useWebSocket();
  const [snapshots, setSnapshots] = useState(externalSnapshots || []);
  const isLiveSessionActive = currentVersion === null;

  // 현재 선택된 스냅샷의 ID를 저장
  const selectedSnapshotId =
    currentVersion !== null ? snapshots[currentVersion]?.id : null;

  // 초기 스냅샷 로드 (한 번만 실행)
  useEffect(() => {
    const fetchInitialSnapshots = async () => {
      if (!roomUuid) {
        console.log("Room UUID is not set");
        return;
      }

      try {
        const response = await fetch(`/api/rooms/${roomUuid}/snapshots`);
        const data = await response.json();

        if (!response.ok) {
          console.error("Failed to fetch snapshots:", data.error);
          return;
        }

        const formattedSnapshots = data.data
          .map((snapshot) => ({
            id: snapshot.snapshotId,
            createdAt: new Date(snapshot.createdAt),
            title: snapshot.title,
            description: snapshot.description,
            code: snapshot.code,
            comments: snapshot.comments || [],
          }))
          .sort((a, b) => b.createdAt - a.createdAt);

        setSnapshots(formattedSnapshots);
        onSnapshotsUpdate(formattedSnapshots);
      } catch (error) {
        console.error("Error fetching initial snapshots:", error);
      }
    };

    fetchInitialSnapshots();
  }, [roomUuid, onSnapshotsUpdate]);

  // WebSocket 구독을 통한 실시간 스냅샷 업데이트
  useEffect(() => {
    if (!client || !connected || !roomUuid) return;

    console.log(
      `[WebSocket] 스냅샷 구독 시작: /topic/room/${roomUuid}/snapshots`
    );

    const subscription = client.subscribe(
      `/topic/room/${roomUuid}/snapshots`,
      (message) => {
        try {
          const data = JSON.parse(message.body);
          console.log("[WebSocket] 스냅샷 생성 알림 수신:", data);
          console.log("[WebSocket] 전체 메시지 상세:", {
            timestamp: data.timestamp,
            timestampType: typeof data.timestamp,
            snapshotCreatedAt: data.snapshot?.createdAt,
            snapshotCreatedAtType: typeof data.snapshot?.createdAt,
            fullData: data,
          });

          if (data.snapshot) {
            // timestamp가 있으면 우선 사용, 없으면 snapshot.createdAt 사용
            const createdAtValue = data.timestamp || data.snapshot.createdAt;

            const newSnapshot = {
              id: data.snapshot.snapshotId,
              createdAt: new Date(createdAtValue),
              title: data.snapshot.title,
              description: data.snapshot.description,
              code: data.snapshot.code,
              comments: data.snapshot.comments || [],
            };

            console.log("[WebSocket] 시간 정보:", {
              timestamp: data.timestamp,
              snapshotCreatedAt: data.snapshot.createdAt,
              usedValue: createdAtValue,
              parsedDate: new Date(createdAtValue),
              isValidDate: !isNaN(new Date(createdAtValue).getTime()),
            });

            console.log("[WebSocket] 새 스냅샷 추가:", newSnapshot);

            // 토스트 알림 표시
            toast.success("새로운 스냅샷이 생성되었습니다.", {
              position: "top-right",
              autoClose: 4000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
            });

            setSnapshots((prevSnapshots) => {
              const updatedSnapshots = [newSnapshot, ...prevSnapshots];
              return updatedSnapshots;
            });
          }
        } catch (error) {
          console.error("[WebSocket] 스냅샷 업데이트 파싱 실패:", error);
        }
      }
    );

    return () => {
      console.log(
        `[WebSocket] 스냅샷 구독 해제: /topic/room/${roomUuid}/snapshots`
      );
      subscription.unsubscribe();
    };
  }, [client, connected, roomUuid]);

  // snapshots 상태가 변경될 때마다 외부 콜백 호출
  useEffect(() => {
    if (onSnapshotsUpdate) {
      onSnapshotsUpdate(snapshots);
    }
  }, [snapshots, onSnapshotsUpdate]);

  /**
   * 저장된 스냅샷으로 전환
   * @param {number} index - 사용자가 선택한 스냅샷 인덱스
   */
  const switchToSnapshot = (index) => {
    setCurrentVersion(index);
  };

  /**
   * 라이브 코딩 세션으로 전환
   */
  const switchToLiveSession = () => {
    setCurrentVersion(null);
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
