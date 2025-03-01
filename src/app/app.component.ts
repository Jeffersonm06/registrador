import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { FilesystemService } from './services/filesystem.service';
import { StyleService } from './services/style.service';
import { PreferencesService } from './services/preferences.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [
    IonApp,
    IonRouterOutlet],
})
export class AppComponent implements OnInit {
  constructor(
    private fs: FilesystemService,
    private st: StyleService,
    private pf: PreferencesService,
    private router: Router
  ) { }

  securityMode: boolean = false;
  passwordActive: boolean = false;
  password: string = '';
  attemptLimit: boolean = false;
  attemptOfNumber: number = 3;
  deletePeriodically: boolean = false;
  deletePeriod: any;

  async ngOnInit() {
    await this.loadPreferences();
    await this.fs.checkPermissions();
    await this.fs.initDatabase();
    await this.fs.createAppFolder();
    await this.st.loadStyle();
    if(this.passwordActive && this.password.length > 0 && this.securityMode){
      this.router.navigateByUrl('/login')
    }
  }

  async loadPreferences() {
    const preferences = await this.pf.get([
      'mode', 'passwordActive', 'password', 'attemptLimit', 'attemptOfNumber'
    ]);

    this.securityMode = preferences[0] === 'enable';
    this.passwordActive = preferences[1] === 'true';
    this.password = preferences[2] || '';
    this.attemptLimit = preferences[3] === 'true';
    this.attemptOfNumber = preferences[4] ? Number(preferences[4]) : 3;
  }

}
