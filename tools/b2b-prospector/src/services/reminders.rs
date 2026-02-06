use chrono::Utc;
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::errors::AppResult;
use crate::models::reminder::ReminderWithProspect;

/// Get all due (overdue) reminders for a user
pub async fn get_due_reminders(
    pool: &PgPool,
    user_id: Uuid,
) -> AppResult<Vec<ReminderWithProspect>> {
    let now = Utc::now();

    let rows = sqlx::query_as::<_, ReminderWithProspect>(
        r#"SELECT
            r.id, r.prospect_id, r.user_id, r.remind_at, r.message,
            r.is_completed, r.completed_at, r.created_at,
            p.contact_name AS prospect_name,
            p.company_name
           FROM reminders r
           JOIN prospects p ON p.id = r.prospect_id
           WHERE r.user_id = $1
             AND r.is_completed = FALSE
             AND r.remind_at <= $2
           ORDER BY r.remind_at ASC"#,
    )
    .bind(user_id)
    .bind(now)
    .fetch_all(pool)
    .await?;

    Ok(rows)
}

/// Get prospects that haven't been contacted in X days
pub async fn get_stale_prospects(
    pool: &PgPool,
    days: i64,
    assigned_to: Option<Uuid>,
) -> AppResult<Vec<StaleProspect>> {
    let cutoff = Utc::now() - chrono::Duration::days(days);

    let rows = if let Some(user_id) = assigned_to {
        sqlx::query(
            r#"SELECT
                p.id AS prospect_id,
                p.company_name,
                p.contact_name,
                p.score,
                p.score_label,
                MAX(i.created_at) AS last_interaction_at,
                EXTRACT(DAY FROM NOW() - COALESCE(MAX(i.created_at), p.created_at))::INTEGER AS days_since_contact
               FROM prospects p
               LEFT JOIN interactions i ON i.prospect_id = p.id
               WHERE p.assigned_to = $1
                 AND p.status NOT IN ('closed_won', 'closed_lost')
               GROUP BY p.id
               HAVING COALESCE(MAX(i.created_at), p.created_at) < $2
               ORDER BY days_since_contact DESC"#,
        )
        .bind(user_id)
        .bind(cutoff)
        .fetch_all(pool)
        .await?
    } else {
        sqlx::query(
            r#"SELECT
                p.id AS prospect_id,
                p.company_name,
                p.contact_name,
                p.score,
                p.score_label,
                MAX(i.created_at) AS last_interaction_at,
                EXTRACT(DAY FROM NOW() - COALESCE(MAX(i.created_at), p.created_at))::INTEGER AS days_since_contact
               FROM prospects p
               LEFT JOIN interactions i ON i.prospect_id = p.id
               WHERE p.status NOT IN ('closed_won', 'closed_lost')
               GROUP BY p.id
               HAVING COALESCE(MAX(i.created_at), p.created_at) < $1
               ORDER BY days_since_contact DESC"#,
        )
        .bind(cutoff)
        .fetch_all(pool)
        .await?
    };

    let result = rows
        .iter()
        .map(|r| StaleProspect {
            prospect_id: r.try_get("prospect_id").unwrap(),
            company_name: r.try_get("company_name").unwrap_or_default(),
            contact_name: r.try_get("contact_name").unwrap_or_default(),
            score: r.try_get("score").unwrap_or(0),
            score_label: r.try_get("score_label").unwrap_or_default(),
            last_interaction_at: r.try_get("last_interaction_at").ok(),
            days_since_contact: r.try_get("days_since_contact").ok(),
        })
        .collect();

    Ok(result)
}

#[derive(Debug, serde::Serialize, utoipa::ToSchema)]
pub struct StaleProspect {
    pub prospect_id: Uuid,
    pub company_name: String,
    pub contact_name: String,
    pub score: i32,
    pub score_label: String,
    pub last_interaction_at: Option<chrono::DateTime<Utc>>,
    pub days_since_contact: Option<i32>,
}
