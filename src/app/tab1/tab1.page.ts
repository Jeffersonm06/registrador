import { Component, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton, IonButtons, IonContent, IonHeader, IonModal, IonTitle,
  IonToolbar, IonIcon, IonLabel, IonCard, IonActionSheet, AlertController,
  IonSearchbar, IonSpinner, IonRefresher, IonRefresherContent, LoadingController,
  ToastController, IonItem, IonCardHeader, IonCardTitle, IonCardContent
} from '@ionic/angular/standalone';
import { OverlayEventDetail } from '@ionic/core/components';
import { MFile } from '../interfaces/m-file';
import { FilesystemService } from '../services/filesystem.service';
import { addIcons } from 'ionicons';
import { addCircle, camera, close, film } from 'ionicons/icons';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { FilesService } from '../services/files.service';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  imports: [
    FormsModule, IonButton, IonButtons, IonContent, IonHeader, IonModal,
    IonTitle, IonToolbar, IonIcon, IonLabel, IonCard, IonActionSheet,
    IonSearchbar, IonRefresher, IonRefresherContent
  ],
})
export class Tab1Page implements OnInit {
  @ViewChild(IonModal) modal!: IonModal;

  title!: string;
  content!: string;
  files: MFile[] = [];
  filteredFiles: MFile[] = [];
  currentFile: MFile | null = null;
  selectedImage: File | null = null;
  isModalOpen = false;
  searchQuery: string = '';
  isEditing = false; // Estado de edição
  originalFile: MFile | null = null; // Cópia do arquivo original para cancelar edições
  selectedFile: File | null = null;
  category: string = 'registro';

