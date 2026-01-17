"use client";

import { useState, useEffect } from "react";
import { FaHistory, FaCopy, FaCheck, FaInfoCircle } from "react-icons/fa";
import { detectLanguage } from "@/utils/detectLanguage";
import MonacoEditor from "./monaco-editor";
import { SnapshotEditorProps } from "@/types/editor.type";
import { useThemeDetector } from "@/hooks/theme/useThemeDetector";

/**
 * 스냅샷 전용 코드 에디터 컴포넌트 (읽기 전용)
 */
export default function SnapshotEditor({
  code,
  title,
  description,
}: SnapshotEditorProps) {
  const [copied, setCopied] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState("javascript");
  const isDark = useThemeDetector();
  // 초기 언어 감지
  useEffect(() => {
    if (code) {
      const detected = detectLanguage(code);
      setDetectedLanguage(detected);
    }
  }, [code]);

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

  return (
    <div className="flex flex-col h-full px-2 py-2">
      {/* 헤더 영역 */}
      <div className="flex items-center justify-between mb-4">
        {/* 왼쪽: 제목과 버튼들 */}
        <div className="flex items-center">
          <FaHistory className="text-blue-500 dark:text-blue-400 text-2xl" />
          <div className="flex items-center ml-3">
            <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100">
              Snapshot: {title}
            </h2>
            {description && (
              <div className="relative group ml-2">
                <button className="p-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400 transition-colors">
                  <FaInfoCircle size={16} />
                </button>
                <div
                  className="invisible opacity-0 group-hover:visible group-hover:opacity-100
                      absolute z-50
                      min-w-[200px] max-w-[400px]
                      left-0 top-full mt-2
                      bg-white dark:bg-gray-800 
                      rounded-lg shadow-lg 
                      border border-gray-200 dark:border-gray-700
                      transition-all duration-200
                      before:absolute before:w-2 before:h-2
                      before:bg-white dark:before:bg-gray-800
                      before:-top-1 before:left-[9px]
                      before:border-l before:border-t
                      before:border-gray-200 dark:before:border-gray-700
                      before:rotate-45"
                >
                  <div className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 break-words whitespace-pre-wrap max-h-[120px] overflow-y-auto">
                    {description}
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={handleCopy}
              className="ml-2 p-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400
                transition-colors rounded"
              title={copied ? "Copied" : "Copy"}
            >
              {copied ? <FaCheck size={16} /> : <FaCopy size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* Monaco 에디터 영역 */}
      <div className="flex-1 relative">
        <MonacoEditor
          code={code}
          language={detectedLanguage}
          isDark={isDark}
          isReadOnly={true}
        />
      </div>
    </div>
  );
}
