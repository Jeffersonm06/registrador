import { Injectable } from '@angular/core';
import { MFile } from '../interfaces/m-file';
import { DatabaseService } from './database.service';
import { FilesystemService } from './filesystem.service';

@Injectable({
  providedIn: 'root'
})
export class FilesService {

  constructor(
    private data: DatabaseService,
    private fsService: FilesystemService
  ) { }

  async saveRecord(data: {
    title: string;
    content?: string;
    file?: File;
    filePath?: string;
    category: string;
  }): Promise<MFile> {
    if (!this.data.db) throw new Error('Banco não inicializado');
    if (!data.title) throw new Error('Título é obrigatório');

    let filePath = '';
    let typeFile: 'text' | 'image' | 'video' = 'text';
    let ext = '';
    let content = data.content || '';

    try {
      if (data.file && data.filePath) {
        await this.fsService.createAppFolder();

        const permStatus = await this.fsService.checkPermissions();
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

        await this.fsService.createFile(uniqueFilename, data.file)

        filePath = uniqueFilename;
      }

      if (!data.content && !data.file) {
        throw new Error('Dados insuficientes para o registro');
      }

      const query = `INSERT INTO files (title, content, filePath, typeFile, category, ext) VALUES (?, ?, ?, ?, ?, ?)`;
      const result = await this.data.db.run(query, [
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

  async getAllFileRecords(): Promise<MFile[]> {
    if (!this.data.db) {
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
      const result = await this.data.db.query(query);
      const rows = result.values ?? [];
      const files: MFile[] = await Promise.all(
        rows.map(async (row: any) => {
          let imgSrc = '';
          if (row.filePath) {
            const result = await this.fsService.readBinaryFile(row.filePath);
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

  async updateFile(file: MFile): Promise<void> {
    if (!this.data.db) throw new Error('Banco não inicializado');

    try {
      await this.data.db.run(
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

  async deleteFileRecord(id: number): Promise<void> {
    if (!this.data.db) {
      alert('Banco não inicializado.');
      return;
    }
    try {
      const query = `DELETE FROM files WHERE id = ?;`;
      await this.data.db.run(query, [id]);
      console.log('Registro excluído com sucesso.');
    } catch (error) {
      alert('Erro ao excluir registro: ' + error);
    }
  }
}
