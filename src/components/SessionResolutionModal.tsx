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
    <Modal isOpen={isOpen} onClose={onCancel} title="Account in Use">
      <div className="p-4">
        <p className="text-gray-700 mb-4">
          {sessionConflictDetails.message || 'This account is already logged in on another device.'}
        </p>

        {sessionConflictDetails.activeSessions && sessionConflictDetails.activeSessions.length > 0 && (
          <div className="mb-4 p-3 bg-gray-50 rounded-md border border-gray-200">
            <h4 className="font-semibold text-gray-800 mb-2">Active Sessions:</h4>
            <ul className="list-disc list-inside text-sm text-gray-600">
              {sessionConflictDetails.activeSessions.map((session, index) => (
                <li key={index} className="mb-1">
                  Device: {session.device_info || 'Unknown Device'} (Logged in: {new Date(session.login_time).toLocaleString()})
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-gray-700 mb-4">
          Do you want to terminate all other active sessions and log in here, or cancel this login attempt?
        </p>

        <div className="flex justify-end space-x-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            onClick={onTerminateAll}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Terminate All Other Sessions & Log In
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default SessionResolutionModal;
