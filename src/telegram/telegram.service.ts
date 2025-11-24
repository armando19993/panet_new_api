import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { TelegramWebhookDto } from './dto/telegram-webhook.dto';
import { PrismaService } from 'src/prisma/prisma.servise';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  // Coloca tu token en tu archivo .env
  private readonly botToken = process.env.TELEGRAM_BOT_TOKEN;
  private readonly telegramApiUrl = `https://api.telegram.org/bot${this.botToken}`;

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService
  ) { }

  async processWebhook(update: TelegramWebhookDto) {
    // 1. Validar que exista el mensaje y tenga texto
    const { message } = update;
    if (!message || !message.text) {
      return; // Ignoramos si no es texto (fotos, audios, etc.)
    }

    const chatId = message.chat.id;
    const text = message.text;

    // 2. Lógica del comando /start
    if (text.startsWith('/start ')) {
      // Extraer el ID (ej: "/start user_123" -> "user_123")
      const args = text.split(' ');
      const systemUserId = args[1];

      if (systemUserId) {
        await this.linkUserToTelegram(systemUserId, chatId);
      } else {
        await this.sendMessage(chatId, '❌ Error: Enlace incompleto.');
      }
    }
  }

  private async linkUserToTelegram(userId: string, chatId: number) {
    try {
      await this.prisma.user.update({
        where: { user: userId.toUpperCase() },
        data: { telegram_chat_id: chatId.toString() },
      });

      this.logger.log(`Usuario ${userId} vinculado al chat ${chatId}`);

      // 4. Confirmar al usuario
      await this.sendMessage(chatId, '✅ ¡Notificaciones activadas exitosamente! Ya estamos conectados.');

    } catch (error) {
      this.logger.error('Error guardando en BD', error);
      await this.sendMessage(chatId, '⚠️ Hubo un error vinculando tu cuenta.');
    }
  }

  // Método auxiliar para enviar mensajes a Telegram
  async sendMessage(chatId: number, text: string, imageUrl?: string) {
    let url = `${this.telegramApiUrl}/sendMessage`;
    let payload: any = {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
    };

    if (imageUrl) {
      url = `${this.telegramApiUrl}/sendPhoto`;
      payload = {
        chat_id: chatId,
        photo: imageUrl,
        caption: text,
        parse_mode: 'HTML',
      };
    }

    try {
      // Usamos firstValueFrom porque HttpService retorna Observables
      await firstValueFrom(this.httpService.post(url, payload));
      this.logger.log(`Mensaje enviado al chat ${chatId}`);
    } catch (error) {
      this.logger.error(`Error enviando mensaje a Telegram: ${error.message}`);
    }
  }
}
