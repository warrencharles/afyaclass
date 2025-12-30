import React from 'react';
import { Modal } from './ui/Modal'; // Assuming a Modal component exists
import { Session } from '../types'; // Import Session type

interface SessionConflictDetails {
  userId: number;
  message: string;
  resolutionToken: string;
  activeSessions: Session[];
}

interface SessionResolutionModalProps {
  isOpen: boolean;
  onTerminateAll: () => void; // Only keep terminate all
  onCancel: () => void;
  sessionConflictDetails: SessionConflictDetails | null; // Pass conflict details
}

const SessionResolutionModal: React.FC<SessionResolutionModalProps> = ({ isOpen, onTerminateAll, onCancel, sessionConflictDetails }) => {
  if (!isOpen || !sessionConflictDetails) return null;

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Account Active Elsewhere" size="sm">
      <div className="p-3 bg-white">
        <p className="text-sm text-gray-600 mb-3">
          Your account is currently active on another device.
        </p>

        {sessionConflictDetails.activeSessions && sessionConflictDetails.activeSessions.length > 0 && (
          <div className="mb-3 p-2 bg-gray-50 rounded border border-gray-100">
            <h4 className="font-medium text-gray-700 text-xs mb-1">Active Session:</h4>
            <ul className="text-xs text-gray-500 max-h-24 overflow-y-auto space-y-1 custom-scrollbar">
              {sessionConflictDetails.activeSessions.map((session, index) => (
                <li key={index} className="flex items-start gap-1">
                  <span className="w-1 h-1 bg-amber-500 rounded-full mt-1.5 flex-shrink-0" />
                  <span className="break-all">
                    {session.device_info} <span className="text-gray-400">({new Date(session.login_time).toLocaleString()})</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end mt-4">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded border border-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onTerminateAll}
            className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded shadow-sm transition-all"
          >
            Terminate Others & Log In
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default SessionResolutionModal;
