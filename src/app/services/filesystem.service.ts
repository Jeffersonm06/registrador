import { Injectable } from '@angular/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { MFile } from '../interfaces/m-file';
import {
  AlertController,
} from '@ionic/angular/standalone';

const appFolder = 'FileSystem';

@Injectable({
  providedIn: 'root'
})
export class FilesystemService {

  constructor(
    private alertController: AlertController,
  ) { }

  async checkPermissions(): Promise<boolean> {
    const permStatus = await Filesystem.checkPermissions();

    if (permStatus.publicStorage !== 'granted') {
      const request = await Filesystem.requestPermissions();
      return request.publicStorage === 'granted';
    }
    return true;
  }

  async createAppFolder() {
    const hasPermission = await this.checkPermissions();
    if (!hasPermission) {
      alert('Permissão negada para acessar o armazenamento.');
      return;
    }

    try {
      await Filesystem.mkdir({
        path: appFolder,
        directory: Directory.ExternalStorage,
        recursive: true // Cria a pasta caso não exista
      });
    } catch (error: any) {
      if (error.message !== 'Current directory does already exist.' && error.message !== 'Directory exists') {
        alert('Erro ao criar pasta do aplicativo: ' + error);
      }
    }
  }


  async writeTextFile(filePath: string, data: string): Promise<void> {
    const fullPath = `${appFolder}/${filePath}.txt`;
    const hasPermission = await this.checkPermissions();

    if (!hasPermission) {
      alert("Permissão negada para acessar o armazenamento.");
      return;
    }

    try {
      await Filesystem.writeFile({
        path: fullPath,
        data: data,
        directory: Directory.ExternalStorage,
        encoding: Encoding.UTF8,
      });
    } catch (error) {
      alert('Erro ao escrever arquivo de texto: ' + error);
      throw error;
    }
  }

