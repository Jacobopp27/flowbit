from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class NotificationResponse(BaseModel):
    id: int = Field(..., serialization_alias='notification_id')
    type: str
    title: str
    message: str
    project_id: Optional[int] = None
    project_stage_id: Optional[int] = None
    is_read: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    notifications: list[NotificationResponse]
    unread_count: int
