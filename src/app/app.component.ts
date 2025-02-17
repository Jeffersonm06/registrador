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

  ngOnInit(): void {
    this.fs.createAppFolder();
    this.st.loadStyle()
  }
}
