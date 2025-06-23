// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

import { ChannelCredentials, ChannelOptions } from '@grpc/grpc-js';
import { ListProductsResponse, Product, ProductCatalogServiceClient } from '../../protos/demo';

const { PRODUCT_CATALOG_ADDR = '' } = process.env;

const channelOptions: ChannelOptions = {
  'grpc.max_connection_age_ms': 30000, // Force connection redeployment after 30 seconds
  'grpc.max_connection_age_grace_ms': 10000, // Allow 10 seconds grace period after connection age
  'grpc.dns_refresh_interval_ms': 30000, // Re-fetch backend servers via DNS every 30 seconds
};

const client = new ProductCatalogServiceClient(PRODUCT_CATALOG_ADDR, ChannelCredentials.createInsecure(), channelOptions);

const ProductCatalogGateway = () => ({
  listProducts() {
    return new Promise<ListProductsResponse>((resolve, reject) =>
      client.listProducts({}, (error, response) => (error ? reject(error) : resolve(response)))
    );
  },
  getProduct(id: string) {
    return new Promise<Product>((resolve, reject) =>
      client.getProduct({ id }, (error, response) => (error ? reject(error) : resolve(response)))
    );
  },
});

export default ProductCatalogGateway();
