import { Component, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonModal,
  IonTitle,
  IonToolbar,
  IonIcon,
  IonLabel,
  IonCard,
  IonActionSheet,
  AlertController,
  IonSearchbar,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/angular/standalone';
import { OverlayEventDetail } from '@ionic/core/components';
import { MFile } from '../interfaces/m-file';
import { FilesystemService } from '../services/filesystem.service';
import { TtsService } from '../services/tts.service';
import { addIcons } from 'ionicons';
import { addCircle, film } from 'ionicons/icons';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  imports: [
    FormsModule,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonModal,
    IonTitle,
    IonToolbar,
    IonIcon,
    IonLabel,
    IonCard,
    IonActionSheet,
    IonSearchbar,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
  ],
})
export class Tab1Page implements OnInit {
  @ViewChild(IonModal) modal!: IonModal;

  message = '';
  title!: string;
  content!: string;
  files: MFile[] = [];
  filteredFiles: MFile[] = [];
  currentFile: MFile | null = null;
  selectedImage: File | null = null;
  isModalOpen = false;
  searchQuery: string = '';
  speaking = false;

  isActionSheetOpen = false;
  public actionSheetButtons = [
    {
      text: 'Ver arquivo',
      role: 'confirm',
      handler: async () => {
        this.setOpenModal(true, this.currentFile); // Abre o modal
        return true;
      }
    },
    {
      text: 'Compartilhar',
      role: 'confirm',
      handler: async () => {
        if (this.currentFile) {
          this.filesystemService.shareFile(this.currentFile);
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
                    // Utiliza o método do DB para deletar o registro, assumindo que currentFile.id existe.
                    await this.filesystemService.deleteFileRecord(this.currentFile.id);
                    this.files = await this.filesystemService.getAllFileRecords();
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
    private filesystemService: FilesystemService,
    private alertController: AlertController,
    private tts: TtsService
  ) {
    addIcons({
      film, addCircle
    })
   }

  async ngOnInit(): Promise<void> {
    // Utilize o método que recupera os registros do banco de dados
    setTimeout(async () => {
      this.files = await this.filesystemService.getAllFileRecords();
      console.log(this.files);

    // Checa permissões (se necessário)
    const hasPermission = await this.filesystemService.checkPermissions();
    if (!hasPermission) {
      alert("Permissão negada para acessar o armazenamento.");
      return;
    }
    this.filteredFiles = [...this.files];
    }, 3000)

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
    console.log('Arquivo selecionado:', this.currentFile);
  }

  async deleteFile(file: MFile): Promise<void> {
    try {
      // Agora usa o método do banco para exclusão (assumindo que file.id existe)
      await this.filesystemService.deleteFileRecord(file.id);
      this.files = await this.filesystemService.getAllFileRecords();
      this.filteredFiles = [...this.files];
    } catch (error) {
      console.error('Erro ao deletar arquivo:', error);
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
      // Dados base para todos os tipos de registro
      const recordData: {
        title: string;
        content?: string;
        file?: File;
        filePath?: string;
      } = {
        title: this.title,
        content: this.content || ''
      };

      // Se houver imagem/vídeo selecionada, adiciona o arquivo e gera um nome único
      if (this.selectedImage) {
        const extension = this.selectedImage.name.split('.').pop();

        recordData.file = this.selectedImage;
        recordData.filePath = this.title;
        // Se desejar, pode manter o conteúdo textual junto com a mídia.
      }

      // Salva usando o método unificado que aceita tanto texto quanto arquivo
      await this.filesystemService.saveRecord(recordData);

      // Atualiza a lista de registros
      this.files = await this.filesystemService.getAllFileRecords();
      this.filteredFiles = [...this.files];

      // Limpa os campos do formulário
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

  // Método auxiliar para limpar o formulário
  private resetForm() {
    this.title = '';
    this.content = '';
    this.selectedImage = null;
    const imageInput = document.querySelector('#imageInput') as HTMLInputElement;
    if (imageInput) imageInput.value = '';
  }

  async onWillDismiss(event: CustomEvent<OverlayEventDetail>) {
    if (event.detail.role === 'confirm') {
      this.files = await this.filesystemService.getAllFileRecords();
      this.filteredFiles = [...this.files];
    }
  }

  async ionViewDidEnter() {
    this.files = await this.filesystemService.getAllFileRecords();
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

  speak(text: string) {
    this.speaking = true;
    console.log(this.speaking);
    this.tts.speak(text, () => {
      this.speaking = false;
      console.log(this.speaking);
    });
  }

  stop() {
    this.speaking = false;
    this.tts.stop();
  }

  async handleRefresh(event: CustomEvent) {
    try {
      this.files = await this.filesystemService.getAllFileRecords();
      this.filteredFiles = [...this.files];
    } catch (error) {
      console.error('Erro ao atualizar:', error);
    } finally {
      (event.target as HTMLIonRefresherElement).complete();
    }
  }
}
