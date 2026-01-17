import { useState, useEffect, useCallback, type FormEvent } from "react";
import {
  FaRegClock,
  FaUserCircle,
  FaReply,
  FaPaperPlane,
  FaEdit,
  FaTrash,
  FaCheck,
} from "react-icons/fa";
import { formatRelativeTime } from "@/utils/formatters";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { TIMERS } from "@/constants/ui.constants";

/**
 * 개별 질문/답변 메시지를 표시하는 컴포넌트
 * @param {Object} message - 표시할 메시지 데이터
 * @param {boolean} isReply - 답글 여부 (true: 답글, false: 원글)
 * @param {Function} onReply - 답글 작성 이벤트 핸들러
 * @param {Object} replyingTo - 현재 답글 작성 중인 메시지 정보
 * @param {Function} handleSubmit - 답글 제출 이벤트 핸들러
 * @param {Function} onEdit - 수정 핸들러
 * @param {string} editingId - 현재 수정 중인 메시지 ID
 * @param {Function} onDelete - 삭제 핸들러
 * @param {Function} onToggleSolved - 해결 상태 토글 핸들러
 */
interface ReplyDraft {
  commentId: number;
  content: string;
}

interface MessageData {
  commentId: number;
  content: string;
  createdAt?: string;
  solved?: boolean;
  replies?: MessageData[];
}

interface MessageItemProps {
  message: MessageData;
  isReply?: boolean;
  onReply: (messageData: number | ReplyDraft) => void;
  replyingTo: ReplyDraft | null;
  handleSubmit: (e: FormEvent<HTMLFormElement>, parentId?: number | null) => void;
  onEdit: (commentId: number | null, content?: string) => void;
  editingId: number | null;
  onDelete: (commentId: number) => void;
  onToggleSolved: (commentId: number, solved: boolean) => void;
}

export default function MessageItem({
  message,
  isReply = false,
  onReply,
  replyingTo,
  handleSubmit,
  onEdit, // 새로운 prop: 수정 핸들러
  editingId, // 새로운 prop: 현재 수정 중인 메시지 ID
  onDelete, // 새로운 prop 추가
  onToggleSolved, // 새로운 prop 추가
}: MessageItemProps) {
  // 상대적 시간 표시 상태 (예: "5분 전")
  const [formattedTime, setFormattedTime] = useState("");

  // 수정 중인 content 상태
  const [editContent, setEditContent] = useState(message.content);

  // 시간 형식 업데이트 함수
  const updateTime = useCallback(() => {
    if (!message?.createdAt) return;
    const timestamp = new Date(message.createdAt).getTime();
    setFormattedTime(formatRelativeTime(timestamp));
  }, [message?.createdAt]);

  // 주기적으로 시간 형식 업데이트
  useEffect(() => {
    updateTime();
    const timer = setInterval(updateTime, TIMERS.MESSAGE_UPDATE_INTERVAL);
    return () => clearInterval(timer);
  }, [updateTime]);

  // 수정 가능 여부 체크 (대댓글이 없고 원글인 경우에만 수정 가능)
  const canEdit =
    !isReply && (!message.replies || message.replies.length === 0);

  useEffect(() => {
    setEditContent(message.content);
  }, [message.content]);

  return (
    // 메시지 컨테이너 (답글일 경우 왼쪽 패딩 추가)
    <div className={`flex gap-3 items-start ${isReply ? "pl-8" : ""}`}>
      {/* 사용자 아바타 */}
      <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 text-gray-500 dark:text-gray-400">
        <FaUserCircle size={32} />
      </div>

      {/* 메시지 내용 영역 */}
      <div className="flex-1">
        {editingId === message.commentId ? (
          // 수정 모드 UI
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onEdit(message.commentId, editContent);
            }}
            className="mb-2"
          >
            <Input
              type="text"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="text-sm mb-2"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                onClick={() => onEdit(null)}
                variant="ghost"
                size="sm"
              >
                취소
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={
                  !editContent.trim() || editContent === message.content
                }
              >
                수정
              </Button>
            </div>
          </form>
        ) : (
          // 일반 메시지 UI
          <div
            className={`p-4 rounded-lg border transition-colors ${
              message.solved
                ? "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20"
                : "bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-700/50"
            }`}
          >
            <p className="text-sm text-gray-700 dark:text-gray-200">
              {message.content}
            </p>
          </div>
        )}

        {/* 메시지 메타 정보 (시간, 답글 버튼) */}
        <div className="flex items-center gap-2 mt-1 text-xs text-gray-600 dark:text-gray-500">
          <FaRegClock size={10} />
          <span>{formattedTime}</span>
          <div className="flex items-center gap-2 ml-auto">
            {!isReply && (
              <>
                <Button
                  onClick={() =>
                    onToggleSolved(message.commentId, !message.solved)
                  }
                  variant="ghost"
                  size="sm"
                  className={`!px-2 !py-1 flex items-center gap-1 ${
                    message.solved
                      ? "!text-green-500"
                      : "!text-gray-500 hover:!text-green-500 dark:!text-gray-400 dark:hover:!text-green-400"
                  }`}
                  title={message.solved ? "질문 해결 취소" : "질문 해결 완료"}
                >
                  <FaCheck size={10} />
                  <span>{message.solved ? "해결됨" : "해결"}</span>
                </Button>
                {canEdit && (
                  <>
                    <Button
                      onClick={() => onEdit(message.commentId)}
                      variant="ghost"
                      size="sm"
                      className="!px-2 !py-1 flex items-center gap-1 !text-gray-500 hover:!text-blue-500 dark:!text-gray-400 dark:hover:!text-blue-400"
                    >
                      <FaEdit size={10} />
                      <span>수정</span>
                    </Button>
                    <Button
                      onClick={() => {
                        if (window.confirm("정말 삭제하시겠습니까?")) {
                          onDelete(message.commentId);
                        }
                      }}
                      variant="ghost"
                      size="sm"
                      className="!px-2 !py-1 flex items-center gap-1 !text-gray-500 hover:!text-red-500 dark:!text-gray-400 dark:hover:!text-red-400"
                    >
                      <FaTrash size={10} />
                      <span>삭제</span>
                    </Button>
                  </>
                )}
              </>
            )}
            {!isReply && (
              <Button
                onClick={() => onReply(message.commentId)}
                variant="ghost"
                size="sm"
                className="!px-2 !py-1 flex items-center gap-1 !text-gray-500 hover:!text-blue-500 dark:!text-gray-400 dark:hover:!text-blue-400"
              >
                <FaReply size={10} />
                <span>답글</span>
              </Button>
            )}
          </div>
        </div>

        {/* 답글 작성 폼 (답글 작성 중일 때만 표시) */}
        {replyingTo?.commentId === message.commentId && (
          <form
            onSubmit={(e) => handleSubmit(e, message.commentId)}
            className="mt-2 flex gap-2"
          >
            <Input
              type="text"
              value={replyingTo?.content ?? ""}
              onChange={(e) =>
                onReply({
                  commentId: message.commentId,
                  content: e.target.value,
                })
              }
              placeholder="Write a reply..."
              className="flex-1 text-sm"
              fullWidth={false}
              autoFocus
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!replyingTo?.content?.trim()}
              className="!p-2"
            >
              <FaPaperPlane size={16} />
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
