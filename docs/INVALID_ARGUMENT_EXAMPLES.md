# INVALID_ARGUMENT Exception Examples

## Overview

This document provides concrete examples of scenarios that trigger INVALID_ARGUMENT (gRPC error code 3) exceptions in the OpenTelemetry Demo services.

## Money Validation Examples

The checkout service uses strict money validation that can trigger INVALID_ARGUMENT errors:

### Invalid Sign Combinations

```go
// ERROR: Positive units with negative nanos
badMoney := &pb.Money{
    CurrencyCode: "USD",
    Units: 10,
    Nanos: -500000000,  // Invalid!
}

// ERROR: Negative units with positive nanos
badMoney := &pb.Money{
    CurrencyCode: "USD",
    Units: -10,
    Nanos: 500000000,  // Invalid!
}

// VALID: Both positive
goodMoney := &pb.Money{
    CurrencyCode: "USD",
    Units: 10,
    Nanos: 500000000,  // ✓ Valid
}

// VALID: Both negative
goodMoney := &pb.Money{
    CurrencyCode: "USD",
    Units: -10,
    Nanos: -500000000,  // ✓ Valid
}

// VALID: Zero units can have any valid nanos
goodMoney := &pb.Money{
    CurrencyCode: "USD",
    Units: 0,
    Nanos: 500000000,  // ✓ Valid (0.50 USD)
}
```

### Nanos Range Violations

```go
// ERROR: Nanos overflow (must be between -999,999,999 and +999,999,999)
badMoney := &pb.Money{
    CurrencyCode: "USD",
    Units: 10,
    Nanos: 1000000000,  // Invalid! Exceeds maximum
}

// ERROR: Nanos underflow
badMoney := &pb.Money{
    CurrencyCode: "USD",
    Units: -10,
    Nanos: -1000000000,  // Invalid! Below minimum
}

// VALID: Maximum valid nanos
goodMoney := &pb.Money{
    CurrencyCode: "USD",
    Units: 10,
    Nanos: 999999999,  // ✓ Valid
}
```

### Currency Code Mismatches

```go
// ERROR: Attempting to sum different currencies
usd := &pb.Money{CurrencyCode: "USD", Units: 10, Nanos: 0}
eur := &pb.Money{CurrencyCode: "EUR", Units: 10, Nanos: 0}

// This will return ErrMismatchingCurrency
result, err := money.Sum(usd, eur)
// err == ErrMismatchingCurrency

// VALID: Same currency
usd1 := &pb.Money{CurrencyCode: "USD", Units: 10, Nanos: 0}
usd2 := &pb.Money{CurrencyCode: "USD", Units: 5, Nanos: 0}
result, err := money.Sum(usd1, usd2)
// result: Units=15, Nanos=0, CurrencyCode="USD"
```

## Service Request Examples

### Cart Service

```go
// ERROR: Missing user_id
badRequest := &pb.AddItemRequest{
    UserId: "",  // Invalid! Empty user_id
    Item: &pb.CartItem{
        ProductId: "OLJCESPC7Z",
        Quantity: 1,
    },
}

// ERROR: Missing product_id
badRequest := &pb.AddItemRequest{
    UserId: "user123",
    Item: &pb.CartItem{
        ProductId: "",  // Invalid! Empty product_id
        Quantity: 1,
    },
}

// ERROR: Invalid quantity
badRequest := &pb.AddItemRequest{
    UserId: "user123",
    Item: &pb.CartItem{
        ProductId: "OLJCESPC7Z",
        Quantity: 0,  // or negative - Invalid!
    },
}

// VALID request
goodRequest := &pb.AddItemRequest{
    UserId: "user123",
    Item: &pb.CartItem{
        ProductId: "OLJCESPC7Z",
        Quantity: 1,
    },
}
```

### Product Catalog Service

```go
// ERROR: Missing product ID
badRequest := &pb.GetProductRequest{
    Id: "",  // Invalid! Empty ID
}

// ERROR: Empty search query (potentially)
badRequest := &pb.SearchProductsRequest{
    Query: "",  // May be invalid depending on service logic
}

// VALID requests
goodRequest := &pb.GetProductRequest{
    Id: "OLJCESPC7Z",
}

goodSearch := &pb.SearchProductsRequest{
    Query: "telescope",
}
```

### Quote Service

