use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Interaction {
    pub id: Uuid,
    pub prospect_id: Uuid,
    pub user_id: Uuid,
    pub interaction_type: String,
    pub subject: Option<String>,
    pub body: Option<String>,
    pub outcome: Option<String>,
    pub duration_minutes: Option<i32>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct CreateInteraction {
    pub prospect_id: Uuid,
    #[validate(length(min = 1, message = "Interaction type is required"))]
    pub interaction_type: String,
    pub subject: Option<String>,
    pub body: Option<String>,
    pub outcome: Option<String>,
    pub duration_minutes: Option<i32>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct InteractionWithUser {
    #[serde(flatten)]
    pub interaction: Interaction,
    pub user_name: String,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct InteractionFilter {
    pub prospect_id: Option<Uuid>,
    pub interaction_type: Option<String>,
    pub page: Option<i64>,
    pub per_page: Option<i64>,
}
