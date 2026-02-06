use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Reminder {
    pub id: Uuid,
    pub prospect_id: Uuid,
    pub user_id: Uuid,
    pub remind_at: DateTime<Utc>,
    pub message: String,
    pub is_completed: bool,
    pub completed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct CreateReminder {
    pub prospect_id: Uuid,
    pub remind_at: DateTime<Utc>,
    #[validate(length(min = 1, message = "Message is required"))]
    pub message: String,
}

#[derive(Debug, Serialize, FromRow, ToSchema)]
pub struct ReminderWithProspect {
    pub id: Uuid,
    pub prospect_id: Uuid,
    pub user_id: Uuid,
    pub remind_at: DateTime<Utc>,
    pub message: String,
    pub is_completed: bool,
    pub completed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub prospect_name: String,
    pub company_name: String,
}