```javascript
// ERROR: Missing numberOfItems parameter
POST /getquote
{
  "items": [...],
  // numberOfItems missing - throws InvalidArgumentException!
}

// VALID request
POST /getquote
{
  "numberOfItems": 3,
  "items": [...]
}
```

### Checkout Service

```go
// ERROR: Missing required fields
badRequest := &pb.PlaceOrderRequest{
    UserId: "user123",
    // Missing user_currency, address, email, credit_card
}

// ERROR: Incomplete address
badRequest := &pb.PlaceOrderRequest{
    UserId: "user123",
    UserCurrency: "USD",
    Address: &pb.Address{
        StreetAddress: "123 Main St",
        // Missing city, state, country, zip_code
    },
    Email: "user@example.com",
    CreditCard: &pb.CreditCardInfo{...},
}

// ERROR: Invalid credit card
badRequest := &pb.PlaceOrderRequest{
    UserId: "user123",
    UserCurrency: "USD",
    Address: &pb.Address{...},  // All fields filled
    Email: "user@example.com",
    CreditCard: &pb.CreditCardInfo{
        CreditCardNumber: "",  // Invalid! Empty
        CreditCardCvv: 0,      // Invalid! Zero CVV
        CreditCardExpirationYear: 2020,   // Expired
        CreditCardExpirationMonth: 12,
    },
}

// VALID request
goodRequest := &pb.PlaceOrderRequest{
    UserId: "user123",
    UserCurrency: "USD",
    Address: &pb.Address{
        StreetAddress: "123 Main St",
        City: "Seattle",
        State: "WA",
        Country: "USA",
        ZipCode: "98101",
    },
    Email: "user@example.com",
    CreditCard: &pb.CreditCardInfo{
        CreditCardNumber: "4432-8015-6152-0454",
        CreditCardCvv: 123,
        CreditCardExpirationYear: 2028,
        CreditCardExpirationMonth: 12,
    },
}
```

### Currency Service

```go
// ERROR: Unsupported currency code
badRequest := &pb.CurrencyConversionRequest{
    From: &pb.Money{
        CurrencyCode: "XYZ",  // Not in supported currencies
        Units: 100,
        Nanos: 0,
    },
    ToCode: "USD",
}

// ERROR: Invalid Money object
badRequest := &pb.CurrencyConversionRequest{
    From: &pb.Money{
        CurrencyCode: "USD",
        Units: 100,
        Nanos: -500000000,  // Sign mismatch!
    },
    ToCode: "EUR",
}

// VALID request
goodRequest := &pb.CurrencyConversionRequest{
    From: &pb.Money{
        CurrencyCode: "USD",
        Units: 100,
        Nanos: 0,
    },
    ToCode: "EUR",
}
```

## OpenTelemetry Collector Configuration Examples

If "satellite" refers to OTel Collector agent/sidecar deployments:

### Invalid Receiver Configuration

```yaml
# ERROR: Invalid endpoint format
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "invalid-endpoint"  # Missing port, invalid format

# VALID configuration
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"
```

### Type Mismatch in Configuration

```yaml
# ERROR: Expected map, got list
receivers:
  hostmetrics:
    scrapers:
      - cpu  # Invalid! Should be a map
      - memory

# VALID configuration
receivers:
  hostmetrics:
    scrapers:
      cpu:
      memory:
```

### Missing Required Fields

```yaml
# ERROR: Exporter missing required endpoint
exporters:
  otlp:
    # Missing endpoint - required field!
    tls:
      insecure: true

# VALID configuration
exporters:
  otlp:
    endpoint: "jaeger:4317"
    tls:
      insecure: true
```

## Debugging Strategies

### 1. Enable Debug Logging

For Go services:
```bash
# Already enabled in most services
log.Level = logrus.DebugLevel
```

For OTel Collector:
```yaml
exporters:
  debug:
    verbosity: detailed
```

### 2. Check Request Payloads

Add logging before service calls:
```go
log.Debugf("Calling service with request: %+v", request)
response, err := client.Method(ctx, request)
if err != nil {
    log.Errorf("Service call failed: %+v", err)
    if status.Code(err) == codes.InvalidArgument {
        log.Errorf("INVALID_ARGUMENT - check request structure and field values")
    }
}
```

### 3. Validate Money Objects

