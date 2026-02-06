use axum::{
    extract::{Path, State},
    Json,
};
use uuid::Uuid;
use validator::Validate;

use crate::errors::{AppError, AppResult};
use crate::models::tag::*;
use crate::AppState;

/// List all tags
#[utoipa::path(get, path = "/api/tags", responses((status = 200, body = Vec<Tag>)))]
pub async fn list_tags(State(state): State<AppState>) -> AppResult<Json<Vec<Tag>>> {
    let tags = sqlx::query_as::<_, Tag>("SELECT * FROM tags ORDER BY name")
        .fetch_all(&state.db)
        .await?;
    Ok(Json(tags))
}

/// Create a tag
#[utoipa::path(post, path = "/api/tags", request_body = CreateTag, responses((status = 201, body = Tag)))]
pub async fn create_tag(
    State(state): State<AppState>,
    Json(body): Json<CreateTag>,
) -> AppResult<Json<Tag>> {
    body.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    let tag = sqlx::query_as::<_, Tag>(
        "INSERT INTO tags (name, color) VALUES ($1, $2) RETURNING *",
    )
    .bind(&body.name)
    .bind(body.color.as_deref().unwrap_or("#3b82f6"))
    .fetch_one(&state.db)
    .await
    .map_err(|e| match &e {
        sqlx::Error::Database(db_err) if db_err.constraint() == Some("tags_name_key") => {
            AppError::Conflict("Tag name already exists".into())
        }
        _ => AppError::Database(e),
    })?;

    Ok(Json(tag))
}

/// Delete a tag
#[utoipa::path(delete, path = "/api/tags/{id}", responses((status = 204)))]
pub async fn delete_tag(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<axum::http::StatusCode> {
    sqlx::query("DELETE FROM tags WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await?;
    Ok(axum::http::StatusCode::NO_CONTENT)
}
