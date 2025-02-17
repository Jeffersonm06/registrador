import { Component, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonModal,
  IonTitle,
  IonToolbar,
  IonTextarea,
  IonList,
  IonIcon,
  IonLabel,
  IonCard,
  IonActionSheet,
  AlertController,
  IonSearchbar,
  IonSpinner
} from '@ionic/angular/standalone';
import { OverlayEventDetail } from '@ionic/core/components';
import { MFile } from '../interfaces/m-file';
import { FilesystemService } from '../services/filesystem.service';
import { TtsService } from '../services/tts.service';

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
    IonSpinner
  ],
})
export class Tab1Page implements OnInit {
  @ViewChild(IonModal) modal!: IonModal;

  message = '';
  title!: string;
  description!: string;
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
        return true; // Impede o fechamento automático do Action Sheet
      }
    },
    {
      text: 'Compartilhar',
      role: 'confirm',
      handler: async () => {
        if (this.currentFile?.type === 'image' || this.currentFile?.type === 'video') {
          this.filesystemService.shareFile(this.currentFile);
        } else if (this.currentFile !== null) {
          this.filesystemService.shareText(this.currentFile);
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
              {
                text: 'Cancelar',
                role: 'cancel'
              },
              {
                text: 'Deletar',
                handler: async () => {
                  if (this.currentFile !== null) {
                    await this.deleteFile(this.currentFile);
                    this.files = await this.filesystemService.listFiles();
                    this.setOpen(false, null);
                    return true; // Retorna true após a exclusão
                  }
                  return false; // Retorna false se não houver arquivo
                }
              }
            ]
          });
    
          await confirm.present();
    
          return new Promise((resolve) => {
            confirm.onDidDismiss().then(({ role }) => {
              resolve(role === 'destructive'); // Retorna true se confirmado
            });
          });
        }
        return false; // Retorna false se nenhum arquivo for selecionado
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
  ) { }

  async ngOnInit(): Promise<void> {
    this.files = await this.filesystemService.listFiles();
    console.log(this.files)

    const hasPermission = await this.filesystemService.checkPermissions();
    if (!hasPermission) {
      alert("Permissão negada para acessar o armazenamento.");
      return;
    }
    this.filteredFiles = [...this.files];
  }

  filterFiles() {
    if (this.searchQuery.trim() === '') {
      this.filteredFiles = [...this.files]; // Se não houver pesquisa, mostra todos os arquivos
    } else {
      this.filteredFiles = this.files.filter(file =>
        file.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        file.description.toLowerCase().includes(this.searchQuery.toLowerCase())
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
      await this.filesystemService.deleteFile(file.path);
      if (file.relatedFile) {
        await this.filesystemService.deleteFile(file.relatedFile.path);
      }
      this.files = await this.filesystemService.listFiles(); // Atualiza a lista
      this.filteredFiles = [...this.files];
    } catch (error) {
      console.error('Erro ao deletar arquivo:', error);
    }
  }

  cancel() {
    this.modal.dismiss(null, 'cancel');
    this.selectedImage = null;
    const imageInput = document.querySelector('#imageInput') as HTMLInputElement;
    if (imageInput) imageInput.value = ''; // Limpa o input de arquivo
  }

  async confirm() {
    if (this.title) {
      // Salva o arquivo de texto
      const textFilePath = `${this.title}`;
      const newTextFile: MFile = {
        title: this.title,
        description: this.description || '',
        type: 'text',
        path: textFilePath,
        relatedFile: null,
        imageUrl: null
      };

      await this.filesystemService.writeTextFile(textFilePath, this.description || '');

      let newMediaFile: MFile | null = null;

      // Salva a imagem ou vídeo com o mesmo nome base
      if (this.selectedImage) {
        const extension = this.selectedImage.name.split('.').pop();
        const mediaFilePath = `${this.title}.${extension}`;
        const mediaUrl = await this.filesystemService.readBinaryFile(mediaFilePath);

        newMediaFile = {
          title: this.title,
          description: 'Arquivo de mídia',
          type: ['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(extension!) ? 'video' : 'image',
          path: mediaFilePath,
          relatedFile: newTextFile,
          imageUrl: mediaUrl
        };

        await this.filesystemService.writeBinaryFile(mediaFilePath, this.selectedImage);
      }

      // Atualiza a lista de arquivos corretamente
      this.files = await this.filesystemService.listFiles();
      this.filteredFiles = [...this.files];

      // Limpa os campos
      this.title = '';
      this.description = '';
      this.selectedImage = null;
      const imageInput = document.querySelector('#imageInput') as HTMLInputElement;
      if (imageInput) imageInput.value = '';

      this.modal.dismiss(this.title, 'confirm');
    }
  }

  async onWillDismiss(event: CustomEvent<OverlayEventDetail>) {
    if (event.detail.role === 'confirm') {
      this.files = await this.filesystemService.listFiles();
      this.filteredFiles = [...this.files]; // Atualiza os arquivos filtrados também
    }
  }

  async ionViewDidEnter() {
    this.files = await this.filesystemService.listFiles();
    this.filteredFiles = [...this.files];
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.selectedImage = file; // Armazena a imagem selecionada
    }
  }

  setOpenModal(open: boolean, currentFile: MFile | null) {
    this.isModalOpen = open;
    if (open != false && currentFile != null) this.currentFile = currentFile;
  }

  speak(text: string) {
    this.speaking = true;
    console.log(this.speaking)
    this.tts.speak(text, () => {
      this.speaking = false;
      console.log(this.speaking)
    });
  }

  stop() {
    this.speaking = false;
    this.tts.stop();
  }
}
