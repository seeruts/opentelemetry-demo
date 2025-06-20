# Fix Email Service 500 Errors with Retry Logic

## Problem
The checkout service was experiencing failures when sending order confirmation emails due to transient 500 Internal Server Error responses from the email service. Based on the logs, this occurred **71 times** in a 30-minute window, causing customers to not receive their order confirmation emails even though their orders were processed successfully.

### Root Cause
The current implementation in `sendOrderConfirmation()` makes a single HTTP POST request to the email service and immediately fails if it receives a non-200 status code. This means that temporary service issues (like 500 errors) cause permanent failures in email delivery.

## Solution
This PR implements robust retry logic with exponential backoff to handle transient failures:

### Key Features
- **Smart Retry Logic**: Only retries transient HTTP errors (500, 502, 503, 504)
- **Exponential Backoff**: Uses exponential backoff with jitter to prevent thundering herd problems
- **Configurable Retries**: Up to 3 retry attempts with progressive delays (100ms, 200ms, 400ms + jitter)
- **Context Awareness**: Respects context cancellation during retries
- **Enhanced Logging**: Detailed logging for retry attempts and outcomes
- **OpenTelemetry Integration**: Full tracing support for retry attempts
- **Non-Breaking**: Preserves original error behavior for non-retryable errors (4xx codes)

### Code Changes
1. **Modified `sendOrderConfirmation()`**: Now delegates to retry-enabled function
2. **Added `sendOrderConfirmationWithRetry()`**: Core retry logic with exponential backoff
3. **Added `isRetryableHTTPStatus()`**: Helper to determine if errors are worth retrying

### Retry Strategy
```
Attempt 1: Immediate
Attempt 2: ~100-150ms delay
Attempt 3: ~200-300ms delay  
Attempt 4: ~400-600ms delay
```

## Testing
The fix handles the following scenarios:
- ✅ Temporary 500 errors (will retry up to 3 times)
- ✅ Network timeouts (will retry up to 3 times)
- ✅ Permanent 4xx errors (fails immediately, no retry)
- ✅ Context cancellation (stops retrying)
- ✅ Successful delivery after retries

## Impact
- **Improved Reliability**: Customers will receive order confirmations even during temporary email service issues
- **Better Observability**: Retry attempts are logged and traced
- **Graceful Degradation**: Non-retryable errors fail fast as before
- **No Performance Impact**: Only adds delay when retries are needed

## Monitoring
New OpenTelemetry attributes added:
- `app.email.retry.final_attempt`: Number of attempts made
- `app.email.retry.success`: Whether retries ultimately succeeded
- `app.email.retry.final_status_code`: Final HTTP status code

## Files Changed
- `src/checkout/main.go`: Added retry logic to email service calls

## Related Issues
Fixes the issue identified in Slack where checkout service logged 71 instances of:
```
"failed to send order confirmation to: 'moore@example.com': failed POST to email service: expected 200, got 500"
```