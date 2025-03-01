export interface People {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  description?: string;
  filePath?: string;
  fileBase64?: string;
  type: 'comum' | 'cliente';
  ext?: string;
  created_at: string;
  updated_at: string;
}