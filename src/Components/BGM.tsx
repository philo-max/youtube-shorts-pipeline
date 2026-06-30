import React from 'react';
import { Audio, useCurrentFrame, useVideoConfig } from 'remotion';

interface BGMProps {
  src: string;
  volume: number;
  introFrames: number;
  outroFrames: number;
}

export const BGM: React.FC<BGMProps> = ({ src, volume, introFrames, outroFrames }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Dynamic volume ducking calculation
  let currentVolume = volume;

  const fadeZone = 15; // 0.5 seconds fade duration

  if (frame < introFrames - fadeZone) {
    // Intro section: Full volume
    currentVolume = volume * 1.5;
  } else if (frame >= introFrames - fadeZone && frame < introFrames) {
    // Transition from Intro to Content: Smoothly duck volume
    const progress = (frame - (introFrames - fadeZone)) / fadeZone;
    currentVolume = volume * (1.5 - progress * 1.0); // 1.5x -> 0.5x
  } else if (frame >= introFrames && frame < durationInFrames - outroFrames) {
    // Main Content: Ducked volume to not overpower voiceover
    currentVolume = volume * 0.5;
  } else if (frame >= durationInFrames - outroFrames && frame < durationInFrames - outroFrames + fadeZone) {
    // Transition from Content to Outro: Smoothly boost volume
    const progress = (frame - (durationInFrames - outroFrames)) / fadeZone;
    currentVolume = volume * (0.5 + progress * 1.0); // 0.5x -> 1.5x
  } else {
    // Outro section: Full volume
    currentVolume = volume * 1.5;
  }

  // Cap volume between 0 and 1
  currentVolume = Math.max(0, Math.min(1, currentVolume));

  return <Audio src={src} volume={currentVolume} loop />;
};
