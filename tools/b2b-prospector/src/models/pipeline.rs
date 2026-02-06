use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct PipelineStage {
    pub id: Uuid,
    pub name: String,
    pub position: i32,
    pub color: String,
    pub is_won: bool,
    pub is_lost: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct PipelineEntry {
    pub id: Uuid,
    pub prospect_id: Uuid,
    pub stage_id: Uuid,
    pub entered_at: DateTime<Utc>,
    pub exited_at: Option<DateTime<Utc>>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct PipelineHistory {
    pub id: Uuid,
    pub prospect_id: Uuid,
    pub from_stage_id: Option<Uuid>,
    pub to_stage_id: Uuid,
    pub moved_by: Uuid,
    pub moved_at: DateTime<Utc>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct MoveProspectStage {
    pub prospect_id: Uuid,
    pub to_stage_id: Uuid,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct StageWithProspects {
    pub stage: PipelineStage,
    pub prospects: Vec<super::prospect::Prospect>,
    pub count: i64,
    pub total_value: f64,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct PipelineMetrics {
    pub stages: Vec<StageMetric>,
    pub total_value: f64,
    pub total_prospects: i64,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct StageMetric {
    pub stage_id: Uuid,
    pub stage_name: String,
    pub count: i64,
    pub total_value: f64,
    pub conversion_rate: f64,
}
