import { Injectable } from '@angular/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { FilesystemService } from './filesystem.service';
import { UiService } from './ui.service';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {

  db!: SQLiteDBConnection;

  constructor(
    private ui: UiService
  ) { }

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
      this.ui.presentAlert({
        header: 'Banco de Dados',
        message: 'Erro ao inicializar o banco de dados: ' + error,
        buttons: ['ok']
      });
    }
  }
}
