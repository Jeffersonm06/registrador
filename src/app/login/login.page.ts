import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent
} from '@ionic/angular/standalone';
import { PreferencesService } from '../services/preferences.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    IonContent, CommonModule, FormsModule
  ]
})
export class LoginPage implements OnInit {

  password: string = ''
  input: string = '';
  attemptOfNumber: number = 0;
  currentAttempt: number = 0;

  constructor(
    private pf: PreferencesService,
    private router: Router
  ) { }

  async ngOnInit() {
    await this.loadPassword();
    if (this.password.length < 0) {
      this.router.navigateByUrl('');
    }
  }

  async loadPassword() {
    const preferences = await this.pf.get([
      'password'
    ]);

    this.password = preferences[0] || '';
    this.attemptOfNumber = preferences[1] ? Number(preferences[4]) : 3;
  }

  login() {
    if (this.currentAttempt <= this.attemptOfNumber) {
      if (this.input === this.password) {
        this.router.navigateByUrl('/');
      } else {
        this.currentAttempt++;
      }
    }
  }
}
