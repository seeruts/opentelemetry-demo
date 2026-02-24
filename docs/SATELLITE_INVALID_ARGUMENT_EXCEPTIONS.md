# Understanding INVALID_ARGUMENT Exceptions in OpenTelemetry Demo

## What is INVALID_ARGUMENT?

INVALID_ARGUMENT is a gRPC error code (code 3) that indicates the client has sent malformed or invalid arguments to a service. This error occurs when:

- Required fields are missing from requests
- Field values are in incorrect formats
- Arguments violate constraints defined in the proto schema
- Data types don't match expectations

**Key Distinction**: INVALID_ARGUMENT means the arguments themselves are problematic, regardless of system state. This differs from FAILED_PRECONDITION (code 9), which means arguments are correct but the system can't process them due to its current state.

## Common Causes in OpenTelemetry Demo

### 1. Missing Required Fields

Based on the protobuf schema (`pb/demo.proto`), services expect specific fields:

**Cart Service**
- `AddItemRequest` requires `user_id` and `item` (with `product_id` and `quantity`)
- `GetCartRequest` requires `user_id`
- `EmptyCartRequest` requires `user_id`

**Product Catalog Service**
- `GetProductRequest` requires `id`
- `SearchProductsRequest` requires `query`

**Checkout Service**
- `PlaceOrderRequest` requires `user_id`, `user_currency`, `address`, `email`, and `credit_card`

**Currency Service**
- `CurrencyConversionRequest` requires `from` (Money object) and `to_code`

### 2. Invalid Field Values

**Money Object Constraints** (from `pb/demo.proto` lines 146-161):
```
- currency_code: Must be a valid 3-letter ISO 4217 code
- units: Whole currency units
- nanos: Must be between -999,999,999 and +999,999,999
- If units > 0, nanos must be >= 0
- If units = 0, nanos can be any valid value
- If units < 0, nanos must be <= 0
```

**Address Object**:
- All address fields (street_address, city, state, country, zip_code) should be populated

**Credit Card Info**:
- `credit_card_number`: Must be valid format
- `credit_card_cvv`: Valid CVV number
- `credit_card_expiration_year` and `credit_card_expiration_month`: Valid expiration date

### 3. Service-Specific Validation

**Quote Service** (`src/quote/app/routes.php`, line 26):
```php
if (!array_key_exists('numberOfItems', $jsonObject)) {
    throw new \InvalidArgumentException('numberOfItems not provided');
}
```
The Quote service explicitly validates that `numberOfItems` is provided when calculating shipping quotes.

**Product Catalog Service** (`src/product-catalog/main.go`):
- Returns `codes.NotFound` when product ID doesn't exist
- Returns `codes.Internal` when feature flag causes failures

**Checkout Service** (`src/checkout/main.go`):
- Validates cart contents before processing orders
- Validates currency conversion requests
- Validates shipping address for quotes

## Debugging INVALID_ARGUMENT Errors

### 1. Check Request Structure

Ensure all required fields are populated:

```go
// Bad - missing fields
req := &pb.GetProductRequest{}

// Good - all required fields present
req := &pb.GetProductRequest{
    Id: "OLJCESPC7Z",
}
```

### 2. Validate Field Constraints

**Money validation example**:
```go
// Bad - positive units with negative nanos
money := &pb.Money{
    CurrencyCode: "USD",
    Units: 10,
    Nanos: -500000000, // Invalid!
}

// Good - consistent signs
money := &pb.Money{
    CurrencyCode: "USD",
    Units: 10,
    Nanos: 500000000,
}
```

### 3. Check Service Logs

Services log errors with context. Example from checkout service:
```go
log.Infof("[PlaceOrder] user_id=%q user_currency=%q", req.UserId, req.UserCurrency)
```

### 4. Verify Upstream Service Responses

The Checkout service aggregates data from multiple services. An INVALID_ARGUMENT error could originate from:
- Product Catalog (invalid product ID)
- Currency Service (invalid currency code)
- Shipping Service (via Quote service - missing numberOfItems)
- Payment Service (invalid credit card info)
- Cart Service (invalid user ID)

