import { CommentResponseDTO } from './comment.type';

/**
 * 서버로부터 받는 스냅샷 상세 응답 DTO
 */
export interface SnapshotResponseDTO {
  snapshotId: number;
  title: string;
  description: string;
  code: string;
  createdAt: string; // ISO date string
  comments: CommentResponseDTO[];
}

/**
 * 스냅샷 생성 요청 DTO
 */
export interface CreateSnapshotRequestDTO {
  title: string;
  description: string;
  code: string;
}

/**
 * 스냅샷 생성 응답 DTO
 */
export interface CreateSnapshotResponseDTO {
  roomId: number;
  snapshotId: number;
  voteId: number;
  title: string;
  description: string;
  code: string;
  createdAt: string;
}
