use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ScoringCriteria {
    pub id: Uuid,
    pub name: String,
    pub field_name: String,
    pub field_value: Option<String>,
    pub points: i32,
    pub weight: rust_decimal::Decimal,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateScoringCriteria {
    pub name: String,
    pub field_name: String,
    pub field_value: Option<String>,
    pub points: i32,
    pub weight: Option<f64>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ScoreBreakdown {
    pub prospect_id: Uuid,
    pub total_score: i32,
    pub label: String,
    pub criteria_applied: Vec<CriteriaMatch>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct CriteriaMatch {
    pub criteria_name: String,
    pub points: i32,
    pub reason: String,
}

pub fn score_to_label(score: i32) -> &'static str {
    match score {
        0..=25 => "cold",
        26..=50 => "warm",
        51..=75 => "hot",
        76..=100 => "ready_to_close",
        _ => {
            if score > 100 {
                "ready_to_close"
            } else {
                "cold"
            }
        }
    }
}