## OpenTelemetry Collector Context

If "satellite" refers to the OpenTelemetry Collector deployed as an agent/sidecar, INVALID_ARGUMENT errors can occur when:

### Configuration Issues
1. **Invalid receiver configurations**: Malformed endpoint URLs or ports
2. **Type mismatches**: Expecting a map but receiving a list in YAML config
3. **Missing required processor parameters**: Some processors require specific fields

### Example from `otelcol-config.yml`:
```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: ${env:OTEL_COLLECTOR_HOST}:${env:OTEL_COLLECTOR_PORT_GRPC}
```

If `OTEL_COLLECTOR_HOST` or `OTEL_COLLECTOR_PORT_GRPC` environment variables are not set or invalid, the collector may fail to start or return errors.

### Data Pipeline Issues
1. **Invalid metric or trace data**: Malformed span attributes or metric labels
2. **Unsupported attribute types**: Using complex objects as attribute values
3. **Invalid resource attributes**: Malformed service.name or other semantic conventions

## Prevention Strategies

### 1. Input Validation at Service Entry Points

Add validation before processing:
```go
func (cs *checkout) PlaceOrder(ctx context.Context, req *pb.PlaceOrderRequest) (*pb.PlaceOrderResponse, error) {
    // Validate required fields
    if req.UserId == "" {
        return nil, status.Errorf(codes.InvalidArgument, "user_id is required")
    }
    if req.UserCurrency == "" {
        return nil, status.Errorf(codes.InvalidArgument, "user_currency is required")
    }
    if req.Address == nil {
        return nil, status.Errorf(codes.InvalidArgument, "address is required")
    }
    // ... rest of the method
}
```

### 2. Use Proto Validation

Consider adding validation rules to proto files (requires buf validate or similar):
```protobuf
message GetProductRequest {
    string id = 1 [(buf.validate.field).string.min_len = 1];
}
```

### 3. Client-Side Validation

Validate data before making service calls to fail fast and provide better error messages.

### 4. Comprehensive Error Handling

Wrap downstream service errors with context:
```go
product, err := cs.productCatalogSvcClient.GetProduct(ctx, &pb.GetProductRequest{Id: item.GetProductId()})
if err != nil {
    if status.Code(err) == codes.InvalidArgument {
        return nil, status.Errorf(codes.InvalidArgument, "invalid product ID %q: %v", item.GetProductId(), err)
    }
    return nil, fmt.Errorf("failed to get product #%q: %v", item.GetProductId(), err)
}
```

## Monitoring and Observability

### Using OpenTelemetry Traces

INVALID_ARGUMENT errors are captured in traces with:
- Span status set to ERROR
- Exception events with error details
- gRPC status code attributes

### Grafana Dashboards

The demo includes Grafana dashboards showing error code distributions. INVALID_ARGUMENT errors appear as "3 - INVALID_ARGUMENT" in visualizations (see `kubernetes/opentelemetry-demo.yaml` and Grafana configs).

### Query Patterns

To find INVALID_ARGUMENT errors in your telemetry backend:
```
# Filter by gRPC status code
grpc.status_code = 3

# Or by error message
error.message contains "invalid" or "argument"
```

## Service-Specific Considerations

### Checkout Service
Most likely to see INVALID_ARGUMENT as it orchestrates multiple services:
- Validates user data, address, payment info
- Propagates errors from 6+ downstream services
- Each downstream error could surface as INVALID_ARGUMENT

### Quote Service
Explicitly validates `numberOfItems` parameter - source of INVALID_ARGUMENT if not provided.

### Currency Service
May return errors for:
- Unsupported currency codes
- Invalid Money object structure

### Product Catalog Service
Returns errors for:
- Invalid/non-existent product IDs
- Empty search queries (potentially)

## Next Steps

1. **Enable detailed logging**: Set log level to DEBUG to capture full request/response details
2. **Check collector configuration**: Validate YAML syntax and required fields
3. **Examine trace data**: Look for exception events and error attributes in traces
4. **Review recent changes**: Check if new validations were added or fields made required
5. **Test with known-good data**: Use example requests from tests to isolate the issue
