import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegramWebhookDto } from './dto/telegram-webhook.dto';

@Controller('telegram')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) { }

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(@Body() update: any) {
    console.log('Webhook received:', JSON.stringify(update, null, 2));
    this.telegramService.processWebhook(update);

    return { status: 'received' };
  }
}
