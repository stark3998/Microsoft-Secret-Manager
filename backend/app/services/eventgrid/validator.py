def is_validation_event(body: list | dict) -> bool:
    """Check if the request is an Event Grid subscription validation event."""
    if isinstance(body, list) and body:
        return body[0].get("eventType") == "Microsoft.EventGrid.SubscriptionValidationEvent"
    return False
