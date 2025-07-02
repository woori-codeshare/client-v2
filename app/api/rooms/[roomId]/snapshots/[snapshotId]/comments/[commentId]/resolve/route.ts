import { NextRequest, NextResponse } from "next/server";
import { ResolveCommentRequestDTO, ResolveCommentResponseDTO } from "@/types/comment.type";

interface ResolveParams {
  params: {
    roomId: string;
    snapshotId: string;
    commentId: string;
  };
}

/**
 * 댓글 해결 상태 변경 요청
 */
export async function PATCH(
  request: NextRequest,
  { params }: ResolveParams
) {
  try {
    const { commentId } = await params;
    const body = (await request.json()) as ResolveCommentRequestDTO;

    console.log("댓글 해결 상태 변경 요청...");

    const API_URL = process.env.NEXT_PUBLIC_API_URL;
    const response = await fetch(
      `${API_URL}/api/v1/comments/${commentId}/resolve`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ solved: body.solved }),
      }
    );

    const data = await response.json();
    console.log("댓글 해결 상태 변경 요청 결과:", data);

    if (!response.ok) {
      return NextResponse.json(
        { error: data.errorMessage || "해결 상태 변경에 실패했습니다." },
        { status: response.status }
      );
    }

    return NextResponse.json({
      message: "해결 상태가 성공적으로 변경되었습니다.",
      data: data.data as ResolveCommentResponseDTO,
    });
  } catch (error) {
    console.error("댓글 해결 상태 변경 중 에러가 발생했습니다:", error);

    return NextResponse.json(
      { error: "서버 에러가 발생했습니다." },
      { status: 500 }
    );
  }
}
