import React from 'react';
import { Composition, getInputProps } from 'remotion';
import { ShortsTemplate, InputProps } from './ShortsTemplate';
import theme from '../theme.json';

const defaultProps: InputProps = {
  title: "真相库揭秘：全自动视频剪辑",
  introDurationInSeconds: 3,
  outroDurationInSeconds: 5,
  bgmPath: "assets/bgm.mp3",
  logoPath: "assets/logo.png",
  shots: [
    {
      id: "1",
      text: "这里是第一镜的测试配音台词，系统会根据该台词自动配音并适配时间轴。",
      imagePath: "temp/images/1.jpg",
      audioPath: "temp/audio/1.mp3",
      durationInSeconds: 5.0
    }
  ]
};

export const Root: React.FC = () => {
  const inputProps = getInputProps() as InputProps;
  const mergedProps = { ...defaultProps, ...inputProps };
  
  const fps = theme.dimensions.fps || 30;
  
  // Calculate total duration: Intro + sum of all shots + Outro
  const totalAudioDuration = mergedProps.shots.reduce((acc, shot) => acc + (shot.durationInSeconds || 4), 0);
  const totalDurationInSeconds = mergedProps.introDurationInSeconds + totalAudioDuration + mergedProps.outroDurationInSeconds;
  const durationInFrames = Math.max(
    fps * 5, // minimum 5 seconds
    Math.ceil(totalDurationInSeconds * fps)
  );
  
  return (
    <>
      <Composition
        id="ShortsTemplate"
        component={ShortsTemplate}
        durationInFrames={durationInFrames}
        fps={fps}
        width={theme.dimensions.width || 1920}
        height={theme.dimensions.height || 1080}
        defaultProps={mergedProps}
      />
    </>
  );
};
