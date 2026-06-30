import React, { useEffect } from 'react';
import { Series, useVideoConfig, staticFile } from 'remotion';
import { Intro } from './Components/Intro';
import { Outro } from './Components/Outro';
import { Shot } from './Components/Shot';
import { BGM } from './Components/BGM';
import theme from '../theme.json';

export interface ShotData {
  id: string;
  text: string;
  imagePath: string;
  audioPath: string;
  durationInSeconds: number;
}

export interface InputProps {
  title: string;
  introDurationInSeconds: number;
  outroDurationInSeconds: number;
  bgmPath: string;
  logoPath: string;
  shots: ShotData[];
}

export const ShortsTemplate: React.FC<InputProps> = ({
  title,
  introDurationInSeconds,
  outroDurationInSeconds,
  bgmPath,
  logoPath,
  shots,
}) => {
  const { fps } = useVideoConfig();
  
  const introFrames = Math.ceil(introDurationInSeconds * fps);
  const outroFrames = Math.ceil(outroDurationInSeconds * fps);
  const transitionFrames = theme.transitions.crossfadeDurationInFrames || 10;

  // Dynamically load Google Font if provided in theme
  useEffect(() => {
    if (theme.font.googleFontUrl) {
      const link = document.createElement('link');
      link.href = theme.font.googleFontUrl;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
      return () => {
        document.head.removeChild(link);
      };
    }
  }, []);

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
        fontFamily: theme.font.fontFamily,
        color: theme.colors.text,
        overflow: 'hidden',
        position: 'relative',
        width: '100%',
        height: '100%',
      }}
    >
      {/* Background Music - loops throughout the video */}
      {bgmPath && (
        <BGM
          src={staticFile(bgmPath)}
          volume={parseFloat(process.env.BGM_VOLUME || '') || theme.colors.bgmVolume || 0.15}
          introFrames={introFrames}
          outroFrames={outroFrames}
        />
      )}

      {/* Main Video Sequence */}
      <Series>
        {/* Intro Slide */}
        <Series.Sequence durationInFrames={introFrames}>
          <Intro title={title} logoPath={logoPath} durationInFrames={introFrames} />
        </Series.Sequence>

        {/* Main Content Shots */}
        {shots.map((shot, index) => {
          const shotFrames = Math.ceil((shot.durationInSeconds || 4) * fps);
          
          // Overlap shots slightly to enable crossfade transition
          // The first shot after intro doesn't overlap the intro, or does it?
          // We can overlap all of them by offset={-transitionFrames} except the very first sequence.
          const offset = index === 0 ? -transitionFrames : -transitionFrames;
          
          return (
            <Series.Sequence
              key={shot.id}
              durationInFrames={shotFrames}
              offset={offset}
            >
              <Shot
                shot={shot}
                durationInFrames={shotFrames}
                isFirst={index === 0}
                isLast={index === shots.length - 1}
              />
            </Series.Sequence>
          );
        })}

        {/* Outro Slide */}
        <Series.Sequence durationInFrames={outroFrames} offset={-transitionFrames}>
          <Outro logoPath={logoPath} durationInFrames={outroFrames} />
        </Series.Sequence>
      </Series>
    </div>
  );
};
