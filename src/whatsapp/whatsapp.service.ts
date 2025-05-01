import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  /**
   * Envía un mensaje de WhatsApp de manera segura, capturando cualquier error
   * para evitar que falle toda la operación principal
   * 
   * @param url URL completa del endpoint de WhatsApp
   * @returns true si el mensaje se envió correctamente, false si hubo un error
   */
  async sendMessageSafely(url: string): Promise<boolean> {
    try {
      await axios.get(url);
      return true;
    } catch (error) {
      this.logger.error(`Error al enviar mensaje de WhatsApp: ${error.message}`, error.stack);
      // No propagamos el error, simplemente retornamos false
      return false;
    }
  }

  /**
   * Envía un mensaje de texto por WhatsApp
   * 
   * @param phone Número de teléfono del destinatario
   * @param message Mensaje a enviar
   * @returns true si el mensaje se envió correctamente, false si hubo un error
   */
  async sendTextMessage(phone: string, message: string): Promise<boolean> {
    const url = `https://api-whatsapp.paneteirl.store/send-message/text?number=${phone}&message=${encodeURIComponent(message)}`;
    return this.sendMessageSafely(url);
  }

  /**
   * Envía un mensaje de WhatsApp con una imagen
   * 
   * @param phone Número de teléfono del destinatario
   * @param message Mensaje a enviar
   * @param imageUrl URL de la imagen a enviar
   * @returns true si el mensaje se envió correctamente, false si hubo un error
   */
  async sendImageMessage(phone: string, message: string, imageUrl: string): Promise<boolean> {
    const url = `https://api-whatsapp.paneteirl.store/send-message?number=${phone}&message=${encodeURIComponent(message)}&imageUrl=${imageUrl}`;
    return this.sendMessageSafely(url);
  }
}
