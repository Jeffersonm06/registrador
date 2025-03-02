import { Component, EnvironmentInjector, inject } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { people, folder, cog, card, cart, business, cash } from 'ionicons/icons';
import { PreferencesService } from '../services/preferences.service';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
})
export class TabsPage {
  public environmentInjector = inject(EnvironmentInjector);

  // Variáveis para controlar a visibilidade das tabs
  showArquivos: boolean = true;
  showPessoas: boolean = true;
  showClientes: boolean = true;
  showPagamentos: boolean = true;
  showProdutos: boolean = true;
  showServicos: boolean = true;
  showFornecedores: boolean = true;

  constructor(
    private pf: PreferencesService,
  ) {
    // Adiciona os ícones usados nas tabs
    addIcons({ people, folder, cog, card, cart, business, cash });
  }

  async ionViewWillEnter() {
    // Carrega preferências ao entrar na página
    const [
      showArquivos,
      showPessoas,
      showClientes,
      showPagamentos,
      showProdutos,
      showServicos,
      showFornecedores
    ] = await this.pf.get([
      'page_Arquivos', 'page_Pessoas', 'page_Clientes',
      'page_Pagamentos', 'page_Produtos', 'page_Serviços',
      'page_Fornecedores',
    ]);

    // Atribui os valores das preferências às variáveis
    this.showArquivos = showArquivos === 'true';
    this.showPessoas = showPessoas === 'true';
    this.showClientes = showClientes === 'true';
    this.showPagamentos = showPagamentos === 'true';
    this.showProdutos = showProdutos === 'true';
    this.showServicos = showServicos === 'true';
    this.showFornecedores = showFornecedores === 'true';
  }
}