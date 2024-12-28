import { Injectable, Logger } from '@nestjs/common';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

interface PushNotificationData {
    [key: string]: any;
}

@Injectable()
export class NotificationService {
    private expo: Expo;
    private readonly logger = new Logger(NotificationService.name);

    constructor() {
        this.expo = new Expo();
    }

    async sendPushNotification(expoPushToken: string, title: string, body: string, data: PushNotificationData = {}) {
        // Verifica si el token de notificación push de Expo es válido
        if (!Expo.isExpoPushToken(expoPushToken)) {
            this.logger.error(`Token de notificación push de Expo inválido: ${expoPushToken}`);
            return;
        }

        // Crea el mensaje de notificación push
        const message: ExpoPushMessage = {
            to: expoPushToken,
            sound: 'default',
            title,
            body,
            data,
            priority: 'high',
            channelId: 'default', // Considera hacer esto configurable
        };

        try {
            // Envía la notificación push a Expo
            const [ticket] = await this.expo.sendPushNotificationsAsync([message]);
            this.logger.log(`Notificación push enviada exitosamente a ${expoPushToken}`, ticket);
            return ticket;
        } catch (error) {
            this.logger.error(`Error al enviar la notificación push a ${expoPushToken}`, error.stack);
            throw error;
        }
    }

    async sendBulkPushNotifications(messages: ExpoPushMessage[]) {
        const pushTickets: ExpoPushTicket[] = [];
        // Agrupa los mensajes para enviarlos en lotes, ya que Expo recomienda esto
        const chunks = this.expo.chunkPushNotifications(messages);

        for (const chunk of chunks) {
            try {
                // Envía un lote de notificaciones push
                const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
                pushTickets.push(...ticketChunk);
                this.logger.log(`Enviado lote de ${chunk.length} notificaciones push`);
            } catch (error) {
                this.logger.error('Error al enviar notificaciones push en lote', error.stack);
                // Maneja el error apropiadamente, tal vez reintenta o registra las fallas específicas
                // Podrías inspeccionar el error para ver qué tokens fallaron.
            }
        }

        return pushTickets;
    }
}