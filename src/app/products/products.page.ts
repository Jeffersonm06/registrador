import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonList,
  IonItem, IonLabel, IonModal, IonIcon, IonFooter, IonButtons, IonCard,
  IonSearchbar, IonRefresher, IonRefresherContent, IonBadge, IonFabButton,
  IonFab, IonActionSheet
} from '@ionic/angular/standalone';
import { Product } from '../interfaces/product';
import { addIcons } from 'ionicons';
import { addCircle, close, trash, create, save, closeCircle } from 'ionicons/icons';
import { ProductsService } from '../services/prodcts.service';
import { ActionSheetButton } from '@ionic/core';

@Component({
  selector: 'app-products',
  templateUrl: './products.page.html',
  styleUrls: ['./products.page.scss'],
  standalone: true,
  imports: [IonActionSheet, IonBadge, IonCard, IonButtons, IonContent, IonHeader,
    IonTitle, IonToolbar, CommonModule, FormsModule, IonButton,
    IonLabel, IonModal, IonIcon, IonSearchbar
  ]
})
export class ProductsPage implements OnInit {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  selectedProduct: Product = this.getEmptyProduct();
  isModalOpen = false;
  searchQuery = '';
  isActionSheetOpen = false;
  actionSheetButtons: ActionSheetButton[] = [];
  isEditing = false;
  inCreate = false;

  constructor(
    private pdService: ProductsService
  ) {
    addIcons({close,create,save,closeCircle,addCircle,trash});
  }

  async ngOnInit() {
    await this.loadProducts();
  }

  async loadProducts() {
    this.products = await this.pdService.getProducts();
    this.filteredProducts = [...this.products];
  }

  filterProducts() {
    if (!this.searchQuery) {
      this.filteredProducts = [...this.products];
      return;
    }
    const query = this.searchQuery.toLowerCase();
    this.filteredProducts = this.products.filter(product =>
      product.name.toLowerCase().includes(query) ||
      product.category.toLowerCase().includes(query)
    );
  }

  openModal(product?: Product) {
    this.selectedProduct = product ? product : this.getEmptyProduct();
    if (!product){
      this.inCreate = true;
    }else{
      this.inCreate = false;
    }
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.selectedProduct = this.getEmptyProduct();
  }

  // Novo método para tratar o fechamento do modal
  onWillDismiss(event: Event) {
    this.closeModal();
  }

  // Novo método para confirmar ação do modal
  confirm() {
    this.saveProduct();
  }

  // Novo método para cancelar ação do modal
  cancel() {
    this.closeModal();
  }

  async deleteProduct(id: number) {
    await this.pdService.deleteProduct(id);
    await this.loadProducts();
  }

  async handleRefresh(event: any) {
    await this.loadProducts();
    event.target.complete();
  }

  getEmptyProduct(): Product {
    return {
      id: 0,
      name: '',
      description: '',
      category: '',
      price: 0,
      quantity: 0,
      barcode: '',
      supplier: ''
    };
  }

  // Método para abrir/fechar ActionSheet
  setOpenActionSheet(isOpen: boolean, product?: Product) {
    if (product) this.selectedProduct = product;
    console.log(product)

    this.actionSheetButtons = [
      {
        text: 'Editar',
        handler: () => this.openModal(product)
      },
      {
        text: 'Excluir',
        role: 'destructive',
        handler: () => {
          if (product?.id) this.deleteProduct(product.id);
        }
      },
      {
        text: 'Cancelar',
        role: 'cancel'
      }
    ];

    this.isActionSheetOpen = isOpen;
  }

  startEditing() {
    this.isEditing = true;
  }
  
  cancelEditing() {
    this.isEditing = false;
    this.loadProducts(); // Recarrega os dados originais
  }
  
  async saveProduct() {
    try {
      if (this.selectedProduct.id) {
        await this.pdService.updateProduct(this.selectedProduct);
      } else {
        await this.pdService.addProduct(this.selectedProduct);
      }
      this.isEditing = false;
      await this.loadProducts();
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
    }
  }
}