"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { INITIAL_CODE } from "@/constants/initial-data";
import CodeEditorLayout from "@/components/layout/code-editor-layout";
import RoomEnterModal from "@/components/features/room/room-enter-modal";
import { RoomStorage, type RoomInfo } from "@/utils/roomStorage";
import { useWebSocketManager } from "@/hooks/websocket/useWebSocketManager";
import { useSidebarPanels, type PanelType } from "@/hooks/layout/useSidebarPanels";
import { toast } from "react-toastify";
import { sanitizeCode, desanitizeCode } from "@/utils/codeFormatter";
import { RoomProvider } from "@/contexts/room-context";
import { EditorProvider } from "@/contexts/editor-context";
import { SnapshotProvider } from "@/contexts/snapshot-context";
import { LayoutProvider } from "@/contexts/layout-context";
import { SnapshotData } from "@/types/editor.type";

/**
 * 코드 공유 방 페이지
 * 실시간 코드 공유와 협업 기능을 제공하는 페이지 컴포넌트
 */
export default function CodeShareRoomPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : params.id?.[0] || '';

  // Room state
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [showEnterModal, setShowEnterModal] = useState<boolean>(false);
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);

  // Editor state
  const [liveCode, setLiveCode] = useState<string>(desanitizeCode(INITIAL_CODE)); // 라이브 세션 코드
  const [snapshotCode, setSnapshotCode] = useState<string>(""); // 스냅샷 코드
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [currentVersion, setCurrentVersion] = useState<number | null>(null);

  // 현재 표시될 코드 (라이브 코드 또는 스냅샷 코드)
  const displayCode = currentVersion !== null ? snapshotCode : liveCode;

  // Layout state - 커스텀 훅으로 통합 관리
  const {
    isSidebarOpen,
    activePanel,
    leftWidth,
    rightWidth,
    toggleSidebar,
    togglePanel,
    handleLeftResize,
    handleRightResize,
    closePanel,
  } = useSidebarPanels();

  // 스냅샷이 선택되었는지 여부로 readOnly 상태 결정
  const isReadOnly = currentVersion !== null;

  // 방 입장 권한 체크
  useEffect(() => {
    const checkAccess = async (): Promise<void> => {
      const hasAccess = RoomStorage.hasAccess(id);
      setIsAuthorized(hasAccess);

      if (hasAccess) { // 유효한 스냅샷 ID가 있는지 확인
        toast.success("방에 입장하는데 성공하였습니다.");
      } else {
        setShowEnterModal(true);
      }
    };

    checkAccess();
  }, [id]);

  // 초기 roomInfo 로드
  useEffect(() => {
    const room = RoomStorage.getRoom(id);
    if (room) {
      setRoomInfo(room);
    }
  }, [id]);

  // 스냅샷을 서버에서 가져오는 함수
  const fetchSnapshots = useCallback(async (): Promise<void> => {
    if (!roomInfo?.uuid || !isAuthorized) {
      return;
    }

    try {
      const response = await fetch(`/api/rooms/${roomInfo.uuid}/snapshots`);
      const data = await response.json();

      if (!response.ok) {
        console.error("스냅샷 가져오기 실패:", data.error);
        return;
      }

      const formattedSnapshots = data.data
        .map((snapshot: any) => ({
          id: snapshot.snapshotId,
          createdAt: new Date(snapshot.createdAt),
          title: snapshot.title,
          description: snapshot.description,
          code: snapshot.code,
          comments: snapshot.comments || [],
        }))
        .sort((a: any, b: any) => b.createdAt - a.createdAt);

      setSnapshots(formattedSnapshots);
    } catch (error) {
      console.error("스냅샷 가져오기 오류:", error);
    }
  }, [roomInfo?.uuid, isAuthorized]);

  // 방 입장 후 초기 스냅샷 로드
  useEffect(() => {
    fetchSnapshots();
  }, [fetchSnapshots]);

  /**
   * 방 입장 처리
   */
  const handleEnterRoom = async (password: string): Promise<void> => {
    try {
      const response = await fetch(
        `/api/rooms/${id}/participants?password=${password}`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "방 입장에 실패했습니다.");
        return;
      }

      const roomInfo: RoomInfo = {
        uuid: id,
        roomId: data.data.roomId,
        title: data.data.title,
        isAuthorized: true,
      };

      RoomStorage.saveRoom(roomInfo);
      setRoomInfo(roomInfo);
      toast.success("방에 입장하는데 성공하였습니다.");
      setIsAuthorized(true);
      setShowEnterModal(false);
    } catch (error) {
      console.error("방 입장 실패:", error);
      toast.error("서버 오류가 발생했습니다.");
    }
  };

  // 웹소켓 콜백 함수들
  const handleCodeUpdate = useCallback((newCode: string) => {
    console.log("라이브 코드 업데이트 적용 중...");
    setLiveCode(newCode);
  }, []);

  const handleSnapshotUpdate = useCallback((newSnapshot: any) => {
    // 유효한 스냅샷 ID가 있는지 확인
    if (!newSnapshot.id) {
      console.warn("새 스냅샷에 유효한 ID가 없어 무시됩니다:", newSnapshot);
      return;
    }

    console.log("새 스냅샷을 상태에 추가:", newSnapshot);

    setSnapshots((prev) => {
      // 중복 체크 - 이미 존재하는 스냅샷인지 확인
      if (prev.some((snapshot) => snapshot.id === newSnapshot.id)) {
        console.log("이미 존재하는 스냅샷, 건너뛰기:", newSnapshot.id);
        return prev;
      }

      const updatedSnapshots = [newSnapshot, ...prev];
      console.log("스냅샷 목록 업데이트 완료:", updatedSnapshots);
      return updatedSnapshots;
    });
  }, []);

  const handleCommentUpdate = useCallback((data: any) => {
    const targetSnapshotId = data.snapshotId;
    const commentData = data.comment;
    const commentId = data.commentId;

    setSnapshots((prev) => {
      return prev.map((snapshot) => {
        if (snapshot.id === targetSnapshotId) {
          let updatedComments = [...(snapshot.comments || [])];

          switch (data.eventType) {
            case "COMMENT_CREATED":
            case "REPLY_CREATED":
              if (
                commentData &&
                !updatedComments.some(
                  (c: any) => c.commentId === commentData.commentId
                )
              ) {
                updatedComments.push({
                  commentId: commentData.commentId,
                  content: commentData.content,
                  createdAt: commentData.createdAt,
                  solved: commentData.solved || false,
                  parentCommentId: commentData.parentCommentId || 0,
                  replies: [],
                });
              }
              break;

            case "COMMENT_UPDATED":
              if (commentData) {
                updatedComments = updatedComments.map((comment: any) =>
                  comment.commentId === commentData.commentId
                    ? {
                        ...comment,
                        content: commentData.content,
                        updatedAt: commentData.updatedAt,
                      }
                    : comment
                );
              }
              break;

            case "COMMENT_DELETED":
              updatedComments = updatedComments.filter(
                (comment: any) => comment.commentId !== commentId
              );
              break;

            case "COMMENT_RESOLVED":
              if (commentData) {
                updatedComments = updatedComments.map((comment: any) =>
                  comment.commentId === commentData.commentId
                    ? { ...comment, solved: commentData.solved }
                    : comment
                );
              }
              break;

            case "COMMENT_UNRESOLVED":
              if (commentData) {
                updatedComments = updatedComments.map((comment: any) =>
                  comment.commentId === commentData.commentId
                    ? { ...comment, solved: false }
                    : comment
                );
              }
              break;
          }

          console.log(
            `스냅샷 ${targetSnapshotId}의 댓글 업데이트:`,
            updatedComments
          );
          return {
            ...snapshot,
            comments: updatedComments,
          };
        }
        return snapshot;
      });
    });
  }, []);

  const handleVoteUpdate = useCallback(() => {
    fetchSnapshots(); // 투표 결과가 업데이트되면 스냅샷을 새로고침
  }, [fetchSnapshots]);

  // 웹소켓 관리
  const { publishCode } = useWebSocketManager({
    roomInfo,
    isAuthorized,
    onCodeUpdate: handleCodeUpdate,
    onSnapshotUpdate: handleSnapshotUpdate,
    onCommentUpdate: handleCommentUpdate,
    onVoteUpdate: handleVoteUpdate,
  });

  /**
   * 코드 변경 처리 및 WebSocket으로 전송
   */
  const handleCodeChange = useCallback(
    (newCode: string) => {
      if (newCode === displayCode || isReadOnly) return; // 같은 코드이거나 읽기 전용 모드면 무시

      // 라이브 코드만 업데이트 (라이브 세션일 때만 호출됨)
      setLiveCode(newCode);

      // WebSocket을 통해 코드 변경 전송
      publishCode(newCode);
    },
    [displayCode, isReadOnly, publishCode]
  );

  /**
   * 우측 패널(질문, 투표) 토글 처리 - 스냅샷 선택시에만 가능
   */
  const handlePanelToggle = useCallback(
    (panelName: PanelType) => {
      // 현재 세션(currentVersion이 null)인 경우 패널을 열 수 없음
      const canOpen = currentVersion !== null;
      togglePanel(panelName, canOpen);
    },
    [currentVersion, togglePanel]
  );

  /**
   * 새로운 스냅샷 생성
   */
  const createSnapshot = async (snapshotData: SnapshotData): Promise<void> => {
    if (!liveCode) return; // 라이브 코드가 있어야 스냅샷 생성 가능

    const room = RoomStorage.getRoom(id);
    const roomId = room?.roomId;

    if (!roomId) {
      toast.error("방 정보를 찾을 수 없습니다.");
      return;
    }

    try {
      const response = await fetch(`/api/rooms/${id}/snapshots`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomId,
          title: snapshotData.title,
          description: snapshotData.description,
          code: sanitizeCode(liveCode), // 라이브 코드로 스냅샷 생성
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "스냅샷 생성에 실패했습니다.");
      }
    } catch (error) {
      toast.error("서버 오류가 발생했습니다.");
    }
  };

  /**
   * 스냅샷 버전 변경 처리
   */
  const handleVersionChange = (index: number | null): void => {
    if (index === null) {
      // 라이브 세션으로 돌아가기
      setCurrentVersion(null);
      setSnapshotCode(""); // 스냅샷 코드 초기화
      closePanel(); // 현재 세션으로 돌아갈 때는 패널 닫기
      return;
    }

    if (snapshots[index]) {
      // 스냅샷 선택
      setSnapshotCode(desanitizeCode(snapshots[index].code));
      setCurrentVersion(index);
    }
  };

  return (
    <>
      <RoomProvider roomInfo={roomInfo} isAuthorized={isAuthorized}>
        <EditorProvider
          liveCode={liveCode}
          snapshotCode={snapshotCode}
          displayCode={displayCode}
          isReadOnly={isReadOnly}
          isDisabled={!isAuthorized}
          onCodeChangeAction={handleCodeChange}
          onCreateSnapshotAction={createSnapshot}
        >
          <SnapshotProvider
            snapshots={snapshots}
            currentVersion={currentVersion}
            onVersionChange={handleVersionChange}
            fetchSnapshots={fetchSnapshots}
          >
            <LayoutProvider
              isSidebarOpen={isSidebarOpen}
              activePanel={activePanel}
              leftWidth={leftWidth}
              rightWidth={rightWidth}
              onSidebarToggle={toggleSidebar}
              onPanelChange={handlePanelToggle}
              onLeftResize={handleLeftResize}
              onRightResize={handleRightResize}
            >
              <CodeEditorLayout />
            </LayoutProvider>
          </SnapshotProvider>
        </EditorProvider>
      </RoomProvider>

      <RoomEnterModal
        isOpen={showEnterModal}
        onClose={() => router.push("/")}
        onSubmit={handleEnterRoom}
      />
    </>
  );
}
