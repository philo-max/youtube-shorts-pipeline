import React from 'react';
import { useCurrentFrame, spring, interpolate, useVideoConfig, staticFile } from 'remotion';
import theme from '../../theme.json';

interface OutroProps {
  logoPath: string;
  durationInFrames: number;
}

export const Outro: React.FC<OutroProps> = ({ logoPath, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance spring animations
  const cardScale = spring({
    frame,
    fps,
    config: { damping: 14, mass: 0.6 },
    delay: 5,
  });

  const buttonScale = spring({
    frame,
    fps,
    config: { damping: 10, mass: 0.5 },
    delay: 25,
  });

  // Pulse animation for the Subscribe button after it enters
  const pulseScale = interpolate(
    frame,
    [30, 45, 60, 75, 90, 105, 120, 135],
    [1, 1.05, 1, 1.05, 1, 1.05, 1, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Overall entry fade
  const entryFade = interpolate(
    frame,
    [0, 10],
    [0, 1],
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
        background: `linear-gradient(225deg, ${theme.colors.background} 0%, #15161c 60%, #1e1124 100%)`,
        opacity: entryFade,
        position: 'relative',
      }}
    >
      {/* Decorative ambient glowing lights */}
      <div
        style={{
          position: 'absolute',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, #ff005511 0%, transparent 70%)',
          top: '10%',
          right: '15%',
          filter: 'blur(70px)',
          pointerEvents: 'none',
        }}
      />

      {/* Outro CTA Card */}
      <div
        style={{
          transform: `scale(${cardScale})`,
          textAlign: 'center',
          padding: '40px 60px',
          borderRadius: '24px',
          background: theme.colors.cardBackground,
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 30px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)',
          maxWidth: '75%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Rounded Channel Logo */}
        <img
          src={logoPath ? staticFile(logoPath) : ''}
          alt="Logo"
          style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            border: `4px solid ${theme.colors.secondary}`,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            marginBottom: '20px',
            objectFit: 'cover',
          }}
        />

        {/* Channel Name */}
        <h2
          style={{
            margin: '0 0 10px 0',
            fontSize: '44px',
            fontWeight: theme.font.titleWeight as any,
            color: theme.colors.primary,
            textShadow: '0 2px 5px rgba(0,0,0,0.3)',
          }}
        >
          {theme.channelName}
        </h2>

        {/* Thank You / Outro Message */}
        <p
          style={{
            margin: '0 0 35px 0',
            fontSize: '28px',
            color: theme.colors.text,
            opacity: 0.9,
            lineHeight: 1.5,
          }}
        >
          感谢您的收看！
          <br />
          点赞、分享并订阅频道，不错过更多真相解密。
        </p>

        {/* Interactive Subscribe Button */}
        <div
          style={{
            transform: `scale(${buttonScale * (frame >= 30 ? pulseScale : 1)})`,
            transition: 'transform 0.1s ease-out',
          }}
        >
          <button
            style={{
              padding: '16px 45px',
              fontSize: '26px',
              fontWeight: 'bold',
              color: '#ffffff',
              backgroundColor: '#ff0000', // YouTube red
              border: 'none',
              borderRadius: '50px',
              cursor: 'pointer',
              boxShadow: '0 10px 25px rgba(255, 0, 0, 0.4), 0 0 15px rgba(255, 0, 0, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              letterSpacing: '2px',
            }}
          >
            {/* SVG Play Icon */}
            <svg
              viewBox="0 0 24 24"
              width="24"
              height="24"
              fill="currentColor"
            >
              <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.108C19.513 3.545 12 3.545 12 3.545s-7.513 0-9.388.51a3.002 3.002 0 0 0-2.11 2.108C0 8.053 0 12 0 12s0 3.948.502 5.837a3.003 3.003 0 0 0 2.11 2.108c1.875.51 9.388.51 9.388.51s7.513 0 9.388-.51a3.002 3.002 0 0 0 2.11-2.108C24 15.948 24 12 24 12s0-3.948-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
            立即订阅
          </button>
        </div>
      </div>
    </div>
  );
};
