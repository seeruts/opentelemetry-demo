// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

import { ChannelCredentials, ChannelOptions } from '@grpc/grpc-js';
import { ListRecommendationsResponse, RecommendationServiceClient } from '../../protos/demo';

const { RECOMMENDATION_ADDR = '' } = process.env;

const channelOptions: ChannelOptions = {
  'grpc.max_connection_age_ms': 30000, // Force connection redeployment after 30 seconds
  'grpc.max_connection_age_grace_ms': 10000, // Allow 10 seconds grace period after connection age
  'grpc.dns_refresh_interval_ms': 30000, // Re-fetch backend servers via DNS every 30 seconds
};

const client = new RecommendationServiceClient(RECOMMENDATION_ADDR, ChannelCredentials.createInsecure(), channelOptions);

const RecommendationsGateway = () => ({
  listRecommendations(userId: string, productIds: string[]) {
    return new Promise<ListRecommendationsResponse>((resolve, reject) =>
      client.listRecommendations({ userId, productIds }, (error, response) =>
        error ? reject(error) : resolve(response)
      )
    );
  },
});

export default RecommendationsGateway();
