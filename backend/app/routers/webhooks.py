import logging

from fastapi import APIRouter, Request

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])


@router.post("/eventgrid")
async def handle_eventgrid(request: Request):
    """Receive Azure Event Grid notifications for Key Vault events."""
    body = await request.json()

    # Handle subscription validation handshake
    if isinstance(body, list) and body:
        first_event = body[0]
        event_type = first_event.get("eventType", "")

        if event_type == "Microsoft.EventGrid.SubscriptionValidationEvent":
            validation_code = first_event.get("data", {}).get("validationCode", "")
            logger.info("Event Grid subscription validation received")
            return {"validationResponse": validation_code}

    # Process actual Key Vault events
    from app.services.eventgrid.handler import process_events
    events = body if isinstance(body, list) else [body]

    processed = 0
    for event in events:
        try:
            await process_events(event)
            processed += 1
        except Exception as e:
            logger.error(f"Failed to process event: {e}")

    return {"status": "ok", "processed": processed}
