use axum::{
    extract::{Path, State},
    Json,
};
use uuid::Uuid;

use crate::errors::AppResult;
use crate::models::scoring::*;
use crate::services::scoring as scoring_service;
use crate::AppState;

/// Calculate/recalculate score for a prospect
#[utoipa::path(post, path = "/api/scoring/calculate/{prospect_id}", responses((status = 200, body = ScoreBreakdown)))]
pub async fn calculate_score(
    State(state): State<AppState>,
    Path(prospect_id): Path<Uuid>,
) -> AppResult<Json<ScoreBreakdown>> {
    let breakdown = scoring_service::calculate_score(&state.db, prospect_id).await?;
    Ok(Json(breakdown))
}

/// Recalculate all prospect scores
#[utoipa::path(post, path = "/api/scoring/recalculate-all", responses((status = 200)))]
pub async fn recalculate_all(
    State(state): State<AppState>,
) -> AppResult<Json<serde_json::Value>> {
    let count = scoring_service::recalculate_all_scores(&state.db).await?;
    Ok(Json(serde_json::json!({ "recalculated": count })))
}

/// List scoring criteria
#[utoipa::path(get, path = "/api/scoring/criteria", responses((status = 200, body = Vec<ScoringCriteria>)))]
pub async fn list_criteria(
    State(state): State<AppState>,
) -> AppResult<Json<Vec<ScoringCriteria>>> {
    let criteria = sqlx::query_as::<_, ScoringCriteria>(
        "SELECT * FROM scoring_criteria ORDER BY field_name, points DESC",
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(criteria))
}

/// Create a scoring criteria
#[utoipa::path(
    post, path = "/api/scoring/criteria",
    request_body = CreateScoringCriteria,
    responses((status = 201, body = ScoringCriteria))
)]
pub async fn create_criteria(
    State(state): State<AppState>,
    Json(body): Json<CreateScoringCriteria>,
) -> AppResult<Json<ScoringCriteria>> {
    let weight = body
        .weight
        .map(|w| rust_decimal::Decimal::try_from(w).unwrap_or_default())
        .unwrap_or_else(|| rust_decimal::Decimal::from(1));

    let criteria = sqlx::query_as::<_, ScoringCriteria>(
        r#"INSERT INTO scoring_criteria (name, field_name, field_value, points, weight, is_active)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *"#,
    )
    .bind(&body.name)
    .bind(&body.field_name)
    .bind(&body.field_value)
    .bind(body.points)
    .bind(&weight)
    .bind(body.is_active.unwrap_or(true))
    .fetch_one(&state.db)
    .await?;

    Ok(Json(criteria))
}

/// Delete a scoring criteria
#[utoipa::path(delete, path = "/api/scoring/criteria/{id}", responses((status = 204)))]
pub async fn delete_criteria(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<axum::http::StatusCode> {
    sqlx::query("DELETE FROM scoring_criteria WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await?;

    Ok(axum::http::StatusCode::NO_CONTENT)
}
