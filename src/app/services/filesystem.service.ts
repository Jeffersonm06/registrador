import { Injectable } from '@angular/core';
import { AlertController } from '@ionic/angular/standalone';
import { MFile } from '../interfaces/m-file';

import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { People } from '../interfaces/people';

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
          typeFile TEXT,
          category TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

        CREATE TRIGGER IF NOT EXISTS update_files_timestamp
        AFTER UPDATE ON files
        FOR EACH ROW
        BEGIN
          UPDATE files SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
        END;


        CREATE TABLE IF NOT EXISTS peoples (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          email TEXT,
          phone TEXT,
          filePath TEXT,
          ext TEXT,
          description TEXT,
          type TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TRIGGER IF NOT EXISTS update_peoples_timestamp
        AFTER UPDATE ON peoples
        FOR EACH ROW
        BEGIN
          UPDATE peoples SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
        END;

      `;

      await this.db.execute(createTableQuery);
    } catch (error) {
      this.presentAlert({
        header: 'Banco de Dados',
        message: 'Erro ao inicializar o banco de dados: ' + error,
        buttons: ['ok']
      });
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

  async saveRecord(data: {
    title: string;
    content?: string;
    file?: File;
    filePath?: string;
    category: string;
  }): Promise<MFile> {
    if (!this.db) throw new Error('Banco não inicializado');
    if (!data.title) throw new Error('Título é obrigatório');

    let filePath = '';
    let typeFile: 'text' | 'image' | 'video' = 'text';
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
          typeFile = 'image';
        } else if (videoExtensions.includes(ext)) {
          typeFile = 'video';
        } else {
          throw new Error('Tipo de arquivo não suportado');
        }

        const uniqueFilename = `${Date.now()}_${data.filePath}`;

        await this.createFile(uniqueFilename, data.file)

        filePath = uniqueFilename;
      }

      if (!data.content && !data.file) {
        throw new Error('Dados insuficientes para o registro');
      }

      const query = `INSERT INTO files (title, content, filePath, typeFile, category, ext) VALUES (?, ?, ?, ?, ?, ?)`;
      const result = await this.db.run(query, [
        data.title,
        content,
        filePath,
        typeFile,
        data.category,
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
        typeFile: typeFile,
        category: data.category,
        ext: ext,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

    } catch (error) {
      console.error('Erro no saveRecord:', error);
      throw error;
    }
  }

  async savePeople(data: {
    name: string;
    email?: string;
    phone?: string;
    description?: string;
    file?: File;
    type: string;
  }): Promise<any> {
    if (!this.db) throw new Error('Banco não inicializado');
    if (!data.name) throw new Error('Nome é obrigatório');

    let filePath = '';
    let ext = '';

    try {
      if (data.file) {
        await this.createAppFolder();

        const hasPermission = await this.checkPermissions();
        if (!hasPermission) {
          throw new Error('Permissão de armazenamento negada');
        }

        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const originalName = data.file.name;
        ext = originalName.split('.').pop()?.toLowerCase() || '';
        const uniqueFilename = `people_${uniqueSuffix}.${ext}`;

        await this.createFile(uniqueFilename, data.file)

        filePath = uniqueFilename;
      }

      const query = `
        INSERT INTO peoples 
          (name, email, phone, filePath, ext, description, type) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const result = await this.db.run(query, [
        data.name,
        data.email || null,
        data.phone || null,
        filePath || null,
        ext || null,
        data.description || null,
        data.type || null,
      ]);

      if (!result.changes?.lastId) {
        throw new Error('Falha ao inserir registro de pessoa');
      }

      return {
        id: result.changes.lastId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        description: data.description,
        filePath: filePath,
        ext: ext,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

    } catch (error) {
      console.error('Erro no savePeople:', error);
      throw error;
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

  async getAllFileRecords(): Promise<MFile[]> {
    if (!this.db) {
      console.error('Banco não inicializado.');
      return [
        {
          id: 0,
          title: 'Arquivo',
          content: 'ababababa',
          filePath: 'assets/image.png',
          fileBase64: 'assets/image.png',
          typeFile: 'image',
          category: '',
          ext: 'png',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      ];
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
            typeFile: row.typeFile,
            category: row.category,
            ext: row.ext,
            created_at: row.created_at,
            updated_at: row.updated_at
          };
        })
      );
      return files;
    } catch (error) {
      console.error('Erro ao recuperar registros:', error);
      return [];
    }
  }

  async getAllPeoples(): Promise<any[]> {
    if (!this.db) {
      console.error('Banco não inicializado.');
      return [
        {
          id: 0,
          name: 'Jeff',
          email: 'w@getMaxListeners.com',
          filePath: 'assets/image.png',
          fileBase64: 'assets/image.png',
          ext: 'png',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
    }
    try {
      const query = `SELECT * FROM peoples`;
      const result = await this.db.query(query);
      const rows = result.values ?? [];

      const peoples = await Promise.all(
        rows.map(async (row: any) => {
          let fileBase64 = '';
          if (row.filePath) {
            const fileData = await this.readBinaryFile(row.filePath);
            fileBase64 = fileData || '';
          }

          return {
            id: row.id,
            name: row.name,
            email: row.email,
            phone: row.phone,
            description: row.description,
            filePath: row.filePath,
            fileBase64: fileBase64,
            ext: row.ext,
            created_at: row.created_at,
            updated_at: row.updated_at
          };
        })
      );

      return peoples;
    } catch (error) {
      console.error('Erro ao recuperar pessoas:', error);
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

  async deletePeople(id: number): Promise<void> {
    if (!this.db) {
      throw new Error('Banco não inicializado.');
    }

    try {
      const query = `SELECT filePath FROM peoples WHERE id = ?`;
      const result = await this.db.query(query, [id]);

      if (result.values && result.values.length > 0) {
        const filePath = result.values[0].filePath;

        if (filePath) {
          await Filesystem.deleteFile({
            path: `${appFolder}/${filePath}`,
            directory: Directory.Data,
          });
        }
      }

      const deleteQuery = `DELETE FROM peoples WHERE id = ?`;
      await this.db.run(deleteQuery, [id]);

      console.log('Pessoa excluída com sucesso.');
    } catch (error) {
      console.error('Erro ao excluir pessoa:', error);
      throw error;
    }
  }

  async updatePerson(person: People): Promise<void> {
    if (!this.db) throw new Error('Banco não inicializado');

    try {
      await this.db.run(
        `UPDATE peoples 
         SET name = ?, email = ?, phone = ?, description = ?, filePath = ?, ext = ? 
         WHERE id = ?;`,
        [person.name, person.email, person.phone, person.description, person.filePath, person.ext, person.id]
      );

      console.log('Pessoa atualizada com sucesso.');
    } catch (error) {
      console.error('Erro ao atualizar pessoa:', error);
      throw error;
    }
  }

  async updateFile(file: MFile): Promise<void> {
    if (!this.db) throw new Error('Banco não inicializado');

    try {
      await this.db.run(
        `UPDATE files 
         SET title = ?, content = ?, filePath = ?, ext = ?, typeFile = ?, category = ? 
         WHERE id = ?;`,
        [file.title, file.content, file.filePath, file.ext, file.typeFile, file.category, file.id]
      );

      console.log('Arquivo atualizado com sucesso.');
    } catch (error) {
      console.error('Erro ao atualizar arquivo:', error);
      throw error;
    }
  }


  /***Fim dos Métodos de Banco de Dados ***/

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
