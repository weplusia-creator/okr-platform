use axum::{
    extract::{Path, Query, State},
    Extension, Json,
};
use sqlx::Row;
use uuid::Uuid;
use validator::Validate;

use crate::auth::jwt::Claims;
use crate::errors::{AppError, AppResult};
use crate::models::prospect::*;
use crate::models::tag::Tag;
use crate::services::scoring;
use crate::AppState;

/// List prospects with filters and pagination
#[utoipa::path(
    get, path = "/api/prospects",
    responses((status = 200, body = ProspectList))
)]
pub async fn list_prospects(
    State(state): State<AppState>,
    Query(filter): Query<ProspectFilter>,
) -> AppResult<Json<ProspectList>> {
    let page = filter.page.unwrap_or(1).max(1);
    let per_page = filter.per_page.unwrap_or(25).clamp(1, 100);
    let offset = (page - 1) * per_page;

    let sort_by = match filter.sort_by.as_deref() {
        Some("company_name") => "company_name",
        Some("score") => "score",
        Some("updated_at") => "updated_at",
        _ => "created_at",
    };
    let sort_order = match filter.sort_order.as_deref() {
        Some("asc") => "ASC",
        _ => "DESC",
    };

    let search_pattern = filter.search.as_ref().map(|s| format!("%{}%", s));

    let total: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM prospects p
           WHERE ($1::text IS NULL OR (p.company_name ILIKE $1 OR p.contact_name ILIKE $1))
             AND ($2::text IS NULL OR p.industry = $2)
             AND ($3::text IS NULL OR p.company_size = $3)
             AND ($4::text IS NULL OR p.country = $4)
             AND ($5::text IS NULL OR p.status = $5)
             AND ($6::int IS NULL OR p.score >= $6)
             AND ($7::int IS NULL OR p.score <= $7)
             AND ($8::text IS NULL OR p.score_label = $8)
             AND ($9::uuid IS NULL OR p.assigned_to = $9)"#,
    )
    .bind(&search_pattern)
    .bind(&filter.industry)
    .bind(&filter.company_size)
    .bind(&filter.country)
    .bind(&filter.status)
    .bind(&filter.score_min)
    .bind(&filter.score_max)
    .bind(&filter.score_label)
    .bind(&filter.assigned_to)
    .fetch_one(&state.db)
    .await?;

    let query = format!(
        r#"SELECT * FROM prospects p
           WHERE ($1::text IS NULL OR (p.company_name ILIKE $1 OR p.contact_name ILIKE $1))
             AND ($2::text IS NULL OR p.industry = $2)
             AND ($3::text IS NULL OR p.company_size = $3)
             AND ($4::text IS NULL OR p.country = $4)
             AND ($5::text IS NULL OR p.status = $5)
             AND ($6::int IS NULL OR p.score >= $6)
             AND ($7::int IS NULL OR p.score <= $7)
             AND ($8::text IS NULL OR p.score_label = $8)
             AND ($9::uuid IS NULL OR p.assigned_to = $9)
           ORDER BY {} {}
           LIMIT $10 OFFSET $11"#,
        sort_by, sort_order
    );

    let prospects = sqlx::query_as::<_, Prospect>(&query)
        .bind(&search_pattern)
        .bind(&filter.industry)
        .bind(&filter.company_size)
        .bind(&filter.country)
        .bind(&filter.status)
        .bind(&filter.score_min)
        .bind(&filter.score_max)
        .bind(&filter.score_label)
        .bind(&filter.assigned_to)
        .bind(per_page)
        .bind(offset)
        .fetch_all(&state.db)
        .await?;

    let total_pages = ((total as f64) / (per_page as f64)).ceil() as i64;

    Ok(Json(ProspectList {
        data: prospects,
        total,
        page,
        per_page,
        total_pages,
    }))
}

/// Get a single prospect by ID
#[utoipa::path(get, path = "/api/prospects/{id}", responses((status = 200, body = Prospect)))]
pub async fn get_prospect(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<ProspectWithTags>> {
    let prospect = sqlx::query_as::<_, Prospect>("SELECT * FROM prospects WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Prospect not found".into()))?;

    let tags = sqlx::query_as::<_, Tag>(
        r#"SELECT t.id, t.name, t.color, t.created_at
           FROM tags t
           JOIN prospect_tags pt ON pt.tag_id = t.id
           WHERE pt.prospect_id = $1"#,
    )
    .bind(id)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(ProspectWithTags { prospect, tags }))
}

