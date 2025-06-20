# Kafka Queue Problems Feature Flag - Issue Analysis & Fix

## Issue Summary

At approximately 10:00 AM UTC (17:00 UTC in logs), the Kafka infrastructure experienced significant performance degradation due to the accidental activation of the `kafkaQueueProblems` feature flag.

## Root Cause Analysis

The `kafkaQueueProblems` feature flag was designed as a testing/demo feature to simulate Kafka performance issues. When enabled, it causes problems in two services:

### 1. Fraud Detection Service (Kotlin)
- **Problem**: Introduced a 1-second delay for each Kafka message processed
- **Impact**: Caused massive consumer lag as each message took 1000ms to process
- **Location**: `src/fraud-detection/src/main/kotlin/frauddetection/main.kt:59-62`

### 2. Checkout Service (Go)
- **Problem**: Sent multiple duplicate messages to Kafka to simulate queue overload
- **Impact**: Flooded Kafka with up to 100 duplicate messages per order
- **Location**: `src/checkout/main.go:602-614`

## Incident Timeline

- **17:00 UTC**: `kafkaQueueProblems` feature flag activated
- **17:00 UTC**: Fraud detection service began experiencing 1-second delays per message
- **17:02 UTC**: Significant increase in Kafka network I/O observed on pod `kafka-75f767bc76-lwtdw`
- **Impact**: Consumer lag spike, increased resource usage, processing delays

## Fixes Implemented

### 1. Immediate Resolution
- **Feature Flag Configuration**: Set `kafkaQueueProblems` to 100% "off" using percentage targeting
- **File**: `src/flagd/demo.flagd.json`
- **Effect**: Immediately disables the problematic feature across all services

### 2. Production Safeguards - Fraud Detection Service
- **Environment Check**: Ignores feature flag activation in production environments
- **Delay Reduction**: Caps delay at 100ms instead of 1000ms for testing scenarios
- **File**: `src/fraud-detection/src/main/kotlin/frauddetection/main.kt`
- **Benefits**: 
  - Prevents production outages
  - Reduces testing impact by 90%
  - Maintains testing functionality in dev/staging

### 3. Production Safeguards - Checkout Service
- **Environment Check**: Ignores feature flag activation in production environments  
- **Message Limit**: Caps duplicate messages at 10 instead of up to 100
- **File**: `src/checkout/main.go`
- **Benefits**:
  - Prevents Kafka queue flooding in production
  - Reduces testing load by 90%
  - Maintains testing capabilities for load testing

## Prevention Measures

### Implemented Safeguards
1. **Environment-based Protection**: Both services now check `ENVIRONMENT` variable
2. **Value Capping**: Limited maximum impact even when enabled
3. **Enhanced Logging**: Better visibility into feature flag activation and capping
4. **Percentage Targeting**: Feature flag now uses percentage-based targeting for better control

### Recommended Practices
1. **Always test feature flags in staging first**
2. **Use percentage rollouts for gradual activation**
3. **Monitor Kafka consumer lag when testing queue-related features**
4. **Set up alerts for abnormal consumer lag spikes**
5. **Document all testing/demo feature flags clearly**

## Testing the Fix

### Verification Steps
1. **Immediate**: Confirm `kafkaQueueProblems` is set to 0% activation
2. **Monitoring**: Watch Kafka consumer lag return to normal levels
3. **Staging Test**: Verify safeguards work in non-production environments
4. **Production Test**: Confirm feature flag is ignored in production

### Expected Behavior Post-Fix
- **Production**: Feature flag completely ignored regardless of configuration
- **Development/Staging**: Feature flag works with reduced impact (100ms delay, max 10 messages)
- **Kafka Performance**: Consumer lag returns to baseline levels
- **Resource Usage**: CPU and memory usage normalizes

## Files Changed
- `src/flagd/demo.flagd.json` - Feature flag configuration
- `src/fraud-detection/src/main/kotlin/frauddetection/main.kt` - Consumer delay logic
- `src/checkout/main.go` - Producer overload logic

## Monitoring Recommendations
- Set up alerts for consumer lag > 1000 messages
- Monitor network I/O on Kafka pods
- Track feature flag activation in application logs
- Set up dashboard for real-time Kafka health metrics