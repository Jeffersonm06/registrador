import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { Product } from '../interfaces/product';
import { UiService } from './ui.service';

@Injectable({
  providedIn: 'root'
})
export class ProductsService {
  constructor(
    private data: DatabaseService,
    private ui: UiService
  ) { }

  async addProduct(product: Product) {
    try {
      const query = `INSERT INTO products (name, description, category, price, quantity, barcode, supplier) VALUES (?, ?, ?, ?, ?, ?, ?);`;
      const values = [
        product.name,
        product.description || '',
        product.category,
        product.price,
        product.quantity,
        product.barcode,
        product.supplier || ''
      ];
      await this.data.db.run(query, values);
    } catch (error) {
      this.ui.presentAlert({
        header: 'Erro',
        message: 'Erro ao adicionar produto: ' + error,
        buttons: ['ok']
      });
    }
  }

  async getProducts(): Promise<Product[]> {
    try {
      const query = `SELECT * FROM products;`;
      const result = await this.data.db.query(query, []);
      const rows = result.values ?? [];
      const products: Product[] = await Promise.all(
        rows.map(async (row) => {
          return {
            id: row.id,
            name: row.name,
            description: row.description,
            category: row.category,
            price: row.price,
            quantity: row.quantity,
            barcode: row.barcode,
            supplier: row.supplier,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt
          };
        }
        ));
      if (products.length > 0) {
        return products;
      }
      return [{
        id: 1,
        name: 'Smartphone X',
        category: 'Eletrônicos',
        price: 1999.99,
        quantity: 10,
        barcode: '1234567890123',
        description: 'Um smartphone moderno com câmera de alta qualidade e bateria de longa duração.'
      }];
    } catch (error) {
      this.ui.presentAlert({
        header: 'Erro',
        message: 'Erro ao buscar produtos: ' + error,
        buttons: ['ok']
      })
      return [];
    }
  }

  async updateProduct(product: Product) {
    try {
      const query = `UPDATE products SET name = ?, description = ?, category = ?, price = ?, quantity = ?, barcode = ?, supplier = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?;`;
      const values = [
        product.name,
        product.description || '',
        product.category,
        product.price,
        product.quantity,
        product.barcode,
        product.supplier || '',
        product.id
      ];
      await this.data.db.run(query, values);
    } catch (error) {
      this.ui.presentAlert({
        header: 'Erro',
        message: 'Erro ao atualizar produto: ' + error,
        buttons: ['ok']
      })
    }
  }

  async deleteProduct(id: number) {
    try {
      const query = `DELETE FROM products WHERE id = ?;`;
      await this.data.db.run(query, [id]);
    } catch (error) {
      this.ui.presentAlert({
        header: 'Erro',
        message: 'Erro ao deletar produto: ' + error,
        buttons: ['ok']
      })
    }
  }
}
