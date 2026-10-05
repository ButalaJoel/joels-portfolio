"use client";

import { useEffect, useRef } from "react";

type LoopVideoProps = {
  src: string;
};

export default function LoopVideo({
  src,
}: LoopVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;

    const handleTimeUpdate = () => {
      if (video.currentTime >= 7) {
        video.currentTime = 0;
        video.play();
      }
    };

    video.addEventListener(
      "timeupdate",
      handleTimeUpdate
    );

    return () => {
      video.removeEventListener(
        "timeupdate",
        handleTimeUpdate
      );
    };
  }, []);

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      preload="metadata"
      controls
    >
      <source
        src={src}
        type="video/mp4"
      />

      Your browser does not support
      the video element.
    </video>
  );
}