  async writeBinaryFile(filePath: string, data: File): Promise<void> {
    const fullPath = `${appFolder}/${filePath}`;
    const hasPermission = await this.checkPermissions();

    if (!hasPermission) {
      alert("Permissão negada para acessar o armazenamento.");
      return;
    }

    try {
      const base64Data = await this.blobToBase64(data);
      await Filesystem.writeFile({
        path: fullPath,
        data: base64Data,
        directory: Directory.ExternalStorage,
      });
    } catch (error) {
      alert('Erro ao salvar arquivo: ' + error);
      throw error;
    }
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result?.toString().split(',')[1];
        if (result) {
          resolve(result);
        } else {
          reject('Falha ao converter Blob para base64');
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async readFile(filePath: string): Promise<string | null> {
    const fullPath = `${appFolder}/${filePath}`;
    try {
      const contents = await Filesystem.readFile({
        path: fullPath,
        directory: Directory.ExternalStorage,
        encoding: Encoding.UTF8,
      });
      return contents.data as string;
    } catch (error) {
      alert('Erro ao ler arquivo: ' + error);
      return null;
    }
  }

  async readBinaryFile(filePath: string): Promise<string | null> {
    const fullPath = `${appFolder}/${filePath}`;
    try {
      const contents = await Filesystem.readFile({
        path: fullPath,
        directory: Directory.ExternalStorage,
      });

      const extension = filePath.split('.').pop()?.toLowerCase() || '';
      return `data:${this.getMimeType(extension)};base64,${contents.data}`;
    } catch (error) {
      return null;
    }
  }

  async listFiles(): Promise<MFile[]> {
    try {
      const result = await Filesystem.readdir({
        directory: Directory.ExternalStorage,
        path: appFolder,
      });

      const files = await Promise.all(
        result.files.map(async (file) => {
          const fileType = this.getFileType(file.name);
          const title = file.name.split('.').slice(0, -1).join('.'); // Remove a extensão

          return {
            title: title,
            description: fileType === 'text'
              ? await this.readFile(file.name) || 'Vazio'
              : this.getFileDescription(fileType),
            type: fileType,
            path: file.name,
            relatedFile: null,
            // Para imagens e vídeos, obtemos a URL em base64
            imageUrl: (fileType === 'image' || fileType === 'video')
              ? await this.readBinaryFile(file.name)
              : null
          };
        })
      );

      // Agrupa arquivos relacionados (por exemplo, texto e imagem vinculados)
      const groupedFiles = this.groupRelatedFiles(files);
      return groupedFiles;
    } catch (error) {
      alert('Erro ao listar arquivos: ' + error);
      return [];
    }
  }

  // Função para agrupar arquivos relacionados
  private groupRelatedFiles(files: MFile[]): MFile[] {
    const fileMap = new Map<string, MFile>();

    files.forEach((file) => {
      if (!fileMap.has(file.title)) {
        fileMap.set(file.title, file);
      } else {
        const existingFile = fileMap.get(file.title)!;

        if (file.type === 'text' && (existingFile.type === 'image' || existingFile.type === 'video')) {
          existingFile.relatedFile = file;
        } else if ((file.type === 'image' || file.type === 'video') && existingFile.type === 'text') {
          file.relatedFile = existingFile;
          fileMap.set(file.title, file);
        }
      }
    });

    return Array.from(fileMap.values());
  }


  private removeExtension(filename: string): string {
    return filename.split('.').slice(0, -1).join('.');
  }

  getFileType(filename: string): 'text' | 'image' | 'video' | 'other' {
    const extension = filename.split('.').pop()?.toLowerCase() ?? '';
    if (['txt', 'csv', 'json', 'xml'].includes(extension)) return 'text';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(extension)) return 'image';
    if (['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(extension)) return 'video';
    return 'other';
  }


  private getFileDescription(fileType: string): string {
    switch (fileType) {
      case 'image':
        return 'Arquivo de imagem';
      case 'video':
        return 'Arquivo de vídeo';
      default:
        return 'Arquivo não suportado';
    }
  }

  private getMimeType(extension: string): string {
    switch (extension) {
      case 'png': return 'image/png';
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'gif': return 'image/gif';
      case 'webp': return 'image/webp';
      case 'txt': return 'text/plain';
      case 'csv': return 'text/csv';
      case 'json': return 'application/json';
      case 'xml': return 'application/xml';
      case 'mp4': return 'video/mp4';
      case 'mov': return 'video/quicktime';
      case 'avi': return 'video/x-msvideo';
      case 'webm': return 'video/webm';
      default: return 'application/octet-stream';
    }
  }

  async deleteFile(filePath: string) {
    const fullPath = `${appFolder}/${filePath}`;

    await Filesystem.deleteFile({
      path: fullPath,
      directory: Directory.ExternalStorage,
    });
  }

  async shareText(file: MFile) {
    const fullPath = `${appFolder}/${file.path}`;
    
    try {
      await Share.share({
        title: file.title,
        text: file.description,
        dialogTitle: 'Compartilhar com',
      });
      console.log('chama')
    } catch (error) {
      this.presentAlert({
        header: 'Erro',
        message: `${error}`,
        buttons: ['ok']
      })
      throw error
    }
  }

  async shareFile(file: MFile) {
    const fullPath = `${appFolder}/${file.path}`;
    try {
      const fileUri = await Filesystem.getUri({
        path: fullPath,
        directory: Directory.ExternalStorage
      });

      await Share.share({
        title: file.title,
        files: [fileUri.uri],
        text: file.relatedFile?.description || '',
        dialogTitle: 'Compartilhar com',
      });
    } catch (error) {
      this.presentAlert({
        header: 'Erro',
        message: `Erro ao compartilhar: ${error}`,
        buttons: ['OK']
      });
      console.error('Erro ao compartilhar:', error);
    }
  }

  async presentAlert(
    alertContent: {
      header: string,
      subHeader?: string,
      message: string,
      buttons: string[],
    }
  ) {
    const alert = await this.alertController.create(alertContent);

    await alert.present();
  }
}
