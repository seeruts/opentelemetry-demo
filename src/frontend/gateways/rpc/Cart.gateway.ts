// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

import { ChannelCredentials, ChannelOptions } from '@grpc/grpc-js';
import { Cart, CartItem, CartServiceClient, Empty } from '../../protos/demo';

const { CART_ADDR = '' } = process.env;

const channelOptions: ChannelOptions = {
  'grpc.max_connection_age_ms': 30000, // Force connection redeployment after 30 seconds
  'grpc.max_connection_age_grace_ms': 10000, // Allow 10 seconds grace period after connection age
  'grpc.dns_refresh_interval_ms': 30000, // Re-fetch backend servers via DNS every 30 seconds
};

const client = new CartServiceClient(CART_ADDR, ChannelCredentials.createInsecure(), channelOptions);

const CartGateway = () => ({
  getCart(userId: string) {
    return new Promise<Cart>((resolve, reject) =>
      client.getCart({ userId }, (error, response) => (error ? reject(error) : resolve(response)))
    );
  },
  addItem(userId: string, item: CartItem) {
    return new Promise<Empty>((resolve, reject) =>
      client.addItem({ userId, item }, (error, response) => (error ? reject(error) : resolve(response)))
    );
  },
  emptyCart(userId: string) {
    return new Promise<Empty>((resolve, reject) =>
      client.emptyCart({ userId }, (error, response) => (error ? reject(error) : resolve(response)))
    );
  },
});

export default CartGateway();
