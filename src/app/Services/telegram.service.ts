import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class TelegramService {
  private token = '7752238645:AAFbz7UPuDnkxFCTYvFyIRhMuVmsP2b17Lc';
  private chatId = '1977431625';  // Asegúrate de que este sea el chat ID correcto
  private baseUrl = `https://api.telegram.org/bot${this.token}/sendMessage`;

  constructor(private http: HttpClient) {}

  sendMessage(message: string) {
    const url = `${this.baseUrl}?chat_id=${this.chatId}&text=${encodeURIComponent(message)}`;
    return this.http.get(url);
  }
}
