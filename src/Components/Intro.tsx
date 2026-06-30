import React from 'react';
import { useCurrentFrame, spring, interpolate, useVideoConfig, staticFile } from 'remotion';
import theme from '../../theme.json';

interface IntroProps {
  title: string;
  logoPath: string;
  durationInFrames: number;
}

export const Intro: React.FC<IntroProps> = ({ title, logoPath, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance spring animations
  const logoScale = spring({
    frame,
    fps,
    config: { damping: 12, mass: 0.5 },
    delay: 5,
  });

  const titleTranslateY = spring({
    frame,
    fps,
    config: { damping: 15, mass: 0.8 },
    from: 100,
    to: 0,
    delay: 15,
  });

  const titleOpacity = spring({
    frame,
    fps,
    config: { damping: 20 },
    from: 0,
    to: 1,
    delay: 15,
  });

  // Background gradient movement
  const gradientPosition = interpolate(
    frame,
    [0, durationInFrames],
    [0, 100],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Overall exit fade
  const exitFade = interpolate(
    frame,
    [durationInFrames - 10, durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <div
      style={{
        flex: 1,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(${135 + gradientPosition}deg, ${theme.colors.background} 0%, #1a1c23 50%, #0d1b2a 100%)`,
        opacity: exitFade,
        position: 'relative',
      }}
    >
      {/* Decorative ambient glowing orb */}
      <div
        style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${theme.colors.primary}1a 0%, transparent 70%)`,
          top: '20%',
          left: '25%',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${theme.colors.accent}1a 0%, transparent 70%)`,
          bottom: '15%',
          right: '25%',
          filter: 'blur(50px)',
          pointerEvents: 'none',
        }}
      />

      {/* Channel Logo */}
      <div
        style={{
          transform: `scale(${logoScale})`,
          marginBottom: '50px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10,
        }}
      >
        <img
          src={logoPath ? staticFile(logoPath) : ''}
          alt="Logo"
          style={{
            width: '160px',
            height: '160px',
            borderRadius: '50%',
            border: `5px solid ${theme.colors.primary}`,
            boxShadow: `0 10px 30px rgba(0,0,0,0.5), 0 0 20px ${theme.colors.primary}4d`,
            backgroundColor: theme.colors.background,
            objectFit: 'cover',
          }}
        />
      </div>

      {/* Video Title Card */}
      <div
        style={{
          transform: `translateY(${titleTranslateY}px)`,
          opacity: titleOpacity,
          textAlign: 'center',
          padding: '25px 50px',
          borderRadius: '20px',
          background: theme.colors.cardBackground,
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          maxWidth: '80%',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          zIndex: 10,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: '52px',
            fontWeight: theme.font.titleWeight as any,
            color: theme.colors.text,
            lineHeight: 1.3,
            textShadow: '0 4px 10px rgba(0,0,0,0.5)',
            letterSpacing: '1px',
          }}
        >
          {title}
        </h1>
        <div
          style={{
            width: '80px',
            height: '4px',
            backgroundColor: theme.colors.primary,
            margin: '20px auto 0 auto',
            borderRadius: '2px',
            boxShadow: `0 0 8px ${theme.colors.primary}`,
          }}
        />
      </div>
    </div>
  );
};
