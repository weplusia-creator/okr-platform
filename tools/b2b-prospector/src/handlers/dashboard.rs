use axum::{
    extract::{Query, State},
    Json,
};
use serde::Deserialize;
use sqlx::Row;
use uuid::Uuid;

use crate::errors::AppResult;
use crate::services::reminders;
use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct DashboardFilter {
    pub assigned_to: Option<Uuid>,
    pub stale_days: Option<i64>,
}

/// Get dashboard metrics
#[utoipa::path(get, path = "/api/dashboard", responses((status = 200)))]
pub async fn dashboard(
    State(state): State<AppState>,
    Query(filter): Query<DashboardFilter>,
) -> AppResult<Json<serde_json::Value>> {
    // Prospects by status
    let by_status = sqlx::query("SELECT status, COUNT(*) AS count FROM prospects GROUP BY status ORDER BY count DESC")
        .fetch_all(&state.db)
        .await?;

    // Prospects by score label
    let by_score = sqlx::query("SELECT score_label, COUNT(*) AS count FROM prospects GROUP BY score_label ORDER BY count DESC")
        .fetch_all(&state.db)
        .await?;

    // Top prospects by score
    let top_prospects = sqlx::query(
        r#"SELECT id, company_name, contact_name, score, score_label, estimated_value
           FROM prospects WHERE status NOT IN ('closed_won', 'closed_lost')
           ORDER BY score DESC LIMIT 10"#,
    )
    .fetch_all(&state.db)
    .await?;

    // Weekly activity
    let weekly_activity = sqlx::query(
        "SELECT interaction_type, COUNT(*) AS count FROM interactions WHERE created_at >= NOW() - INTERVAL '7 days' GROUP BY interaction_type",
    )
    .fetch_all(&state.db)
    .await?;

    // Monthly activity
    let monthly_activity = sqlx::query(
        "SELECT interaction_type, COUNT(*) AS count FROM interactions WHERE created_at >= NOW() - INTERVAL '30 days' GROUP BY interaction_type",
    )
    .fetch_all(&state.db)
    .await?;

    // Pipeline value
    let pipeline_value: rust_decimal::Decimal = sqlx::query_scalar(
        "SELECT COALESCE(SUM(estimated_value), 0) FROM prospects WHERE status NOT IN ('closed_won', 'closed_lost')",
    )
    .fetch_one(&state.db)
    .await?;

    // Won value
    let won_value: rust_decimal::Decimal = sqlx::query_scalar(
        "SELECT COALESCE(SUM(estimated_value), 0) FROM prospects WHERE status = 'closed_won'",
    )
    .fetch_one(&state.db)
    .await?;

    // Stale prospects
    let stale_days = filter.stale_days.unwrap_or(14);
    let stale = reminders::get_stale_prospects(&state.db, stale_days, filter.assigned_to).await?;

    // Seller performance
    let seller_stats = sqlx::query(
        r#"SELECT u.name,
                  COUNT(DISTINCT p.id) AS prospects,
                  COUNT(DISTINCT i.id) AS interactions,
                  COALESCE(SUM(CASE WHEN p.status = 'closed_won' THEN 1 ELSE 0 END), 0) AS won
           FROM users u
           LEFT JOIN prospects p ON p.assigned_to = u.id
           LEFT JOIN interactions i ON i.user_id = u.id
           WHERE u.role = 'seller'
           GROUP BY u.id, u.name
           ORDER BY won DESC"#,
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(serde_json::json!({
        "prospects_by_status": by_status.iter().map(|r| serde_json::json!({
            "status": r.try_get::<String, _>("status").unwrap_or_default(),
            "count": r.try_get::<i64, _>("count").unwrap_or(0),
        })).collect::<Vec<_>>(),
        "prospects_by_score": by_score.iter().map(|r| serde_json::json!({
            "score_label": r.try_get::<String, _>("score_label").unwrap_or_default(),
            "count": r.try_get::<i64, _>("count").unwrap_or(0),
        })).collect::<Vec<_>>(),
        "top_prospects": top_prospects.iter().map(|r| serde_json::json!({
            "id": r.try_get::<Uuid, _>("id").unwrap(),
            "company_name": r.try_get::<String, _>("company_name").unwrap_or_default(),
            "contact_name": r.try_get::<String, _>("contact_name").unwrap_or_default(),
            "score": r.try_get::<i32, _>("score").unwrap_or(0),
            "score_label": r.try_get::<String, _>("score_label").unwrap_or_default(),
            "estimated_value": r.try_get::<Option<rust_decimal::Decimal>, _>("estimated_value").ok().flatten().map(|v| v.to_string()),
        })).collect::<Vec<_>>(),
        "weekly_activity": weekly_activity.iter().map(|r| serde_json::json!({
            "type": r.try_get::<String, _>("interaction_type").unwrap_or_default(),
            "count": r.try_get::<i64, _>("count").unwrap_or(0),
        })).collect::<Vec<_>>(),
        "monthly_activity": monthly_activity.iter().map(|r| serde_json::json!({
            "type": r.try_get::<String, _>("interaction_type").unwrap_or_default(),
            "count": r.try_get::<i64, _>("count").unwrap_or(0),
        })).collect::<Vec<_>>(),
        "pipeline_value": pipeline_value.to_string(),
        "won_value": won_value.to_string(),
        "stale_prospects": stale,
        "seller_performance": seller_stats.iter().map(|r| serde_json::json!({
            "name": r.try_get::<String, _>("name").unwrap_or_default(),
            "prospects": r.try_get::<i64, _>("prospects").unwrap_or(0),
            "interactions": r.try_get::<i64, _>("interactions").unwrap_or(0),
            "won": r.try_get::<i64, _>("won").unwrap_or(0),
        })).collect::<Vec<_>>(),
    })))
}
