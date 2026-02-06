use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct AiTemplate {
    pub id: Uuid,
    pub name: String,
    pub template_type: String,
    pub tone: String,
    pub subject_template: Option<String>,
    pub body_template: String,
    pub created_by: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct CreateTemplate {
    #[validate(length(min = 1, message = "Name is required"))]
    pub name: String,
    pub template_type: String,
    pub tone: String,
    pub subject_template: Option<String>,
    #[validate(length(min = 1, message = "Body template is required"))]
    pub body_template: String,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct UpdateTemplate {
    pub name: Option<String>,
    pub template_type: Option<String>,
    pub tone: Option<String>,
    pub subject_template: Option<String>,
    pub body_template: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct GenerateMessageRequest {
    pub prospect_id: Uuid,
    pub template_id: Option<Uuid>,
    pub message_type: String, // first_contact, follow_up, proposal, closing
    pub tone: String,         // formal, casual, consultive
    pub additional_context: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct GeneratedMessage {
    pub subject: String,
    pub body: String,
    pub prospect_name: String,
    pub company_name: String,
}
