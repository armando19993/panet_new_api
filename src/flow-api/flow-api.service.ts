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
        apiKey: '7171E94F-2712-4D0F-BF7F-85AC9493L24F',
        secretKey: 'c27316db779ebf1f14bd83d8a3fb0bbb542dc71f',
      },
      CLP: {
        apiKey: '486CFE9D-6033-4DD5-8051-7F6C2CBL6008',
        secretKey: 'a97e8df55adde54cdcfd2cb3a914b82e17053dc7',
      },
    };

    this.baseUrl = 'https://sandbox.flow.cl/api'
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
      urlConfirmation: `https://api.paneteirl.com/recharge/response/flow`,
      urlReturn: `exp://HomePage`,
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