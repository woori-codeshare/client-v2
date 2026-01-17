import { useState, type FormEvent } from "react";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import FormField from "@/components/ui/form-field";

interface RoomEnterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (password: string) => void;
}

export default function RoomEnterModal({ isOpen, onClose, onSubmit }: RoomEnterModalProps) {
  const [password, setPassword] = useState("");

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(password);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} allowBackdropClose={false} closeButton={false}>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-200 mb-4">
        Enter Room
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Password" required>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            required
          />
        </FormField>

        <Button type="submit" variant="primary" fullWidth>
          Enter
        </Button>
      </form>
    </Modal>
  );
}
