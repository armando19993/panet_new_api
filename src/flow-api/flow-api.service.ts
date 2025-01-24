import { Injectable } from '@nestjs/common';
import { createHmac } from 'crypto';
import axios from 'axios';

@Injectable()
export class FlowApiService {
  private readonly apiKey: string;
  private readonly secretKey: string;
  private readonly baseUrl: string;

  constructor() {
    this.apiKey = process.env.FLOW_API_KEY;
    this.secretKey = process.env.FLOW_SECRET_KEY;
    this.baseUrl = process.env.NODE_ENV === 'production'
      ? 'https://www.flow.cl/api'
      : 'https://sandbox.flow.cl/api';
  }

  private generateSignature(params: Record<string, any>): string {
    const sortedKeys = Object.keys(params)
      .filter(key => key !== 's')
      .sort();

    const stringToSign = sortedKeys
      .map(key => `${key}${params[key]}`)
      .join('');

    return createHmac('sha256', this.secretKey)
      .update(stringToSign)
      .digest('hex');
  }

  async send(
    serviceName: string,
    params: Record<string, any>,
    method: 'GET' | 'POST' = 'POST'
  ) {
    const baseParams = {
      ...params,
      urlConfirmation: `${process.env.BASE_URL}/api/flow/confirm`,
      urlReturn: `${process.env.BASE_URL}/api/flow/return`,
      apiKey: this.apiKey
    };

    // Ordenar los parámetros alfabéticamente
    const sortedParams = Object.keys(baseParams)
      .sort() // Ordena las claves alfabéticamente
      .reduce((acc, key) => {
        acc[key] = baseParams[key]; // Asigna los valores a las claves ordenadas
        return acc;
      }, {});

    const signature = this.generateSignature(sortedParams);

    const requestParams = {
      ...sortedParams,
      s: signature // Añadir la firma generada
    };

    console.log(requestParams);

    try {
      const url = `${this.baseUrl}/${serviceName}`;

      if (method === 'GET') {
        const { data } = await axios.get(url, { params: requestParams });
        return data;
      } else {
        const { data } = await axios.post(url, requestParams);
        return data;
      }
    } catch (error) {
      throw new Error(`Flow API Error: ${error.response?.data?.message || error.message}`);
    }
  }

  async createPaymentLink(paymentData: {
    commerceOrder: any;
    amount: number;
    subject: string;
    email: string;
    currency?: string;
    paymentMethod?: string;
  }) {
    return this.send('payment/create', paymentData);
  }

  async checkPaymentStatus(token: string) {
    return this.send('payment/getStatus', { token }, 'GET');
  }
}