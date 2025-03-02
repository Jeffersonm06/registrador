import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { FilesystemService } from './filesystem.service';
import { People } from '../interfaces/people';

@Injectable({
  providedIn: 'root'
})
export class PeopleService {

  constructor(
    private data: DatabaseService,
    private fsSevice: FilesystemService
  ) { }

  async savePeople(data: {
    name: string;
    email?: string;
    phone?: string;
    description?: string;
    file?: File;
    type: string;
  }): Promise<any> {
    if (!this.data.db) throw new Error('Banco não inicializado');
    if (!data.name) throw new Error('Nome é obrigatório');

    let filePath = '';
    let ext = '';

    try {
      if (data.file) {
        await this.fsSevice.createAppFolder();

        const hasPermission = await this.fsSevice.checkPermissions();
        if (!hasPermission) {
          throw new Error('Permissão de armazenamento negada');
        }

        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const originalName = data.file.name;
        ext = originalName.split('.').pop()?.toLowerCase() || '';
        const uniqueFilename = `people_${uniqueSuffix}.${ext}`;

        await this.fsSevice.createFile(uniqueFilename, data.file)

        filePath = uniqueFilename;
      }

      const query = `
        INSERT INTO peoples 
          (name, email, phone, filePath, ext, description, type) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const result = await this.data.db.run(query, [
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
  async getAllPeoples(): Promise<any[]> {
    if (!this.data.db) {
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
      const result = await this.data.db.query(query);
      const rows = result.values ?? [];

      const peoples = await Promise.all(
        rows.map(async (row: any) => {
          let fileBase64 = '';
          if (row.filePath) {
            const fileData = await this.fsSevice.readBinaryFile(row.filePath);
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

  async deletePeople(id: number): Promise<void> {
    if (!this.data.db) {
      throw new Error('Banco não inicializado.');
    }

    try {
      const query = `SELECT filePath FROM peoples WHERE id = ?`;
      const result = await this.data.db.query(query, [id]);

      if (result.values && result.values.length > 0) {
        const filePath = result.values[0].filePath;

        this.fsSevice.deleteFile(filePath);
      }

      const deleteQuery = `DELETE FROM peoples WHERE id = ?`;
      await this.data.db.run(deleteQuery, [id]);

      console.log('Pessoa excluída com sucesso.');
    } catch (error) {
      console.error('Erro ao excluir pessoa:', error);
      throw error;
    }
  }

  async updatePerson(person: People): Promise<void> {
    if (!this.data.db) throw new Error('Banco não inicializado');

    try {
      await this.data.db.run(
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

}
