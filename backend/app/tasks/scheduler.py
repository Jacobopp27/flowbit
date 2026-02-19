from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.services import notification_service
import logging

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


def check_notifications():
    """Check for delayed stages and upcoming deadlines"""
    db: Session = SessionLocal()
    try:
        logger.info("Running scheduled notification check...")
        
        # Check for delayed stages (Type 2)
        notification_service.check_delayed_stages(db)
        
        # Check for upcoming project deadlines (Type 3)
        notification_service.check_upcoming_deadlines(db)
        
        logger.info("Notification check completed")
    except Exception as e:
        logger.error(f"Error in notification check: {e}")
    finally:
        db.close()


def start_scheduler():
    """Start the notification scheduler"""
    # Run every day at 9:00 AM
    scheduler.add_job(
        check_notifications,
        CronTrigger(hour=9, minute=0),
        id='daily_notification_check',
        name='Daily notification check',
        replace_existing=True
    )
    
    # Also run every 6 hours during work day (9 AM, 3 PM, 9 PM)
    scheduler.add_job(
        check_notifications,
        CronTrigger(hour='9,15,21', minute=0),
        id='periodic_notification_check',
        name='Periodic notification check',
        replace_existing=True
    )
    
    scheduler.start()
    logger.info("Notification scheduler started")


def shutdown_scheduler():
    """Shutdown the scheduler"""
    scheduler.shutdown()
    logger.info("Notification scheduler shutdown")
