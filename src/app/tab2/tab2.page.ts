import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonSelect, IonSelectOption,
  IonToggle, IonGrid, IonRow, IonCol, IonButton
} from '@ionic/angular/standalone';
import { StyleService } from '../services/style.service';
import { PreferencesService } from '../services/preferences.service';

interface Page {
  title: string;
  active: boolean;
}
@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  imports: [
    FormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonSelect,
    IonSelectOption, IonToggle, IonButton
  ]
})

export class Tab2Page implements OnInit {

  selectedFont = 'Arial';
  selectedFontSize = 16;
  securityMode: boolean = false;
  passwordActive: boolean = false;
  password: string = '';
  attemptLimit: boolean = false;
  attemptOfNumber: number = 3;
  /* deletePeriodically: boolean = false;
  deletePeriod: any; */

  pages: Page[] = [
    { title: 'Arquivos', active: false },
    { title: 'Pessoas', active: false },
    { title: 'Clientes', active: false },
    { title: 'Serviços', active: false },
    { title: 'Fornecedores', active: false },
    { title: 'Produtos', active: false },
    { title: 'Pagamentos', active: false },
  ]

  deletePeriodOptions: any = [
    { value: 1, label: '1 dia' },
    { value: 5, label: '5 dias' },
    { value: 15, label: '15 dias' },
    { value: 30, label: '30 dias' }
  ];

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
    private styleService: StyleService,
    private pf: PreferencesService
  ) { }

  ngOnInit() {
    this.loadPreferences()
  }

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
    this.styleService.setFont(this.selectedFont, this.selectedFontSize);
  }

  async loadPreferences() {
    // Chaves das preferências
    const keys = [
      'mode', 'passwordActive', 'password', 'attemptLimit',
      'attemptOfNumber', 'deletePeriodically', 'deletePeriod',
      ...this.pages.map(page => `page_${page.title}`) // Adiciona as chaves das páginas
    ];

    // Carrega todas as preferências
    const preferences = await this.pf.get(keys);

    // Atribui as preferências gerais
    this.securityMode = preferences[0] === 'enable';
    this.passwordActive = preferences[1] === 'true';
    this.password = preferences[2] || '';
    this.attemptLimit = preferences[3] === 'true';
    this.attemptOfNumber = preferences[4] ? Number(preferences[4]) : 3;
    /* this.deletePeriodically = preferences[5] === 'true';
    this.deletePeriod = preferences[6] ? Number(preferences[6]) : null; */

    // Atribui as preferências das páginas
    this.pages.forEach((page, index) => {
      const pageKey = `page_${page.title}`;
      const storedValue = preferences[keys.indexOf(pageKey)];
      page.active = storedValue === 'true';
    });
  }

  async savePreferences() {
    const preferences = [
      { key: 'mode', value: this.securityMode ? 'enable' : 'disable' },
      { key: 'passwordActive', value: this.passwordActive ? 'true' : 'false' },
      { key: 'password', value: this.password },
      { key: 'attemptLimit', value: this.attemptLimit ? 'true' : 'false' },
      { key: 'attemptOfNumber', value: this.attemptOfNumber.toString() },
      /* { key: 'deletePeriodically', value: this.deletePeriodically ? 'true' : 'false' },
      { key: 'deletePeriod', value: this.deletePeriod ? this.deletePeriod.toString() : '' } */
      ...this.pages.map(page => ({
        key: `page_${page.title}`,  // Ex: page_Arquivos, page_Pessoas
        value: page.active ? 'true' : 'false'
      }))
    ];
    await this.pf.set(preferences);
  }

  onPageToggleChange() {
    this.savePreferences();
  }

  onSecurityToggleChange(event: any) {
    this.securityMode = event.detail.checked;
    this.savePreferences();
  }

  onPasswordToggleChange(event: any) {
    this.passwordActive = event.detail.checked;
    this.savePreferences();
  }

  onAttemptLimitToggleChange(event: any) {
    this.attemptLimit = event.detail.checked;
    this.savePreferences();
  }

  /* onDeletePeriodToggleChange(event: any) {
    this.deletePeriodically = event.detail.checked;
    this.savePreferences();
  } */

  reload() {
    window.location.reload()
  }
}