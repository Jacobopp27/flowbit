"""
Script to manually trigger notification checks for testing
Usage: python -m app.scripts.check_notifications
"""
from app.database import SessionLocal
from app.services import notification_service

def main():
    db = SessionLocal()
    try:
        print("Checking for delayed stages...")
        notification_service.check_delayed_stages(db)
        print("✓ Delayed stages checked")
        
        print("\nChecking for upcoming deadlines...")
        notification_service.check_upcoming_deadlines(db)
        print("✓ Upcoming deadlines checked")
        
        print("\n✅ Notification check completed successfully!")
    except Exception as e:
        print(f"\n❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
