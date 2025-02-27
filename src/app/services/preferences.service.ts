import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import {
  AlertController,
} from '@ionic/angular/standalone';

@Injectable({
  providedIn: 'root'
})
export class PreferencesService {

  constructor(
    private alertController: AlertController,
  ) { }

  async set(group: { key: string, value: string }[]) {
    try {
      for (let item of group) {
        await Preferences.set({
          key: item.key,
          value: item.value
        })
      }
      console.log(group)
    } catch (error: any) {
      this.presentAlertError(error);
      throw error
    }
  }

  async get(keys: string[]) {
    try {
      const result = []
      for (let key of keys) {
        const { value } = await Preferences.get({ key });
        result.push(value);
      }
      console.log(result)
      return result
    } catch (error) {
      this.presentAlertError(error);
      throw error
    }
  }

  async remove(keys: string[]) {
    try {
      for (let key of keys) {
        await Preferences.remove({ key });
      }
    } catch (error: any) {
      this.presentAlertError(error);
    }
  }

  async clear() {
    try {
      await Preferences.clear();
    } catch (error: any) {
      this.presentAlertError(error);
    }
  }

  async presentAlert(
    alertContent: {
      header: string,
      subHeader?: string,
      message: string,
      buttons: string[],
    }
  ) {
    const alert = await this.alertController.create(alertContent);

    await alert.present();
  }

  async presentAlertError(error: any) {
    this.presentAlert({
      header: 'Error',
      message: error.message,
      buttons: ['ok']
    });
  }
}