/// Create a new prospect
#[utoipa::path(
    post, path = "/api/prospects",
    request_body = CreateProspect,
    responses((status = 201, body = Prospect))
)]
pub async fn create_prospect(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(body): Json<CreateProspect>,
) -> AppResult<Json<Prospect>> {
    body.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;

    let ev = body
        .estimated_value
        .map(|v| rust_decimal::Decimal::try_from(v).unwrap_or_default());

    let prospect = sqlx::query_as::<_, Prospect>(
        r#"INSERT INTO prospects
           (company_name, contact_name, contact_title, email, phone, linkedin_url,
            website, industry, company_size, country, city, estimated_value, notes,
            assigned_to, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
           RETURNING *"#,
    )
    .bind(&body.company_name)
    .bind(&body.contact_name)
    .bind(&body.contact_title)
    .bind(&body.email)
    .bind(&body.phone)
    .bind(&body.linkedin_url)
    .bind(&body.website)
    .bind(&body.industry)
    .bind(&body.company_size)
    .bind(&body.country)
    .bind(&body.city)
    .bind(&ev)
    .bind(&body.notes)
    .bind(body.assigned_to.or(Some(claims.sub)))
    .bind(claims.sub)
    .fetch_one(&state.db)
    .await?;

    // Add tags
    if let Some(tag_ids) = &body.tag_ids {
        for tag_id in tag_ids {
            let _ = sqlx::query(
                "INSERT INTO prospect_tags (prospect_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            )
            .bind(prospect.id)
            .bind(tag_id)
            .execute(&state.db)
            .await;
        }
    }

    // Calculate initial score
    let _ = scoring::calculate_score(&state.db, prospect.id).await;

    // Add to pipeline (first stage)
    let first_stage: Option<Uuid> =
        sqlx::query_scalar("SELECT id FROM pipeline_stages ORDER BY position LIMIT 1")
            .fetch_optional(&state.db)
            .await?;

    if let Some(stage_id) = first_stage {
        sqlx::query("INSERT INTO pipeline_entries (prospect_id, stage_id) VALUES ($1, $2)")
            .bind(prospect.id)
            .bind(stage_id)
            .execute(&state.db)
            .await?;

        sqlx::query(
            "INSERT INTO pipeline_history (prospect_id, to_stage_id, moved_by) VALUES ($1, $2, $3)",
        )
        .bind(prospect.id)
        .bind(stage_id)
        .bind(claims.sub)
        .execute(&state.db)
        .await?;
    }

    Ok(Json(prospect))
}

/// Update a prospect
#[utoipa::path(
    put, path = "/api/prospects/{id}",
    request_body = UpdateProspect,
    responses((status = 200, body = Prospect))
)]
pub async fn update_prospect(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateProspect>,
) -> AppResult<Json<Prospect>> {
    // Verify exists
    let _existing: Uuid = sqlx::query_scalar("SELECT id FROM prospects WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Prospect not found".into()))?;

    let ev = body
        .estimated_value
        .map(|v| rust_decimal::Decimal::try_from(v).unwrap_or_default());

    let prospect = sqlx::query_as::<_, Prospect>(
        r#"UPDATE prospects SET
            company_name = COALESCE($2, company_name),
            contact_name = COALESCE($3, contact_name),
            contact_title = COALESCE($4, contact_title),
            email = COALESCE($5, email),
            phone = COALESCE($6, phone),
            linkedin_url = COALESCE($7, linkedin_url),
            website = COALESCE($8, website),
            industry = COALESCE($9, industry),
            company_size = COALESCE($10, company_size),
            country = COALESCE($11, country),
            city = COALESCE($12, city),
            estimated_value = COALESCE($13, estimated_value),
            notes = COALESCE($14, notes),
            assigned_to = COALESCE($15, assigned_to),
            status = COALESCE($16, status),
            updated_at = NOW()
           WHERE id = $1
           RETURNING *"#,
    )
    .bind(id)
    .bind(&body.company_name)
    .bind(&body.contact_name)
    .bind(&body.contact_title)
    .bind(&body.email)
    .bind(&body.phone)
    .bind(&body.linkedin_url)
    .bind(&body.website)
    .bind(&body.industry)
    .bind(&body.company_size)
    .bind(&body.country)
    .bind(&body.city)
    .bind(&ev)
    .bind(&body.notes)
    .bind(&body.assigned_to)
    .bind(&body.status)
    .fetch_one(&state.db)
    .await?;

    // Update tags if provided
    if let Some(tag_ids) = &body.tag_ids {
        sqlx::query("DELETE FROM prospect_tags WHERE prospect_id = $1")
            .bind(id)
            .execute(&state.db)
            .await?;
        for tag_id in tag_ids {
            let _ = sqlx::query(
                "INSERT INTO prospect_tags (prospect_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            )
            .bind(id)
            .bind(tag_id)
            .execute(&state.db)
            .await;
        }
    }

    // Recalculate score
    let _ = scoring::calculate_score(&state.db, id).await;

    Ok(Json(prospect))
}

/// Delete a prospect
#[utoipa::path(delete, path = "/api/prospects/{id}", responses((status = 204)))]
pub async fn delete_prospect(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<axum::http::StatusCode> {
    let result = sqlx::query("DELETE FROM prospects WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Prospect not found".into()));
    }

    Ok(axum::http::StatusCode::NO_CONTENT)
}
