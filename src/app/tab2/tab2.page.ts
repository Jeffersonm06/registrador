import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonLabel,
  IonItem,
  IonList,
  IonSelect,
  IonSelectOption
} from '@ionic/angular/standalone';
import { StyleService } from '../services/style.service';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonSelect,
    IonSelectOption
  ]
})
export class Tab2Page {

  selectedFont = 'Arial';
  selectedFontSize = 16;

  fonts = [
    { name: 'Arial', value: 'Arial, sans-serif' },
    { name: 'Courier New', value: '"Courier New", monospace' },
    { name: 'Georgia', value: 'Georgia, serif' },
    { name: 'Times New Roman', value: '"Times New Roman", serif' },
    { name: 'Verdana', value: 'Verdana, sans-serif' },
    { name: 'Roboto', value: '"Roboto", sans-serif' }, // Google Font
    { name: 'Pacifico', value: '"Pacifico", cursive' }, // Google Font
    { name: 'Poppins', value: '"Poppins", sans-serif' } // Google Font
  ];

  fontSizes = [16, 18, 20, 22, 24];

  constructor(
    private styleService: StyleService
  ) { }

  handleFontChange(event: CustomEvent) {
    const font = event.detail.value;
    this.selectedFont = font;
    this.applyStyle();
  }

  handleFontSizeChange(event: CustomEvent) {
    const fontSize = event.detail.value;
    this.selectedFontSize = fontSize;
    this.applyStyle();
  }

  applyStyle() {
    // Aplica a fonte e o tamanho
    this.styleService.setFont(this.selectedFont, this.selectedFontSize);
  }

}
