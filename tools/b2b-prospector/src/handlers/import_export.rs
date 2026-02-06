use axum::{
    extract::State,
    http::header,
    response::IntoResponse,
    Extension, Json,
};
use axum::extract::Multipart;
use sqlx::Row;

use crate::auth::jwt::Claims;
use crate::errors::{AppError, AppResult};
use crate::models::prospect::{CsvProspectRow, ImportResult};
use crate::AppState;

/// Import prospects from CSV
#[utoipa::path(post, path = "/api/prospects/import", responses((status = 200, body = ImportResult)))]
pub async fn import_csv(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    mut multipart: Multipart,
) -> AppResult<Json<ImportResult>> {
    let mut imported = 0;
    let mut errors = Vec::new();

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::BadRequest(format!("Multipart error: {}", e)))?
    {
        if field.name() != Some("file") {
            continue;
        }

        let data = field
            .bytes()
            .await
            .map_err(|e| AppError::BadRequest(format!("Read error: {}", e)))?;

        let mut reader = csv::ReaderBuilder::new()
            .has_headers(true)
            .flexible(true)
            .from_reader(data.as_ref());

        for (idx, result) in reader.deserialize::<CsvProspectRow>().enumerate() {
            match result {
                Ok(row) => {
                    let ev = row
                        .estimated_value
                        .map(|v| rust_decimal::Decimal::try_from(v).unwrap_or_default());

                    let res = sqlx::query(
                        r#"INSERT INTO prospects
                           (company_name, contact_name, contact_title, email, phone,
                            linkedin_url, website, industry, company_size, country, city,
                            estimated_value, notes, created_by)
                           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)"#,
                    )
                    .bind(&row.company_name)
                    .bind(&row.contact_name)
                    .bind(&row.contact_title)
                    .bind(&row.email)
                    .bind(&row.phone)
                    .bind(&row.linkedin_url)
                    .bind(&row.website)
                    .bind(&row.industry)
                    .bind(&row.company_size)
                    .bind(&row.country)
                    .bind(&row.city)
                    .bind(&ev)
                    .bind(&row.notes)
                    .bind(claims.sub)
                    .execute(&state.db)
                    .await;

                    match res {
                        Ok(_) => imported += 1,
                        Err(e) => errors.push(format!("Row {}: {}", idx + 2, e)),
                    }
                }
                Err(e) => {
                    errors.push(format!("Row {}: {}", idx + 2, e));
                }
            }
        }
    }

    Ok(Json(ImportResult { imported, errors }))
}

