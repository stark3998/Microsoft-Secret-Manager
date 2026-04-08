import logging

from app.config import settings

logger = logging.getLogger(__name__)


def setup_telemetry(app):
    """Configure OpenTelemetry and Application Insights instrumentation."""
    try:
        from opentelemetry import trace
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

        resource = Resource.create({"service.name": "ms-secret-manager"})
        provider = TracerProvider(resource=resource)

        # Azure Monitor exporter
        if settings.applicationinsights_connection_string:
            from azure.monitor.opentelemetry.exporter import AzureMonitorTraceExporter
            exporter = AzureMonitorTraceExporter(
                connection_string=settings.applicationinsights_connection_string
            )
            from opentelemetry.sdk.trace.export import BatchSpanProcessor
            provider.add_span_processor(BatchSpanProcessor(exporter))
            logger.info("Azure Monitor trace exporter configured")

        # OTLP exporter
        if settings.otel_exporter_otlp_endpoint:
            from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
            otlp_exporter = OTLPSpanExporter(endpoint=settings.otel_exporter_otlp_endpoint)
            from opentelemetry.sdk.trace.export import BatchSpanProcessor
            provider.add_span_processor(BatchSpanProcessor(otlp_exporter))
            logger.info("OTLP trace exporter configured")

        trace.set_tracer_provider(provider)

        # Instrument FastAPI
        FastAPIInstrumentor.instrument_app(app)
        logger.info("OpenTelemetry instrumentation initialized")

    except ImportError as e:
        logger.warning(f"OpenTelemetry packages not available: {e}")
    except Exception as e:
        logger.warning(f"Failed to initialize telemetry: {e}")
