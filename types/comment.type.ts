/**
 * 서버로부터 받는 댓글 DTO
 */
export interface CommentResponseDTO {
  commentId: number;
  parentCommentId: number | null;
  content: string;
  solved: boolean;
  createdAt: string; // ISO date string
  updatedAt?: string;
}

/**
 * 댓글 생성 요청 DTO
 */
export interface CreateCommentRequestDTO {
  content: string;
  parentCommentId?: number | null;
}

/**
 * 댓글 생성 응답 DTO
 */
export interface CreateCommentResponseDTO {
  commentId: number;
  parentCommentId: number | null;
  snapshotId: number;
  content: string;
}

/**
 * 댓글 수정 요청 DTO
 */
export interface UpdateCommentRequestDTO {
  content: string;
}

/**
 * 댓글 수정 응답 DTO
 */
export interface UpdateCommentResponseDTO {
  commentId: number;
  content: string;
  updatedAt: string;
}

/**
 * 댓글 해결 상태 변경 요청 DTO
 */
export interface ResolveCommentRequestDTO {
  solved: boolean;
}

/**
 * 댓글 해결 상태 변경 응답 DTO
 */
export interface ResolveCommentResponseDTO {
  commentId: number;
  solved: boolean;
}
