"""
Script to create the notifications table
"""
from app.database import engine, Base
from app.models.notification import Notification
from app.models.user import User
from app.models.project import Project, ProjectStage

print("Creating notifications table...")

# Create the notifications table
Base.metadata.create_all(bind=engine, tables=[Notification.__table__])

print("✅ Notifications table created successfully!")
