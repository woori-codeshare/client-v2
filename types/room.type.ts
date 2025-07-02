/**
 * 방 생성 요청 DTO
 */
export interface CreateRoomRequestDTO {
  title: string;
  password: string;
}

/**
 * 방 생성 응답 DTO
 */
export interface CreateRoomResponseDTO {
  roomId: number;
  uuid: string;
  title: string;
  sharedUrl: string;
  createdAt: string;
}

/**
 * 방 참가 응답 DTO
 */
export interface EnterRoomResponseDTO {
  roomId: number;
  uuid: string;
  title: string;
  createdAt: string;
}
