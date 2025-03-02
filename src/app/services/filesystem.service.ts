import { Injectable } from '@angular/core';
import { MFile } from '../interfaces/m-file';


import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { People } from '../interfaces/people';
import { UiService } from './ui.service';

const appFolder = 'FileSystem';

@Injectable({
  providedIn: 'root'
})
export class FilesystemService {

  constructor(
    private ui: UiService
  ) {
  }

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
        directory: Directory.Data,
        recursive: true
      });
    } catch (error: any) {
      return;
    }
  }

  async createFile(filePath: string, file: File) {
    const base64Data = await this.blobToBase64(file);
    await Filesystem.writeFile({
      path: `${appFolder}/${filePath}`,
      data: base64Data,
      directory: Directory.Data,
    });
  }

  async deleteFile(filePath: string) {
    if (filePath) {
      await Filesystem.deleteFile({
        path: `${appFolder}/${filePath}`,
        directory: Directory.Data,
      });
    }
  }

  blobToBase64(blob: Blob): Promise<string> {
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

  private getMimeType(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    const mimeTypes: { [key: string]: string } = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'mp4': 'video/mp4',
    };
    return mimeTypes[extension] || 'application/octet-stream';
  }

  async readBinaryFile(filePath: string): Promise<string | null> {
    const fullPath = `${appFolder}/${filePath}`;
    try {
      const contents = await Filesystem.readFile({
        path: fullPath,
        directory: Directory.Data,
      });

      const extension = filePath.split('.').pop()?.toLowerCase() || '';
      return `data:${this.getMimeType(extension)};base64,${contents.data}`;
    } catch (error) {
      return '';
    }
  }

  async shareFile(file: MFile) {
    const fullPath = `${appFolder}/${file.filePath}`;
    try {
      const stats = await Filesystem.stat({
        path: fullPath,
        directory: Directory.Data
      });
      console.log('Estatísticas do arquivo:', stats);

      const PFile = await Filesystem.getUri({
        path: fullPath,
        directory: Directory.Data
      });
      console.log('URI obtido:', PFile.uri);

      const fileData = await Filesystem.readFile({
        path: fullPath,
        directory: Directory.Data
      });

      const tempFileName = `share_${Date.now()}_${file.filePath}.${file.ext}`;

      await Filesystem.writeFile({
        path: tempFileName,
        data: fileData.data,
        directory: Directory.ExternalStorage,
        recursive: true
      });

      const tempUri = await Filesystem.getUri({
        path: tempFileName,
        directory: Directory.ExternalStorage
      });
      this.ui.presentAlert({
        header: 'Uri do arquivo',
        message: tempUri.uri,
        buttons: ['OK']
      })

      await Share.share({
        title: file.title,
        files: [`${tempUri.uri}`],
        text: file.content || '',
        dialogTitle: 'Compartilhar com',
      });

      this.cleanupTempFile(tempUri.uri);

    } catch (error) {
      this.ui.presentAlert({
        header: 'Erro',
        message: `Erro ao compartilhar: ${error}`,
        buttons: ['OK']
      });
      console.error('Erro ao compartilhar:', error);
    }
  }


  private async cleanupTempFile(path: string) {
    try {
      await Filesystem.deleteFile({
        path,
        directory: Directory.ExternalStorage
      });
    } catch (error) {
      this.ui.presentAlert({
        header: 'Erro',
        message: `Erro na limpeza: ${error}`,
        buttons: ['OK']
      });
    }
  }

}
