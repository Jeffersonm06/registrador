import { Component, OnInit, ViewChild } from '@angular/core';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonCard,
  IonSearchbar, IonActionSheet, IonModal, IonButton, IonIcon,
  IonRefresher, LoadingController, ToastController, IonButtons,
  IonLabel, IonRefresherContent, AlertController
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { addCircle, close, person, camera } from 'ionicons/icons';
import { FilesystemService } from '../services/filesystem.service';
import { OverlayEventDetail } from '@ionic/core';
import { People } from '../interfaces/people';
import { Filesystem, Directory } from '@capacitor/filesystem';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: true,
  imports: [
    IonRefresherContent, IonLabel, IonButtons, IonHeader, IonToolbar,
    IonTitle, IonContent, IonCard, IonSearchbar, IonActionSheet, IonModal,
    IonButton, IonIcon, IonRefresher, FormsModule
  ]
})
export class Tab3Page implements OnInit {
  @ViewChild(IonModal) modal!: IonModal;

  peoples: any[] = [];
  filteredPeoples: any[] = [];
  searchQuery: string = '';
  isActionSheetOpen = false;
  isModalOpen = false;
  currentPerson: People | null = null;
  newPerson: any = {
    name: '',
    email: '',
    phone: '',
    description: '',
    file: null
  };
  isEditing = false; // Estado de edição
  originalPerson: People | null = null; // Cópia da pessoa original para cancelar edições
  selectedImage:File | null = null;

  actionSheetButtons = [
    {
      text: 'Ver detalhes',
      role: 'confirm',
      handler: async () => {
        this.setOpenModal(true, this.currentPerson); // Abre o modal
        return true;
      }
    },
    {
      text: 'Delete',
      role: 'destructive',
      handler: async () => {
        if (this.currentPerson !== null) {
          const confirm = await this.alertController.create({
            header: 'Confirmar',
            message: `Tem certeza que deseja deletar as informações de "${this.currentPerson.name}"?`,
            buttons: [
              { text: 'Cancelar', role: 'cancel' },
              {
                text: 'Deletar',
                handler: async () => {
                  if (this.currentPerson !== null) {
                    await this.fsService.deleteFileRecord(this.currentPerson.id);
                    this.peoples = await this.fsService.getAllPeoples();
                    this.setOpen(false, null);
                    return true;
                  }
                  return false;
                }
              }
            ]
          });
          await confirm.present();

          return new Promise((resolve) => {
            confirm.onDidDismiss().then(({ role }) => {
              resolve(role === 'destructive');
            });
          });
        }
        return false;
      }
    },
    {
      text: 'Cancel',
      role: 'cancel',
      handler: () => {
        console.log('Cancelado');
      }
    }
  ];

  constructor(
    private fsService: FilesystemService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertController: AlertController,
  ) {
    addIcons({person,addCircle,camera,close});
  }

  async ngOnInit() {
    await this.loadPeoples();
  }

  async loadPeoples() {
    const loading = await this.loadingCtrl.create();
    await loading.present();
    try {
      this.peoples = await this.fsService.getAllPeoples();
      this.filteredPeoples = [...this.peoples];
    } catch (error) {
      console.error(error);
      this.showToast('Erro ao carregar pessoas');
    } finally {
      await loading.dismiss();
    }
  }

  filterPeoples() {
    if (!this.searchQuery) {
      this.filteredPeoples = [...this.peoples];
      return;
    }
    this.filteredPeoples = this.peoples.filter(person =>
      person.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
      person.email?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
      person.phone?.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  }

  setOpen(isOpen: boolean, person: People | null) {
    this.isActionSheetOpen = isOpen;
    if (person != null) this.currentPerson = person;
  }

  setOpenModal(isOpen: boolean, person: any) {
    this.isModalOpen = isOpen;
    if (person != null) this.currentPerson = person;
  }

  async deletePerson(id: number) {
    const loading = await this.loadingCtrl.create();
    await loading.present();
    try {
      await this.fsService.deletePeople(id);
      this.peoples = this.peoples.filter(p => p.id !== id);
      this.filterPeoples();
      this.showToast('Pessoa removida com sucesso');
    } catch (error) {
      console.error(error);
      this.showToast('Erro ao remover pessoa');
    } finally {
      await loading.dismiss();
    }
  }

  async handleRefresh(event: any) {
    await this.loadPeoples();
    event.target.complete();
  }

  onImageSelected(event: any) {
    const file = event.target.files[0];
    this.newPerson.file = file;
  }

  async onWillDismiss(event: CustomEvent<OverlayEventDetail>) {
    if (event.detail.role === 'confirm') {
      this.peoples = await this.fsService.getAllPeoples();
      this.filteredPeoples = [...this.peoples];
    }
  }

  async confirm() {
    const loading = await this.loadingCtrl.create();
    await loading.present();
    try {
      await this.fsService.savePeople(this.newPerson);
      this.showToast('Pessoa cadastrada com sucesso');
      await this.loadPeoples();
    } catch (error) {
      console.error(error);
      alert(error)
      this.showToast('Erro ao cadastrar pessoa');
    } finally {
      await loading.dismiss();
      this.modal.dismiss('confirm');
    }
  }

  cancel() {
    this.newPerson = {
      name: '',
      email: '',
      phone: '',
      description: '',
      file: null
    };
    this.modal.dismiss(null, 'cancel');
  }

  // Inicia a edição
  startEditing() {
    this.isEditing = true;
    // Salva uma cópia da pessoa original para permitir o cancelamento
    this.originalPerson = { ...this.currentPerson! };
  }

  // Cancela a edição e restaura os valores originais
  cancelEditing() {
    this.isEditing = false;
    if (this.originalPerson) {
      this.currentPerson = { ...this.originalPerson };
    }
    this.selectedImage = null; // Limpa a imagem selecionada
  }

  // Salva as alterações da pessoa
  async savePersonChanges() {
    if (!this.currentPerson) return;

    try {
      // Se uma nova imagem foi selecionada, armazene-a
      if (this.selectedImage) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = this.selectedImage.name.split('.').pop()?.toLowerCase() || '';
        const uniqueFilename = `people_${uniqueSuffix}.${ext}`;

        const base64Data = await this.fsService.blobToBase64(this.selectedImage);
        await Filesystem.writeFile({
          path: `FileSystem/${uniqueFilename}`,
          data: base64Data,
          directory: Directory.Data,
        });

        // Atualiza o filePath e a extensão
        this.currentPerson.filePath = uniqueFilename;
        this.currentPerson.ext = ext;
      }

      // Atualiza a pessoa no banco de dados
      await this.fsService.updatePerson(this.currentPerson);
      this.isEditing = false;

      // Exibe uma mensagem de sucesso
      this.showToast('Alterações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar alterações:', error);
      this.showToast('Erro ao salvar alterações.');
    }
  }

  // Manipula a seleção de uma nova imagem
  onImageNewSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedImage = input.files[0];
    }
  }

  private async showToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000
    });
    await toast.present();
  }
}