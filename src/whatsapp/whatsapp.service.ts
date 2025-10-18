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
      // Establecer un timeout para la solicitud para evitar que se quede colgada
      const response = await axios.get(url, {
        timeout: 5000, // 5 segundos de timeout
      });
      return true;
    } catch (error) {
      // Registrar el error pero nunca propagarlo
      this.logger.error(`Error al enviar mensaje de WhatsApp: ${error.message || 'Error desconocido'}`, error?.stack);
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
    try {
      const url = `https://api-whatsapp.paneteirl.store/send-message?number=${phone}&message=${encodeURIComponent(message)}`;
      return await this.sendMessageSafely(url);
    } catch (error) {
      this.logger.error(`Error al preparar mensaje de texto: ${error.message || 'Error desconocido'}`, error?.stack);
      return false;
    }
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
    try {
      const url = `https://api-whatsapp.paneteirl.store/send-message?number=${phone}&message=${encodeURIComponent(message)}&imageUrl=${imageUrl}`;
      return await this.sendMessageSafely(url);
    } catch (error) {
      this.logger.error(`Error al preparar mensaje con imagen: ${error.message || 'Error desconocido'}`, error?.stack);
      return false;
    }
  }
}
