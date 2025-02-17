import { Injectable } from '@angular/core';
import { TextToSpeech } from '@capacitor-community/text-to-speech';

@Injectable({
  providedIn: 'root'
})
export class TtsService {

  constructor() { }

  async speak(text: string, callback?: () => void) {

    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]; // Divide por frases

    for (const sentence of sentences) {
      await TextToSpeech.speak({
        text: sentence.trim(),
        lang: 'pt-BR',
        rate: 1.105,
        pitch: 1.0,
        volume: 1.0,
        category: 'ambient',
        queueStrategy: 1
      });

      // Estimativa do tempo de fala para evitar sobreposição
      const estimatedTime = sentence.length / 15; // Aproximadamente 15 caracteres por segundo
      await new Promise(resolve => setTimeout(resolve, estimatedTime * 0.1)); // Adiciona pausa entre frases
    }

    if (callback) callback();
  }


  async stop() {
    await TextToSpeech.stop();
  };

  async getSupportedLanguages() {
    const languages = await TextToSpeech.getSupportedLanguages();
    console.log(languages)
  };

  async getSupportedVoices() {
    const voices = await TextToSpeech.getSupportedVoices();
    console.log(voices)
  };

  async isLanguageSupported(lang: string) {
    const isSupported = await TextToSpeech.isLanguageSupported({ lang });
    console.log(isSupported)
  };
}
