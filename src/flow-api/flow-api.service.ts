import { Injectable } from '@nestjs/common';
import { createHmac } from 'crypto';
import axios from 'axios';

@Injectable()
export class FlowApiService {
  private readonly apiKeys: Record<string, { apiKey: string; secretKey: string }>;
  private readonly baseUrl: string;

  constructor() {
    this.apiKeys = {
      PEN: {
        apiKey: '6DCE1AFA-C640-476E-AF43-79F8593LC698',
        secretKey: 'ee8251193785a45b2b3358dcab042a5f87eb3f9a',
      },
      CLP: {
        apiKey: '486CFE9D-6033-4DD5-8051-7F6C2CBL6008',
        secretKey: 'a97e8df55adde54cdcfd2cb3a914b82e17053dc7',
      },
    };

    this.baseUrl = 'https://www.flow.cl/api'
  }

  private generateSignature(params: Record<string, any>, secretKey: string): string {
    const sortedKeys = Object.keys(params)
      .filter((key) => key !== 's')
      .sort();

    const stringToSign = sortedKeys.map((key) => `${key}${params[key]}`).join('');

    return createHmac('sha256', secretKey).update(stringToSign).digest('hex');
  }

  async send(
    serviceName: string,
    params: Record<string, any>,
    method: 'GET' | 'POST' = 'POST',
    currency: string = 'CLP' // Valor por defecto
  ) {
    const { apiKey, secretKey } = this.apiKeys[currency] || this.apiKeys['CLP']; // Usar CLP como valor por defecto

    const baseParams = {
      ...params,
      urlConfirmation: `https://api.paneteirl.com/recharge/response/flow/pasarela`,
      urlReturn: `https://payment.paneteirl.com/${params.commerceOrder ? params.commerceOrder : ''}`,
      apiKey: apiKey,
    };

    // Ordenar los parámetros alfabéticamente
    const sortedParams = Object.keys(baseParams)
      .sort()
      .reduce((acc, key) => {
        acc[key] = baseParams[key];
        return acc;
      }, {});

    const signature = this.generateSignature(sortedParams, secretKey); // Usar la secretKey correspondiente

    const requestParams = {
      ...sortedParams,
      s: signature, // Añadir la firma generada
    };

    try {
      const url = `${this.baseUrl}/${serviceName}`;

      if (method === 'GET') {
        const { data } = await axios.get(url, { params: requestParams });
        return data;
      } else {
        const { data } = await axios.post(url, requestParams, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });
        return data;
      }
    } catch (error) {
      throw new Error(`Flow API Error: ${error.response?.data?.message || error.message}`);
    }
  }

  async createPaymentLink(
    paymentData: {
      commerceOrder: string;
      amount: number;
      subject: string;
      email: string;
      currency?: string;
      paymentMethod?: number;
    },
    currency: string = 'CLP' // Valor por defecto
  ) {
    return this.send('payment/create', paymentData, 'POST', currency);
  }

  async checkPaymentStatus(token: string, currency: string = 'CLP') {
    return this.send('payment/getStatus', { token }, 'GET', currency);
  }
}