import { useEffect, useCallback } from "react";
import { useWebSocket } from "@/contexts/websocket-context";
import { toast } from "react-toastify";

/**
 * 웹소켓 구독을 관리하는 커스텀 훅
 */
const useSubscription = (client, destination, callback) => {
  useEffect(() => {
    if (!client || !destination) return;

    console.log(`구독 시작: ${destination}`);
    const subscription = client.subscribe(destination, (message) => {
      try {
        const data = JSON.parse(message.body);
        callback(data);
      } catch (error) {
        console.error("메시지 파싱 실패:", error);
      }
    });

    return () => {
      console.log(`구독 해제: ${destination}`);
      subscription.unsubscribe();
    };
  }, [client, destination, callback]);
};

/**
 * 웹소켓 관리 훅
 * 모든 웹소켓 구독과 메시지 발송을 통합 관리
 */
export const useWebSocketManager = ({
  roomInfo,
  isAuthorized,
  onCodeUpdate,
  onSnapshotUpdate,
  onCommentUpdate,
  onVoteUpdate,
}) => {
  const { client, connected } = useWebSocket();
  const isReady = client && connected && roomInfo?.roomId && isAuthorized;

  // 구독 대상 토픽들
  const codeDestination = isReady
    ? `/topic/room/${roomInfo.roomId}/code`
    : null;
  const snapshotDestination = isReady
    ? `/topic/room/${roomInfo.uuid}/snapshots`
    : null;
  const commentDestination = isReady
    ? `/topic/room/${roomInfo.uuid}/comments`
    : null;
  const voteDestination = isReady ? `/topic/room/${roomInfo.uuid}/votes` : null;

  // 코드 업데이트 구독
  useSubscription(
    client,
    codeDestination,
    useCallback(
      (data) => {
        console.log("코드 업데이트 수신:", data);
        if (data.eventType === "UPDATE") {
          console.log("라이브 코드 업데이트 적용 중...");
          onCodeUpdate(data.code);
        }
      },
      [onCodeUpdate]
    )
  );

  // 스냅샷 업데이트 구독
  useSubscription(
    client,
    snapshotDestination,
    useCallback(
      (data) => {
        console.log("스냅샷 업데이트 수신:", data);
        if (data.snapshot && data.roomId) {
          // 유효한 스냅샷 ID가 있는지 확인
          if (!data.snapshot.snapshotId) {
            console.warn(
              "스냅샷에 유효한 ID가 없어 무시됩니다:",
              data.snapshot
            );
            return;
          }

          const newSnapshot = {
            id: data.snapshot.snapshotId,
            createdAt: new Date(data.snapshot.createdAt),
            title: data.snapshot.title,
            description: data.snapshot.description,
            code: data.snapshot.code,
            comments: data.snapshot.comments || [],
          };

          console.log("새 스냅샷을 상태에 추가:", newSnapshot);
          onSnapshotUpdate(newSnapshot);

          toast.success(
            `새로운 스냅샷이 생성되었습니다: ${newSnapshot.title}`,
            {
              position: "top-right",
              autoClose: 2000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
            }
          );
        }
      },
      [onSnapshotUpdate]
    )
  );

  // 댓글 업데이트 구독
  useSubscription(
    client,
    commentDestination,
    useCallback(
      (data) => {
        console.log("댓글 업데이트 수신:", data);
        if (data.snapshotId && data.eventType) {
          onCommentUpdate(data);

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
        }
      },
      [onCommentUpdate]
    )
  );

  // 투표 업데이트 구독
  useSubscription(
    client,
    voteDestination,
    useCallback(
      (data) => {
        console.log("투표 업데이트 수신:", data);
        onVoteUpdate(data);

        toast.success("투표 결과가 업데이트되었습니다.", {
          position: "top-right",
          autoClose: 2000,
        });
      },
      [onVoteUpdate]
    )
  );

  // 코드 발송 함수
  const publishCode = useCallback(
    (newCode) => {
      if (!isReady || !roomInfo?.roomId) {
        console.log("코드 업데이트 전송 불가:", {
          client: !!client,
          connected,
          roomId: roomInfo?.roomId,
          isAuthorized,
        });
        return;
      }

      try {
        console.log("코드 업데이트 전송:", {
          roomId: roomInfo.roomId,
          codeLength: newCode.length,
        });

        client.publish({
          destination: "/app/update.code",
          body: JSON.stringify({
            roomId: parseInt(roomInfo.roomId, 10),
            code: newCode,
          }),
        });
      } catch (error) {
        console.error("코드 업데이트 전송 실패:", error);
      }
    },
    [client, connected, roomInfo?.roomId, isAuthorized, isReady]
  );

  return { publishCode };
};
