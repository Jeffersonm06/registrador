import { Injectable } from '@angular/core';
import { AlertController } from '@ionic/angular/standalone';
import { MFile } from '../interfaces/m-file';

import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const appFolder = 'FileSystem';

@Injectable({
  providedIn: 'root'
})
export class FilesystemService {
  // Conexão com o banco de dados SQLite
  private db!: SQLiteDBConnection;

  constructor(
    private alertController: AlertController
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

  async initDatabase(): Promise<void> {
    try {
      const sqlite: SQLiteConnection = new SQLiteConnection(CapacitorSQLite);
      this.db = await sqlite.createConnection('__FS', false, 'no-encryption', 1, false);
      await this.db.open();
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS files (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT,
          content TEXT,
          filePath TEXT,
          ext TEXT,
          type TEXT
        );
      `;
      await this.db.execute(createTableQuery);
      this.presentAlert({
        header: 'Banco de Dados',
        message: 'Banco de dados inicializado com sucesso!',
        buttons: ['ok']
      });
    } catch (error) {
      this.presentAlert({
        header: 'Banco de Dados',
        message: 'Erro ao inicializar o banco de dados: ' + error,
        buttons: ['ok']
      });
    }
  }

  async saveRecord(data: {
    title: string;
    content?: string;
    file?: File;
    filePath?: string;
  }): Promise<MFile> {
    if (!this.db) throw new Error('Banco não inicializado');
    if (!data.title) throw new Error('Título é obrigatório');

    let filePath = '';
    let type: 'text' | 'image' | 'video' = 'text';
    let ext = '';
    let content = data.content || '';

    try {
      if (data.file && data.filePath) {
        await this.createAppFolder();

        const permStatus = await this.checkPermissions();
        if (!permStatus) {
          throw new Error('Permissão de armazenamento negada');
        }

        ext = data.file.name.split('.').pop()?.toLowerCase() || '';
        const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'];
        const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm'];

        if (imageExtensions.includes(ext)) {
          type = 'image';
        } else if (videoExtensions.includes(ext)) {
          type = 'video';
        } else {
          throw new Error('Tipo de arquivo não suportado');
        }

        const uniqueFilename = `${Date.now()}_${data.filePath}`;

        const base64Data = await this.blobToBase64(data.file);
        await Filesystem.writeFile({
          path: `${appFolder}/${uniqueFilename}`,
          data: base64Data,
          directory: Directory.Data,
        });

        filePath = uniqueFilename;
      }

      if (!data.content && !data.file) {
        throw new Error('Dados insuficientes para o registro');
      }

      const query = `INSERT INTO files (title, content, filePath, type, ext) VALUES (?, ?, ?, ?, ?)`;
      const result = await this.db.run(query, [
        data.title,
        content,
        filePath,
        type,
        ext
      ]);

      if (!result.changes?.lastId) {
        throw new Error('Falha ao inserir registro');
      }

      return {
        id: result.changes.lastId,
        title: data.title,
        content: content,
        filePath: filePath,
        fileBase64: '',
        type: type,
        ext: ext
      };

    } catch (error) {
      console.error('Erro no saveRecord:', error);
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
        directory: Directory.Data,
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

  async getAllFileRecords(): Promise<MFile[]> {
    if (!this.db) {
      console.error('Banco não inicializado.');
      return [];
    }
    try {
      const query = `SELECT * FROM files`;
      const result = await this.db.query(query);
      const rows = result.values ?? [];
      const files: MFile[] = await Promise.all(
        rows.map(async (row: any) => {
          let imgSrc = '';
          if (row.filePath) {
            const result = await this.readBinaryFile(row.filePath);
            imgSrc = result || '';
          }

          return {
            id: row.id,
            title: row.title,
            content: row.content,
            filePath: row.filePath,
            fileBase64: imgSrc,
            type: row.type,
            ext: row.ext,
          };
        })
      );
      return files;
    } catch (error) {
      console.error('Erro ao recuperar registros:', error);
      return [];
    }
  }

  async deleteFileRecord(id: number): Promise<void> {
    if (!this.db) {
      alert('Banco não inicializado.');
      return;
    }
    try {
      const query = `DELETE FROM files WHERE id = ?;`;
      await this.db.run(query, [id]);
      console.log('Registro excluído com sucesso.');
    } catch (error) {
      alert('Erro ao excluir registro: ' + error);
    }
  }

  /***Fim dos Métodos de Banco de Dados ***/

  private getMimeType(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    const mimeTypes: { [key: string]: string } = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'mp4': 'video/mp4',
      // Adicione outros tipos necessários
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
      this.presentAlert({
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
      this.presentAlert({
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
      this.presentAlert({
        header: 'Erro',
        message: `Erro na limpeza: ${error}`,
        buttons: ['OK']
      });
    }
  }

  /*** Métodos de UI (Alertas) ***/
  async presentAlert(alertContent: { header: string, subHeader?: string, message: string, buttons: string[] }) {
    const alert = await this.alertController.create(alertContent);
    await alert.present();
  }
}
