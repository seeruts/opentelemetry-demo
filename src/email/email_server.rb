# Copyright The OpenTelemetry Authors
# SPDX-License-Identifier: Apache-2.0

require "ostruct"
require "pony"
require "sinatra"

require "opentelemetry/sdk"
require "opentelemetry/exporter/otlp"
require "opentelemetry/instrumentation/sinatra"

set :port, ENV["EMAIL_PORT"]

OpenTelemetry::SDK.configure do |c|
  c.use "OpenTelemetry::Instrumentation::Sinatra"
end

post "/send_order_confirmation" do
  content_type :json
  
  begin
    data = JSON.parse(request.body.read, object_class: OpenStruct)
    
    # Validate required fields
    if data.email.nil? || data.email.empty?
      halt 400, { error: "Email is required" }.to_json
    end
    
    if data.order.nil?
      halt 400, { error: "Order data is required" }.to_json
    end

    # get the current auto-instrumented span
    current_span = OpenTelemetry::Trace.current_span
    current_span.add_attributes({
      "app.order.id" => data.order.order_id,
    })

    result = send_email(data)
    
    if result[:success]
      { message: "Email sent successfully", recipient: data.email }.to_json
    else
      status 503
      { error: "Failed to send email", details: result[:error] }.to_json
    end
    
  rescue JSON::ParserError => e
    halt 400, { error: "Invalid JSON format" }.to_json
  rescue StandardError => e
    OpenTelemetry::Trace.current_span.record_exception(e)
    puts "Error processing email request: #{e.message}"
    puts e.backtrace
    status 500
    { error: "Internal server error", message: e.message }.to_json
  end
end

error do
  OpenTelemetry::Trace.current_span.record_exception(env['sinatra.error'])
  content_type :json
  { error: "Internal server error" }.to_json
end

def send_email(data)
  # create and start a manual span
  tracer = OpenTelemetry.tracer_provider.tracer('email')
  tracer.in_span("send_email") do |span|
    begin
      Pony.mail(
        to:       data.email,
        from:     "noreply@example.com",
        subject:  "Your confirmation email",
        body:     erb(:confirmation, locals: { order: data.order }),
        via:      :test
      )
      span.set_attribute("app.email.recipient", data.email)
      span.set_attribute("app.email.status", "success")
      puts "Order confirmation email sent to: #{data.email}"
      return { success: true }
    rescue StandardError => e
      span.record_exception(e)
      span.set_attribute("app.email.status", "failed")
      span.set_attribute("app.email.error", e.message)
      puts "Failed to send email to #{data.email}: #{e.message}"
      return { success: false, error: e.message }
    end
  end
  # manually created spans need to be ended
  # in Ruby, the method `in_span` ends it automatically
  # check out the OpenTelemetry Ruby docs at: 
  # https://opentelemetry.io/docs/instrumentation/ruby/manual/#creating-new-spans 
end
