use axum::{
    extract::Request,
    http::header::AUTHORIZATION,
    middleware::Next,
    response::Response,
};

use crate::auth::jwt::{validate_token, Claims};
use crate::errors::AppError;

pub async fn auth_middleware(mut req: Request, next: Next) -> Result<Response, AppError> {
    let jwt_secret = req
        .extensions()
        .get::<String>()
        .cloned()
        .ok_or_else(|| AppError::Internal(anyhow::anyhow!("JWT secret not configured")))?;

    let auth_header = req
        .headers()
        .get(AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .ok_or_else(|| AppError::Unauthorized("Missing authorization header".into()))?;

    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or_else(|| AppError::Unauthorized("Invalid authorization format".into()))?;

    let claims = validate_token(token, &jwt_secret)?;

    req.extensions_mut().insert(claims);
    Ok(next.run(req).await)
}

/// Extract claims from request extensions in handlers
pub fn get_claims(extensions: &axum::http::Extensions) -> Result<Claims, AppError> {
    extensions
        .get::<Claims>()
        .cloned()
        .ok_or_else(|| AppError::Unauthorized("Not authenticated".into()))
}
