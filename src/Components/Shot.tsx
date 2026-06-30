import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, staticFile, Audio } from 'remotion';
import theme from '../../theme.json';
import { ShotData } from '../ShortsTemplate';

interface ShotProps {
  shot: ShotData;
  durationInFrames: number;
  isFirst: boolean;
  isLast: boolean;
}

// Splits subtitle text by common Chinese and English punctuation
const splitTextIntoSegments = (text: string): string[] => {
  if (!text) return [];
  // Split by ，。？！；, . ! ? ; \n
  const rawSegments = text.split(/[，。？！；,\.\!\?\;\n]+/);
  return rawSegments.map(s => s.trim()).filter(s => s.length > 0);
};

export const Shot: React.FC<ShotProps> = ({ shot, durationInFrames, isFirst, isLast }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const transitionFrames = theme.transitions.crossfadeDurationInFrames || 10;

  // 1. Ken Burns Effect: Zoom and dynamic panning
  const scale = interpolate(
    frame,
    [0, durationInFrames],
    [theme.animations.kenBurns.startScale || 1.0, theme.animations.kenBurns.endScale || 1.1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const panX = theme.animations.kenBurns.enablePan
    ? interpolate(frame, [0, durationInFrames], [0, 10], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 0;
  
  const panY = theme.animations.kenBurns.enablePan
    ? interpolate(frame, [0, durationInFrames], [0, -5], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 0;

  // 2. Opacity Transition (Fade In / Fade Out)
  let opacity = 1;
  const fadeInEnd = isFirst ? 0 : transitionFrames;
  const fadeOutStart = durationInFrames - (isLast ? 0 : transitionFrames);

  if (frame < fadeInEnd) {
    opacity = interpolate(frame, [0, fadeInEnd], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  } else if (frame > fadeOutStart) {
    opacity = interpolate(frame, [fadeOutStart, durationInFrames], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  }

  // 3. Subtitles timing calculation
  const segments = splitTextIntoSegments(shot.text);
  let activeSubtitle = '';

  if (segments.length > 0) {
    const totalChars = segments.reduce((sum, seg) => sum + seg.length, 0);
    let startFrameAccumulator = 0;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const weight = segment.length / totalChars;
      const segmentFrames = Math.round(weight * durationInFrames);
      const endFrame = startFrameAccumulator + segmentFrames;

      if (frame >= startFrameAccumulator && frame < endFrame) {
        activeSubtitle = segment;
        break;
      }
      
      startFrameAccumulator = endFrame;
    }

    // Fallback in case of rounding errors near the end
    if (!activeSubtitle && frame >= startFrameAccumulator) {
      activeSubtitle = segments[segments.length - 1];
    }
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        opacity: opacity,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Narrative Audio Track */}
      {shot.audioPath && (
        <Audio src={staticFile(shot.audioPath)} />
      )}

      {/* Visual Image Media with Ken Burns effect */}
      <img
        src={staticFile(shot.imagePath)}
        alt={`Shot ${shot.id}`}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${scale}) translate(${panX}px, ${panY}px)`,
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      />

      {/* Subtle bottom shadow overlay to make subtitles highly readable */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '35%',
          background: 'linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.3) 50%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Subtitles Overlay */}
      {activeSubtitle && (
        <div
          style={{
            position: 'absolute',
            bottom: `${theme.subtitles.bottom || 120}px`,
            left: '5%',
            right: '5%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 20,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              fontSize: `${theme.subtitles.fontSize || 64}px`,
              fontWeight: theme.font.bodyWeight as any,
              color: theme.colors.text,
              textAlign: 'center',
              lineHeight: 1.4,
              padding: '10px 20px',
              textShadow: `0 0 ${theme.subtitles.shadowBlur || '15px'} ${theme.subtitles.shadowColor || 'rgba(0, 0, 0, 0.8)'}`,
              WebkitTextStroke: `${theme.subtitles.strokeWidth || '8px'} ${theme.subtitles.strokeStrokeColor || theme.colors.subtitleStroke || '#000000'}`,
              paintOrder: 'stroke fill',
            }}
          >
            {/* Outline Text Styling using Paint-Order */}
            <span
              style={{
                color: theme.colors.subtitleHighlight || theme.colors.primary,
              }}
            >
              {activeSubtitle}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
