import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { FilesystemService } from './services/filesystem.service';
import { StyleService } from './services/style.service';

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
    private st: StyleService
  ) { }

  async ngOnInit(){
    await this.fs.checkPermissions();
    await this.fs.initDatabase();
    await this.fs.createAppFolder();
    await this.st.loadStyle();
  }
}
