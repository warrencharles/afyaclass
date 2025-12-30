import React from 'react';

interface YouTubePlayerProps {
  videoUrl: string;
  title?: string;
}

const getYouTubeVideoId = (url: string): string | null => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({ videoUrl, title = 'YouTube Video' }) => {
  const videoId = getYouTubeVideoId(videoUrl);

  if (!videoId) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-800 text-white p-4 rounded-lg">
        <p className="text-lg font-semibold mb-2">Invalid YouTube URL</p>
        <p className="text-sm text-gray-400 text-center">Please provide a valid YouTube video URL to play.</p>
        <a 
          href={videoUrl} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="mt-4 text-blue-400 hover:underline"
        >
          Open URL in new tab
        </a>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black">
      <iframe
        className="absolute top-0 left-0 w-full h-full"
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title={title}
      ></iframe>
    </div>
  );
};
