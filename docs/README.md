# OpenTelemetry Demo - Error Documentation

This directory contains documentation about common errors and exceptions in the OpenTelemetry Demo.

## Documents

### [SATELLITE_INVALID_ARGUMENT_EXCEPTIONS.md](./SATELLITE_INVALID_ARGUMENT_EXCEPTIONS.md)
Comprehensive guide to understanding INVALID_ARGUMENT exceptions in OpenTelemetry services, including:
- What INVALID_ARGUMENT errors are and when they occur
- Common causes across different services
- Money validation rules and constraints
- Debugging strategies and monitoring approaches
- Service-specific considerations

### [INVALID_ARGUMENT_EXAMPLES.md](./INVALID_ARGUMENT_EXAMPLES.md)
Practical examples and code snippets demonstrating:
- Money validation scenarios (sign mismatches, nanos overflow, currency mismatches)
- Service request examples (Cart, Product Catalog, Quote, Checkout, Currency)
- OpenTelemetry Collector configuration errors
- Testing strategies for INVALID_ARGUMENT cases
- Distributed tracing patterns
- Quick reference table for common error patterns

## Quick Start

If you're seeing INVALID_ARGUMENT (gRPC error code 3) exceptions:

1. **Identify the service** - Check which service is returning the error
2. **Review request data** - Ensure all required fields are populated
3. **Validate constraints** - Check Money objects, IDs, and other field constraints
4. **Check logs and traces** - Use OpenTelemetry traces to track the error origin
5. **Consult examples** - See [INVALID_ARGUMENT_EXAMPLES.md](./INVALID_ARGUMENT_EXAMPLES.md) for specific scenarios

## Related Files

- Proto schema: `/pb/demo.proto` - Defines service contracts and message structures
- Money validation: `/src/checkout/money/money.go` - Money validation logic
- Money tests: `/src/checkout/money/money_test.go` - Validation test cases
- Checkout service: `/src/checkout/main.go` - Main orchestration service
- Product Catalog: `/src/product-catalog/main.go` - Product lookup service
- Quote Service: `/src/quote/app/routes.php` - Shipping quote calculation
- OTel Collector config: `/src/otel-collector/otelcol-config.yml` - Collector configuration

## Contributing

When adding new services or validation logic, please update this documentation to reflect:
- New validation rules
- Required fields
- Error scenarios
- Debugging approaches
