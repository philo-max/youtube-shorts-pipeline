export type MangaShot = {
 id: string;
 durationSeconds: number;
 dialogue?: {speakerId?: string; text?: string};
 visual: {mode: 'motion_comic' | 'image_to_video' | 'video_import'; imagePath?: string; videoPath?: string; camera?: string};
 audioPath?: string;
};
export type MangaProps = {
 title: string;
 shots: MangaShot[];
 transitionFrames?: number;
};
