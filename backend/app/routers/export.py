"""Export API routes for CSV and PDF reports."""

import logging

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from app.auth.dependencies import require_permission
from app.auth.rbac import Permission
from app.models.user import UserInfo
from app.services.export import export_items_csv, export_items_pdf

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/export", tags=["export"])


@router.get("/csv")
async def export_csv(
    source: str | None = Query(None),
    status: str | None = Query(None),
    subscription_id: str | None = Query(None, alias="subscriptionId"),
    search: str | None = Query(None),
    user: UserInfo = Depends(require_permission(Permission.EXPORT_DATA)),
):
    """Export items as CSV."""
    filters = _build_filters(source, status, subscription_id, search)
    csv_buffer = await export_items_csv(filters)
    return StreamingResponse(
        iter([csv_buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=secret-manager-export.csv"},
    )


@router.get("/pdf")
async def export_pdf(
    source: str | None = Query(None),
    status: str | None = Query(None),
    subscription_id: str | None = Query(None, alias="subscriptionId"),
    search: str | None = Query(None),
    user: UserInfo = Depends(require_permission(Permission.EXPORT_DATA)),
):
    """Export items as PDF report."""
    filters = _build_filters(source, status, subscription_id, search)
    pdf_buffer = await export_items_pdf(filters)
    return StreamingResponse(
        iter([pdf_buffer.getvalue()]),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=secret-manager-report.pdf"},
    )


def _build_filters(source, status, subscription_id, search) -> dict | None:
    filters = {}
    if source:
        filters["source"] = source
    if status:
        filters["status"] = status
    if subscription_id:
        filters["subscriptionId"] = subscription_id
    if search:
        filters["search"] = search
    return filters or None
