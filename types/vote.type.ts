/**
 * 투표 타입
 */
export enum VoteType {
  POSITIVE = "POSITIVE",
  NEUTRAL = "NEUTRAL",
  NEGATIVE = "NEGATIVE",
}

/**
 * 투표 진행 요청 DTO
 */
export interface VoteRequestDTO {
  voteType: VoteType;
}

/**
 * 투표 진행 응답 DTO
 */
export interface VoteResponseDTO {
  voteId: number;
  voteType: VoteType;
}

/**
 * 투표 결과 응답 DTO
 */
export interface VoteResultResponseDTO {
  voteId: number;
  voteCounts: Record<string, number>;
}
