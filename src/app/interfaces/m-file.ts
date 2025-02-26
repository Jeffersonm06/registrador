export interface MFile {
  id: number;
  title: string;
  content: string;
  filePath: string;
  fileBase64: string;
  type: 'image' | 'video' | 'text';
  ext: string;
}
