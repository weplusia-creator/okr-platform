use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Prospect {
    pub id: Uuid,
    pub company_name: String,
    pub contact_name: String,
    pub contact_title: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub linkedin_url: Option<String>,
    pub website: Option<String>,
    pub industry: Option<String>,
    pub company_size: Option<String>,
    pub country: Option<String>,
    pub city: Option<String>,
    pub estimated_value: Option<rust_decimal::Decimal>,
    pub score: i32,
    pub score_label: String,
    pub status: String,
    pub notes: Option<String>,
    pub assigned_to: Option<Uuid>,
    pub created_by: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct CreateProspect {
    #[validate(length(min = 1, message = "Company name is required"))]
    pub company_name: String,
    #[validate(length(min = 1, message = "Contact name is required"))]
    pub contact_name: String,
    pub contact_title: Option<String>,
    #[validate(email(message = "Invalid email"))]
    pub email: Option<String>,
    pub phone: Option<String>,
    pub linkedin_url: Option<String>,
    pub website: Option<String>,
    pub industry: Option<String>,
    pub company_size: Option<String>,
    pub country: Option<String>,
    pub city: Option<String>,
    pub estimated_value: Option<f64>,
    pub notes: Option<String>,
    pub assigned_to: Option<Uuid>,
    pub tag_ids: Option<Vec<Uuid>>,
}

#[derive(Debug, Deserialize, Validate, ToSchema)]
pub struct UpdateProspect {
    pub company_name: Option<String>,
    pub contact_name: Option<String>,
    pub contact_title: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub linkedin_url: Option<String>,
    pub website: Option<String>,
    pub industry: Option<String>,
    pub company_size: Option<String>,
    pub country: Option<String>,
    pub city: Option<String>,
    pub estimated_value: Option<f64>,
    pub notes: Option<String>,
    pub assigned_to: Option<Uuid>,
    pub status: Option<String>,
    pub tag_ids: Option<Vec<Uuid>>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct ProspectFilter {
    pub search: Option<String>,
    pub industry: Option<String>,
    pub company_size: Option<String>,
    pub country: Option<String>,
    pub status: Option<String>,
    pub score_min: Option<i32>,
    pub score_max: Option<i32>,
    pub score_label: Option<String>,
    pub assigned_to: Option<Uuid>,
    pub tag_id: Option<Uuid>,
    pub page: Option<i64>,
    pub per_page: Option<i64>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ProspectList {
    pub data: Vec<Prospect>,
    pub total: i64,
    pub page: i64,
    pub per_page: i64,
    pub total_pages: i64,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ProspectWithTags {
    #[serde(flatten)]
    pub prospect: Prospect,
    pub tags: Vec<super::tag::Tag>,
}

#[derive(Debug, Deserialize)]
pub struct CsvProspectRow {
    pub company_name: String,
    pub contact_name: String,
    pub contact_title: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub linkedin_url: Option<String>,
    pub website: Option<String>,
    pub industry: Option<String>,
    pub company_size: Option<String>,
    pub country: Option<String>,
    pub city: Option<String>,
    pub estimated_value: Option<f64>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ImportResult {
    pub imported: usize,
    pub errors: Vec<String>,
}
