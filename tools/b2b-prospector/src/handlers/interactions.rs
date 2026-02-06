use axum::{
    extract::{Path, Query, State},
    Extension, Json,
};
use sqlx::Row;
use uuid::Uuid;
use validator::Validate;

use crate::auth::jwt::Claims;
use crate::errors::{AppError, AppResult};
use crate::models::interaction::*;
use crate::services::scoring;
use crate::AppState;

/// List interactions (optionally filtered by prospect)
#[utoipa::path(get, path = "/api/interactions", responses((status = 200)))]
pub async fn list_interactions(
    State(state): State<AppState>,
    Query(filter): Query<InteractionFilter>,
) -> AppResult<Json<serde_json::Value>> {
    let page = filter.page.unwrap_or(1).max(1);
    let per_page = filter.per_page.unwrap_or(25).clamp(1, 100);
    let offset = (page - 1) * per_page;

    let total: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM interactions
           WHERE ($1::uuid IS NULL OR prospect_id = $1)
             AND ($2::text IS NULL OR interaction_type = $2)"#,
    )
    .bind(&filter.prospect_id)
    .bind(&filter.interaction_type)
    .fetch_one(&state.db)
    .await?;

    let rows = sqlx::query(
        r#"SELECT i.id, i.prospect_id, i.user_id, i.interaction_type,
                  i.subject, i.body, i.outcome, i.duration_minutes, i.created_at,
                  u.name AS user_name
           FROM interactions i
           JOIN users u ON u.id = i.user_id
           WHERE ($1::uuid IS NULL OR i.prospect_id = $1)
             AND ($2::text IS NULL OR i.interaction_type = $2)
           ORDER BY i.created_at DESC
           LIMIT $3 OFFSET $4"#,
    )
    .bind(&filter.prospect_id)
    .bind(&filter.interaction_type)
    .bind(per_page)
    .bind(offset)
    .fetch_all(&state.db)
    .await?;

    let data: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            serde_json::json!({
                "id": r.try_get::<Uuid, _>("id").unwrap(),
                "prospect_id": r.try_get::<Uuid, _>("prospect_id").unwrap(),
                "user_id": r.try_get::<Uuid, _>("user_id").unwrap(),
                "interaction_type": r.try_get::<String, _>("interaction_type").unwrap_or_default(),
                "subject": r.try_get::<Option<String>, _>("subject").ok().flatten(),
                "body": r.try_get::<Option<String>, _>("body").ok().flatten(),
                "outcome": r.try_get::<Option<String>, _>("outcome").ok().flatten(),
                "duration_minutes": r.try_get::<Option<i32>, _>("duration_minutes").ok().flatten(),
                "created_at": r.try_get::<chrono::DateTime<chrono::Utc>, _>("created_at").unwrap().to_rfc3339(),
                "user_name": r.try_get::<String, _>("user_name").unwrap_or_default(),
            })
        })
        .collect();

    Ok(Json(serde_json::json!({
        "data": data,
        "total": total,
        "page": page,
        "per_page": per_page,
    })))
}

/// Create a new interaction
#[utoipa::path(
    post, path = "/api/interactions",
    request_body = CreateInteraction,
    responses((status = 201, body = Interaction))
)]
pub async fn create_interaction(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(body): Json<CreateInteraction>,
) -> AppResult<Json<Interaction>> {
    body.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    let valid_types = ["email", "call", "meeting", "note", "linkedin_message"];
    if !valid_types.contains(&body.interaction_type.as_str()) {
        return Err(AppError::Validation(format!(
            "Invalid interaction type. Must be one of: {}",
            valid_types.join(", ")
        )));
    }

    // Verify prospect exists
    let _: Uuid = sqlx::query_scalar("SELECT id FROM prospects WHERE id = $1")
        .bind(body.prospect_id)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Prospect not found".into()))?;

    let interaction = sqlx::query_as::<_, Interaction>(
        r#"INSERT INTO interactions (prospect_id, user_id, interaction_type, subject, body, outcome, duration_minutes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *"#,
    )
    .bind(body.prospect_id)
    .bind(claims.sub)
    .bind(&body.interaction_type)
    .bind(&body.subject)
    .bind(&body.body)
    .bind(&body.outcome)
    .bind(body.duration_minutes)
    .fetch_one(&state.db)
    .await?;

    // Update prospect's updated_at
    sqlx::query("UPDATE prospects SET updated_at = NOW() WHERE id = $1")
        .bind(body.prospect_id)
        .execute(&state.db)
        .await?;

    // Recalculate score
    let _ = scoring::calculate_score(&state.db, body.prospect_id).await;

    Ok(Json(interaction))
}

/// Get timeline for a prospect
#[utoipa::path(get, path = "/api/prospects/{id}/timeline", responses((status = 200)))]
pub async fn prospect_timeline(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Vec<serde_json::Value>>> {
    let interactions = sqlx::query(
        r#"SELECT i.id, i.interaction_type AS kind, i.subject AS title,
                  i.body AS detail, i.outcome, i.created_at, u.name AS user_name
           FROM interactions i
           JOIN users u ON u.id = i.user_id
           WHERE i.prospect_id = $1
           ORDER BY i.created_at DESC"#,
    )
    .bind(id)
    .fetch_all(&state.db)
    .await?;

    let movements = sqlx::query(
        r#"SELECT ph.id, 'stage_change' AS kind,
                  CONCAT('Moved to ', ps.name) AS title,
                  ph.notes AS detail,
                  ph.moved_at AS created_at,
                  u.name AS user_name
           FROM pipeline_history ph
           JOIN pipeline_stages ps ON ps.id = ph.to_stage_id
           JOIN users u ON u.id = ph.moved_by
           WHERE ph.prospect_id = $1"#,
    )
    .bind(id)
    .fetch_all(&state.db)
    .await?;

    let mut timeline: Vec<serde_json::Value> = Vec::new();

    for r in &interactions {
        let ts: chrono::DateTime<chrono::Utc> = r.try_get("created_at").unwrap();
        timeline.push(serde_json::json!({
            "id": r.try_get::<Uuid, _>("id").unwrap(),
            "type": r.try_get::<String, _>("kind").unwrap_or_default(),
            "title": r.try_get::<Option<String>, _>("title").ok().flatten(),
            "detail": r.try_get::<Option<String>, _>("detail").ok().flatten(),
            "outcome": r.try_get::<Option<String>, _>("outcome").ok().flatten(),
            "timestamp": ts.to_rfc3339(),
            "user_name": r.try_get::<String, _>("user_name").unwrap_or_default(),
        }));
    }

    for r in &movements {
        let ts: chrono::DateTime<chrono::Utc> = r.try_get("created_at").unwrap();
        timeline.push(serde_json::json!({
            "id": r.try_get::<Uuid, _>("id").unwrap(),
            "type": r.try_get::<String, _>("kind").unwrap_or_default(),
            "title": r.try_get::<Option<String>, _>("title").ok().flatten(),
            "detail": r.try_get::<Option<String>, _>("detail").ok().flatten(),
            "timestamp": ts.to_rfc3339(),
            "user_name": r.try_get::<String, _>("user_name").unwrap_or_default(),
        }));
    }

    timeline.sort_by(|a, b| {
        let ta = a["timestamp"].as_str().unwrap_or("");
        let tb = b["timestamp"].as_str().unwrap_or("");
        tb.cmp(ta)
    });

    Ok(Json(timeline))
}