```go
func validateMoney(m *pb.Money) error {
    if m == nil {
        return fmt.Errorf("money object is nil")
    }
    if !money.IsValid(m) {
        return fmt.Errorf("invalid money: units=%d nanos=%d (signs must match, nanos in [-999999999, 999999999])", 
            m.Units, m.Nanos)
    }
    if m.CurrencyCode == "" {
        return fmt.Errorf("currency code is required")
    }
    return nil
}
```

### 4. Use gRPC Error Details

Extract detailed error information:
```go
if err != nil {
    st, ok := status.FromError(err)
    if ok {
        log.Errorf("gRPC Status: code=%s message=%s", st.Code(), st.Message())
        // Check for InvalidArgument
        if st.Code() == codes.InvalidArgument {
            // Handle invalid argument case
            log.Errorf("Request contains invalid arguments: %s", st.Message())
        }
    }
}
```

## Prevention Checklist

- [ ] All required proto fields are populated
- [ ] Money objects have matching signs for units/nanos
- [ ] Money nanos values are within [-999,999,999, +999,999,999]
- [ ] Currency codes are valid ISO 4217 codes
- [ ] User IDs are non-empty strings
- [ ] Product IDs exist in the catalog
- [ ] Quantities are positive integers
- [ ] Email addresses are properly formatted
- [ ] Credit card information is complete and valid
- [ ] Addresses have all required fields
- [ ] OTel Collector YAML is properly formatted
- [ ] Environment variables are set correctly
- [ ] Service endpoints are reachable and properly formatted

## Real-World Scenarios

### Scenario 1: Checkout Failure Due to Invalid Money

```
User Action: Place order with 3 items
Cart Service: Returns cart successfully
Product Catalog: Returns product prices
Problem: Currency conversion returns invalid Money object with sign mismatch
Result: checkout.PlaceOrder() fails with INVALID_ARGUMENT
Root Cause: Bug in currency conversion created +10/-500000000 (invalid)
```

### Scenario 2: Quote Service Missing Parameter

```
User Action: Get shipping quote
Frontend: Calls shipping service
Shipping Service: Calls quote service via HTTP
Problem: Request JSON missing "numberOfItems" field
Result: Quote service throws InvalidArgumentException
Root Cause: Frontend didn't count cart items before calling shipping
```

### Scenario 3: Collector Configuration Error

```
Deployment: Kubernetes with sidecar collectors
Problem: Collector YAML has incorrect exporter config
Result: Collector fails to start with "invalid configuration" error
Root Cause: Environment variable not set, leading to malformed endpoint
```

## Validation Implementation Examples

### Add Money Validation to Checkout

```go
func (cs *checkout) PlaceOrder(ctx context.Context, req *pb.PlaceOrderRequest) (*pb.PlaceOrderResponse, error) {
    // Add validation
    if req.UserId == "" {
        return nil, status.Errorf(codes.InvalidArgument, "user_id is required")
    }
    if req.UserCurrency == "" {
        return nil, status.Errorf(codes.InvalidArgument, "user_currency is required")
    }
    if req.Address == nil {
        return nil, status.Errorf(codes.InvalidArgument, "address is required")
    }
    if req.Email == "" {
        return nil, status.Errorf(codes.InvalidArgument, "email is required")
    }
    if req.CreditCard == nil {
        return nil, status.Errorf(codes.InvalidArgument, "credit_card is required")
    }
    
    // Existing logic continues...
}
```

### Add Product ID Validation

```go
func (p *productCatalog) GetProduct(ctx context.Context, req *pb.GetProductRequest) (*pb.Product, error) {
    span := trace.SpanFromContext(ctx)
    
    // Add validation
    if req.Id == "" {
        return nil, status.Errorf(codes.InvalidArgument, "product id is required")
    }
    
    span.SetAttributes(attribute.String("app.product.id", req.Id))
    
    // Rest of existing logic...
}
```

### Add Cart Item Validation

```go
func (cs *checkout) prepOrderItems(ctx context.Context, items []*pb.CartItem, userCurrency string) ([]*pb.OrderItem, error) {
    // Add validation
    if len(items) == 0 {
        return nil, fmt.Errorf("cart is empty")
    }
    
    out := make([]*pb.OrderItem, len(items))
    for i, item := range items {
        // Validate each item
        if item.ProductId == "" {
            return nil, fmt.Errorf("cart item %d has empty product_id", i)
        }
        if item.Quantity <= 0 {
            return nil, fmt.Errorf("cart item %d has invalid quantity: %d", i, item.Quantity)
        }
        
        // Existing logic continues...
    }
    return out, nil
}
```

