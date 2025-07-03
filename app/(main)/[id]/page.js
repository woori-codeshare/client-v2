"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { INITIAL_CODE } from "@/constants/initial-data";
import { INITIAL_WIDTHS, PANEL_CONFIGS } from "@/constants/panel-config";
import CodeEditorLayout from "@/components/layout/code-editor-layout";
import RoomEnterModal from "@/components/features/room/room-enter-modal";
import { RoomStorage } from "@/utils/room-storage";
import { useWebSocketManager } from "@/hooks/useWebSocketManager";
import { toast } from "react-toastify";
import { sanitizeCode, desanitizeCode } from "@/utils/code-formatter";

/**
 * 코드 공유 방 페이지
 * 실시간 코드 공유와 협업 기능을 제공하는 페이지 컴포넌트
 */
export default function CodeShareRoomPage() {
  const router = useRouter();
  const { id } = useParams();

  // Room state
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [showEnterModal, setShowEnterModal] = useState(false);
  const [roomInfo, setRoomInfo] = useState(null);

  // Editor state
  const [liveCode, setLiveCode] = useState(desanitizeCode(INITIAL_CODE)); // 라이브 세션 코드
  const [snapshotCode, setSnapshotCode] = useState(""); // 스냅샷 코드
  const [snapshots, setSnapshots] = useState([]);
  const [currentVersion, setCurrentVersion] = useState(null);

  // 현재 표시될 코드 (라이브 코드 또는 스냅샷 코드)
  const displayCode = currentVersion !== null ? snapshotCode : liveCode;

  // Layout state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activePanel, setActivePanel] = useState(null);
  const [leftWidth, setLeftWidth] = useState(INITIAL_WIDTHS.LEFT);
  const [rightWidth, setRightWidth] = useState(INITIAL_WIDTHS.RIGHT);

  // 스냅샷이 선택되었는지 여부로 readOnly 상태 결정
  const isReadOnly = currentVersion !== null;

  // 방 입장 권한 체크
  useEffect(() => {
    const checkAccess = async () => {
      const hasAccess = RoomStorage.hasAccess(id);
      setIsAuthorized(hasAccess);

      if (hasAccess) {
        // 이미 인증된 사용자인 경우
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
  const fetchSnapshots = useCallback(async () => {
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
  const handleEnterRoom = async (password) => {
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

      const roomInfo = {
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
  const handleCodeUpdate = useCallback((newCode) => {
    console.log("라이브 코드 업데이트 적용 중...");
    setLiveCode(newCode);
  }, []);

  const handleSnapshotUpdate = useCallback((newSnapshot) => {
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

  const handleCommentUpdate = useCallback((data) => {
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
                  (c) => c.commentId === commentData.commentId
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
                updatedComments = updatedComments.map((comment) =>
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
                (comment) => comment.commentId !== commentId
              );
              break;

            case "COMMENT_RESOLVED":
              if (commentData) {
                updatedComments = updatedComments.map((comment) =>
                  comment.commentId === commentData.commentId
                    ? { ...comment, solved: commentData.solved }
                    : comment
                );
              }
              break;

            case "COMMENT_UNRESOLVED":
              if (commentData) {
                updatedComments = updatedComments.map((comment) =>
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

  const handleVoteUpdate = useCallback(
    (data) => {
      // 투표 결과가 업데이트되면 스냅샷을 새로고침
      fetchSnapshots();
    },
    [fetchSnapshots]
  );

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
    (newCode) => {
      if (newCode === displayCode || isReadOnly) return; // 같은 코드이거나 읽기 전용 모드면 무시

      // 라이브 코드만 업데이트 (라이브 세션일 때만 호출됨)
      setLiveCode(newCode);

      // WebSocket을 통해 코드 변경 전송
      publishCode(newCode);
    },
    [displayCode, isReadOnly, publishCode]
  );

  /**
   * 우측 패널(질문, 투표) 토글 처리
   */
  const togglePanel = (panelName) => {
    // current session(currentVersion이 null)인 경우 패널을 열지 않음
    if (currentVersion === null) return;

    setActivePanel(activePanel === panelName ? null : panelName);
  };

  /**
   * 좌측 사이드바(스냅샷) 크기 조절
   */
  const handleLeftResize = useCallback((delta) => {
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
  const handleRightResize = useCallback((delta) => {
    setRightWidth((prev) => {
      const newWidth = prev + delta;
      return Math.min(
        Math.max(newWidth, INITIAL_WIDTHS.MIN_RIGHT),
        window.innerWidth * INITIAL_WIDTHS.MAX_RIGHT_RATIO
      );
    });
  }, []);

  /**
   * 새로운 스냅샷 생성
   */
  const createSnapshot = async (snapshotData) => {
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
  const handleVersionChange = (index) => {
    if (index === null) {
      // 라이브 세션으로 돌아가기
      setCurrentVersion(null);
      setSnapshotCode(""); // 스냅샷 코드 초기화
      setActivePanel(null); // 현재 세션으로 돌아갈 때는 패널 닫기
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
      <CodeEditorLayout
        code={displayCode}
        onCodeChange={handleCodeChange}
        isDisabled={!isAuthorized}
        onCreateSnapshot={createSnapshot}
        isSidebarOpen={isSidebarOpen}
        onSidebarToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        isReadOnly={isReadOnly}
        leftWidth={leftWidth}
        rightWidth={rightWidth}
        onLeftResize={handleLeftResize}
        onRightResize={handleRightResize}
        activePanel={activePanel}
        onPanelChange={togglePanel}
        snapshots={snapshots}
        currentVersion={currentVersion}
        onVersionChange={handleVersionChange}
        roomUuid={roomInfo?.uuid}
        roomId={roomInfo?.roomId}
        snapshotId={
          currentVersion !== null ? snapshots[currentVersion]?.id : null
        }
      />

      <RoomEnterModal
        isOpen={showEnterModal}
        onClose={() => router.push("/")}
        onSubmit={handleEnterRoom}
      />
    </>
  );
}
