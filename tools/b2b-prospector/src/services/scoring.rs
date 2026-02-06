use chrono::Utc;
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::errors::AppResult;
use crate::models::scoring::{score_to_label, CriteriaMatch, ScoreBreakdown};

pub async fn calculate_score(pool: &PgPool, prospect_id: Uuid) -> AppResult<ScoreBreakdown> {
    let prospect = sqlx::query(
        "SELECT id, company_size, industry, contact_title, email, phone, linkedin_url FROM prospects WHERE id = $1",
    )
    .bind(prospect_id)
    .fetch_one(pool)
    .await?;

    let criteria = sqlx::query(
        "SELECT id, name, field_name, field_value, points, weight FROM scoring_criteria WHERE is_active = TRUE",
    )
    .fetch_all(pool)
    .await?;

    let last_interaction: Option<chrono::DateTime<Utc>> = sqlx::query_scalar(
        "SELECT MAX(created_at) FROM interactions WHERE prospect_id = $1",
    )
    .bind(prospect_id)
    .fetch_one(pool)
    .await?;

    let mut total_score: f64 = 0.0;
    let mut matches = Vec::new();
    let now = Utc::now();

    let p_company_size: Option<String> = prospect.try_get("company_size").ok();
    let p_industry: Option<String> = prospect.try_get("industry").ok();
    let p_contact_title: Option<String> = prospect.try_get("contact_title").ok();
    let p_email: Option<String> = prospect.try_get("email").ok();
    let p_phone: Option<String> = prospect.try_get("phone").ok();
    let p_linkedin_url: Option<String> = prospect.try_get("linkedin_url").ok();

    for c in &criteria {
        let weight: f64 = c
            .try_get::<rust_decimal::Decimal, _>("weight")
            .ok()
            .and_then(|w| w.to_string().parse::<f64>().ok())
            .unwrap_or(1.0);
        let points: i32 = c.try_get("points").unwrap_or(0);
        let name: String = c.try_get("name").unwrap_or_default();
        let field_name: String = c.try_get("field_name").unwrap_or_default();
        let field_value: String = c.try_get::<Option<String>, _>("field_value").ok().flatten().unwrap_or_default();

        let matched = match field_name.as_str() {
            "company_size" => p_company_size
                .as_deref()
                .map_or(false, |s| s == field_value),
            "industry" => p_industry
                .as_deref()
                .map_or(false, |s| s.to_lowercase() == field_value.to_lowercase()),
            "contact_title" => p_contact_title.as_deref().map_or(false, |title| {
                let title_lower = title.to_lowercase();
                match field_value.as_str() {
                    "C-Level" => {
                        title_lower.starts_with("ceo")
                            || title_lower.starts_with("cto")
                            || title_lower.starts_with("cfo")
                            || title_lower.starts_with("coo")
                            || title_lower.starts_with("chief")
                    }
                    "VP" => {
                        title_lower.contains("vice president") || title_lower.starts_with("vp")
                    }
                    "Director" => title_lower.contains("director"),
                    "Manager" => title_lower.contains("manager"),
                    _ => title_lower.contains(&field_value.to_lowercase()),
                }
            }),
            "email" if field_value == "present" => p_email.is_some(),
            "phone" if field_value == "present" => p_phone.is_some(),
            "linkedin_url" if field_value == "present" => p_linkedin_url.is_some(),
            "last_interaction" => match field_value.as_str() {
                "7_days" => last_interaction
                    .map_or(false, |d| (now - d).num_days() <= 7),
                "30_days_stale" => last_interaction
                    .map_or(true, |d| (now - d).num_days() > 30),
                _ => false,
            },
            _ => false,
        };

        if matched {
            let weighted_points = (points as f64 * weight) as i32;
            total_score += weighted_points as f64;
            matches.push(CriteriaMatch {
                criteria_name: name,
                points: weighted_points,
                reason: format!("{}: {}", field_name, field_value),
            });
        }
    }

    let final_score = total_score.clamp(0.0, 100.0) as i32;
    let label = score_to_label(final_score).to_string();

    sqlx::query("UPDATE prospects SET score = $1, score_label = $2, updated_at = NOW() WHERE id = $3")
        .bind(final_score)
        .bind(&label)
        .bind(prospect_id)
        .execute(pool)
        .await?;

    Ok(ScoreBreakdown {
        prospect_id,
        total_score: final_score,
        label,
        criteria_applied: matches,
    })
}

pub async fn recalculate_all_scores(pool: &PgPool) -> AppResult<usize> {
    let rows = sqlx::query("SELECT id FROM prospects")
        .fetch_all(pool)
        .await?;

    let count = rows.len();
    for row in rows {
        let id: Uuid = row.try_get("id").unwrap();
        let _ = calculate_score(pool, id).await;
    }

    Ok(count)
}
