import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  initialTimeInSeconds: number;
  onTrialEnd?: () => void;
  isPaidAccess?: boolean; // New prop to indicate paid access
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ initialTimeInSeconds, onTrialEnd, isPaidAccess = false }) => {
  const [timeRemaining, setTimeRemaining] = useState(initialTimeInSeconds);

  // Effect to re-synchronize internal state with prop changes
  useEffect(() => {
    setTimeRemaining(initialTimeInSeconds);
  }, [initialTimeInSeconds]);

  useEffect(() => {
    if (timeRemaining <= 0) {
      if (onTrialEnd) {
        onTrialEnd();
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining(prevTime => prevTime - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, onTrialEnd]);

  const formatTime = (totalSeconds: number) => {
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    if (days > 0) {
      return `${days}d ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m`;
    }
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const messagePrefix = isPaidAccess ? 'Access ends in:' : 'Trial ends in:';
  const endedMessage = isPaidAccess ? 'Access ended!' : 'Trial ended!';

  // Global Free Access Case: User has "Paid" (Unlimited) access but time is 0 (expired or null date)
  if (isPaidAccess && timeRemaining <= 0) {
    return (
      <div className="flex items-center gap-2 text-green-800 bg-white/60 border border-green-200/50 px-3 py-1.5 rounded-lg shadow-sm w-fit">
        <Clock className="h-4 w-4 text-green-600" />
        <span className="font-bold text-green-700 text-xs sm:text-sm whitespace-nowrap">Free Access</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-primary-800 bg-white/60 border border-primary-200/50 px-3 py-1.5 rounded-lg shadow-sm w-fit">
      <Clock className="h-4 w-4 text-primary-600" />
      {timeRemaining > 0 ? (
        <div className="flex items-center gap-1.5 text-xs sm:text-sm">
          <span className="font-medium text-primary-600 whitespace-nowrap">{messagePrefix}</span>
          <span className="font-bold text-primary-700 tabular-nums whitespace-nowrap">{formatTime(timeRemaining)}</span>
        </div>
      ) : (
        <span className="text-xs text-red-600 font-bold whitespace-nowrap">{endedMessage}</span>
      )}
    </div>
  );
};

export default CountdownTimer;
