export interface MFile {
  id: number;
  title: string;
  content: string;
  filePath: string;
  fileBase64: string;
  typeFile: 'image' | 'video' | 'text';
  category: string;
  ext: string;
  created_at: string;
  updated_at: string;
}
