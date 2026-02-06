use axum::{extract::State, Extension, Json};

use crate::auth::jwt::Claims;
use crate::errors::AppResult;
use crate::models::template::{GenerateMessageRequest, GeneratedMessage};
use crate::services::ai;
use crate::AppState;

/// Generate a personalized message using Claude AI
#[utoipa::path(
    post, path = "/api/ai/generate",
    request_body = GenerateMessageRequest,
    responses((status = 200, body = GeneratedMessage))
)]
pub async fn generate_message(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Json(body): Json<GenerateMessageRequest>,
) -> AppResult<Json<GeneratedMessage>> {
    let message = ai::generate_message(
        &state.db,
        &state.config.anthropic_api_key,
        body.prospect_id,
        body.template_id,
        &body.message_type,
        &body.tone,
        body.additional_context.as_deref(),
    )
    .await?;

    Ok(Json(message))
}
