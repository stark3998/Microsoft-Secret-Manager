import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None


async def _run_scheduled_scan():
    """Wrapper for the scheduled scan job."""
    from app.services.scanner.orchestrator import run_full_scan
    logger.info("Starting scheduled scan...")
    await run_full_scan(triggered_by="system")


async def _run_certificate_renewal():
    """Wrapper for the scheduled ACME certificate renewal check."""
    from app.services.acme.orchestrator import CertificateOrchestrator
    logger.info("Starting scheduled certificate renewal check...")
    orchestrator = CertificateOrchestrator()
    results = await orchestrator.check_renewals()
    renewed = len([r for r in results if "error" not in r])
    errors = len([r for r in results if "error" in r])
    logger.info(f"Certificate renewal check complete: {renewed} renewed, {errors} errors")


async def _run_saml_rotation_cycle():
    """Wrapper for the scheduled SAML certificate rotation cycle."""
    from app.services.saml_rotation.orchestrator import SamlRotationOrchestrator
    logger.info("Starting scheduled SAML rotation cycle...")
    orchestrator = SamlRotationOrchestrator()
    result = await orchestrator.run_rotation_cycle()
    logger.info(f"SAML rotation cycle complete: {result}")


async def _run_purge():
    """Wrapper for the scheduled scan history purge."""
    from app.services.purge import purge_old_scan_history
    logger.info("Starting scheduled purge...")
    deleted = await purge_old_scan_history()
    logger.info(f"Purge complete: {deleted} old records removed")


async def start_scheduler() -> None:
    """Initialize and start the APScheduler."""
    global _scheduler

    from app.config import settings

    _scheduler = AsyncIOScheduler()

    try:
        # Scan job
        scan_trigger = CronTrigger.from_crontab(settings.scan_cron_expression)
        _scheduler.add_job(
            _run_scheduled_scan,
            trigger=scan_trigger,
            id="full_scan",
            name="Full Secret Scan",
            replace_existing=True,
        )
        logger.info(f"Scan scheduler: {settings.scan_cron_expression}")

        # ACME certificate renewal job
        if settings.acme_enabled and settings.acme_auto_renew:
            renewal_trigger = CronTrigger.from_crontab(settings.acme_renewal_cron)
            _scheduler.add_job(
                _run_certificate_renewal,
                trigger=renewal_trigger,
                id="cert_renewal",
                name="ACME Certificate Renewal",
                replace_existing=True,
            )
            logger.info(f"ACME renewal scheduler: {settings.acme_renewal_cron}")

        # SAML certificate rotation job
        if settings.saml_rotation_enabled:
            rotation_trigger = CronTrigger.from_crontab(settings.saml_rotation_cron)
            _scheduler.add_job(
                _run_saml_rotation_cycle,
                trigger=rotation_trigger,
                id="saml_rotation",
                name="SAML Certificate Rotation",
                replace_existing=True,
            )
            logger.info(f"SAML rotation scheduler: {settings.saml_rotation_cron}")

        # Purge job (monthly)
        purge_trigger = CronTrigger.from_crontab(settings.purge_cron_expression)
        _scheduler.add_job(
            _run_purge,
            trigger=purge_trigger,
            id="purge",
            name="Scan History Purge",
            replace_existing=True,
        )
        logger.info(f"Purge scheduler: {settings.purge_cron_expression}")

        _scheduler.start()
        logger.info("All schedulers started")
    except Exception as e:
        logger.exception(f"Failed to start scheduler: {e}")


def stop_scheduler() -> None:
    """Shutdown the scheduler."""
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")


def reschedule_scan(cron_expression: str) -> None:
    """Update the scan schedule with a new cron expression."""
    global _scheduler
    if _scheduler and _scheduler.running:
        try:
            trigger = CronTrigger.from_crontab(cron_expression)
            _scheduler.reschedule_job("full_scan", trigger=trigger)
            logger.info(f"Rescheduled scan to: {cron_expression}")
        except Exception as e:
            logger.exception(f"Failed to reschedule scan: {e}")
