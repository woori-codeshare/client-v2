"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { FaCode, FaCopy, FaCamera, FaCheck, FaEraser } from "react-icons/fa";
import CreateSnapshotModal from "./create-snapshot-modal";
import { detectLanguage } from "@/utils/detect-language";
import "../../styles/editor-theme.css";
import { useWebSocket } from "@/contexts/websocket-context";
import { DarkWriteableEditor, LightWriteableEditor } from "./variants";
import { INITIAL_CODE } from "@/constants/initial-data";

/**
 * 실시간 세션용 코드 에디터 컴포넌트
 */
export default function LiveSessionEditor({
  code,
  onCodeChange,
  onCreateSnapshot,
  isDisabled,
  isSidebarOpen,
  isRightPanelOpen,
  roomId,
}) {
  const { client, connected } = useWebSocket();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState("javascript");
  const [isDark, setIsDark] = useState(false);
  const editorRef = useRef(null);
  const [subscription, setSubscription] = useState(null);

  /**
   * 디바운스 함수 구현
   */
  function debounce(func, wait) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  // 언어 감지 함수를 컴포넌트 내부에서 디바운스 처리
  const debouncedDetectLanguage = useCallback(
    debounce((newCode) => {
      const detected = detectLanguage(newCode);
      if (detected !== detectedLanguage) {
        setDetectedLanguage(detected);
      }
    }, 300),
    [detectedLanguage]
  );

  // 코드 업데이트 WebSocket 구독
  useEffect(() => {
    if (!client || !connected || !roomId || isDisabled) {
      console.log("WebSocket not ready or disabled:", {
        client: !!client,
        connected,
        roomId,
        isDisabled,
      });
      return;
    }

    try {
      console.log("Subscribing to code updates for room:", roomId);
      const newSubscription = client.subscribe(
        `/topic/room/${roomId}/code`,
        (message) => {
          try {
            const data = JSON.parse(message.body);
            console.log("Received code update:", data);
            if (data.eventType === "UPDATE" && data.code !== code) {
              console.log("Updating code...");
              onCodeChange(data.code);
            }
          } catch (error) {
            console.error("Failed to parse code update:", error);
          }
        }
      );

      setSubscription(newSubscription);

      return () => {
        console.log("Unsubscribing from code updates");
        if (newSubscription) {
          newSubscription.unsubscribe();
          setSubscription(null);
        }
      };
    } catch (error) {
      console.error("WebSocket subscription error:", error);
    }
  }, [client, connected, roomId, onCodeChange, isDisabled]);

  // 코드 변경 핸들러
  const handleCodeChange = useCallback(
    (newCode) => {
      if (newCode === code) return; // 같은 코드면 무시
      onCodeChange(newCode);

      // WebSocket을 통해 코드 변경 전송
      if (client && connected && roomId && !isDisabled) {
        try {
          console.log("Publishing code update:", {
            roomId,
            codeLength: newCode.length,
          });

          client.publish({
            destination: "/app/update.code",
            body: JSON.stringify({
              roomId: parseInt(roomId, 10),
              code: newCode,
            }),
          });
        } catch (error) {
          console.error("Failed to send code update:", error);
        }
      } else {
        console.log("Cannot send update:", {
          client: !!client,
          connected,
          roomId,
          isDisabled,
        });
      }
    },
    [
      client,
      connected,
      roomId,
      code,
      onCodeChange,
      debouncedDetectLanguage,
      isDisabled,
    ]
  );

  // 초기 언어 감지 및 코드 변경 시 언어 감지
  useEffect(() => {
    if (code) {
      debouncedDetectLanguage(code);
    }
  }, [code, debouncedDetectLanguage]);

  /**
   * 키보드 단축키 이벤트 핸들러 등록
   */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s" && !isDisabled) {
        e.preventDefault(); // 브라우저 기본 저장 동작 방지
        setIsModalOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isDisabled]);

  /**
   * 스냅샷 생성 처리
   */
  const handleCreateSnapshot = (snapshotData) => {
    onCreateSnapshot(snapshotData);
  };

  /**
   * 코드 복사 처리
   */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  /**
   * 코드 초기화 처리
   */
  const handleClear = () => {
    handleCodeChange(INITIAL_CODE);
  };

  // 사이드바나 우측 패널 상태 변경시 에디터 크기 재조정
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.layout();
    }
  }, [isSidebarOpen, isRightPanelOpen]);

  // 다크모드 감지 및 업데이트
  useEffect(() => {
    const updateTheme = () => {
      const isDarkMode = document.documentElement.classList.contains("dark");
      setIsDark(isDarkMode);
      if (editorRef.current) {
        editorRef.current.updateOptions({
          theme: isDarkMode ? "vs-dark" : "vs",
        });
      }
    };

    // 초기 테마 설정
    updateTheme();

    // MutationObserver로 html 클래스 변경 감지
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          updateTheme();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col h-full px-2 py-2">
      {/* 헤더 영역 */}
      <div className="flex items-center justify-between mb-4">
        {/* 왼쪽: 제목과 버튼들 */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <FaCode className="text-blue-500 dark:text-blue-400 text-2xl" />
            <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100">
              Live Session
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* 코드 복사 버튼 */}
            <button
              onClick={handleCopy}
              className="p-2 text-gray-600 dark:text-gray-400 
                hover:text-blue-500 dark:hover:text-blue-400 
                transition-colors rounded 
                hover:bg-gray-100 dark:hover:bg-gray-800"
              title={copied ? "Copied" : "Copy"}
            >
              {copied ? <FaCheck size={14} /> : <FaCopy size={14} />}
            </button>

            {/* 코드 초기화 버튼 */}
            {!isDisabled && (
              <button
                onClick={handleClear}
                className="p-2 text-gray-600 dark:text-gray-400 
                  hover:text-blue-500 dark:hover:text-blue-400 
                  transition-colors rounded 
                  hover:bg-gray-100 dark:hover:bg-gray-800"
                title="Clear Code"
              >
                <FaEraser size={14} />
              </button>
            )}

            {/* 스냅샷 생성 버튼 */}
            {!isDisabled && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="p-2 text-gray-600 dark:text-gray-400 
                  hover:text-blue-500 dark:hover:text-blue-400 
                  transition-colors rounded 
                  hover:bg-gray-100 dark:hover:bg-gray-800"
                title="Create Snapshot"
              >
                <FaCamera size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Monaco 에디터 영역 */}
      <div className="flex-1 relative">
        {isDark ? (
          <DarkWriteableEditor
            code={code}
            onChange={handleCodeChange}
            language={detectedLanguage}
          />
        ) : (
          <LightWriteableEditor
            code={code}
            onChange={handleCodeChange}
            language={detectedLanguage}
          />
        )}
      </div>

      {/* 스냅샷 생성 모달 */}
      <CreateSnapshotModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreateSnapshot={handleCreateSnapshot}
      />
    </div>
  );
}
