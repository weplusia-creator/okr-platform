use axum::{
    extract::{Path, State},
    Extension, Json,
};
use uuid::Uuid;
use validator::Validate;

use crate::auth::jwt::Claims;
use crate::errors::{AppError, AppResult};
use crate::models::template::*;
use crate::AppState;

/// List all templates
#[utoipa::path(get, path = "/api/templates", responses((status = 200, body = Vec<AiTemplate>)))]
pub async fn list_templates(State(state): State<AppState>) -> AppResult<Json<Vec<AiTemplate>>> {
    let templates = sqlx::query_as::<_, AiTemplate>(
        "SELECT * FROM ai_templates ORDER BY template_type, name",
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(templates))
}

/// Create a template
#[utoipa::path(post, path = "/api/templates", request_body = CreateTemplate, responses((status = 201, body = AiTemplate)))]
pub async fn create_template(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(body): Json<CreateTemplate>,
) -> AppResult<Json<AiTemplate>> {
    body.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    let template = sqlx::query_as::<_, AiTemplate>(
        r#"INSERT INTO ai_templates (name, template_type, tone, subject_template, body_template, created_by)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *"#,
    )
    .bind(&body.name)
    .bind(&body.template_type)
    .bind(&body.tone)
    .bind(&body.subject_template)
    .bind(&body.body_template)
    .bind(claims.sub)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(template))
}

/// Update a template
#[utoipa::path(put, path = "/api/templates/{id}", request_body = UpdateTemplate, responses((status = 200, body = AiTemplate)))]
pub async fn update_template(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateTemplate>,
) -> AppResult<Json<AiTemplate>> {
    let template = sqlx::query_as::<_, AiTemplate>(
        r#"UPDATE ai_templates SET
            name = COALESCE($2, name),
            template_type = COALESCE($3, template_type),
            tone = COALESCE($4, tone),
            subject_template = COALESCE($5, subject_template),
            body_template = COALESCE($6, body_template),
            updated_at = NOW()
           WHERE id = $1
           RETURNING *"#,
    )
    .bind(id)
    .bind(&body.name)
    .bind(&body.template_type)
    .bind(&body.tone)
    .bind(&body.subject_template)
    .bind(&body.body_template)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Template not found".into()))?;

    Ok(Json(template))
}

/// Delete a template
#[utoipa::path(delete, path = "/api/templates/{id}", responses((status = 204)))]
pub async fn delete_template(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<axum::http::StatusCode> {
    sqlx::query("DELETE FROM ai_templates WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await?;
    Ok(axum::http::StatusCode::NO_CONTENT)
}