## Testing for INVALID_ARGUMENT

### Unit Test Example

```go
func TestPlaceOrder_InvalidArguments(t *testing.T) {
    tests := []struct {
        name    string
        request *pb.PlaceOrderRequest
        wantErr codes.Code
    }{
        {
            name: "missing user_id",
            request: &pb.PlaceOrderRequest{
                UserId: "",  // Invalid
                UserCurrency: "USD",
            },
            wantErr: codes.InvalidArgument,
        },
        {
            name: "missing user_currency",
            request: &pb.PlaceOrderRequest{
                UserId: "user123",
                UserCurrency: "",  // Invalid
            },
            wantErr: codes.InvalidArgument,
        },
        {
            name: "missing address",
            request: &pb.PlaceOrderRequest{
                UserId: "user123",
                UserCurrency: "USD",
                Address: nil,  // Invalid
            },
            wantErr: codes.InvalidArgument,
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            _, err := checkoutService.PlaceOrder(ctx, tt.request)
            if status.Code(err) != tt.wantErr {
                t.Errorf("expected error code %v, got %v", tt.wantErr, status.Code(err))
            }
        })
    }
}
```

### Integration Test Example

```yaml
# Tracetest example for invalid argument
type: Test
spec:
  id: invalid-checkout-test
  name: Checkout with Invalid Currency
  trigger:
    type: grpc
    grpc:
      protobufFile: demo.proto
      address: checkout:5050
      method: oteldemo.CheckoutService/PlaceOrder
      request: |
        {
          "user_id": "test-user",
          "user_currency": "INVALID",
          "address": {...},
          "email": "test@example.com",
          "credit_card": {...}
        }
  specs:
    - selector: span[name="PlaceOrder"]
      assertions:
        - attr:rpc.grpc.status_code = 3
```

## Distributed Tracing of INVALID_ARGUMENT

When an INVALID_ARGUMENT error occurs, OpenTelemetry captures:

```
PlaceOrder (checkout service) [ERROR]
  └─ span.status: ERROR
  └─ rpc.grpc.status_code: 3
  └─ error.message: "invalid user_currency"
  └─ exception.type: "status.Error"
  │
  ├─ prepareOrderItemsAndShippingQuoteFromCart
  │   └─ convertCurrency (currency service) [ERROR]
  │       └─ rpc.grpc.status_code: 3
  │       └─ error.message: "unsupported currency code: INVALID"
```

## Quick Reference: Common Error Patterns

| Symptom | Likely Cause | Service |
|---------|--------------|---------|
| "numberOfItems not provided" | Missing parameter in quote request | Quote |
| "Product Not Found" | Invalid/non-existent product_id | Product Catalog |
| "one of the specified money values is invalid" | Money sign mismatch or nanos overflow | Checkout (money.Sum) |
| "mismatching currency codes" | Attempting to add different currencies | Checkout (money.Sum) |
| "user_id is required" | Empty or missing user_id | Cart, Checkout |
| "cannot unmarshal the configuration" | YAML syntax error or type mismatch | OTel Collector |
| "invalid configuration" | Missing required fields in config | OTel Collector |

## Resolution Steps

1. **Check request logs** - Look for the exact request that failed
2. **Validate against proto** - Ensure all required fields are present
3. **Check field constraints** - Verify Money objects, IDs, quantities
4. **Trace upstream** - Follow distributed trace to find origin of error
5. **Review recent changes** - Check if new validations were added
6. **Test with known-good data** - Use test fixtures to isolate issue
7. **Validate collector config** - Run `otelcol validate --config=config.yaml`

## Additional Resources

- [gRPC Status Codes Documentation](https://grpc.github.io/grpc/core/md_doc_statuscodes.html)
- [OpenTelemetry Collector Configuration](https://opentelemetry.io/docs/collector/configuration/)
- Demo Proto Schema: `pb/demo.proto`
- Money Validation Logic: `src/checkout/money/money.go`
- Money Validation Tests: `src/checkout/money/money_test.go`
