"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { INITIAL_CODE } from "@/constants/initial-data";
import { INITIAL_WIDTHS, PANEL_CONFIGS } from "@/constants/panel-config";
import CodeEditorLayout from "@/components/layout/code-editor-layout";
import RoomEnterModal from "@/components/features/room/room-enter-modal";
import { RoomStorage } from "@/utils/room-storage";
import { useWebSocket } from "@/contexts/websocket-context";
import { toast } from "react-toastify";
import { sanitizeCode, desanitizeCode } from "@/utils/code-formatter";

/**
 * 코드 공유 방 페이지
 * 실시간 코드 공유와 협업 기능을 제공하는 페이지 컴포넌트
 */
export default function CodeShareRoomPage() {
  const router = useRouter();
  const { id } = useParams();
  const { client, connected } = useWebSocket();

  // Room state
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [showEnterModal, setShowEnterModal] = useState(false);
  const [roomInfo, setRoomInfo] = useState(null);

  // Editor state
  const [code, setCode] = useState(desanitizeCode(INITIAL_CODE));
  const [snapshots, setSnapshots] = useState([]);
  const [currentVersion, setCurrentVersion] = useState(null);

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
    } catch (error) {
      console.error("Error fetching snapshots:", error);
    }
  }, [roomInfo?.uuid, isAuthorized]);

  // 방 입장 후 초기 스냅샷 로드
  useEffect(() => {
    fetchSnapshots();
  }, [fetchSnapshots]);

  // 방 입장 후 WebSocket 구독으로 실시간 질문 업데이트 (스냅샷 새로고침 트리거)
  useEffect(() => {
    if (!client || !connected || !roomInfo?.uuid || !isAuthorized) {
      return;
    }

    console.log(`WebSocket 질문 구독 시작: ${roomInfo.uuid}`);

    const subscription = client.subscribe(
      `/topic/room/${roomInfo.uuid}/comments`,
      (message) => {
        try {
          const data = JSON.parse(message.body);
          console.log("WebSocket으로 질문 업데이트 수신:", data);

          // 서버에서 보내는 데이터 구조: { roomId, snapshotId, commentId, comment, eventType, timestamp }
          if (data.snapshotId && data.eventType) {
            const targetSnapshotId = data.snapshotId;
            const commentData = data.comment; // CommentListResponse 객체
            const commentId = data.commentId;

            setSnapshots((prev) => {
              return prev.map((snapshot) => {
                if (snapshot.id === targetSnapshotId) {
                  let updatedComments = [...(snapshot.comments || [])];

                  switch (data.eventType) {
                    case "COMMENT_CREATED":
                    case "REPLY_CREATED":
                      // 새 댓글/답글 추가 (중복 체크)
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
                      // 댓글 수정
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
                      // 댓글 삭제 (commentId만 있고 comment 객체는 null)
                      updatedComments = updatedComments.filter(
                        (comment) => comment.commentId !== commentId
                      );
                      break;

                    case "COMMENT_RESOLVED":
                      // 해결 상태 변경
                      if (commentData) {
                        updatedComments = updatedComments.map((comment) =>
                          comment.commentId === commentData.commentId
                            ? { ...comment, solved: commentData.solved }
                            : comment
                        );
                      }
                      break;

                    case "COMMENT_UNRESOLVED":
                      // 미해결 상태 변경
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

            // 이벤트 타입별 토스트 메시지
            const toastMessages = {
              COMMENT_CREATED: "새로운 질문이 등록되었습니다.",
              REPLY_CREATED: "새로운 답변이 등록되었습니다.",
              COMMENT_UPDATED: "댓글이 수정되었습니다.",
              COMMENT_DELETED: "댓글이 삭제되었습니다.",
              COMMENT_RESOLVED: "댓글이 해결되었습니다.",
              COMMENT_UNRESOLVED: "댓글이 미해결로 변경되었습니다.",
            };

            const message =
              toastMessages[data.eventType] || "질문이 업데이트되었습니다.";
            toast.success(message, {
              position: "top-right",
              autoClose: 2000,
            });
          } else {
            // 데이터 구조가 예상과 다른 경우 fallback으로 전체 새로고침
            console.log("예상과 다른 데이터 구조, 전체 새로고침:", data);
            fetchSnapshots();
          }
        } catch (error) {
          console.error("WebSocket 질문 메시지 파싱 실패:", error);
          // 에러 발생 시 fallback으로 전체 새로고침
          fetchSnapshots();
        }
      }
    );

    return () => {
      if (subscription) {
        console.log("WebSocket 질문 구독 해제");
        subscription.unsubscribe();
      }
    };
  }, [client, connected, roomInfo?.uuid, isAuthorized, fetchSnapshots]);

  // 방 입장 후 WebSocket 구독으로 실시간 스냅샷 업데이트
  useEffect(() => {
    if (!client || !connected || !roomInfo?.uuid || !isAuthorized) {
      console.log("WebSocket 스냅샷 구독 준비 중:", {
        client: !!client,
        connected,
        roomUuid: roomInfo?.uuid,
        isAuthorized,
      });
      return;
    }

    console.log(`WebSocket 스냅샷 구독 시작: ${roomInfo.uuid}`);

    const subscription = client.subscribe(
      `/topic/room/${roomInfo.uuid}/snapshots`,
      (message) => {
        try {
          const data = JSON.parse(message.body);
          console.log("WebSocket으로 스냅샷 업데이트 수신:", data);

          // 서버에서 SnapshotCreatedResponse 객체를 직접 보냄
          if (data.snapshot && data.roomId) {
            const newSnapshot = {
              id: data.snapshot.snapshotId,
              createdAt: new Date(data.snapshot.createdAt),
              title: data.snapshot.title,
              description: data.snapshot.description,
              code: data.snapshot.code,
              comments: data.snapshot.comments || [],
            };

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

            toast.success(
              `새로운 스냅샷이 생성되었습니다: ${newSnapshot.title}`,
              {
                position: "top-right",
                autoClose: 4000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
              }
            );
          }
        } catch (error) {
          console.error("WebSocket 스냅샷 메시지 파싱 실패:", error);
        }
      }
    );

    console.log("WebSocket 스냅샷 구독 완료");

    // 컴포넌트 언마운트 시 구독 해제
    return () => {
      if (subscription) {
        console.log("WebSocket 스냅샷 구독 해제");
        subscription.unsubscribe();
      }
    };
  }, [client, connected, roomInfo?.uuid, isAuthorized]);

  // 방 입장 후 WebSocket 구독으로 실시간 투표 업데이트
  useEffect(() => {
    if (!client || !connected || !roomInfo?.uuid || !isAuthorized) {
      return;
    }

    console.log(`WebSocket 투표 구독 시작: ${roomInfo.uuid}`);

    const subscription = client.subscribe(
      `/topic/room/${roomInfo.uuid}/votes`,
      (message) => {
        try {
          const data = JSON.parse(message.body);
          console.log("WebSocket으로 투표 업데이트 수신:", data);

          // 투표 결과가 업데이트되면 스냅샷을 새로고침
          // 투표는 스냅샷에 직접 포함되지 않으므로 전체 새로고침
          fetchSnapshots();

          toast.success("투표 결과가 업데이트되었습니다.", {
            position: "top-right",
            autoClose: 2000,
          });
        } catch (error) {
          console.error("WebSocket 투표 메시지 파싱 실패:", error);
        }
      }
    );

    return () => {
      if (subscription) {
        console.log("WebSocket 투표 구독 해제");
        subscription.unsubscribe();
      }
    };
  }, [client, connected, roomInfo?.uuid, isAuthorized, fetchSnapshots]);

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
    if (!code) return;

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
          code: sanitizeCode(code),
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
      setCurrentVersion(null);
      setActivePanel(null); // 현재 세션으로 돌아갈 때는 패널 닫기
      return;
    }

    if (snapshots[index]) {
      setCode(desanitizeCode(snapshots[index].code));
      setCurrentVersion(index);
    }
  };

  return (
    <>
      <CodeEditorLayout
        code={code}
        onCodeChange={setCode}
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
