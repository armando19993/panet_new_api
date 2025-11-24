// dto/telegram-webhook.dto.ts
export class TelegramWebhookDto {
    update_id: number;
    message?: {
        message_id: number;
        from: {
            id: number;
            username?: string;
        };
        chat: {
            id: number;
        };
        text?: string;
    };
}