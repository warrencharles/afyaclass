import React from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { AlertTriangle } from 'lucide-react';

interface SessionTerminationConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void; // This will now handle the "No" action (cancel login)
  onConfirmTerminate: () => void; // This will handle the "Yes" action (force login)
}

export const SessionTerminationConfirmationModal: React.FC<SessionTerminationConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirmTerminate,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="⚠️ Session Already Active" className="max-w-md">
      <div className="p-4 text-center">
        <AlertTriangle className="h-12 w-12 mx-auto text-warning-500 mb-4" />
        <p className="text-lg text-gray-700 mb-6">
          Your account is currently logged in on another device.
          Would you like to terminate the other session and continue here?
        </p>
        <div className="flex justify-center space-x-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onConfirmTerminate}>
            Terminate Other Session
          </Button>
        </div>
      </div>
    </Modal>
  );
};
