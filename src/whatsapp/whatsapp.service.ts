import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly apiTextUrl = 'http://69.169.102.23:8080/message/sendText/panet';
  private readonly apiMediaUrl = 'http://69.169.102.23:8080/message/sendMedia/panet';
  private readonly apiKey = '125687';

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
      console.log(url)
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
      console.log(url)
      return await this.sendMessageSafely(url);
    } catch (error) {
      this.logger.error(`Error al preparar mensaje con imagen: ${error.message || 'Error desconocido'}`, error?.stack);
      return false;
    }
  }

  /**
   * Envía un documento por WhatsApp
   * 
   * @param phone Número de teléfono del destinatario
   * @param message Mensaje a enviar
   * @param documentUrl URL del documento a enviar
   * @param filename Nombre del archivo
   * @returns true si el mensaje se envió correctamente, false si hubo un error
   */
  async sendDocumentMessage(phone: string, message: string, documentUrl: string, filename: string): Promise<boolean> {
    try {
      const url = `https://api-whatsapp.paneteirl.store/send-message?number=${phone}&message=${encodeURIComponent(message)}&documentUrl=${documentUrl}&filename=${encodeURIComponent(filename)}`;
      return await this.sendMessageSafely(url);
    } catch (error) {
      this.logger.error(`Error al preparar mensaje con documento: ${error.message || 'Error desconocido'}`, error?.stack);
      return false;
    }
  }

  /**
   * Normaliza el número de teléfono para la nueva API (sin + y sin espacios)
   * @param phone Número de teléfono
   * @returns Número normalizado
   */
  private normalizePhone(phone: string): string {
    return phone.replace(/[\s\+]/g, '');
  }

  /**
   * Extrae el nombre del archivo de una URL
   * @param url URL del archivo
   * @returns Nombre del archivo
   */
  private extractFileName(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const fileName = pathname.split('/').pop() || 'image.png';
      return decodeURIComponent(fileName);
    } catch {
      return 'image.png';
    }
  }

  /**
   * Envía un mensaje de WhatsApp usando la nueva API
   * 
   * @param phone Número de teléfono del destinatario (con o sin +)
   * @param text Mensaje de texto a enviar
   * @param mediaUrl URL de la imagen o media (opcional)
   * @param options Opciones adicionales (delay, linkPreview, mentionsEveryOne)
   * @returns true si el mensaje se envió correctamente, false si hubo un error
   */
  async sendMessageNewApi(
    phone: string,
    text: string,
    mediaUrl?: string,
    options?: {
      delay?: number;
      linkPreview?: boolean;
      mentionsEveryOne?: boolean;
    }
  ): Promise<boolean> {
    const normalizedPhone = this.normalizePhone(phone);
    const delay = options?.delay || 123;
    
    let payload: any;
    let apiUrl: string;

    try {
      if (mediaUrl) {
        // Usar endpoint de media para mensajes con imagen
        apiUrl = this.apiMediaUrl;
        payload = {
          number: normalizedPhone,
          mediatype: 'image',
          mimetype: 'image/png',
          caption: text || '',
          media: mediaUrl,
          fileName: this.extractFileName(mediaUrl),
          delay: delay,
          linkPreview: options?.linkPreview !== undefined ? options.linkPreview : true,
          mentionsEveryOne: options?.mentionsEveryOne !== undefined ? options.mentionsEveryOne : true,
        };
        console.log('📤 [WhatsApp] Intentando enviar MENSAJE CON IMAGEN:', {
          tipo: 'MEDIA',
          telefono: normalizedPhone,
          telefonoOriginal: phone,
          endpoint: apiUrl,
          caption: text?.substring(0, 100) + (text?.length > 100 ? '...' : ''),
          mediaUrl: mediaUrl,
          fileName: payload.fileName,
          delay: delay,
        });
      } else {
        // Usar endpoint de texto para mensajes sin imagen
        apiUrl = this.apiTextUrl;
        payload = {
          number: normalizedPhone,
          text: text || '',
          delay: delay,
        };
        console.log('📤 [WhatsApp] Intentando enviar MENSAJE DE TEXTO:', {
          tipo: 'TEXT',
          telefono: normalizedPhone,
          telefonoOriginal: phone,
          endpoint: apiUrl,
          texto: text?.substring(0, 100) + (text?.length > 100 ? '...' : ''),
          delay: delay,
        });
      }

      console.log('📤 [WhatsApp] Payload completo:', JSON.stringify(payload, null, 2));

      const response = await axios.post(apiUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey,
        },
        timeout: 10000, // 10 segundos de timeout
      });

      console.log('✅ [WhatsApp] Mensaje enviado EXITOSAMENTE:', {
        telefono: normalizedPhone,
        tipo: mediaUrl ? 'MEDIA' : 'TEXT',
        status: response.status,
        statusText: response.statusText,
        data: JSON.stringify(response.data, null, 2),
        headers: response.headers,
      });

      return true;
    } catch (error) {
      // Capturar todos los detalles posibles del error
      const errorDetails: any = {
        telefono: phone,
        telefonoNormalizado: normalizedPhone,
        tipo: mediaUrl ? 'MEDIA' : 'TEXT',
        endpoint: apiUrl,
        error: error instanceof Error ? error.message : 'Error desconocido',
        stack: error instanceof Error ? error.stack : undefined,
      };

      if (axios.isAxiosError(error)) {
        errorDetails.response = {
          status: error.response?.status,
          statusText: error.response?.statusText,
          statusCode: error.response?.status,
          data: error.response?.data ? JSON.stringify(error.response.data, null, 2) : 'Sin datos',
          headers: error.response?.headers,
        };
        errorDetails.request = {
          method: error.config?.method,
          url: error.config?.url,
          headers: error.config?.headers,
          data: error.config?.data ? (typeof error.config.data === 'string' ? error.config.data : JSON.stringify(error.config.data, null, 2)) : 'Sin datos',
        };
        errorDetails.code = error.code;
        errorDetails.message = error.message;
      }

      console.error('❌ [WhatsApp] ERROR DETALLADO al enviar mensaje:');
      console.error(JSON.stringify(errorDetails, null, 2));
      
      // También mostrar el payload que se intentó enviar
      console.error('📤 [WhatsApp] Payload que causó el error:', JSON.stringify(payload, null, 2));
      
      this.logger.error(
        `Error al enviar mensaje con nueva API: ${error.message || 'Error desconocido'}`,
        error?.stack
      );
      return false;
    }
  }
}
