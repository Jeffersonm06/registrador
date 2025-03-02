import { Injectable } from '@angular/core';
import { AlertController } from '@ionic/angular/standalone';

@Injectable({
  providedIn: 'root'
})
export class UiService {

  constructor(
    private alertController: AlertController
  ) { }

  async presentAlert(alertContent: { header: string, subHeader?: string, message: string, buttons: string[] }) {
    const alert = await this.alertController.create(alertContent);
    await alert.present();
  }
}
