use axum::{
    extract::{Path, State},
    Extension, Json,
};
use sqlx::Row;
use uuid::Uuid;

use crate::auth::jwt::Claims;
use crate::errors::{AppError, AppResult};
use crate::models::pipeline::*;
use crate::models::prospect::Prospect;
use crate::AppState;

/// Get all pipeline stages with their prospects
#[utoipa::path(get, path = "/api/pipeline", responses((status = 200, body = Vec<StageWithProspects>)))]
pub async fn get_pipeline(
    State(state): State<AppState>,
) -> AppResult<Json<Vec<StageWithProspects>>> {
    let stages = sqlx::query_as::<_, PipelineStage>(
        "SELECT * FROM pipeline_stages ORDER BY position",
    )
    .fetch_all(&state.db)
    .await?;

    let mut result = Vec::new();

    for stage in stages {
        let prospects = sqlx::query_as::<_, Prospect>(
            r#"SELECT p.* FROM prospects p
               JOIN pipeline_entries pe ON pe.prospect_id = p.id
               WHERE pe.stage_id = $1 AND pe.exited_at IS NULL
               ORDER BY p.score DESC"#,
        )
        .bind(stage.id)
        .fetch_all(&state.db)
        .await?;

        let count = prospects.len() as i64;
        let total_value: f64 = prospects
            .iter()
            .filter_map(|p| {
                p.estimated_value
                    .as_ref()
                    .and_then(|v| v.to_string().parse::<f64>().ok())
            })
            .sum();

        result.push(StageWithProspects {
            stage,
            prospects,
            count,
            total_value,
        });
    }

    Ok(Json(result))
}

