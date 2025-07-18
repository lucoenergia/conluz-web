/**
 * Generated by orval v7.10.0 🍺
 * Do not edit manually.
 * Conluz API
 * Conluz is an API-driven application designed for the efficient management of an energy community,enabling the administration of community members and their corresponding supply points and the retrieval of consumption, production data.
 * OpenAPI spec version: 1.0.0
 */
import {
  faker
} from '@faker-js/faker';

import {
  HttpResponse,
  delay,
  http
} from 'msw';

import type {
  Token
} from '.././models';


export const getLoginResponseMock = (overrideResponse: Partial< Token > = {}): Token => ({token: faker.helpers.arrayElement([faker.string.alpha({length: {min: 10, max: 20}}), undefined]), ...overrideResponse})


export const getLoginMockHandler = (overrideResponse?: Token | ((info: Parameters<Parameters<typeof http.post>[1]>[0]) => Promise<Token> | Token)) => {
  return http.post('*/api/v1/login', async (info) => {await delay(1000);
  
    return new HttpResponse(JSON.stringify(overrideResponse !== undefined
    ? (typeof overrideResponse === "function" ? await overrideResponse(info) : overrideResponse)
    : getLoginResponseMock()),
      { status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
  })
}
export const getAuthenticationMock = () => [
  getLoginMockHandler()
]
