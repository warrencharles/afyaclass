import React from 'react';

interface GenericVideoPlayerProps {
  videoUrl: string;
  title?: string;
  onClose: () => void;
}

const getYouTubeVideoId = (url: string): string | null => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export const GenericVideoPlayer: React.FC<GenericVideoPlayerProps> = ({ videoUrl, title = 'Video Player', onClose }) => {
  const youTubeVideoId = getYouTubeVideoId(videoUrl);

  const videoContent = youTubeVideoId ? (
    <iframe
      className="absolute top-0 left-0 w-full h-full"
      src={`https://www.youtube.com/embed/${youTubeVideoId}?autoplay=1`}
      frameBorder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      title={title}
    ></iframe>
  ) : videoUrl.match(/\.(mp4|webm|ogg)$/i) ? (
    <video controls className="max-w-full max-h-full">
      <source src={videoUrl} type={`video/${videoUrl.split('.').pop()}`} />
      Your browser does not support the video tag.
    </video>
  ) : (
    <div className="flex flex-col items-center justify-center h-full bg-gray-800 text-white p-4 rounded-lg">
      <p className="text-lg font-semibold mb-2">Unsupported Video URL</p>
      <p className="text-sm text-gray-400 text-center">
        The provided URL is not a valid YouTube link or a direct video file link (MP4, WebM, Ogg).
      </p>
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

  return (
    <div className="relative w-full h-full bg-black flex flex-col">
      <div className="flex justify-between items-center p-2 bg-gray-900 text-white">
        <h3 className="text-lg font-semibold">{title}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white focus:outline-none">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="relative flex-grow">
        {videoContent}
      </div>
    </div>
  );
};
