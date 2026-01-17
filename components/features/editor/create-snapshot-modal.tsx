import { useState, type ChangeEvent, type FormEvent } from "react";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import TextArea from "@/components/ui/textarea";
import FormField from "@/components/ui/form-field";
import { TEXT_LENGTH, ERROR_MESSAGES, BUTTON_TEXT } from "@/constants/ui.constants";
import type { SnapshotData } from "@/types/editor.type";

interface CreateSnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateSnapshot: (snapshotData: SnapshotData) => void;
}

/**
 * 스냅샷 생성을 위한 모달 컴포넌트
 * @param {Object} props
 * @param {boolean} props.isOpen - 모달 표시 여부
 * @param {Function} props.onClose - 모달 닫기 핸들러
 * @param {Function} props.onCreateSnapshot - 스냅샷 생성 완료 핸들러
 */
export default function CreateSnapshotModal({
  isOpen,
  onClose,
  onCreateSnapshot,
}: CreateSnapshotModalProps) {
  // 스냅샷 입력 폼 상태 관리
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [titleError, setTitleError] = useState("");
  const [descriptionError, setDescriptionError] = useState("");

  const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    if (newTitle.length <= TEXT_LENGTH.SNAPSHOT_TITLE_MAX) {
      setTitle(newTitle);
      setTitleError("");
    } else {
      setTitleError(ERROR_MESSAGES.TITLE_MAX_LENGTH(TEXT_LENGTH.SNAPSHOT_TITLE_MAX));
    }
  };

  const handleDescriptionChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newDescription = e.target.value;
    if (newDescription.length <= TEXT_LENGTH.SNAPSHOT_DESCRIPTION_MAX) {
      setDescription(newDescription);
      setDescriptionError("");
    } else {
      setDescriptionError(
        ERROR_MESSAGES.DESCRIPTION_MAX_LENGTH(TEXT_LENGTH.SNAPSHOT_DESCRIPTION_MAX)
      );
    }
  };

  /**
   * 스냅샷 생성 제출 처리
   * 제목이 비어있지 않은 경우에만 처리
   */
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title) return;

    if (
      title.length > TEXT_LENGTH.SNAPSHOT_TITLE_MAX ||
      description.length > TEXT_LENGTH.SNAPSHOT_DESCRIPTION_MAX
    ) {
      return;
    }

    onCreateSnapshot({
      title,
      description,
    });

    // 폼 초기화 및 모달 닫기
    setTitle("");
    setDescription("");
    setTitleError("");
    setDescriptionError("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-200 mb-6">
        Create Snapshot
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 제목 입력 필드 */}
        <FormField
          label="Title"
          error={titleError}
          showCharCount
          currentLength={title.length}
          maxLength={TEXT_LENGTH.SNAPSHOT_TITLE_MAX}
          required
        >
          <Input
            type="text"
            value={title}
            onChange={handleTitleChange}
            maxLength={TEXT_LENGTH.SNAPSHOT_TITLE_MAX}
            placeholder="Enter snapshot title"
            required
            autoFocus
          />
        </FormField>

        {/* 설명 입력 필드 */}
        <FormField
          label="Description"
          error={descriptionError}
          showCharCount
          currentLength={description.length}
          maxLength={TEXT_LENGTH.SNAPSHOT_DESCRIPTION_MAX}
        >
          <TextArea
            value={description}
            onChange={handleDescriptionChange}
            maxLength={TEXT_LENGTH.SNAPSHOT_DESCRIPTION_MAX}
            className="h-32"
            placeholder="Enter snapshot description"
          />
        </FormField>

        {/* 버튼 그룹 */}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            onClick={onClose}
            variant="secondary"
            size="md"
          >
            {BUTTON_TEXT.CANCEL}
          </Button>

          <Button
            type="submit"
            disabled={!!titleError || !!descriptionError}
            variant="primary"
            size="md"
          >
            {BUTTON_TEXT.CREATE}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
