"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { FaCode, FaCopy, FaCamera, FaCheck, FaEraser } from "react-icons/fa";
import CreateSnapshotModal from "./create-snapshot-modal";
import { detectLanguage } from "@/utils/detectLanguage";
import MonacoEditor from "./monaco-editor";
import { INITIAL_CODE } from "@/constants/initial-data";
import { LiveSessionEditorProps, SnapshotData } from "@/types/editor.type";
import { useThemeDetector } from "@/hooks/theme/useThemeDetector";

/**
 * 실시간 세션용 코드 에디터 컴포넌트
 */
export default function LiveSessionEditor({
  code,
  onCodeChangeAction,
  onCreateSnapshotAction,
  isDisabled = false,
}: LiveSessionEditorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState("javascript");
  const isDark = useThemeDetector();
  // 디바운스를 위한 타이머 ref
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 언어 감지 함수를 컴포넌트 내부에서 디바운스 처리
  const debouncedDetectLanguage = useCallback((newCode: string) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      const detected = detectLanguage(newCode);
      if (detected !== detectedLanguage) {
        setDetectedLanguage(detected);
      }
    }, 300);
  }, [detectedLanguage]);

  // 코드 변경 핸들러
  const handleCodeChange = useCallback(
      (newCode: string | undefined) => {
        if (newCode === undefined || newCode === code) return; // 같은 코드면 무시
        onCodeChangeAction(newCode);
      },
      [code, onCodeChangeAction]
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
    const handleKeyDown = (e: KeyboardEvent) => {
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
  const handleCreateSnapshot = (snapshotData: SnapshotData) => {
    onCreateSnapshotAction(snapshotData);
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
      console.error("복사 실패:", err);
    }
  };

  /**
   * 코드 초기화 처리
   */
  const handleClear = () => {
    handleCodeChange(INITIAL_CODE);
  };

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
        <MonacoEditor
          code={code}
          onChangeAction={handleCodeChange}
          language={detectedLanguage}
          isDark={isDark}
          isReadOnly={false}
        />
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
