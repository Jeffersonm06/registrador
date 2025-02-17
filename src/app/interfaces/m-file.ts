export interface MFile {
  title: string;
  description: string;
  type: 'text' | 'image' | 'video' | 'other';
  path: string;
  relatedFile: MFile | null;
  imageUrl: string | null;
}
