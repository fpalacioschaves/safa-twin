import type {
  DigitalTwinResponse,
  DigitalTwinStatus,
} from '../types/digitalTwin';

import {
  apiRequest,
} from './api.service';

const DIGITAL_TWIN_API_URL = '/api/digital-twin';

export async function getDigitalTwinStatus():
Promise<DigitalTwinStatus> {
  const response = await apiRequest<{
    status: DigitalTwinStatus;
  }>(`${DIGITAL_TWIN_API_URL}/status`);

  return response.status;
}

export async function sendDigitalTwinMessage(
  message: string,
): Promise<DigitalTwinResponse> {
  return await apiRequest<DigitalTwinResponse>(
    `${DIGITAL_TWIN_API_URL}/messages`,
    {
      method: 'POST',
      body: JSON.stringify({
        message,
      }),
    },
  );
}
