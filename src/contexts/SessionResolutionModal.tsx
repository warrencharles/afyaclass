import React from 'react';

interface SessionResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSessions: Array<{ session_id: string; device_info: string; login_time: string }>;
  resolvingUserId: number | null;
  sessionResolutionToken: string | null; // Add sessionResolutionToken
  terminateSession: (sessionIdToTerminate: string, sessionResolutionToken: string) => Promise<void>;
  terminateAllOtherSessions: (sessionResolutionToken: string) => Promise<void>;
}

const SessionResolutionModal: React.FC<SessionResolutionModalProps> = ({
  isOpen,
  onClose,
  activeSessions,
  resolvingUserId,
  sessionResolutionToken, // Destructure sessionResolutionToken
  terminateSession,
  terminateAllOtherSessions,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        width: '500px',
        maxWidth: '90%',
        boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
      }}>
        <h2>Session Resolution Required</h2>
        <p>It looks like you have another active session. Please choose an option:</p>
        <div style={{ marginTop: '15px' }}>
          <h3>Active Sessions:</h3>
          <ul>
            {activeSessions.map((session) => (
              <li key={session.session_id}>
            {session.device_info} (Logged in: {new Date(session.login_time).toLocaleString()})
            <button onClick={() => terminateSession(session.session_id, sessionResolutionToken!)} style={{ marginLeft: '10px', color: 'red' }}>
              Terminate
            </button>
              </li>
            ))}
          </ul>
        </div>
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
          <button onClick={() => terminateAllOtherSessions(sessionResolutionToken!)} style={{ backgroundColor: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb' }}>
            Terminate All Other Sessions
          </button>
          <button onClick={onClose} style={{ backgroundColor: '#6c757d', color: 'white' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionResolutionModal;