  isActionSheetOpen = false;
  public actionSheetButtons = [
    {
      text: 'Ver arquivo',
      role: 'confirm',
      handler: async () => {
        this.setOpenModal(true, this.currentFile)
        return true;
      }
    },
    {
      text: 'Compartilhar',
      role: 'share',
      handler: async () => {
        if (this.currentFile) {
          this.fsService.shareFile(this.currentFile);
        }
        return false;
      }
    },
    {
      text: 'Delete',
      role: 'destructive',
      handler: async () => {
        if (this.currentFile !== null) {
          const confirm = await this.alertController.create({
            header: 'Confirmar',
            message: `Tem certeza que deseja deletar "${this.currentFile.title}"?`,
            buttons: [
              { text: 'Cancelar', role: 'cancel' },
              {
                text: 'Deletar',
                handler: async () => {
                  if (this.currentFile !== null) {
                    await this.fService.deleteFileRecord(this.currentFile.id);
                    this.files = await this.fService.getAllFileRecords();
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
    private fService: FilesService,
    private alertController: AlertController,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) {
    addIcons({
      film, addCircle, camera, close
    })
  }

  async ngOnInit(): Promise<void> {
    const loading = await this.loadingCtrl.create();
    await loading.present();
    try {
      this.files = await this.fService.getAllFileRecords();
      const hasPermission = await this.fsService.checkPermissions();
      if (!hasPermission) {
        alert("Permissão negada para acessar o armazenamento.");
        return;
      }
      this.filteredFiles = [...this.files];
    } catch {
      console.log('Erro ao carregar dados');
    } finally {
      loading.dismiss();
    }

  }

  filterFiles() {
    if (this.searchQuery.trim() === '') {
      this.filteredFiles = [...this.files];
    } else {
      this.filteredFiles = this.files.filter(file =>
        file.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        file.content.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    }
  }

  setOpen(isOpen: boolean, file: MFile | null) {
    this.isActionSheetOpen = isOpen;
    if (file) this.currentFile = file;
  }

  async deleteFile(file: MFile): Promise<void> {
    const loading = await this.loadingCtrl.create();
    await loading.present();
    try {
      await this.fService.deleteFileRecord(file.id);
      this.files = await this.fService.getAllFileRecords();
      this.filteredFiles = [...this.files];
    } catch (error) {
      console.error('Erro ao deletar arquivo:', error);
    } finally {
      loading.dismiss();
    }
  }


  cancel() {
    this.modal.dismiss(null, 'cancel');
    this.selectedImage = null;
    const imageInput = document.querySelector('#imageInput') as HTMLInputElement;
    if (imageInput) imageInput.value = '';
  }

  async confirm() {
    if (!this.title) return;

    try {
      const recordData: {
        title: string;
        content?: string;
        file?: File;
        filePath?: string;
        category: string;
      } = {
        title: this.title,
        content: this.content || '',
        category: this.category || '',
      };

      if (this.selectedImage) {
        recordData.file = this.selectedImage;
        recordData.filePath = this.title;
      }

      await this.fService.saveRecord(recordData);

      this.files = await this.fService.getAllFileRecords();
      this.filteredFiles = [...this.files];

      this.resetForm();

    } catch (error) {
      console.error('Erro ao salvar:', error);
      const alert = await this.alertController.create({
        header: 'Erro',
        message: `Falha ao salvar o registro (${error})`,
        buttons: ['OK']
      });
      await alert.present();
    } finally {
      this.modal.dismiss(this.title, 'confirm');
    }
  }

  private resetForm() {
    this.title = '';
    this.content = '';
    this.selectedImage = null;
    const imageInput = document.querySelector('#imageInput') as HTMLInputElement;
    if (imageInput) imageInput.value = '';
  }

  async onWillDismiss(event: CustomEvent<OverlayEventDetail>) {
    if (event.detail.role === 'confirm') {
      this.files = await this.fService.getAllFileRecords();
      this.filteredFiles = [...this.files];
    }
  }

  async ionViewDidEnter() {
    this.files = await this.fService.getAllFileRecords();
    this.filteredFiles = [...this.files];
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.selectedImage = file;
    }
  }

  setOpenModal(open: boolean, currentFile: MFile | null) {
    this.isModalOpen = open;
    if (open !== false && currentFile != null) this.currentFile = currentFile;
  }

  async handleRefresh(event: CustomEvent) {
    try {
      this.files = await this.fService.getAllFileRecords();
      this.filteredFiles = [...this.files];
    } catch (error) {
      console.error('Erro ao atualizar:', error);
    } finally {
      (event.target as HTMLIonRefresherElement).complete();
    }
  }

  // Inicia a edição
  startEditing() {
    this.isEditing = true;
    this.originalFile = { ...this.currentFile! }; // Salva cópia do original
  }

  // Cancela a edição e restaura valores originais
  cancelEditing() {
    this.isEditing = false;
    if (this.originalFile) {
      this.currentFile = { ...this.originalFile };
    }
    this.selectedFile = null; // Limpa arquivo selecionado
  }

  // Salva alterações do arquivo
  async saveFileChanges() {
    if (!this.currentFile) return;

    try {
      // Se um novo arquivo foi selecionado
      if (this.selectedFile) {
        // Remove o arquivo antigo (opcional)
        if (this.currentFile.filePath) {
          await Filesystem.deleteFile({
            path: `FileSystem/${this.currentFile.filePath}`,
            directory: Directory.Data,
          });
        }

        // Armazena o novo arquivo
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = this.selectedFile.name.split('.').pop()?.toLowerCase() || '';
        const uniqueFilename = `file_${uniqueSuffix}.${ext}`;

        this.fsService.createFile(uniqueFilename, this.selectedFile)

        // Atualiza filePath, ext e type
        this.currentFile.filePath = uniqueFilename;
        this.currentFile.ext = ext;
        this.currentFile.typeFile = this.getFileType(ext);
      }

      // Atualiza o registro no banco de dados
      await this.fService.updateFile(this.currentFile);
      this.isEditing = false;

      // Recarrega a lista de arquivos
      this.files = await this.fService.getAllFileRecords();
      this.filteredFiles = [...this.files];

      this.showToast('Alterações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      this.showToast('Erro ao salvar alterações.');
    }
  }

  // Determina o tipo do arquivo (image, video)
  private getFileType(ext: string): 'image' | 'video' | 'text' {
    const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'];
    const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm'];
    return imageExtensions.includes(ext) ? 'image' : videoExtensions.includes(ext) ? 'video' : 'text';
  }

  // Manipula seleção de novo arquivo
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
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
