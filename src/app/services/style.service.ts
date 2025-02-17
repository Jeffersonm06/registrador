import { Injectable } from '@angular/core';
import { PreferencesService } from './preferences.service';

@Injectable({
  providedIn: 'root'
})
export class StyleService {

  constructor(
    private prefer: PreferencesService
  ) { }

  async setFont(font: string, fontSize: number) {
    try {
      // Armazena a fonte e o tamanho da fonte no Preferences
      await this.prefer.set([
        { key: 'fontFamily', value: font },
        { key: 'fontSize', value: fontSize.toString() }
      ]);
      
      // Aplica a fonte e o tamanho globalmente
      document.body.style.fontFamily = font;
      document.body.style.fontSize = `${fontSize}px`;
    } catch (error) {
      console.error('Erro ao salvar a fonte ou o tamanho:', error);
    }
  }

  async loadStyle() {
    try {
      // Tenta carregar a fonte e o tamanho da fonte salvos no Preferences
      const [font, fontSize] = await this.prefer.get(['fontFamily', 'fontSize']);
      
      // Se houver fonte e tamanho salvos, aplica-os
      if (font && fontSize) {
        document.body.style.fontFamily = font;
        document.body.style.fontSize = `${fontSize}px`;
      } else {
        // Caso não haja, aplica valores padrões
        document.body.style.fontFamily = 'Arial, sans-serif';
        document.body.style.fontSize = '16px';
      }
    } catch (error) {
      console.error('Erro ao carregar os estilos:', error);
      document.body.style.fontFamily = 'Arial, sans-serif'; // Fonte padrão
      document.body.style.fontSize = '16px'; // Tamanho padrão
    }
  }
}