/// Export prospects as CSV
#[utoipa::path(get, path = "/api/prospects/export/csv", responses((status = 200)))]
pub async fn export_csv(
    State(state): State<AppState>,
) -> AppResult<impl IntoResponse> {
    let rows = sqlx::query(
        r#"SELECT company_name, contact_name, contact_title, email, phone,
                  linkedin_url, website, industry, company_size, country, city,
                  estimated_value, score, score_label, status, notes
           FROM prospects ORDER BY created_at DESC"#,
    )
    .fetch_all(&state.db)
    .await?;

    let mut wtr = csv::Writer::from_writer(Vec::new());
    wtr.write_record([
        "company_name", "contact_name", "contact_title", "email", "phone",
        "linkedin_url", "website", "industry", "company_size", "country", "city",
        "estimated_value", "score", "score_label", "status", "notes",
    ])
    .map_err(|e| AppError::Internal(anyhow::anyhow!("CSV error: {}", e)))?;

    for r in &rows {
        let ev: Option<rust_decimal::Decimal> = r.try_get("estimated_value").ok();
        let score: i32 = r.try_get("score").unwrap_or(0);
        wtr.write_record([
            &r.try_get::<String, _>("company_name").unwrap_or_default(),
            &r.try_get::<String, _>("contact_name").unwrap_or_default(),
            &r.try_get::<Option<String>, _>("contact_title").ok().flatten().unwrap_or_default(),
            &r.try_get::<Option<String>, _>("email").ok().flatten().unwrap_or_default(),
            &r.try_get::<Option<String>, _>("phone").ok().flatten().unwrap_or_default(),
            &r.try_get::<Option<String>, _>("linkedin_url").ok().flatten().unwrap_or_default(),
            &r.try_get::<Option<String>, _>("website").ok().flatten().unwrap_or_default(),
            &r.try_get::<Option<String>, _>("industry").ok().flatten().unwrap_or_default(),
            &r.try_get::<Option<String>, _>("company_size").ok().flatten().unwrap_or_default(),
            &r.try_get::<Option<String>, _>("country").ok().flatten().unwrap_or_default(),
            &r.try_get::<Option<String>, _>("city").ok().flatten().unwrap_or_default(),
            &ev.map(|v| v.to_string()).unwrap_or_default(),
            &score.to_string(),
            &r.try_get::<String, _>("score_label").unwrap_or_default(),
            &r.try_get::<String, _>("status").unwrap_or_default(),
            &r.try_get::<Option<String>, _>("notes").ok().flatten().unwrap_or_default(),
        ])
        .map_err(|e| AppError::Internal(anyhow::anyhow!("CSV error: {}", e)))?;
    }

    let csv_data = wtr
        .into_inner()
        .map_err(|e| AppError::Internal(anyhow::anyhow!("CSV error: {}", e)))?;

    Ok((
        [
            (header::CONTENT_TYPE, "text/csv"),
            (header::CONTENT_DISPOSITION, "attachment; filename=\"prospects.csv\""),
        ],
        csv_data,
    ))
}

/// Export prospects as JSON
#[utoipa::path(get, path = "/api/prospects/export/json", responses((status = 200)))]
pub async fn export_json(
    State(state): State<AppState>,
) -> AppResult<Json<Vec<serde_json::Value>>> {
    let rows = sqlx::query(
        r#"SELECT p.id, p.company_name, p.contact_name, p.contact_title, p.email,
                  p.phone, p.linkedin_url, p.website, p.industry, p.company_size,
                  p.country, p.city, p.estimated_value, p.score, p.score_label,
                  p.status, p.notes
           FROM prospects p ORDER BY p.created_at DESC"#,
    )
    .fetch_all(&state.db)
    .await?;

    let data: Vec<serde_json::Value> = rows
        .iter()
        .map(|r| {
            serde_json::json!({
                "id": r.try_get::<uuid::Uuid, _>("id").unwrap(),
                "company_name": r.try_get::<String, _>("company_name").unwrap_or_default(),
                "contact_name": r.try_get::<String, _>("contact_name").unwrap_or_default(),
                "contact_title": r.try_get::<Option<String>, _>("contact_title").ok().flatten(),
                "email": r.try_get::<Option<String>, _>("email").ok().flatten(),
                "phone": r.try_get::<Option<String>, _>("phone").ok().flatten(),
                "linkedin_url": r.try_get::<Option<String>, _>("linkedin_url").ok().flatten(),
                "website": r.try_get::<Option<String>, _>("website").ok().flatten(),
                "industry": r.try_get::<Option<String>, _>("industry").ok().flatten(),
                "company_size": r.try_get::<Option<String>, _>("company_size").ok().flatten(),
                "country": r.try_get::<Option<String>, _>("country").ok().flatten(),
                "city": r.try_get::<Option<String>, _>("city").ok().flatten(),
                "estimated_value": r.try_get::<Option<rust_decimal::Decimal>, _>("estimated_value").ok().flatten().map(|v| v.to_string()),
                "score": r.try_get::<i32, _>("score").unwrap_or(0),
                "score_label": r.try_get::<String, _>("score_label").unwrap_or_default(),
                "status": r.try_get::<String, _>("status").unwrap_or_default(),
                "notes": r.try_get::<Option<String>, _>("notes").ok().flatten(),
            })
        })
        .collect();

    Ok(Json(data))
}
