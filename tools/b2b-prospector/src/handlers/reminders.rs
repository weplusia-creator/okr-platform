use axum::{
    extract::{Path, State},
    Extension, Json,
};
use uuid::Uuid;
use validator::Validate;

use crate::auth::jwt::Claims;
use crate::errors::{AppError, AppResult};
use crate::models::reminder::*;
use crate::services::reminders as reminder_service;
use crate::AppState;

/// List reminders for current user
#[utoipa::path(get, path = "/api/reminders", responses((status = 200, body = Vec<ReminderWithProspect>)))]
pub async fn list_reminders(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> AppResult<Json<Vec<ReminderWithProspect>>> {
    let reminders = sqlx::query_as::<_, ReminderWithProspect>(
        r#"SELECT r.id, r.prospect_id, r.user_id, r.remind_at, r.message,
                  r.is_completed, r.completed_at, r.created_at,
                  p.contact_name AS prospect_name,
                  p.company_name
           FROM reminders r
           JOIN prospects p ON p.id = r.prospect_id
           WHERE r.user_id = $1
           ORDER BY r.is_completed ASC, r.remind_at ASC"#,
    )
    .bind(claims.sub)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(reminders))
}

/// Get due reminders for current user
#[utoipa::path(get, path = "/api/reminders/due", responses((status = 200, body = Vec<ReminderWithProspect>)))]
pub async fn due_reminders(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> AppResult<Json<Vec<ReminderWithProspect>>> {
    let reminders = reminder_service::get_due_reminders(&state.db, claims.sub).await?;
    Ok(Json(reminders))
}

/// Create a reminder
#[utoipa::path(post, path = "/api/reminders", request_body = CreateReminder, responses((status = 201, body = Reminder)))]
pub async fn create_reminder(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(body): Json<CreateReminder>,
) -> AppResult<Json<Reminder>> {
    body.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    let reminder = sqlx::query_as::<_, Reminder>(
        r#"INSERT INTO reminders (prospect_id, user_id, remind_at, message)
           VALUES ($1, $2, $3, $4)
           RETURNING *"#,
    )
    .bind(body.prospect_id)
    .bind(claims.sub)
    .bind(body.remind_at)
    .bind(&body.message)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(reminder))
}

/// Complete a reminder
#[utoipa::path(post, path = "/api/reminders/{id}/complete", responses((status = 200, body = Reminder)))]
pub async fn complete_reminder(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Reminder>> {
    let reminder = sqlx::query_as::<_, Reminder>(
        r#"UPDATE reminders SET is_completed = TRUE, completed_at = NOW()
           WHERE id = $1 AND user_id = $2
           RETURNING *"#,
    )
    .bind(id)
    .bind(claims.sub)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Reminder not found".into()))?;

    Ok(Json(reminder))
}

/// Delete a reminder
#[utoipa::path(delete, path = "/api/reminders/{id}", responses((status = 204)))]
pub async fn delete_reminder(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> AppResult<axum::http::StatusCode> {
    let result = sqlx::query("DELETE FROM reminders WHERE id = $1 AND user_id = $2")
        .bind(id)
        .bind(claims.sub)
        .execute(&state.db)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Reminder not found".into()));
    }

    Ok(axum::http::StatusCode::NO_CONTENT)
}