/// Move a prospect to a different pipeline stage
#[utoipa::path(
    post, path = "/api/pipeline/move",
    request_body = MoveProspectStage,
    responses((status = 200, body = PipelineEntry))
)]
pub async fn move_prospect_stage(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(body): Json<MoveProspectStage>,
) -> AppResult<Json<PipelineEntry>> {
    let target_stage = sqlx::query_as::<_, PipelineStage>(
        "SELECT * FROM pipeline_stages WHERE id = $1",
    )
    .bind(body.to_stage_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Stage not found".into()))?;

    let current = sqlx::query_as::<_, PipelineEntry>(
        "SELECT * FROM pipeline_entries WHERE prospect_id = $1 AND exited_at IS NULL",
    )
    .bind(body.prospect_id)
    .fetch_optional(&state.db)
    .await?;

    let from_stage_id = current.as_ref().map(|e| e.stage_id);

    if let Some(entry) = &current {
        sqlx::query("UPDATE pipeline_entries SET exited_at = NOW() WHERE id = $1")
            .bind(entry.id)
            .execute(&state.db)
            .await?;
    }

    let new_entry = sqlx::query_as::<_, PipelineEntry>(
        r#"INSERT INTO pipeline_entries (prospect_id, stage_id, notes)
           VALUES ($1, $2, $3)
           RETURNING *"#,
    )
    .bind(body.prospect_id)
    .bind(body.to_stage_id)
    .bind(&body.notes)
    .fetch_one(&state.db)
    .await?;

    sqlx::query(
        r#"INSERT INTO pipeline_history (prospect_id, from_stage_id, to_stage_id, moved_by, notes)
           VALUES ($1, $2, $3, $4, $5)"#,
    )
    .bind(body.prospect_id)
    .bind(from_stage_id)
    .bind(body.to_stage_id)
    .bind(claims.sub)
    .bind(&body.notes)
    .execute(&state.db)
    .await?;

    let new_status = if target_stage.is_won {
        "closed_won"
    } else if target_stage.is_lost {
        "closed_lost"
    } else {
        &target_stage.name.to_lowercase().replace(' ', "_")
    };

    sqlx::query("UPDATE prospects SET status = $1, updated_at = NOW() WHERE id = $2")
        .bind(new_status)
        .bind(body.prospect_id)
        .execute(&state.db)
        .await?;

    Ok(Json(new_entry))
}

/// Get pipeline metrics
#[utoipa::path(get, path = "/api/pipeline/metrics", responses((status = 200, body = PipelineMetrics)))]
pub async fn pipeline_metrics(
    State(state): State<AppState>,
) -> AppResult<Json<PipelineMetrics>> {
    let stages = sqlx::query_as::<_, PipelineStage>(
        "SELECT * FROM pipeline_stages ORDER BY position",
    )
    .fetch_all(&state.db)
    .await?;

    let total_entered_pipeline: i64 = sqlx::query_scalar(
        "SELECT COUNT(DISTINCT prospect_id) FROM pipeline_entries",
    )
    .fetch_one(&state.db)
    .await?;

    let mut stage_metrics = Vec::new();
    let mut total_value = 0.0_f64;
    let mut total_prospects = 0_i64;

    for stage in &stages {
        let row = sqlx::query(
            r#"SELECT
                COUNT(DISTINCT pe.prospect_id) AS count,
                COALESCE(SUM(p.estimated_value), 0) AS total_value
               FROM pipeline_entries pe
               JOIN prospects p ON p.id = pe.prospect_id
               WHERE pe.stage_id = $1 AND pe.exited_at IS NULL"#,
        )
        .bind(stage.id)
        .fetch_one(&state.db)
        .await?;

        let count: i64 = row.try_get("count").unwrap_or(0);
        let value: f64 = row
            .try_get::<rust_decimal::Decimal, _>("total_value")
            .ok()
            .and_then(|v| v.to_string().parse::<f64>().ok())
            .unwrap_or(0.0);

        let conversion_rate = if total_entered_pipeline > 0 {
            (count as f64 / total_entered_pipeline as f64) * 100.0
        } else {
            0.0
        };

        total_value += value;
        total_prospects += count;

        stage_metrics.push(StageMetric {
            stage_id: stage.id,
            stage_name: stage.name.clone(),
            count,
            total_value: value,
            conversion_rate,
        });
    }

    Ok(Json(PipelineMetrics {
        stages: stage_metrics,
        total_value,
        total_prospects,
    }))
}

/// Get pipeline history for a prospect
#[utoipa::path(get, path = "/api/pipeline/history/{prospect_id}", responses((status = 200)))]
pub async fn pipeline_history(
    State(state): State<AppState>,
    Path(prospect_id): Path<Uuid>,
) -> AppResult<Json<Vec<serde_json::Value>>> {
    let rows = sqlx::query(
        r#"SELECT ph.id, ph.prospect_id, ph.moved_at, ph.notes,
                  fs.name AS from_stage_name,
                  ts.name AS to_stage_name,
                  u.name AS moved_by_name
           FROM pipeline_history ph
           LEFT JOIN pipeline_stages fs ON fs.id = ph.from_stage_id
           JOIN pipeline_stages ts ON ts.id = ph.to_stage_id
           JOIN users u ON u.id = ph.moved_by
           WHERE ph.prospect_id = $1
           ORDER BY ph.moved_at DESC"#,
    )
    .bind(prospect_id)
    .fetch_all(&state.db)
    .await?;

    let result: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            serde_json::json!({
                "id": r.try_get::<Uuid, _>("id").unwrap(),
                "prospect_id": r.try_get::<Uuid, _>("prospect_id").unwrap(),
                "from_stage": r.try_get::<Option<String>, _>("from_stage_name").ok().flatten(),
                "to_stage": r.try_get::<String, _>("to_stage_name").unwrap_or_default(),
                "moved_by": r.try_get::<String, _>("moved_by_name").unwrap_or_default(),
                "moved_at": r.try_get::<chrono::DateTime<chrono::Utc>, _>("moved_at").unwrap().to_rfc3339(),
                "notes": r.try_get::<Option<String>, _>("notes").ok().flatten(),
            })
        })
        .collect();

    Ok(Json(result))
}

/// Get all pipeline stages
#[utoipa::path(get, path = "/api/pipeline/stages", responses((status = 200, body = Vec<PipelineStage>)))]
pub async fn list_stages(
    State(state): State<AppState>,
) -> AppResult<Json<Vec<PipelineStage>>> {
    let stages = sqlx::query_as::<_, PipelineStage>(
        "SELECT * FROM pipeline_stages ORDER BY position",
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(stages))
}
