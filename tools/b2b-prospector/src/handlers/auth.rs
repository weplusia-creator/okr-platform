use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use axum::{extract::State, Json};
use sqlx::Row;
use validator::Validate;

use crate::auth::jwt::create_token;
use crate::errors::{AppError, AppResult};
use crate::models::user::{AuthResponse, LoginRequest, RegisterRequest, UserPublic};
use crate::AppState;

/// Register a new user
#[utoipa::path(
    post, path = "/api/auth/register",
    request_body = RegisterRequest,
    responses((status = 201, body = AuthResponse))
)]
pub async fn register(
    State(state): State<AppState>,
    Json(body): Json<RegisterRequest>,
) -> AppResult<Json<AuthResponse>> {
    body.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    // Check if email already exists
    let existing: Option<uuid::Uuid> =
        sqlx::query_scalar("SELECT id FROM users WHERE email = $1")
            .bind(&body.email)
            .fetch_optional(&state.db)
            .await?;

    if existing.is_some() {
        return Err(AppError::Conflict("Email already registered".into()));
    }

    let salt = SaltString::generate(&mut OsRng);
    let password_hash = Argon2::default()
        .hash_password(body.password.as_bytes(), &salt)
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Hash error: {}", e)))?
        .to_string();

    let row = sqlx::query(
        r#"INSERT INTO users (email, password_hash, name)
           VALUES ($1, $2, $3)
           RETURNING id, email, name, role"#,
    )
    .bind(&body.email)
    .bind(&password_hash)
    .bind(&body.name)
    .fetch_one(&state.db)
    .await?;

    let id: uuid::Uuid = row.try_get("id").unwrap();
    let email: String = row.try_get("email").unwrap();
    let name: String = row.try_get("name").unwrap();
    let role: String = row.try_get("role").unwrap();

    let token = create_token(id, &email, &name, &role, &state.config.jwt_secret)?;

    Ok(Json(AuthResponse {
        token,
        user: UserPublic {
            id,
            email,
            name,
            role,
        },
    }))
}

/// Login
#[utoipa::path(
    post, path = "/api/auth/login",
    request_body = LoginRequest,
    responses((status = 200, body = AuthResponse))
)]
pub async fn login(
    State(state): State<AppState>,
    Json(body): Json<LoginRequest>,
) -> AppResult<Json<AuthResponse>> {
    body.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    let row = sqlx::query(
        "SELECT id, email, password_hash, name, role FROM users WHERE email = $1",
    )
    .bind(&body.email)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::Unauthorized("Invalid credentials".into()))?;

    let id: uuid::Uuid = row.try_get("id").unwrap();
    let email: String = row.try_get("email").unwrap();
    let stored_hash: String = row.try_get("password_hash").unwrap();
    let name: String = row.try_get("name").unwrap();
    let role: String = row.try_get("role").unwrap();

    let parsed_hash = PasswordHash::new(&stored_hash)
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Hash parse error: {}", e)))?;

    Argon2::default()
        .verify_password(body.password.as_bytes(), &parsed_hash)
        .map_err(|_| AppError::Unauthorized("Invalid credentials".into()))?;

    let token = create_token(id, &email, &name, &role, &state.config.jwt_secret)?;

    Ok(Json(AuthResponse {
        token,
        user: UserPublic {
            id,
            email,
            name,
            role,
        },
    }))
}
